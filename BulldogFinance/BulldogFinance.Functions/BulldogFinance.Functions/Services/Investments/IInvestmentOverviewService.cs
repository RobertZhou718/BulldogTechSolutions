using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Watchlist;

namespace BulldogFinance.Functions.Services.Investments
{
    public interface IInvestmentOverviewService
    {
        Task<InvestmentOverviewDto> GetOverviewAsync(
            string userId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<WatchlistItemDto>> GetWatchlistOverviewAsync(
            string userId,
            CancellationToken cancellationToken = default);
    }
}
