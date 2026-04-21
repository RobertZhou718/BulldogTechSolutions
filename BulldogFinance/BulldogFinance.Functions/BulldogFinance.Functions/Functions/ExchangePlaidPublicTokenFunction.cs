using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Models.Users;
using BulldogFinance.Functions.Services.Plaid;
using BulldogFinance.Functions.Services.Users;
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

        private readonly IPlaidClient _plaidClient;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;
        private readonly IPlaidTokenProtector _tokenProtector;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<ExchangePlaidPublicTokenFunction> _logger;

        public ExchangePlaidPublicTokenFunction(
            IPlaidClient plaidClient,
            IPlaidRepository plaidRepository,
            IPlaidSyncService plaidSyncService,
            IPlaidTokenProtector tokenProtector,
            IUserRepository userRepository,
            ILogger<ExchangePlaidPublicTokenFunction> logger)
        {
            _plaidClient = plaidClient;
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

            var exchange = await _plaidClient.ExchangePublicTokenAsync(requestModel.PublicToken);
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
            PlaidSyncSummary syncSummary;

            try
            {
                importedAccounts = await _plaidSyncService.ImportAccountsAsync(
                    userId,
                    exchange.ItemId,
                    exchange.AccessToken,
                    requestModel.InstitutionName);
                await _plaidSyncService.RefreshBalancesAsync(userId, exchange.ItemId);
                syncSummary = await _plaidSyncService.SyncTransactionsAsync(userId, exchange.ItemId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Plaid setup failed after token exchange. Rolling back item. UserId={UserId} ItemId={ItemId}",
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

            var existingUser = await _userRepository.GetUserAsync(userId);
            var profile = existingUser ?? new UserEntity
            {
                PartitionKey = userId,
                RowKey = "PROFILE",
                CreatedAtUtc = now
            };
            profile.DefaultCurrency ??= importedAccounts.Count > 0 ? importedAccounts[0].Currency : "CAD";
            profile.OnboardingDone = true;
            profile.UpdatedAtUtc = now;
            await _userRepository.UpsertUserAsync(profile);

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
