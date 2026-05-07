using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Paging;
using BulldogFinance.Functions.Models.Transactions;

namespace BulldogFinance.Functions.Services.Transactions
{
    public class TransactionRepository : ITransactionRepository
    {
        private const string TransactionsTableName = "Transactions";
        private const string ExternalTransactionIndexTableName = "TransactionExternalIndex";
        private const string TransactionTimelineTableName = "TransactionTimeline";
        private const string TransactionAccountTimelineTableName = "TransactionAccountTimeline";

        private readonly TableClient _transactionsTable;
        private readonly TableClient _externalTransactionIndexTable;
        private readonly TableClient _transactionTimelineTable;
        private readonly TableClient _transactionAccountTimelineTable;

        public TransactionRepository(TableServiceClient tableServiceClient)
        {
            _transactionsTable = tableServiceClient.GetTableClient(TransactionsTableName);
            _externalTransactionIndexTable = tableServiceClient.GetTableClient(ExternalTransactionIndexTableName);
            _transactionTimelineTable = tableServiceClient.GetTableClient(TransactionTimelineTableName);
            _transactionAccountTimelineTable = tableServiceClient.GetTableClient(TransactionAccountTimelineTableName);

            _transactionsTable.CreateIfNotExists();
            _externalTransactionIndexTable.CreateIfNotExists();
            _transactionTimelineTable.CreateIfNotExists();
            _transactionAccountTimelineTable.CreateIfNotExists();
        }

        public async Task<TransactionEntity> CreateTransactionAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken = default)
        {
            await _transactionsTable.AddEntityAsync(transaction, cancellationToken);
            await UpsertExternalTransactionIndexAsync(transaction, cancellationToken);
            await UpsertTimelineIndexesAsync(transaction, cancellationToken);
            return transaction;
        }

        public async Task<IReadOnlyList<TransactionEntity>> GetTransactionsAsync(
            string userId,
            string? accountId = null,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default)
        {
            var result = new List<TransactionEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"IsDeleted eq {false}")
            };

            if (!string.IsNullOrWhiteSpace(accountId))
            {
                filterParts.Add(TableClient.CreateQueryFilter($"AccountId eq {accountId}"));
            }

            var query = _transactionsTable.QueryAsync<TransactionEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                var occurred = GetTimelineDateUtc(item);

                if (fromUtc.HasValue && occurred < NormalizeUtc(fromUtc.Value))
                {
                    continue;
                }

                if (toUtc.HasValue && occurred > NormalizeUtc(toUtc.Value))
                {
                    continue;
                }

                result.Add(item);
            }

            result.Sort((a, b) => GetTimelineDateUtc(b).CompareTo(GetTimelineDateUtc(a)));

            return result;
        }

        public async Task<PagedResult<TransactionEntity>> GetTransactionsPageAsync(
            string userId,
            string? accountId = null,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            string? type = null,
            string? category = null,
            int limit = 50,
            string? cursor = null,
            CancellationToken cancellationToken = default)
        {
            limit = Math.Clamp(limit, 1, 200);

            var indexed = await GetIndexedTransactionsPageAsync(
                userId,
                accountId,
                fromUtc,
                toUtc,
                type,
                category,
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
                    accountId,
                    fromUtc,
                    toUtc,
                    type,
                    category,
                    remaining > 0 ? remaining : 1,
                    indexed.NextCursor,
                    cancellationToken);

                if (remaining <= 0)
                {
                    return new PagedResult<TransactionEntity>
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

                return new PagedResult<TransactionEntity>
                {
                    Items = indexed.Items.Concat(fallback.Items).ToList(),
                    NextCursor = fallback.NextCursor,
                    HasMore = fallback.HasMore
                };
            }

            return await GetFallbackTransactionsPageAsync(
                userId,
                accountId,
                fromUtc,
                toUtc,
                type,
                category,
                limit,
                cursor,
                cancellationToken);
        }

        public async Task<TransactionEntity?> GetTransactionAsync(
            string userId,
            string transactionId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _transactionsTable.GetEntityAsync<TransactionEntity>(
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

        public async Task<TransactionEntity?> GetByExternalTransactionIdAsync(
            string userId,
            string externalTransactionId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var index = await _externalTransactionIndexTable.GetEntityAsync<ExternalTransactionIndexEntity>(
                    userId,
                    externalTransactionId,
                    cancellationToken: cancellationToken);

                var entity = await _transactionsTable.GetEntityAsync<TransactionEntity>(
                    userId,
                    index.Value.TransactionRowKey,
                    cancellationToken: cancellationToken);

                if (string.Equals(entity.Value.ExternalTransactionId, externalTransactionId, StringComparison.OrdinalIgnoreCase))
                {
                    return entity.Value;
                }

                await _externalTransactionIndexTable.DeleteEntityAsync(
                    userId,
                    externalTransactionId,
                    cancellationToken: cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
            }

            var query = _transactionsTable.QueryAsync<TransactionEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                if (string.Equals(item.ExternalTransactionId, externalTransactionId, StringComparison.OrdinalIgnoreCase))
                {
                    await UpsertExternalTransactionIndexAsync(item, cancellationToken);
                    return item;
                }
            }

            return null;
        }

        public async Task<TransactionEntity> UpdateTransactionAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken = default)
        {
            var previous = await GetTransactionAsync(
                transaction.PartitionKey,
                transaction.RowKey,
                cancellationToken);

            await _transactionsTable.UpdateEntityAsync(
                transaction,
                transaction.ETag,
                TableUpdateMode.Replace,
                cancellationToken);

            await UpsertExternalTransactionIndexAsync(transaction, cancellationToken);
            await DeleteStaleTimelineIndexesAsync(previous, transaction, cancellationToken);
            await UpsertTimelineIndexesAsync(transaction, cancellationToken);

            return transaction;
        }

        public async Task MarkTransactionsDeletedByAccountIdAsync(
            string userId,
            string accountId,
            CancellationToken cancellationToken = default)
        {
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"AccountId eq {accountId}"),
                TableClient.CreateQueryFilter($"IsDeleted eq {false}")
            });

            var query = _transactionsTable.QueryAsync<TransactionEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                item.IsDeleted = true;
                item.UpdatedAtUtc = DateTime.UtcNow;

                await _transactionsTable.UpdateEntityAsync(
                    item,
                    item.ETag,
                    TableUpdateMode.Replace,
                    cancellationToken);

                await DeleteTimelineIndexesAsync(item, cancellationToken);
            }
        }

        private async Task<PagedResult<TransactionEntity>> GetIndexedTransactionsPageAsync(
            string userId,
            string? accountId,
            DateTime? fromUtc,
            DateTime? toUtc,
            string? type,
            string? category,
            int limit,
            string? cursor,
            CancellationToken cancellationToken)
        {
            var table = string.IsNullOrWhiteSpace(accountId)
                ? _transactionTimelineTable
                : _transactionAccountTimelineTable;
            var partitionKey = string.IsNullOrWhiteSpace(accountId)
                ? userId
                : AccountTimelinePartitionKey(userId, accountId!);
            var lowerBound = TimelineLowerBound(toUtc);
            var upperBound = TimelineUpperBound(fromUtc);
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {partitionKey}"),
                TableClient.CreateQueryFilter($"RowKey ge {lowerBound}"),
                TableClient.CreateQueryFilter($"RowKey le {upperBound}")
            };

            if (!string.IsNullOrWhiteSpace(cursor))
            {
                filterParts.Add(TableClient.CreateQueryFilter($"RowKey gt {cursor}"));
            }

            var items = new List<TransactionEntity>(limit);
            var hasMore = false;
            string? nextCursor = null;
            var query = table.QueryAsync<TransactionTimelineIndexEntity>(
                filter: string.Join(" and ", filterParts),
                maxPerPage: Math.Max(limit * 2, 20),
                cancellationToken: cancellationToken);

            await foreach (var index in query)
            {
                var transaction = await GetTransactionAsync(userId, index.TransactionId, cancellationToken);
                if (transaction == null ||
                    transaction.IsDeleted ||
                    TimelineRowKey(transaction) != index.RowKey ||
                    !IsVisibleTransaction(transaction, accountId, fromUtc, toUtc, type, category))
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

            return new PagedResult<TransactionEntity>
            {
                Items = items,
                NextCursor = nextCursor,
                HasMore = hasMore
            };
        }

        private async Task<PagedResult<TransactionEntity>> GetFallbackTransactionsPageAsync(
            string userId,
            string? accountId,
            DateTime? fromUtc,
            DateTime? toUtc,
            string? type,
            string? category,
            int limit,
            string? cursor,
            CancellationToken cancellationToken)
        {
            var transactions = await GetTransactionsAsync(
                userId,
                accountId,
                fromUtc,
                toUtc,
                cancellationToken);

            var filtered = transactions
                .Where(x => IsVisibleTransaction(x, accountId, fromUtc, toUtc, type, category));

            if (!string.IsNullOrWhiteSpace(cursor))
            {
                filtered = filtered.Where(x => string.CompareOrdinal(TimelineRowKey(x), cursor) > 0);
            }

            var page = filtered.Take(limit + 1).ToList();
            var items = page.Take(limit).ToList();
            foreach (var item in items)
            {
                await UpsertTimelineIndexesAsync(item, cancellationToken);
            }

            return new PagedResult<TransactionEntity>
            {
                Items = items,
                NextCursor = items.Count > 0 ? TimelineRowKey(items[^1]) : null,
                HasMore = page.Count > limit
            };
        }

        private Task UpsertExternalTransactionIndexAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(transaction.ExternalTransactionId))
            {
                return Task.CompletedTask;
            }

            return _externalTransactionIndexTable.UpsertEntityAsync(new ExternalTransactionIndexEntity
            {
                PartitionKey = transaction.PartitionKey,
                RowKey = transaction.ExternalTransactionId,
                TransactionRowKey = transaction.RowKey,
                UpdatedAtUtc = transaction.UpdatedAtUtc ?? transaction.CreatedAtUtc ?? DateTime.UtcNow
            }, TableUpdateMode.Replace, cancellationToken);
        }

        private async Task UpsertTimelineIndexesAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken)
        {
            if (transaction.IsDeleted)
            {
                await DeleteTimelineIndexesAsync(transaction, cancellationToken);
                return;
            }

            var now = DateTime.UtcNow;
            var rowKey = TimelineRowKey(transaction);
            var occurredAtUtc = GetTimelineDateUtc(transaction);
            var index = new TransactionTimelineIndexEntity
            {
                PartitionKey = transaction.PartitionKey,
                RowKey = rowKey,
                TransactionId = transaction.RowKey,
                AccountId = transaction.AccountId,
                OccurredAtUtc = occurredAtUtc,
                UpdatedAtUtc = now
            };

            await _transactionTimelineTable.UpsertEntityAsync(index, TableUpdateMode.Replace, cancellationToken);
            await _transactionAccountTimelineTable.UpsertEntityAsync(
                new TransactionTimelineIndexEntity
                {
                    PartitionKey = AccountTimelinePartitionKey(transaction.PartitionKey, transaction.AccountId),
                    RowKey = rowKey,
                    TransactionId = transaction.RowKey,
                    AccountId = transaction.AccountId,
                    OccurredAtUtc = occurredAtUtc,
                    UpdatedAtUtc = now
                },
                TableUpdateMode.Replace,
                cancellationToken);
        }

        private async Task DeleteStaleTimelineIndexesAsync(
            TransactionEntity? previous,
            TransactionEntity current,
            CancellationToken cancellationToken)
        {
            if (previous == null)
            {
                return;
            }

            if (previous.IsDeleted)
            {
                return;
            }

            if (current.IsDeleted ||
                !string.Equals(previous.AccountId, current.AccountId, StringComparison.Ordinal) ||
                !string.Equals(TimelineRowKey(previous), TimelineRowKey(current), StringComparison.Ordinal))
            {
                await DeleteTimelineIndexesAsync(previous, cancellationToken);
            }
        }

        private async Task DeleteTimelineIndexesAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken)
        {
            var rowKey = TimelineRowKey(transaction);
            await DeleteIfExistsAsync(_transactionTimelineTable, transaction.PartitionKey, rowKey, cancellationToken);
            await DeleteIfExistsAsync(
                _transactionAccountTimelineTable,
                AccountTimelinePartitionKey(transaction.PartitionKey, transaction.AccountId),
                rowKey,
                cancellationToken);
        }

        private static async Task DeleteIfExistsAsync(
            TableClient table,
            string partitionKey,
            string rowKey,
            CancellationToken cancellationToken)
        {
            try
            {
                await table.DeleteEntityAsync(partitionKey, rowKey, cancellationToken: cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
            }
        }

        private static bool IsVisibleTransaction(
            TransactionEntity transaction,
            string? accountId,
            DateTime? fromUtc,
            DateTime? toUtc,
            string? type,
            string? category)
        {
            if (!string.IsNullOrWhiteSpace(accountId) &&
                !string.Equals(transaction.AccountId, accountId, StringComparison.Ordinal))
            {
                return false;
            }

            var occurred = GetTimelineDateUtc(transaction);
            if (fromUtc.HasValue && occurred < NormalizeUtc(fromUtc.Value))
            {
                return false;
            }

            if (toUtc.HasValue && occurred > NormalizeUtc(toUtc.Value))
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(type) &&
                !string.Equals(transaction.Type, type, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(category) &&
                (transaction.Category?.IndexOf(category, StringComparison.OrdinalIgnoreCase) ?? -1) < 0)
            {
                return false;
            }

            return true;
        }

        private static string AccountTimelinePartitionKey(string userId, string accountId) =>
            $"{userId}|{accountId}";

        private static string TimelineRowKey(TransactionEntity transaction) =>
            TimelineRowKey(GetTimelineDateUtc(transaction), transaction.RowKey);

        private static string TimelineLowerBound(DateTime? toUtc) =>
            toUtc.HasValue
                ? $"{InvertedTicks(NormalizeUtc(toUtc.Value)):D19}|"
                : "0000000000000000000|";

        private static string TimelineUpperBound(DateTime? fromUtc) =>
            fromUtc.HasValue
                ? $"{InvertedTicks(NormalizeUtc(fromUtc.Value)):D19}|~"
                : "9999999999999999999|~";

        private static string TimelineRowKey(DateTime occurredAtUtc, string entityId) =>
            $"{InvertedTicks(occurredAtUtc):D19}|{entityId}";

        private static long InvertedTicks(DateTime value) =>
            DateTime.MaxValue.Ticks - NormalizeUtc(value).Ticks;

        private static DateTime GetTimelineDateUtc(TransactionEntity transaction) =>
            NormalizeUtc(transaction.OccurredAtUtc ?? transaction.CreatedAtUtc ?? DateTime.MinValue);

        private static DateTime NormalizeUtc(DateTime value) =>
            value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };

        private sealed class ExternalTransactionIndexEntity : ITableEntity
        {
            public string PartitionKey { get; set; } = default!;
            public string RowKey { get; set; } = default!;
            public DateTimeOffset? Timestamp { get; set; }
            public ETag ETag { get; set; }

            public string TransactionRowKey { get; set; } = default!;
            public DateTime? UpdatedAtUtc { get; set; }
        }
    }
}
