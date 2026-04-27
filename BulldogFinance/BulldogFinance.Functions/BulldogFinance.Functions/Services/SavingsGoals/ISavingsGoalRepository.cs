using BulldogFinance.Functions.Models.SavingsGoals;

namespace BulldogFinance.Functions.Services.SavingsGoals
{
    public interface ISavingsGoalRepository
    {
        Task<SavingsGoalEntity> CreateSavingsGoalAsync(
            SavingsGoalEntity goal,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<SavingsGoalEntity>> GetSavingsGoalsAsync(
            string userId,
            CancellationToken cancellationToken = default);

        Task<SavingsGoalEntity?> GetActiveSavingsGoalAsync(
            string userId,
            CancellationToken cancellationToken = default);

        Task<SavingsGoalEntity?> GetSavingsGoalAsync(
            string userId,
            string goalId,
            CancellationToken cancellationToken = default);

        Task<SavingsGoalEntity> UpdateSavingsGoalAsync(
            SavingsGoalEntity goal,
            CancellationToken cancellationToken = default);
    }
}
