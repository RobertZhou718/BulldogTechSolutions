using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models.SavingsGoals
{
    public class SavingsGoalEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string Name { get; set; } = default!;
        public long TargetAmountCents { get; set; }
        public string Currency { get; set; } = "CAD";
        public string Mode { get; set; } = SavingsGoalModes.TotalBalance;
        public long BaselineAmountCents { get; set; }
        public string IncludedAccountIdsJson { get; set; } = "[]";
        public string IncludedAccountTypesJson { get; set; } = "[]";
        public string Status { get; set; } = SavingsGoalStatuses.Active;

        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public DateTime? ArchivedAtUtc { get; set; }
        public DateTime? CompletedAtUtc { get; set; }
        public DateTime? LastConfigEditedAtUtc { get; set; }
        public int ConfigEditCount { get; set; }
    }

    public static class SavingsGoalModes
    {
        public const string TotalBalance = "total_balance";
        public const string NewSavings = "new_savings";
    }

    public static class SavingsGoalStatuses
    {
        public const string Active = "active";
        public const string Archived = "archived";
    }
}
