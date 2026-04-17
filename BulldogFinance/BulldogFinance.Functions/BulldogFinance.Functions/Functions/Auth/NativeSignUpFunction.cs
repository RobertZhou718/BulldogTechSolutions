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
    public sealed class NativeSignUpFunction
    {
        private readonly IExternalAuthProxyService _externalAuthProxyService;
        private readonly ILogger<NativeSignUpFunction> _logger;

        public NativeSignUpFunction(
            IExternalAuthProxyService externalAuthProxyService,
            ILogger<NativeSignUpFunction> logger)
        {
            _externalAuthProxyService = externalAuthProxyService;
            _logger = logger;
        }

        [Function("NativeSignUp")]
        public async Task<HttpResponseData> StartSignUpAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/signup")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativeSignUpRequest>(req, cancellationToken);
                if (request == null || string.IsNullOrWhiteSpace(request.GetIdentifier()))
                {
                    return await AuthProxyJson.WriteResponseAsync(
                        req,
                        HttpStatusCode.BadRequest,
                        AuthProxyJson.CreateError(
                            correlationId,
                            "invalid_request",
                            "email or username is required to start sign-up."),
                        cancellationToken);
                }

                var result = await _externalAuthProxyService.SignUpAsync(request, correlationId, cancellationToken);
                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid native sign-up payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Native sign-up failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while processing the sign-up request."),
                    cancellationToken);
            }
        }

        [Function("NativeSignUpChallenge")]
        public async Task<HttpResponseData> CompleteChallengeAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/native/signup/challenge")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var correlationId = AuthProxyJson.GetCorrelationId(req);

            try
            {
                var request = await AuthProxyJson.ReadRequestAsync<NativeChallengeRequest>(req, cancellationToken);
                if (request == null || !request.HasPayload())
                {
                    return await AuthProxyJson.WriteResponseAsync(
                        req,
                        HttpStatusCode.BadRequest,
                        AuthProxyJson.CreateError(
                            correlationId,
                            "invalid_request",
                            "A sign-up challenge payload is required."),
                        cancellationToken);
                }

                var result = await _externalAuthProxyService.CompleteSignUpChallengeAsync(
                    request,
                    correlationId,
                    cancellationToken);

                return await AuthProxyJson.WriteResponseAsync(req, result.StatusCode, result.Payload, cancellationToken);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid native sign-up challenge payload. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.BadRequest,
                    AuthProxyJson.CreateError(correlationId, "invalid_json", "The request body must be valid JSON."),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Native sign-up challenge failed unexpectedly. CorrelationId={CorrelationId}", correlationId);
                return await AuthProxyJson.WriteResponseAsync(
                    req,
                    HttpStatusCode.InternalServerError,
                    AuthProxyJson.CreateError(
                        correlationId,
                        "unexpected_error",
                        "An unexpected error occurred while processing the sign-up challenge."),
                    cancellationToken);
            }
        }
    }
}
