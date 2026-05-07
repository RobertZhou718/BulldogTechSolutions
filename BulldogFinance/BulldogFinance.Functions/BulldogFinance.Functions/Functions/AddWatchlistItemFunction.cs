using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Watchlist;
using BulldogFinance.Functions.Services.Investments;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class AddWatchlistItemFunction
    {
        private readonly IInvestmentService _investmentService;

        public AddWatchlistItemFunction(IInvestmentService investmentService)
        {
            _investmentService = investmentService;
        }

        [Function("AddWatchlistItem")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "investments/watchlist")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var body = await req.ReadJsonBodyAsync<AddWatchlistRequest>();
            if (body.IsMissingOrInvalid || body.Value is null)
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON payload.");

            var payload = body.Value;
            if (string.IsNullOrWhiteSpace(payload.Symbol))
                return await ApiResponse.BadRequestAsync(req, "Symbol is required.");

            await _investmentService.AddToWatchlistAsync(userId, payload.Symbol, payload.Exchange);

            return ApiResponse.NoContent(req);
        }
    }
}
