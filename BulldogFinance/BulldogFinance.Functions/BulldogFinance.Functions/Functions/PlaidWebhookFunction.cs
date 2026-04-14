using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class PlaidWebhookFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;

        public PlaidWebhookFunction(IPlaidRepository plaidRepository, IPlaidSyncService plaidSyncService)
        {
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
        }

        [Function("PlaidWebhook")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/webhook")]
            HttpRequestData req,
            FunctionContext context)
        {
            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (!string.IsNullOrWhiteSpace(body))
            {
                var payload = JsonSerializer.Deserialize<PlaidWebhookRequest>(body, JsonOptions);
                if (payload?.WebhookType == "TRANSACTIONS" &&
                    payload.WebhookCode == "SYNC_UPDATES_AVAILABLE" &&
                    !string.IsNullOrWhiteSpace(payload.ItemId))
                {
                    var item = await _plaidRepository.GetItemByItemIdAsync(payload.ItemId);
                    if (item != null)
                    {
                        await _plaidSyncService.SyncTransactionsAsync(item.PartitionKey, item.RowKey);
                    }
                }
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteStringAsync("{\"ok\":true}");
            return response;
        }
    }
}
