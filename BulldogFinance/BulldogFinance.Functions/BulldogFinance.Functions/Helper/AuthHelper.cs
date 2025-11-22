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
        public static string? GetUserId(HttpRequestData req)
        {
            // 1. Azure 内置 Auth：X-MS-CLIENT-PRINCIPAL-ID （推荐作为稳定 userId）
            if (req.Headers.TryGetValues("X-MS-CLIENT-PRINCIPAL-ID", out var principalIds))
            {
                var id = principalIds.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(id))
                {
                    return id;
                }
            }

            // 2. 本地开发 / 手工调试：X-Debug-UserId
            if (req.Headers.TryGetValues("X-Debug-UserId", out var debugIds))
            {
                var id = debugIds.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(id))
                {
                    return id;
                }
            }

            return null;
        }
    }
}
