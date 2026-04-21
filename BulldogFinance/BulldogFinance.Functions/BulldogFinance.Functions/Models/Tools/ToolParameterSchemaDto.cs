using System.Text.Json.Serialization;

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
