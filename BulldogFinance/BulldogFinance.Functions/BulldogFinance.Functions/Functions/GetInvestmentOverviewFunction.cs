using System.Net;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Investments;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class GetInvestmentOverviewFunction
    {
        private readonly IInvestmentOverviewService _overviewService;
        private readonly ILogger<GetInvestmentOverviewFunction> _logger;

        public GetInvestmentOverviewFunction(
            IInvestmentOverviewService overviewService,
            ILogger<GetInvestmentOverviewFunction> logger)
        {
            _overviewService = overviewService;
            _logger = logger;
        }

        [Function("GetInvestmentOverview")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "investments/overview")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            _logger.LogInformation("GetInvestmentOverview for user {UserId}", userId);

            var overview = await _overviewService.GetOverviewAsync(userId);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(overview);
            return resp;
        }
    }
}
