using System.Text;
using BulldogFinance.Functions.Models.Chat;
using BulldogFinance.Functions.Models.Tools;

namespace BulldogFinance.Functions.Services.Chat
{
    public sealed class SystemPromptBuilder : ISystemPromptBuilder
    {
        public string Build(
            ChatContextDto context,
            IReadOnlyCollection<ToolDefinitionDto> availableTools)
        {
            var sb = new StringBuilder();

            sb.AppendLine("You are the Bulldog Finance chat agent.");
            sb.AppendLine("Your job is to help the user understand their personal finances, investments, accounts, transactions, watchlist items, and generated reports.");
            sb.AppendLine();
            sb.AppendLine("Rules:");
            sb.AppendLine("1. Do not invent user-specific financial data.");
            sb.AppendLine("2. If the answer depends on user portfolio, accounts, transactions, watchlist, or reports, use tools first.");
            sb.AppendLine("3. If a tool result is missing or failed, say so clearly.");
            sb.AppendLine("4. Keep answers practical, concise, and financially literate.");
            sb.AppendLine("5. Do not claim to execute trades or make guaranteed predictions.");
            sb.AppendLine("6. When relevant, distinguish facts from opinions.");
            sb.AppendLine();

            sb.AppendLine($"Current user id: {context.UserId}");
            sb.AppendLine($"Conversation id: {context.ConversationId}");
            sb.AppendLine();

            sb.AppendLine("Available tools:");
            foreach (var tool in availableTools.OrderBy(t => t.Name))
            {
                sb.AppendLine($"- {tool.Name}: {tool.Description}");
            }

            return sb.ToString();
        }
    }
}