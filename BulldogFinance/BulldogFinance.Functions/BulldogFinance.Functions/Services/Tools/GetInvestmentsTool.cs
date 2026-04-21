using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Services.Investments;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GetInvestmentsTool : IAgentTool
    {
        private readonly IInvestmentService _investmentService;

        public GetInvestmentsTool(IInvestmentService investmentService)
        {
            _investmentService = investmentService;
        }

        public string Name => "get_investments";

        public string Description =>
            "Get the user's investment holdings, optionally filtered by symbol or exchange.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["symbol"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional symbol filter such as AAPL or MSFT.",
                    Required = false
                },
                ["exchange"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional exchange filter such as US or NASDAQ.",
                    Required = false
                },
                ["limit"] = new ToolParameterSchema
                {
                    Type = "integer",
                    Description = "Maximum number of holdings to return. Defaults to 50.",
                    Required = false
                }
            }
        };

        public async Task<ToolExecutionResult> ExecuteAsync(
            string userId,
            ToolExecutionRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return ToolExecutionResult.Failure(Name, "invalid_user", "User id is required.");
            }

            var symbol = ToolArgumentReader.GetString(request, "symbol");
            var exchange = ToolArgumentReader.GetString(request, "exchange");
            var limit = Math.Clamp(ToolArgumentReader.GetInt(request, "limit", 50), 1, 200);

            var investments = await _investmentService.GetInvestmentsForUserAsync(userId, cancellationToken);

            IEnumerable<InvestmentDto> filtered = investments;

            if (!string.IsNullOrWhiteSpace(symbol))
            {
                filtered = filtered.Where(x =>
                    string.Equals(x.Symbol, symbol, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(exchange))
            {
                filtered = filtered.Where(x =>
                    string.Equals(x.Exchange, exchange, StringComparison.OrdinalIgnoreCase));
            }

            var filteredList = filtered.ToList();
            var orderedItems = filteredList
                .OrderBy(x => x.Symbol)
                .ThenBy(x => x.Exchange)
                .Take(limit)
                .ToList();

            return ToolExecutionResult.Success(
                Name,
                BuildSummary(filteredList.Count, orderedItems.Count, symbol, exchange),
                new
                {
                    symbol,
                    exchange,
                    totalMatched = filteredList.Count,
                    returnedCount = orderedItems.Count,
                    investments = orderedItems
                });
        }

        private static string BuildSummary(
            int totalMatched,
            int returnedCount,
            string? symbol,
            string? exchange)
        {
            if (totalMatched == 0)
            {
                if (!string.IsNullOrWhiteSpace(symbol))
                {
                    return $"No investment holding was found for symbol '{symbol}'.";
                }

                return "No investment holdings were found.";
            }

            if (!string.IsNullOrWhiteSpace(symbol))
            {
                return $"Found {totalMatched} investment holding(s) for symbol '{symbol}'; returning {returnedCount}.";
            }

            if (!string.IsNullOrWhiteSpace(exchange))
            {
                return $"Found {totalMatched} investment holding(s) on exchange '{exchange}'; returning {returnedCount}.";
            }

            return $"Found {totalMatched} investment holding(s); returning {returnedCount}.";
        }
    }
}
