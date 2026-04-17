using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Models.Users;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Transactions;
using BulldogFinance.Functions.Services.Users;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Functions
{
    public class OnboardingFunction
    {
        private readonly IUserRepository _userRepository;
        private readonly IAccountRepository _accountRepository;
        private readonly ITransactionRepository _transactionRepository;

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        public OnboardingFunction(
            IUserRepository userRepository,
            IAccountRepository accountRepository,
            ITransactionRepository transactionRepository)
        {
            _userRepository = userRepository;
            _accountRepository = accountRepository;
            _transactionRepository = transactionRepository;
        }

        [Function("Onboarding")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "onboarding")]
            HttpRequestData req,
            FunctionContext context)
        {
            // The current auth flow still reads the user id from headers until token subject wiring is in place.
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Request body is empty.");
                return bad;
            }

            OnboardingRequest? request;
            try
            {
                request = JsonSerializer.Deserialize<OnboardingRequest>(body, JsonOptions);
            }
            catch (JsonException)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Invalid JSON.");
                return bad;
            }

            if (request == null || request.Accounts == null || request.Accounts.Count == 0)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("At least one account is required.");
                return bad;
            }

            var defaultCurrency = string.IsNullOrWhiteSpace(request.DefaultCurrency)
                ? "CAD"
                : request.DefaultCurrency!.Trim().ToUpperInvariant();

            var existingUser = await _userRepository.GetUserAsync(userId);
            if (existingUser?.OnboardingDone == true)
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteStringAsync("Onboarding already completed for this user.");
                return conflict;
            }

            var now = DateTime.UtcNow;
            var responseModel = new OnboardingResponse
            {
                Success = true,
                DefaultCurrency = defaultCurrency
            };

            int sortOrder = 0;

            foreach (var acc in request.Accounts)
            {
                if (string.IsNullOrWhiteSpace(acc.Name))
                {
                    continue;
                }

                var accountId = Guid.NewGuid().ToString("N");
                var currency = string.IsNullOrWhiteSpace(acc.Currency)
                    ? defaultCurrency
                    : acc.Currency!.Trim().ToUpperInvariant();

                // Store balances as whole cents to match the persisted account and transaction schema.
                var amountCents = (long)decimal.Round(
                    acc.InitialBalance * 100m,
                    0,
                    MidpointRounding.AwayFromZero);

                var accountEntity = new AccountEntity
                {
                    PartitionKey = userId,
                    RowKey = accountId,
                    Name = acc.Name.Trim(),
                    Type = string.IsNullOrWhiteSpace(acc.Type) ? "cash" : acc.Type.Trim(),
                    Currency = currency,
                    CurrentBalanceCents = amountCents,
                    IsArchived = false,
                    SortOrder = sortOrder++,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };

                await _accountRepository.CreateAccountAsync(accountEntity);

                // Seed the opening balance with a system-generated INIT transaction.
                if (amountCents != 0)
                {
                    var transactionId = Guid.NewGuid().ToString("N");

                    var transactionEntity = new TransactionEntity
                    {
                        PartitionKey = userId,
                        RowKey = transactionId,
                        AccountId = accountId,
                        Type = "INIT",
                        AmountCents = amountCents,
                        Currency = currency,
                        Category = "Initial",
                        Note = "Initial balance",
                        OccurredAtUtc = now,
                        CreatedAtUtc = now,
                        UpdatedAtUtc = now,
                        IsDeleted = false,
                        IsSystemGenerated = true
                    };

                    await _transactionRepository.CreateTransactionAsync(transactionEntity);
                }

                responseModel.Accounts.Add(new OnboardingAccountResponse
                {
                    AccountId = accountId,
                    Name = accountEntity.Name,
                    Type = accountEntity.Type,
                    Currency = accountEntity.Currency,
                    CurrentBalance = amountCents / 100m
                });
            }

            var userEntity = existingUser ?? new UserEntity
            {
                PartitionKey = userId,
                RowKey = "PROFILE",
                CreatedAtUtc = now
            };

            userEntity.DefaultCurrency = defaultCurrency;
            userEntity.OnboardingDone = true;
            userEntity.UpdatedAtUtc = now;

            await _userRepository.UpsertUserAsync(userEntity);

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");

            await response.WriteStringAsync(
                JsonSerializer.Serialize(responseModel));

            return response;
        }
    }
}
