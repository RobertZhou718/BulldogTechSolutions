using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Models.Users;
using BulldogFinance.Functions.Services.Users;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GetUserProfileTool : IAgentTool
    {
        private readonly IUserRepository _userRepository;

        public GetUserProfileTool(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public string Name => "get_user_profile";

        public string Description =>
            "Get the user's basic finance profile, including display name, email, default currency, and onboarding status.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
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

            var user = await _userRepository.GetUserAsync(userId, cancellationToken);

            if (user is null)
            {
                return ToolExecutionResult.Success(
                    Name,
                    "User profile was not found.",
                    new GetUserProfileToolResult
                    {
                        Exists = false
                    });
            }

            var result = new GetUserProfileToolResult
            {
                Exists = true,
                UserId = user.PartitionKey,
                ProfileId = user.RowKey,
                DisplayName = user.DisplayName,
                Email = user.Email,
                DefaultCurrency = user.DefaultCurrency,
                OnboardingDone = user.OnboardingDone,
                CreatedAtUtc = user.CreatedAtUtc,
                UpdatedAtUtc = user.UpdatedAtUtc
            };

            return ToolExecutionResult.Success(
                Name,
                BuildSummary(user),
                result);
        }

        private static string BuildSummary(UserEntity user)
        {
            var name = string.IsNullOrWhiteSpace(user.DisplayName)
                ? "The user"
                : user.DisplayName;

            var currency = string.IsNullOrWhiteSpace(user.DefaultCurrency)
                ? "no default currency set"
                : $"default currency {user.DefaultCurrency}";

            var onboarding = user.OnboardingDone
                ? "has completed onboarding"
                : "has not completed onboarding";

            return $"{name} has profile data available, with {currency}, and {onboarding}.";
        }
    }
}