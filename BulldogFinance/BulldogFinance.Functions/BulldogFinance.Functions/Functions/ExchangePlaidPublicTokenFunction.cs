using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Models.Users;
using BulldogFinance.Functions.Services.Plaid;
using BulldogFinance.Functions.Services.Users;
using Going.Plaid.Item;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class ExchangePlaidPublicTokenFunction
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidClientFactory _plaidClientFactory;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;
        private readonly IPlaidTokenProtector _tokenProtector;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<ExchangePlaidPublicTokenFunction> _logger;

        public ExchangePlaidPublicTokenFunction(
            IPlaidClientFactory plaidClientFactory,
            IPlaidRepository plaidRepository,
            IPlaidSyncService plaidSyncService,
            IPlaidTokenProtector tokenProtector,
            IUserRepository userRepository,
            ILogger<ExchangePlaidPublicTokenFunction> logger)
        {
            _plaidClientFactory = plaidClientFactory;
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
            _tokenProtector = tokenProtector;
            _userRepository = userRepository;
            _logger = logger;
        }

        [Function("ExchangePlaidPublicToken")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "plaid/exchange-public-token")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var userEmail = AuthHelper.GetUserEmail(req);

            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");

            ExchangePlaidPublicTokenRequest? requestModel;
            try
            {
                requestModel = JsonSerializer.Deserialize<ExchangePlaidPublicTokenRequest>(body, JsonOptions);
            }
            catch (JsonException)
            {
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");
            }

            if (requestModel == null || string.IsNullOrWhiteSpace(requestModel.PublicToken))
                return await ApiResponse.BadRequestAsync(req, "publicToken is required.");

            var exchangeClient = _plaidClientFactory.Create();
            var exchange = await exchangeClient.ItemPublicTokenExchangeAsync(new ItemPublicTokenExchangeRequest
            {
                PublicToken = requestModel.PublicToken
            });

            if (!exchange.IsSuccessStatusCode)
            {
                var detail = exchange.Error != null
                    ? $"{exchange.Error.ErrorType}/{exchange.Error.ErrorCode}: {exchange.Error.ErrorMessage}"
                    : exchange.RawJson ?? "Unknown error";
                return await ApiResponse.BadGatewayAsync(req,
                    $"Plaid API /item/public_token/exchange failed: {(int)exchange.StatusCode} {detail}");
            }

            var now = DateTime.UtcNow;
            var itemEntity = new PlaidItemEntity
            {
                PartitionKey = userId,
                RowKey = exchange.ItemId,
                AccessTokenEncrypted = _tokenProtector.Protect(exchange.AccessToken),
                InstitutionId = requestModel.InstitutionId,
                InstitutionName = requestModel.InstitutionName,
                Status = "ACTIVE",
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            await _plaidRepository.UpsertItemAsync(itemEntity);

            IReadOnlyList<BulldogFinance.Functions.Models.Accounts.AccountEntity> importedAccounts;

            try
            {
                importedAccounts = await _plaidSyncService.ImportAccountsAsync(
                    userId,
                    exchange.ItemId,
                    exchange.AccessToken,
                    requestModel.InstitutionName);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to import Plaid accounts after token exchange. Rolling back item. UserId={UserId} ItemId={ItemId}",
                    userId,
                    exchange.ItemId);

                try
                {
                    await _plaidRepository.DeleteItemAsync(userId, exchange.ItemId);
                }
                catch (Exception rollbackEx)
                {
                    _logger.LogError(
                        rollbackEx,
                        "Rollback failed. Orphaned item may remain. UserId={UserId} ItemId={ItemId}",
                        userId,
                        exchange.ItemId);
                }

                return await ApiResponse.BadGatewayAsync(req, "Failed to import accounts from Plaid. The connection has been rolled back.");
            }

            var syncSummary = new PlaidSyncSummary();

            try
            {
                await _plaidSyncService.RefreshBalancesAsync(userId, exchange.ItemId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Plaid balance refresh failed after linking; accounts remain connected and user can retry. UserId={UserId} ItemId={ItemId}",
                    userId,
                    exchange.ItemId);
            }

            try
            {
                syncSummary = await _plaidSyncService.SyncTransactionsAsync(userId, exchange.ItemId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Plaid transactions sync failed after linking; accounts remain connected and user can retry. UserId={UserId} ItemId={ItemId}",
                    userId,
                    exchange.ItemId);
            }

            try
            {
                var existingUser = await _userRepository.GetUserAsync(userId);
                var profile = existingUser ?? new UserEntity
                {
                    PartitionKey = userId,
                    RowKey = "PROFILE",
                    CreatedAtUtc = now
                };
                if (!string.IsNullOrWhiteSpace(userEmail))
                {
                    profile.Email = userEmail;
                }
                profile.DefaultCurrency ??= importedAccounts.Count > 0 ? importedAccounts[0].Currency : "CAD";
                profile.OnboardingDone = true;
                profile.UpdatedAtUtc = now;
                await _userRepository.UpsertUserAsync(profile);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to update user profile after Plaid link; accounts remain connected. UserId={UserId} ItemId={ItemId}",
                    userId,
                    exchange.ItemId);
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(new ExchangePlaidPublicTokenResponse
            {
                ItemId = exchange.ItemId,
                AccountsConnected = importedAccounts.Count,
                TransactionsAdded = syncSummary.Added,
                TransactionsModified = syncSummary.Modified,
                TransactionsRemoved = syncSummary.Removed
            }, JsonOptions));

            return response;
        }
    }
}
