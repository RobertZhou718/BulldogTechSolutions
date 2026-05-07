using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Services.Investments;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class GetInvestmentActivityFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidInvestmentRepository _plaidInvestmentRepository;

        public GetInvestmentActivityFunction(IPlaidInvestmentRepository plaidInvestmentRepository)
        {
            _plaidInvestmentRepository = plaidInvestmentRepository;
        }

        [Function("GetInvestmentActivity")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "investments/activity")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var limit = ReadIntQuery(req.Url.Query, "limit", 50, 1, 200);
            var endUtc = DateTime.UtcNow.Date.AddDays(1);
            var startUtc = endUtc.AddDays(-ReadIntQuery(req.Url.Query, "days", 90, 1, 730));

            var transactions = await _plaidInvestmentRepository.GetTransactionsAsync(
                userId,
                startUtc,
                endUtc);
            var securities = await _plaidInvestmentRepository.GetSecuritiesAsync(userId);
            var securityByKey = securities
                .GroupBy(x => $"{x.ItemId}|{x.SecurityId}", StringComparer.Ordinal)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.Ordinal);

            var items = transactions
                .Take(limit)
                .Select(transaction =>
                {
                    PlaidInvestmentSecurityEntity? security = null;
                    if (!string.IsNullOrWhiteSpace(transaction.SecurityId))
                    {
                        securityByKey.TryGetValue(
                            $"{transaction.ItemId}|{transaction.SecurityId}",
                            out security);
                    }

                    return new InvestmentActivityDto
                    {
                        TransactionId = transaction.InvestmentTransactionId,
                        DateUtc = transaction.TransactionDatetimeUtc ?? transaction.DateUtc,
                        Type = transaction.Type,
                        Subtype = transaction.Subtype,
                        Name = transaction.Name,
                        Symbol = security?.TickerSymbol,
                        SecurityName = security?.Name,
                        AccountName = transaction.AccountName,
                        InstitutionName = transaction.InstitutionName,
                        Quantity = transaction.Quantity,
                        Amount = transaction.Amount,
                        Price = transaction.Price,
                        Fees = transaction.Fees,
                        Currency = transaction.Currency
                    };
                })
                .ToList();

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(items, JsonOptions));
            return response;
        }

        private static int ReadIntQuery(
            string query,
            string key,
            int defaultValue,
            int min,
            int max)
        {
            var trimmed = query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return defaultValue;
            }

            foreach (var pair in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split('=', 2);
                if (parts.Length != 2 ||
                    !string.Equals(parts[0], key, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (int.TryParse(Uri.UnescapeDataString(parts[1]), out var value))
                {
                    return Math.Clamp(value, min, max);
                }
            }

            return defaultValue;
        }
    }
}
