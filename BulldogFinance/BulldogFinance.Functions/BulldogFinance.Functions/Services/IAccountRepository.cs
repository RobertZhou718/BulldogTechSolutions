using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
{
    public interface IAccountRepository
    {
        Task<AccountEntity> CreateAccountAsync(AccountEntity account, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<AccountEntity>> GetAccountsAsync(
            string userId,
            bool includeArchived,
            CancellationToken cancellationToken = default);

        Task<AccountEntity?> GetAccountAsync(
            string userId,
            string accountId,
            CancellationToken cancellationToken = default);

        Task<AccountEntity> UpdateAccountAsync(
            AccountEntity account,
            CancellationToken cancellationToken = default);
    }
}
