using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
{
    public interface IInvestmentOverviewService
    {
        Task<InvestmentOverviewDto> GetOverviewAsync(
            string userId,
            CancellationToken cancellationToken = default);
    }
}
