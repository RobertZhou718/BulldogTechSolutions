using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class ToolExecutionRequest
    {
        public string ToolName { get; set; } = string.Empty;

        public Dictionary<string, JsonElement> Arguments { get; set; }
            = new(StringComparer.OrdinalIgnoreCase);
    }
}
