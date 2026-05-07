using BulldogFinance.Functions.Helper;
using BulldogFinance.Functions.Models.Accounts;
using BulldogFinance.Functions.Models.Plaid;
using BulldogFinance.Functions.Models.Transactions;
using BulldogFinance.Functions.Services.Accounts;
using BulldogFinance.Functions.Services.Plaid;
using BulldogFinance.Functions.Services.Transactions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace BulldogFinance.Functions.Functions
{
    public class AccountsFunction
    {
        private readonly IAccountRepository _accountRepository;
        private readonly ITransactionRepository _transactionRepository;
        private readonly IPlaidRepository _plaidRepository;
        private readonly IPlaidSyncService _plaidSyncService;

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
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var includeArchived = QueryHelper.Parse(req).GetBool("includeArchived", false);

            var accounts = await _accountRepository.GetAccountsAsync(userId, includeArchived);
            var plaidAccountLinks = await _plaidRepository.GetAccountLinksAsync(userId);
            var plaidItems = await _plaidRepository.GetItemsAsync(userId);
            var plaidAccountLinkByExternalAccountId = plaidAccountLinks
                .GroupBy(link => link.RowKey)
                .ToDictionary(group => group.Key, group => group.First());
            var plaidItemByItemId = plaidItems
                .GroupBy(item => item.RowKey)
                .ToDictionary(group => group.Key, group => group.First());

            var dtoList = accounts
                .OrderBy(a => a.SortOrder)
                .ThenBy(a => a.Name)
                .Select(account => ToDto(
                    account,
                    plaidAccountLinkByExternalAccountId,
                    plaidItemByItemId))
                .ToList();

            return await ApiResponse.OkAsync(req, dtoList);
        }

        [Function("CreateAccount")]
        public async Task<HttpResponseData> Create(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "accounts")]
            HttpRequestData req)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var body = await req.ReadJsonBodyAsync<AccountCreateRequest>();
            if (body.IsEmpty)
                return await ApiResponse.BadRequestAsync(req, "Request body is empty.");
            if (body.IsInvalid)
                return await ApiResponse.BadRequestAsync(req, "Invalid JSON.");

            var requestModel = body.Value!;
            if (string.IsNullOrWhiteSpace(requestModel.Name))
                return await ApiResponse.BadRequestAsync(req, "Account name is required.");

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

            return await ApiResponse.OkAsync(req, new CreateAccountResponse
            {
                Account = ToDto(account)
            });
        }

        [Function("DeleteAccount")]
        public async Task<HttpResponseData> Delete(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "accounts/{accountId}")]
            HttpRequestData req,
            string accountId)
        {
            var userId = AuthHelper.GetUserId(req);
            if (string.IsNullOrWhiteSpace(userId))
                return await ApiResponse.UnauthorizedAsync(req);

            var account = await _accountRepository.GetAccountAsync(userId, accountId);
            if (account == null)
                return await ApiResponse.NotFoundAsync(req, "Account not found.");

            if (string.Equals(account.ExternalSource, "Plaid", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(account.ExternalAccountId))
            {
                var link = await _plaidRepository.GetAccountLinkAsync(userId, account.ExternalAccountId);

                account.IsArchived = true;
                account.UpdatedAtUtc = DateTime.UtcNow;
                await _accountRepository.UpdateAccountAsync(account);
                await _transactionRepository.MarkTransactionsDeletedByAccountIdAsync(userId, account.RowKey);

                if (link != null)
                {
                    // Drop the link first so sync stops touching this archived account,
                    // and so the remaining-active check below cannot race with a sibling delete.
                    await _plaidRepository.DeleteAccountLinkAsync(userId, link.RowKey);

                    var remainingLinks = await _plaidRepository.GetAccountLinksByItemAsync(userId, link.ItemId);
                    var hasActiveAccount = false;
                    foreach (var relatedLink in remainingLinks)
                    {
                        var relatedAccount = await _accountRepository.GetAccountAsync(userId, relatedLink.LocalAccountId);
                        if (relatedAccount != null && !relatedAccount.IsArchived)
                        {
                            hasActiveAccount = true;
                            break;
                        }
                    }

                    if (!hasActiveAccount)
                    {
                        await _plaidSyncService.RemoveItemAsync(userId, link.ItemId);
                    }
                }
            }
            else
            {
                await _transactionRepository.MarkTransactionsDeletedByAccountIdAsync(userId, account.RowKey);
                await _accountRepository.DeleteAccountAsync(userId, account.RowKey);
            }

            return ApiResponse.NoContent(req);
        }

        private static AccountDto ToDto(
            AccountEntity account,
            IReadOnlyDictionary<string, PlaidAccountLinkEntity>? plaidAccountLinkByExternalAccountId = null,
            IReadOnlyDictionary<string, PlaidItemEntity>? plaidItemByItemId = null)
        {
            PlaidAccountLinkEntity? plaidAccountLink = null;
            PlaidItemEntity? plaidItem = null;
            if (!string.IsNullOrWhiteSpace(account.ExternalAccountId) &&
                plaidAccountLinkByExternalAccountId != null &&
                plaidItemByItemId != null &&
                plaidAccountLinkByExternalAccountId.TryGetValue(account.ExternalAccountId, out plaidAccountLink))
            {
                plaidItemByItemId.TryGetValue(plaidAccountLink.ItemId, out plaidItem);
            }

            return new AccountDto
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
                Mask = account.Mask,
                PlaidItemId = plaidAccountLink?.ItemId,
                PlaidItemStatus = plaidItem?.Status,
                LastBalanceRefreshUtc = account.LastBalanceRefreshUtc,
                LastTransactionSyncUtc = plaidItem?.LastSyncAtUtc,
                LastSyncStatus = plaidItem?.LastSyncStatus,
                LastSyncErrorCode = plaidItem?.LastSyncErrorCode,
                LastSyncError = plaidItem?.LastSyncError
            };
        }
    }
}
