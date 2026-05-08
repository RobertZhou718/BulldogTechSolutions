using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Link;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class CreatePlaidLinkTokenFunction
    {
        private readonly IPlaidClientFactory _plaidClientFactory;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidTokenProtector _tokenProtector;

        public CreatePlaidLinkTokenFunction(
            IPlaidClientFactory plaidClientFactory,
            IPlaidRepository plaidRepository,
            IPlaidTokenProtector tokenProtector)
        {
            _plaidClientFactory = plaidClientFactory;
            _plaidRepository = plaidRepository;
            _tokenProtector = tokenProtector;
        }

        [Function("CreatePlaidLinkToken")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/link-token")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            // Body is optional; defaults apply when absent.
            var body = await req.ReadJsonBodyAsync<CreatePlaidLinkTokenRequest>();
            if (body.IsInvalid)
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");

            var requestModel = body.Value;

            var countryCodes = (requestModel?.CountryCodes?.Length > 0 ? requestModel.CountryCodes : new[] { "CA", "US" })
                .Select(ParseCountryCode).ToArray();
            var user = new LinkTokenCreateRequestUser
            {
                ClientUserId = userId
            };

            LinkTokenCreateRequest plaidRequest;
            var updateItemId = requestModel?.ItemId?.Trim();
            if (!string.IsNullOrWhiteSpace(updateItemId))
            {
                var item = await _plaidRepository.GetItemAsync(userId, updateItemId);
                if (item == null)
                {
                    return await ApiResponse.NotFoundAsync(req, "Plaid item not found.");
                }

                plaidRequest = new LinkTokenCreateRequest
                {
                    ClientName = "Bulldog Finance",
                    Language = Language.English,
                    CountryCodes = countryCodes,
                    User = user,
                    AccessToken = _tokenProtector.Unprotect(item.AccessTokenEncrypted)
                };
            }
            else
            {
                var products = (requestModel?.Products?.Length > 0 ? requestModel.Products : new[] { "transactions" })
                    .Select(ParseProduct).ToArray();
                var additionalConsentedProducts = (requestModel?.AdditionalConsentedProducts?.Length > 0
                        ? requestModel.AdditionalConsentedProducts
                        : new[] { "investments" })
                    .Select(ParseProduct)
                    .Where(product => !products.Contains(product))
                    .ToArray();

                plaidRequest = new LinkTokenCreateRequest
                {
                    ClientName = "Bulldog Finance",
                    Language = Language.English,
                    CountryCodes = countryCodes,
                    Products = products,
                    AdditionalConsentedProducts = additionalConsentedProducts,
                    User = user
                };
            }

            var plaidClient = _plaidClientFactory.Create();
            var result = await plaidClient.LinkTokenCreateAsync(plaidRequest);

            if (!result.IsSuccessStatusCode)
            {
                throw new PlaidApiException("/link/token/create", result.StatusCode, result.Error, result.RawJson);
            }

            return await ApiResponse.OkAsync(req, new CreatePlaidLinkTokenResponse
            {
                LinkToken = result.LinkToken,
                Expiration = result.Expiration.UtcDateTime
            });
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
