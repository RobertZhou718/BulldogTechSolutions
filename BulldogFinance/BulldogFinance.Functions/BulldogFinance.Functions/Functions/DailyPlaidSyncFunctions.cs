using System.Text.Json;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Services.Plaid;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Functions
{
    public class DailyPlaidSyncFunctions
    {
        private const string QueueName = "plaid-daily-sync-items";
        private const string QueueConnectionName = "QueueStorage";

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;
        private readonly IPlaidInvestmentSyncService _plaidInvestmentSyncService;
        private readonly ILogger<DailyPlaidSyncFunctions> _logger;

        public DailyPlaidSyncFunctions(
            IPlaidRepository plaidRepository,
            IPlaidSyncService plaidSyncService,
            IPlaidInvestmentSyncService plaidInvestmentSyncService,
            ILogger<DailyPlaidSyncFunctions> logger)
        {
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
            _plaidInvestmentSyncService = plaidInvestmentSyncService;
            _logger = logger;
        }

        [Function("QueueDailyPlaidSyncItems")]
        [QueueOutput(QueueName, Connection = QueueConnectionName)]
        public async Task<string[]> QueueDailyPlaidSyncItems(
            [TimerTrigger("0 0 8 * * *")] TimerInfo timer,
            CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var items = await _plaidRepository.GetActiveItemsAsync(cancellationToken);
            var messages = new List<string>(items.Count);

            foreach (var item in items)
            {
                item.LastDailySyncQueuedAtUtc = now;
                item.UpdatedAtUtc = now;
                await _plaidRepository.UpsertItemAsync(item, cancellationToken);

                messages.Add(JsonSerializer.Serialize(new PlaidDailySyncQueueMessage
                {
                    UserId = item.PartitionKey,
                    ItemId = item.RowKey,
                    EnqueuedAtUtc = now
                }, JsonOptions));
            }

            _logger.LogInformation(
                "Queued {ItemCount} Plaid item(s) for daily sync at {QueuedAtUtc}.",
                messages.Count,
                now);

            return messages.ToArray();
        }

        [Function("ProcessDailyPlaidSyncItem")]
        public async Task ProcessDailyPlaidSyncItem(
            [QueueTrigger(QueueName, Connection = QueueConnectionName)] string rawMessage,
            CancellationToken cancellationToken)
        {
            PlaidDailySyncQueueMessage? message;
            try
            {
                message = JsonSerializer.Deserialize<PlaidDailySyncQueueMessage>(rawMessage, JsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Invalid Plaid daily sync queue message: {Message}", rawMessage);
                return;
            }

            if (message == null ||
                string.IsNullOrWhiteSpace(message.UserId) ||
                string.IsNullOrWhiteSpace(message.ItemId))
            {
                _logger.LogWarning("Skipping Plaid daily sync queue message with missing identifiers.");
                return;
            }

            var item = await _plaidRepository.GetItemAsync(
                message.UserId,
                message.ItemId,
                cancellationToken);

            if (item == null)
            {
                _logger.LogWarning(
                    "Skipping Plaid daily sync for missing item. UserId={UserId} ItemId={ItemId}",
                    message.UserId,
                    message.ItemId);
                return;
            }

            if (!string.Equals(item.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation(
                    "Skipping Plaid daily sync for inactive item. UserId={UserId} ItemId={ItemId} Status={Status}",
                    message.UserId,
                    message.ItemId,
                    item.Status);
                return;
            }

            await MarkSyncStartedAsync(item, cancellationToken);

            try
            {
                var summary = await _plaidSyncService.SyncTransactionsAsync(
                    message.UserId,
                    message.ItemId,
                    cancellationToken);

                await _plaidSyncService.RefreshBalancesAsync(
                    message.UserId,
                    message.ItemId,
                    cancellationToken);

                var investmentSummary = await _plaidInvestmentSyncService.SyncInvestmentsAsync(
                    message.UserId,
                    message.ItemId,
                    transactionStartUtc: DateTime.UtcNow.Date.AddDays(-30),
                    transactionEndUtc: DateTime.UtcNow.Date,
                    cancellationToken);

                await MarkSyncCompletedAsync(message.UserId, message.ItemId, cancellationToken);

                _logger.LogInformation(
                    "Plaid daily sync completed. UserId={UserId} ItemId={ItemId} Added={Added} Modified={Modified} Removed={Removed} InvestmentHoldings={InvestmentHoldings} InvestmentTransactions={InvestmentTransactions}",
                    message.UserId,
                    message.ItemId,
                    summary.Added,
                    summary.Modified,
                    summary.Removed,
                    investmentSummary.HoldingsSynced,
                    investmentSummary.InvestmentTransactionsSynced);
            }
            catch (Exception ex)
            {
                await MarkSyncFailedAsync(message.UserId, message.ItemId, ex, cancellationToken);
                _logger.LogError(
                    ex,
                    "Plaid daily sync failed. UserId={UserId} ItemId={ItemId}",
                    message.UserId,
                    message.ItemId);
            }
        }

        private async Task MarkSyncStartedAsync(PlaidItemEntity item, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            item.LastSyncStartedAtUtc = now;
            item.LastSyncStatus = "RUNNING";
            item.LastSyncError = null;
            item.UpdatedAtUtc = now;
            await _plaidRepository.UpsertItemAsync(item, cancellationToken);
        }

        private async Task MarkSyncCompletedAsync(
            string userId,
            string itemId,
            CancellationToken cancellationToken)
        {
            var item = await _plaidRepository.GetItemAsync(userId, itemId, cancellationToken);
            if (item == null)
            {
                return;
            }

            var now = DateTime.UtcNow;
            item.LastSyncCompletedAtUtc = now;
            item.LastSyncStatus = "SUCCESS";
            item.LastSyncError = null;
            item.UpdatedAtUtc = now;
            await _plaidRepository.UpsertItemAsync(item, cancellationToken);
        }

        private async Task MarkSyncFailedAsync(
            string userId,
            string itemId,
            Exception exception,
            CancellationToken cancellationToken)
        {
            var item = await _plaidRepository.GetItemAsync(userId, itemId, cancellationToken);
            if (item == null)
            {
                return;
            }

            var now = DateTime.UtcNow;
            item.LastSyncCompletedAtUtc = now;
            item.LastSyncStatus = "FAILED";
            item.LastSyncError = exception.Message.Length > 512
                ? exception.Message[..512]
                : exception.Message;
            item.UpdatedAtUtc = now;
            await _plaidRepository.UpsertItemAsync(item, cancellationToken);
        }
    }
}
