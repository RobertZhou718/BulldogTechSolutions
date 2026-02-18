using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models
{
    public sealed class ReportSnapshot
    {
        public string UserId { get; init; } = default!;
        public ReportPeriod Period { get; init; }
        public DateTime StartUtc { get; init; }
        public DateTime EndUtc { get; init; }

        public string DefaultCurrency { get; init; } = "CAD";

        public int TransactionsCount { get; init; }
        public int ExpenseCount { get; init; }
        public int IncomeCount { get; init; }

        public long TotalIncomeCents { get; init; }
        public long TotalExpenseCents { get; init; }
        public long NetCents => TotalIncomeCents - TotalExpenseCents;

        public Dictionary<string, long> ExpenseByCategoryCents { get; init; }
            = new(StringComparer.OrdinalIgnoreCase);
    }
}
