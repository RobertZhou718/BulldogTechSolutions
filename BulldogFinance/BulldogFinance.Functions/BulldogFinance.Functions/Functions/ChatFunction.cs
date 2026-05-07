using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Chat;
using BulldogFinance.Functions.Services.Chat;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public sealed class ChatFunction
    {
        private readonly IChatAgentService _chatAgentService;
        private readonly ILogger<ChatFunction> _logger;

        public ChatFunction(
            IChatAgentService chatAgentService,
            ILogger<ChatFunction> logger)
        {
            _chatAgentService = chatAgentService;
            _logger = logger;
        }

        [Function("Chat")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            try
            {
                var userId = AuthHelper.GetUserId(req);
                if (string.IsNullOrWhiteSpace(userId))
                    return await ApiResponse.UnauthorizedAsync(req, cancellationToken);

                var body = await req.ReadJsonBodyAsync<ChatRequest>(cancellationToken);
                if (body.Value is null || string.IsNullOrWhiteSpace(body.Value.Message))
                    return await ApiResponse.BadRequestAsync(req, "Request body must contain a non-empty message.", cancellationToken);

                var response = await _chatAgentService.ChatAsync(userId, body.Value, cancellationToken);
                return await ApiResponse.OkAsync(req, response, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Chat request failed.");
                return await ApiResponse.InternalErrorAsync(req, "An unexpected error occurred while processing the chat request.", cancellationToken);
            }
        }
    }
}
