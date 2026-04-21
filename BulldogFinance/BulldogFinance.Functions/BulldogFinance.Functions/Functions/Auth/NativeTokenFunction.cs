using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativeTokenFunction
    {
        private readonly IExternalAuthProxyService _externalAuthProxyService;
        private readonly ILogger<NativeTokenFunction> _logger;

        public NativeTokenFunction(
            IExternalAuthProxyService externalAuthProxyService,
            ILogger<NativeTokenFunction> logger)
        {
            _externalAuthProxyService = externalAuthProxyService;
            _logger = logger;
        }

        [Function("NativeTokenRefresh")]
        public async Task<HttpResponseData> RefreshAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/token/refresh")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativeTokenRefreshRequest>(req, cancellationToken);
                if (request == null || !request.HasPayload())
                {
                    return await AuthProxyJson.WriteResponseAsync(
                        req,
                        HttpStatusCode.BadRequest,
                        AuthProxyJson.CreateError(
                            correlationId,
                            "invalid_request",
                            "A refresh token payload is required."),
                        cancellationToken);
                }

                var result = await _externalAuthProxyService.RefreshTokenAsync(request, correlationId, cancellationToken);
                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid token refresh payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token refresh failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while refreshing the token."),
                    cancellationToken);
            }
        }
    }
}
