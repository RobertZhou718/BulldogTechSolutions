using System;

namespace BulldogFinance.Functions.Models.Transactions
{
    public class TransactionCreateRequest
    {
        public string AccountId { get; set; } = default!;
        public string Type { get; set; } = default!;       // Expected values: INCOME or EXPENSE.
        public decimal Amount { get; set; }                // Positive amount.
        public string? Currency { get; set; }              // Usually omitted to use the account currency.
        public string? Category { get; set; }
        public string? Note { get; set; }
        public DateTime? OccurredAtUtc { get; set; }       // Defaults to the current time when omitted.
    }

    public class TransactionUpdateRequest
    {
        public string? Type { get; set; }                  // Manual transactions only.
        public decimal? Amount { get; set; }               // Manual transactions only.
        public string? Category { get; set; }
        public string? Note { get; set; }
        public string? MerchantName { get; set; }
        public DateTime? OccurredAtUtc { get; set; }       // Manual transactions only.
    }

    public class TransactionDto
    {
        public string TransactionId { get; set; } = default!;
        public string AccountId { get; set; } = default!;
        public string Type { get; set; } = default!;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = default!;
        public string? Category { get; set; }
        public string? Note { get; set; }
        public string? MerchantName { get; set; }
        public string? Source { get; set; }
        public bool Pending { get; set; }
        public DateTime? OccurredAtUtc { get; set; }
        public DateTime? AuthorizedAtUtc { get; set; }
        public DateTime? PostedAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public bool IsSystemGenerated { get; set; }
    }

    public class CreateTransactionResponse
    {
        public TransactionDto Transaction { get; set; } = default!;
        public decimal AccountBalanceAfter { get; set; }
    }
}
