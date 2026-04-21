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

    public class PlaidLinkTokenResult
    {
        [JsonPropertyName("link_token")]
        public string LinkToken { get; set; } = default!;

        [JsonPropertyName("expiration")]
        public DateTime? Expiration { get; set; }
    }

    public class PlaidPublicTokenExchangeResult
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = default!;

        [JsonPropertyName("item_id")]
        public string ItemId { get; set; } = default!;
    }

    public class PlaidAccountsGetResult
    {
        [JsonPropertyName("accounts")]
        public List<PlaidAccount> Accounts { get; set; } = new();

        [JsonPropertyName("item")]
        public PlaidItem? Item { get; set; }
    }

    public class PlaidBalanceGetResult
    {
        [JsonPropertyName("accounts")]
        public List<PlaidAccount> Accounts { get; set; } = new();
    }

    public class PlaidTransactionsSyncResult
    {
        [JsonPropertyName("added")]
        public List<PlaidTransaction> Added { get; set; } = new();

        [JsonPropertyName("modified")]
        public List<PlaidTransaction> Modified { get; set; } = new();

        [JsonPropertyName("removed")]
        public List<PlaidRemovedTransaction> Removed { get; set; } = new();

        [JsonPropertyName("next_cursor")]
        public string? NextCursor { get; set; }

        [JsonPropertyName("has_more")]
        public bool HasMore { get; set; }
    }

    public class PlaidRemoveItemResult
    {
        [JsonPropertyName("removed")]
        public bool Removed { get; set; }
    }

    public class PlaidItem
    {
        [JsonPropertyName("institution_id")]
        public string? InstitutionId { get; set; }
    }

    public class PlaidAccount
    {
        [JsonPropertyName("account_id")]
        public string AccountId { get; set; } = default!;

        [JsonPropertyName("name")]
        public string Name { get; set; } = default!;

        [JsonPropertyName("official_name")]
        public string? OfficialName { get; set; }

        [JsonPropertyName("mask")]
        public string? Mask { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = default!;

        [JsonPropertyName("subtype")]
        public string? Subtype { get; set; }

        [JsonPropertyName("balances")]
        public PlaidBalance Balances { get; set; } = new();
    }

    public class PlaidBalance
    {
        [JsonPropertyName("available")]
        public decimal? Available { get; set; }

        [JsonPropertyName("current")]
        public decimal? Current { get; set; }

        [JsonPropertyName("iso_currency_code")]
        public string? IsoCurrencyCode { get; set; }

        [JsonPropertyName("unofficial_currency_code")]
        public string? UnofficialCurrencyCode { get; set; }
    }

    public class PlaidTransaction
    {
        [JsonPropertyName("transaction_id")]
        public string TransactionId { get; set; } = default!;

        [JsonPropertyName("account_id")]
        public string AccountId { get; set; } = default!;

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("authorized_date")]
        public DateTime? AuthorizedDate { get; set; }

        [JsonPropertyName("date")]
        public DateTime? Date { get; set; }

        [JsonPropertyName("iso_currency_code")]
        public string? IsoCurrencyCode { get; set; }

        [JsonPropertyName("unofficial_currency_code")]
        public string? UnofficialCurrencyCode { get; set; }

        [JsonPropertyName("merchant_name")]
        public string? MerchantName { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = default!;

        [JsonPropertyName("pending")]
        public bool Pending { get; set; }

        [JsonPropertyName("personal_finance_category")]
        public PlaidPersonalFinanceCategory? PersonalFinanceCategory { get; set; }
    }

    public class PlaidPersonalFinanceCategory
    {
        [JsonPropertyName("primary")]
        public string? Primary { get; set; }

        [JsonPropertyName("detailed")]
        public string? Detailed { get; set; }
    }

    public class PlaidRemovedTransaction
    {
        [JsonPropertyName("transaction_id")]
        public string TransactionId { get; set; } = default!;
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
