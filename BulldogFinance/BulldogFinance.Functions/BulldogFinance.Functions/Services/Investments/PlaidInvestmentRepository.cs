using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Paging;

namespace BulldogFinance.Functions.Services.Investments
{
    public class PlaidInvestmentRepository : IPlaidInvestmentRepository
    {
        private const string SecuritiesTableName = "PlaidInvestmentSecurities";
        private const string HoldingsTableName = "PlaidInvestmentHoldings";
        private const string TransactionsTableName = "PlaidInvestmentTransactions";
        private const string TransactionTimelineTableName = "PlaidInvestmentTransactionTimeline";
        private const string SnapshotsTableName = "InvestmentPortfolioSnapshots";

        private readonly TableClient _securitiesTable;
        private readonly TableClient _holdingsTable;
        private readonly TableClient _transactionsTable;
        private readonly TableClient _transactionTimelineTable;
        private readonly TableClient _snapshotsTable;

        public PlaidInvestmentRepository(TableServiceClient tableServiceClient)
        {
            _securitiesTable = tableServiceClient.GetTableClient(SecuritiesTableName);
            _holdingsTable = tableServiceClient.GetTableClient(HoldingsTableName);
            _transactionsTable = tableServiceClient.GetTableClient(TransactionsTableName);
            _transactionTimelineTable = tableServiceClient.GetTableClient(TransactionTimelineTableName);
            _snapshotsTable = tableServiceClient.GetTableClient(SnapshotsTableName);

            _securitiesTable.CreateIfNotExists();
            _holdingsTable.CreateIfNotExists();
            _transactionsTable.CreateIfNotExists();
            _transactionTimelineTable.CreateIfNotExists();
            _snapshotsTable.CreateIfNotExists();
        }

        public async Task<IReadOnlyList<PlaidInvestmentHoldingEntity>> GetHoldingsAsync(
            string userId,
            bool includeDeleted = false,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentHoldingEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}")
            };

            if (!includeDeleted)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"IsDeleted eq {false}"));
            }

            var query = _holdingsTable.QueryAsync<PlaidInvestmentHoldingEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var holding in query)
            {
                result.Add(holding);
            }

            return result;
        }

        public async Task<IReadOnlyList<PlaidInvestmentHoldingEntity>> GetHoldingsByItemAsync(
            string userId,
            string itemId,
            bool includeDeleted = false,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentHoldingEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"ItemId eq {itemId}")
            };

            if (!includeDeleted)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"IsDeleted eq {false}"));
            }

            var query = _holdingsTable.QueryAsync<PlaidInvestmentHoldingEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var holding in query)
            {
                result.Add(holding);
            }

            return result;
        }

        public async Task<IReadOnlyList<PlaidInvestmentSecurityEntity>> GetSecuritiesAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentSecurityEntity>();
            var query = _securitiesTable.QueryAsync<PlaidInvestmentSecurityEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var security in query)
            {
                result.Add(security);
            }

            return result;
        }

        public async Task<IReadOnlyList<PlaidInvestmentTransactionEntity>> GetTransactionsAsync(
            string userId,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentTransactionEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}")
            };

            if (fromUtc.HasValue)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"DateUtc ge {NormalizeUtc(fromUtc.Value)}"));
            }

            if (toUtc.HasValue)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"DateUtc le {NormalizeUtc(toUtc.Value)}"));
            }

            var query = _transactionsTable.QueryAsync<PlaidInvestmentTransactionEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var transaction in query)
            {
                result.Add(transaction);
            }

            return result
                .OrderByDescending(GetTimelineDateUtc)
                .ThenByDescending(x => x.RowKey, StringComparer.Ordinal)
                .ToList();
        }

        public async Task<PagedResult<PlaidInvestmentTransactionEntity>> GetTransactionsPageAsync(
            string userId,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            int limit = 50,
            string? cursor = null,
            CancellationToken cancellationToken = default)
        {
            limit = Math.Clamp(limit, 1, 200);

            var indexed = await GetIndexedTransactionsPageAsync(
                userId,
                fromUtc,
                toUtc,
                limit,
                cursor,
                cancellationToken);

            if (indexed.HasMore)
            {
                return indexed;
            }

            if (indexed.Items.Count > 0)
            {
                var remaining = limit - indexed.Items.Count;
                var fallback = await GetFallbackTransactionsPageAsync(
                    userId,
                    fromUtc,
                    toUtc,
                    remaining > 0 ? remaining : 1,
                    indexed.NextCursor,
                    cancellationToken);

                if (remaining <= 0)
                {
                    return new PagedResult<PlaidInvestmentTransactionEntity>
                    {
                        Items = indexed.Items,
                        NextCursor = indexed.NextCursor,
                        HasMore = fallback.Items.Count > 0
                    };
                }

                if (fallback.Items.Count == 0)
                {
                    return indexed;
                }

                return new PagedResult<PlaidInvestmentTransactionEntity>
                {
                    Items = indexed.Items.Concat(fallback.Items).ToList(),
                    NextCursor = fallback.NextCursor,
                    HasMore = fallback.HasMore
                };
            }

            return await GetFallbackTransactionsPageAsync(
                userId,
                fromUtc,
                toUtc,
                limit,
                cursor,
                cancellationToken);
        }

        public async Task<IReadOnlyList<InvestmentPortfolioSnapshotEntity>> GetPortfolioSnapshotsAsync(
            string userId,
            DateTime fromUtc,
            DateTime toUtc,
            CancellationToken cancellationToken = default)
        {
            var result = new List<InvestmentPortfolioSnapshotEntity>();
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"SnapshotDateUtc ge {fromUtc}"),
                TableClient.CreateQueryFilter($"SnapshotDateUtc le {toUtc}")
            });

            var query = _snapshotsTable.QueryAsync<InvestmentPortfolioSnapshotEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var snapshot in query)
            {
                result.Add(snapshot);
            }

            return result
                .OrderBy(x => x.SnapshotDateUtc)
                .ThenBy(x => x.Currency)
                .ToList();
        }

        public async Task UpsertSecurityAsync(
            PlaidInvestmentSecurityEntity security,
            CancellationToken cancellationToken = default)
        {
            await _securitiesTable.UpsertEntityAsync(
                security,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public async Task UpsertHoldingAsync(
            PlaidInvestmentHoldingEntity holding,
            CancellationToken cancellationToken = default)
        {
            await _holdingsTable.UpsertEntityAsync(
                holding,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public async Task UpsertTransactionAsync(
            PlaidInvestmentTransactionEntity transaction,
            CancellationToken cancellationToken = default)
        {
            var previous = await GetTransactionAsync(
                transaction.PartitionKey,
                transaction.RowKey,
                cancellationToken);

            await _transactionsTable.UpsertEntityAsync(
                transaction,
                TableUpdateMode.Replace,
                cancellationToken);

            await DeleteStaleTimelineIndexAsync(previous, transaction, cancellationToken);
            await UpsertTimelineIndexAsync(transaction, cancellationToken);
        }

        public async Task UpsertPortfolioSnapshotAsync(
            InvestmentPortfolioSnapshotEntity snapshot,
            CancellationToken cancellationToken = default)
        {
            await _snapshotsTable.UpsertEntityAsync(
                snapshot,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public Task MarkHoldingDeletedAsync(
            PlaidInvestmentHoldingEntity holding,
            CancellationToken cancellationToken = default)
        {
            holding.IsDeleted = true;
            holding.UpdatedAtUtc = DateTime.UtcNow;
            return UpsertHoldingAsync(holding, cancellationToken);
        }

        public async Task DeleteByItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default)
        {
            var securities = await QueryByItemAsync<PlaidInvestmentSecurityEntity>(
                _securitiesTable,
                userId,
                itemId,
                cancellationToken);
            foreach (var security in securities)
            {
                await DeleteIfExistsAsync(_securitiesTable, security, cancellationToken);
            }

            var holdings = await QueryByItemAsync<PlaidInvestmentHoldingEntity>(
                _holdingsTable,
                userId,
                itemId,
                cancellationToken);
            foreach (var holding in holdings)
            {
                await DeleteIfExistsAsync(_holdingsTable, holding, cancellationToken);
            }

            var transactions = await QueryByItemAsync<PlaidInvestmentTransactionEntity>(
                _transactionsTable,
                userId,
                itemId,
                cancellationToken);
            foreach (var transaction in transactions)
            {
                await DeleteTimelineIndexAsync(transaction, cancellationToken);
                await DeleteIfExistsAsync(_transactionsTable, transaction, cancellationToken);
            }
        }

        private async Task<PagedResult<PlaidInvestmentTransactionEntity>> GetIndexedTransactionsPageAsync(
            string userId,
            DateTime? fromUtc,
            DateTime? toUtc,
            int limit,
            string? cursor,
            CancellationToken cancellationToken)
        {
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"RowKey ge {TimelineLowerBound(toUtc)}"),
                TableClient.CreateQueryFilter($"RowKey le {TimelineUpperBound(fromUtc)}")
            };

            if (!string.IsNullOrWhiteSpace(cursor))
            {
                filterParts.Add(TableClient.CreateQueryFilter($"RowKey gt {cursor}"));
            }

            var items = new List<PlaidInvestmentTransactionEntity>(limit);
            var hasMore = false;
            string? nextCursor = null;
            var query = _transactionTimelineTable.QueryAsync<PlaidInvestmentTransactionTimelineIndexEntity>(
                filter: string.Join(" and ", filterParts),
                maxPerPage: Math.Max(limit * 2, 20),
                cancellationToken: cancellationToken);

            await foreach (var index in query)
            {
                var transaction = await GetTransactionAsync(userId, index.TransactionId, cancellationToken);
                if (transaction == null ||
                    TimelineRowKey(transaction) != index.RowKey ||
                    !IsVisibleTransaction(transaction, fromUtc, toUtc))
                {
                    continue;
                }

                if (items.Count >= limit)
                {
                    hasMore = true;
                    break;
                }

                items.Add(transaction);
                nextCursor = index.RowKey;
            }

            return new PagedResult<PlaidInvestmentTransactionEntity>
            {
                Items = items,
                NextCursor = nextCursor,
                HasMore = hasMore
            };
        }

        private async Task<PagedResult<PlaidInvestmentTransactionEntity>> GetFallbackTransactionsPageAsync(
            string userId,
            DateTime? fromUtc,
            DateTime? toUtc,
            int limit,
            string? cursor,
            CancellationToken cancellationToken)
        {
            var transactions = await GetTransactionsAsync(userId, fromUtc, toUtc, cancellationToken);
            var filtered = transactions.Where(x => IsVisibleTransaction(x, fromUtc, toUtc));

            if (!string.IsNullOrWhiteSpace(cursor))
            {
                filtered = filtered.Where(x => string.CompareOrdinal(TimelineRowKey(x), cursor) > 0);
            }

            var page = filtered.Take(limit + 1).ToList();
            var items = page.Take(limit).ToList();
            foreach (var item in items)
            {
                await UpsertTimelineIndexAsync(item, cancellationToken);
            }

            return new PagedResult<PlaidInvestmentTransactionEntity>
            {
                Items = items,
                NextCursor = items.Count > 0 ? TimelineRowKey(items[^1]) : null,
                HasMore = page.Count > limit
            };
        }

        private async Task<PlaidInvestmentTransactionEntity?> GetTransactionAsync(
            string userId,
            string transactionId,
            CancellationToken cancellationToken)
        {
            try
            {
                var response = await _transactionsTable.GetEntityAsync<PlaidInvestmentTransactionEntity>(
                    userId,
                    transactionId,
                    cancellationToken: cancellationToken);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        private async Task UpsertTimelineIndexAsync(
            PlaidInvestmentTransactionEntity transaction,
            CancellationToken cancellationToken)
        {
            await _transactionTimelineTable.UpsertEntityAsync(
                new PlaidInvestmentTransactionTimelineIndexEntity
                {
                    PartitionKey = transaction.PartitionKey,
                    RowKey = TimelineRowKey(transaction),
                    TransactionId = transaction.RowKey,
                    ItemId = transaction.ItemId,
                    PlaidAccountId = transaction.PlaidAccountId,
                    LocalAccountId = transaction.LocalAccountId,
                    SecurityId = transaction.SecurityId,
                    DateUtc = GetTimelineDateUtc(transaction),
                    UpdatedAtUtc = DateTime.UtcNow
                },
                TableUpdateMode.Replace,
                cancellationToken);
        }

        private async Task DeleteStaleTimelineIndexAsync(
            PlaidInvestmentTransactionEntity? previous,
            PlaidInvestmentTransactionEntity current,
            CancellationToken cancellationToken)
        {
            if (previous == null)
            {
                return;
            }

            if (!string.Equals(TimelineRowKey(previous), TimelineRowKey(current), StringComparison.Ordinal))
            {
                await DeleteTimelineIndexAsync(previous, cancellationToken);
            }
        }

        private Task DeleteTimelineIndexAsync(
            PlaidInvestmentTransactionEntity transaction,
            CancellationToken cancellationToken) =>
            DeleteIfExistsAsync(
                _transactionTimelineTable,
                transaction.PartitionKey,
                TimelineRowKey(transaction),
                cancellationToken);

        private static bool IsVisibleTransaction(
            PlaidInvestmentTransactionEntity transaction,
            DateTime? fromUtc,
            DateTime? toUtc)
        {
            var occurred = GetTimelineDateUtc(transaction);
            if (fromUtc.HasValue && occurred < NormalizeUtc(fromUtc.Value))
            {
                return false;
            }

            if (toUtc.HasValue && occurred > NormalizeUtc(toUtc.Value))
            {
                return false;
            }

            return true;
        }

        private static async Task<IReadOnlyList<T>> QueryByItemAsync<T>(
            TableClient table,
            string userId,
            string itemId,
            CancellationToken cancellationToken)
            where T : class, ITableEntity, new()
        {
            var result = new List<T>();
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"ItemId eq {itemId}")
            });

            var query = table.QueryAsync<T>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var entity in query)
            {
                result.Add(entity);
            }

            return result;
        }

        private static async Task DeleteIfExistsAsync<T>(
            TableClient table,
            T entity,
            CancellationToken cancellationToken)
            where T : class, ITableEntity
        {
            await DeleteIfExistsAsync(table, entity.PartitionKey, entity.RowKey, cancellationToken);
        }

        private static async Task DeleteIfExistsAsync(
            TableClient table,
            string partitionKey,
            string rowKey,
            CancellationToken cancellationToken)
        {
            try
            {
                await table.DeleteEntityAsync(
                    partitionKey,
                    rowKey,
                    cancellationToken: cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
            }
        }

        private static string TimelineLowerBound(DateTime? toUtc) =>
            toUtc.HasValue
                ? $"{InvertedTicks(NormalizeUtc(toUtc.Value)):D19}|"
                : "0000000000000000000|";

        private static string TimelineUpperBound(DateTime? fromUtc) =>
            fromUtc.HasValue
                ? $"{InvertedTicks(NormalizeUtc(fromUtc.Value)):D19}|~"
                : "9999999999999999999|~";

        private static string TimelineRowKey(PlaidInvestmentTransactionEntity transaction) =>
            $"{InvertedTicks(GetTimelineDateUtc(transaction)):D19}|{transaction.RowKey}";

        private static long InvertedTicks(DateTime value) =>
            DateTime.MaxValue.Ticks - NormalizeUtc(value).Ticks;

        private static DateTime GetTimelineDateUtc(PlaidInvestmentTransactionEntity transaction) =>
            NormalizeUtc(transaction.TransactionDatetimeUtc ?? transaction.DateUtc);

        private static DateTime NormalizeUtc(DateTime value) =>
            value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
    }
}
