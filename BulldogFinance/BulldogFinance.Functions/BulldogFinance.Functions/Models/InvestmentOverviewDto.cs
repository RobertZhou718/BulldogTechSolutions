// Models/InvestmentOverviewDto.cs
using System.Collections.Generic;

namespace BulldogFinance.Functions.Models
{
    public class InvestmentOverviewDto
    {
        public List<InvestmentHoldingOverviewDto> Holdings { get; set; } = new();
        public List<SymbolOverviewDto> Popular { get; set; } = new();
    }
}
