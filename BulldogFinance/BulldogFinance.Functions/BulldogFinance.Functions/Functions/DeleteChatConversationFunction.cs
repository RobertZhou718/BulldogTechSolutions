using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Chat;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace BulldogFinance.Functions.Functions
{
    public sealed class DeleteChatConversationFunction
    {
        private readonly IConversationService _conversationService;

        public DeleteChatConversationFunction(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        [Function("DeleteChatConversation")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "chat/conversations/{conversationId}")] HttpRequestData req,
            string conversationId,
            CancellationToken cancellationToken)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req, cancellationToken);

            var deleted = await _conversationService.DeleteConversationAsync(
                userId,
                conversationId,
                cancellationToken);

            if (!deleted)
                return await ApiResponse.NotFoundAsync(req, "Conversation not found.", cancellationToken);

            return req.CreateResponse(HttpStatusCode.NoContent);
        }
    }
}
