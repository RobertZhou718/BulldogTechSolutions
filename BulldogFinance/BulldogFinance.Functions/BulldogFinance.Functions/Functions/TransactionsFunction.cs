using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Functions
{
    public class TransactionsFunction
    {
        private readonly IAccountRepository _accountRepository;
        private readonly ITransactionRepository _transactionRepository;

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public TransactionsFunction(
            IAccountRepository accountRepository,
            ITransactionRepository transactionRepository)
        {
            _accountRepository = accountRepository;
            _transactionRepository = transactionRepository;
        }

        [Function("CreateTransaction")]
        public async Task<HttpResponseData> Create(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "transactions")]
            HttpRequestData req,
            FunctionContext context)
        {
            // 1. userId（先用 header 模拟）
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            // 2. 读取 body
            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Request body is empty.");
                return bad;
            }

            TransactionCreateRequest? requestModel;
            try
            {
                requestModel = JsonSerializer.Deserialize<TransactionCreateRequest>(body, JsonOptions);
            }
            catch (JsonException)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Invalid JSON.");
                return bad;
            }

            if (requestModel == null ||
                string.IsNullOrWhiteSpace(requestModel.AccountId) ||
                requestModel.Amount <= 0)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("AccountId and positive Amount are required.");
                return bad;
            }

            var typeUpper = (requestModel.Type ?? string.Empty).Trim().ToUpperInvariant();
            if (typeUpper != "INCOME" && typeUpper != "EXPENSE")
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Type must be INCOME or EXPENSE.");
                return bad;
            }

            // 3. 获取账户
            var account = await _accountRepository.GetAccountAsync(userId, requestModel.AccountId);
            if (account == null || account.IsArchived)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteStringAsync("Account not found or archived.");
                return notFound;
            }

            var now = DateTime.UtcNow;
            var occurredAt = requestModel.OccurredAtUtc ?? now;

            // 金额转分
            var amountCents = (long)decimal.Round(
                requestModel.Amount * 100m,
                0,
                MidpointRounding.AwayFromZero);

            var currency = string.IsNullOrWhiteSpace(requestModel.Currency)
                ? account.Currency
                : requestModel.Currency!.Trim().ToUpperInvariant();

            // 4. 创建 TransactionEntity
            var transactionId = Guid.NewGuid().ToString("N");

            var transactionEntity = new TransactionEntity
            {
                PartitionKey = userId,
                RowKey = transactionId,
                AccountId = account.RowKey,
                Type = typeUpper,
                AmountCents = amountCents,
                Currency = currency,
                Category = requestModel.Category,
                Note = requestModel.Note,
                OccurredAtUtc = occurredAt,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                IsDeleted = false,
                IsSystemGenerated = false
            };

            await _transactionRepository.CreateTransactionAsync(transactionEntity);

            // 5. 更新账户余额
            if (typeUpper == "INCOME")
            {
                account.CurrentBalanceCents += amountCents;
            }
            else // EXPENSE
            {
                account.CurrentBalanceCents -= amountCents;
            }

            account.UpdatedAtUtc = now;
            await _accountRepository.UpdateAccountAsync(account);

            var dto = new TransactionDto
            {
                TransactionId = transactionId,
                AccountId = account.RowKey,
                Type = typeUpper,
                Amount = amountCents / 100m,
                Currency = currency,
                Category = requestModel.Category,
                Note = requestModel.Note,
                OccurredAtUtc = occurredAt,
                CreatedAtUtc = now
            };

            var result = new CreateTransactionResponse
            {
                Transaction = dto,
                AccountBalanceAfter = account.CurrentBalanceCents / 100m
            };

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(result, JsonOptions));

            return response;
        }

        [Function("GetTransactions")]
        public async Task<HttpResponseData> Get(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "transactions")]
            HttpRequestData req,
    FunctionContext context)
        {
            // 1. userId（先用 header 模拟）
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            // 2. 解析查询字符串：accountId, from, to
            string? accountId = null;
            DateTime? fromUtc = null;
            DateTime? toUtc = null;

            var query = req.Url.Query; // 形如 "?accountId=xxx&from=2025-11-01&to=2025-11-30"
            if (!string.IsNullOrWhiteSpace(query))
            {
                var trimmed = query.TrimStart('?');
                var pairs = trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries);

                foreach (var pair in pairs)
                {
                    var kv = pair.Split('=', 2, StringSplitOptions.RemoveEmptyEntries);
                    if (kv.Length != 2) continue;

                    var key = kv[0];
                    var value = Uri.UnescapeDataString(kv[1]);

                    if (key.Equals("accountId", StringComparison.OrdinalIgnoreCase))
                    {
                        accountId = value;
                    }
                    else if (key.Equals("from", StringComparison.OrdinalIgnoreCase))
                    {
                        if (DateTime.TryParse(value, out var parsed))
                        {
                            // 假设前端传 UTC 时间
                            fromUtc = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
                        }
                    }
                    else if (key.Equals("to", StringComparison.OrdinalIgnoreCase))
                    {
                        if (DateTime.TryParse(value, out var parsed))
                        {
                            toUtc = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
                        }
                    }
                }
            }

            // 3. 仓储查询
            var entities = await _transactionRepository.GetTransactionsAsync(
                userId,
                accountId,
                fromUtc,
                toUtc);

            var list = entities.Select(t =>
            {
                var occurred = t.OccurredAtUtc ?? t.CreatedAtUtc;
                return new TransactionDto
                {
                    TransactionId = t.RowKey,
                    AccountId = t.AccountId,
                    Type = t.Type,
                    Amount = t.AmountCents / 100m,
                    Currency = t.Currency,
                    Category = t.Category,
                    Note = t.Note,
                    OccurredAtUtc = occurred,
                    CreatedAtUtc = t.CreatedAtUtc
                };
            }).ToList();

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(list, JsonOptions));

            return response;
        }

    }
}
