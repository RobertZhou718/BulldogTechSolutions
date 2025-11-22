using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class UpsertInvestmentFunction
    {
        private readonly IInvestmentService _investmentService;
        private readonly ILogger<UpsertInvestmentFunction> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public UpsertInvestmentFunction(
            IInvestmentService investmentService,
            ILogger<UpsertInvestmentFunction> logger)
        {
            _investmentService = investmentService;
            _logger = logger;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
        }

        [Function("UpsertInvestment")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "investments")]
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

            UpsertInvestmentRequest? payload;
            try
            {
                payload = await JsonSerializer.DeserializeAsync<UpsertInvestmentRequest>(
                    req.Body,
                    _jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize UpsertInvestmentRequest");
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Invalid JSON payload.");
                return bad;
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.Symbol))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Symbol is required.");
                return bad;
            }

            if (payload.Quantity < 0 || payload.AvgCost < 0)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Quantity and AvgCost must be >= 0.");
                return bad;
            }

            _logger.LogInformation("UpsertInvestment for user {UserId}, symbol {Symbol}",
                userId, payload.Symbol);

            try
            {
                var dto = await _investmentService.UpsertInvestmentAsync(userId, payload);

                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(dto);
                return resp;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpsertInvestment");
                var error = req.CreateResponse(HttpStatusCode.InternalServerError);
                await error.WriteStringAsync("Failed to save investment.");
                return error;
            }
        }
    }
}
