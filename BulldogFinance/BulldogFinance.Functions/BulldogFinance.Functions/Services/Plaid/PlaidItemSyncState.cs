using BulldogFinance.Functions.Models.Plaid;

namespace BulldogFinance.Functions.Services.Plaid
{
    internal static class PlaidItemSyncState
    {
        public const string Active = "ACTIVE";
        public const string Error = "ERROR";
        public const string Failed = "FAILED";
        public const string Queued = "QUEUED";
        public const string RelinkRequired = "RELINK_REQUIRED";
        public const string Success = "SUCCESS";

        public static bool RequiresLinkUpdate(PlaidApiException exception) =>
            exception.RequiresLinkUpdate;

        public static bool RequiresLinkUpdate(PlaidWebhookError? error) =>
            string.Equals(error?.ErrorCode, "ITEM_LOGIN_REQUIRED", StringComparison.OrdinalIgnoreCase);

        public static bool RequiresLinkUpdate(string? webhookCode) =>
            string.Equals(webhookCode, "PENDING_EXPIRATION", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(webhookCode, "PENDING_DISCONNECT", StringComparison.OrdinalIgnoreCase);

        public static void ApplyApiError(PlaidItemEntity item, PlaidApiException exception, DateTime now)
        {
            if (RequiresLinkUpdate(exception))
            {
                item.Status = Error;
                item.LastSyncStatus = RelinkRequired;
            }
            else
            {
                item.LastSyncStatus = Failed;
            }

            item.LastSyncCompletedAtUtc = now;
            item.LastSyncErrorCode = exception.ErrorCode;
            item.LastSyncError = Truncate(exception.PlaidErrorMessage ?? exception.Message);
            item.UpdatedAtUtc = now;
        }

        public static void ApplyWebhookError(PlaidItemEntity item, PlaidWebhookError? error, DateTime now)
        {
            item.Status = Error;
            item.LastSyncStatus = RequiresLinkUpdate(error) ? RelinkRequired : Failed;
            item.LastSyncCompletedAtUtc = now;
            item.LastSyncErrorCode = error?.ErrorCode;
            item.LastSyncError = Truncate(error?.ErrorMessage ?? "Plaid reported an item error.");
            item.UpdatedAtUtc = now;
        }

        public static void ApplyRepairRequired(PlaidItemEntity item, string webhookCode, DateTime now)
        {
            item.Status = Error;
            item.LastSyncStatus = RelinkRequired;
            item.LastSyncCompletedAtUtc = now;
            item.LastSyncErrorCode = webhookCode;
            item.LastSyncError = "Plaid requires the user to re-authenticate this item.";
            item.UpdatedAtUtc = now;
        }

        public static void MarkRepairQueued(PlaidItemEntity item, DateTime now)
        {
            item.Status = Active;
            item.LastSyncStatus = Queued;
            item.LastSyncErrorCode = null;
            item.LastSyncError = null;
            item.LastDailySyncQueuedAtUtc = now;
            item.UpdatedAtUtc = now;
        }

        public static void MarkSuccess(PlaidItemEntity item, DateTime now)
        {
            item.Status = Active;
            item.LastSyncStatus = Success;
            item.LastSyncErrorCode = null;
            item.LastSyncError = null;
            item.LastSyncCompletedAtUtc = now;
            item.UpdatedAtUtc = now;
        }

        private static string Truncate(string value) =>
            value.Length > 512 ? value[..512] : value;
    }
}
