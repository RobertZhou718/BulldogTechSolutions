using System;
using System.Net;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions.Auth
{
    public sealed class NativeSocialAuthFunction
    {
        private readonly IExternalAuthProxyService _externalAuthProxyService;
        private readonly ILogger<NativeSocialAuthFunction> _logger;

        public NativeSocialAuthFunction(
            IExternalAuthProxyService externalAuthProxyService,
            ILogger<NativeSocialAuthFunction> logger)
        {
            _externalAuthProxyService = externalAuthProxyService;
            _logger = logger;
        }

        [Function("NativeSocialGoogleStart")]
        public async Task<HttpResponseData> StartGoogleAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/social/google/start")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativeSocialAuthStartRequest>(req, cancellationToken)
                    ?? new NativeSocialAuthStartRequest();

                request.Provider ??= "google";

                var result = await _externalAuthProxyService.StartGoogleSocialAuthAsync(
                    request,
                    correlationId,
                    cancellationToken);

                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid Google social auth payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google social auth start failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while starting Google sign-in."),
                    cancellationToken);
            }
        }
    }
}
