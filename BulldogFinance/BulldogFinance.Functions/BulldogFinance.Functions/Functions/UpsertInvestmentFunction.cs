using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Services.Investments;
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
                return await ApiResponse.UnauthorizedAsync(req);

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
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON payload.");
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.Symbol))
                return await ApiResponse.BadRequestAsync(req, "Symbol is required.");

            if (payload.Quantity < 0 || payload.AvgCost < 0)
                return await ApiResponse.BadRequestAsync(req, "Quantity and AvgCost must be >= 0.");

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
                return await ApiResponse.InternalErrorAsync(req, "Failed to save investment.");
            }
        }
    }
}
