using System.Net;
using System.Threading.Tasks;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services;
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
            string symbol,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            _logger.LogInformation("DeleteWatchlistItem for user {UserId}, symbol {Symbol}",
                userId, symbol);

            await _investmentService.RemoveFromWatchlistAsync(userId, symbol);

            var resp = req.CreateResponse(HttpStatusCode.NoContent);
            return resp;
        }
    }
}
