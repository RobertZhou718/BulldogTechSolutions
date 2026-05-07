namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class ToolDefinitionDto
    {
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public Dictionary<string, ToolParameterSchema> Parameters { get; set; }
            = new(StringComparer.OrdinalIgnoreCase);
    }
}
