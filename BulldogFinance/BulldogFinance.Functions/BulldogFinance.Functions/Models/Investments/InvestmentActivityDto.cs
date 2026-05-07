namespace BulldogFinance.Functions.Models.Investments
{
    public class InvestmentActivityDto
    {
        public string TransactionId { get; set; } = default!;
        public DateTime DateUtc { get; set; }
        public string Type { get; set; } = default!;
        public string Subtype { get; set; } = default!;
        public string? Name { get; set; }
        public string? Symbol { get; set; }
        public string? SecurityName { get; set; }
        public string? AccountName { get; set; }
        public string? InstitutionName { get; set; }
        public double Quantity { get; set; }
        public double Amount { get; set; }
        public double Price { get; set; }
        public double? Fees { get; set; }
        public string Currency { get; set; } = "USD";
    }
}
