using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Helper
{
    public static class AuthHelper
    {
        private const string DebugUserIdHeaderName = "X-Debug-UserId";
        private const string AllowDebugHeaderSetting = "Auth__AllowDebugUserIdHeader";

        public static string? GetUserId(HttpRequestData req)
        {
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
