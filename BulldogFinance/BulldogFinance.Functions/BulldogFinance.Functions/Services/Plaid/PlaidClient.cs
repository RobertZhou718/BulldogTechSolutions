using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Plaid;
using Microsoft.Extensions.Configuration;

namespace BulldogFinance.Functions.Services.Plaid
{
    public class PlaidClient : IPlaidClient
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _clientId;
        private readonly string _secret;
        private readonly string? _webhookUrl;

        public PlaidClient(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _clientId = configuration["Plaid:ClientId"] ?? throw new InvalidOperationException("Plaid:ClientId is required.");
            _secret = configuration["Plaid:Secret"] ?? throw new InvalidOperationException("Plaid:Secret is required.");
            _webhookUrl = configuration["Plaid:WebhookUrl"];
        }

        public Task<PlaidLinkTokenResult> CreateLinkTokenAsync(
            string userId,
            IReadOnlyList<string> countryCodes,
            IReadOnlyList<string> products,
            CancellationToken cancellationToken = default)
        {
            var payload = new JsonObject
            {
                ["client_name"] = "Bulldog Finance",
                ["language"] = "en",
                ["country_codes"] = JsonSerializer.SerializeToNode(countryCodes),
                ["products"] = JsonSerializer.SerializeToNode(products),
                ["user"] = new JsonObject
                {
                    ["client_user_id"] = userId
                }
            };

            if (!string.IsNullOrWhiteSpace(_webhookUrl))
            {
                payload["webhook"] = _webhookUrl;
            }

            return PostAsync<PlaidLinkTokenResult>("/link/token/create", payload, cancellationToken);
        }

        public Task<PlaidPublicTokenExchangeResult> ExchangePublicTokenAsync(
            string publicToken,
            CancellationToken cancellationToken = default)
        {
            var payload = new JsonObject
            {
                ["public_token"] = publicToken
            };

            return PostAsync<PlaidPublicTokenExchangeResult>("/item/public_token/exchange", payload, cancellationToken);
        }

        public Task<PlaidAccountsGetResult> GetAccountsAsync(string accessToken, CancellationToken cancellationToken = default)
        {
            var payload = new JsonObject
            {
                ["access_token"] = accessToken
            };

            return PostAsync<PlaidAccountsGetResult>("/accounts/get", payload, cancellationToken);
        }

        public Task<PlaidBalanceGetResult> GetBalancesAsync(string accessToken, CancellationToken cancellationToken = default)
        {
            var payload = new JsonObject
            {
                ["access_token"] = accessToken
            };

            return PostAsync<PlaidBalanceGetResult>("/accounts/balance/get", payload, cancellationToken);
        }

        public Task<PlaidTransactionsSyncResult> SyncTransactionsAsync(
            string accessToken,
            string? cursor,
            CancellationToken cancellationToken = default)
        {
            var payload = new JsonObject
            {
                ["access_token"] = accessToken
            };

            if (!string.IsNullOrWhiteSpace(cursor))
            {
                payload["cursor"] = cursor;
            }

            return PostAsync<PlaidTransactionsSyncResult>("/transactions/sync", payload, cancellationToken);
        }

        public async Task RemoveItemAsync(string accessToken, CancellationToken cancellationToken = default)
        {
            var payload = new JsonObject
            {
                ["access_token"] = accessToken
            };

            await PostAsync<PlaidRemoveItemResult>("/item/remove", payload, cancellationToken);
        }

        private async Task<T> PostAsync<T>(string path, JsonObject payload, CancellationToken cancellationToken)
        {
            payload["client_id"] = _clientId;
            payload["secret"] = _secret;

            var client = _httpClientFactory.CreateClient("Plaid");
            using var request = new HttpRequestMessage(HttpMethod.Post, path)
            {
                Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json")
            };

            using var response = await client.SendAsync(request, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Plaid API {path} failed: {(int)response.StatusCode} {json}");
            }

            var result = JsonSerializer.Deserialize<T>(json, JsonOptions);
            if (result == null)
            {
                throw new InvalidOperationException($"Plaid API {path} returned an empty response.");
            }

            return result;
        }
    }
}
