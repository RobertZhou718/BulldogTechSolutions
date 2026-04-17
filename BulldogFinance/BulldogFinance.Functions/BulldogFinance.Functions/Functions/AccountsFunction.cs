using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Plaid;
using BulldogFinance.Functions.Services.Transactions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace BulldogFinance.Functions.Functions
{
    public class AccountsFunction
    {
        private readonly IAccountRepository _accountRepository;
        private readonly ITransactionRepository _transactionRepository;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public AccountsFunction(
            IAccountRepository accountRepository,
            ITransactionRepository transactionRepository,
            IPlaidRepository plaidRepository,
            IPlaidSyncService plaidSyncService)
        {
            _accountRepository = accountRepository;
            _transactionRepository = transactionRepository;
            _plaidRepository = plaidRepository;
            _plaidSyncService = plaidSyncService;
        }

        [Function("GetAccounts")]
        public async Task<HttpResponseData> Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "accounts")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            bool includeArchived = false;
            var query = req.Url.Query;
            if (!string.IsNullOrEmpty(query))
            {
                var trimmed = query.TrimStart('?');
                var pairs = trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries);
                foreach (var pair in pairs)
                {
                    var kv = pair.Split('=', 2);
                    if (kv.Length == 2 &&
                        string.Equals(kv[0], "includeArchived", StringComparison.OrdinalIgnoreCase) &&
                        bool.TryParse(Uri.UnescapeDataString(kv[1]), out var parsed))
                    {
                        includeArchived = parsed;
                        break;
                    }
                }
            }

            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived);
            var dtoList = accounts
                .OrderBy(a => a.SortOrder)
                .ThenBy(a => a.Name)
                .Select(ToDto)
                .ToList();

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(dtoList, JsonOptions));

            return response;
        }

        [Function("CreateAccount")]
        public async Task<HttpResponseData> Create(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "accounts")]
            HttpRequestData req,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            string body;
            using (var reader = new StreamReader(req.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Request body is empty.");
                return bad;
            }

            AccountCreateRequest? requestModel;
            try
            {
                requestModel = JsonSerializer.Deserialize<AccountCreateRequest>(body, JsonOptions);
            }
            catch (JsonException)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Invalid JSON.");
                return bad;
            }

            if (requestModel == null || string.IsNullOrWhiteSpace(requestModel.Name))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Account name is required.");
                return bad;
            }

            var existingAccounts = await _accountRepository.GetAccountsAsync(userId, includeArchived: true);
            var now = DateTime.UtcNow;
            var currency = string.IsNullOrWhiteSpace(requestModel.Currency)
                ? "CAD"
                : requestModel.Currency.Trim().ToUpperInvariant();
            var initialBalanceCents = (long)decimal.Round(
                requestModel.InitialBalance * 100m,
                0,
                MidpointRounding.AwayFromZero);

            var account = new AccountEntity
            {
                PartitionKey = userId,
                RowKey = Guid.NewGuid().ToString("N"),
                Name = requestModel.Name.Trim(),
                Type = string.IsNullOrWhiteSpace(requestModel.Type) ? "cash" : requestModel.Type.Trim(),
                Currency = currency,
                CurrentBalanceCents = initialBalanceCents,
                IsArchived = false,
                SortOrder = existingAccounts.Count,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            await _accountRepository.CreateAccountAsync(account);

            if (initialBalanceCents != 0)
            {
                await _transactionRepository.CreateTransactionAsync(new TransactionEntity
                {
                    PartitionKey = userId,
                    RowKey = Guid.NewGuid().ToString("N"),
                    AccountId = account.RowKey,
                    Type = "INIT",
                    AmountCents = initialBalanceCents,
                    Currency = currency,
                    Category = "Initial",
                    Note = "Initial balance",
                    Source = "Manual",
                    OccurredAtUtc = now,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now,
                    IsDeleted = false,
                    IsSystemGenerated = true
                });
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(new CreateAccountResponse
            {
                Account = ToDto(account)
            }, JsonOptions));

            return response;
        }

        [Function("DeleteAccount")]
        public async Task<HttpResponseData> Delete(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "accounts/{accountId}")]
            HttpRequestData req,
            string accountId,
            FunctionContext context)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
            {
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                await unauthorized.WriteStringAsync("Unauthorized.");
                return unauthorized;
            }

            var account = await _accountRepository.GetAccountAsync(userId, accountId);
            if (account == null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteStringAsync("Account not found.");
                return notFound;
            }

            if (string.Equals(account.ExternalSource, "Plaid", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(account.ExternalAccountId))
            {
                var link = await _plaidRepository.GetAccountLinkAsync(userId, account.ExternalAccountId);
                if (link == null)
                {
                    account.IsArchived = true;
                    account.UpdatedAtUtc = DateTime.UtcNow;
                    await _accountRepository.UpdateAccountAsync(account);
                    await _transactionRepository.MarkTransactionsDeletedByAccountIdAsync(userId, account.RowKey);
                }
                else
                {
                    var links = await _plaidRepository.GetAccountLinksByItemAsync(userId, link.ItemId);
                    var activeLinkedAccountCount = 0;

                    foreach (var relatedLink in links)
                    {
                        var relatedAccount = await _accountRepository.GetAccountAsync(userId, relatedLink.LocalAccountId);
                        if (relatedAccount != null && !relatedAccount.IsArchived)
                        {
                            activeLinkedAccountCount++;
                        }
                    }

                    if (activeLinkedAccountCount <= 1)
                    {
                        await _plaidSyncService.RemoveItemAsync(userId, link.ItemId);
                    }
                    else
                    {
                        account.IsArchived = true;
                        account.UpdatedAtUtc = DateTime.UtcNow;
                        await _accountRepository.UpdateAccountAsync(account);
                        await _transactionRepository.MarkTransactionsDeletedByAccountIdAsync(userId, account.RowKey);
                    }
                }
            }
            else
            {
                await _transactionRepository.MarkTransactionsDeletedByAccountIdAsync(userId, account.RowKey);
                await _accountRepository.DeleteAccountAsync(userId, account.RowKey);
            }

            return req.CreateResponse(HttpStatusCode.NoContent);
        }

        private static AccountDto ToDto(AccountEntity account) => new AccountDto
        {
            AccountId = account.RowKey,
            Name = account.Name,
            Type = account.Type,
            Currency = account.Currency,
            CurrentBalance = account.CurrentBalanceCents / 100m,
            AvailableBalance = account.AvailableBalanceCents.HasValue ? account.AvailableBalanceCents.Value / 100m : null,
            IsArchived = account.IsArchived,
            ExternalSource = account.ExternalSource,
            InstitutionName = account.InstitutionName,
            Mask = account.Mask
        };
    }
}
