using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models;

namespace BulldogFinance.Functions.Services
{
    public interface IInvestmentService
    {
        // 持仓
        Task<IReadOnlyList<InvestmentDto>> GetInvestmentsForUserAsync(
            string userId,
            CancellationToken cancellationToken = default);

        Task<InvestmentDto> UpsertInvestmentAsync(
            string userId,
            UpsertInvestmentRequest request,
            CancellationToken cancellationToken = default);

        Task DeleteInvestmentAsync(
            string userId,
            string symbol,
            CancellationToken cancellationToken = default);

        // 自选股 Watchlist
        Task<IReadOnlyList<WatchlistItemDto>> GetWatchlistAsync(
            string userId,
            CancellationToken cancellationToken = default);

        Task AddToWatchlistAsync(
            string userId,
            string symbol,
            string? exchange = null,
            CancellationToken cancellationToken = default);

        Task RemoveFromWatchlistAsync(
            string userId,
            string symbol,
            CancellationToken cancellationToken = default);
    }
}
