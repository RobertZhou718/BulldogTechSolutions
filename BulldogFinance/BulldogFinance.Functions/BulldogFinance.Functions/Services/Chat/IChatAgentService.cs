using BulldogFinance.Functions.Models.Chat;

namespace BulldogFinance.Functions.Services.Chat
{
    public interface IChatAgentService
    {
        Task<ChatResponse> ChatAsync(
            string userId,
            ChatRequest request,
            CancellationToken ct = default);
    }
}