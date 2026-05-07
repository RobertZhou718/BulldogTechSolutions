using Azure;
using Azure.Data.Tables;

namespace BulldogFinance.Functions.Models.Investments
{
    public class PlaidInvestmentSecurityEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string ItemId { get; set; } = default!;
        public string SecurityId { get; set; } = default!;
        public string? Name { get; set; }
        public string? TickerSymbol { get; set; }
        public string? Isin { get; set; }
        public string? Cusip { get; set; }
        public string? Sedol { get; set; }
        public string? InstitutionSecurityId { get; set; }
        public string? InstitutionId { get; set; }
        public string? ProxySecurityId { get; set; }
        public bool? IsCashEquivalent { get; set; }
        public string? Type { get; set; }
        public string? Subtype { get; set; }
        public double? ClosePrice { get; set; }
        public DateTime? ClosePriceAsOfUtc { get; set; }
        public DateTime? UpdateDatetimeUtc { get; set; }
        public string? Currency { get; set; }
        public string? UnofficialCurrencyCode { get; set; }
        public string? MarketIdentifierCode { get; set; }
        public string? Sector { get; set; }
        public string? Industry { get; set; }
        public string? CfiCode { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }

    public class PlaidInvestmentHoldingEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string ItemId { get; set; } = default!;
        public string PlaidAccountId { get; set; } = default!;
        public string? LocalAccountId { get; set; }
        public string? AccountName { get; set; }
        public string? InstitutionName { get; set; }
        public string? Mask { get; set; }
        public string SecurityId { get; set; } = default!;
        public double Quantity { get; set; }
        public double? CostBasis { get; set; }
        public double InstitutionPrice { get; set; }
        public DateTime? InstitutionPriceAsOfUtc { get; set; }
        public DateTime? InstitutionPriceDatetimeUtc { get; set; }
        public double InstitutionValue { get; set; }
        public string Currency { get; set; } = "USD";
        public string? UnofficialCurrencyCode { get; set; }
        public double? VestedQuantity { get; set; }
        public double? VestedValue { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }

    public class PlaidInvestmentTransactionEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public string ItemId { get; set; } = default!;
        public string PlaidAccountId { get; set; } = default!;
        public string? LocalAccountId { get; set; }
        public string? AccountName { get; set; }
        public string? InstitutionName { get; set; }
        public string? SecurityId { get; set; }
        public string InvestmentTransactionId { get; set; } = default!;
        public string? CancelTransactionId { get; set; }
        public DateTime DateUtc { get; set; }
        public DateTime? TransactionDatetimeUtc { get; set; }
        public string? Name { get; set; }
        public double Quantity { get; set; }
        public double Amount { get; set; }
        public double Price { get; set; }
        public double? Fees { get; set; }
        public string Type { get; set; } = default!;
        public string Subtype { get; set; } = default!;
        public string Currency { get; set; } = "USD";
        public string? UnofficialCurrencyCode { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }

    public class InvestmentPortfolioSnapshotEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        public DateTime SnapshotDateUtc { get; set; }
        public string Currency { get; set; } = "USD";
        public double MarketValue { get; set; }
        public double CostBasis { get; set; }
        public double UnrealizedPnL { get; set; }
        public int HoldingsCount { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }

    public class PlaidInvestmentSyncSummary
    {
        public int HoldingsSynced { get; set; }
        public int SecuritiesSynced { get; set; }
        public int InvestmentTransactionsSynced { get; set; }
        public int HoldingsRemoved { get; set; }
        public bool Skipped { get; set; }
        public string? SkipReason { get; set; }
    }
}
