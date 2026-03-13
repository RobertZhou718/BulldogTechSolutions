using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatResponse
    {
        public string Reply { get; set; } = string.Empty;
        public string? ConversationId { get; set; }
    }
}
