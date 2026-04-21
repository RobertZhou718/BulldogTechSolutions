using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Transactions;
using Azure;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;

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
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");

            TransactionCreateRequest? requestModel;
            try
            {
                requestModel = JsonSerializer.Deserialize<TransactionCreateRequest>(body, JsonOptions);
            }
            catch (JsonException)
            {
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");
            }

            if (requestModel == null ||
                string.IsNullOrWhiteSpace(requestModel.AccountId) ||
                requestModel.Amount <= 0)
                return await ApiResponse.BadRequestAsync(req, "AccountId and positive Amount are required.");

            var typeUpper = (requestModel.Type ?? string.Empty).Trim().ToUpperInvariant();
            if (typeUpper != "INCOME" && typeUpper != "EXPENSE")
                return await ApiResponse.BadRequestAsync(req, "Type must be INCOME or EXPENSE.");

            var account = await _accountRepository.GetAccountAsync(userId, requestModel.AccountId);
            if (account == null || account.IsArchived)
                return await ApiResponse.NotFoundAsync(req, "Account not found or archived.");

            var now = DateTime.UtcNow;
            var occurredAt = requestModel.OccurredAtUtc ?? now;

            var amountCents = (long)decimal.Round(
                requestModel.Amount * 100m,
                0,
                MidpointRounding.AwayFromZero);

            var currency = string.IsNullOrWhiteSpace(requestModel.Currency)
                ? account.Currency
                : requestModel.Currency!.Trim().ToUpperInvariant();

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
                Source = "Manual",
                OccurredAtUtc = occurredAt,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                IsDeleted = false,
                IsSystemGenerated = false
            };

            await _transactionRepository.CreateTransactionAsync(transactionEntity);

            var balanceDelta = typeUpper == "INCOME" ? amountCents : -amountCents;
            account = await ApplyBalanceDeltaWithRetryAsync(userId, account.RowKey, balanceDelta, now);

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

        private async Task<BulldogFinance.Functions.Models.Accounts.AccountEntity> ApplyBalanceDeltaWithRetryAsync(
            string userId,
            string accountId,
            long balanceDeltaCents,
            DateTime updatedAtUtc)
        {
            const int maxAttempts = 3;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var currentAccount = await _accountRepository.GetAccountAsync(userId, accountId);
                if (currentAccount == null || currentAccount.IsArchived)
                {
                    throw new InvalidOperationException("Account not found or archived.");
                }

                currentAccount.CurrentBalanceCents += balanceDeltaCents;
                currentAccount.UpdatedAtUtc = updatedAtUtc;

                try
                {
                    return await _accountRepository.UpdateAccountAsync(currentAccount);
                }
                catch (RequestFailedException ex) when (ex.Status is 409 or 412 && attempt < maxAttempts)
                {
                }
            }

            throw new InvalidOperationException("The account balance could not be updated due to a concurrency conflict.");
        }

        [Function("GetTransactions")]
        public async Task<HttpResponseData> Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "transactions")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            string? accountId = null;
            DateTime? fromUtc = null;
            DateTime? toUtc = null;

            var query = req.Url.Query;
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
                    MerchantName = t.MerchantName,
                    Source = t.Source,
                    Pending = t.Pending,
                    OccurredAtUtc = occurred,
                    AuthorizedAtUtc = t.AuthorizedAtUtc,
                    PostedAtUtc = t.PostedAtUtc,
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
