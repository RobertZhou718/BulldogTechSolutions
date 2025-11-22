using System;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models
{
    public class WatchlistEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;  // userId
        public string RowKey { get; set; } = default!;        // symbol
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";
        public DateTimeOffset AddedAtUtc { get; set; }
        public string Source { get; set; } = "manual";

        public static WatchlistEntity Create(string userId, string symbol)
        {
            return new WatchlistEntity
            {
                PartitionKey = userId,
                RowKey = symbol,
                Symbol = symbol,
                Exchange = "US",
                AddedAtUtc = DateTimeOffset.UtcNow,
                Source = "manual"
            };
        }
    }
}
