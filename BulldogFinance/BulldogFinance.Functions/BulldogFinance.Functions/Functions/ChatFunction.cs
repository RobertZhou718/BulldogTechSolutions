using System.Net;
using System.Text.Json;
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
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "chat")] HttpRequestData req,
            CancellationToken cancellationToken)
        {
            try
            {
                var request = await req.ReadFromJsonAsync<ChatRequest>(cancellationToken: cancellationToken);

                if (request is null || string.IsNullOrWhiteSpace(request.Message))
                {
                    var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badRequest.WriteAsJsonAsync(new
                    {
                        error = "Request body must contain a non-empty message."
                    }, cancellationToken);

                    return badRequest;
                }

                var userId = ResolveUserId(req, request);

                if (string.IsNullOrWhiteSpace(userId))
                {
                    var unauthorized = req.CreateResponse(HttpStatusCode.BadRequest);
                    await unauthorized.WriteAsJsonAsync(new
                    {
                        error = "User id is required."
                    }, cancellationToken);

                    return unauthorized;
                }

                var response = await _chatAgentService.ChatAsync(
                    userId,
                    request,
                    cancellationToken);

                var ok = req.CreateResponse(HttpStatusCode.OK);
                await ok.WriteAsJsonAsync(response, cancellationToken);

                return ok;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Chat request failed.");

                var error = req.CreateResponse(HttpStatusCode.InternalServerError);
                await error.WriteAsJsonAsync(new
                {
                    error = "An unexpected error occurred while processing the chat request."
                }, cancellationToken);

                return error;
            }
        }

        private static string? ResolveUserId(HttpRequestData req, ChatRequest request)
        {
            if (req.Headers.TryGetValues("x-user-id", out var headerValues))
            {
                var headerUserId = headerValues.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(headerUserId))
                {
                    return headerUserId;
                }
            }

            return request.UserId;
        }
    }
}