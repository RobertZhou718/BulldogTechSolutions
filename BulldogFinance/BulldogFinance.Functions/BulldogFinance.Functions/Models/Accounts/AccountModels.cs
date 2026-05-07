namespace BulldogFinance.Functions.Models.Accounts
{
    public class AccountCreateRequest
    {
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string? Currency { get; set; }
        public decimal InitialBalance { get; set; }
    }

    public class AccountDto
    {
        public string AccountId { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string Currency { get; set; } = default!;
        public decimal CurrentBalance { get; set; }
        public decimal? AvailableBalance { get; set; }
        public bool IsArchived { get; set; }
        public string? ExternalSource { get; set; }
        public string? InstitutionName { get; set; }
        public string? Mask { get; set; }
        public string? PlaidItemId { get; set; }
        public string? PlaidItemStatus { get; set; }
        public DateTime? LastBalanceRefreshUtc { get; set; }
        public DateTime? LastTransactionSyncUtc { get; set; }
        public string? LastSyncStatus { get; set; }
        public string? LastSyncErrorCode { get; set; }
        public string? LastSyncError { get; set; }
    }

    public class CreateAccountResponse
    {
        public AccountDto Account { get; set; } = default!;
    }
}
