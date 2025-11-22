using System;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models
{
    public class AccountEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;   // bank / cash / credit_card / investment...
        public string Currency { get; set; } = "CAD";

        public long CurrentBalanceCents { get; set; }

        public bool IsArchived { get; set; }
        public int SortOrder { get; set; }

        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
