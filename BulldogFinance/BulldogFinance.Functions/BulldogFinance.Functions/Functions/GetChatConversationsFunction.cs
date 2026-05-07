using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Services.Chat;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

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
                return await ApiResponse.UnauthorizedAsync(req, cancellationToken);

            var conversations = await _conversationService.ListConversationsAsync(userId, cancellationToken);
            return await ApiResponse.OkAsync(req, conversations, cancellationToken);
        }
    }
}
