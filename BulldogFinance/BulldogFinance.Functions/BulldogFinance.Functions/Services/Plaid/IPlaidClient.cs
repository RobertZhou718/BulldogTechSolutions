using BulldogFinance.Functions.Models.Plaid;

namespace BulldogFinance.Functions.Services.Plaid
{
    public interface IPlaidClient
    {
        Task<PlaidLinkTokenResult> CreateLinkTokenAsync(
            string userId,
            IReadOnlyList<string> countryCodes,
            IReadOnlyList<string> products,
            CancellationToken cancellationToken = default);

        Task<PlaidPublicTokenExchangeResult> ExchangePublicTokenAsync(
            string publicToken,
            CancellationToken cancellationToken = default);

        Task<PlaidAccountsGetResult> GetAccountsAsync(
            string accessToken,
            CancellationToken cancellationToken = default);

        Task<PlaidBalanceGetResult> GetBalancesAsync(
            string accessToken,
            CancellationToken cancellationToken = default);

        Task<PlaidTransactionsSyncResult> SyncTransactionsAsync(
            string accessToken,
            string? cursor,
            CancellationToken cancellationToken = default);

        Task RemoveItemAsync(
            string accessToken,
            CancellationToken cancellationToken = default);
    }
}
