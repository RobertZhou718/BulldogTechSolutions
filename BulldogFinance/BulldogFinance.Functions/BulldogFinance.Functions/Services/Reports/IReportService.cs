using BulldogFinance.Functions.Models.Reports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Reports
{
    public interface IReportService
    {
        Task<GeneratedReport> GenerateAsync(
            string userId,
            ReportPeriod period,
            DateTime startUtc,
            DateTime endUtc,
            CancellationToken ct = default);
    }
}
