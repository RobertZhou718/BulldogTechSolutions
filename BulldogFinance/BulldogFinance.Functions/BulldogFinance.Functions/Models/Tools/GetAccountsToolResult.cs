using System.Collections.Generic;
using BulldogFinance.Functions.Models.Accounts;

namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class GetAccountsToolResult
    {
        public int TotalCount { get; set; }

        public bool IncludeArchived { get; set; }

        public string? AccountType { get; set; }

        public List<AccountDto> Accounts { get; set; } = new();
    }
}