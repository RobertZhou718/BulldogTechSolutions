using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace BulldogFinance.Functions.Services.Auth
{
    public sealed class AuthTokenValidator : IAuthTokenValidator
    {
        private readonly BearerTokenValidationOptions _options;
        private readonly ConfigurationManager<OpenIdConnectConfiguration>? _configurationManager;
        private readonly JwtSecurityTokenHandler _tokenHandler;
        private readonly ILogger<AuthTokenValidator> _logger;

        public AuthTokenValidator(IConfiguration configuration, ILogger<AuthTokenValidator> logger)
        {
            _logger = logger;
            _options = BearerTokenValidationOptions.FromConfiguration(configuration);
            _tokenHandler = new JwtSecurityTokenHandler
            {
                MapInboundClaims = false
            };

            if (!string.IsNullOrWhiteSpace(_options.MetadataAddress))
            {
                _configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                    _options.MetadataAddress,
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever
                    {
                        RequireHttps = true
                    });
            }
        }

        public async Task<AuthTokenValidationResult> ValidateAsync(
            string bearerToken,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(bearerToken))
            {
                return AuthTokenValidationResult.Failure(
                    HttpStatusCode.Unauthorized,
                    "The bearer token is missing.");
            }

            if (!_options.IsConfigured || _configurationManager == null)
            {
                _logger.LogWarning("Bearer token validation is not configured.");
                return AuthTokenValidationResult.Failure(
                    HttpStatusCode.ServiceUnavailable,
                    "Bearer token validation is not configured for this function app.");
            }

            OpenIdConnectConfiguration openIdConfiguration;
            try
            {
                openIdConfiguration = await _configurationManager.GetConfigurationAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load the OpenID configuration used for bearer token validation.");
                return AuthTokenValidationResult.Failure(
                    HttpStatusCode.ServiceUnavailable,
                    "The token validation metadata could not be loaded.");
            }

            try
            {
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = openIdConfiguration.SigningKeys,
                    ValidateAudience = _options.ValidAudiences.Count > 0,
                    ValidAudiences = _options.ValidAudiences,
                    ValidateIssuer = false,
                    ValidateLifetime = true,
                    RequireSignedTokens = true,
                    RequireExpirationTime = true,
                    ClockSkew = TimeSpan.FromMinutes(2)
                };

                var principal = _tokenHandler.ValidateToken(
                    bearerToken,
                    validationParameters,
                    out _);

                var issuer = GetClaim(principal, "iss");
                if (!IsAllowedIssuer(issuer, openIdConfiguration))
                {
                    return AuthTokenValidationResult.Failure(
                        HttpStatusCode.Unauthorized,
                        "The bearer token issuer is not allowed.");
                }

                if (!IsExpectedTenant(principal, issuer))
                {
                    return AuthTokenValidationResult.Failure(
                        HttpStatusCode.Unauthorized,
                        "The bearer token was not issued for the configured External ID tenant.");
                }

                var userId = ResolveUserId(principal);

                if (string.IsNullOrWhiteSpace(userId))
                {
                    return AuthTokenValidationResult.Failure(
                        HttpStatusCode.Unauthorized,
                        "The bearer token does not contain a supported user identifier claim.");
                }

                return AuthTokenValidationResult.Success(userId, principal);
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Bearer token validation failed.");
                return AuthTokenValidationResult.Failure(
                    HttpStatusCode.Unauthorized,
                    "The bearer token is invalid.");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Bearer token parsing failed.");
                return AuthTokenValidationResult.Failure(
                    HttpStatusCode.Unauthorized,
                    "The bearer token is invalid.");
            }
        }

        private bool IsAllowedIssuer(string? issuer, OpenIdConnectConfiguration openIdConfiguration)
        {
            if (string.IsNullOrWhiteSpace(issuer))
            {
                return false;
            }

            var allowedIssuers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddIssuer(allowedIssuers, openIdConfiguration.Issuer);

            if (!string.IsNullOrWhiteSpace(_options.TenantId))
            {
                AddIssuer(allowedIssuers, $"https://login.microsoftonline.com/{_options.TenantId}/v2.0");
                AddIssuer(allowedIssuers, $"https://{_options.TenantId}.ciamlogin.com/{_options.TenantId}/v2.0");

                if (!string.IsNullOrWhiteSpace(_options.TenantSubdomain))
                {
                    AddIssuer(allowedIssuers, $"https://{_options.TenantSubdomain}.ciamlogin.com/{_options.TenantId}/v2.0");
                }
            }

            return allowedIssuers.Contains(NormalizeIssuer(issuer));
        }

        private bool IsExpectedTenant(ClaimsPrincipal principal, string? issuer)
        {
            if (string.IsNullOrWhiteSpace(_options.TenantId))
            {
                return true;
            }

            var tenantIdClaim = GetClaim(principal, "tid");
            if (!string.IsNullOrWhiteSpace(tenantIdClaim))
            {
                return string.Equals(tenantIdClaim, _options.TenantId, StringComparison.OrdinalIgnoreCase);
            }

            return !string.IsNullOrWhiteSpace(issuer)
                && issuer.Contains($"/{_options.TenantId}/", StringComparison.OrdinalIgnoreCase);
        }

        private static void AddIssuer(ISet<string> issuers, string? issuer)
        {
            if (!string.IsNullOrWhiteSpace(issuer))
            {
                issuers.Add(NormalizeIssuer(issuer));
            }
        }

        private static string NormalizeIssuer(string issuer)
        {
            return issuer.Trim().TrimEnd('/');
        }

        private static string? ResolveUserId(ClaimsPrincipal principal)
        {
            var userId = FirstNonEmpty(
                GetClaim(principal, "oid"),
                GetClaim(principal, "http://schemas.microsoft.com/identity/claims/objectidentifier"),
                GetClaim(principal, "sub"),
                GetClaim(principal, ClaimTypes.NameIdentifier),
                GetClaim(principal, "upn"),
                GetClaim(principal, "preferred_username"),
                GetClaim(principal, ClaimTypes.Upn),
                GetClaim(principal, ClaimTypes.Email),
                GetClaim(principal, "email"));

            return string.IsNullOrWhiteSpace(userId)
                ? null
                : userId.Trim();
        }

        private static string? FirstNonEmpty(params string?[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }

        private static string? GetClaim(ClaimsPrincipal principal, string claimType)
        {
            return principal.FindFirst(claimType)?.Value;
        }
    }
}
