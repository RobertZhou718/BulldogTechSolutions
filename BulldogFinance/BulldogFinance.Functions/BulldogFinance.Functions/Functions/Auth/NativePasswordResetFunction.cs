using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativePasswordResetFunction
    {
        private readonly IExternalAuthProxyService _externalAuthProxyService;
        private readonly ILogger<NativePasswordResetFunction> _logger;

        public NativePasswordResetFunction(
            IExternalAuthProxyService externalAuthProxyService,
            ILogger<NativePasswordResetFunction> logger)
        {
            _externalAuthProxyService = externalAuthProxyService;
            _logger = logger;
        }

        [Function("NativePasswordResetStart")]
        public async Task<HttpResponseData> StartAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/password/reset/start")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativePasswordResetStartRequest>(req, cancellationToken);
                if (request == null || string.IsNullOrWhiteSpace(request.GetIdentifier()))
                {
                    return await AuthProxyJson.WriteResponseAsync(
                        req,
                        HttpStatusCode.BadRequest,
                        AuthProxyJson.CreateError(
                            correlationId,
                            "invalid_request",
                            "email or username is required to start password reset."),
                        cancellationToken);
                }

                var result = await _externalAuthProxyService.StartPasswordResetAsync(
                    request,
                    correlationId,
                    cancellationToken);

                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid password reset start payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Password reset start failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while starting password reset."),
                    cancellationToken);
            }
        }

        [Function("NativePasswordResetVerify")]
        public async Task<HttpResponseData> VerifyAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/password/reset/verify")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativePasswordResetVerifyRequest>(req, cancellationToken);
                if (request == null || !request.HasPayload())
                {
                    return await AuthProxyJson.WriteResponseAsync(
                        req,
                        HttpStatusCode.BadRequest,
                        AuthProxyJson.CreateError(
                            correlationId,
                            "invalid_request",
                            "A password reset verification payload is required."),
                        cancellationToken);
                }

                var result = await _externalAuthProxyService.VerifyPasswordResetAsync(
                    request,
                    correlationId,
                    cancellationToken);

                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid password reset verify payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Password reset verify failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while completing password reset."),
                    cancellationToken);
            }
        }
    }
}
