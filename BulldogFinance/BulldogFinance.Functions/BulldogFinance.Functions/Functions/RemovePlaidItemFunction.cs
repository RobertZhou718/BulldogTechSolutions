using System.Net;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class RemovePlaidItemFunction
    {
        private readonly IPlaidSyncService _plaidSyncService;

        public RemovePlaidItemFunction(IPlaidSyncService plaidSyncService)
        {
            _plaidSyncService = plaidSyncService;
        }

        [Function("RemovePlaidItem")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "plaid/item/{itemId}")]
            HttpRequestData req,
            string itemId,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            await _plaidSyncService.RemoveItemAsync(userId, itemId);

            var response = req.CreateResponse(HttpStatusCode.NoContent);
            return response;
        }
    }
}
