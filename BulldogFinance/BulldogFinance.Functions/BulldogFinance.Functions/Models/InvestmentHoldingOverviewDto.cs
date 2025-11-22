// Models/InvestmentHoldingOverviewDto.cs
using System;
using System.Collections.Generic;

namespace BulldogFinance.Functions.Models
{
    public class InvestmentHoldingOverviewDto
    {
        public string Symbol { get; set; } = default!;
        public string Exchange { get; set; } = "US";

        public double Quantity { get; set; }
        public double AvgCost { get; set; }
        public string Currency { get; set; } = "USD";

        public double CurrentPrice { get; set; }
        public double ChangePercent { get; set; }

        public double MarketValue { get; set; }
        public double UnrealizedPnL { get; set; }
        public double UnrealizedPnLPercent { get; set; }

        public List<InvestmentNewsItemDto> News { get; set; } = new();
    }
}
