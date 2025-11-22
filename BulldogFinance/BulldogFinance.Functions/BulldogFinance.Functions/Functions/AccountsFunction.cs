using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Functions
{
    public class AccountsFunction
    {
        private readonly IAccountRepository _accountRepository;

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public AccountsFunction(IAccountRepository accountRepository)
        {
            _accountRepository = accountRepository;
        }

        [Function("GetAccounts")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "accounts")]
            HttpRequestData req,
            FunctionContext context)
        {
            // 临时：用 header 模拟 userId
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            // 解析查询字符串 includeArchived
            bool includeArchived = false;
            var query = req.Url.Query; // 形如 "?includeArchived=true"
            if (!string.IsNullOrEmpty(query))
            {
                var trimmed = query.TrimStart('?');
                var pairs = trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries);
                foreach (var pair in pairs)
                {
                    var kv = pair.Split('=', 2);
                    if (kv.Length == 2 &&
                        string.Equals(kv[0], "includeArchived", StringComparison.OrdinalIgnoreCase))
                    {
                        if (bool.TryParse(Uri.UnescapeDataString(kv[1]), out var parsed))
                        {
                            includeArchived = parsed;
                        }
                        break;
                    }
                }
            }

            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived);

            var dtoList = accounts
                .OrderBy(a => a.SortOrder)
                .ThenBy(a => a.Name)
                .Select(a => new AccountDto
                {
                    AccountId = a.RowKey,
                    Name = a.Name,
                    Type = a.Type,
                    Currency = a.Currency,
                    CurrentBalance = a.CurrentBalanceCents / 100m,
                    IsArchived = a.IsArchived
                })
                .ToList();

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(dtoList, JsonOptions));

            return response;
        }
    }
}
