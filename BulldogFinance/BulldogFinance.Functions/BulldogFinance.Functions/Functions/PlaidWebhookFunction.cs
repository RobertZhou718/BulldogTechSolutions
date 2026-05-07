using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

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
        private readonly IPlaidInvestmentSyncService _plaidInvestmentSyncService;
        private readonly ILogger<PlaidWebhookFunction> _logger;
        private readonly string? _webhookSharedSecret;
        private readonly string _webhookSecretQueryParameter;

        public PlaidWebhookFunction(
            IPlaidRepository plaidRepository,
            IPlaidSyncService plaidSyncService,
            IPlaidInvestmentSyncService plaidInvestmentSyncService,
            ILogger<PlaidWebhookFunction> logger,
            IConfiguration configuration)
        {
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
            _plaidInvestmentSyncService = plaidInvestmentSyncService;
            _logger = logger;
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
                        await _plaidSyncService.RefreshBalancesAsync(item.PartitionKey, item.RowKey);
                    }
                }
                else if (payload?.WebhookType == "ITEM" &&
                         payload.WebhookCode == "ERROR" &&
                         !string.IsNullOrWhiteSpace(payload.ItemId))
                {
                    await HandleItemErrorAsync(payload.ItemId, payload.Error);
                }
                else if (payload?.WebhookType == "HOLDINGS" &&
                         payload.WebhookCode == "DEFAULT_UPDATE" &&
                         !string.IsNullOrWhiteSpace(payload.ItemId))
                {
                    await HandleInvestmentHoldingsUpdateAsync(payload.ItemId);
                }
                else if (payload?.WebhookType == "INVESTMENTS_TRANSACTIONS" &&
                         !string.IsNullOrWhiteSpace(payload.ItemId))
                {
                    await HandleInvestmentTransactionsUpdateAsync(
                        payload.ItemId,
                        payload.WebhookCode);
                }
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteStringAsync("{\"ok\":true}");
            return response;
        }

        private async Task HandleItemErrorAsync(string itemId, PlaidWebhookError? error)
        {
            var item = await _plaidRepository.GetItemByItemIdAsync(itemId);
            if (item == null || !string.Equals(item.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            item.Status = "ERROR";
            item.UpdatedAtUtc = DateTime.UtcNow;
            await _plaidRepository.UpsertItemAsync(item);

            _logger.LogWarning(
                "Plaid item marked as ERROR. ItemId={ItemId} UserId={UserId} ErrorCode={ErrorCode} ErrorMessage={ErrorMessage}",
                itemId,
                item.PartitionKey,
                error?.ErrorCode,
                error?.ErrorMessage);
        }

        private async Task HandleInvestmentHoldingsUpdateAsync(string itemId)
        {
            var item = await _plaidRepository.GetItemByItemIdAsync(itemId);
            if (item == null || !string.Equals(item.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            try
            {
                await _plaidInvestmentSyncService.SyncHoldingsAsync(item.PartitionKey, item.RowKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Plaid investment holdings webhook sync failed. ItemId={ItemId} UserId={UserId}",
                    itemId,
                    item.PartitionKey);
            }
        }

        private async Task HandleInvestmentTransactionsUpdateAsync(string itemId, string? webhookCode)
        {
            var item = await _plaidRepository.GetItemByItemIdAsync(itemId);
            if (item == null || !string.Equals(item.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var endUtc = DateTime.UtcNow.Date;
            var startUtc = string.Equals(webhookCode, "HISTORICAL_UPDATE", StringComparison.OrdinalIgnoreCase)
                ? endUtc.AddMonths(-24)
                : endUtc.AddDays(-30);

            try
            {
                await _plaidInvestmentSyncService.SyncInvestmentTransactionsAsync(
                    item.PartitionKey,
                    item.RowKey,
                    startUtc,
                    endUtc);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Plaid investment transactions webhook sync failed. ItemId={ItemId} UserId={UserId} WebhookCode={WebhookCode}",
                    itemId,
                    item.PartitionKey,
                    webhookCode);
            }
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
