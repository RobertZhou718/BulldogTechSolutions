namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatConversationDetailDto
    {
        public string ConversationId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public List<ChatMessageDto> Messages { get; set; } = new();
    }
}
