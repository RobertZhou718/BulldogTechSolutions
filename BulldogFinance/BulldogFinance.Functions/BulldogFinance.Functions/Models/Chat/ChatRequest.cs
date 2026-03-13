namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatRequest
    {
        public string Message { get; set; } = string.Empty;

        public string? ConversationId { get; set; }

        public string? UserId { get; set; }
    }
}