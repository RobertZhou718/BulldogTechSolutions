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
        // HTTP functions that intentionally accept anonymous traffic. Everything else
        // requires a valid bearer token; missing/invalid tokens get 401 here.
        private static readonly HashSet<string> AnonymousFunctions = new(StringComparer.OrdinalIgnoreCase)
        {
            "NativeAuthProxy", // CIAM native-auth gateway, used pre-login
            "PlaidWebhook"     // Plaid webhook, validates its own signature
        };

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

            // Non-HTTP triggers bypass auth (queue, timer, etc.).
            if (request == null)
            {
                await next(context);
                return;
            }

            var functionName = context.FunctionDefinition.Name;
            var isAnonymous = AnonymousFunctions.Contains(functionName);

            if (!TryGetBearerToken(request, out var bearerToken))
            {
                if (isAnonymous)
                {
                    await next(context);
                    return;
                }

                _logger.LogWarning(
                    "Rejecting request without bearer token. Function={FunctionName}",
                    functionName);

                await WriteUnauthorizedAsync(context, request, "A bearer token is required.");
                return;
            }

            var result = await _authTokenValidator.ValidateAsync(bearerToken, CancellationToken.None);
            if (!result.IsAuthenticated)
            {
                _logger.LogWarning(
                    "Rejecting request with invalid bearer token. Function={FunctionName} StatusCode={StatusCode}",
                    functionName,
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

        private static async Task WriteUnauthorizedAsync(
            FunctionContext context,
            HttpRequestData request,
            string message)
        {
            var response = request.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
            await response.WriteStringAsync(message);
            context.GetInvocationResult().Value = response;
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
