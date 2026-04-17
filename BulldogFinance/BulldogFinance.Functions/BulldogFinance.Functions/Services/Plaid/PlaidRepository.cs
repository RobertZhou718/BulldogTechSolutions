using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Plaid;

namespace BulldogFinance.Functions.Services.Plaid
{
    public class PlaidRepository : IPlaidRepository
    {
        private const string PlaidItemsTableName = "PlaidItems";
        private const string PlaidAccountLinksTableName = "PlaidAccountLinks";

        private readonly TableClient _itemsTable;
        private readonly TableClient _accountLinksTable;

        public PlaidRepository(TableServiceClient tableServiceClient)
        {
            _itemsTable = tableServiceClient.GetTableClient(PlaidItemsTableName);
            _accountLinksTable = tableServiceClient.GetTableClient(PlaidAccountLinksTableName);

            _itemsTable.CreateIfNotExists();
            _accountLinksTable.CreateIfNotExists();
        }

        public async Task<PlaidItemEntity?> GetItemAsync(string userId, string itemId, CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _itemsTable.GetEntityAsync<PlaidItemEntity>(
                    userId,
                    itemId,
                    cancellationToken: cancellationToken);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<PlaidItemEntity?> GetItemByItemIdAsync(string itemId, CancellationToken cancellationToken = default)
        {
            var query = _itemsTable.QueryAsync<PlaidItemEntity>(
                ent => ent.RowKey == itemId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                return item;
            }

            return null;
        }

        public async Task<IReadOnlyList<PlaidItemEntity>> GetItemsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidItemEntity>();
            var query = _itemsTable.QueryAsync<PlaidItemEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                result.Add(item);
            }

            return result;
        }

        public async Task<PlaidItemEntity> UpsertItemAsync(PlaidItemEntity item, CancellationToken cancellationToken = default)
        {
            await _itemsTable.UpsertEntityAsync(item, TableUpdateMode.Replace, cancellationToken);
            return item;
        }

        public async Task<PlaidAccountLinkEntity?> GetAccountLinkAsync(
            string userId,
            string plaidAccountId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _accountLinksTable.GetEntityAsync<PlaidAccountLinkEntity>(
                    userId,
                    plaidAccountId,
                    cancellationToken: cancellationToken);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<IReadOnlyList<PlaidAccountLinkEntity>> GetAccountLinksByItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidAccountLinkEntity>();
            var query = _accountLinksTable.QueryAsync<PlaidAccountLinkEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                if (item.ItemId == itemId)
                {
                    result.Add(item);
                }
            }

            return result;
        }

        public async Task<PlaidAccountLinkEntity> UpsertAccountLinkAsync(
            PlaidAccountLinkEntity accountLink,
            CancellationToken cancellationToken = default)
        {
            await _accountLinksTable.UpsertEntityAsync(accountLink, TableUpdateMode.Replace, cancellationToken);
            return accountLink;
        }

        public async Task DeleteItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default)
        {
            await _itemsTable.DeleteEntityAsync(
                userId,
                itemId,
                cancellationToken: cancellationToken);
        }

        public async Task DeleteAccountLinkAsync(
            string userId,
            string plaidAccountId,
            CancellationToken cancellationToken = default)
        {
            await _accountLinksTable.DeleteEntityAsync(
                userId,
                plaidAccountId,
                cancellationToken: cancellationToken);
        }
    }
}
