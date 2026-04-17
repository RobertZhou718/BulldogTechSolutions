using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;
using BulldogFinance.Functions.Models.Reports;
using BulldogFinance.Functions.Services.Chat;
using BulldogFinance.Functions.Services.Transactions;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services.Reports;

public sealed class ReportService : IReportService
{
    private readonly ILogger<ReportService> _logger;
    private readonly ITransactionRepository _transactions;
    private readonly IAiClient _ai;
    private readonly IReportStorage _storage;

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ReportService(
        ILogger<ReportService> logger,
        ITransactionRepository transactions,
        IAiClient ai,
        IReportStorage storage)
    {
        _logger = logger;
        _transactions = transactions;
        _ai = ai;
        _storage = storage;
    }

    public async Task<GeneratedReport> GenerateAsync(
        string userId,
        ReportPeriod period,
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken ct = default)
    {
        var txs = await _transactions.GetTransactionsAsync(
            userId,
            accountId: null,
            fromUtc: startUtc,
            toUtc: endUtc,
            cancellationToken: ct);

        var expenseByCategory = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);

        long income = 0;
        long expense = 0;
        int incomeCount = 0;
        int expenseCount = 0;

        if (txs.Count == 0)
        {
            var nonReport = new GeneratedReport
            {
                UserId = userId,
                Period = period,
                StartUtc = startUtc,
                EndUtc = endUtc,
                Markdown = "Sorry, we don't have enough data to generate the report.",
                ModelDeployment = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT") ?? "report-writer",
                InputTokens = 0,
                OutputTokens = 0,
                TotalTokens = 0
            };
            await _storage.SaveLatestAsync(nonReport, ct);

            return nonReport;
        }

        foreach (var t in txs)
        {
            if (t.IsDeleted) continue;

            var type = (t.Type ?? string.Empty).Trim().ToUpperInvariant();
            if (type == "INIT") continue;

            if (t.OccurredAtUtc is null) continue;

            var amt = Math.Abs(t.AmountCents);

            if (type == "INCOME")
            {
                income += amt;
                incomeCount++;
            }
            else if (type == "EXPENSE")
            {
                expense += amt;
                expenseCount++;

                var cat = string.IsNullOrWhiteSpace(t.Category) ? "Uncategorized" : t.Category!;
                expenseByCategory[cat] = expenseByCategory.TryGetValue(cat, out var cur) ? cur + amt : amt;
            }
            else
            {
                continue;
            }
        }

        var snapshot = new ReportSnapshot
        {
            UserId = userId,
            Period = period,
            StartUtc = startUtc,
            EndUtc = endUtc,
            DefaultCurrency = "CAD",
            TransactionsCount = txs.Count,
            IncomeCount = incomeCount,
            ExpenseCount = expenseCount,
            TotalIncomeCents = income,
            TotalExpenseCents = expense,
            ExpenseByCategoryCents = expenseByCategory
        };

        var systemPrompt =
            "You are a personal finance assistant. Use only the provided JSON snapshot. " +
            "Be concise, structured, and do not invent numbers. Output in markdown.";

        var snapshotJson = JsonSerializer.Serialize(snapshot, JsonOpts);

        var userPrompt = BuildUserPrompt(period, snapshotJson);

        var maxOut = period == ReportPeriod.Weekly ? 900 : 1400;

        var ai = await _ai.GenerateAsync(systemPrompt, userPrompt, maxOut, temperature: 0.2f, ct);

        var report = new GeneratedReport
        {
            UserId = userId,
            Period = period,
            StartUtc = startUtc,
            EndUtc = endUtc,
            Markdown = ai.Text,
            ModelDeployment = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT") ?? "report-writer",
            InputTokens = ai.InputTokens,
            OutputTokens = ai.OutputTokens,
            TotalTokens = ai.TotalTokens
        };

        await _storage.SaveLatestAsync(report, ct);

        _logger.LogInformation(
            "Report generated. userId={UserId}, period={Period}, txCount={TxCount}, income={Income}, expense={Expense}",
            userId, period, txs.Count, income, expense);

        return report;
    }

    private static string BuildUserPrompt(ReportPeriod period, string snapshotJson)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Write a personal finance report in markdown with sections:");
        sb.AppendLine("1) Summary (3 bullets)");
        sb.AppendLine("2) Spending (top categories + brief interpretation)");
        sb.AppendLine("3) Suggestions (5 bullets, practical and actionable)");
        sb.AppendLine();
        sb.AppendLine("Rules:");
        sb.AppendLine("- Do not fabricate data.");
        sb.AppendLine("- If data is missing, explicitly say 'Not enough data'.");
        sb.AppendLine("- Keep it within ~400-700 words.");
        sb.AppendLine();
        sb.AppendLine("Snapshot JSON:");
        sb.AppendLine("```json");
        sb.AppendLine(snapshotJson);
        sb.AppendLine("```");

        return sb.ToString();
    }
}
