using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace BulldogFinance.Functions.Services.Auth
{
    public sealed class NativeSignInRequest
    {
        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }

        public string? GetIdentifier()
        {
            if (!string.IsNullOrWhiteSpace(Email))
            {
                return Email;
            }

            return Username;
        }
    }

    public sealed class NativeSignUpRequest
    {
        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("givenName")]
        public string? GivenName { get; set; }

        [JsonPropertyName("surname")]
        public string? Surname { get; set; }

        [JsonPropertyName("attributes")]
        public IDictionary<string, JsonElement>? Attributes { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }

        public string? GetIdentifier()
        {
            if (!string.IsNullOrWhiteSpace(Email))
            {
                return Email;
            }

            return Username;
        }
    }

    public sealed class NativeChallengeRequest
    {
        [JsonPropertyName("sessionId")]
        public string? SessionId { get; set; }

        [JsonPropertyName("challengeType")]
        public string? ChallengeType { get; set; }

        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("action")]
        public string? Action { get; set; }

        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonPropertyName("continuationToken")]
        public string? ContinuationToken { get; set; }

        [JsonPropertyName("attributes")]
        public IDictionary<string, JsonElement>? Attributes { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }

        public bool HasPayload()
        {
            return !string.IsNullOrWhiteSpace(SessionId)
                || !string.IsNullOrWhiteSpace(ChallengeType)
                || !string.IsNullOrWhiteSpace(Code)
                || !string.IsNullOrWhiteSpace(Action)
                || !string.IsNullOrWhiteSpace(Password)
                || !string.IsNullOrWhiteSpace(ContinuationToken)
                || Attributes is { Count: > 0 }
                || AdditionalData is { Count: > 0 };
        }
    }

    public sealed class NativePasswordResetStartRequest
    {
        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }

        public string? GetIdentifier()
        {
            if (!string.IsNullOrWhiteSpace(Email))
            {
                return Email;
            }

            return Username;
        }
    }

    public sealed class NativePasswordResetVerifyRequest
    {
        [JsonPropertyName("sessionId")]
        public string? SessionId { get; set; }

        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonPropertyName("newPassword")]
        public string? NewPassword { get; set; }

        [JsonPropertyName("action")]
        public string? Action { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }

        public bool HasPayload()
        {
            return !string.IsNullOrWhiteSpace(SessionId)
                || !string.IsNullOrWhiteSpace(Code)
                || !string.IsNullOrWhiteSpace(Password)
                || !string.IsNullOrWhiteSpace(NewPassword)
                || !string.IsNullOrWhiteSpace(Action)
                || AdditionalData is { Count: > 0 };
        }
    }

    public sealed class NativeSocialAuthStartRequest
    {
        [JsonPropertyName("provider")]
        public string? Provider { get; set; }

        [JsonPropertyName("returnUrl")]
        public string? ReturnUrl { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("usePopup")]
        public bool? UsePopup { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }
    }

    public sealed class NativeTokenRefreshRequest
    {
        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("sessionId")]
        public string? SessionId { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }

        public bool HasPayload()
        {
            return !string.IsNullOrWhiteSpace(RefreshToken)
                || !string.IsNullOrWhiteSpace(SessionId)
                || AdditionalData is { Count: > 0 };
        }
    }

    public sealed class NativeSignOutRequest
    {
        [JsonPropertyName("sessionId")]
        public string? SessionId { get; set; }

        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("revokeTokens")]
        public bool? RevokeTokens { get; set; }

        [JsonPropertyName("postLogoutRedirectUri")]
        public string? PostLogoutRedirectUri { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JsonElement>? AdditionalData { get; set; }
    }

    public sealed class AuthProxyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("nextStep")]
        public string? NextStep { get; set; }

        [JsonPropertyName("correlationId")]
        public string? CorrelationId { get; set; }

        [JsonPropertyName("accessToken")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("refreshToken")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("expiresIn")]
        public int? ExpiresIn { get; set; }

        [JsonPropertyName("user")]
        public AuthProxyUser? User { get; set; }

        [JsonPropertyName("challenge")]
        public AuthProxyChallenge? Challenge { get; set; }

        [JsonPropertyName("social")]
        public AuthProxySocialStart? Social { get; set; }

        [JsonPropertyName("error")]
        public AuthProxyError? Error { get; set; }
    }

    public sealed class AuthProxyUser
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("givenName")]
        public string? GivenName { get; set; }

        [JsonPropertyName("surname")]
        public string? Surname { get; set; }
    }

    public sealed class AuthProxyChallenge
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("sessionId")]
        public string? SessionId { get; set; }

        [JsonPropertyName("methods")]
        public string[]? Methods { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("codeLength")]
        public int? CodeLength { get; set; }

        [JsonPropertyName("requiredAttributes")]
        public string[]? RequiredAttributes { get; set; }
    }

    public sealed class AuthProxySocialStart
    {
        [JsonPropertyName("provider")]
        public string? Provider { get; set; }

        [JsonPropertyName("authority")]
        public string? Authority { get; set; }

        [JsonPropertyName("clientId")]
        public string? ClientId { get; set; }

        [JsonPropertyName("redirectUri")]
        public string? RedirectUri { get; set; }

        [JsonPropertyName("targetUrl")]
        public string? TargetUrl { get; set; }

        [JsonPropertyName("prompt")]
        public string? Prompt { get; set; }

        [JsonPropertyName("domainHint")]
        public string? DomainHint { get; set; }

        [JsonPropertyName("usePopup")]
        public bool? UsePopup { get; set; }

        [JsonPropertyName("scopes")]
        public string[]? Scopes { get; set; }

        [JsonPropertyName("parameters")]
        public JsonElement? Parameters { get; set; }
    }

    public sealed class AuthProxyError
    {
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("details")]
        public JsonElement? Details { get; set; }
    }

    public sealed class AuthProxyServiceResult
    {
        public AuthProxyServiceResult(HttpStatusCode statusCode, AuthProxyResponse payload)
        {
            StatusCode = statusCode;
            Payload = payload;
        }

        public HttpStatusCode StatusCode { get; }

        public AuthProxyResponse Payload { get; }
    }

    internal sealed class AuthProxySettings
    {
        public string? BaseUrl { get; init; }

        public string? Audience { get; init; }

        public string? ClientId { get; init; }

        public string? TenantId { get; init; }

        public string? TenantSubdomain { get; init; }

        public string? RedirectUri { get; init; }

        public string? GoogleDomainHint { get; init; }

        public int TimeoutSeconds { get; init; }

        public bool HasBaseUrl => !string.IsNullOrWhiteSpace(BaseUrl);

        public string? Authority =>
            !string.IsNullOrWhiteSpace(TenantSubdomain)
            && !string.IsNullOrWhiteSpace(TenantId)
                ? $"https://{TenantSubdomain}.ciamlogin.com/{TenantId}"
                : null;

        public static AuthProxySettings FromConfiguration(IConfiguration configuration)
        {
            var timeoutSeconds = int.TryParse(configuration["AuthProxy:TimeoutSeconds"], out var parsedTimeout)
                && parsedTimeout > 0
                ? parsedTimeout
                : 30;

            return new AuthProxySettings
            {
                BaseUrl = configuration["AuthProxy:BaseUrl"]?.Trim(),
                Audience = configuration["AuthProxy:Audience"]?.Trim(),
                ClientId = configuration["AuthProxy:ClientId"]?.Trim(),
                TenantId = configuration["AuthProxy:TenantId"]?.Trim(),
                TenantSubdomain = configuration["AuthProxy:TenantSubdomain"]?.Trim(),
                RedirectUri = configuration["AuthProxy:RedirectUri"]?.Trim(),
                GoogleDomainHint = configuration["AuthProxy:GoogleDomainHint"]?.Trim(),
                TimeoutSeconds = timeoutSeconds
            };
        }
    }

    internal static class AuthProxyJson
    {
        public static readonly JsonSerializerOptions Options = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNameCaseInsensitive = true
        };

        public static async Task<T?> ReadRequestAsync<T>(
            HttpRequestData request,
            CancellationToken cancellationToken)
        {
            using var reader = new StreamReader(request.Body);
            var body = await reader.ReadToEndAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(body))
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(body, Options);
        }

        public static async Task<HttpResponseData> WriteResponseAsync(
            HttpRequestData request,
            HttpStatusCode statusCode,
            AuthProxyResponse payload,
            CancellationToken cancellationToken)
        {
            var response = request.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(payload, Options), cancellationToken);
            return response;
        }

        public static AuthProxyResponse CreateError(
            string correlationId,
            string code,
            string message,
            JsonElement? details = null)
        {
            return new AuthProxyResponse
            {
                Success = false,
                CorrelationId = correlationId,
                Error = new AuthProxyError
                {
                    Code = code,
                    Message = message,
                    Details = details
                }
            };
        }

        public static string GetCorrelationId(HttpRequestData request)
        {
            if (request.Headers.TryGetValues("x-correlation-id", out var values))
            {
                foreach (var value in values)
                {
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value.Trim();
                    }
                }
            }

            if (request.Headers.TryGetValues("x-ms-correlation-id", out values))
            {
                foreach (var value in values)
                {
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value.Trim();
                    }
                }
            }

            return Guid.NewGuid().ToString("N");
        }
    }

    internal static class AuthProxyLogMasker
    {
        public static string MaskIdentifier(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "<empty>";
            }

            var trimmed = value.Trim();
            var atIndex = trimmed.IndexOf('@');

            if (atIndex > 1)
            {
                return $"{trimmed[..1]}***{trimmed[atIndex..]}";
            }

            if (trimmed.Length <= 2)
            {
                return new string('*', trimmed.Length);
            }

            return $"{trimmed[..1]}***{trimmed[^1]}";
        }
    }
}
