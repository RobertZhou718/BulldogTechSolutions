using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BulldogFinance.Functions.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services;

public sealed class McpChatService : IMcpChatService
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<McpChatService> _logger;

    public McpChatService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<McpChatService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<string> ChatAsync(string userId, ChatRequest request, CancellationToken ct = default)
    {
        var mcpBaseUrl = _config["Mcp:BaseUrl"] ?? _config["MCP_SERVER_URL"];
        var secret = _config["Mcp:S2SSecret"] ?? _config["BDF_S2S_SECRET"];

        if (string.IsNullOrWhiteSpace(mcpBaseUrl))
            throw new InvalidOperationException("Missing MCP base URL. Set Mcp:BaseUrl or MCP_SERVER_URL.");

        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Missing S2S secret. Set Mcp:S2SSecret or BDF_S2S_SECRET.");

        // 统一 payload：包含 userId（后面 tool 调用会用到）
        var payload = new McpChatRequest
        {
            UserId = userId,
            Message = request.Message ?? string.Empty,
            ConversationId = request.ConversationId
        };

        // 关键：签名用的 body 必须和发送给 MCP 的 body 完全一致
        var bodyJson = JsonSerializer.Serialize(payload, JsonOpts);

        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var sig = HmacSha256Hex(secret, $"{ts}.{bodyJson}");

        var url = $"{mcpBaseUrl.TrimEnd('/')}/chat";

        var client = _httpClientFactory.CreateClient("McpServer");

        using var httpReq = new HttpRequestMessage(HttpMethod.Post, url);
        httpReq.Headers.Add("X-BDF-Timestamp", ts);
        httpReq.Headers.Add("X-BDF-Signature", sig);
        httpReq.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");

        _logger.LogInformation("Calling MCP /chat for userId={UserId}", userId);

        using var resp = await client.SendAsync(httpReq, ct);
        var respText = await resp.Content.ReadAsStringAsync(ct);

        // MCP 返回错误时，把原始错误带回去（方便你排查）
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("MCP call failed. Status={Status} Body={Body}", (int)resp.StatusCode, respText);
            // 让 Function 决定如何返回给前端；这里抛异常也行
            throw new HttpRequestException($"MCP call failed: {(int)resp.StatusCode} {resp.ReasonPhrase}. Body={respText}");
        }

        return respText; // MCP 返回的是 JSON（例如 { reply: "..." }），Function 可原样透传
    }

    private static string HmacSha256Hex(string secret, string message)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}