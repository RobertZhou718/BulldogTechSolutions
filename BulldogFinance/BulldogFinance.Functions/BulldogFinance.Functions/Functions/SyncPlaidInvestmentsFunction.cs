using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class SyncPlaidInvestmentsFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidInvestmentSyncService _plaidInvestmentSyncService;

        public SyncPlaidInvestmentsFunction(IPlaidInvestmentSyncService plaidInvestmentSyncService)
        {
            _plaidInvestmentSyncService = plaidInvestmentSyncService;
        }

        [Function("SyncPlaidInvestments")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/sync-investments")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var request = await ReadRequestAsync(req);
            var endUtc = request.EndUtc ?? DateTime.UtcNow.Date;
            var startUtc = request.StartUtc ?? endUtc.AddDays(-30);

            PlaidInvestmentSyncSummary summary;
            if (string.IsNullOrWhiteSpace(request.ItemId))
            {
                summary = await _plaidInvestmentSyncService.SyncInvestmentsForAllItemsAsync(
                    userId,
                    startUtc,
                    endUtc);
            }
            else
            {
                summary = await _plaidInvestmentSyncService.SyncInvestmentsAsync(
                    userId,
                    request.ItemId.Trim(),
                    startUtc,
                    endUtc);
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(summary, JsonOptions));
            return response;
        }

        private static async Task<SyncPlaidInvestmentsRequest> ReadRequestAsync(HttpRequestData req)
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync();
            if (string.IsNullOrWhiteSpace(body))
            {
                return new SyncPlaidInvestmentsRequest();
            }

            return JsonSerializer.Deserialize<SyncPlaidInvestmentsRequest>(body, JsonOptions)
                ?? new SyncPlaidInvestmentsRequest();
        }

        private sealed class SyncPlaidInvestmentsRequest
        {
            public string? ItemId { get; set; }
            public DateTime? StartUtc { get; set; }
            public DateTime? EndUtc { get; set; }
        }
    }
}
