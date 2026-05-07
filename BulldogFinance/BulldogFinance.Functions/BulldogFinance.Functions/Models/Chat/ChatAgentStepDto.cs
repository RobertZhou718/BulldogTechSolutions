namespace BulldogFinance.Functions.Models.Chat
{
    public sealed class ChatAgentStepDto
    {
        public List<ChatToolResultDto> ToolResults { get; set; } = new();
    }
}
