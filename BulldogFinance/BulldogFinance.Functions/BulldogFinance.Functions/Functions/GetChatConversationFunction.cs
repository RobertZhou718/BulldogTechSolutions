using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Chat;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace BulldogFinance.Functions.Functions
{
    public sealed class GetChatConversationFunction
    {
        private readonly IConversationService _conversationService;

        public GetChatConversationFunction(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        [Function("GetChatConversation")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "chat/conversations/{conversationId}")] HttpRequestData req,
            string conversationId,
            CancellationToken cancellationToken)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            var conversation = await _conversationService.GetConversationAsync(userId, conversationId, cancellationToken);
            if (conversation is null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new
                {
                    error = "Conversation not found."
                }, cancellationToken);
                return notFound;
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(conversation, cancellationToken);
            return response;
        }
    }
}
