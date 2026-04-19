using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services.Auth
{
    public interface INativeAuthApiProxyService
    {
        Task<HttpResponseMessage> ForwardAsync(
            string relativePath,
            string body,
            string correlationId,
            CancellationToken cancellationToken = default);
    }

    public sealed class NativeAuthApiProxyService : INativeAuthApiProxyService
    {
        private static readonly HashSet<string> AllowedPaths = new(StringComparer.OrdinalIgnoreCase)
        {
            "/oauth2/v2.0/initiate",
            "/oauth2/v2.0/challenge",
            "/oauth2/v2.0/token",
            "/oauth2/v2.0/introspect",
            "/signup/v1.0/start",
            "/signup/v1.0/challenge",
            "/signup/v1.0/continue",
            "/resetpassword/v1.0/start",
            "/resetpassword/v1.0/challenge",
            "/resetpassword/v1.0/continue",
            "/resetpassword/v1.0/submit",
            "/resetpassword/v1.0/poll_completion",
            "/register/v1.0/introspect",
            "/register/v1.0/challenge",
            "/register/v1.0/continue"
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<NativeAuthApiProxyService> _logger;
        private readonly string? _upstreamBaseUrl;

        public NativeAuthApiProxyService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<NativeAuthApiProxyService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;

            var tenantSubdomain = configuration["Auth:TenantSubdomain"]?.Trim()
                ?? configuration["Auth:TenantName"]?.Trim()
                ?? configuration["AuthProxy:TenantSubdomain"]?.Trim();

            if (!string.IsNullOrWhiteSpace(tenantSubdomain))
            {
                _upstreamBaseUrl =
                    $"https://{tenantSubdomain}.ciamlogin.com/{tenantSubdomain}.onmicrosoft.com";
            }
        }

        public async Task<HttpResponseMessage> ForwardAsync(
            string relativePath,
            string body,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            var normalizedPath = NormalizePath(relativePath);

            if (!AllowedPaths.Contains(normalizedPath))
            {
                throw new InvalidOperationException($"The native auth path '{normalizedPath}' is not allowed.");
            }

            if (string.IsNullOrWhiteSpace(_upstreamBaseUrl))
            {
                throw new InvalidOperationException("Native auth upstream configuration is incomplete.");
            }

            var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_upstreamBaseUrl}{normalizedPath}");
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.TryAddWithoutValidation("x-ms-client-request-id", correlationId);
            request.Content = new StringContent(body ?? string.Empty);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");

            _logger.LogInformation(
                "Forwarding native auth request. CorrelationId={CorrelationId} Path={Path}",
                correlationId,
                normalizedPath);

            return await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }

        private static string NormalizePath(string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return "/";
            }

            var trimmed = relativePath.Trim();
            return trimmed.StartsWith("/", StringComparison.Ordinal) ? trimmed : $"/{trimmed}";
        }
    }
}
