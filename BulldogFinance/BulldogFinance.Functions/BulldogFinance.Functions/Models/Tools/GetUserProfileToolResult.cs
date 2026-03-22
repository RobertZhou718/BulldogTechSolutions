using System;

namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class GetUserProfileToolResult
    {
        public bool Exists { get; set; }

        public string? UserId { get; set; }

        public string? ProfileId { get; set; }

        public string? DisplayName { get; set; }

        public string? Email { get; set; }

        public string? DefaultCurrency { get; set; }

        public bool OnboardingDone { get; set; }

        public DateTime? CreatedAtUtc { get; set; }

        public DateTime? UpdatedAtUtc { get; set; }
    }
}