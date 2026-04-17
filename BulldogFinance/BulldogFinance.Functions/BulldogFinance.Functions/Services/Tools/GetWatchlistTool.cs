using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Models.Watchlist;
using BulldogFinance.Functions.Services.Investments;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GetWatchlistTool : IAgentTool
    {
        private readonly IInvestmentService _investmentService;

        public GetWatchlistTool(IInvestmentService investmentService)
        {
            _investmentService = investmentService;
        }

        public string Name => "get_watchlist";

        public string Description =>
            "Get the user's watchlist items, optionally filtered by symbol.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["symbol"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional symbol filter.",
                    Required = false
                },
                ["limit"] = new ToolParameterSchema
                {
                    Type = "integer",
                    Description = "Maximum number of watchlist items to return. Defaults to 50.",
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
            var limit = Math.Clamp(ToolArgumentReader.GetInt(request, "limit", 50), 1, 200);

            var watchlist = await _investmentService.GetWatchlistAsync(userId, cancellationToken);

            IEnumerable<WatchlistItemDto> filtered = watchlist;
            if (!string.IsNullOrWhiteSpace(symbol))
            {
                filtered = filtered.Where(x =>
                    string.Equals(x.Symbol, symbol, StringComparison.OrdinalIgnoreCase));
            }

            var filteredList = filtered.ToList();
            var items = filteredList
                .OrderByDescending(x => x.AddedAtUtc)
                .ThenBy(x => x.Symbol)
                .Take(limit)
                .ToList();

            return ToolExecutionResult.Success(
                Name,
                BuildSummary(filteredList.Count, items.Count, symbol),
                new
                {
                    symbol,
                    totalMatched = filteredList.Count,
                    returnedCount = items.Count,
                    items
                });
        }

        private static string BuildSummary(int totalMatched, int returnedCount, string? symbol)
        {
            if (totalMatched == 0)
            {
                if (!string.IsNullOrWhiteSpace(symbol))
                {
                    return $"No watchlist item was found for symbol '{symbol}'.";
                }

                return "No watchlist items were found.";
            }

            if (!string.IsNullOrWhiteSpace(symbol))
            {
                return $"Found {totalMatched} watchlist item(s) for symbol '{symbol}'; returning {returnedCount}.";
            }

            return $"Found {totalMatched} watchlist item(s); returning {returnedCount}.";
        }
    }
}
