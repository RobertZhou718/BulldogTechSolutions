namespace BulldogFinance.Functions.Models
{
    public class AddWatchlistRequest
    {
        public string Symbol { get; set; } = default!;
        public string? Exchange { get; set; }
    }
}
