using System;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models
{
    public class InvestmentEntity : ITableEntity
    {
        // ITableEntity
        public string PartitionKey { get; set; } = default!;  // userId
        public string RowKey { get; set; } = default!;        // symbol (e.g. "AAPL")
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        // 业务字段
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";
        public double Quantity { get; set; }
        public double AvgCost { get; set; }
        public string Currency { get; set; } = "USD";
        public string? Tags { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAtUtc { get; set; }
        public DateTimeOffset UpdatedAtUtc { get; set; }

        public static InvestmentEntity Create(string userId, string symbol)
        {
            var now = DateTimeOffset.UtcNow;
            return new InvestmentEntity
            {
                PartitionKey = userId,
                RowKey = symbol,
                Symbol = symbol,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
        }
    }
}
