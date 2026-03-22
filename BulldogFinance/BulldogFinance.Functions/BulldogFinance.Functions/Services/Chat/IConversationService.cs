using BulldogFinance.Functions.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Chat
{
    public interface IConversationService
    {
        Task<ChatContextDto> CreateOrLoadContextAsync(
            string userId,
            ChatRequest request,
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
