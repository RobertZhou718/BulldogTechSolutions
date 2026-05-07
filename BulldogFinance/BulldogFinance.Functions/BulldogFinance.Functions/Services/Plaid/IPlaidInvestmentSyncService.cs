using BulldogFinance.Functions.Models.Investments;

namespace BulldogFinance.Functions.Services.Plaid
{
    public interface IPlaidInvestmentSyncService
    {
        Task<PlaidInvestmentSyncSummary> SyncHoldingsAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);

        Task<PlaidInvestmentSyncSummary> SyncInvestmentTransactionsAsync(
            string userId,
            string itemId,
            DateTime startUtc,
            DateTime endUtc,
            bool? asyncUpdate = null,
            CancellationToken cancellationToken = default);

        Task<PlaidInvestmentSyncSummary> SyncInvestmentsAsync(
            string userId,
            string itemId,
            DateTime? transactionStartUtc = null,
            DateTime? transactionEndUtc = null,
            CancellationToken cancellationToken = default);

        Task<PlaidInvestmentSyncSummary> SyncInvestmentsForAllItemsAsync(
            string userId,
            DateTime? transactionStartUtc = null,
            DateTime? transactionEndUtc = null,
            CancellationToken cancellationToken = default);
    }
}
