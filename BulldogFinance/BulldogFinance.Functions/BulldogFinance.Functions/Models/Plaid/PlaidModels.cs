using System.Text.Json.Serialization;
using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models.Plaid
{
    public class PlaidItemEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string AccessTokenEncrypted { get; set; } = default!;
        public string? InstitutionId { get; set; }
        public string? InstitutionName { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public string? Cursor { get; set; }
        public DateTime? LastSyncAtUtc { get; set; }
        public DateTime? ConsentExpiresAtUtc { get; set; }
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class PlaidAccountLinkEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string ItemId { get; set; } = default!;
        public string LocalAccountId { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? OfficialName { get; set; }
        public string? Mask { get; set; }
        public string Type { get; set; } = default!;
        public string? Subtype { get; set; }
        public string Currency { get; set; } = "CAD";
        public DateTime? CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class PlaidItemLookupEntity : ITableEntity
    {
        public const string LookupPartitionKey = "ITEM";

        public string PartitionKey { get; set; } = LookupPartitionKey;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string UserId { get; set; } = default!;
        public string ItemId { get; set; } = default!;
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class CreatePlaidLinkTokenRequest
    {
        public string[]? CountryCodes { get; set; }
        public string[]? Products { get; set; }
    }

    public class ExchangePlaidPublicTokenRequest
    {
        public string PublicToken { get; set; } = default!;
        public string? InstitutionId { get; set; }
        public string? InstitutionName { get; set; }
    }

    public class CreatePlaidLinkTokenResponse
    {
        public string LinkToken { get; set; } = default!;
        public DateTime? Expiration { get; set; }
    }

    public class ExchangePlaidPublicTokenResponse
    {
        public string ItemId { get; set; } = default!;
        public int AccountsConnected { get; set; }
        public int TransactionsAdded { get; set; }
        public int TransactionsModified { get; set; }
        public int TransactionsRemoved { get; set; }
    }

    public class PlaidWebhookRequest
    {
        [JsonPropertyName("webhook_type")]
        public string? WebhookType { get; set; }

        [JsonPropertyName("webhook_code")]
        public string? WebhookCode { get; set; }

        [JsonPropertyName("item_id")]
        public string? ItemId { get; set; }

        [JsonPropertyName("error")]
        public PlaidWebhookError? Error { get; set; }
    }

    public class PlaidWebhookError
    {
        [JsonPropertyName("error_type")]
        public string? ErrorType { get; set; }

        [JsonPropertyName("error_code")]
        public string? ErrorCode { get; set; }

        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }
    }

    public class PlaidSyncSummary
    {
        public int Added { get; set; }
        public int Modified { get; set; }
        public int Removed { get; set; }
    }
}
