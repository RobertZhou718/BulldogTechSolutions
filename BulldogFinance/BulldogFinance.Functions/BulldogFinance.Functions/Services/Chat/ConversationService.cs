using BulldogFinance.Functions.Models.Chat;
using System.Collections.Concurrent;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class ConversationService : IConversationService
    {
        private readonly ConcurrentDictionary<string, ChatContextDto> _conversations = new(StringComparer.OrdinalIgnoreCase);

        public Task<ChatContextDto> CreateOrLoadContextAsync(
            string userId,
            ChatRequest request,
            CancellationToken ct = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(userId);
            ArgumentNullException.ThrowIfNull(request);

            var conversationId = string.IsNullOrWhiteSpace(request.ConversationId)
                ? Guid.NewGuid().ToString("N")
                : request.ConversationId!;

            var context = _conversations.GetOrAdd(
                BuildConversationKey(userId, conversationId),
                _ => new ChatContextDto
                {
                    UserId = userId,
                    ConversationId = conversationId
                });

            context.UserId = userId;
            context.ConversationId = conversationId;
            context.LatestUserMessage = request.Message;

            return Task.FromResult(context);
        }

        public Task AppendUserMessageAsync(
            ChatContextDto context,
            string message,
            CancellationToken ct = default)
        {
            context.Messages.Add(new ChatMessageDto
            {
                Role = "user",
                Content = message
            });

            context.LatestUserMessage = message;
            return Task.CompletedTask;
        }

        public Task AppendAssistantMessageAsync(
            ChatContextDto context,
            string message,
            CancellationToken ct = default)
        {
            context.Messages.Add(new ChatMessageDto
            {
                Role = "assistant",
                Content = message
            });

            return Task.CompletedTask;
        }

        public Task AppendAgentStepAsync(
            ChatContextDto context,
            ChatAgentStepDto step,
            CancellationToken ct = default)
        {
            context.Steps.Add(step);
            return Task.CompletedTask;
        }

        private static string BuildConversationKey(string userId, string conversationId)
        {
            return $"{userId}:{conversationId}";
        }
    }
}
