using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatAgentStepDto
    {
        public int StepNumber { get; set; }

        public string Thought { get; set; } = string.Empty;

        public List<ChatToolCallDto> ToolCalls { get; set; } = new();

        public List<ChatToolResultDto> ToolResults { get; set; } = new();

        public string? AssistantMessage { get; set; }
    }
}
