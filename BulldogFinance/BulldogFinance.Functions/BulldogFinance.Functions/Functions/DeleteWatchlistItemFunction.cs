using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Investments;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class DeleteWatchlistItemFunction
    {
        private readonly IInvestmentService _investmentService;
        private readonly ILogger<DeleteWatchlistItemFunction> _logger;

        public DeleteWatchlistItemFunction(
            IInvestmentService investmentService,
            ILogger<DeleteWatchlistItemFunction> logger)
        {
            _investmentService = investmentService;
            _logger = logger;
        }

        [Function("DeleteWatchlistItem")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "investments/watchlist/{symbol}")]
            HttpRequestData req,
            string symbol)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            _logger.LogInformation("DeleteWatchlistItem for user {UserId}, symbol {Symbol}", userId, symbol);

            await _investmentService.RemoveFromWatchlistAsync(userId, symbol);
            return ApiResponse.NoContent(req);
        }
    }
}
