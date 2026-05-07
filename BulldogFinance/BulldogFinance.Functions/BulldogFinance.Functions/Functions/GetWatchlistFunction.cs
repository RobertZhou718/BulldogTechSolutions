using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Investments;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class GetWatchlistFunction
    {
        private readonly IInvestmentOverviewService _overviewService;
        private readonly ILogger<GetWatchlistFunction> _logger;

        public GetWatchlistFunction(
            IInvestmentOverviewService overviewService,
            ILogger<GetWatchlistFunction> logger)
        {
            _overviewService = overviewService;
            _logger = logger;
        }

        [Function("GetWatchlist")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "investments/watchlist")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            _logger.LogInformation("GetWatchlist for user {UserId}", userId);

            var items = await _overviewService.GetWatchlistOverviewAsync(userId);
            return await ApiResponse.OkAsync(req, items);
        }
    }
}
