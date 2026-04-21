using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class RefreshPlaidBalancesFunction
    {
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;

        public RefreshPlaidBalancesFunction(IPlaidRepository plaidRepository, IPlaidSyncService plaidSyncService)
        {
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
        }

        [Function("RefreshPlaidBalances")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/refresh-balances")]
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

            if (!string.IsNullOrWhiteSpace(itemId))
            {
                await _plaidSyncService.RefreshBalancesAsync(userId, itemId);
            }
            else
            {
                var items = await _plaidRepository.GetItemsAsync(userId);
                foreach (var item in items)
                {
                    if (item.Status == "ACTIVE")
                    {
                        await _plaidSyncService.RefreshBalancesAsync(userId, item.RowKey);
                    }
                }
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteStringAsync("{\"success\":true}");
            return response;
        }
    }
}
