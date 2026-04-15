using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Transactions;

namespace BulldogFinance.Functions.Services.Transactions
{
    public interface ITransactionRepository
    {
        Task<TransactionEntity> CreateTransactionAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<TransactionEntity>> GetTransactionsAsync(
            string userId,
            string? accountId = null,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default);

        Task<TransactionEntity?> GetByExternalTransactionIdAsync(
            string userId,
            string externalTransactionId,
            CancellationToken cancellationToken = default);

        Task<TransactionEntity> UpdateTransactionAsync(
            TransactionEntity transaction,
            CancellationToken cancellationToken = default);

        Task MarkTransactionsDeletedByAccountIdAsync(
            string userId,
            string accountId,
            CancellationToken cancellationToken = default);
    }
}
