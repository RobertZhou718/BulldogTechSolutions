using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services.Auth
{
    public sealed class ExternalAuthProxyService : IExternalAuthProxyService
    {
        private const string ClientName = "AuthProxy";
        private static readonly StringComparison IgnoreCase = StringComparison.OrdinalIgnoreCase;

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ExternalAuthProxyService> _logger;
        private readonly AuthProxySettings _settings;

        public ExternalAuthProxyService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<ExternalAuthProxyService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _settings = AuthProxySettings.FromConfiguration(configuration);
        }

        public Task<AuthProxyServiceResult> SignInAsync(
            NativeSignInRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Proxying native sign-in. CorrelationId={CorrelationId} Username={Username}",
                correlationId,
                AuthProxyLogMasker.MaskIdentifier(request.GetIdentifier()));

            return SendAsync(HttpMethod.Post, "auth/native/signin", request, correlationId, cancellationToken);
        }

        public Task<AuthProxyServiceResult> SignUpAsync(
            NativeSignUpRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Proxying native sign-up. CorrelationId={CorrelationId} Username={Username}",
                correlationId,
                AuthProxyLogMasker.MaskIdentifier(request.GetIdentifier()));

            return SendAsync(HttpMethod.Post, "auth/native/signup", request, correlationId, cancellationToken);
        }

        public Task<AuthProxyServiceResult> CompleteSignUpChallengeAsync(
            NativeChallengeRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Proxying native sign-up challenge. CorrelationId={CorrelationId} SessionId={SessionId}",
                correlationId,
                AuthProxyLogMasker.MaskIdentifier(request.SessionId));

            return SendAsync(HttpMethod.Post, "auth/native/signup/challenge", request, correlationId, cancellationToken);
        }

        public Task<AuthProxyServiceResult> StartPasswordResetAsync(
            NativePasswordResetStartRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Proxying password reset start. CorrelationId={CorrelationId} Username={Username}",
                correlationId,
                AuthProxyLogMasker.MaskIdentifier(request.GetIdentifier()));

            return SendAsync(
                HttpMethod.Post,
                "auth/native/password/reset/start",
                request,
                correlationId,
                cancellationToken);
        }

        public Task<AuthProxyServiceResult> VerifyPasswordResetAsync(
            NativePasswordResetVerifyRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Proxying password reset verify. CorrelationId={CorrelationId} SessionId={SessionId}",
                correlationId,
                AuthProxyLogMasker.MaskIdentifier(request.SessionId));

            return SendAsync(
                HttpMethod.Post,
                "auth/native/password/reset/verify",
                request,
                correlationId,
                cancellationToken);
        }

        public async Task<AuthProxyServiceResult> StartGoogleSocialAuthAsync(
            NativeSocialAuthStartRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Preparing Google native social auth start. CorrelationId={CorrelationId}",
                correlationId);

            if (!_settings.HasBaseUrl)
            {
                return BuildGoogleSocialStartFallback(correlationId);
            }

            var result = await SendAsync(
                HttpMethod.Post,
                "auth/native/social/google/start",
                request,
                correlationId,
                cancellationToken);

            if (result.Payload.Success && result.Payload.Social == null)
            {
                var fallback = BuildGoogleSocialStartPayload();
                if (fallback != null)
                {
                    result.Payload.Social = fallback;
                    result.Payload.NextStep ??= "redirect";
                }
            }

            return result;
        }

        public Task<AuthProxyServiceResult> RefreshTokenAsync(
            NativeTokenRefreshRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Proxying token refresh. CorrelationId={CorrelationId}", correlationId);
            return SendAsync(HttpMethod.Post, "auth/native/token/refresh", request, correlationId, cancellationToken);
        }

        public async Task<AuthProxyServiceResult> SignOutAsync(
            NativeSignOutRequest request,
            string correlationId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Proxying sign-out. CorrelationId={CorrelationId}", correlationId);

            if (!_settings.HasBaseUrl)
            {
                return CreateLocalSignOutResult(correlationId);
            }

            var result = await SendAsync(HttpMethod.Post, "auth/native/signout", request, correlationId, cancellationToken);

            if (result.Payload.Success && string.IsNullOrWhiteSpace(result.Payload.NextStep))
            {
                result.Payload.NextStep = "signed_out";
            }

            return result;
        }

        private async Task<AuthProxyServiceResult> SendAsync<TRequest>(
            HttpMethod method,
            string path,
            TRequest request,
            string correlationId,
            CancellationToken cancellationToken)
        {
            if (!_settings.HasBaseUrl)
            {
                return CreateConfigurationError(
                    correlationId,
                    "The auth proxy base URL is not configured.");
            }

            var client = _httpClientFactory.CreateClient(ClientName);
            if (client.BaseAddress == null)
            {
                return CreateConfigurationError(
                    correlationId,
                    "The auth proxy HTTP client is missing a base address.");
            }

            using var httpRequest = new HttpRequestMessage(method, path);
            httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            AddContextHeaders(httpRequest, correlationId);

            var payload = JsonSerializer.Serialize(request, AuthProxyJson.Options);
            httpRequest.Content = new StringContent(payload, Encoding.UTF8, "application/json");

            try
            {
                using var response = await client.SendAsync(httpRequest, cancellationToken);
                var body = response.Content == null
                    ? string.Empty
                    : await response.Content.ReadAsStringAsync(cancellationToken);

                var normalized = NormalizeResponse(body, response.StatusCode, correlationId, response.Headers);
                return new AuthProxyServiceResult(response.StatusCode, normalized);
            }
            catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    ex,
                    "Auth proxy request timed out. CorrelationId={CorrelationId} Path={Path}",
                    correlationId,
                    path);

                return new AuthProxyServiceResult(
                    HttpStatusCode.GatewayTimeout,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "auth_proxy_timeout",
                        "The auth service did not respond before the timeout expired."));
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(
                    ex,
                    "Auth proxy request failed. CorrelationId={CorrelationId} Path={Path}",
                    correlationId,
                    path);

                return new AuthProxyServiceResult(
                    HttpStatusCode.BadGateway,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "auth_proxy_unreachable",
                        "The auth service is currently unavailable."));
            }
        }

        private AuthProxyServiceResult BuildGoogleSocialStartFallback(string correlationId)
        {
            var social = BuildGoogleSocialStartPayload();
            if (social == null)
            {
                return CreateConfigurationError(
                    correlationId,
                    "Google social auth cannot be initialized because the required AuthProxy settings are incomplete.");
            }

            return new AuthProxyServiceResult(
                HttpStatusCode.OK,
                new AuthProxyResponse
                {
                    Success = true,
                    CorrelationId = correlationId,
                    NextStep = "redirect",
                    Social = social
                });
        }

        private AuthProxyServiceResult CreateLocalSignOutResult(string correlationId)
        {
            return new AuthProxyServiceResult(
                HttpStatusCode.OK,
                new AuthProxyResponse
                {
                    Success = true,
                    CorrelationId = correlationId,
                    NextStep = "signed_out"
                });
        }

        private AuthProxyServiceResult CreateConfigurationError(string correlationId, string message)
        {
            _logger.LogWarning(
                "Auth proxy configuration is incomplete. CorrelationId={CorrelationId}",
                correlationId);

            return new AuthProxyServiceResult(
                HttpStatusCode.ServiceUnavailable,
                AuthProxyJson.CreateError(correlationId, "auth_proxy_not_configured", message));
        }

        private void AddContextHeaders(HttpRequestMessage request, string correlationId)
        {
            AddHeader(request, "x-correlation-id", correlationId);
            AddHeader(request, "x-authproxy-audience", _settings.Audience);
            AddHeader(request, "x-authproxy-client-id", _settings.ClientId);
            AddHeader(request, "x-authproxy-tenant-id", _settings.TenantId);
            AddHeader(request, "x-authproxy-tenant-subdomain", _settings.TenantSubdomain);
            AddHeader(request, "x-authproxy-redirect-uri", _settings.RedirectUri);
            AddHeader(request, "x-authproxy-google-domain-hint", _settings.GoogleDomainHint);
        }

        private static void AddHeader(HttpRequestMessage request, string name, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                request.Headers.TryAddWithoutValidation(name, value);
            }
        }

        private AuthProxyResponse NormalizeResponse(
            string body,
            HttpStatusCode statusCode,
            string correlationId,
            HttpResponseHeaders headers)
        {
            var effectiveCorrelationId =
                GetHeaderValue(headers, "x-correlation-id")
                ?? GetHeaderValue(headers, "x-ms-correlation-id")
                ?? correlationId;

            if (string.IsNullOrWhiteSpace(body))
            {
                return BuildEmptyResponse(statusCode, effectiveCorrelationId);
            }

            try
            {
                using var document = JsonDocument.Parse(body);
                return BuildResponseFromJson(document.RootElement, statusCode, effectiveCorrelationId);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Auth proxy returned invalid JSON. CorrelationId={CorrelationId}",
                    effectiveCorrelationId);

                if (IsSuccessStatusCode(statusCode))
                {
                    return new AuthProxyResponse
                    {
                        Success = true,
                        CorrelationId = effectiveCorrelationId
                    };
                }

                return AuthProxyJson.CreateError(
                    effectiveCorrelationId,
                    "invalid_upstream_response",
                    "The auth service returned an invalid response.");
            }
        }

        private AuthProxyResponse BuildEmptyResponse(HttpStatusCode statusCode, string correlationId)
        {
            if (IsSuccessStatusCode(statusCode))
            {
                return new AuthProxyResponse
                {
                    Success = true,
                    CorrelationId = correlationId
                };
            }

            return AuthProxyJson.CreateError(
                correlationId,
                $"upstream_{(int)statusCode}",
                "The auth service returned an empty error response.");
        }

        private AuthProxyResponse BuildResponseFromJson(
            JsonElement root,
            HttpStatusCode statusCode,
            string correlationId)
        {
            if (root.ValueKind != JsonValueKind.Object)
            {
                return BuildEmptyResponse(statusCode, correlationId);
            }

            var upstreamStatus = GetString(root, "status");
            var response = new AuthProxyResponse
            {
                CorrelationId = GetString(root, "correlationId") ?? correlationId,
                NextStep = GetString(root, "nextStep", "step"),
                AccessToken = GetString(root, "accessToken", "session.accessToken", "data.accessToken", "tokens.accessToken"),
                RefreshToken = GetString(root, "refreshToken", "session.refreshToken", "data.refreshToken", "tokens.refreshToken"),
                ExpiresIn = GetInt(root, "expiresIn", "session.expiresIn", "data.expiresIn", "tokens.expiresIn"),
                User = ExtractUser(root),
                Challenge = ExtractChallenge(root, upstreamStatus),
                Social = ExtractSocial(root),
                Error = ExtractError(root, statusCode)
            };

            var explicitSuccess = GetBool(root, "success");
            response.Success = explicitSuccess ?? (response.Error == null && IsSuccessStatusCode(statusCode));

            if (string.Equals(upstreamStatus, "authenticated", IgnoreCase)
                || string.Equals(upstreamStatus, "completed", IgnoreCase))
            {
                response.Success = true;
                response.NextStep ??= "completed";
            }

            if (string.Equals(upstreamStatus, "next_step", IgnoreCase))
            {
                response.Success = true;
                response.NextStep ??= response.Challenge?.Type ?? "challenge";
            }

            if (GetBool(root, "signedOut") == true)
            {
                response.Success = true;
                response.NextStep ??= "signed_out";
            }

            if (!string.IsNullOrWhiteSpace(response.AccessToken))
            {
                response.Success = true;
                response.NextStep ??= "completed";
            }

            if (response.Social != null)
            {
                response.Success = true;
                response.NextStep ??= "redirect";
            }

            if (response.Challenge != null)
            {
                response.Success = true;
                response.NextStep ??= response.Challenge.Type ?? "challenge";
            }

            if (response.Error != null)
            {
                response.Success = false;
                response.NextStep = null;
            }

            return response;
        }

        private static AuthProxyUser? ExtractUser(JsonElement root)
        {
            var userElement = FindElement(root, "user", "session.user", "data.user");
            if (userElement is not { ValueKind: JsonValueKind.Object })
            {
                return null;
            }

            var user = new AuthProxyUser
            {
                Id = GetString(userElement.Value, "id", "userId", "sub", "localAccountId", "homeAccountId"),
                Email = GetString(userElement.Value, "email", "username", "preferred_username"),
                DisplayName = GetString(userElement.Value, "displayName", "name"),
                GivenName = GetString(userElement.Value, "givenName", "given_name"),
                Surname = GetString(userElement.Value, "surname", "family_name")
            };

            if (string.IsNullOrWhiteSpace(user.Id)
                && string.IsNullOrWhiteSpace(user.Email)
                && string.IsNullOrWhiteSpace(user.DisplayName)
                && string.IsNullOrWhiteSpace(user.GivenName)
                && string.IsNullOrWhiteSpace(user.Surname))
            {
                return null;
            }

            return user;
        }

        private static AuthProxyChallenge? ExtractChallenge(JsonElement root, string? upstreamStatus)
        {
            var challengeElement = FindElement(root, "challenge");
            var source = challengeElement is { ValueKind: JsonValueKind.Object } ? challengeElement.Value : root;

            var type = GetString(source, "type", "challengeType")
                ?? GetString(root, "nextStep", "step");
            var sessionId = GetString(source, "sessionId", "flowId", "challengeId")
                ?? GetString(root, "sessionId", "flowId");
            var methods = GetStringArray(source, "methods", "allowedMethods")
                ?? GetStringArray(root, "challengeTypes");
            var codeLength = GetInt(source, "codeLength")
                ?? GetInt(root, "codeLength");
            var requiredAttributes = GetStringArray(source, "requiredAttributes")
                ?? GetStringArray(root, "requiredAttributes");

            var isChallenge =
                challengeElement is not null
                || string.Equals(upstreamStatus, "next_step", IgnoreCase)
                || !string.IsNullOrWhiteSpace(type)
                || !string.IsNullOrWhiteSpace(sessionId)
                || methods is { Length: > 0 }
                || codeLength.HasValue
                || requiredAttributes is { Length: > 0 };

            if (!isChallenge)
            {
                return null;
            }

            return new AuthProxyChallenge
            {
                Type = type,
                SessionId = sessionId,
                Methods = methods,
                Message = GetString(source, "message", "description")
                    ?? GetString(root, "message", "description"),
                CodeLength = codeLength,
                RequiredAttributes = requiredAttributes
            };
        }

        private static AuthProxySocialStart? ExtractSocial(JsonElement root)
        {
            var socialElement = FindElement(root, "social");
            var source = socialElement is { ValueKind: JsonValueKind.Object } ? socialElement.Value : root;

            var provider = GetString(source, "provider");
            var authority = GetString(source, "authority");
            var clientId = GetString(source, "clientId");
            var redirectUri = GetString(source, "redirectUri");
            var targetUrl = GetString(source, "targetUrl", "redirectUrl", "url");
            var prompt = GetString(source, "prompt");
            var domainHint = GetString(source, "domainHint");
            var usePopup = GetBool(source, "usePopup");
            var scopes = GetStringArray(source, "scopes");
            var parameters = CloneElement(FindElement(source, "parameters", "popup"));

            var hasSocialData =
                socialElement is not null
                || !string.IsNullOrWhiteSpace(provider)
                || !string.IsNullOrWhiteSpace(authority)
                || !string.IsNullOrWhiteSpace(clientId)
                || !string.IsNullOrWhiteSpace(redirectUri)
                || !string.IsNullOrWhiteSpace(targetUrl)
                || !string.IsNullOrWhiteSpace(prompt)
                || !string.IsNullOrWhiteSpace(domainHint)
                || usePopup.HasValue
                || scopes is { Length: > 0 }
                || parameters.HasValue;

            if (!hasSocialData)
            {
                return null;
            }

            return new AuthProxySocialStart
            {
                Provider = provider,
                Authority = authority,
                ClientId = clientId,
                RedirectUri = redirectUri,
                TargetUrl = targetUrl,
                Prompt = prompt,
                DomainHint = domainHint,
                UsePopup = usePopup,
                Scopes = scopes,
                Parameters = parameters
            };
        }

        private static AuthProxyError? ExtractError(JsonElement root, HttpStatusCode statusCode)
        {
            var shouldExtract =
                !IsSuccessStatusCode(statusCode)
                || GetBool(root, "success") == false
                || string.Equals(GetString(root, "status"), "failed", IgnoreCase)
                || HasPath(root, "error")
                || HasPath(root, "errors");

            if (!shouldExtract)
            {
                return null;
            }

            var errorElement = FindElement(root, "error");
            var details = CloneElement(FindElement(root, "error.details", "details", "errors"));
            var code = GetString(root, "error.code", "errorCode", "code");
            var message = GetString(
                root,
                "error.message",
                "error.errorDescription",
                "error.error_description",
                "message",
                "description",
                "error_description");

            if (errorElement is { ValueKind: JsonValueKind.String })
            {
                code ??= errorElement.Value.GetString();
                message ??= errorElement.Value.GetString();
            }

            code ??= $"upstream_{(int)statusCode}";
            message ??= IsSuccessStatusCode(statusCode)
                ? "The auth flow could not be completed."
                : "The auth service returned an error.";

            return new AuthProxyError
            {
                Code = code,
                Message = message,
                Details = details
            };
        }

        private AuthProxySocialStart? BuildGoogleSocialStartPayload()
        {
            if (string.IsNullOrWhiteSpace(_settings.ClientId)
                || string.IsNullOrWhiteSpace(_settings.RedirectUri)
                || string.IsNullOrWhiteSpace(_settings.Authority))
            {
                return null;
            }

            var scopes = new List<string> { "openid", "profile", "email" };
            if (!string.IsNullOrWhiteSpace(_settings.Audience))
            {
                scopes.Add(_settings.Audience);
            }

            return new AuthProxySocialStart
            {
                Provider = "google",
                Authority = _settings.Authority,
                ClientId = _settings.ClientId,
                RedirectUri = _settings.RedirectUri,
                Prompt = "login",
                DomainHint = string.IsNullOrWhiteSpace(_settings.GoogleDomainHint)
                    ? "Google"
                    : _settings.GoogleDomainHint,
                UsePopup = true,
                Scopes = scopes.ToArray()
            };
        }

        private static string? GetHeaderValue(HttpResponseHeaders headers, string name)
        {
            if (headers.TryGetValues(name, out var values))
            {
                return values.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));
            }

            return null;
        }

        private static bool IsSuccessStatusCode(HttpStatusCode statusCode)
        {
            var numeric = (int)statusCode;
            return numeric is >= 200 and < 300;
        }

        private static bool HasPath(JsonElement root, string path)
        {
            return FindElement(root, path).HasValue;
        }

        private static JsonElement? FindElement(JsonElement root, params string[] paths)
        {
            foreach (var path in paths)
            {
                if (TryGetPath(root, path, out var element))
                {
                    return element;
                }
            }

            return null;
        }

        private static bool TryGetPath(JsonElement root, string path, out JsonElement element)
        {
            element = root;

            foreach (var segment in path.Split('.', StringSplitOptions.RemoveEmptyEntries))
            {
                if (element.ValueKind != JsonValueKind.Object)
                {
                    return false;
                }

                if (!TryGetPropertyIgnoreCase(element, segment, out element))
                {
                    return false;
                }
            }

            return true;
        }

        private static bool TryGetPropertyIgnoreCase(
            JsonElement element,
            string propertyName,
            out JsonElement value)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (string.Equals(property.Name, propertyName, IgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }

            value = default;
            return false;
        }

        private static string? GetString(JsonElement root, params string[] paths)
        {
            var element = FindElement(root, paths);
            if (!element.HasValue)
            {
                return null;
            }

            return element.Value.ValueKind switch
            {
                JsonValueKind.String => element.Value.GetString(),
                JsonValueKind.Number => element.Value.ToString(),
                JsonValueKind.True => bool.TrueString.ToLowerInvariant(),
                JsonValueKind.False => bool.FalseString.ToLowerInvariant(),
                _ => null
            };
        }

        private static int? GetInt(JsonElement root, params string[] paths)
        {
            var element = FindElement(root, paths);
            if (!element.HasValue)
            {
                return null;
            }

            if (element.Value.ValueKind == JsonValueKind.Number
                && element.Value.TryGetInt32(out var intValue))
            {
                return intValue;
            }

            if (element.Value.ValueKind == JsonValueKind.String
                && int.TryParse(element.Value.GetString(), out intValue))
            {
                return intValue;
            }

            return null;
        }

        private static bool? GetBool(JsonElement root, params string[] paths)
        {
            var element = FindElement(root, paths);
            if (!element.HasValue)
            {
                return null;
            }

            if (element.Value.ValueKind is JsonValueKind.True or JsonValueKind.False)
            {
                return element.Value.GetBoolean();
            }

            if (element.Value.ValueKind == JsonValueKind.String
                && bool.TryParse(element.Value.GetString(), out var boolValue))
            {
                return boolValue;
            }

            return null;
        }

        private static string[]? GetStringArray(JsonElement root, params string[] paths)
        {
            var element = FindElement(root, paths);
            if (!element.HasValue)
            {
                return null;
            }

            if (element.Value.ValueKind == JsonValueKind.Array)
            {
                var items = element.Value
                    .EnumerateArray()
                    .Select(static item => item.ValueKind switch
                    {
                        JsonValueKind.String => item.GetString(),
                        JsonValueKind.Number => item.ToString(),
                        _ => null
                    })
                    .OfType<string>()
                    .Where(static item => !string.IsNullOrWhiteSpace(item))
                    .ToArray();

                return items.Length == 0 ? null : items;
            }

            if (element.Value.ValueKind == JsonValueKind.String)
            {
                var value = element.Value.GetString();
                return string.IsNullOrWhiteSpace(value) ? null : new[] { value };
            }

            return null;
        }

        private static JsonElement? CloneElement(JsonElement? element)
        {
            if (!element.HasValue)
            {
                return null;
            }

            return element.Value.Clone();
        }
    }
}
