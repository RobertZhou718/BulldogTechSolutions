using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativeSignOutFunction
    {
        private readonly IExternalAuthProxyService _externalAuthProxyService;
        private readonly ILogger<NativeSignOutFunction> _logger;

        public NativeSignOutFunction(
            IExternalAuthProxyService externalAuthProxyService,
            ILogger<NativeSignOutFunction> logger)
        {
            _externalAuthProxyService = externalAuthProxyService;
            _logger = logger;
        }

        [Function("NativeSignOut")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/signout")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativeSignOutRequest>(req, cancellationToken)
                    ?? new NativeSignOutRequest();

                var result = await _externalAuthProxyService.SignOutAsync(request, correlationId, cancellationToken);
                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid sign-out payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Sign-out failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while signing out."),
                    cancellationToken);
            }
        }
    }
}
