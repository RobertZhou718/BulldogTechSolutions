namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatMessageDto
    {
        public string Role { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public DateTimeOffset CreatedUtc { get; set; } = DateTimeOffset.UtcNow;
    }
}
