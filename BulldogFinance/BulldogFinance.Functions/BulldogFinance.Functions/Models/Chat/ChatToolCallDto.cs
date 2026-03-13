using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatToolCallDto
    {
        public string ToolName { get; set; } = string.Empty;

        public Dictionary<string, JsonElement> Arguments { get; set; }
            = new(StringComparer.OrdinalIgnoreCase);
    }
}
