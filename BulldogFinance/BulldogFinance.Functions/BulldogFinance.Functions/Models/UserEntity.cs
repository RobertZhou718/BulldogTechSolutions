using System;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models
{
    public class UserEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string? DisplayName { get; set; }
        public string? Email { get; set; }
        public string? DefaultCurrency { get; set; }
        public bool OnboardingDone { get; set; }

        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
