using System.Text.Json;
using BulldogFinance.Functions.Models.Chat;
using BulldogFinance.Functions.Models.Tools;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class ChatAgentService : IChatAgentService
    {
        private const int MaxToolRoundsPerTurn = 3;

        private readonly IConversationService _conversationService;
        private readonly ISystemPromptBuilder _systemPromptBuilder;
        private readonly IToolExecutor _toolExecutor;
        private readonly AzureOpenAiClient _azureOpenAiClient;
        private readonly ILogger<ChatAgentService> _logger;

        public ChatAgentService(
            IConversationService conversationService,
            ISystemPromptBuilder systemPromptBuilder,
            IToolExecutor toolExecutor,
            AzureOpenAiClient azureOpenAiClient,
            ILogger<ChatAgentService> logger)
        {
            _conversationService = conversationService;
            _systemPromptBuilder = systemPromptBuilder;
            _toolExecutor = toolExecutor;
            _azureOpenAiClient = azureOpenAiClient;
            _logger = logger;
        }

        public async Task<ChatResponse> ChatAsync(
            string userId,
            ChatRequest request,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ArgumentException("User id is required.", nameof(userId));
            }

            if (request is null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            if (string.IsNullOrWhiteSpace(request.Message))
            {
                throw new ArgumentException("Chat message is required.", nameof(request));
            }

            var context = await _conversationService.CreateOrLoadContextAsync(userId, request, ct);
            await _conversationService.AppendUserMessageAsync(context, request.Message, ct);

            var availableTools = _toolExecutor.GetAvailableToolDefinitions();
            var systemPrompt = _systemPromptBuilder.Build(context, availableTools);

            var messages = BuildMessageHistory(context, systemPrompt);

            for (var round = 1; round <= MaxToolRoundsPerTurn; round++)
            {
                _logger.LogInformation(
                    "Starting agent round {Round} for ConversationId={ConversationId}",
                    round,
                    context.ConversationId);

                ChatCompletion completion = await _azureOpenAiClient.CompleteAsync(
                    messages,
                    availableTools,
                    allowToolCalls: true,
                    ct);

                if (completion.FinishReason == ChatFinishReason.Stop)
                {
                    var reply = AzureOpenAiClient.ExtractAssistantText(completion);

                    if (string.IsNullOrWhiteSpace(reply))
                    {
                        reply = "I could not generate a reply.";
                    }

                    await _conversationService.AppendAssistantMessageAsync(context, reply, ct);

                    return new ChatResponse
                    {
                        ConversationId = context.ConversationId,
                        Reply = reply
                    };
                }

                if (completion.FinishReason == ChatFinishReason.ToolCalls)
                {
                    var assistantMessage = new AssistantChatMessage(completion);
                    messages.Add(assistantMessage);

                    var step = new ChatAgentStepDto
                    {
                        StepNumber = round,
                        Thought = "Model requested tool execution."
                    };

                    foreach (var toolCall in completion.ToolCalls)
                    {
                        var requestDto = CreateToolExecutionRequest(toolCall);

                        step.ToolCalls.Add(new ChatToolCallDto
                        {
                            ToolName = requestDto.ToolName,
                            Arguments = requestDto.Arguments
                        });

                        var result = await _toolExecutor.ExecuteAsync(userId, requestDto, ct);

                        var resultDto = new ChatToolResultDto
                        {
                            ToolName = result.ToolName,
                            IsSuccess = result.IsSuccess,
                            Summary = result.Summary,
                            Data = result.Data,
                            ErrorCode = result.ErrorCode,
                            ErrorMessage = result.ErrorMessage
                        };

                        step.ToolResults.Add(resultDto);

                        messages.Add(new ToolChatMessage(
                            toolCall.Id,
                            SerializeToolResultForModel(result)));
                    }

                    await _conversationService.AppendAgentStepAsync(context, step, ct);
                    continue;
                }

                if (completion.FinishReason == ChatFinishReason.Length)
                {
                    var reply = "The response was truncated because the model hit a token limit.";
                    await _conversationService.AppendAssistantMessageAsync(context, reply, ct);

                    return new ChatResponse
                    {
                        ConversationId = context.ConversationId,
                        Reply = reply
                    };
                }

                if (completion.FinishReason == ChatFinishReason.ContentFilter)
                {
                    var reply = "I could not provide a response because the request was filtered.";
                    await _conversationService.AppendAssistantMessageAsync(context, reply, ct);

                    return new ChatResponse
                    {
                        ConversationId = context.ConversationId,
                        Reply = reply
                    };
                }

                throw new InvalidOperationException(
                    $"Unsupported finish reason: {completion.FinishReason}");
            }

            _logger.LogWarning(
                "Max tool rounds reached for ConversationId={ConversationId}. Requesting final answer without tools.",
                context.ConversationId);

            var finalCompletion = await _azureOpenAiClient.CompleteAsync(
                messages,
                Array.Empty<ToolDefinitionDto>(),
                allowToolCalls: false,
                ct);

            var finalReply = AzureOpenAiClient.ExtractAssistantText(finalCompletion);

            if (string.IsNullOrWhiteSpace(finalReply))
            {
                finalReply = BuildFallbackReplyFromContext(context);
            }

            await _conversationService.AppendAssistantMessageAsync(context, finalReply, ct);

            return new ChatResponse
            {
                ConversationId = context.ConversationId,
                Reply = finalReply
            };
        }

        private static List<ChatMessage> BuildMessageHistory(
            ChatContextDto context,
            string systemPrompt)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(systemPrompt)
            };

            foreach (var message in context.Messages)
            {
                if (string.IsNullOrWhiteSpace(message.Content))
                {
                    continue;
                }

                if (string.Equals(message.Role, "user", StringComparison.OrdinalIgnoreCase))
                {
                    messages.Add(new UserChatMessage(message.Content));
                    continue;
                }

                if (string.Equals(message.Role, "assistant", StringComparison.OrdinalIgnoreCase))
                {
                    messages.Add(new AssistantChatMessage(message.Content));
                }
            }

            return messages;
        }

        private static ToolExecutionRequest CreateToolExecutionRequest(ChatToolCall toolCall)
        {
            var arguments = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

            // Convert BinaryData to string, and use "{}" if null
            var rawArguments = toolCall.FunctionArguments != null
                ? toolCall.FunctionArguments.ToString()
                : "{}";

            using var document = JsonDocument.Parse(rawArguments);

            if (document.RootElement.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in document.RootElement.EnumerateObject())
                {
                    arguments[property.Name] = property.Value.Clone();
                }
            }

            return new ToolExecutionRequest
            {
                ToolName = toolCall.FunctionName,
                Arguments = arguments
            };
        }

        private static string SerializeToolResultForModel(ToolExecutionResult result)
        {
            var payload = new
            {
                toolName = result.ToolName,
                isSuccess = result.IsSuccess,
                summary = result.Summary,
                data = result.Data,
                errorCode = result.ErrorCode,
                errorMessage = result.ErrorMessage
            };

            return JsonSerializer.Serialize(payload);
        }

        private static string BuildFallbackReplyFromContext(ChatContextDto context)
        {
            var latestStep = context.Steps.LastOrDefault();
            if (latestStep is null || latestStep.ToolResults.Count == 0)
            {
                return "I couldn't complete the request successfully.";
            }

            var summaries = latestStep.ToolResults
                .Select(x => $"{x.ToolName}: {x.Summary}")
                .ToList();

            return "I gathered the relevant data, but I couldn't produce a final natural-language summary. " +
                   string.Join(" | ", summaries);
        }
    }
}