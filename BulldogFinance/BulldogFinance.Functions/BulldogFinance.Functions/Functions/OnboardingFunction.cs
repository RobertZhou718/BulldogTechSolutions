using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Models.Users;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Transactions;
using BulldogFinance.Functions.Services.Users;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class OnboardingFunction
    {
        private readonly IUserRepository _userRepository;
        private readonly IAccountRepository _accountRepository;
        private readonly ITransactionRepository _transactionRepository;

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
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var userEmail = AuthHelper.GetUserEmail(req);

            var body = await req.ReadJsonBodyAsync<OnboardingRequest>();
            if (body.IsEmpty)
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");
            if (body.IsInvalid || body.Value is null)
                return await ApiResponse.BadRequestAsync(req, "Invalid request body.");

            var request = body.Value;

            var defaultCurrency = string.IsNullOrWhiteSpace(request.DefaultCurrency)
                ? "CAD"
                : request.DefaultCurrency!.Trim().ToUpperInvariant();

            var existingUser = await _userRepository.GetUserAsync(userId);
            var accounts = request.Accounts ?? new List<OnboardingAccountInput>();

            var now = DateTime.UtcNow;
            var responseModel = new OnboardingResponse
            {
                Success = true,
                DefaultCurrency = defaultCurrency
            };

            int sortOrder = 0;

            foreach (var acc in accounts)
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

            userEntity.Email = userEmail;
            userEntity.DefaultCurrency = defaultCurrency;
            userEntity.OnboardingDone = true;
            userEntity.UpdatedAtUtc = now;

            await _userRepository.UpsertUserAsync(userEntity);

            return await ApiResponse.OkAsync(req, responseModel);
        }
    }
}
