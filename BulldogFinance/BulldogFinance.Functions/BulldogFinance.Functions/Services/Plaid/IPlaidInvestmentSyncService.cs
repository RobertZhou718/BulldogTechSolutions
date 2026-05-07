using BulldogFinance.Functions.Models.Investments;

namespace BulldogFinance.Functions.Services.Plaid
{
    public interface IPlaidInvestmentSyncService
    {
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
