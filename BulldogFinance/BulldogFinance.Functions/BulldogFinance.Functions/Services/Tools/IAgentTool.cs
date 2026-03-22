using BulldogFinance.Functions.Models.Tools;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services.Tools
{
    public interface IAgentTool
    {
        string Name { get; }

        string Description { get; }

        ToolDefinitionDto Definition { get; }

        Task<ToolExecutionResult> ExecuteAsync(
            string userId,
            ToolExecutionRequest request,
            CancellationToken cancellationToken = default);

        bool CanHandle(string toolName)
        {
            return string.Equals(Name, toolName, StringComparison.OrdinalIgnoreCase);
        }
    }
}
