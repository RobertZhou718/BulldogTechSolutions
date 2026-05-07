using System;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models.Transactions
{
    public class TransactionEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string AccountId { get; set; } = default!;  // Matches Accounts.RowKey.
        public string Type { get; set; } = default!;       // Values such as INCOME, EXPENSE, or INIT.

        public long AmountCents { get; set; }
        public string Currency { get; set; } = "CAD";

        public string? Category { get; set; }
        public string? Note { get; set; }
        public string? MerchantName { get; set; }
        public string? Source { get; set; }
        public string? ExternalTransactionId { get; set; }
        public string? ExternalAccountId { get; set; }
        public bool Pending { get; set; }
        public DateTime? AuthorizedAtUtc { get; set; }
        public DateTime? PostedAtUtc { get; set; }

        public DateTime? OccurredAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }

        public bool IsDeleted { get; set; }
        public bool IsSystemGenerated { get; set; }
    }

    public class TransactionTimelineIndexEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string TransactionId { get; set; } = default!;
        public string AccountId { get; set; } = default!;
        public DateTime OccurredAtUtc { get; set; }

        public string? Type { get; set; }
        public long AmountCents { get; set; }
        public string? Currency { get; set; }
        public string? Category { get; set; }
        public string? Note { get; set; }
        public string? MerchantName { get; set; }
        public string? Source { get; set; }
        public string? ExternalTransactionId { get; set; }
        public string? ExternalAccountId { get; set; }
        public bool Pending { get; set; }
        public DateTime? AuthorizedAtUtc { get; set; }
        public DateTime? PostedAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public bool IsSystemGenerated { get; set; }
    }
}
