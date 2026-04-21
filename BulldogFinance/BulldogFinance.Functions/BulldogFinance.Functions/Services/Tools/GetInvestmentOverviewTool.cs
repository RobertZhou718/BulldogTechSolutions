using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Services.Investments;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GetInvestmentOverviewTool : IAgentTool
    {
        private readonly IInvestmentOverviewService _overviewService;

        public GetInvestmentOverviewTool(IInvestmentOverviewService overviewService)
        {
            _overviewService = overviewService;
        }

        public string Name => "get_investment_overview";

        public string Description =>
            "Get an investment overview with holding performance and related market news.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["symbol"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional symbol filter for a single holding or fallback market symbol.",
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
            var overview = await _overviewService.GetOverviewAsync(userId, cancellationToken);

            var holdings = overview.Holdings;
            var popular = overview.Popular;

            if (!string.IsNullOrWhiteSpace(symbol))
            {
                holdings = holdings
                    .Where(x => string.Equals(x.Symbol, symbol, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                popular = popular
                    .Where(x => string.Equals(x.Symbol, symbol, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return ToolExecutionResult.Success(
                Name,
                BuildSummary(holdings, popular, symbol),
                new InvestmentOverviewDto
                {
                    Holdings = holdings,
                    Popular = popular
                });
        }

        private static string BuildSummary(
            IReadOnlyCollection<InvestmentHoldingOverviewDto> holdings,
            IReadOnlyCollection<SymbolOverviewDto> popular,
            string? symbol)
        {
            if (!string.IsNullOrWhiteSpace(symbol))
            {
                if (holdings.Count == 0 && popular.Count == 0)
                {
                    return $"No investment overview data was found for symbol '{symbol}'.";
                }

                if (holdings.Count > 0)
                {
                    return $"Found overview data for symbol '{symbol}' in the user's holdings.";
                }

                return $"Found overview data for symbol '{symbol}' from fallback market symbols.";
            }

            if (holdings.Count > 0)
            {
                return $"Found overview data for {holdings.Count} holding(s).";
            }

            if (popular.Count > 0)
            {
                return $"No holdings were found; returning {popular.Count} fallback market symbol(s).";
            }

            return "No investment overview data was found.";
        }
    }
}
