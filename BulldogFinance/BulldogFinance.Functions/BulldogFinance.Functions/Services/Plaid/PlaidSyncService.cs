using System.Text.Json;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Investments;
using BulldogFinance.Functions.Services.Transactions;
using Going.Plaid.Accounts;
using Going.Plaid.Converters;
using Going.Plaid.Entity;
using Going.Plaid.Item;
using Going.Plaid.Transactions;

namespace BulldogFinance.Functions.Services.Plaid
{
    public class PlaidSyncService : IPlaidSyncService
    {
        private static readonly JsonSerializerOptions EnumJsonOptions =
            new JsonSerializerOptions().AddPlaidConverters();

        private readonly IPlaidClientFactory _plaidClientFactory;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidTokenProtector _tokenProtector;
        private readonly IAccountRepository _accountRepository;
        private readonly ITransactionRepository _transactionRepository;
        private readonly IPlaidInvestmentRepository _plaidInvestmentRepository;

        public PlaidSyncService(
            IPlaidClientFactory plaidClientFactory,
            IPlaidRepository plaidRepository,
            IPlaidTokenProtector tokenProtector,
            IAccountRepository accountRepository,
            ITransactionRepository transactionRepository,
            IPlaidInvestmentRepository plaidInvestmentRepository)
        {
            _plaidClientFactory = plaidClientFactory;
            _plaidRepository = plaidRepository;
            _tokenProtector = tokenProtector;
            _accountRepository = accountRepository;
            _transactionRepository = transactionRepository;
            _plaidInvestmentRepository = plaidInvestmentRepository;
        }

        public async Task<IReadOnlyList<AccountEntity>> ImportAccountsAsync(
            string userId,
            string itemId,
            string accessToken,
            string? institutionName,
            CancellationToken cancellationToken = default)
        {
            var plaidClient = _plaidClientFactory.Create(accessToken);
            var accountsResult = await plaidClient.AccountsGetAsync(new AccountsGetRequest());
            EnsureSuccess(accountsResult, "/accounts/get");

            var now = DateTime.UtcNow;
            var localAccounts = new List<AccountEntity>();
            var sortOrder = 1000;

            foreach (var plaidAccount in accountsResult.Accounts)
            {
                var typeString = EnumToPlaidString(plaidAccount.Type);
                var subtypeString = plaidAccount.Subtype.HasValue
                    ? EnumToPlaidString(plaidAccount.Subtype.Value)
                    : null;

                var existing = await _accountRepository.GetAccountByExternalReferenceAsync(
                    userId,
                    "Plaid",
                    plaidAccount.AccountId,
                    cancellationToken);

                var currency = ResolveCurrency(plaidAccount.Balances);
                var currentBalanceCents = DecimalToCents(plaidAccount.Balances?.Current);
                var availableBalanceCents = DecimalToCents(plaidAccount.Balances?.Available);

                if (existing == null)
                {
                    existing = new AccountEntity
                    {
                        PartitionKey = userId,
                        RowKey = Guid.NewGuid().ToString("N"),
                        Name = plaidAccount.Name,
                        Type = $"{typeString}:{subtypeString ?? "unknown"}",
                        Currency = currency,
                        CurrentBalanceCents = currentBalanceCents,
                        AvailableBalanceCents = availableBalanceCents,
                        IsArchived = false,
                        SortOrder = sortOrder++,
                        ExternalSource = "Plaid",
                        ExternalAccountId = plaidAccount.AccountId,
                        InstitutionName = institutionName,
                        OfficialName = plaidAccount.OfficialName,
                        Mask = plaidAccount.Mask,
                        LastBalanceRefreshUtc = now,
                        CreatedAtUtc = now,
                        UpdatedAtUtc = now
                    };

                    await _accountRepository.CreateAccountAsync(existing, cancellationToken);
                }
                else
                {
                    existing.Name = plaidAccount.Name;
                    existing.Type = $"{typeString}:{subtypeString ?? "unknown"}";
                    existing.Currency = currency;
                    existing.CurrentBalanceCents = currentBalanceCents;
                    existing.AvailableBalanceCents = availableBalanceCents;
                    existing.InstitutionName = institutionName;
                    existing.OfficialName = plaidAccount.OfficialName;
                    existing.Mask = plaidAccount.Mask;
                    existing.ExternalSource = "Plaid";
                    existing.ExternalAccountId = plaidAccount.AccountId;
                    existing.LastBalanceRefreshUtc = now;
                    existing.UpdatedAtUtc = now;

                    await _accountRepository.UpdateAccountAsync(existing, cancellationToken);
                }

                await _plaidRepository.UpsertAccountLinkAsync(new PlaidAccountLinkEntity
                {
                    PartitionKey = userId,
                    RowKey = plaidAccount.AccountId,
                    ItemId = itemId,
                    LocalAccountId = existing.RowKey,
                    Name = plaidAccount.Name,
                    OfficialName = plaidAccount.OfficialName,
                    Mask = plaidAccount.Mask,
                    Type = typeString,
                    Subtype = subtypeString,
                    Currency = currency,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                }, cancellationToken);

                localAccounts.Add(existing);
            }

            return localAccounts;
        }

        public async Task RefreshBalancesAsync(string userId, string itemId, CancellationToken cancellationToken = default)
        {
            var item = await GetActiveItemAsync(userId, itemId, cancellationToken);
            var accessToken = _tokenProtector.Unprotect(item.AccessTokenEncrypted);
            var plaidClient = _plaidClientFactory.Create(accessToken);
            var balances = await plaidClient.AccountsBalanceGetAsync(new AccountsBalanceGetRequest());
            EnsureSuccess(balances, "/accounts/balance/get");

            var now = DateTime.UtcNow;

            foreach (var plaidAccount in balances.Accounts)
            {
                var localAccount = await _accountRepository.GetAccountByExternalReferenceAsync(
                    userId,
                    "Plaid",
                    plaidAccount.AccountId,
                    cancellationToken);

                if (localAccount == null)
                {
                    continue;
                }

                if (localAccount.IsArchived)
                {
                    continue;
                }

                localAccount.CurrentBalanceCents = DecimalToCents(plaidAccount.Balances?.Current);
                localAccount.AvailableBalanceCents = DecimalToCents(plaidAccount.Balances?.Available);
                localAccount.Currency = ResolveCurrency(plaidAccount.Balances);
                localAccount.LastBalanceRefreshUtc = now;
                localAccount.UpdatedAtUtc = now;

                await _accountRepository.UpdateAccountAsync(localAccount, cancellationToken);
            }
        }

        public async Task<PlaidSyncSummary> SyncTransactionsAsync(string userId, string itemId, CancellationToken cancellationToken = default)
        {
            var item = await GetActiveItemAsync(userId, itemId, cancellationToken);
            var accessToken = _tokenProtector.Unprotect(item.AccessTokenEncrypted);
            var plaidClient = _plaidClientFactory.Create(accessToken);
            var summary = new PlaidSyncSummary();
            var cursor = item.Cursor;

            while (true)
            {
                var request = new TransactionsSyncRequest();
                if (!string.IsNullOrWhiteSpace(cursor))
                {
                    request.Cursor = cursor;
                }

                var syncResult = await plaidClient.TransactionsSyncAsync(request);
                EnsureSuccess(syncResult, "/transactions/sync");

                foreach (var transaction in syncResult.Added)
                {
                    var created = await UpsertPlaidTransactionAsync(userId, transaction, true, cancellationToken);
                    if (created)
                    {
                        summary.Added++;
                    }
                }

                foreach (var transaction in syncResult.Modified)
                {
                    await UpsertPlaidTransactionAsync(userId, transaction, false, cancellationToken);
                    summary.Modified++;
                }

                foreach (var removed in syncResult.Removed)
                {
                    if (string.IsNullOrWhiteSpace(removed.TransactionId))
                    {
                        continue;
                    }

                    var existing = await _transactionRepository.GetByExternalTransactionIdAsync(
                        userId,
                        removed.TransactionId,
                        cancellationToken);

                    if (existing == null || existing.IsDeleted)
                    {
                        continue;
                    }

                    existing.IsDeleted = true;
                    existing.UpdatedAtUtc = DateTime.UtcNow;
                    await _transactionRepository.UpdateTransactionAsync(existing, cancellationToken);
                    summary.Removed++;
                }

                cursor = syncResult.NextCursor;
                if (!syncResult.HasMore)
                {
                    break;
                }
            }

            item.Cursor = cursor;
            item.LastSyncAtUtc = DateTime.UtcNow;
            item.UpdatedAtUtc = DateTime.UtcNow;
            await _plaidRepository.UpsertItemAsync(item, cancellationToken);

            return summary;
        }

        public async Task<PlaidSyncSummary> SyncTransactionsForAllItemsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var items = await _plaidRepository.GetItemsAsync(userId, cancellationToken);
            var total = new PlaidSyncSummary();

            foreach (var item in items.Where(x => string.Equals(x.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase)))
            {
                var summary = await SyncTransactionsAsync(userId, item.RowKey, cancellationToken);
                total.Added += summary.Added;
                total.Modified += summary.Modified;
                total.Removed += summary.Removed;
            }

            return total;
        }

        public async Task RemoveItemAsync(string userId, string itemId, CancellationToken cancellationToken = default)
        {
            var item = await GetActiveItemAsync(userId, itemId, cancellationToken);
            var accessToken = _tokenProtector.Unprotect(item.AccessTokenEncrypted);
            var plaidClient = _plaidClientFactory.Create(accessToken);
            var removeResult = await plaidClient.ItemRemoveAsync(new ItemRemoveRequest());
            EnsureSuccess(removeResult, "/item/remove");

            var links = await _plaidRepository.GetAccountLinksByItemAsync(userId, itemId, cancellationToken);
            foreach (var link in links)
            {
                var account = await _accountRepository.GetAccountAsync(userId, link.LocalAccountId, cancellationToken);
                if (account != null)
                {
                    await _transactionRepository.MarkTransactionsDeletedByAccountIdAsync(
                        userId,
                        account.RowKey,
                        cancellationToken);
                    await _accountRepository.DeleteAccountAsync(userId, account.RowKey, cancellationToken);
                }

                await _plaidRepository.DeleteAccountLinkAsync(userId, link.RowKey, cancellationToken);
            }

            await _plaidInvestmentRepository.DeleteByItemAsync(userId, itemId, cancellationToken);
            await _plaidRepository.DeleteItemAsync(userId, itemId, cancellationToken);
        }

        public async Task<IReadOnlyList<PlaidItemEntity>> GetActiveItemsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var items = await _plaidRepository.GetItemsAsync(userId, cancellationToken);
            return items
                .Where(x => string.Equals(x.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        private async Task<PlaidItemEntity> GetActiveItemAsync(string userId, string itemId, CancellationToken cancellationToken)
        {
            var item = await _plaidRepository.GetItemAsync(userId, itemId, cancellationToken);
            if (item == null)
            {
                throw new InvalidOperationException("Plaid item not found.");
            }

            if (!string.Equals(item.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Plaid item is not active.");
            }

            return item;
        }

        private async Task<bool> UpsertPlaidTransactionAsync(
            string userId,
            Transaction plaidTransaction,
            bool isCreateOnly,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(plaidTransaction.TransactionId) ||
                string.IsNullOrWhiteSpace(plaidTransaction.AccountId))
            {
                return false;
            }

            var localAccount = await _accountRepository.GetAccountByExternalReferenceAsync(
                userId,
                "Plaid",
                plaidTransaction.AccountId,
                cancellationToken);

            if (localAccount == null)
            {
                return false;
            }

            if (localAccount.IsArchived)
            {
                return false;
            }

            var existing = await _transactionRepository.GetByExternalTransactionIdAsync(
                userId,
                plaidTransaction.TransactionId,
                cancellationToken);

            var now = DateTime.UtcNow;
            var entity = existing ?? new TransactionEntity
            {
                PartitionKey = userId,
                RowKey = Guid.NewGuid().ToString("N"),
                CreatedAtUtc = now
            };

            var amount = plaidTransaction.Amount ?? 0m;
            var postedDate = DateOnlyToUtcDateTime(plaidTransaction.Date);
            var authorizedDate = DateOnlyToUtcDateTime(plaidTransaction.AuthorizedDate);

#pragma warning disable CS0612 // Transaction.Name is marked obsolete by Going.Plaid
            // Plaid still returns this field; preserve previous behavior of
            // surfacing it as the local Note.
            var note = plaidTransaction.Name ?? string.Empty;
#pragma warning restore CS0612

            entity.AccountId = localAccount.RowKey;
            entity.Type = amount >= 0 ? "EXPENSE" : "INCOME";
            entity.AmountCents = DecimalToCents(Math.Abs(amount));
            entity.Currency = !string.IsNullOrWhiteSpace(plaidTransaction.IsoCurrencyCode)
                ? plaidTransaction.IsoCurrencyCode!
                : localAccount.Currency;
            entity.Category = plaidTransaction.PersonalFinanceCategory?.Detailed
                ?? plaidTransaction.PersonalFinanceCategory?.Primary;
            entity.Note = note;
            entity.MerchantName = plaidTransaction.MerchantName;
            entity.Source = "Plaid";
            entity.ExternalTransactionId = plaidTransaction.TransactionId;
            entity.ExternalAccountId = plaidTransaction.AccountId;
            entity.Pending = plaidTransaction.Pending ?? false;
            entity.AuthorizedAtUtc = authorizedDate;
            entity.PostedAtUtc = postedDate;
            entity.OccurredAtUtc = postedDate ?? authorizedDate ?? now;
            entity.UpdatedAtUtc = now;
            entity.IsDeleted = false;
            entity.IsSystemGenerated = true;

            if (existing == null)
            {
                await _transactionRepository.CreateTransactionAsync(entity, cancellationToken);
                return true;
            }

            if (isCreateOnly)
            {
                return false;
            }

            await _transactionRepository.UpdateTransactionAsync(entity, cancellationToken);
            return false;
        }

        private static void EnsureSuccess(Going.Plaid.ResponseBase response, string path)
        {
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            var error = response.Error;
            var detail = error != null
                ? $"{error.ErrorType}/{error.ErrorCode}: {error.ErrorMessage}"
                : response.RawJson ?? "Unknown error";
            throw new InvalidOperationException(
                $"Plaid API {path} failed: {(int)response.StatusCode} {detail}");
        }

        private static string ResolveCurrency(AccountBalance? balance) =>
            !string.IsNullOrWhiteSpace(balance?.IsoCurrencyCode)
                ? balance!.IsoCurrencyCode!
                : balance?.UnofficialCurrencyCode ?? "CAD";

        private static DateTime? DateOnlyToUtcDateTime(DateOnly? date) =>
            date.HasValue
                ? DateTime.SpecifyKind(date.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc)
                : null;

        private static long DecimalToCents(decimal? value) =>
            value.HasValue
                ? (long)decimal.Round(value.Value * 100m, 0, MidpointRounding.AwayFromZero)
                : 0;

        /// <summary>
        /// Returns Plaid's wire-format string for an enum value (e.g.
        /// <c>"credit card"</c> for <see cref="AccountSubtype.CreditCard"/>),
        /// so the stored <c>type</c>/<c>subtype</c> format stays identical to
        /// the previous hand-rolled client.
        /// </summary>
        private static string EnumToPlaidString<T>(T value) where T : struct, Enum
        {
            var json = JsonSerializer.Serialize(value, EnumJsonOptions);
            return json.Trim('"');
        }
    }
}
