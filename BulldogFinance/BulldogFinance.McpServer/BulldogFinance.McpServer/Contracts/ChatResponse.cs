using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.McpServer.Contracts
{
    public sealed class ChatResponse
    {
        public string Message { get; set; } = string.Empty;
        public List<string> ToolCalls { get; set; } = new();
        public object? Data { get; set; }
    }
}
