using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Services.Investments;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class SearchFinanceNewsTool : IAgentTool
    {
        private readonly IInvestmentOverviewService _overviewService;

        public SearchFinanceNewsTool(IInvestmentOverviewService overviewService)
        {
            _overviewService = overviewService;
        }

        public string Name => "search_finance_news";

        public string Description =>
            "Get recent finance news for symbols already covered by the investment overview service.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["symbol"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional symbol filter. Coverage is limited to current holdings, or fallback popular symbols when no holdings exist.",
                    Required = false
                },
                ["limit"] = new ToolParameterSchema
                {
                    Type = "integer",
                    Description = "Maximum number of news items to return. Defaults to 10.",
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
            var limit = Math.Clamp(ToolArgumentReader.GetInt(request, "limit", 10), 1, 50);

            var overview = await _overviewService.GetOverviewAsync(userId, cancellationToken);
            var usingHoldingsCoverage = overview.Holdings.Count > 0;
            var availableSymbols = new List<string>();
            var newsItems = new List<NewsSearchItem>();

            if (usingHoldingsCoverage)
            {
                IEnumerable<InvestmentHoldingOverviewDto> holdings = overview.Holdings;
                if (!string.IsNullOrWhiteSpace(symbol))
                {
                    holdings = holdings.Where(x =>
                        string.Equals(x.Symbol, symbol, StringComparison.OrdinalIgnoreCase));
                }

                foreach (var holding in overview.Holdings)
                {
                    availableSymbols.Add(holding.Symbol);
                }

                foreach (var holding in holdings)
                {
                    foreach (var news in holding.News)
                    {
                        newsItems.Add(new NewsSearchItem
                        {
                            Symbol = holding.Symbol,
                            Exchange = holding.Exchange,
                            CurrentPrice = holding.CurrentPrice,
                            ChangePercent = holding.ChangePercent,
                            Headline = news.Headline,
                            Source = news.Source,
                            Datetime = news.Datetime,
                            Url = news.Url
                        });
                    }
                }
            }
            else
            {
                IEnumerable<SymbolOverviewDto> popular = overview.Popular;
                if (!string.IsNullOrWhiteSpace(symbol))
                {
                    popular = popular.Where(x =>
                        string.Equals(x.Symbol, symbol, StringComparison.OrdinalIgnoreCase));
                }

                foreach (var item in overview.Popular)
                {
                    availableSymbols.Add(item.Symbol);
                }

                foreach (var item in popular)
                {
                    foreach (var news in item.News)
                    {
                        newsItems.Add(new NewsSearchItem
                        {
                            Symbol = item.Symbol,
                            Exchange = item.Exchange,
                            CurrentPrice = item.CurrentPrice,
                            ChangePercent = item.ChangePercent,
                            Headline = news.Headline,
                            Source = news.Source,
                            Datetime = news.Datetime,
                            Url = news.Url
                        });
                    }
                }
            }

            var dedupedItems = newsItems
                .GroupBy(x => string.IsNullOrWhiteSpace(x.Url)
                    ? $"{x.Symbol}|{x.Headline}|{x.Datetime:O}"
                    : x.Url,
                    StringComparer.OrdinalIgnoreCase)
                .Select(x => x.First())
                .OrderByDescending(x => x.Datetime)
                .Take(limit)
                .ToList();

            return ToolExecutionResult.Success(
                Name,
                BuildSummary(dedupedItems.Count, symbol, usingHoldingsCoverage),
                new
                {
                    symbol,
                    coverage = usingHoldingsCoverage ? "holdings" : "popular",
                    availableSymbols = availableSymbols
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .OrderBy(x => x)
                        .ToList(),
                    returnedCount = dedupedItems.Count,
                    news = dedupedItems
                });
        }

        private static string BuildSummary(int count, string? symbol, bool usingHoldingsCoverage)
        {
            var coverage = usingHoldingsCoverage
                ? "current holdings"
                : "fallback popular symbols";

            if (count == 0)
            {
                if (!string.IsNullOrWhiteSpace(symbol))
                {
                    return $"No finance news was found for symbol '{symbol}' within {coverage}.";
                }

                return $"No finance news was found within {coverage}.";
            }

            if (!string.IsNullOrWhiteSpace(symbol))
            {
                return $"Found {count} finance news item(s) for symbol '{symbol}' within {coverage}.";
            }

            return $"Found {count} finance news item(s) within {coverage}.";
        }

        private sealed class NewsSearchItem
        {
            public string Symbol { get; init; } = string.Empty;
            public string Exchange { get; init; } = string.Empty;
            public double CurrentPrice { get; init; }
            public double ChangePercent { get; init; }
            public string Headline { get; init; } = string.Empty;
            public string Source { get; init; } = string.Empty;
            public DateTimeOffset Datetime { get; init; }
            public string Url { get; init; } = string.Empty;
        }
    }
}
