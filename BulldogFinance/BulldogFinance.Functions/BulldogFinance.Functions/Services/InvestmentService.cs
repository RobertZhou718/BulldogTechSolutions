// Services/InvestmentService.cs
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Data.Tables;
using BulldogFinance.Functions.Models;
using Microsoft.Extensions.Logging;

namespace BulldogFinance.Functions.Services
{
    public class InvestmentService : IInvestmentService
    {
        private readonly TableClient _investmentsTable;
        private readonly TableClient _watchlistTable;
        private readonly ILogger<InvestmentService> _logger;

        public InvestmentService(
            TableServiceClient tableServiceClient,
            ILogger<InvestmentService> logger)
        {
            _logger = logger;

            // 和其它 Repository 一样，直接从 TableServiceClient 拿表
            _investmentsTable = tableServiceClient.GetTableClient("Investments");
            _watchlistTable = tableServiceClient.GetTableClient("Watchlist");

            // 如果你不想在代码里自动建表，可以把下面两行注释掉
            //_investmentsTable.CreateIfNotExists();
            //_watchlistTable.CreateIfNotExists();
        }

        // ========== Investments 持仓 ==========

        public async Task<IReadOnlyList<InvestmentDto>> GetInvestmentsForUserAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var result = new List<InvestmentDto>();

            var query = _investmentsTable.QueryAsync<InvestmentEntity>(
                e => e.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var entity in query.ConfigureAwait(false))
            {
                result.Add(MapToDto(entity));
            }

            return result;
        }

        public async Task<InvestmentDto> UpsertInvestmentAsync(
            string userId,
            UpsertInvestmentRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Symbol))
                throw new ArgumentException("Symbol is required.", nameof(request.Symbol));

            var symbol = request.Symbol.Trim().ToUpperInvariant();

            InvestmentEntity entity;
            try
            {
                var resp = await _investmentsTable.GetEntityAsync<InvestmentEntity>(
                    userId,
                    symbol,
                    cancellationToken: cancellationToken);

                entity = resp.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                entity = InvestmentEntity.Create(userId, symbol);
            }

            entity.Symbol = symbol;
            entity.Exchange = string.IsNullOrWhiteSpace(request.Exchange)
                ? entity.Exchange
                : request.Exchange!.Trim().ToUpperInvariant();

            entity.Quantity = request.Quantity;
            entity.AvgCost = request.AvgCost;
            entity.Currency = string.IsNullOrWhiteSpace(request.Currency)
                ? entity.Currency
                : request.Currency!.Trim().ToUpperInvariant();

            entity.Tags = request.Tags is { Length: > 0 }
                ? string.Join(",", request.Tags)
                : null;

            entity.Notes = string.IsNullOrWhiteSpace(request.Notes)
                ? null
                : request.Notes!.Trim();

            entity.UpdatedAtUtc = DateTimeOffset.UtcNow;

            await _investmentsTable.UpsertEntityAsync(
                entity,
                TableUpdateMode.Replace,
                cancellationToken);

            return MapToDto(entity);
        }

        public async Task DeleteInvestmentAsync(
            string userId,
            string symbol,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(symbol)) return;

            try
            {
                await _investmentsTable.DeleteEntityAsync(
                    userId,
                    symbol.Trim().ToUpperInvariant(),
                    ETag.All,
                    cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogWarning(
                    "DeleteInvestment: not found for user {UserId}, symbol {Symbol}",
                    userId,
                    symbol);
            }
        }

        private static InvestmentDto MapToDto(InvestmentEntity e)
        {
            string[]? tags = null;
            if (!string.IsNullOrWhiteSpace(e.Tags))
            {
                tags = e.Tags.Split(
                    ',',
                    StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            }

            return new InvestmentDto
            {
                Symbol = e.Symbol,
                Exchange = e.Exchange,
                Quantity = e.Quantity,
                AvgCost = e.AvgCost,
                Currency = e.Currency,
                Tags = tags,
                Notes = e.Notes,
                CreatedAtUtc = e.CreatedAtUtc,
                UpdatedAtUtc = e.UpdatedAtUtc
            };
        }

        // ========== Watchlist 自选股 ==========

        public async Task<IReadOnlyList<WatchlistItemDto>> GetWatchlistAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var result = new List<WatchlistItemDto>();

            var query = _watchlistTable.QueryAsync<WatchlistEntity>(
                e => e.PartitionKey == userId,
                cancellationToken: cancellationToken);

            await foreach (var entity in query.ConfigureAwait(false))
            {
                result.Add(new WatchlistItemDto
                {
                    Symbol = entity.Symbol,
                    Exchange = entity.Exchange,
                    AddedAtUtc = entity.AddedAtUtc,
                    Source = entity.Source
                });
            }

            return result;
        }

        public async Task AddToWatchlistAsync(
            string userId,
            string symbol,
            string? exchange = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(symbol)) return;

            symbol = symbol.Trim().ToUpperInvariant();

            WatchlistEntity entity;
            try
            {
                var resp = await _watchlistTable.GetEntityAsync<WatchlistEntity>(
                    userId,
                    symbol,
                    cancellationToken: cancellationToken);

                entity = resp.Value;
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                entity = WatchlistEntity.Create(userId, symbol);
            }

            if (!string.IsNullOrWhiteSpace(exchange))
            {
                entity.Exchange = exchange.Trim().ToUpperInvariant();
            }

            await _watchlistTable.UpsertEntityAsync(
                entity,
                TableUpdateMode.Replace,
                cancellationToken);
        }

        public async Task RemoveFromWatchlistAsync(
            string userId,
            string symbol,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(symbol)) return;

            try
            {
                await _watchlistTable.DeleteEntityAsync(
                    userId,
                    symbol.Trim().ToUpperInvariant(),
                    ETag.All,
                    cancellationToken);
            }
            catch (RequestFailedException ex) when (ex.Status == 404)
            {
                _logger.LogWarning(
                    "RemoveFromWatchlist: not found for user {UserId}, symbol {Symbol}",
                    userId,
                    symbol);
            }
        }
    }
}
