using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatMessageEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string ConversationId { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedUtc { get; set; }
    }
}
