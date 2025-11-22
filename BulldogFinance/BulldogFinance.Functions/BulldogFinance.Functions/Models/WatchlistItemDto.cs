using System;

namespace BulldogFinance.Functions.Models
{
    public class WatchlistItemDto
    {
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";
        public DateTimeOffset AddedAtUtc { get; set; }
        public string Source { get; set; } = "manual";
    }
}
