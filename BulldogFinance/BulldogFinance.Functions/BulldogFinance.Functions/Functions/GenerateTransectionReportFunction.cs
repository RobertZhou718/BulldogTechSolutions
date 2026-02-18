using Azure.Data.Tables;
using BulldogFinance.Functions.Models;
using BulldogFinance.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;

namespace BulldogFinance.Functions.Functions;

public class GenerateTransectionReportFunction
{
    private readonly ILogger<GenerateTransectionReportFunction> _logger;
    private readonly IReportService _reportService;
    private readonly TableClient _usersTable;

    public GenerateTransectionReportFunction(ILoggerFactory loggerFactory, IReportService reportService, TableServiceClient tableServiceClient)
    {
        _logger = loggerFactory.CreateLogger<GenerateTransectionReportFunction>();
        _reportService = reportService;
        _usersTable = tableServiceClient.GetTableClient("Users");
    }

    [Function("GenerateWeeklyReport")]
    public async Task RunWeekly([TimerTrigger("0 0 3 * * 1")] TimerInfo timer)
    {

        var endUtc = DateTime.UtcNow;
        var startUtc = endUtc.AddDays(-7);
        _logger.LogInformation("Weekly report job started. {Start} ~ {End}", startUtc, endUtc);

        await foreach (var user in _usersTable.QueryAsync<TableEntity>())
        {
            var userId = user.PartitionKey;

            try
            {
                await _reportService.GenerateAsync(userId, ReportPeriod.Weekly, startUtc, endUtc);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Weekly report failed for userId={UserId}", userId);
            }
        }

        _logger.LogInformation("Weekly report job finished.");
    }

    [Function("GenerateMonthlyReport")]
    public async Task RunMonthly([TimerTrigger("0 0 10 1 * *")] TimerInfo timer)
    {
        var now = DateTime.UtcNow;

        var thisMonthStartUtc = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStartUtc = thisMonthStartUtc.AddMonths(-1);

        var startUtc = lastMonthStartUtc;
        var endUtc = thisMonthStartUtc;
        _logger.LogInformation("Monthly report job started. {Start} ~ {End}", startUtc, endUtc);

        await foreach (var user in _usersTable.QueryAsync<TableEntity>())
        {
            var userId = user.PartitionKey;

            try
            {
                await _reportService.GenerateAsync(userId, ReportPeriod.Monthly, startUtc, endUtc);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Monthly report failed for userId={UserId}", userId);
            }
        }

        _logger.LogInformation("Monthly report job finished.");
    }
}
