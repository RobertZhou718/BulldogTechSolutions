using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Transactions;

namespace BulldogFinance.Functions.Services.Transactions
{
    public class TransactionRepository : ITransactionRepository
    {
        private const string TransactionsTableName = "Transactions";
        private const string ExternalTransactionIndexTableName = "TransactionExternalIndex";
        private readonly TableClient _transactionsTable;
        private readonly TableClient _externalTransactionIndexTable;

        public TransactionRepository(TableServiceClient tableServiceClient)
        {
            _transactionsTable = tableServiceClient.GetTableClient(TransactionsTableName);
            _externalTransactionIndexTable = tableServiceClient.GetTableClient(ExternalTransactionIndexTableName);
            _transactionsTable.CreateIfNotExists();
            _externalTransactionIndexTable.CreateIfNotExists();
        }

        public async Task<TransactionEntity> CreateTransactionAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken = default)
        {
            await _transactionsTable.AddEntityAsync(transaction, cancellationToken);
            await UpsertExternalTransactionIndexAsync(transaction, cancellationToken);
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
                var occurred = item.OccurredAtUtc ?? item.CreatedAtUtc ?? DateTime.MinValue;

                if (fromUtc.HasValue && occurred < fromUtc.Value)
                {
                    continue;
                }

                if (toUtc.HasValue && occurred > toUtc.Value)
                {
                    continue;
                }

                result.Add(item);
            }

            result.Sort((a, b) =>
            {
                var aTime = a.OccurredAtUtc ?? a.CreatedAtUtc ?? DateTime.MinValue;
                var bTime = b.OccurredAtUtc ?? b.CreatedAtUtc ?? DateTime.MinValue;
                return bTime.CompareTo(aTime);
            });

            return result;
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
            await _transactionsTable.UpdateEntityAsync(
                transaction,
                transaction.ETag,
                TableUpdateMode.Replace,
                cancellationToken);

            await UpsertExternalTransactionIndexAsync(transaction, cancellationToken);

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
            }
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
