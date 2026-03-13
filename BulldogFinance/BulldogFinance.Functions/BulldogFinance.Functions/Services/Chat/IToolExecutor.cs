using BulldogFinance.Functions.Models.Tools;

namespace BulldogFinance.Functions.Services.Chat
{
    public interface IToolExecutor
    {
        IReadOnlyCollection<ToolDefinitionDto> GetAvailableToolDefinitions();

        Task<ToolExecutionResult> ExecuteAsync(
            string userId,
            ToolExecutionRequest request,
            CancellationToken ct = default);
    }
}