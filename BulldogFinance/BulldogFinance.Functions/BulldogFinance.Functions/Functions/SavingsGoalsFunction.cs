using System.Net;
using System.Text.Json;
using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.SavingsGoals;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.SavingsGoals;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class SavingsGoalsFunction
    {
        private static readonly TimeSpan InitialConfigEditWindow = TimeSpan.FromHours(24);
        private static readonly TimeSpan ConfigEditCooldown = TimeSpan.FromDays(30);
        private static readonly string[] DefaultIncludedAccountTypes = ["cash", "bank"];

        private readonly ISavingsGoalRepository _savingsGoalRepository;
        private readonly IAccountRepository _accountRepository;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public SavingsGoalsFunction(
            ISavingsGoalRepository savingsGoalRepository,
            IAccountRepository accountRepository)
        {
            _savingsGoalRepository = savingsGoalRepository;
            _accountRepository = accountRepository;
        }

        [Function("GetSavingsGoals")]
        public async Task<HttpResponseData> GetAll(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "savings-goals")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived: false);
            var goals = await _savingsGoalRepository.GetSavingsGoalsAsync(userId);
            var dtoList = goals
                .OrderByDescending(g => g.CreatedAtUtc)
                .Select(g => ToDto(g, accounts))
                .ToList();

            return await JsonAsync(req, HttpStatusCode.OK, dtoList);
        }

        [Function("GetActiveSavingsGoal")]
        public async Task<HttpResponseData> GetActive(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "savings-goals/active")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var goal = await _savingsGoalRepository.GetActiveSavingsGoalAsync(userId);
            if (goal == null)
                return await ApiResponse.NotFoundAsync(req, "No active savings goal found.");

            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived: false);
            return await JsonAsync(req, HttpStatusCode.OK, ToDto(goal, accounts));
        }

        [Function("CreateSavingsGoal")]
        public async Task<HttpResponseData> Create(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "savings-goals")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var requestModel = await ReadJsonAsync<SavingsGoalCreateRequest>(req);
            if (requestModel == null)
                return await ApiResponse.BadRequestAsync(req, "Invalid or empty request body.");

            var validationError = ValidateCreateRequest(requestModel);
            if (validationError != null)
                return await ApiResponse.BadRequestAsync(req, validationError);

            var activeGoal = await _savingsGoalRepository.GetActiveSavingsGoalAsync(userId);
            if (activeGoal != null)
                return await ApiResponse.ConflictAsync(req, "An active savings goal already exists.");

            var now = DateTime.UtcNow;
            var currency = NormalizeCurrency(requestModel.Currency);
            var mode = NormalizeMode(requestModel.Mode);
            var includedAccountIds = NormalizeStringArray(requestModel.IncludedAccountIds);
            var includedAccountTypes = NormalizeStringArray(requestModel.IncludedAccountTypes, lowerCase: true);

            if (includedAccountIds.Length == 0 && includedAccountTypes.Length == 0)
            {
                includedAccountTypes = DefaultIncludedAccountTypes;
            }

            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived: false);
            validationError = ValidateIncludedAccounts(accounts, includedAccountIds, currency);
            if (validationError != null)
                return await ApiResponse.BadRequestAsync(req, validationError);

            var baselineAmountCents = CalculateCurrentAmountCents(
                accounts,
                currency,
                includedAccountIds,
                includedAccountTypes);
            var targetAmountCents = ToCents(requestModel.TargetAmount);
            validationError = ValidateTargetAmountAgainstCurrentBalance(
                mode,
                targetAmountCents,
                baselineAmountCents,
                currency);
            if (validationError != null)
                return await ApiResponse.BadRequestAsync(req, validationError);

            var goal = new SavingsGoalEntity
            {
                PartitionKey = userId,
                RowKey = Guid.NewGuid().ToString("N"),
                Name = requestModel.Name.Trim(),
                TargetAmountCents = targetAmountCents,
                Currency = currency,
                Mode = mode,
                BaselineAmountCents = baselineAmountCents,
                IncludedAccountIdsJson = JsonSerializer.Serialize(includedAccountIds, JsonOptions),
                IncludedAccountTypesJson = JsonSerializer.Serialize(includedAccountTypes, JsonOptions),
                Status = SavingsGoalStatuses.Active,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                ConfigEditCount = 0
            };

            await _savingsGoalRepository.CreateSavingsGoalAsync(goal);

            return await JsonAsync(req, HttpStatusCode.OK, new CreateSavingsGoalResponse
            {
                Goal = ToDto(goal, accounts)
            });
        }

        [Function("UpdateSavingsGoal")]
        public async Task<HttpResponseData> Update(
            [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "savings-goals/{goalId}")]
            HttpRequestData req,
            string goalId)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var requestModel = await ReadJsonAsync<SavingsGoalUpdateRequest>(req);
            if (requestModel == null)
                return await ApiResponse.BadRequestAsync(req, "Invalid or empty request body.");

            var goal = await _savingsGoalRepository.GetSavingsGoalAsync(userId, goalId);
            if (goal == null)
                return await ApiResponse.NotFoundAsync(req, "Savings goal not found.");

            if (!string.Equals(goal.Status, SavingsGoalStatuses.Active, StringComparison.OrdinalIgnoreCase))
                return await ApiResponse.ConflictAsync(req, "Only active savings goals can be updated.");

            var now = DateTime.UtcNow;
            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived: false);
            var includedAccountIds = ParseJsonArray(goal.IncludedAccountIdsJson);
            var includedAccountTypes = ParseJsonArray(goal.IncludedAccountTypesJson);
            var configChanged = false;

            if (requestModel.Name != null)
            {
                if (string.IsNullOrWhiteSpace(requestModel.Name))
                    return await ApiResponse.BadRequestAsync(req, "Goal name is required.");

                goal.Name = requestModel.Name.Trim();
            }

            if (requestModel.TargetAmount.HasValue)
            {
                if (requestModel.TargetAmount.Value <= 0)
                    return await ApiResponse.BadRequestAsync(req, "Target amount must be greater than zero.");

                var targetAmountCents = ToCents(requestModel.TargetAmount.Value);
                if (targetAmountCents != goal.TargetAmountCents)
                {
                    goal.TargetAmountCents = targetAmountCents;
                    configChanged = true;
                }
            }

            if (requestModel.Currency != null)
            {
                var currency = NormalizeCurrency(requestModel.Currency);
                if (!string.Equals(currency, goal.Currency, StringComparison.OrdinalIgnoreCase))
                {
                    goal.Currency = currency;
                    configChanged = true;
                }
            }

            if (requestModel.Mode != null)
            {
                if (!IsValidMode(requestModel.Mode))
                    return await ApiResponse.BadRequestAsync(req, "Mode must be total_balance or new_savings.");

                var mode = NormalizeMode(requestModel.Mode);
                if (!string.Equals(mode, goal.Mode, StringComparison.OrdinalIgnoreCase))
                {
                    goal.Mode = mode;
                    configChanged = true;
                }
            }

            if (requestModel.IncludedAccountIds != null)
            {
                var normalized = NormalizeStringArray(requestModel.IncludedAccountIds);
                if (!normalized.SequenceEqual(includedAccountIds, StringComparer.OrdinalIgnoreCase))
                {
                    includedAccountIds = normalized;
                    goal.IncludedAccountIdsJson = JsonSerializer.Serialize(includedAccountIds, JsonOptions);
                    configChanged = true;
                }
            }

            if (requestModel.IncludedAccountTypes != null)
            {
                var normalized = NormalizeStringArray(requestModel.IncludedAccountTypes, lowerCase: true);
                if (!normalized.SequenceEqual(includedAccountTypes, StringComparer.OrdinalIgnoreCase))
                {
                    includedAccountTypes = normalized;
                    goal.IncludedAccountTypesJson = JsonSerializer.Serialize(includedAccountTypes, JsonOptions);
                    configChanged = true;
                }
            }

            if (includedAccountIds.Length == 0 && includedAccountTypes.Length == 0)
            {
                return await ApiResponse.BadRequestAsync(req, "At least one included account or account type is required.");
            }

            var validationError = ValidateIncludedAccounts(accounts, includedAccountIds, goal.Currency);
            if (validationError != null)
                return await ApiResponse.BadRequestAsync(req, validationError);

            if (configChanged && !CanEditConfig(goal, now))
            {
                var nextEditAt = GetNextConfigEditAtUtc(goal);
                var message = nextEditAt.HasValue
                    ? $"Savings goal configuration can be edited again after {nextEditAt.Value:O}."
                    : "Savings goal configuration cannot be edited yet.";

                return await ApiResponse.ConflictAsync(req, message);
            }

            if (configChanged)
            {
                var currentAmountCents = CalculateCurrentAmountCents(
                    accounts,
                    goal.Currency,
                    includedAccountIds,
                    includedAccountTypes);
                validationError = ValidateTargetAmountAgainstCurrentBalance(
                    goal.Mode,
                    goal.TargetAmountCents,
                    currentAmountCents,
                    goal.Currency);
                if (validationError != null)
                    return await ApiResponse.BadRequestAsync(req, validationError);

                goal.BaselineAmountCents = currentAmountCents;
                goal.LastConfigEditedAtUtc = now;
                goal.ConfigEditCount += 1;
            }

            goal.UpdatedAtUtc = now;
            await _savingsGoalRepository.UpdateSavingsGoalAsync(goal);

            return await JsonAsync(req, HttpStatusCode.OK, ToDto(goal, accounts));
        }

        [Function("ArchiveSavingsGoal")]
        public async Task<HttpResponseData> Archive(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "savings-goals/{goalId}/archive")]
            HttpRequestData req,
            string goalId)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var goal = await _savingsGoalRepository.GetSavingsGoalAsync(userId, goalId);
            if (goal == null)
                return await ApiResponse.NotFoundAsync(req, "Savings goal not found.");

            if (!string.Equals(goal.Status, SavingsGoalStatuses.Active, StringComparison.OrdinalIgnoreCase))
                return await ApiResponse.ConflictAsync(req, "Savings goal is already archived.");

            var now = DateTime.UtcNow;
            goal.Status = SavingsGoalStatuses.Archived;
            goal.ArchivedAtUtc = now;
            goal.UpdatedAtUtc = now;

            await _savingsGoalRepository.UpdateSavingsGoalAsync(goal);
            return req.CreateResponse(HttpStatusCode.NoContent);
        }

        private static string? ValidateCreateRequest(SavingsGoalCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return "Goal name is required.";

            if (request.TargetAmount <= 0)
                return "Target amount must be greater than zero.";

            if (!IsValidMode(request.Mode))
                return "Mode must be total_balance or new_savings.";

            return null;
        }

        private static string? ValidateTargetAmountAgainstCurrentBalance(
            string mode,
            long targetAmountCents,
            long currentAmountCents,
            string currency)
        {
            if (!string.Equals(mode, SavingsGoalModes.TotalBalance, StringComparison.OrdinalIgnoreCase))
                return null;

            if (targetAmountCents > currentAmountCents)
                return null;

            return $"Total balance target must be greater than the current eligible balance ({FromCents(currentAmountCents):0.##} {currency}).";
        }

        private static string? ValidateIncludedAccounts(
            IReadOnlyList<AccountEntity> accounts,
            string[] includedAccountIds,
            string currency)
        {
            if (includedAccountIds.Length == 0)
                return null;

            var accountsById = accounts.ToDictionary(a => a.RowKey, StringComparer.OrdinalIgnoreCase);
            foreach (var accountId in includedAccountIds)
            {
                if (!accountsById.TryGetValue(accountId, out var account))
                    return "Included accounts must belong to the current user and must not be archived.";

                if (!string.Equals(account.Currency, currency, StringComparison.OrdinalIgnoreCase))
                    return "Included accounts must use the same currency as the savings goal.";
            }

            return null;
        }

        private static SavingsGoalDto ToDto(
            SavingsGoalEntity goal,
            IReadOnlyList<AccountEntity> accounts)
        {
            var includedAccountIds = ParseJsonArray(goal.IncludedAccountIdsJson);
            var includedAccountTypes = ParseJsonArray(goal.IncludedAccountTypesJson);
            var currentAmountCents = CalculateCurrentAmountCents(
                accounts,
                goal.Currency,
                includedAccountIds,
                includedAccountTypes);

            var progressAmountCents = string.Equals(goal.Mode, SavingsGoalModes.NewSavings, StringComparison.OrdinalIgnoreCase)
                ? currentAmountCents - goal.BaselineAmountCents
                : currentAmountCents;

            progressAmountCents = Math.Max(0, progressAmountCents);
            var remainingAmountCents = Math.Max(0, goal.TargetAmountCents - progressAmountCents);
            var progressPercent = goal.TargetAmountCents > 0
                ? Math.Min(100m, progressAmountCents * 100m / goal.TargetAmountCents)
                : 0m;
            var isCompleted = progressAmountCents >= goal.TargetAmountCents;

            return new SavingsGoalDto
            {
                GoalId = goal.RowKey,
                Name = goal.Name,
                TargetAmount = FromCents(goal.TargetAmountCents),
                Currency = goal.Currency,
                Mode = goal.Mode,
                BaselineAmount = FromCents(goal.BaselineAmountCents),
                CurrentAmount = FromCents(currentAmountCents),
                ProgressAmount = FromCents(progressAmountCents),
                RemainingAmount = FromCents(remainingAmountCents),
                ProgressPercent = decimal.Round(progressPercent, 2, MidpointRounding.AwayFromZero),
                IsCompleted = isCompleted,
                IncludedAccountIds = includedAccountIds,
                IncludedAccountTypes = includedAccountTypes,
                Status = goal.Status,
                CanEditConfig = CanEditConfig(goal, DateTime.UtcNow),
                NextConfigEditAtUtc = GetNextConfigEditAtUtc(goal),
                CreatedAtUtc = goal.CreatedAtUtc,
                UpdatedAtUtc = goal.UpdatedAtUtc,
                ArchivedAtUtc = goal.ArchivedAtUtc,
                CompletedAtUtc = goal.CompletedAtUtc
            };
        }

        private static long CalculateCurrentAmountCents(
            IReadOnlyList<AccountEntity> accounts,
            string currency,
            string[] includedAccountIds,
            string[] includedAccountTypes)
        {
            var idSet = includedAccountIds.Length > 0
                ? new HashSet<string>(includedAccountIds, StringComparer.OrdinalIgnoreCase)
                : null;
            var typeSet = includedAccountTypes.Length > 0
                ? new HashSet<string>(includedAccountTypes, StringComparer.OrdinalIgnoreCase)
                : null;

            return accounts
                .Where(a => !a.IsArchived)
                .Where(a => string.Equals(a.Currency, currency, StringComparison.OrdinalIgnoreCase))
                .Where(a => idSet != null
                    ? idSet.Contains(a.RowKey)
                    : typeSet == null || MatchesIncludedAccountType(a.Type, typeSet))
                .Sum(GetSavingsGoalEligibleBalanceCents);
        }

        private static long GetSavingsGoalEligibleBalanceCents(AccountEntity account)
        {
            var primaryType = GetPrimaryAccountType(account.Type);

            return primaryType is "credit" or "loan"
                ? 0
                : account.CurrentBalanceCents;
        }

        private static bool MatchesIncludedAccountType(string? accountType, HashSet<string> includedTypes)
        {
            var normalized = (accountType ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return false;
            }

            if (includedTypes.Contains(normalized))
            {
                return true;
            }

            var primaryType = GetPrimaryAccountType(normalized);
            return includedTypes.Contains(primaryType)
                || (includedTypes.Contains("bank") && primaryType == "depository")
                || (includedTypes.Contains("investment") && primaryType == "investment");
        }

        private static string GetPrimaryAccountType(string? accountType)
        {
            return (accountType ?? string.Empty)
                .Trim()
                .ToLowerInvariant()
                .Replace('_', ' ')
                .Split(':', 2)[0];
        }

        private static bool CanEditConfig(SavingsGoalEntity goal, DateTime now)
        {
            var createdAt = goal.CreatedAtUtc ?? DateTime.MinValue;
            if (goal.ConfigEditCount == 0 && createdAt.Add(InitialConfigEditWindow) >= now)
            {
                return true;
            }

            var lastEditAt = goal.LastConfigEditedAtUtc ?? createdAt;
            return lastEditAt.Add(ConfigEditCooldown) <= now;
        }

        private static DateTime? GetNextConfigEditAtUtc(SavingsGoalEntity goal)
        {
            var now = DateTime.UtcNow;
            if (CanEditConfig(goal, now))
                return null;

            var createdAt = goal.CreatedAtUtc ?? DateTime.MinValue;
            if (goal.ConfigEditCount == 0)
            {
                var initialWindowEnd = createdAt.Add(InitialConfigEditWindow);
                if (initialWindowEnd >= now)
                    return null;

                return createdAt.Add(ConfigEditCooldown);
            }

            var lastEditAt = goal.LastConfigEditedAtUtc ?? createdAt;
            return lastEditAt.Add(ConfigEditCooldown);
        }

        private static string NormalizeCurrency(string? currency)
        {
            return string.IsNullOrWhiteSpace(currency)
                ? "CAD"
                : currency.Trim().ToUpperInvariant();
        }

        private static string NormalizeMode(string? mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
                return SavingsGoalModes.TotalBalance;

            var normalized = mode.Trim().ToLowerInvariant();
            if (normalized is SavingsGoalModes.TotalBalance or SavingsGoalModes.NewSavings)
                return normalized;

            throw new ArgumentException("Mode must be total_balance or new_savings.", nameof(mode));
        }

        private static bool IsValidMode(string? mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
                return true;

            var normalized = mode.Trim().ToLowerInvariant();
            return normalized is SavingsGoalModes.TotalBalance or SavingsGoalModes.NewSavings;
        }

        private static string[] NormalizeStringArray(string[]? values, bool lowerCase = false)
        {
            if (values == null)
                return Array.Empty<string>();

            return values
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Select(v => lowerCase ? v.Trim().ToLowerInvariant() : v.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(v => v, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        private static string[] ParseJsonArray(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return Array.Empty<string>();

            try
            {
                return NormalizeStringArray(JsonSerializer.Deserialize<string[]>(json, JsonOptions));
            }
            catch (JsonException)
            {
                return Array.Empty<string>();
            }
        }

        private static long ToCents(decimal amount)
        {
            return (long)decimal.Round(amount * 100m, 0, MidpointRounding.AwayFromZero);
        }

        private static decimal FromCents(long cents)
        {
            return cents / 100m;
        }

        private static async Task<T?> ReadJsonAsync<T>(HttpRequestData req)
        {
            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
                return default;

            try
            {
                return JsonSerializer.Deserialize<T>(body, JsonOptions);
            }
            catch (JsonException)
            {
                return default;
            }
        }

        private static async Task<HttpResponseData> JsonAsync(
            HttpRequestData req,
            HttpStatusCode statusCode,
            object payload)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(payload, JsonOptions));
            return response;
        }
    }
}
