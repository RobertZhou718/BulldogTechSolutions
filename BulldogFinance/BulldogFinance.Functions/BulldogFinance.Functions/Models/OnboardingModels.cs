using System.Collections.Generic;

namespace BulldogFinance.Functions.Models
{
    public class OnboardingRequest
    {
        public string? DefaultCurrency { get; set; }
        public List<OnboardingAccountInput> Accounts { get; set; } = new();
    }

    public class OnboardingAccountInput
    {
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;      // cash / bank / credit_card ...
        public string? Currency { get; set; }
        public decimal InitialBalance { get; set; }       // 前端传小数金额
    }

    public class OnboardingAccountResponse
    {
        public string AccountId { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string Currency { get; set; } = default!;
        public decimal CurrentBalance { get; set; }
    }

    public class OnboardingResponse
    {
        public bool Success { get; set; }
        public string? DefaultCurrency { get; set; }
        public List<OnboardingAccountResponse> Accounts { get; set; } = new();
    }
}
