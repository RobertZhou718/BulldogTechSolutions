using System.Text.Json;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Services.Accounts;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GetAccountsTool : IAgentTool
    {
        private readonly IAccountRepository _accountRepository;

        public GetAccountsTool(IAccountRepository accountRepository)
        {
            _accountRepository = accountRepository;
        }

        public string Name => "get_accounts";

        public string Description =>
            "Get the user's financial accounts such as bank, cash, credit card, and investment accounts.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["includeArchived"] = new ToolParameterSchema
                {
                    Type = "boolean",
                    Description = "Whether to include archived accounts.",
                    Required = false
                },
                ["accountType"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional account type filter such as bank, cash, credit_card, or investment.",
                    Required = false
                }
            }
        };

        public async Task<ToolExecutionResult> ExecuteAsync(
            string userId,
            ToolExecutionRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_user",
                    "User id is required.");
            }

            bool includeArchived = GetBooleanArgument(request, "includeArchived");
            string? accountType = GetStringArgument(request, "accountType");

            var accounts = await _accountRepository.GetAccountsAsync(
                userId,
                includeArchived,
                cancellationToken);

            IEnumerable<AccountEntity> filteredAccounts = accounts;

            if (!string.IsNullOrWhiteSpace(accountType))
            {
                filteredAccounts = filteredAccounts.Where(x =>
                    string.Equals(x.Type, accountType, StringComparison.OrdinalIgnoreCase));
            }

            var orderedAccounts = filteredAccounts
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Name)
                .ToList();

            var accountDtos = orderedAccounts
                .Select(MapToDto)
                .ToList();

            var summary = BuildSummary(accountDtos, includeArchived, accountType);

            return ToolExecutionResult.Success(
                Name,
                summary,
                new GetAccountsToolResult
                {
                    TotalCount = accountDtos.Count,
                    IncludeArchived = includeArchived,
                    AccountType = accountType,
                    Accounts = accountDtos
                });
        }

        private static AccountDto MapToDto(AccountEntity entity)
        {
            return new AccountDto
            {
                AccountId = entity.RowKey,
                Name = entity.Name,
                Type = entity.Type,
                Currency = entity.Currency,
                CurrentBalance = entity.CurrentBalanceCents / 100m,
                IsArchived = entity.IsArchived
            };
        }

        private static string BuildSummary(
            IReadOnlyCollection<AccountDto> accounts,
            bool includeArchived,
            string? accountType)
        {
            if (accounts.Count == 0)
            {
                if (!string.IsNullOrWhiteSpace(accountType))
                {
                    return $"No accounts were found for account type '{accountType}'.";
                }

                return includeArchived
                    ? "No accounts were found, including archived accounts."
                    : "No active accounts were found.";
            }

            if (!string.IsNullOrWhiteSpace(accountType))
            {
                return $"Found {accounts.Count} account(s) for account type '{accountType}'.";
            }

            return includeArchived
                ? $"Found {accounts.Count} account(s), including archived accounts."
                : $"Found {accounts.Count} active account(s).";
        }

        private static bool GetBooleanArgument(
            ToolExecutionRequest request,
            string key,
            bool defaultValue = false)
        {
            if (!request.Arguments.TryGetValue(key, out var value))
            {
                return defaultValue;
            }

            try
            {
                return value.ValueKind switch
                {
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
                    _ => defaultValue
                };
            }
            catch
            {
                return defaultValue;
            }
        }

        private static string? GetStringArgument(
            ToolExecutionRequest request,
            string key)
        {
            if (!request.Arguments.TryGetValue(key, out var value))
            {
                return null;
            }

            try
            {
                return value.ValueKind switch
                {
                    JsonValueKind.String => value.GetString(),
                    JsonValueKind.Number => value.ToString(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => null
                };
            }
            catch
            {
                return null;
            }
        }
    }
}