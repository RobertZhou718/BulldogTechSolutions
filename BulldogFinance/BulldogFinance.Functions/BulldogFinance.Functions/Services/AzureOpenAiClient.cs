using Azure;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;

namespace BulldogFinance.Functions.Services;

public sealed class AzureOpenAiClient : IAiClient
{
    private readonly ILogger<AzureOpenAiClient> _logger;
    private readonly ChatClient _chatClient;
    private readonly string _deployment;

    public AzureOpenAiClient(ILogger<AzureOpenAiClient> logger, IConfiguration config)
    {
        _logger = logger;

        var endpoint = config["AzureOpenAI:Endpoint"];
        var apiKey = config["AzureOpenAI:Key"];
        _deployment = config["AzureOpenAI:Deployment"] ?? "";

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(_deployment))
            throw new InvalidOperationException("Missing AzureOpenAI:Endpoint/Key/Deployment configuration.");

        AzureOpenAIClient aoai = new(new Uri(endpoint), new AzureKeyCredential(apiKey));
        _chatClient = aoai.GetChatClient(_deployment);
    }

    public async Task<AiResult> GenerateAsync(string systemPrompt, string userPrompt, int maxOutputTokens, float temperature = 0.2f, CancellationToken ct = default)
    {
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(userPrompt)
        };

        ChatCompletion completion = await _chatClient.CompleteChatAsync(
            messages,
            new ChatCompletionOptions
            {
                Temperature = temperature,
                MaxOutputTokenCount = maxOutputTokens
            },
            ct);

        var text = completion.Content.Count > 0 ? completion.Content[0].Text : "(no content)";
        var usage = completion.Usage;

        var inTok = usage?.InputTokenCount ?? 0;
        var outTok = usage?.OutputTokenCount ?? 0;
        var totalTok = usage?.TotalTokenCount ?? 0;

        _logger.LogInformation("AOAI usage: in={InTok}, out={OutTok}, total={TotalTok}", inTok, outTok, totalTok);

        return new AiResult(text, inTok, outTok, totalTok);
    }
}
