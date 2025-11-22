using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
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
    }
}
