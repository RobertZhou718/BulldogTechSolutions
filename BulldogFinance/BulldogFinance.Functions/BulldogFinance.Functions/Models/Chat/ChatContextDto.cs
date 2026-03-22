using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatContextDto
    {
        public string UserId { get; set; } = string.Empty;

        public string ConversationId { get; set; } = string.Empty;

        public string LatestUserMessage { get; set; } = string.Empty;

        public ChatIntentType Intent { get; set; } = ChatIntentType.Unknown;

        public List<ChatMessageDto> Messages { get; set; } = new();

        public List<ChatAgentStepDto> Steps { get; set; } = new();
    }
}
