using System;
using System.ClientModel;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Azure.AI.OpenAI;
using Azure.Identity;
using BulldogFinance.Functions.Models.Tools;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class AzureOpenAiClient
    {
        private readonly ChatClient _chatClient;
        private readonly ILogger<AzureOpenAiClient> _logger;

        public AzureOpenAiClient(
            IConfiguration configuration,
            ILogger<AzureOpenAiClient> logger)
        {
            _logger = logger;

            var endpoint =
                configuration["AzureOpenAI:Endpoint"] ??
                configuration["AzureOpenAi:Endpoint"] ??
                throw new InvalidOperationException("AzureOpenAI:Endpoint is required.");

            var deployment =
                configuration["AzureOpenAI:ChatDeployment"] ??
                configuration["AzureOpenAI:DeploymentName"] ??
                configuration["AzureOpenAi:ChatDeployment"] ??
                configuration["AzureOpenAi:DeploymentName"] ??
                throw new InvalidOperationException("AzureOpenAI:ChatDeployment is required.");

            var apiKey =
                configuration["AzureOpenAI:ApiKey"] ??
                configuration["AzureOpenAi:ApiKey"];

            var managedIdentityClientId = configuration["ManagedIdentity:ClientId"];

            Azure.AI.OpenAI.AzureOpenAIClient azureClient;

            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                azureClient = new Azure.AI.OpenAI.AzureOpenAIClient(
                    new Uri(endpoint),
                    new ApiKeyCredential(apiKey));
            }
            else
            {
                DefaultAzureCredential credential = !string.IsNullOrWhiteSpace(managedIdentityClientId)
                    ? new DefaultAzureCredential(
                        new DefaultAzureCredentialOptions
                        {
                            ManagedIdentityClientId = managedIdentityClientId
                        })
                    : new DefaultAzureCredential();

                azureClient = new Azure.AI.OpenAI.AzureOpenAIClient(
                    new Uri(endpoint),
                    credential);
            }

            _chatClient = azureClient.GetChatClient(deployment);
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
            var properties = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            var required = new List<string>();

            foreach (var kvp in definition.Parameters)
            {
                var parameterName = kvp.Key;
                var parameter = kvp.Value;

                var schema = new Dictionary<string, object?>();

                schema["type"] = string.IsNullOrWhiteSpace(parameter.Type)
                    ? "string"
                    : parameter.Type;

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

            var root = new Dictionary<string, object?>
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