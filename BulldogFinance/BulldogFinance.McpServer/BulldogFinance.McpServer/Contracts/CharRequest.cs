using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.McpServer.Contracts
{
    public sealed class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? ConversationId { get; set; }
    }
}
