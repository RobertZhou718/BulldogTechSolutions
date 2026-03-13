using BulldogFinance.Functions.Models.Chat;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class ConversationService : IConversationService
    {
        public Task<ChatContextDto> CreateOrLoadContextAsync(
            string userId,
            ChatRequest request,
            CancellationToken ct = default)
        {
            var context = new ChatContextDto
            {
                UserId = userId,
                ConversationId = string.IsNullOrWhiteSpace(request.ConversationId)
                    ? Guid.NewGuid().ToString("N")
                    : request.ConversationId!,
                LatestUserMessage = request.Message
            };

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
    }
}