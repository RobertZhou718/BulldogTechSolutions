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
    public class AddWatchlistItemFunction
    {
        private readonly IInvestmentService _investmentService;
        private readonly ILogger<AddWatchlistItemFunction> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public AddWatchlistItemFunction(
            IInvestmentService investmentService,
            ILogger<AddWatchlistItemFunction> logger)
        {
            _investmentService = investmentService;
            _logger = logger;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
        }

        [Function("AddWatchlistItem")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "investments/watchlist")]
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

            AddWatchlistRequest? payload;
            try
            {
                payload = await JsonSerializer.DeserializeAsync<AddWatchlistRequest>(
                    req.Body,
                    _jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize AddWatchlistRequest");
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

            await _investmentService.AddToWatchlistAsync(
                userId,
                payload.Symbol,
                payload.Exchange);

            var resp = req.CreateResponse(HttpStatusCode.NoContent);
            return resp;
        }
    }
}
