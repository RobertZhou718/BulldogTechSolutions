// Models/InvestmentNewsItemDto.cs
using System;

namespace BulldogFinance.Functions.Models
{
    public class InvestmentNewsItemDto
    {
        public string Id { get; set; } = default!;
        public string Headline { get; set; } = default!;
        public string Source { get; set; } = default!;
        public DateTimeOffset Datetime { get; set; }
        public string Url { get; set; } = default!;
    }
}
