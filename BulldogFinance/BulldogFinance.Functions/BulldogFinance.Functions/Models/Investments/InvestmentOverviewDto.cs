namespace BulldogFinance.Functions.Models.Investments
{
    public class InvestmentOverviewDto
    {
        public List<InvestmentHoldingOverviewDto> Holdings { get; set; } = new();
        public List<SymbolOverviewDto> Popular { get; set; } = new();
        public List<InvestmentCurrencyTotalDto> TotalsByCurrency { get; set; } = new();
        public List<InvestmentPerformancePointDto> Performance { get; set; } = new();
    }

    public class InvestmentCurrencyTotalDto
    {
        public string Currency { get; set; } = "USD";
        public double MarketValue { get; set; }
        public double CostBasis { get; set; }
        public double UnrealizedPnL { get; set; }
        public int Positions { get; set; }
    }

    public class InvestmentPerformancePointDto
    {
        public DateTime SnapshotDateUtc { get; set; }
        public string Label { get; set; } = default!;
        public string Currency { get; set; } = "USD";
        public double MarketValue { get; set; }
        public double CostBasis { get; set; }
        public double UnrealizedPnL { get; set; }
    }
}
