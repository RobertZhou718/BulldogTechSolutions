namespace BulldogFinance.Functions.Models
{
    public class UpsertInvestmentRequest
    {
        public string Symbol { get; set; } = default!;
        public string? Exchange { get; set; }
        public double Quantity { get; set; }
        public double AvgCost { get; set; }
        public string? Currency { get; set; }
        public string[]? Tags { get; set; }
        public string? Notes { get; set; }
    }
}
