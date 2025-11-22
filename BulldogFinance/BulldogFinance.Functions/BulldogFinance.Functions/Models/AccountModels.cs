namespace BulldogFinance.Functions.Models
{
    public class AccountDto
    {
        public string AccountId { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string Currency { get; set; } = default!;
        public decimal CurrentBalance { get; set; }
        public bool IsArchived { get; set; }
    }
}
