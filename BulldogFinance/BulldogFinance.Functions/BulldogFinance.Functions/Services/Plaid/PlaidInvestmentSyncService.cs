using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Investments;
using Going.Plaid.Entity;
using Going.Plaid.Investments;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services.Plaid
{
    public class PlaidInvestmentSyncService : IPlaidInvestmentSyncService
    {
        private const int InvestmentTransactionPageSize = 500;

        private readonly IPlaidClientFactory _plaidClientFactory;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidTokenProtector _tokenProtector;
        private readonly IAccountRepository _accountRepository;
        private readonly IPlaidInvestmentRepository _investmentRepository;
        private readonly ILogger<PlaidInvestmentSyncService> _logger;

        public PlaidInvestmentSyncService(
            IPlaidClientFactory plaidClientFactory,
            IPlaidRepository plaidRepository,
            IPlaidTokenProtector tokenProtector,
            IAccountRepository accountRepository,
            IPlaidInvestmentRepository investmentRepository,
            ILogger<PlaidInvestmentSyncService> logger)
        {
            _plaidClientFactory = plaidClientFactory;
            _plaidRepository = plaidRepository;
            _tokenProtector = tokenProtector;
            _accountRepository = accountRepository;
            _investmentRepository = investmentRepository;
            _logger = logger;
        }

        private async Task<PlaidInvestmentSyncSummary> SyncHoldingsAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default)
        {
            var item = await GetActiveItemAsync(userId, itemId, cancellationToken);
            var accountContexts = await GetInvestmentAccountContextsAsync(userId, itemId, cancellationToken);
            if (accountContexts.Count == 0)
            {
                return new PlaidInvestmentSyncSummary
                {
                    Skipped = true,
                    SkipReason = "No active investment accounts are linked to this Plaid item."
                };
            }

            var accessToken = _tokenProtector.Unprotect(item.AccessTokenEncrypted);
            var plaidClient = _plaidClientFactory.Create(accessToken);
            InvestmentsHoldingsGetResponse response;
            try
            {
                response = await plaidClient.InvestmentsHoldingsGetAsync(new InvestmentsHoldingsGetRequest
                {
                    Options = new InvestmentHoldingsGetRequestOptions
                    {
                        AccountIds = accountContexts.Keys.ToArray()
                    }
                });
                EnsureSuccess(response, "/investments/holdings/get");
            }
            catch (PlaidApiException ex)
            {
                await MarkPlaidItemErrorAsync(item, ex, cancellationToken);
                throw;
            }

            var now = DateTime.UtcNow;
            var summary = new PlaidInvestmentSyncSummary();
            var securitiesById = response.Securities
                .Where(x => !string.IsNullOrWhiteSpace(x.SecurityId))
                .GroupBy(x => x.SecurityId!, StringComparer.Ordinal)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.Ordinal);

            foreach (var security in securitiesById.Values)
            {
                await _investmentRepository.UpsertSecurityAsync(
                    MapSecurity(userId, itemId, security, now),
                    cancellationToken);
                summary.SecuritiesSynced++;
            }

            var existingHoldings = await _investmentRepository.GetHoldingsByItemAsync(
                userId,
                itemId,
                includeDeleted: true,
                cancellationToken);
            var existingByKey = existingHoldings.ToDictionary(x => x.RowKey, StringComparer.Ordinal);
            var seenKeys = new HashSet<string>(StringComparer.Ordinal);

            foreach (var holding in response.Holdings)
            {
                if (string.IsNullOrWhiteSpace(holding.AccountId) ||
                    string.IsNullOrWhiteSpace(holding.SecurityId) ||
                    !accountContexts.TryGetValue(holding.AccountId!, out var accountContext))
                {
                    continue;
                }

                securitiesById.TryGetValue(holding.SecurityId!, out var security);
                var rowKey = HoldingRowKey(itemId, holding.AccountId!, holding.SecurityId!);
                existingByKey.TryGetValue(rowKey, out var existing);
                var entity = MapHolding(
                    userId,
                    itemId,
                    holding,
                    security,
                    accountContext,
                    existing?.CreatedAtUtc ?? now,
                    now);

                await _investmentRepository.UpsertHoldingAsync(entity, cancellationToken);
                seenKeys.Add(rowKey);
                summary.HoldingsSynced++;
            }

            foreach (var stale in existingHoldings.Where(x => !x.IsDeleted && !seenKeys.Contains(x.RowKey)))
            {
                await _investmentRepository.MarkHoldingDeletedAsync(stale, cancellationToken);
                summary.HoldingsRemoved++;
            }

            await SavePortfolioSnapshotsAsync(userId, cancellationToken);
            return summary;
        }

        private async Task<PlaidInvestmentSyncSummary> SyncInvestmentTransactionsAsync(
            string userId,
            string itemId,
            DateTime startUtc,
            DateTime endUtc,
            bool? asyncUpdate = null,
            CancellationToken cancellationToken = default)
        {
            var item = await GetActiveItemAsync(userId, itemId, cancellationToken);
            var accountContexts = await GetInvestmentAccountContextsAsync(userId, itemId, cancellationToken);
            if (accountContexts.Count == 0)
            {
                return new PlaidInvestmentSyncSummary
                {
                    Skipped = true,
                    SkipReason = "No active investment accounts are linked to this Plaid item."
                };
            }

            var maxStartUtc = DateTime.UtcNow.Date.AddMonths(-24);
            if (startUtc < maxStartUtc)
            {
                startUtc = maxStartUtc;
            }

            if (endUtc <= startUtc)
            {
                endUtc = startUtc.Date.AddDays(1);
            }

            var accessToken = _tokenProtector.Unprotect(item.AccessTokenEncrypted);
            var plaidClient = _plaidClientFactory.Create(accessToken);
            var startDate = DateOnly.FromDateTime(startUtc.Date);
            var endDate = DateOnly.FromDateTime(endUtc.Date);
            var offset = 0;
            var summary = new PlaidInvestmentSyncSummary();

            while (true)
            {
                InvestmentsTransactionsGetResponse response;
                try
                {
                    response = await plaidClient.InvestmentsTransactionsGetAsync(
                        new InvestmentsTransactionsGetRequest
                        {
                            StartDate = startDate,
                            EndDate = endDate,
                            Options = new InvestmentsTransactionsGetRequestOptions
                            {
                                AccountIds = accountContexts.Keys.ToArray(),
                                Count = InvestmentTransactionPageSize,
                                Offset = offset,
                                AsyncUpdate = asyncUpdate
                            }
                        });

                    EnsureSuccess(response, "/investments/transactions/get");
                }
                catch (PlaidApiException ex)
                {
                    await MarkPlaidItemErrorAsync(item, ex, cancellationToken);
                    throw;
                }

                var now = DateTime.UtcNow;
                foreach (var security in response.Securities.Where(x => !string.IsNullOrWhiteSpace(x.SecurityId)))
                {
                    await _investmentRepository.UpsertSecurityAsync(
                        MapSecurity(userId, itemId, security, now),
                        cancellationToken);
                    summary.SecuritiesSynced++;
                }

                foreach (var transaction in response.InvestmentTransactions)
                {
                    if (string.IsNullOrWhiteSpace(transaction.InvestmentTransactionId) ||
                        string.IsNullOrWhiteSpace(transaction.AccountId) ||
                        !accountContexts.TryGetValue(transaction.AccountId!, out var accountContext))
                    {
                        continue;
                    }

                    await _investmentRepository.UpsertTransactionAsync(
                        MapTransaction(userId, itemId, transaction, accountContext, now),
                        cancellationToken);
                    summary.InvestmentTransactionsSynced++;
                }

                offset += response.InvestmentTransactions.Count;
                if (offset >= response.TotalInvestmentTransactions ||
                    response.InvestmentTransactions.Count == 0)
                {
                    break;
                }
            }

            return summary;
        }

        public async Task<PlaidInvestmentSyncSummary> SyncInvestmentsAsync(
            string userId,
            string itemId,
            DateTime? transactionStartUtc = null,
            DateTime? transactionEndUtc = null,
            CancellationToken cancellationToken = default)
        {
            var total = await SyncHoldingsAsync(userId, itemId, cancellationToken);
            if (total.Skipped)
            {
                return total;
            }

            var endUtc = transactionEndUtc ?? DateTime.UtcNow.Date;
            var startUtc = transactionStartUtc ?? endUtc.AddDays(-30);

            try
            {
                var transactions = await SyncInvestmentTransactionsAsync(
                    userId,
                    itemId,
                    startUtc,
                    endUtc,
                    asyncUpdate: null,
                    cancellationToken);

                AddSummary(total, transactions);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Plaid investment transaction sync failed after holdings sync. UserId={UserId} ItemId={ItemId}",
                    userId,
                    itemId);
            }

            return total;
        }

        public async Task<PlaidInvestmentSyncSummary> SyncInvestmentsForAllItemsAsync(
            string userId,
            DateTime? transactionStartUtc = null,
            DateTime? transactionEndUtc = null,
            CancellationToken cancellationToken = default)
        {
            var items = await _plaidRepository.GetItemsAsync(userId, cancellationToken);
            var total = new PlaidInvestmentSyncSummary();

            foreach (var item in items.Where(x => string.Equals(x.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase)))
            {
                var summary = await SyncInvestmentsAsync(
                    userId,
                    item.RowKey,
                    transactionStartUtc,
                    transactionEndUtc,
                    cancellationToken);
                AddSummary(total, summary);
            }

            return total;
        }

        private async Task<PlaidItemEntity> GetActiveItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken)
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

        private async Task<Dictionary<string, InvestmentAccountContext>> GetInvestmentAccountContextsAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken)
        {
            var links = await _plaidRepository.GetAccountLinksByItemAsync(userId, itemId, cancellationToken);
            var result = new Dictionary<string, InvestmentAccountContext>(StringComparer.Ordinal);

            foreach (var link in links)
            {
                var account = await _accountRepository.GetAccountAsync(
                    userId,
                    link.LocalAccountId,
                    cancellationToken);

                if (account == null ||
                    account.IsArchived ||
                    !IsInvestmentAccount(account.Type))
                {
                    continue;
                }

                result[link.RowKey] = new InvestmentAccountContext(
                    link.RowKey,
                    account.RowKey,
                    account.Name,
                    account.InstitutionName,
                    account.Mask,
                    account.Currency);
            }

            return result;
        }

        private async Task SavePortfolioSnapshotsAsync(
            string userId,
            CancellationToken cancellationToken)
        {
            var holdings = await _investmentRepository.GetHoldingsAsync(
                userId,
                includeDeleted: false,
                cancellationToken);
            var now = DateTime.UtcNow;
            var snapshotDate = now.Date;

            foreach (var group in holdings.GroupBy(x => NormalizeCurrency(x.Currency, x.UnofficialCurrencyCode)))
            {
                var marketValue = group.Sum(x => x.InstitutionValue);
                var costBasis = group.Sum(x => x.CostBasis ?? 0);
                await _investmentRepository.UpsertPortfolioSnapshotAsync(
                    new InvestmentPortfolioSnapshotEntity
                    {
                        PartitionKey = userId,
                        RowKey = $"{snapshotDate:yyyyMMdd}|{group.Key}",
                        SnapshotDateUtc = snapshotDate,
                        Currency = group.Key,
                        MarketValue = marketValue,
                        CostBasis = costBasis,
                        UnrealizedPnL = costBasis > 0 ? marketValue - costBasis : 0,
                        HoldingsCount = group.Count(),
                        CreatedAtUtc = now,
                        UpdatedAtUtc = now
                    },
                    cancellationToken);
            }
        }

        private static PlaidInvestmentSecurityEntity MapSecurity(
            string userId,
            string itemId,
            Security security,
            DateTime now)
        {
#pragma warning disable CS0612
            var sedol = security.Sedol;
#pragma warning restore CS0612

            return new PlaidInvestmentSecurityEntity
            {
                PartitionKey = userId,
                RowKey = SecurityRowKey(itemId, security.SecurityId!),
                ItemId = itemId,
                SecurityId = security.SecurityId!,
                Name = security.Name,
                TickerSymbol = security.TickerSymbol,
                Isin = security.Isin,
                Cusip = security.Cusip,
                Sedol = sedol,
                InstitutionSecurityId = security.InstitutionSecurityId,
                InstitutionId = security.InstitutionId,
                ProxySecurityId = security.ProxySecurityId,
                IsCashEquivalent = security.IsCashEquivalent,
                Type = security.Type,
                Subtype = security.Subtype,
                ClosePrice = DecimalToDouble(security.ClosePrice),
                ClosePriceAsOfUtc = DateOnlyToUtcDateTime(security.ClosePriceAsOf),
                UpdateDatetimeUtc = DateTimeOffsetToUtcDateTime(security.UpdateDatetime),
                Currency = NormalizeCurrency(security.IsoCurrencyCode, null),
                UnofficialCurrencyCode = security.UnofficialCurrencyCode,
                MarketIdentifierCode = security.MarketIdentifierCode,
                Sector = security.Sector,
                Industry = security.Industry,
                CfiCode = security.CfiCode,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
        }

        private static PlaidInvestmentHoldingEntity MapHolding(
            string userId,
            string itemId,
            Holding holding,
            Security? security,
            InvestmentAccountContext accountContext,
            DateTime createdAtUtc,
            DateTime now)
        {
            return new PlaidInvestmentHoldingEntity
            {
                PartitionKey = userId,
                RowKey = HoldingRowKey(itemId, holding.AccountId!, holding.SecurityId!),
                ItemId = itemId,
                PlaidAccountId = holding.AccountId!,
                LocalAccountId = accountContext.LocalAccountId,
                AccountName = accountContext.AccountName,
                InstitutionName = accountContext.InstitutionName,
                Mask = accountContext.Mask,
                SecurityId = holding.SecurityId!,
                Quantity = DecimalToDouble(holding.Quantity),
                CostBasis = DecimalToDouble(holding.CostBasis),
                InstitutionPrice = DecimalToDouble(holding.InstitutionPrice),
                InstitutionPriceAsOfUtc = DateOnlyToUtcDateTime(holding.InstitutionPriceAsOf),
                InstitutionPriceDatetimeUtc = DateTimeOffsetToUtcDateTime(holding.InstitutionPriceDatetime),
                InstitutionValue = DecimalToDouble(holding.InstitutionValue),
                Currency = NormalizeCurrency(
                    holding.IsoCurrencyCode,
                    holding.UnofficialCurrencyCode,
                    security?.IsoCurrencyCode ?? accountContext.Currency),
                UnofficialCurrencyCode = holding.UnofficialCurrencyCode,
                VestedQuantity = DecimalToDouble(holding.VestedQuantity),
                VestedValue = DecimalToDouble(holding.VestedValue),
                IsDeleted = false,
                CreatedAtUtc = createdAtUtc,
                UpdatedAtUtc = now
            };
        }

        private static PlaidInvestmentTransactionEntity MapTransaction(
            string userId,
            string itemId,
            InvestmentTransaction transaction,
            InvestmentAccountContext accountContext,
            DateTime now)
        {
#pragma warning disable CS0612
            var cancelTransactionId = transaction.CancelTransactionId;
#pragma warning restore CS0612

            return new PlaidInvestmentTransactionEntity
            {
                PartitionKey = userId,
                RowKey = transaction.InvestmentTransactionId!,
                ItemId = itemId,
                PlaidAccountId = transaction.AccountId!,
                LocalAccountId = accountContext.LocalAccountId,
                AccountName = accountContext.AccountName,
                InstitutionName = accountContext.InstitutionName,
                SecurityId = transaction.SecurityId,
                InvestmentTransactionId = transaction.InvestmentTransactionId!,
                CancelTransactionId = cancelTransactionId,
                DateUtc = DateOnlyToUtcDateTime(transaction.Date) ?? now.Date,
                TransactionDatetimeUtc = DateTimeOffsetToUtcDateTime(transaction.TransactionDatetime),
                Name = transaction.Name,
                Quantity = DecimalToDouble(transaction.Quantity),
                Amount = DecimalToDouble(transaction.Amount),
                Price = DecimalToDouble(transaction.Price),
                Fees = DecimalToDouble(transaction.Fees),
                Type = transaction.Type.ToString(),
                Subtype = transaction.Subtype.ToString(),
                Currency = NormalizeCurrency(transaction.IsoCurrencyCode, transaction.UnofficialCurrencyCode, accountContext.Currency),
                UnofficialCurrencyCode = transaction.UnofficialCurrencyCode,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
        }

        private static void EnsureSuccess(Going.Plaid.ResponseBase response, string path)
        {
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            throw new PlaidApiException(path, response.StatusCode, response.Error, response.RawJson);
        }

        private Task MarkPlaidItemErrorAsync(
            PlaidItemEntity item,
            PlaidApiException exception,
            CancellationToken cancellationToken)
        {
            PlaidItemSyncState.ApplyApiError(item, exception, DateTime.UtcNow);
            return _plaidRepository.UpsertItemAsync(item, cancellationToken);
        }

        private static bool IsInvestmentAccount(string? accountType)
        {
            if (string.IsNullOrWhiteSpace(accountType))
            {
                return false;
            }

            return accountType
                .Trim()
                .StartsWith("investment", StringComparison.OrdinalIgnoreCase);
        }

        private static void AddSummary(PlaidInvestmentSyncSummary target, PlaidInvestmentSyncSummary source)
        {
            target.HoldingsSynced += source.HoldingsSynced;
            target.SecuritiesSynced += source.SecuritiesSynced;
            target.InvestmentTransactionsSynced += source.InvestmentTransactionsSynced;
            target.HoldingsRemoved += source.HoldingsRemoved;
        }

        private static string SecurityRowKey(string itemId, string securityId) =>
            $"{itemId}|{securityId}";

        private static string HoldingRowKey(string itemId, string accountId, string securityId) =>
            $"{itemId}|{accountId}|{securityId}";

        private static double DecimalToDouble(decimal value) => (double)value;

        private static double? DecimalToDouble(decimal? value) =>
            value.HasValue ? (double)value.Value : null;

        private static DateTime? DateOnlyToUtcDateTime(DateOnly? date) =>
            date.HasValue
                ? DateTime.SpecifyKind(date.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc)
                : null;

        private static DateTime? DateTimeOffsetToUtcDateTime(DateTimeOffset? value) =>
            value?.UtcDateTime;

        private static string NormalizeCurrency(
            string? isoCurrencyCode,
            string? unofficialCurrencyCode = null,
            string? fallback = null)
        {
            if (!string.IsNullOrWhiteSpace(isoCurrencyCode))
            {
                return isoCurrencyCode.Trim().ToUpperInvariant();
            }

            if (!string.IsNullOrWhiteSpace(fallback))
            {
                return fallback.Trim().ToUpperInvariant();
            }

            if (!string.IsNullOrWhiteSpace(unofficialCurrencyCode))
            {
                return unofficialCurrencyCode.Trim().ToUpperInvariant();
            }

            return "USD";
        }

        private sealed record InvestmentAccountContext(
            string PlaidAccountId,
            string LocalAccountId,
            string AccountName,
            string? InstitutionName,
            string? Mask,
            string Currency);
    }
}
