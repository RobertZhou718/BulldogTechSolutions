using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Transactions;

namespace BulldogFinance.Functions.Services.Transactions
{
    public class TransactionRepository : ITransactionRepository
    {
        private const string TransactionsTableName = "Transactions";
        private readonly TableClient _transactionsTable;

        public TransactionRepository(TableServiceClient tableServiceClient)
        {
            _transactionsTable = tableServiceClient.GetTableClient(TransactionsTableName);
            _transactionsTable.CreateIfNotExists();
        }

        public async Task<TransactionEntity> CreateTransactionAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken = default)
        {
            await _transactionsTable.AddEntityAsync(transaction, cancellationToken);
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

            // 先按 PartitionKey 过滤，剩下条件在内存中过滤（个人应用足够用）
            var query = _transactionsTable.QueryAsync<TransactionEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                if (item.IsDeleted)
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(accountId) &&
                    !string.Equals(item.AccountId, accountId, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

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

        public async Task<TransactionEntity?> GetByExternalTransactionIdAsync(
            string userId,
            string externalTransactionId,
            CancellationToken cancellationToken = default)
        {
            var query = _transactionsTable.QueryAsync<TransactionEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                if (string.Equals(item.ExternalTransactionId, externalTransactionId, StringComparison.OrdinalIgnoreCase))
                {
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

            return transaction;
        }

        public async Task MarkTransactionsDeletedByAccountIdAsync(
            string userId,
            string accountId,
            CancellationToken cancellationToken = default)
        {
            var query = _transactionsTable.QueryAsync<TransactionEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                if (!string.Equals(item.AccountId, accountId, StringComparison.OrdinalIgnoreCase) || item.IsDeleted)
                {
                    continue;
                }

                item.IsDeleted = true;
                item.UpdatedAtUtc = DateTime.UtcNow;

                await _transactionsTable.UpdateEntityAsync(
                    item,
                    item.ETag,
                    TableUpdateMode.Replace,
                    cancellationToken);
            }
        }
    }
}
