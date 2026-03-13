using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Services.Tools;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class ToolExecutor : IToolExecutor
    {
        private readonly IReadOnlyList<IAgentTool> _tools;

        public ToolExecutor(IEnumerable<IAgentTool> tools)
        {
            _tools = tools.ToList();
        }

        public IReadOnlyCollection<ToolDefinitionDto> GetAvailableToolDefinitions()
        {
            return _tools
                .Select(t => t.Definition)
                .OrderBy(t => t.Name)
                .ToList();
        }

        public async Task<ToolExecutionResult> ExecuteAsync(
            string userId,
            ToolExecutionRequest request,
            CancellationToken ct = default)
        {
            var tool = _tools.FirstOrDefault(t => t.CanHandle(request.ToolName));
            if (tool is null)
            {
                return ToolExecutionResult.Failure(
                    request.ToolName,
                    "tool_not_found",
                    $"Tool '{request.ToolName}' is not registered.");
            }

            try
            {
                return await tool.ExecuteAsync(userId, request, ct);
            }
            catch (Exception ex)
            {
                return ToolExecutionResult.Failure(
                    request.ToolName,
                    "tool_execution_failed",
                    ex.Message);
            }
        }
    }
}