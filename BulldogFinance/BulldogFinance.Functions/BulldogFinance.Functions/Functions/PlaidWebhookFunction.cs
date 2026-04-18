using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace BulldogFinance.Functions.Functions
{
    public class PlaidWebhookFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;
        private readonly string? _webhookSharedSecret;
        private readonly string _webhookSecretQueryParameter;

        public PlaidWebhookFunction(
            IPlaidRepository plaidRepository,
            IPlaidSyncService plaidSyncService,
            IConfiguration configuration)
        {
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
            _webhookSharedSecret = configuration["Plaid:WebhookSharedSecret"];
            _webhookSecretQueryParameter = configuration["Plaid:WebhookSecretQueryParameter"] ?? "secret";
        }

        [Function("PlaidWebhook")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/webhook")]
            HttpRequestData req)
        {
            if (!HasValidWebhookSecret(req))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("{\"ok\":false}");
                return unauthorized;
            }

            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (!string.IsNullOrWhiteSpace(body))
            {
                var payload = JsonSerializer.Deserialize<PlaidWebhookRequest>(body, JsonOptions);
                if (payload?.WebhookType == "TRANSACTIONS" &&
                    payload.WebhookCode == "SYNC_UPDATES_AVAILABLE" &&
                    !string.IsNullOrWhiteSpace(payload.ItemId))
                {
                    var item = await _plaidRepository.GetItemByItemIdAsync(payload.ItemId);
                    if (item != null)
                    {
                        await _plaidSyncService.SyncTransactionsAsync(item.PartitionKey, item.RowKey);
                    }
                }
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteStringAsync("{\"ok\":true}");
            return response;
        }

        private bool HasValidWebhookSecret(HttpRequestData req)
        {
            if (string.IsNullOrWhiteSpace(_webhookSharedSecret))
            {
                return true;
            }

            var providedSecret = GetQueryParameter(req.Url.Query, _webhookSecretQueryParameter);
            if (string.IsNullOrWhiteSpace(providedSecret) &&
                req.Headers.TryGetValues("X-Plaid-Webhook-Secret", out var headerValues))
            {
                providedSecret = headerValues.FirstOrDefault();
            }

            return FixedTimeEquals(providedSecret, _webhookSharedSecret);
        }

        private static string? GetQueryParameter(string query, string key)
        {
            var trimmed = query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return null;
            }

            foreach (var pair in trimmed.Split('&', System.StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split('=', 2, System.StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length != 2 || !string.Equals(parts[0], key, System.StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return System.Uri.UnescapeDataString(parts[1]);
            }

            return null;
        }

        private static bool FixedTimeEquals(string? left, string? right)
        {
            if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
            {
                return false;
            }

            var leftBytes = Encoding.UTF8.GetBytes(left);
            var rightBytes = Encoding.UTF8.GetBytes(right);
            return CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }
    }
}
