using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Chat;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace BulldogFinance.Functions.Functions
{
    public sealed class GetChatConversationsFunction
    {
        private readonly IConversationService _conversationService;

        public GetChatConversationsFunction(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        [Function("GetChatConversations")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "chat/conversations")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(
                await _conversationService.ListConversationsAsync(userId, cancellationToken),
                cancellationToken);

            return response;
        }
    }
}
