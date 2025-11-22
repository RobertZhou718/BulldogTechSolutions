using System;

namespace BulldogFinance.Functions.Models
{
    public class InvestmentDto
    {
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";
        public double Quantity { get; set; }
        public double AvgCost { get; set; }
        public string Currency { get; set; } = "USD";
        public string[]? Tags { get; set; }
        public string? Notes { get; set; }
        public DateTimeOffset CreatedAtUtc { get; set; }
        public DateTimeOffset UpdatedAtUtc { get; set; }
    }
}
