using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Accounts;

namespace BulldogFinance.Functions.Services.Accounts
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
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}")
            };

            if (!includeArchived)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"IsArchived eq {false}"));
            }

            var query = _accountsTable.QueryAsync<AccountEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
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

        public async Task<AccountEntity?> GetAccountByExternalReferenceAsync(
            string userId,
            string externalSource,
            string externalAccountId,
            CancellationToken cancellationToken = default)
        {
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"ExternalSource eq {externalSource}"),
                TableClient.CreateQueryFilter($"ExternalAccountId eq {externalAccountId}")
            });

            var query = _accountsTable.QueryAsync<AccountEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                return item;
            }

            return null;
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

        public async Task DeleteAccountAsync(
            string userId,
            string accountId,
            CancellationToken cancellationToken = default)
        {
            await _accountsTable.DeleteEntityAsync(
                userId,
                accountId,
                cancellationToken: cancellationToken);
        }
    }
}
