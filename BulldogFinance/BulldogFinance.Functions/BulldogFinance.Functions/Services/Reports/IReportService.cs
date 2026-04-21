using BulldogFinance.Functions.Models.Reports;

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
