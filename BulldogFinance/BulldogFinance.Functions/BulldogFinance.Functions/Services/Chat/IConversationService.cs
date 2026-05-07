using BulldogFinance.Functions.Models.Chat;

namespace BulldogFinance.Functions.Services.Chat
{
    public interface IConversationService
    {
        Task<ChatContextDto> CreateOrLoadContextAsync(
            string userId,
            ChatRequest request,
            CancellationToken ct = default);

        Task<IReadOnlyList<ChatConversationSummaryDto>> ListConversationsAsync(
            string userId,
            CancellationToken ct = default);

        Task<ChatConversationDetailDto?> GetConversationAsync(
            string userId,
            string conversationId,
            CancellationToken ct = default);

        Task<bool> DeleteConversationAsync(
            string userId,
            string conversationId,
            CancellationToken ct = default);

        Task AppendUserMessageAsync(
            ChatContextDto context,
            string message,
            CancellationToken ct = default);

        Task AppendAssistantMessageAsync(
            ChatContextDto context,
            string message,
            CancellationToken ct = default);

        Task AppendAgentStepAsync(
            ChatContextDto context,
            ChatAgentStepDto step,
            CancellationToken ct = default);
    }
}
