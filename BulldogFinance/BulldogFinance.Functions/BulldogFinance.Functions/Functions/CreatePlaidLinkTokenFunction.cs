using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class CreatePlaidLinkTokenFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidClient _plaidClient;

        public CreatePlaidLinkTokenFunction(IPlaidClient plaidClient)
        {
            _plaidClient = plaidClient;
        }

        [Function("CreatePlaidLinkToken")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/link-token")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            CreatePlaidLinkTokenRequest? requestModel = null;
            using (var reader = new StreamReader(req.Body))
            {
                var body = await reader.ReadToEndAsync();
                if (!string.IsNullOrWhiteSpace(body))
                {
                    requestModel = JsonSerializer.Deserialize<CreatePlaidLinkTokenRequest>(body, JsonOptions);
                }
            }

            var countryCodes = requestModel?.CountryCodes?.Length > 0 ? requestModel.CountryCodes : new[] { "CA" };
            var products = requestModel?.Products?.Length > 0 ? requestModel.Products : new[] { "transactions" };
            var result = await _plaidClient.CreateLinkTokenAsync(userId, countryCodes, products);

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(new CreatePlaidLinkTokenResponse
            {
                LinkToken = result.LinkToken,
                Expiration = result.Expiration
            }, JsonOptions));

            return response;
        }
    }
}
