using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Paging;

namespace BulldogFinance.Functions.Services.Investments
{
    public interface IPlaidInvestmentRepository
    {
        Task<IReadOnlyList<PlaidInvestmentHoldingEntity>> GetHoldingsAsync(
            string userId,
            bool includeDeleted = false,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<PlaidInvestmentHoldingEntity>> GetHoldingsByItemAsync(
            string userId,
            string itemId,
            bool includeDeleted = false,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<PlaidInvestmentSecurityEntity>> GetSecuritiesAsync(
            string userId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<PlaidInvestmentTransactionEntity>> GetTransactionsAsync(
            string userId,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default);

        Task<PagedResult<PlaidInvestmentTransactionEntity>> GetTransactionsPageAsync(
            string userId,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            int limit = 50,
            string? cursor = null,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<InvestmentPortfolioSnapshotEntity>> GetPortfolioSnapshotsAsync(
            string userId,
            DateTime fromUtc,
            DateTime toUtc,
            CancellationToken cancellationToken = default);

        Task UpsertSecurityAsync(
            PlaidInvestmentSecurityEntity security,
            CancellationToken cancellationToken = default);

        Task UpsertHoldingAsync(
            PlaidInvestmentHoldingEntity holding,
            CancellationToken cancellationToken = default);

        Task UpsertTransactionAsync(
            PlaidInvestmentTransactionEntity transaction,
            CancellationToken cancellationToken = default);

        Task UpsertPortfolioSnapshotAsync(
            InvestmentPortfolioSnapshotEntity snapshot,
            CancellationToken cancellationToken = default);

        Task MarkHoldingDeletedAsync(
            PlaidInvestmentHoldingEntity holding,
            CancellationToken cancellationToken = default);

        Task DeleteByItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);
    }
}
