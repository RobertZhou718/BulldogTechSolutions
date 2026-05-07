using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Investments;
using BulldogFinance.Functions.Services.Investments;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class GetInvestmentActivityFunction
    {
        private readonly IPlaidInvestmentRepository _plaidInvestmentRepository;

        public GetInvestmentActivityFunction(IPlaidInvestmentRepository plaidInvestmentRepository)
        {
            _plaidInvestmentRepository = plaidInvestmentRepository;
        }

        [Function("GetInvestmentActivity")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "investments/activity")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var query = QueryHelper.Parse(req);
            var limit = query.GetInt("limit", 50, 1, 200);
            var cursor = query.GetString("cursor");
            var endUtc = DateTime.UtcNow.Date.AddDays(1);
            var startUtc = endUtc.AddDays(-query.GetInt("days", 90, 1, 730));

            var securities = await _plaidInvestmentRepository.GetSecuritiesAsync(userId);
            var securityByKey = securities
                .GroupBy(x => $"{x.ItemId}|{x.SecurityId}", StringComparer.Ordinal)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.Ordinal);

            var page = await _plaidInvestmentRepository.GetTransactionsPageAsync(
                userId,
                startUtc,
                endUtc,
                limit,
                cursor);

            return await ApiResponse.OkAsync(req, new
            {
                items = page.Items.Select(transaction => ToDto(transaction, securityByKey)).ToList(),
                nextCursor = page.NextCursor,
                hasMore = page.HasMore
            });
        }

        private static InvestmentActivityDto ToDto(
            PlaidInvestmentTransactionEntity transaction,
            IReadOnlyDictionary<string, PlaidInvestmentSecurityEntity> securityByKey)
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
        }
    }
}
