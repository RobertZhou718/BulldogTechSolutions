using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Middleware
{
    public sealed class BearerTokenAuthenticationMiddleware : IFunctionsWorkerMiddleware
    {
        private readonly IAuthTokenValidator _authTokenValidator;
        private readonly ILogger<BearerTokenAuthenticationMiddleware> _logger;

        public BearerTokenAuthenticationMiddleware(
            IAuthTokenValidator authTokenValidator,
            ILogger<BearerTokenAuthenticationMiddleware> logger)
        {
            _authTokenValidator = authTokenValidator;
            _logger = logger;
        }

        public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
        {
            var request = await context.GetHttpRequestDataAsync();
            if (request == null || !TryGetBearerToken(request, out var bearerToken))
            {
                await next(context);
                return;
            }

            var result = await _authTokenValidator.ValidateAsync(bearerToken, CancellationToken.None);
            if (!result.IsAuthenticated)
            {
                _logger.LogWarning(
                    "Rejecting request with invalid bearer token. Function={FunctionName} StatusCode={StatusCode}",
                    context.FunctionDefinition.Name,
                    (int)result.StatusCode);

                var response = request.CreateResponse(result.StatusCode);
                await response.WriteStringAsync(result.ErrorMessage ?? "Unauthorized.");
                context.GetInvocationResult().Value = response;
                return;
            }

            context.Items[AuthHelper.AuthenticatedUserIdContextKey] = result.UserId!;
            if (result.Principal != null)
            {
                context.Items[AuthHelper.AuthenticatedPrincipalContextKey] = result.Principal;
            }

            await next(context);
        }

        private static bool TryGetBearerToken(HttpRequestData request, out string bearerToken)
        {
            bearerToken = string.Empty;

            if (!request.Headers.TryGetValues("Authorization", out var authorizationHeaders))
            {
                return false;
            }

            var headerValue = authorizationHeaders.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value));
            if (string.IsNullOrWhiteSpace(headerValue))
            {
                return false;
            }

            const string bearerPrefix = "Bearer ";
            if (!headerValue.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            bearerToken = headerValue[bearerPrefix.Length..].Trim();
            return !string.IsNullOrWhiteSpace(bearerToken);
        }
    }
}
