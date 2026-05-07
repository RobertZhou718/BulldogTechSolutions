using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Link;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace BulldogFinance.Functions.Functions
{
    public class CreatePlaidLinkTokenFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidClientFactory _plaidClientFactory;
        private readonly string? _webhookUrl;

        public CreatePlaidLinkTokenFunction(
            IPlaidClientFactory plaidClientFactory,
            IConfiguration configuration)
        {
            _plaidClientFactory = plaidClientFactory;
            _webhookUrl = configuration["Plaid:WebhookUrl"];
        }

        [Function("CreatePlaidLinkToken")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/link-token")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            CreatePlaidLinkTokenRequest? requestModel = null;
            using (var reader = new StreamReader(req.Body))
            {
                var body = await reader.ReadToEndAsync();
                if (!string.IsNullOrWhiteSpace(body))
                {
                    requestModel = JsonSerializer.Deserialize<CreatePlaidLinkTokenRequest>(body, JsonOptions);
                }
            }

            var countryCodes = (requestModel?.CountryCodes?.Length > 0 ? requestModel.CountryCodes : new[] { "CA", "US" })
                .Select(ParseCountryCode).ToArray();
            var products = (requestModel?.Products?.Length > 0 ? requestModel.Products : new[] { "transactions" })
                .Select(ParseProduct).ToArray();
            var additionalConsentedProducts = (requestModel?.AdditionalConsentedProducts?.Length > 0
                    ? requestModel.AdditionalConsentedProducts
                    : new[] { "investments" })
                .Select(ParseProduct)
                .Where(product => !products.Contains(product))
                .ToArray();

            var plaidRequest = new LinkTokenCreateRequest
            {
                ClientName = "Bulldog Finance",
                Language = Language.English,
                CountryCodes = countryCodes,
                Products = products,
                AdditionalConsentedProducts = additionalConsentedProducts,
                User = new LinkTokenCreateRequestUser
                {
                    ClientUserId = userId
                }
            };

            if (!string.IsNullOrWhiteSpace(_webhookUrl))
            {
                plaidRequest.Webhook = _webhookUrl;
            }

            var plaidClient = _plaidClientFactory.Create();
            var result = await plaidClient.LinkTokenCreateAsync(plaidRequest);

            if (!result.IsSuccessStatusCode)
            {
                var detail = result.Error != null
                    ? $"{result.Error.ErrorType}/{result.Error.ErrorCode}: {result.Error.ErrorMessage}"
                    : result.RawJson ?? "Unknown error";
                throw new InvalidOperationException(
                    $"Plaid API /link/token/create failed: {(int)result.StatusCode} {detail}");
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(new CreatePlaidLinkTokenResponse
            {
                LinkToken = result.LinkToken,
                Expiration = result.Expiration.UtcDateTime
            }, JsonOptions));

            return response;
        }

        private static CountryCode ParseCountryCode(string value) =>
            Enum.TryParse<CountryCode>(value, ignoreCase: true, out var parsed)
                ? parsed
                : throw new ArgumentException($"Unsupported Plaid country code '{value}'.");

        private static Products ParseProduct(string value) =>
            Enum.TryParse<Products>(value, ignoreCase: true, out var parsed)
                ? parsed
                : throw new ArgumentException($"Unsupported Plaid product '{value}'.");
    }
}
