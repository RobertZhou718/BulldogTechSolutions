namespace BulldogFinance.Functions.Models.Investments
{
    public class InvestmentOverviewDto
    {
        public List<InvestmentHoldingOverviewDto> Holdings { get; set; } = new();
        public List<SymbolOverviewDto> Popular { get; set; } = new();
    }
}
