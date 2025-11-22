using System.Net;
using System.Threading.Tasks;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class GetInvestmentsFunction
    {
        private readonly IInvestmentService _investmentService;
        private readonly ILogger<GetInvestmentsFunction> _logger;

        public GetInvestmentsFunction(
            IInvestmentService investmentService,
            ILogger<GetInvestmentsFunction> logger)
        {
            _investmentService = investmentService;
            _logger = logger;
        }

        [Function("GetInvestments")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "investments")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            _logger.LogInformation("GetInvestments for user {UserId}", userId);

            var items = await _investmentService.GetInvestmentsForUserAsync(userId);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(items);
            return resp;
        }
    }
}
