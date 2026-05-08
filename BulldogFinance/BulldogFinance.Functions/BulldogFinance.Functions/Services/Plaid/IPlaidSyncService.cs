using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Plaid;

namespace BulldogFinance.Functions.Services.Plaid
{
    public interface IPlaidSyncService
    {
        Task<IReadOnlyList<AccountEntity>> ImportAccountsAsync(
            string userId,
            string itemId,
            string accessToken,
            string? institutionName,
            CancellationToken cancellationToken = default);

        Task RefreshBalancesAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);

        Task<PlaidSyncSummary> SyncTransactionsAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);

        Task RemoveItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);
    }
}
