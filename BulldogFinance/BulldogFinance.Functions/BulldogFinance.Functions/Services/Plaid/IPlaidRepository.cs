using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Plaid;

namespace BulldogFinance.Functions.Services.Plaid
{
    public interface IPlaidRepository
    {
        Task<PlaidItemEntity?> GetItemAsync(string userId, string itemId, CancellationToken cancellationToken = default);

        Task<PlaidItemEntity?> GetItemByItemIdAsync(string itemId, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<PlaidItemEntity>> GetItemsAsync(string userId, CancellationToken cancellationToken = default);

        Task<PlaidItemEntity> UpsertItemAsync(PlaidItemEntity item, CancellationToken cancellationToken = default);

        Task<PlaidAccountLinkEntity?> GetAccountLinkAsync(
            string userId,
            string plaidAccountId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<PlaidAccountLinkEntity>> GetAccountLinksByItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);

        Task<PlaidAccountLinkEntity> UpsertAccountLinkAsync(
            PlaidAccountLinkEntity accountLink,
            CancellationToken cancellationToken = default);

        Task DeleteItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default);

        Task DeleteAccountLinkAsync(
            string userId,
            string plaidAccountId,
            CancellationToken cancellationToken = default);
    }
}
