// Models/SymbolOverviewDto.cs
using System.Collections.Generic;

namespace BulldogFinance.Functions.Models
{
    public class SymbolOverviewDto
    {
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";

        public double CurrentPrice { get; set; }
        public double ChangePercent { get; set; }

        public List<InvestmentNewsItemDto> News { get; set; } = new();
    }
}
