using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Investments;

namespace BulldogFinance.Functions.Services.Investments
{
    public interface IInvestmentOverviewService
    {
        Task<InvestmentOverviewDto> GetOverviewAsync(
            string userId,
            CancellationToken cancellationToken = default);
    }
}
