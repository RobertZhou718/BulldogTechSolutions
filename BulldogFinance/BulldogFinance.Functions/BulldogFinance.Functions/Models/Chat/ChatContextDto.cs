namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatContextDto
    {
        public string UserId { get; set; } = string.Empty;

        public string ConversationId { get; set; } = string.Empty;

        public string LatestUserMessage { get; set; } = string.Empty;

        public List<ChatMessageDto> Messages { get; set; } = new();

        public List<ChatAgentStepDto> Steps { get; set; } = new();
    }
}
