using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using BulldogFinance.Functions.Models.Tools;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System;
using System.ClientModel;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class AzureOpenAiClient : IAiClient
    {
        private readonly ChatClient _chatClient;
        private readonly ILogger _logger;

        public AzureOpenAiClient(
            IConfiguration config,
            ILogger logger)
        {
            _logger = logger;

            var endpoint = config["AzureOpenAI:Endpoint"];
            var apiKey = config["AzureOpenAI:Key"];
            var deployment = config["AzureOpenAI:Deployment"] ?? "";

            if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(deployment))
                throw new InvalidOperationException("Missing AzureOpenAI:Endpoint/Key/Deployment configuration.");

            AzureOpenAIClient aoai = new(new Uri(endpoint), new AzureKeyCredential(apiKey));
            _chatClient = aoai.GetChatClient(deployment);
        }

        public async Task<ChatCompletion> CompleteAsync(
            IReadOnlyList<ChatMessage> messages,
            IReadOnlyCollection<ToolDefinitionDto> availableTools,
            bool allowToolCalls,
            CancellationToken ct = default)
        {
            var options = new ChatCompletionOptions();

            if (allowToolCalls)
            {
                foreach (var tool in availableTools)
                {
                    options.Tools.Add(BuildChatTool(tool));
                }
            }

            _logger.LogInformation(
                "Sending chat completion request. MessageCount={MessageCount}, ToolCount={ToolCount}, AllowToolCalls={AllowToolCalls}",
                messages.Count,
                allowToolCalls ? availableTools.Count : 0,
                allowToolCalls);

            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options, ct);
            return completion;
        }

        public async Task<AiGenerationResult> GenerateAsync(
            string systemPrompt,
            string userPrompt,
            int maxOutputTokens,
            float temperature = 0.2f,
            CancellationToken ct = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(userPrompt)
            };

            var options = new ChatCompletionOptions
            {
                Temperature = temperature,
                MaxOutputTokenCount = maxOutputTokens
            };

            _logger.LogInformation(
                "Sending report generation request. MaxOutputTokens={MaxOutputTokens}, Temperature={Temperature}",
                maxOutputTokens,
                temperature);

            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options, ct);

            var text = ExtractAssistantText(completion);

            var inputTokens = 0;
            var outputTokens = 0;
            var totalTokens = 0;

            if (completion?.Usage is not null)
            {
                inputTokens = completion.Usage.InputTokenCount;
                outputTokens = completion.Usage.OutputTokenCount;
                totalTokens = inputTokens + outputTokens;
            }

            return new AiGenerationResult
            {
                Text = text,
                InputTokens = inputTokens,
                OutputTokens = outputTokens,
                TotalTokens = totalTokens
            };
        }

        public static string ExtractAssistantText(ChatCompletion completion)
        {
            if (completion.Content is null || completion.Content.Count == 0)
            {
                return string.Empty;
            }

            var sb = new StringBuilder();

            foreach (var part in completion.Content)
            {
                if (!string.IsNullOrWhiteSpace(part.Text))
                {
                    if (sb.Length > 0)
                    {
                        sb.AppendLine();
                    }

                    sb.Append(part.Text);
                }
            }

            return sb.ToString().Trim();
        }

        private static ChatTool BuildChatTool(ToolDefinitionDto definition)
        {
            return ChatTool.CreateFunctionTool(
                functionName: definition.Name,
                functionDescription: definition.Description,
                functionParameters: BinaryData.FromString(BuildParameterSchemaJson(definition)));
        }

        private static string BuildParameterSchemaJson(ToolDefinitionDto definition)
        {
            var properties = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            var required = new List<string>();

            foreach (var kvp in definition.Parameters)
            {
                var parameterName = kvp.Key;
                var parameter = kvp.Value;

                var schema = new Dictionary<string, object>
                {
                    ["type"] = string.IsNullOrWhiteSpace(parameter.Type) ? "string" : parameter.Type
                };

                if (!string.IsNullOrWhiteSpace(parameter.Description))
                {
                    schema["description"] = parameter.Description;
                }

                if (!string.IsNullOrWhiteSpace(parameter.Format))
                {
                    schema["format"] = parameter.Format;
                }

                if (parameter.EnumValues is { Count: > 0 })
                {
                    schema["enum"] = parameter.EnumValues;
                }

                properties[parameterName] = schema;

                if (parameter.Required)
                {
                    required.Add(parameterName);
                }
            }

            var root = new Dictionary<string, object>
            {
                ["type"] = "object",
                ["properties"] = properties,
                ["additionalProperties"] = false
            };

            if (required.Count > 0)
            {
                root["required"] = required;
            }

            return JsonSerializer.Serialize(root);
        }
    }
}