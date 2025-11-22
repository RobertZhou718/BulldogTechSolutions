using System;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models
{
    public class TransactionEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string AccountId { get; set; } = default!;  // 对应 Accounts.RowKey
        public string Type { get; set; } = default!;       // INCOME / EXPENSE / INIT

        public long AmountCents { get; set; }
        public string Currency { get; set; } = "CAD";

        public string? Category { get; set; }
        public string? Note { get; set; }

        public DateTime? OccurredAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }

        public bool IsDeleted { get; set; }
        public bool IsSystemGenerated { get; set; }
    }
}
