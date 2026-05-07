using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Accounts;
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

        private static readonly string[] BankManagedUpdateFields =
        [
            "accountId",
            "type",
            "amount",
            "currency",
            "occurredAtUtc",
            "authorizedAtUtc",
            "postedAtUtc",
            "pending",
            "source",
            "externalTransactionId",
            "externalAccountId"
        ];

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

            if (IsConnectedAccount(account))
                return await ApiResponse.BadRequestAsync(req, "Manual transactions can only be created for manual accounts.");

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

            var result = new CreateTransactionResponse
            {
                Transaction = ToDto(transactionEntity),
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

        [Function("UpdateTransaction")]
        public async Task<HttpResponseData> Update(
            [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "transactions/{transactionId}")]
            HttpRequestData req,
            string transactionId)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var transaction = await _transactionRepository.GetTransactionAsync(userId, transactionId);
            if (transaction == null || transaction.IsDeleted)
                return await ApiResponse.NotFoundAsync(req, "Transaction not found.");

            var account = await _accountRepository.GetAccountAsync(userId, transaction.AccountId);
            if (account == null || account.IsArchived)
                return await ApiResponse.NotFoundAsync(req, "Account not found or archived.");

            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");

            JsonDocument document;
            TransactionUpdateRequest? requestModel;
            try
            {
                document = JsonDocument.Parse(body);
                requestModel = JsonSerializer.Deserialize<TransactionUpdateRequest>(body, JsonOptions);
            }
            catch (JsonException)
            {
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");
            }

            if (document.RootElement.ValueKind != JsonValueKind.Object)
                return await ApiResponse.BadRequestAsync(req, "Request body must be a JSON object.");

            if (requestModel == null)
                return await ApiResponse.BadRequestAsync(req, "Invalid request body.");

            var isConnectedTransaction = IsConnectedTransaction(transaction, account);
            var now = DateTime.UtcNow;

            if (isConnectedTransaction)
            {
                if (ContainsAnyProperty(document.RootElement, BankManagedUpdateFields))
                {
                    return await ApiResponse.BadRequestAsync(
                        req,
                        "Connected account transactions are managed by bank sync. Only category, note, and merchant name can be edited.");
                }

                ApplyMetadataUpdates(document.RootElement, transaction);
                transaction.UpdatedAtUtc = now;
                await _transactionRepository.UpdateTransactionAsync(transaction);
                return await WriteJsonAsync(req, new { transaction = ToDto(transaction) });
            }

            if (transaction.IsSystemGenerated)
                return await ApiResponse.BadRequestAsync(req, "System-generated transactions cannot be edited.");

            var oldSignedAmountCents = GetSignedAmountCents(transaction);

            if (TryGetPropertyIgnoreCase(document.RootElement, "type", out _))
            {
                var typeUpper = (requestModel.Type ?? string.Empty).Trim().ToUpperInvariant();
                if (typeUpper != "INCOME" && typeUpper != "EXPENSE")
                    return await ApiResponse.BadRequestAsync(req, "Type must be INCOME or EXPENSE.");

                transaction.Type = typeUpper;
            }

            if (TryGetPropertyIgnoreCase(document.RootElement, "amount", out _))
            {
                if (!requestModel.Amount.HasValue || requestModel.Amount.Value <= 0)
                    return await ApiResponse.BadRequestAsync(req, "Amount must be positive.");

                transaction.AmountCents = (long)decimal.Round(
                    requestModel.Amount.Value * 100m,
                    0,
                    MidpointRounding.AwayFromZero);
            }

            if (TryGetPropertyIgnoreCase(document.RootElement, "occurredAtUtc", out _))
            {
                transaction.OccurredAtUtc = requestModel.OccurredAtUtc;
            }

            ApplyMetadataUpdates(document.RootElement, transaction);
            transaction.UpdatedAtUtc = now;
            await _transactionRepository.UpdateTransactionAsync(transaction);

            var balanceDeltaCents = GetSignedAmountCents(transaction) - oldSignedAmountCents;
            if (balanceDeltaCents != 0)
            {
                account = await ApplyBalanceDeltaWithRetryAsync(userId, account.RowKey, balanceDeltaCents, now);
            }

            return await WriteJsonAsync(req, new
            {
                transaction = ToDto(transaction),
                accountBalanceAfter = account.CurrentBalanceCents / 100m
            });
        }

        [Function("DeleteTransaction")]
        public async Task<HttpResponseData> Delete(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "transactions/{transactionId}")]
            HttpRequestData req,
            string transactionId)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var transaction = await _transactionRepository.GetTransactionAsync(userId, transactionId);
            if (transaction == null || transaction.IsDeleted)
                return await ApiResponse.NotFoundAsync(req, "Transaction not found.");

            var account = await _accountRepository.GetAccountAsync(userId, transaction.AccountId);
            if (account == null || account.IsArchived)
                return await ApiResponse.NotFoundAsync(req, "Account not found or archived.");

            if (IsConnectedTransaction(transaction, account))
                return await ApiResponse.BadRequestAsync(req, "Connected account transactions cannot be deleted.");

            if (transaction.IsSystemGenerated)
                return await ApiResponse.BadRequestAsync(req, "System-generated transactions cannot be deleted.");

            var now = DateTime.UtcNow;
            transaction.IsDeleted = true;
            transaction.UpdatedAtUtc = now;
            await _transactionRepository.UpdateTransactionAsync(transaction);
            await ApplyBalanceDeltaWithRetryAsync(userId, account.RowKey, -GetSignedAmountCents(transaction), now);

            return req.CreateResponse(HttpStatusCode.NoContent);
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
            string? type = null;
            string? category = null;
            string? cursor = null;
            var limit = 50;

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
                    else if (key.Equals("type", StringComparison.OrdinalIgnoreCase))
                    {
                        type = value;
                    }
                    else if (key.Equals("category", StringComparison.OrdinalIgnoreCase))
                    {
                        category = value;
                    }
                    else if (key.Equals("cursor", StringComparison.OrdinalIgnoreCase))
                    {
                        cursor = value;
                    }
                    else if (key.Equals("limit", StringComparison.OrdinalIgnoreCase))
                    {
                        if (int.TryParse(value, out var parsedLimit))
                        {
                            limit = Math.Clamp(parsedLimit, 1, 200);
                        }
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

            var page = await _transactionRepository.GetTransactionsPageAsync(
                userId,
                accountId,
                fromUtc,
                toUtc,
                type,
                category,
                limit,
                cursor);

            return await WriteJsonAsync(req, new
            {
                items = page.Items.Select(ToDto).ToList(),
                nextCursor = page.NextCursor,
                hasMore = page.HasMore
            });
        }

        private static TransactionDto ToDto(TransactionEntity transaction)
        {
            var occurred = transaction.OccurredAtUtc ?? transaction.CreatedAtUtc;
            return new TransactionDto
            {
                TransactionId = transaction.RowKey,
                AccountId = transaction.AccountId,
                Type = transaction.Type,
                Amount = transaction.AmountCents / 100m,
                Currency = transaction.Currency,
                Category = transaction.Category,
                Note = transaction.Note,
                MerchantName = transaction.MerchantName,
                Source = transaction.Source,
                Pending = transaction.Pending,
                OccurredAtUtc = occurred,
                AuthorizedAtUtc = transaction.AuthorizedAtUtc,
                PostedAtUtc = transaction.PostedAtUtc,
                CreatedAtUtc = transaction.CreatedAtUtc,
                UpdatedAtUtc = transaction.UpdatedAtUtc,
                IsSystemGenerated = transaction.IsSystemGenerated
            };
        }

        private static bool IsConnectedAccount(AccountEntity account)
        {
            return string.Equals(account.ExternalSource, "Plaid", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsConnectedTransaction(TransactionEntity transaction, AccountEntity account)
        {
            return IsConnectedAccount(account) ||
                string.Equals(transaction.Source, "Plaid", StringComparison.OrdinalIgnoreCase) ||
                !string.IsNullOrWhiteSpace(transaction.ExternalTransactionId);
        }

        private static long GetSignedAmountCents(TransactionEntity transaction)
        {
            return string.Equals(transaction.Type, "EXPENSE", StringComparison.OrdinalIgnoreCase)
                ? -transaction.AmountCents
                : transaction.AmountCents;
        }

        private static bool ContainsAnyProperty(JsonElement root, IEnumerable<string> propertyNames)
        {
            return propertyNames.Any(propertyName => TryGetPropertyIgnoreCase(root, propertyName, out _));
        }

        private static bool TryGetPropertyIgnoreCase(JsonElement root, string propertyName, out JsonElement value)
        {
            foreach (var property in root.EnumerateObject())
            {
                if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }

            value = default;
            return false;
        }

        private static void ApplyMetadataUpdates(JsonElement root, TransactionEntity transaction)
        {
            if (TryGetPropertyIgnoreCase(root, "category", out var category))
            {
                transaction.Category = ReadNullableString(category);
            }

            if (TryGetPropertyIgnoreCase(root, "note", out var note))
            {
                transaction.Note = ReadNullableString(note);
            }

            if (TryGetPropertyIgnoreCase(root, "merchantName", out var merchantName))
            {
                transaction.MerchantName = ReadNullableString(merchantName);
            }
        }

        private static string? ReadNullableString(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.Null || value.ValueKind == JsonValueKind.Undefined)
            {
                return null;
            }

            var text = value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : value.ToString();

            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }

        private static async Task<HttpResponseData> WriteJsonAsync(
            HttpRequestData req,
            object payload,
            HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(payload, JsonOptions));
            return response;
        }

    }
}
