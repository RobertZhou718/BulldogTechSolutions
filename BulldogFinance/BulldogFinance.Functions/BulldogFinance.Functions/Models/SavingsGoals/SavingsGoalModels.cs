namespace BulldogFinance.Functions.Models.SavingsGoals
{
    public class SavingsGoalCreateRequest
    {
        public string Name { get; set; } = default!;
        public decimal TargetAmount { get; set; }
        public string? Currency { get; set; }
        public string? Mode { get; set; }
        public string[]? IncludedAccountIds { get; set; }
        public string[]? IncludedAccountTypes { get; set; }
    }

    public class SavingsGoalUpdateRequest
    {
        public string? Name { get; set; }
        public decimal? TargetAmount { get; set; }
        public string? Currency { get; set; }
        public string? Mode { get; set; }
        public string[]? IncludedAccountIds { get; set; }
        public string[]? IncludedAccountTypes { get; set; }
    }

    public class SavingsGoalDto
    {
        public string GoalId { get; set; } = default!;
        public string Name { get; set; } = default!;
        public decimal TargetAmount { get; set; }
        public string Currency { get; set; } = default!;
        public string Mode { get; set; } = default!;
        public decimal BaselineAmount { get; set; }
        public decimal CurrentAmount { get; set; }
        public decimal ProgressAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public decimal ProgressPercent { get; set; }
        public bool IsCompleted { get; set; }
        public string[] IncludedAccountIds { get; set; } = Array.Empty<string>();
        public string[] IncludedAccountTypes { get; set; } = Array.Empty<string>();
        public string Status { get; set; } = default!;
        public bool CanEditConfig { get; set; }
        public DateTime? NextConfigEditAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public DateTime? ArchivedAtUtc { get; set; }
        public DateTime? CompletedAtUtc { get; set; }
    }

    public class CreateSavingsGoalResponse
    {
        public SavingsGoalDto Goal { get; set; } = default!;
    }
}
