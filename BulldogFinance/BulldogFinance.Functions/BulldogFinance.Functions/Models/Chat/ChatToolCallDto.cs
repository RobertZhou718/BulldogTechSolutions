using System.Text.Json;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatToolCallDto
    {
        public string ToolName { get; set; } = string.Empty;

        public Dictionary<string, JsonElement> Arguments { get; set; }
            = new(StringComparer.OrdinalIgnoreCase);
    }
}
