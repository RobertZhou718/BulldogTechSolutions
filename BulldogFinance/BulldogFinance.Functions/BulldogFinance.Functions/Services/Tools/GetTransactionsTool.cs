using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Services.Transactions;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GetTransactionsTool : IAgentTool
    {
        private readonly ITransactionRepository _transactionRepository;

        public GetTransactionsTool(ITransactionRepository transactionRepository)
        {
            _transactionRepository = transactionRepository;
        }

        public string Name => "get_transactions";

        public string Description =>
            "Get the user's transactions, optionally filtered by account, date range, transaction type, or category.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["accountId"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional account id filter.",
                    Required = false
                },
                ["fromUtc"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional inclusive UTC start time in ISO 8601 format.",
                    Required = false,
                    Format = "date-time"
                },
                ["toUtc"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional inclusive UTC end time in ISO 8601 format.",
                    Required = false,
                    Format = "date-time"
                },
                ["type"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional transaction type filter.",
                    Required = false,
                    EnumValues = new List<string> { "INCOME", "EXPENSE", "INIT" }
                },
                ["category"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional category filter.",
                    Required = false
                },
                ["limit"] = new ToolParameterSchema
                {
                    Type = "integer",
                    Description = "Maximum number of transactions to return. Defaults to 25.",
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
                return ToolExecutionResult.Failure(Name, "invalid_user", "User id is required.");
            }

            if (!ToolArgumentReader.TryGetDateTime(request, "fromUtc", out var fromUtc))
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Argument 'fromUtc' must be a valid UTC datetime.");
            }

            if (!ToolArgumentReader.TryGetDateTime(request, "toUtc", out var toUtc))
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Argument 'toUtc' must be a valid UTC datetime.");
            }

            if (fromUtc.HasValue && toUtc.HasValue && fromUtc.Value > toUtc.Value)
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Argument 'fromUtc' must be earlier than or equal to 'toUtc'.");
            }

            var accountId = ToolArgumentReader.GetString(request, "accountId");
            var type = ToolArgumentReader.GetString(request, "type");
            var category = ToolArgumentReader.GetString(request, "category");
            var limit = Math.Clamp(ToolArgumentReader.GetInt(request, "limit", 25), 1, 200);

            var transactions = await _transactionRepository.GetTransactionsAsync(
                userId,
                accountId,
                fromUtc,
                toUtc,
                cancellationToken);

            IEnumerable<TransactionEntity> filtered = transactions;

            if (!string.IsNullOrWhiteSpace(type))
            {
                filtered = filtered.Where(x =>
                    string.Equals(x.Type, type, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                filtered = filtered.Where(x =>
                    string.Equals(x.Category, category, StringComparison.OrdinalIgnoreCase));
            }

            var filteredList = filtered.ToList();
            var transactionDtos = filteredList
                .OrderByDescending(x => x.OccurredAtUtc ?? x.CreatedAtUtc ?? DateTime.MinValue)
                .Take(limit)
                .Select(MapToDto)
                .ToList();

            return ToolExecutionResult.Success(
                Name,
                BuildSummary(filteredList.Count, transactionDtos.Count, accountId, type, category),
                new
                {
                    accountId,
                    fromUtc,
                    toUtc,
                    type,
                    category,
                    totalMatched = filteredList.Count,
                    returnedCount = transactionDtos.Count,
                    transactions = transactionDtos
                });
        }

        private static TransactionDto MapToDto(TransactionEntity entity)
        {
            return new TransactionDto
            {
                TransactionId = entity.RowKey,
                AccountId = entity.AccountId,
                Type = entity.Type,
                Amount = entity.AmountCents / 100m,
                Currency = entity.Currency,
                Category = entity.Category,
                Note = entity.Note,
                OccurredAtUtc = entity.OccurredAtUtc ?? entity.CreatedAtUtc,
                CreatedAtUtc = entity.CreatedAtUtc
            };
        }

        private static string BuildSummary(
            int totalMatched,
            int returnedCount,
            string? accountId,
            string? type,
            string? category)
        {
            if (totalMatched == 0)
            {
                return "No transactions matched the requested filters.";
            }

            var filters = new List<string>();

            if (!string.IsNullOrWhiteSpace(accountId))
            {
                filters.Add($"account '{accountId}'");
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                filters.Add($"type '{type}'");
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                filters.Add($"category '{category}'");
            }

            if (filters.Count == 0)
            {
                return $"Found {totalMatched} transaction(s); returning {returnedCount}.";
            }

            return $"Found {totalMatched} transaction(s) for {string.Join(", ", filters)}; returning {returnedCount}.";
        }
    }
}
