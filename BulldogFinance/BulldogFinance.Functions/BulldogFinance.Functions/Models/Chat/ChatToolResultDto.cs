using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatToolResultDto
    {
        public string ToolName { get; set; } = string.Empty;

        public bool IsSuccess { get; set; }

        public string Summary { get; set; } = string.Empty;

        public object? Data { get; set; }

        public string? ErrorCode { get; set; }

        public string? ErrorMessage { get; set; }
    }
}
