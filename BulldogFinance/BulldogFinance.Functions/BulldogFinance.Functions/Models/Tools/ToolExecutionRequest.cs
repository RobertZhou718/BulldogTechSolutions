using System.Text.Json;

namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class ToolExecutionRequest
    {
        public string ToolName { get; set; } = string.Empty;

        public Dictionary<string, JsonElement> Arguments { get; set; }
            = new(StringComparer.OrdinalIgnoreCase);
    }
}
