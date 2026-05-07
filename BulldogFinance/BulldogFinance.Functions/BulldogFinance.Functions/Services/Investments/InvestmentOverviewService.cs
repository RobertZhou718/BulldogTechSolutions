using System.Text.Json;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Models.Watchlist;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services.Investments
{
    public class InvestmentOverviewService : IInvestmentOverviewService
    {
        private static readonly HashSet<string> UsMarketIdentifierCodes = new(StringComparer.OrdinalIgnoreCase)
        {
            "XNYS",
            "XNAS",
            "ARCX",
            "BATS",
            "IEXG"
        };

        private static readonly HashSet<string> CanadianMarketIdentifierCodes = new(StringComparer.OrdinalIgnoreCase)
        {
            "XTSE",
            "XTSX",
            "XCNQ"
        };

        private readonly IInvestmentService _investmentService;
        private readonly IPlaidInvestmentRepository _plaidInvestmentRepository;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<InvestmentOverviewService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public InvestmentOverviewService(
            IInvestmentService investmentService,
            IPlaidInvestmentRepository plaidInvestmentRepository,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<InvestmentOverviewService> logger)
        {
            _investmentService = investmentService;
            _plaidInvestmentRepository = plaidInvestmentRepository;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
        }

        public async Task<InvestmentOverviewDto> GetOverviewAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var apiKey = _configuration["Finnhub:ApiKey"];
            var hasFinnhub = !string.IsNullOrWhiteSpace(apiKey);
            int maxSymbolsPerUser = GetInt("Finnhub:MaxSymbolsPerUser", 10);
            int maxNewsPerSymbol = GetInt("Finnhub:MaxNewsPerSymbol", 3);
            int newsDays = GetInt("Finnhub:NewsDays", 3);

            var client = hasFinnhub
                ? _httpClientFactory.CreateClient("Finnhub")
                : null;

            var overview = new InvestmentOverviewDto();
            var manualHoldings = await _investmentService.GetInvestmentsForUserAsync(userId, cancellationToken);
            var plaidHoldings = await _plaidInvestmentRepository.GetHoldingsAsync(
                userId,
                includeDeleted: false,
                cancellationToken);
            var plaidSecurities = await _plaidInvestmentRepository.GetSecuritiesAsync(userId, cancellationToken);
            var plaidSecurityByKey = plaidSecurities
                .GroupBy(x => SecurityLookupKey(x.ItemId, x.SecurityId), StringComparer.Ordinal)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.Ordinal);

            var today = DateTime.UtcNow.Date;
            var fromDate = today.AddDays(-newsDays);
            var fromStr = fromDate.ToString("yyyy-MM-dd");
            var toStr = today.ToString("yyyy-MM-dd");

            if (manualHoldings.Count > 0)
            {
                var symbolSet = manualHoldings
                    .Where(h => !string.IsNullOrWhiteSpace(h.Symbol))
                    .Select(h => h.Symbol.Trim().ToUpperInvariant())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(maxSymbolsPerUser)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                var manualTasks = manualHoldings
                    .Where(h => !string.IsNullOrWhiteSpace(h.Symbol) &&
                                symbolSet.Contains(h.Symbol.Trim().ToUpperInvariant()))
                    .Select(h => BuildManualHoldingAsync(
                        h,
                        client,
                        apiKey,
                        fromStr,
                        toStr,
                        maxNewsPerSymbol,
                        cancellationToken));

                overview.Holdings.AddRange(await Task.WhenAll(manualTasks));
            }

            if (plaidHoldings.Count > 0)
            {
                var plaidTasks = plaidHoldings.Select(holding =>
                {
                    plaidSecurityByKey.TryGetValue(
                        SecurityLookupKey(holding.ItemId, holding.SecurityId),
                        out var security);

                    return BuildPlaidHoldingAsync(
                        holding,
                        security,
                        client,
                        apiKey,
                        fromStr,
                        toStr,
                        maxNewsPerSymbol,
                        cancellationToken);
                });

                overview.Holdings.AddRange(await Task.WhenAll(plaidTasks));
            }

            if (overview.Holdings.Count == 0 && hasFinnhub && client != null)
            {
                await AddPopularSymbolsAsync(
                    overview,
                    client,
                    apiKey!,
                    fromStr,
                    toStr,
                    maxSymbolsPerUser,
                    maxNewsPerSymbol,
                    cancellationToken);
            }

            overview.TotalsByCurrency.AddRange(BuildTotals(overview.Holdings));
            overview.Performance.AddRange(await BuildPerformanceAsync(
                userId,
                overview.TotalsByCurrency,
                cancellationToken));

            return overview;
        }

        private async Task<InvestmentHoldingOverviewDto> BuildManualHoldingAsync(
            InvestmentDto holding,
            HttpClient? client,
            string? apiKey,
            string fromStr,
            string toStr,
            int maxNewsPerSymbol,
            CancellationToken cancellationToken)
        {
            var symbol = holding.Symbol.Trim().ToUpperInvariant();
            var exchange = string.IsNullOrWhiteSpace(holding.Exchange)
                ? "US"
                : holding.Exchange.Trim().ToUpperInvariant();
            var canUseFinnhub = client != null && !string.IsNullOrWhiteSpace(apiKey);
            var quoteTask = canUseFinnhub
                ? GetQuoteAsync(client!, apiKey!, symbol, cancellationToken)
                : Task.FromResult((price: 0.0, changePercent: 0.0));
            var newsTask = canUseFinnhub
                ? GetNewsAsync(client!, apiKey!, symbol, fromStr, toStr, maxNewsPerSymbol, cancellationToken)
                : Task.FromResult(new List<InvestmentNewsItemDto>());

            await Task.WhenAll(quoteTask, newsTask);

            var (price, changePercent) = quoteTask.Result;
            var marketValue = holding.Quantity * price;
            var costValue = holding.Quantity * holding.AvgCost;
            var unrealizedPnL = costValue > 1e-8 ? marketValue - costValue : 0;
            var unrealizedPnLPercent = costValue > 1e-8 ? unrealizedPnL / costValue * 100.0 : 0;

            return new InvestmentHoldingOverviewDto
            {
                HoldingId = $"manual|{symbol}",
                Source = "Manual",
                Symbol = symbol,
                Exchange = exchange,
                Quantity = holding.Quantity,
                AvgCost = holding.AvgCost,
                CostBasis = costValue,
                Currency = holding.Currency,
                CurrentPrice = price,
                ChangePercent = changePercent,
                MarketValue = marketValue,
                UnrealizedPnL = unrealizedPnL,
                UnrealizedPnLPercent = unrealizedPnLPercent,
                CanDelete = true,
                News = newsTask.Result
            };
        }

        private async Task<InvestmentHoldingOverviewDto> BuildPlaidHoldingAsync(
            PlaidInvestmentHoldingEntity holding,
            PlaidInvestmentSecurityEntity? security,
            HttpClient? client,
            string? apiKey,
            string fromStr,
            string toStr,
            int maxNewsPerSymbol,
            CancellationToken cancellationToken)
        {
            var symbol = !string.IsNullOrWhiteSpace(security?.TickerSymbol)
                ? security!.TickerSymbol!.Trim().ToUpperInvariant()
                : holding.SecurityId;
            var exchange = ResolveExchange(security?.MarketIdentifierCode);
            var currentPrice = holding.InstitutionPrice > 0
                ? holding.InstitutionPrice
                : security?.ClosePrice ?? 0;
            var marketValue = Math.Abs(holding.InstitutionValue) > 1e-8
                ? holding.InstitutionValue
                : holding.Quantity * currentPrice;
            var costBasis = holding.CostBasis ?? 0;
            var avgCost = Math.Abs(holding.Quantity) > 1e-8 && costBasis > 0
                ? costBasis / holding.Quantity
                : 0;
            var unrealizedPnL = costBasis > 1e-8 ? marketValue - costBasis : 0;
            var unrealizedPnLPercent = costBasis > 1e-8 ? unrealizedPnL / costBasis * 100.0 : 0;

            var canUseFinnhub = client != null &&
                                !string.IsNullOrWhiteSpace(apiKey) &&
                                !string.IsNullOrWhiteSpace(symbol);
            var news = canUseFinnhub
                ? await GetNewsAsync(client!, apiKey!, symbol, fromStr, toStr, maxNewsPerSymbol, cancellationToken)
                : new List<InvestmentNewsItemDto>();

            return new InvestmentHoldingOverviewDto
            {
                HoldingId = $"plaid|{holding.RowKey}",
                Source = "Plaid",
                Symbol = symbol,
                Exchange = exchange,
                SecurityId = holding.SecurityId,
                SecurityName = security?.Name,
                AccountId = holding.LocalAccountId,
                AccountName = holding.AccountName,
                InstitutionName = holding.InstitutionName,
                MarketIdentifierCode = security?.MarketIdentifierCode,
                IsCashEquivalent = security?.IsCashEquivalent ?? false,
                CanDelete = false,
                Quantity = holding.Quantity,
                AvgCost = avgCost,
                CostBasis = costBasis,
                Currency = holding.Currency,
                CurrentPrice = currentPrice,
                ChangePercent = 0,
                PriceAsOfUtc = holding.InstitutionPriceDatetimeUtc
                    ?? holding.InstitutionPriceAsOfUtc
                    ?? security?.ClosePriceAsOfUtc
                    ?? security?.UpdateDatetimeUtc,
                MarketValue = marketValue,
                UnrealizedPnL = unrealizedPnL,
                UnrealizedPnLPercent = unrealizedPnLPercent,
                News = news
            };
        }

        private async Task AddPopularSymbolsAsync(
            InvestmentOverviewDto overview,
            HttpClient client,
            string apiKey,
            string fromStr,
            string toStr,
            int maxSymbolsPerUser,
            int maxNewsPerSymbol,
            CancellationToken cancellationToken)
        {
            var popularStr = _configuration["Finnhub:PopularSymbols"]
                             ?? "AAPL,MSFT,NVDA,TSLA,GOOGL,AMZN";

            var popularSymbols = popularStr
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Take(maxSymbolsPerUser)
                .Select(s => s.ToUpperInvariant())
                .ToList();

            var popularTasks = popularSymbols.Select(async symbol =>
            {
                var quoteTask = GetQuoteAsync(client, apiKey, symbol, cancellationToken);
                var newsTask = GetNewsAsync(client, apiKey, symbol, fromStr, toStr, maxNewsPerSymbol, cancellationToken);
                await Task.WhenAll(quoteTask, newsTask);

                var (price, changePercent) = quoteTask.Result;
                var news = newsTask.Result;

                return new SymbolOverviewDto
                {
                    Symbol = symbol,
                    Exchange = "US",
                    CurrentPrice = price,
                    ChangePercent = changePercent,
                    News = news
                };
            });

            overview.Popular.AddRange(await Task.WhenAll(popularTasks));
        }

        private static List<InvestmentCurrencyTotalDto> BuildTotals(
            IEnumerable<InvestmentHoldingOverviewDto> holdings)
        {
            return holdings
                .GroupBy(x => string.IsNullOrWhiteSpace(x.Currency) ? "USD" : x.Currency.ToUpperInvariant())
                .Select(group => new InvestmentCurrencyTotalDto
                {
                    Currency = group.Key,
                    MarketValue = group.Sum(x => x.MarketValue),
                    CostBasis = group.Sum(x => x.CostBasis),
                    UnrealizedPnL = group.Sum(x => x.UnrealizedPnL),
                    Positions = group.Count()
                })
                .OrderByDescending(x => x.MarketValue)
                .ThenBy(x => x.Currency)
                .ToList();
        }

        private async Task<List<InvestmentPerformancePointDto>> BuildPerformanceAsync(
            string userId,
            IReadOnlyList<InvestmentCurrencyTotalDto> currentTotals,
            CancellationToken cancellationToken)
        {
            var endUtc = DateTime.UtcNow.Date.AddDays(1);
            var startUtc = endUtc.AddDays(-90);
            var snapshots = await _plaidInvestmentRepository.GetPortfolioSnapshotsAsync(
                userId,
                startUtc,
                endUtc,
                cancellationToken);

            var result = snapshots
                .Select(snapshot => new InvestmentPerformancePointDto
                {
                    SnapshotDateUtc = snapshot.SnapshotDateUtc,
                    Label = snapshot.SnapshotDateUtc.ToString("MMM d"),
                    Currency = snapshot.Currency,
                    MarketValue = snapshot.MarketValue,
                    CostBasis = snapshot.CostBasis,
                    UnrealizedPnL = snapshot.UnrealizedPnL
                })
                .ToList();

            if (result.Count == 0 && currentTotals.Count > 0)
            {
                var today = DateTime.UtcNow.Date;
                result.AddRange(currentTotals.Select(total => new InvestmentPerformancePointDto
                {
                    SnapshotDateUtc = today,
                    Label = today.ToString("MMM d"),
                    Currency = total.Currency,
                    MarketValue = total.MarketValue,
                    CostBasis = total.CostBasis,
                    UnrealizedPnL = total.UnrealizedPnL
                }));
            }

            return result;
        }

        private int GetInt(string key, int defaultValue)
        {
            if (int.TryParse(_configuration[key], out var val))
            {
                return val;
            }
            return defaultValue;
        }

        private async Task<(double price, double changePercent)> GetQuoteAsync(
            HttpClient client,
            string apiKey,
            string symbol,
            CancellationToken cancellationToken)
        {
            var quote = await GetQuoteDetailedAsync(client, apiKey, symbol, cancellationToken);
            return (quote?.Price ?? 0, quote?.ChangePercent ?? 0);
        }

        private async Task<FinnhubQuote?> GetQuoteDetailedAsync(
            HttpClient client,
            string apiKey,
            string symbol,
            CancellationToken cancellationToken)
        {
            try
            {
                var url = $"quote?symbol={Uri.EscapeDataString(symbol)}&token={Uri.EscapeDataString(apiKey)}";

                using var resp = await client.GetAsync(url, cancellationToken);
                resp.EnsureSuccessStatusCode();

                await using var stream = await resp.Content.ReadAsStreamAsync(cancellationToken);
                var data = await JsonSerializer.DeserializeAsync<FinnhubQuoteResponse>(
                    stream,
                    _jsonOptions,
                    cancellationToken);

                if (data == null)
                    return null;

                DateTimeOffset? asOf = data.t > 0
                    ? DateTimeOffset.FromUnixTimeSeconds(data.t)
                    : null;

                return new FinnhubQuote(data.c, data.d, data.dp, asOf);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetQuoteAsync failed for symbol {Symbol}", symbol);
                return null;
            }
        }

        public async Task<IReadOnlyList<WatchlistItemDto>> GetWatchlistOverviewAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var items = await _investmentService.GetWatchlistAsync(userId, cancellationToken);
            if (items.Count == 0) return items;

            var apiKey = _configuration["Finnhub:ApiKey"];
            var hasFinnhub = !string.IsNullOrWhiteSpace(apiKey);
            if (!hasFinnhub)
            {
                return items;
            }

            var client = _httpClientFactory.CreateClient("Finnhub");

            var tasks = items.Select(async item =>
            {
                var symbol = (item.Symbol ?? string.Empty).Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(symbol))
                {
                    return item;
                }

                var quote = await GetQuoteDetailedAsync(client, apiKey!, symbol, cancellationToken);
                if (quote == null || quote.Price <= 0)
                {
                    return item;
                }

                item.LastPrice = quote.Price;
                item.DailyChange = quote.Change;
                item.DailyChangePercent = quote.ChangePercent;
                item.QuoteAsOfUtc = quote.AsOfUtc;
                return item;
            });

            return await Task.WhenAll(tasks);
        }

        private async Task<List<InvestmentNewsItemDto>> GetNewsAsync(
            HttpClient client,
            string apiKey,
            string symbol,
            string fromDate,
            string toDate,
            int maxNews,
            CancellationToken cancellationToken)
        {
            var result = new List<InvestmentNewsItemDto>();
            if (maxNews <= 0) return result;

            try
            {
                var url =
                    $"company-news?symbol={Uri.EscapeDataString(symbol)}&from={fromDate}&to={toDate}&token={Uri.EscapeDataString(apiKey)}";

                using var resp = await client.GetAsync(url, cancellationToken);
                resp.EnsureSuccessStatusCode();

                await using var stream = await resp.Content.ReadAsStreamAsync(cancellationToken);
                var items = await JsonSerializer.DeserializeAsync<List<FinnhubNewsItem>>(
                                stream,
                                _jsonOptions,
                                cancellationToken)
                            ?? new List<FinnhubNewsItem>();

                int count = 0;
                foreach (var item in items)
                {
                    if (count >= maxNews) break;
                    if (item == null) continue;

                    var dt = DateTimeOffset.FromUnixTimeSeconds(item.datetime);

                    result.Add(new InvestmentNewsItemDto
                    {
                        Id = item.id.HasValue && item.id.Value != 0
                            ? item.id.Value.ToString()
                            : $"{symbol}-{item.datetime}",
                        Headline = item.headline ?? "",
                        Source = item.source ?? "",
                        Datetime = dt,
                        Url = item.url ?? ""
                    });

                    count++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetNewsAsync failed for symbol {Symbol}", symbol);
            }

            return result;
        }

        private static string ResolveExchange(string? marketIdentifierCode)
        {
            if (string.IsNullOrWhiteSpace(marketIdentifierCode))
            {
                return "Plaid";
            }

            if (UsMarketIdentifierCodes.Contains(marketIdentifierCode))
            {
                return "US";
            }

            if (CanadianMarketIdentifierCodes.Contains(marketIdentifierCode))
            {
                return "CA";
            }

            return marketIdentifierCode.ToUpperInvariant();
        }

        private static string SecurityLookupKey(string itemId, string securityId) =>
            $"{itemId}|{securityId}";

        private class FinnhubQuoteResponse
        {
            public double c { get; set; }
            public double d { get; set; }
            public double dp { get; set; }
            public long t { get; set; }
        }

        private record FinnhubQuote(double Price, double Change, double ChangePercent, DateTimeOffset? AsOfUtc);

        private class FinnhubNewsItem
        {
            public long? id { get; set; }
            public string? headline { get; set; }
            public string? source { get; set; }
            public long datetime { get; set; }
            public string? url { get; set; }
        }
    }
}
