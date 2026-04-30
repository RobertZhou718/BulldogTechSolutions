using System.Security.Claims;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Helper
{
    public static class AuthHelper
    {
        public const string AuthenticatedPrincipalContextKey = "AuthenticatedPrincipal";
        public const string AuthenticatedUserIdContextKey = "AuthenticatedUserId";

        public static string? GetUserEmail(HttpRequestData req)
        {
            if (!req.FunctionContext.Items.TryGetValue(AuthenticatedPrincipalContextKey, out var principalObj)
                || principalObj is not ClaimsPrincipal principal)
            {
                return null;
            }

            var email = principal.FindFirst("email")?.Value
                ?? principal.FindFirst("preferred_username")?.Value
                ?? principal.FindFirst(ClaimTypes.Email)?.Value;

            return string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        }

        public static string? GetUserId(HttpRequestData req)
        {
            if (req.FunctionContext.Items.TryGetValue(AuthenticatedUserIdContextKey, out var authenticatedUserId)
                && authenticatedUserId is string userId
                && !string.IsNullOrWhiteSpace(userId))
            {
                return userId.Trim();
            }

            return null;
        }
    }
}
