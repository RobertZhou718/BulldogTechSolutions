using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.Investments;

namespace BulldogFinance.Functions.Services.Investments
{
    public class PlaidInvestmentRepository : IPlaidInvestmentRepository
    {
        private const string SecuritiesTableName = "PlaidInvestmentSecurities";
        private const string HoldingsTableName = "PlaidInvestmentHoldings";
        private const string TransactionsTableName = "PlaidInvestmentTransactions";
        private const string SnapshotsTableName = "InvestmentPortfolioSnapshots";

        private readonly TableClient _securitiesTable;
        private readonly TableClient _holdingsTable;
        private readonly TableClient _transactionsTable;
        private readonly TableClient _snapshotsTable;

        public PlaidInvestmentRepository(TableServiceClient tableServiceClient)
        {
            _securitiesTable = tableServiceClient.GetTableClient(SecuritiesTableName);
            _holdingsTable = tableServiceClient.GetTableClient(HoldingsTableName);
            _transactionsTable = tableServiceClient.GetTableClient(TransactionsTableName);
            _snapshotsTable = tableServiceClient.GetTableClient(SnapshotsTableName);

            _securitiesTable.CreateIfNotExists();
            _holdingsTable.CreateIfNotExists();
            _transactionsTable.CreateIfNotExists();
            _snapshotsTable.CreateIfNotExists();
        }

        public async Task<IReadOnlyList<PlaidInvestmentHoldingEntity>> GetHoldingsAsync(
            string userId,
            bool includeDeleted = false,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentHoldingEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}")
            };

            if (!includeDeleted)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"IsDeleted eq {false}"));
            }

            var query = _holdingsTable.QueryAsync<PlaidInvestmentHoldingEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var holding in query)
            {
                result.Add(holding);
            }

            return result;
        }

        public async Task<IReadOnlyList<PlaidInvestmentHoldingEntity>> GetHoldingsByItemAsync(
            string userId,
            string itemId,
            bool includeDeleted = false,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentHoldingEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"ItemId eq {itemId}")
            };

            if (!includeDeleted)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"IsDeleted eq {false}"));
            }

            var query = _holdingsTable.QueryAsync<PlaidInvestmentHoldingEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var holding in query)
            {
                result.Add(holding);
            }

            return result;
        }

        public async Task<IReadOnlyList<PlaidInvestmentSecurityEntity>> GetSecuritiesAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentSecurityEntity>();
            var query = _securitiesTable.QueryAsync<PlaidInvestmentSecurityEntity>(
                ent => ent.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var security in query)
            {
                result.Add(security);
            }

            return result;
        }

        public async Task<IReadOnlyList<PlaidInvestmentTransactionEntity>> GetTransactionsAsync(
            string userId,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default)
        {
            var result = new List<PlaidInvestmentTransactionEntity>();
            var filterParts = new List<string>
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}")
            };

            if (fromUtc.HasValue)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"DateUtc ge {fromUtc.Value}"));
            }

            if (toUtc.HasValue)
            {
                filterParts.Add(TableClient.CreateQueryFilter($"DateUtc le {toUtc.Value}"));
            }

            var query = _transactionsTable.QueryAsync<PlaidInvestmentTransactionEntity>(
                filter: string.Join(" and ", filterParts),
                cancellationToken: cancellationToken);

            await foreach (var transaction in query)
            {
                result.Add(transaction);
            }

            return result
                .OrderByDescending(x => x.DateUtc)
                .ThenByDescending(x => x.TransactionDatetimeUtc)
                .ToList();
        }

        public async Task<IReadOnlyList<InvestmentPortfolioSnapshotEntity>> GetPortfolioSnapshotsAsync(
            string userId,
            DateTime fromUtc,
            DateTime toUtc,
            CancellationToken cancellationToken = default)
        {
            var result = new List<InvestmentPortfolioSnapshotEntity>();
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"SnapshotDateUtc ge {fromUtc}"),
                TableClient.CreateQueryFilter($"SnapshotDateUtc le {toUtc}")
            });

            var query = _snapshotsTable.QueryAsync<InvestmentPortfolioSnapshotEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var snapshot in query)
            {
                result.Add(snapshot);
            }

            return result
                .OrderBy(x => x.SnapshotDateUtc)
                .ThenBy(x => x.Currency)
                .ToList();
        }

        public async Task UpsertSecurityAsync(
            PlaidInvestmentSecurityEntity security,
            CancellationToken cancellationToken = default)
        {
            await _securitiesTable.UpsertEntityAsync(
                security,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public async Task UpsertHoldingAsync(
            PlaidInvestmentHoldingEntity holding,
            CancellationToken cancellationToken = default)
        {
            await _holdingsTable.UpsertEntityAsync(
                holding,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public async Task UpsertTransactionAsync(
            PlaidInvestmentTransactionEntity transaction,
            CancellationToken cancellationToken = default)
        {
            await _transactionsTable.UpsertEntityAsync(
                transaction,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public async Task UpsertPortfolioSnapshotAsync(
            InvestmentPortfolioSnapshotEntity snapshot,
            CancellationToken cancellationToken = default)
        {
            await _snapshotsTable.UpsertEntityAsync(
                snapshot,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public Task MarkHoldingDeletedAsync(
            PlaidInvestmentHoldingEntity holding,
            CancellationToken cancellationToken = default)
        {
            holding.IsDeleted = true;
            holding.UpdatedAtUtc = DateTime.UtcNow;
            return UpsertHoldingAsync(holding, cancellationToken);
        }

        public async Task DeleteByItemAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken = default)
        {
            var securities = await QueryByItemAsync<PlaidInvestmentSecurityEntity>(
                _securitiesTable,
                userId,
                itemId,
                cancellationToken);
            foreach (var security in securities)
            {
                await DeleteIfExistsAsync(_securitiesTable, security, cancellationToken);
            }

            var holdings = await QueryByItemAsync<PlaidInvestmentHoldingEntity>(
                _holdingsTable,
                userId,
                itemId,
                cancellationToken);
            foreach (var holding in holdings)
            {
                await DeleteIfExistsAsync(_holdingsTable, holding, cancellationToken);
            }

            var transactions = await QueryByItemAsync<PlaidInvestmentTransactionEntity>(
                _transactionsTable,
                userId,
                itemId,
                cancellationToken);
            foreach (var transaction in transactions)
            {
                await DeleteIfExistsAsync(_transactionsTable, transaction, cancellationToken);
            }
        }

        private static async Task<IReadOnlyList<T>> QueryByItemAsync<T>(
            TableClient table,
            string userId,
            string itemId,
            CancellationToken cancellationToken)
            where T : class, ITableEntity, new()
        {
            var result = new List<T>();
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"ItemId eq {itemId}")
            });

            var query = table.QueryAsync<T>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var entity in query)
            {
                result.Add(entity);
            }

            return result;
        }

        private static async Task DeleteIfExistsAsync<T>(
            TableClient table,
            T entity,
            CancellationToken cancellationToken)
            where T : class, ITableEntity
        {
            try
            {
                await table.DeleteEntityAsync(
                    entity.PartitionKey,
                    entity.RowKey,
                    cancellationToken: cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
            }
        }
    }
}
