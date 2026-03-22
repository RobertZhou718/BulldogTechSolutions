using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class ToolParameterSchema
    {
        public string Type { get; set; } = "string";

        public string Description { get; set; } = string.Empty;

        public bool Required { get; set; }

        [JsonPropertyName("enum")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? EnumValues { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Format { get; set; }
    }
}
