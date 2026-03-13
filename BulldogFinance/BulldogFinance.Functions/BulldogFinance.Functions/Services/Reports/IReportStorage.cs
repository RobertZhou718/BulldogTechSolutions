using BulldogFinance.Functions.Models.Reports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Reports
{
    public interface IReportStorage
    {
        Task SaveLatestAsync(GeneratedReport report, CancellationToken ct = default);
    }
}
