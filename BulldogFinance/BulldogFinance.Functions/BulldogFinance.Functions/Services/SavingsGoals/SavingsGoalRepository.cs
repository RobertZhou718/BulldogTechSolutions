using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models.SavingsGoals;

namespace BulldogFinance.Functions.Services.SavingsGoals
{
    public class SavingsGoalRepository : ISavingsGoalRepository
    {
        private const string SavingsGoalsTableName = "SavingsGoals";
        private readonly TableClient _savingsGoalsTable;

        public SavingsGoalRepository(TableServiceClient tableServiceClient)
        {
            _savingsGoalsTable = tableServiceClient.GetTableClient(SavingsGoalsTableName);
            _savingsGoalsTable.CreateIfNotExists();
        }

        public async Task<SavingsGoalEntity> CreateSavingsGoalAsync(
            SavingsGoalEntity goal,
            CancellationToken cancellationToken = default)
        {
            await _savingsGoalsTable.AddEntityAsync(goal, cancellationToken);
            return goal;
        }

        public async Task<IReadOnlyList<SavingsGoalEntity>> GetSavingsGoalsAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var result = new List<SavingsGoalEntity>();
            var filter = TableClient.CreateQueryFilter($"PartitionKey eq {userId}");
            var query = _savingsGoalsTable.QueryAsync<SavingsGoalEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var item in query.ConfigureAwait(false))
            {
                result.Add(item);
            }

            return result;
        }

        public async Task<SavingsGoalEntity?> GetActiveSavingsGoalAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var filter = string.Join(" and ", new[]
            {
                TableClient.CreateQueryFilter($"PartitionKey eq {userId}"),
                TableClient.CreateQueryFilter($"Status eq {SavingsGoalStatuses.Active}")
            });

            var query = _savingsGoalsTable.QueryAsync<SavingsGoalEntity>(
                filter: filter,
                cancellationToken: cancellationToken);

            await foreach (var item in query.ConfigureAwait(false))
            {
                return item;
            }

            return null;
        }

        public async Task<SavingsGoalEntity?> GetSavingsGoalAsync(
            string userId,
            string goalId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var response = await _savingsGoalsTable.GetEntityAsync<SavingsGoalEntity>(
                    partitionKey: userId,
                    rowKey: goalId,
                    cancellationToken: cancellationToken);

                return response.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                return null;
            }
        }

        public async Task<SavingsGoalEntity> UpdateSavingsGoalAsync(
            SavingsGoalEntity goal,
            CancellationToken cancellationToken = default)
        {
            await _savingsGoalsTable.UpdateEntityAsync(
                goal,
                goal.ETag,
                TableUpdateMode.Replace,
                cancellationToken);

            return goal;
        }
    }
}
