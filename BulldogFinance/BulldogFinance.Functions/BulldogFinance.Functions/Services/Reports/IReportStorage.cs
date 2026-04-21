using BulldogFinance.Functions.Models.Reports;

namespace BulldogFinance.Functions.Services.Reports
{
    public interface IReportStorage
    {
        Task SaveLatestAsync(GeneratedReport report, CancellationToken ct = default);
    }
}
