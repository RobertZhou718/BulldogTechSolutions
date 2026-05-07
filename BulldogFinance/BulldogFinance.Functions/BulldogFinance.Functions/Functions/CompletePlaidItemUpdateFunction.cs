using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class CompletePlaidItemUpdateFunction
    {
        private const string QueueName = "plaid-daily-sync-items";
        private const string QueueConnectionName = "QueueStorage";

        private readonly IPlaidRepository _plaidRepository;

        public CompletePlaidItemUpdateFunction(IPlaidRepository plaidRepository)
        {
            _plaidRepository = plaidRepository;
        }

        [Function("CompletePlaidItemUpdate")]
        public async Task<CompletePlaidItemUpdateOutput> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/items/{itemId}/update-complete")]
            HttpRequestData req,
            string itemId)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return Output(await ApiResponse.UnauthorizedAsync(req));

            if (string.IsNullOrWhiteSpace(itemId))
                return Output(await ApiResponse.BadRequestAsync(req, "itemId is required."));

            var item = await _plaidRepository.GetItemAsync(userId, itemId);
            if (item == null)
                return Output(await ApiResponse.NotFoundAsync(req, "Plaid item not found."));

            var queuedAt = DateTime.UtcNow;
            PlaidItemSyncState.MarkRepairQueued(item, queuedAt);
            await _plaidRepository.UpsertItemAsync(item);

            var queueMessage = JsonSerializer.Serialize(new PlaidDailySyncQueueMessage
            {
                UserId = userId,
                ItemId = itemId,
                EnqueuedAtUtc = queuedAt
            }, JsonDefaults.Api);

            var response = await ApiResponse.OkAsync(req, new
            {
                success = true,
                itemId,
                backgroundSyncQueued = true
            });

            return Output(response, queueMessage);
        }

        private static CompletePlaidItemUpdateOutput Output(HttpResponseData response, params string[] queueMessages)
        {
            return new CompletePlaidItemUpdateOutput
            {
                HttpResponse = response,
                QueueMessages = queueMessages
            };
        }

        public sealed class CompletePlaidItemUpdateOutput
        {
            [HttpResult]
            public HttpResponseData HttpResponse { get; set; } = default!;

            [QueueOutput(QueueName, Connection = QueueConnectionName)]
            public string[] QueueMessages { get; set; } = Array.Empty<string>();
        }
    }
}
