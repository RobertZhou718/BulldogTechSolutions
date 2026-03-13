namespace BulldogFinance.Functions.Models.Watchlist
{
    public class AddWatchlistRequest
    {
        public string Symbol { get; set; } = default!;
        public string? Exchange { get; set; }
    }
}
