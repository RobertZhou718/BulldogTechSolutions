using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Helper
{
    public static class AuthHelper
    {
        public const string AuthenticatedPrincipalContextKey = "AuthenticatedPrincipal";
        public const string AuthenticatedUserIdContextKey = "AuthenticatedUserId";

        private const string DebugUserIdHeaderName = "X-Debug-UserId";
        private const string AllowDebugHeaderSetting = "Auth__AllowDebugUserIdHeader";

        public static string? GetUserId(HttpRequestData req)
        {
            if (req.FunctionContext.Items.TryGetValue(AuthenticatedUserIdContextKey, out var authenticatedUserId)
                && authenticatedUserId is string userId
                && !string.IsNullOrWhiteSpace(userId))
            {
                return userId;
            }

            if (req.Headers.TryGetValues("X-MS-CLIENT-PRINCIPAL-ID", out var principalIds))
            {
                var id = principalIds.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(id))
                {
                    return id;
                }
            }

            if (!AllowDebugUserIdHeader())
            {
                return null;
            }

            if (req.Headers.TryGetValues(DebugUserIdHeaderName, out var debugIds))
            {
                var id = debugIds.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(id))
                {
                    return id;
                }
            }

            return null;
        }

        private static bool AllowDebugUserIdHeader()
        {
            var configured = Environment.GetEnvironmentVariable(AllowDebugHeaderSetting);
            return bool.TryParse(configured, out var enabled) && enabled;
        }
    }
}
