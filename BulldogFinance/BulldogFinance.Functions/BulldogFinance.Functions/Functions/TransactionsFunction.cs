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

            var body = await req.ReadJsonBodyAsync<TransactionCreateRequest>();
            if (body.IsEmpty)
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");
            if (body.IsInvalid)
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");

            var requestModel = body.Value!;
            if (string.IsNullOrWhiteSpace(requestModel.AccountId) || requestModel.Amount <= 0)
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

            return await ApiResponse.OkAsync(req, new CreateTransactionResponse
            {
                Transaction = ToDto(transactionEntity),
                AccountBalanceAfter = account.CurrentBalanceCents / 100m
            });
        }

        private async Task<AccountEntity> ApplyBalanceDeltaWithRetryAsync(
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

            var (document, _, error) = await req.ReadJsonDocumentAsync();
            if (error == JsonBodyError.Empty)
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");
            if (error == JsonBodyError.Invalid)
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");

            using var doc = document;
            if (doc!.RootElement.ValueKind != JsonValueKind.Object)
                return await ApiResponse.BadRequestAsync(req, "Request body must be a JSON object.");

            TransactionUpdateRequest? requestModel;
            try
            {
                requestModel = doc.RootElement.Deserialize<TransactionUpdateRequest>(JsonDefaults.Api);
            }
            catch (JsonException)
            {
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");
            }

            if (requestModel == null)
                return await ApiResponse.BadRequestAsync(req, "Invalid request body.");

            var isConnectedTransaction = IsConnectedTransaction(transaction, account);
            var now = DateTime.UtcNow;

            if (isConnectedTransaction)
            {
                if (ContainsAnyProperty(doc.RootElement, BankManagedUpdateFields))
                {
                    return await ApiResponse.BadRequestAsync(
                        req,
                        "Connected account transactions are managed by bank sync. Only category, note, and merchant name can be edited.");
                }

                ApplyMetadataUpdates(doc.RootElement, transaction);
                transaction.UpdatedAtUtc = now;
                await _transactionRepository.UpdateTransactionAsync(transaction);
                return await ApiResponse.OkAsync(req, new { transaction = ToDto(transaction) });
            }

            if (transaction.IsSystemGenerated)
                return await ApiResponse.BadRequestAsync(req, "System-generated transactions cannot be edited.");

            var oldSignedAmountCents = GetSignedAmountCents(transaction);

            if (TryGetPropertyIgnoreCase(doc.RootElement, "type", out _))
            {
                var typeUpper = (requestModel.Type ?? string.Empty).Trim().ToUpperInvariant();
                if (typeUpper != "INCOME" && typeUpper != "EXPENSE")
                    return await ApiResponse.BadRequestAsync(req, "Type must be INCOME or EXPENSE.");

                transaction.Type = typeUpper;
            }

            if (TryGetPropertyIgnoreCase(doc.RootElement, "amount", out _))
            {
                if (!requestModel.Amount.HasValue || requestModel.Amount.Value <= 0)
                    return await ApiResponse.BadRequestAsync(req, "Amount must be positive.");

                transaction.AmountCents = (long)decimal.Round(
                    requestModel.Amount.Value * 100m,
                    0,
                    MidpointRounding.AwayFromZero);
            }

            if (TryGetPropertyIgnoreCase(doc.RootElement, "occurredAtUtc", out _))
            {
                transaction.OccurredAtUtc = requestModel.OccurredAtUtc;
            }

            ApplyMetadataUpdates(doc.RootElement, transaction);
            transaction.UpdatedAtUtc = now;
            await _transactionRepository.UpdateTransactionAsync(transaction);

            var balanceDeltaCents = GetSignedAmountCents(transaction) - oldSignedAmountCents;
            if (balanceDeltaCents != 0)
            {
                account = await ApplyBalanceDeltaWithRetryAsync(userId, account.RowKey, balanceDeltaCents, now);
            }

            return await ApiResponse.OkAsync(req, new
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

            return ApiResponse.NoContent(req);
        }

        [Function("GetTransactions")]
        public async Task<HttpResponseData> Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "transactions")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var query = QueryHelper.Parse(req);
            var page = await _transactionRepository.GetTransactionsPageAsync(
                userId,
                query.GetString("accountId"),
                query.GetUtcDateTime("from"),
                query.GetUtcDateTime("to"),
                query.GetString("type"),
                query.GetString("category"),
                query.GetInt("limit", 50, 1, 200),
                query.GetString("cursor"));

            return await ApiResponse.OkAsync(req, new
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
    }
}
