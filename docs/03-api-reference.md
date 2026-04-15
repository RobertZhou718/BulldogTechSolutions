# API Reference (Current Implementation)

Base URL example: `http://localhost:7071/api`

## 1. Authentication Contract

Most HTTP triggers are configured as `AuthorizationLevel.Anonymous`, but business logic still requires a resolved user ID.

The backend currently checks these headers in order:

- `X-MS-CLIENT-PRINCIPAL-ID`
- `X-Debug-UserId`

If no user ID is found, endpoints typically return `401 Unauthorized`.

---

## 2. User and Onboarding

### `GET /me`
Returns profile and onboarding status for the current user.

### `POST /onboarding`
Creates initial user configuration and seed accounts.

---

## 3. Accounts

### `GET /accounts`
Returns user accounts.

### `POST /accounts`
Creates an account.

### `DELETE /accounts/{accountId}`
Deletes an account.

---

## 4. Transactions

### `GET /transactions?accountId=...&from=...&to=...`
Returns filtered transaction history.

### `POST /transactions`
Creates a transaction and updates related account balances.

---

## 5. Investments and Watchlist

### `GET /investments`
Returns current holdings.

### `POST /investments`
Creates or updates a holding.

### `DELETE /investments/{symbol}`
Deletes a holding by symbol.

### `GET /investments/watchlist`
Returns watchlist symbols.

### `POST /investments/watchlist`
Adds a watchlist symbol.

### `DELETE /investments/watchlist/{symbol}`
Removes a watchlist symbol.

### `GET /investments/overview`
Returns aggregated investment overview with market context.

---

## 6. Plaid Integration

### `POST /plaid/link-token`
Creates a Plaid Link token.

### `POST /plaid/exchange-public-token`
Exchanges public token and persists item/access token metadata.

### `POST /plaid/sync-transactions`
Syncs transactions from connected Plaid items.

### `POST /plaid/refresh-balances`
Refreshes balances from Plaid account data.

### `DELETE /plaid/item/{itemId}`
Removes a connected Plaid item.

### `POST /plaid/webhook`
Receives Plaid webhook events.

---

## 7. Reports

### `GET /reports/{period}/latest`
Returns the latest generated report for:

- `period=weekly`
- `period=monthly`

---

## 8. Assistant and Conversations

### `POST /chat`
Sends a user prompt to the assistant.

Example request:

```json
{
  "message": "Summarize my recent spending.",
  "conversationId": "optional-existing-conversation-id",
  "userId": "optional-override-used-by-server-logic"
}
```

### `GET /chat/conversations`
Returns available chat conversations for the current user.

### `GET /chat/conversations/{conversationId}`
Returns full message history for a conversation.

---

## 9. Operational Recommendation

Introduce a consistent error schema across all endpoints (for example: `code`, `message`, `traceId`) to simplify frontend handling and observability.
