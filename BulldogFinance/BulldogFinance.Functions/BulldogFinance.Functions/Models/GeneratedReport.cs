using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models
{
    public sealed class GeneratedReport
    {
        public string UserId { get; init; } = default!;
        public ReportPeriod Period { get; init; }
        public DateTime StartUtc { get; init; }
        public DateTime EndUtc { get; init; }

        public string Markdown { get; init; } = default!;
        public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;

        public string ModelDeployment { get; init; } = default!;
        public int InputTokens { get; init; }
        public int OutputTokens { get; init; }
        public int TotalTokens { get; init; }
    }
}
