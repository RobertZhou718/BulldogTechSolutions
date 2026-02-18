using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Services
{
    public interface IAiClient
    {
        Task<AiResult> GenerateAsync(
            string systemPrompt,
            string userPrompt,
            int maxOutputTokens,
            float temperature = 0.2f,
            CancellationToken ct = default);
    }

    public sealed record AiResult(string Text, int InputTokens, int OutputTokens, int TotalTokens);
}
