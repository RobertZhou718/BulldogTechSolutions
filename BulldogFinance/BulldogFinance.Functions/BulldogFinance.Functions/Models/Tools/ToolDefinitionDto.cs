namespace BulldogFinance.Functions.Models.Tools
{
    public sealed class ToolDefinitionDto
    {
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public Dictionary<string, ToolParameterSchema> Parameters { get; set; }
            = new(StringComparer.OrdinalIgnoreCase);

        public IReadOnlyList<string> GetRequiredParameters()
        {
            return Parameters
                .Where(x => x.Value.Required)
                .Select(x => x.Key)
                .ToList();
        }
    }
}
