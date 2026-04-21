using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativeSignInFunction
    {
        private readonly IExternalAuthProxyService _externalAuthProxyService;
        private readonly ILogger<NativeSignInFunction> _logger;

        public NativeSignInFunction(
            IExternalAuthProxyService externalAuthProxyService,
            ILogger<NativeSignInFunction> logger)
        {
            _externalAuthProxyService = externalAuthProxyService;
            _logger = logger;
        }

        [Function("NativeSignIn")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/signin")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativeSignInRequest>(req, cancellationToken);
                if (request == null
                    || string.IsNullOrWhiteSpace(request.Password)
                    || string.IsNullOrWhiteSpace(request.GetIdentifier()))
                {
                    return await AuthProxyJson.WriteResponseAsync(
                        req,
                        HttpStatusCode.BadRequest,
                        AuthProxyJson.CreateError(
                            correlationId,
                            "invalid_request",
                            "email or username and password are required."),
                        cancellationToken);
                }

                var result = await _externalAuthProxyService.SignInAsync(request, correlationId, cancellationToken);
                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid native sign-in payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Native sign-in failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while processing the sign-in request."),
                    cancellationToken);
            }
        }
    }
}
