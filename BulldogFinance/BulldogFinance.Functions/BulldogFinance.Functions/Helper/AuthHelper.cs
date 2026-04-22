using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Helper
{
    public static class AuthHelper
    {
        public const string AuthenticatedPrincipalContextKey = "AuthenticatedPrincipal";
        public const string AuthenticatedUserIdContextKey = "AuthenticatedUserId";

        private const string DebugUserIdHeaderName = "X-Debug-UserId";
        private const string AllowDebugHeaderSetting = "Auth__AllowDebugUserIdHeader";
        private const string ClientPrincipalNameHeaderName = "X-MS-CLIENT-PRINCIPAL-NAME";
        private const string ClientPrincipalIdHeaderName = "X-MS-CLIENT-PRINCIPAL-ID";

        public static string? GetUserEmail(HttpRequestData req) =>
            GetFirstHeaderValue(req, ClientPrincipalNameHeaderName);

        public static string? GetUserId(HttpRequestData req)
        {
            //if (req.FunctionContext.Items.TryGetValue(AuthenticatedUserIdContextKey, out var authenticatedUserId)
            //    && authenticatedUserId is string userId
            //    && !string.IsNullOrWhiteSpace(userId))
            //{
            //    return userId;
            //}

            var principalId = GetFirstHeaderValue(req, ClientPrincipalIdHeaderName);
            if (!string.IsNullOrWhiteSpace(principalId))
            {
                return principalId;
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

        private static string? GetFirstHeaderValue(HttpRequestData req, string headerName)
        {
            if (!req.Headers.TryGetValues(headerName, out var values))
            {
                return null;
            }

            var value = values.FirstOrDefault();
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static bool AllowDebugUserIdHeader()
        {
            var configured = Environment.GetEnvironmentVariable(AllowDebugHeaderSetting);
            return bool.TryParse(configured, out var enabled) && enabled;
        }
    }
}
