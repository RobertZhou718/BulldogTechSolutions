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
        private const string PlaidItemLookupTableName = "PlaidItemLookup";

        private readonly TableClient _itemsTable;
        private readonly TableClient _accountLinksTable;
        private readonly TableClient _itemLookupTable;

        public PlaidRepository(TableServiceClient tableServiceClient)
        {
            _itemsTable = tableServiceClient.GetTableClient(PlaidItemsTableName);
            _accountLinksTable = tableServiceClient.GetTableClient(PlaidAccountLinksTableName);
            _itemLookupTable = tableServiceClient.GetTableClient(PlaidItemLookupTableName);

            _itemsTable.CreateIfNotExists();
            _accountLinksTable.CreateIfNotExists();
            _itemLookupTable.CreateIfNotExists();
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
            try
            {
                var lookup = await _itemLookupTable.GetEntityAsync<PlaidItemLookupEntity>(
                    PlaidItemLookupEntity.LookupPartitionKey,
                    itemId,
                    cancellationToken: cancellationToken);

                var indexedItem = await GetItemAsync(lookup.Value.UserId, itemId, cancellationToken);
                if (indexedItem != null)
                {
                    return indexedItem;
                }

                await _itemLookupTable.DeleteEntityAsync(
                    PlaidItemLookupEntity.LookupPartitionKey,
                    itemId,
                    cancellationToken: cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
            }

            var query = _itemsTable.QueryAsync<PlaidItemEntity>(
                ent => ent.RowKey == itemId,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                await UpsertLookupAsync(item, cancellationToken);
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
            await UpsertLookupAsync(item, cancellationToken);
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
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"ItemId eq {itemId}")
            });

            var query = _accountLinksTable.QueryAsync<PlaidAccountLinkEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var item in query)
            {
                result.Add(item);
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

            try
            {
                await _itemLookupTable.DeleteEntityAsync(
                    PlaidItemLookupEntity.LookupPartitionKey,
                    itemId,
                    cancellationToken: cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
            }
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

        private Task UpsertLookupAsync(PlaidItemEntity item, CancellationToken cancellationToken)
        {
            return _itemLookupTable.UpsertEntityAsync(new PlaidItemLookupEntity
            {
                PartitionKey = PlaidItemLookupEntity.LookupPartitionKey,
                RowKey = item.RowKey,
                UserId = item.PartitionKey,
                ItemId = item.RowKey,
                UpdatedAtUtc = item.UpdatedAtUtc ?? item.CreatedAtUtc ?? System.DateTime.UtcNow
            }, TableUpdateMode.Replace, cancellationToken);
        }
    }
}
