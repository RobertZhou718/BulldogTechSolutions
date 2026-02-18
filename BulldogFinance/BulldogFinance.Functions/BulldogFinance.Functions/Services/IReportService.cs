using BulldogFinance.Functions.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services
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
