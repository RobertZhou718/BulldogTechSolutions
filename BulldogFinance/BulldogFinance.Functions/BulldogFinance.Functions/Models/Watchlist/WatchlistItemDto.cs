using System;

namespace BulldogFinance.Functions.Models.Watchlist
{
    public class WatchlistItemDto
    {
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";
        public DateTimeOffset AddedAtUtc { get; set; }
        public string Source { get; set; } = "manual";
        public string Currency { get; set; } = "USD";
        public double? LastPrice { get; set; }
        public double? DailyChange { get; set; }
        public double? DailyChangePercent { get; set; }
        public DateTimeOffset? QuoteAsOfUtc { get; set; }
    }
}
