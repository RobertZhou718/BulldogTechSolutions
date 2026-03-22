using BulldogFinance.Functions.Models.Chat;
using BulldogFinance.Functions.Models.Tools;

namespace BulldogFinance.Functions.Services.Chat
{
    public interface ISystemPromptBuilder
    {
        string Build(
            ChatContextDto context,
            IReadOnlyCollection<ToolDefinitionDto> availableTools);
    }
}