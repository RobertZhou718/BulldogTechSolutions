using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions;

public sealed class ChatFunction
{
    private readonly IMcpChatService _mcpChatService;
    private readonly ILogger<ChatFunction> _logger;

    public ChatFunction(IMcpChatService mcpChatService, ILogger<ChatFunction> logger)
    {
        _mcpChatService = mcpChatService;
        _logger = logger;
    }

    [Function("Chat")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")]
        HttpRequestData req,
        FunctionContext ctx)
    {
        var userId = AuthHelper.GetUserId(req);
        if (string.IsNullOrWhiteSpace(userId))
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteStringAsync("Unauthorized.");
            return unauthorized;
        }

        ChatRequest? body;
        try
        {
            body = await req.ReadFromJsonAsync<ChatRequest>();
        }
        catch
        {
            body = null;
        }

        if (body is null || string.IsNullOrWhiteSpace(body.Message))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Invalid body. Expected JSON: { \"message\": \"...\" }");
            return bad;
        }

        _logger.LogInformation("Chat request received. userId={UserId}", userId);

        try
        {
            var mcpJson = await _mcpChatService.ChatAsync(userId, body, ctx.CancellationToken);

            var ok = req.CreateResponse(HttpStatusCode.OK);
            ok.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await ok.WriteStringAsync(mcpJson);
            return ok;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Chat MCP call failed. userId={UserId}", userId);

            var fail = req.CreateResponse(HttpStatusCode.BadGateway);
            fail.Headers.Add("Content-Type", "application/json; charset=utf-8");

            await fail.WriteStringAsync(JsonSerializer.Serialize(new
            {
                error = "Upstream MCP service error",
                detail = ex.Message
            }));
            return fail;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat failed. userId={UserId}", userId);

            var fail = req.CreateResponse(HttpStatusCode.InternalServerError);
            fail.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await fail.WriteStringAsync(JsonSerializer.Serialize(new { error = "Chat failed" }));
            return fail;
        }
    }
}