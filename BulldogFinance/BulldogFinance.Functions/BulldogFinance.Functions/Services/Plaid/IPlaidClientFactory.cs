using Going.Plaid;

namespace BulldogFinance.Functions.Services.Plaid
{
    /// <summary>
    /// Creates a short-lived <see cref="PlaidClient"/> bound to a specific
    /// access token. Going.Plaid's <c>PlaidClient.AccessToken</c> is a mutable
    /// singleton, so a fresh instance per operation keeps concurrent Function
    /// invocations from overwriting each other's token.
    /// </summary>
    public interface IPlaidClientFactory
    {
        PlaidClient Create(string? accessToken = null);
    }
}
