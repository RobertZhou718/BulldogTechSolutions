using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
{
    public class AccountRepository : IAccountRepository
    {
        private const string AccountsTableName = "Accounts";
        private readonly TableClient _accountsTable;

        public AccountRepository(TableServiceClient tableServiceClient)
        {
            _accountsTable = tableServiceClient.GetTableClient(AccountsTableName);
            _accountsTable.CreateIfNotExists();
        }

        public async Task<AccountEntity> CreateAccountAsync(
            AccountEntity account,
            CancellationToken cancellationToken = default)
        {
            await _accountsTable.AddEntityAsync(account, cancellationToken);
            return account;
        }

        public async Task<IReadOnlyList<AccountEntity>> GetAccountsAsync(
            string userId,
            bool includeArchived,
            CancellationToken cancellationToken = default)
        {
            var result = new List<AccountEntity>();

            // 只按 PartitionKey 过滤，IsArchived 在内存中过滤即可
            var query = _accountsTable.QueryAsync<AccountEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                if (!includeArchived && item.IsArchived)
                    continue;

                result.Add(item);
            }

            return result;
        }

        public async Task<AccountEntity?> GetAccountAsync(
            string userId,
            string accountId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _accountsTable.GetEntityAsync<AccountEntity>(
                    partitionKey: userId,
                    rowKey: accountId,
                    cancellationToken: cancellationToken);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<AccountEntity> UpdateAccountAsync(
            AccountEntity account,
            CancellationToken cancellationToken = default)
        {
            await _accountsTable.UpdateEntityAsync(
                account,
                account.ETag,
                TableUpdateMode.Replace,
                cancellationToken);

            return account;
        }
    }
}
