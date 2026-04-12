using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BulldogFinance.Functions.Models.Reports;
using BulldogFinance.Functions.Models.Tools;
using BulldogFinance.Functions.Services.Reports;

namespace BulldogFinance.Functions.Services.Tools
{
    public sealed class GeneratePortfolioReportTool : IAgentTool
    {
        private readonly IReportService _reportService;

        public GeneratePortfolioReportTool(IReportService reportService)
        {
            _reportService = reportService;
        }

        public string Name => "generate_portfolio_report";

        public string Description =>
            "Generate a weekly or monthly portfolio report using the existing report service.";

        public ToolDefinitionDto Definition => new ToolDefinitionDto
        {
            Name = Name,
            Description = Description,
            Parameters = new Dictionary<string, ToolParameterSchema>(StringComparer.OrdinalIgnoreCase)
            {
                ["period"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Report period. Defaults to weekly.",
                    Required = false,
                    EnumValues = new List<string> { "weekly", "monthly" }
                },
                ["startUtc"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional custom UTC start time in ISO 8601 format. Must be paired with endUtc.",
                    Required = false,
                    Format = "date-time"
                },
                ["endUtc"] = new ToolParameterSchema
                {
                    Type = "string",
                    Description = "Optional custom UTC end time in ISO 8601 format. Must be paired with startUtc.",
                    Required = false,
                    Format = "date-time"
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

            var rawPeriod = ToolArgumentReader.GetString(request, "period");
            if (!TryParsePeriod(rawPeriod, out var period))
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Argument 'period' must be 'weekly' or 'monthly'.");
            }

            if (!ToolArgumentReader.TryGetDateTime(request, "startUtc", out var startUtc))
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Argument 'startUtc' must be a valid UTC datetime.");
            }

            if (!ToolArgumentReader.TryGetDateTime(request, "endUtc", out var endUtc))
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Argument 'endUtc' must be a valid UTC datetime.");
            }

            if (startUtc.HasValue ^ endUtc.HasValue)
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "Arguments 'startUtc' and 'endUtc' must be provided together for a custom range.");
            }

            var (resolvedStartUtc, resolvedEndUtc) = startUtc.HasValue && endUtc.HasValue
                ? (startUtc.Value, endUtc.Value)
                : GetDefaultRange(period, DateTime.UtcNow);

            if (resolvedStartUtc >= resolvedEndUtc)
            {
                return ToolExecutionResult.Failure(
                    Name,
                    "invalid_argument",
                    "The report start time must be earlier than the end time.");
            }

            var report = await _reportService.GenerateAsync(
                userId,
                period,
                resolvedStartUtc,
                resolvedEndUtc,
                cancellationToken);

            return ToolExecutionResult.Success(
                Name,
                $"Generated a {period.ToString().ToLowerInvariant()} report for {resolvedStartUtc:yyyy-MM-dd} to {resolvedEndUtc:yyyy-MM-dd}.",
                report);
        }

        private static bool TryParsePeriod(string? raw, out ReportPeriod period)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                period = ReportPeriod.Weekly;
                return true;
            }

            if (string.Equals(raw, "weekly", StringComparison.OrdinalIgnoreCase))
            {
                period = ReportPeriod.Weekly;
                return true;
            }

            if (string.Equals(raw, "monthly", StringComparison.OrdinalIgnoreCase))
            {
                period = ReportPeriod.Monthly;
                return true;
            }

            period = default;
            return false;
        }

        private static (DateTime startUtc, DateTime endUtc) GetDefaultRange(
            ReportPeriod period,
            DateTime nowUtc)
        {
            if (period == ReportPeriod.Monthly)
            {
                var thisMonthStartUtc = new DateTime(
                    nowUtc.Year,
                    nowUtc.Month,
                    1,
                    0,
                    0,
                    0,
                    DateTimeKind.Utc);

                return (thisMonthStartUtc.AddMonths(-1), thisMonthStartUtc);
            }

            var endUtc = nowUtc;
            return (endUtc.AddDays(-7), endUtc);
        }
    }
}
