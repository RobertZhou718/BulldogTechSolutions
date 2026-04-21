using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class SyncPlaidTransactionsFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidSyncService _plaidSyncService;

        public SyncPlaidTransactionsFunction(IPlaidSyncService plaidSyncService)
        {
            _plaidSyncService = plaidSyncService;
        }

        [Function("SyncPlaidTransactions")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/sync-transactions")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            string? itemId = null;
            using (var reader = new StreamReader(req.Body))
            {
                var body = await reader.ReadToEndAsync();
                if (!string.IsNullOrWhiteSpace(body))
                {
                    using var document = JsonDocument.Parse(body);
                    if (document.RootElement.TryGetProperty("itemId", out var itemIdElement))
                    {
                        itemId = itemIdElement.GetString();
                    }
                }
            }

            PlaidSyncSummary summary;
            if (string.IsNullOrWhiteSpace(itemId))
            {
                summary = await _plaidSyncService.SyncTransactionsForAllItemsAsync(userId);
                var items = await _plaidSyncService.GetActiveItemsAsync(userId);
                foreach (var item in items)
                {
                    await _plaidSyncService.RefreshBalancesAsync(userId, item.RowKey);
                }
            }
            else
            {
                summary = await _plaidSyncService.SyncTransactionsAsync(userId, itemId);
                await _plaidSyncService.RefreshBalancesAsync(userId, itemId);
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(summary, JsonOptions));
            return response;
        }
    }
}
