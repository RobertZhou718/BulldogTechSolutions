using System;

namespace BulldogFinance.Functions.Models
{
    public class TransactionCreateRequest
    {
        public string AccountId { get; set; } = default!;
        public string Type { get; set; } = default!;       // INCOME / EXPENSE
        public decimal Amount { get; set; }               // 正值金额
        public string? Currency { get; set; }             // 一般留空，用账户币种
        public string? Category { get; set; }
        public string? Note { get; set; }
        public DateTime? OccurredAtUtc { get; set; }      // 不传就用当前时间
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
        public DateTime? OccurredAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
    }

    public class CreateTransactionResponse
    {
        public TransactionDto Transaction { get; set; } = default!;
        public decimal AccountBalanceAfter { get; set; }
    }
}
