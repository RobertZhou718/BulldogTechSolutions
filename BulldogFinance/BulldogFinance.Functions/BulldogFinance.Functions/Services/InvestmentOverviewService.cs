using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services
{
    public class InvestmentOverviewService : IInvestmentOverviewService
    {
        private readonly IInvestmentService _investmentService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<InvestmentOverviewService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public InvestmentOverviewService(
            IInvestmentService investmentService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<InvestmentOverviewService> logger)
        {
            _investmentService = investmentService;
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
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException("Finnhub:ApiKey is not configured.");
            }

            int maxSymbolsPerUser = GetInt("Finnhub:MaxSymbolsPerUser", 10);
            int maxNewsPerSymbol = GetInt("Finnhub:MaxNewsPerSymbol", 3);
            int newsDays = GetInt("Finnhub:NewsDays", 3);

            var client = _httpClientFactory.CreateClient("Finnhub");

            var overview = new InvestmentOverviewDto();

            // 1) 从 InvestmentService 拿持仓
            var holdings = await _investmentService.GetInvestmentsForUserAsync(userId, cancellationToken);

            var today = DateTime.UtcNow.Date;
            var fromDate = today.AddDays(-newsDays);
            var fromStr = fromDate.ToString("yyyy-MM-dd");
            var toStr = today.ToString("yyyy-MM-dd");

            if (holdings.Count > 0)
            {
                // 对当前用户持仓做聚合
                var symbols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var h in holdings)
                {
                    if (!string.IsNullOrWhiteSpace(h.Symbol))
                    {
                        symbols.Add(h.Symbol.Trim().ToUpperInvariant());
                    }
                }

                var symbolList = new List<string>(symbols);
                if (symbolList.Count > maxSymbolsPerUser)
                {
                    symbolList = symbolList.GetRange(0, maxSymbolsPerUser);
                }

                foreach (var h in holdings)
                {
                    if (string.IsNullOrWhiteSpace(h.Symbol)) continue;
                    var symbol = h.Symbol.Trim().ToUpperInvariant();
                    if (!symbolList.Contains(symbol, StringComparer.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var (price, changePercent) =
                        await GetQuoteAsync(client, apiKey, symbol, cancellationToken);

                    var news = await GetNewsAsync(
                        client,
                        apiKey,
                        symbol,
                        fromStr,
                        toStr,
                        maxNewsPerSymbol,
                        cancellationToken);

                    var marketValue = h.Quantity * price;
                    var costValue = h.Quantity * h.AvgCost;
                    double unrealizedPnL = 0;
                    double unrealizedPnLPercent = 0;

                    if (costValue > 1e-8)
                    {
                        unrealizedPnL = marketValue - costValue;
                        unrealizedPnLPercent = unrealizedPnL / costValue * 100.0;
                    }

                    overview.Holdings.Add(new InvestmentHoldingOverviewDto
                    {
                        Symbol = symbol,
                        Exchange = h.Exchange,
                        Quantity = h.Quantity,
                        AvgCost = h.AvgCost,
                        Currency = h.Currency,
                        CurrentPrice = price,
                        ChangePercent = changePercent,
                        MarketValue = marketValue,
                        UnrealizedPnL = unrealizedPnL,
                        UnrealizedPnLPercent = unrealizedPnLPercent,
                        News = news
                    });
                }
            }
            else
            {
                // 2) 没有持仓，用 PopularSymbols
                var popularStr = _configuration["Finnhub:PopularSymbols"]
                                 ?? "AAPL,MSFT,NVDA,TSLA,GOOGL,AMZN";

                var popularSymbols = popularStr.Split(
                    ',',
                    StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

                int count = 0;
                foreach (var s in popularSymbols)
                {
                    if (count >= maxSymbolsPerUser) break;
                    var symbol = s.ToUpperInvariant();
                    count++;

                    var (price, changePercent) =
                        await GetQuoteAsync(client, apiKey, symbol, cancellationToken);

                    var news = await GetNewsAsync(
                        client,
                        apiKey,
                        symbol,
                        fromStr,
                        toStr,
                        maxNewsPerSymbol,
                        cancellationToken);

                    overview.Popular.Add(new SymbolOverviewDto
                    {
                        Symbol = symbol,
                        Exchange = "US",
                        CurrentPrice = price,
                        ChangePercent = changePercent,
                        News = news
                    });
                }
            }

            return overview;
        }

        private int GetInt(string key, int defaultValue)
        {
            if (int.TryParse(_configuration[key], out var val))
            {
                return val;
            }
            return defaultValue;
        }

        // === /quote ===
        private async Task<(double price, double changePercent)> GetQuoteAsync(
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
                    return (0, 0);

                return (data.c, data.dp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetQuoteAsync failed for symbol {Symbol}", symbol);
                return (0, 0);
            }
        }

        // === /company-news ===
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
                        Id = item.id != 0 ? item.id.ToString() : $"{symbol}-{item.datetime}",
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

        // === 内部类型 ===
        private class FinnhubQuoteResponse
        {
            public double c { get; set; }   // current price
            public double dp { get; set; }  // percent change
        }

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
