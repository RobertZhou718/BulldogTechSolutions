using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
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
    }
}
