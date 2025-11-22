using System.Net;
using System.Threading.Tasks;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class DeleteInvestmentFunction
    {
        private readonly IInvestmentService _investmentService;
        private readonly ILogger<DeleteInvestmentFunction> _logger;

        public DeleteInvestmentFunction(
            IInvestmentService investmentService,
            ILogger<DeleteInvestmentFunction> logger)
        {
            _investmentService = investmentService;
            _logger = logger;
        }

        [Function("DeleteInvestment")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "investments/{symbol}")]
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

            _logger.LogInformation("DeleteInvestment for user {UserId}, symbol {Symbol}",
                userId, symbol);

            await _investmentService.DeleteInvestmentAsync(userId, symbol);

            var resp = req.CreateResponse(HttpStatusCode.NoContent);
            return resp;
        }
    }
}
