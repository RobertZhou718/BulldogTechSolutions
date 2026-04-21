namespace BulldogFinance.Functions.Services.Chat
{
    public interface IAiClient
    {
        Task<AiGenerationResult> GenerateAsync(
            string systemPrompt,
            string userPrompt,
            int maxOutputTokens,
            float temperature = 0.2f,
            CancellationToken ct = default);
    }

    public sealed class AiGenerationResult
    {
        public string Text { get; init; } = string.Empty;
        public int InputTokens { get; init; }
        public int OutputTokens { get; init; }
        public int TotalTokens { get; init; }
    }
}