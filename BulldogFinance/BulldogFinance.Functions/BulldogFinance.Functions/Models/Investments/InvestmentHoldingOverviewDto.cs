namespace BulldogFinance.Functions.Models.Investments
{
    public class InvestmentHoldingOverviewDto
    {
        public string HoldingId { get; set; } = default!;
        public string Source { get; set; } = "Manual";
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";
        public string? SecurityId { get; set; }
        public string? SecurityName { get; set; }
        public string? AccountId { get; set; }
        public string? AccountName { get; set; }
        public string? InstitutionName { get; set; }
        public string? MarketIdentifierCode { get; set; }
        public bool IsCashEquivalent { get; set; }
        public bool CanDelete { get; set; } = true;

        public double Quantity { get; set; }
        public double AvgCost { get; set; }
        public double CostBasis { get; set; }
        public string Currency { get; set; } = "USD";

        public double CurrentPrice { get; set; }
        public double ChangePercent { get; set; }
        public DateTime? PriceAsOfUtc { get; set; }

        public double MarketValue { get; set; }
        public double UnrealizedPnL { get; set; }
        public double UnrealizedPnLPercent { get; set; }

        public List<InvestmentNewsItemDto> News { get; set; } = new();
    }
}
