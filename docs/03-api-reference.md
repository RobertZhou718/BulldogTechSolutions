# API Reference (current implementation)

> Base URL (local): `http://localhost:7071/api`

## 1. Authentication

All business endpoints require a valid Microsoft Entra External ID access token:

```
Authorization: Bearer <jwt>
```

Tokens are validated by `BearerTokenAuthenticationMiddleware` against the tenant metadata derived from `Auth:TenantId` + `Auth:TenantSubdomain` and the configured API audience (`Auth:ApiClientId` or `Auth:Audience`). A missing or invalid token returns `401 Unauthorized`.

---

## 2. Native auth gateway (`/native-auth/{*path}`)

`POST /native-auth/{*path}` is intentionally anonymous because it is used before sign-in. It is a constrained gateway for the MSAL Custom Native Auth SDK and forwards only whitelisted Entra External ID Native Auth API paths, such as:

- `/oauth2/v2.0/initiate`
- `/oauth2/v2.0/challenge`
- `/oauth2/v2.0/token`
- `/signup/v1.0/*`
- `/resetpassword/v1.0/*`
- `/register/v1.0/*`

The application no longer exposes `/auth/native/signin`, `/auth/native/signup`, `/auth/native/token`, or other backend-normalized auth proxy endpoints. Email/password login, sign-up, and reset are driven by the frontend MSAL Custom Native Auth SDK through this gateway.

---

## 3. User & onboarding

### `GET /me`
Returns the authenticated user's profile and onboarding status.

```json
{
  "userId": "u-123",
  "displayName": "Alice",
  "email": "alice@example.com",
  "defaultCurrency": "CAD",
  "onboardingDone": true
}
```

### `POST /onboarding`
Submits the initial account set.

```json
{
  "defaultCurrency": "CAD",
  "accounts": [
    { "name": "Cash", "type": "cash", "currency": "CAD", "initialBalance": 1000 }
  ]
}
```

Responses: `200` success, `400` invalid payload, `409` onboarding already completed.

---

## 4. Accounts & transactions

### `GET /accounts?includeArchived=false`
Lists accounts.

### `GET /transactions?accountId=&from=&to=`
Query transactions. `from`/`to` should be ISO-8601 UTC.

### `POST /transactions`
Create a manual transaction; updates the source account balance.

```json
{
  "accountId": "acc-001",
  "type": "EXPENSE",
  "amount": 36.5,
  "currency": "CAD",
  "category": "Food",
  "note": "Lunch",
  "occurredAtUtc": "2026-01-01T12:00:00Z"
}
```

Response:

```json
{
  "transaction": { "transactionId": "tx-001", "...": "..." },
  "accountBalanceAfter": 963.5
}
```

---

## 5. Plaid

### `POST /plaid/link-token`
Creates a short-lived Plaid Link token scoped to the current user.

### `POST /plaid/exchange-public-token`
Exchanges the public token returned by Plaid Link for an access token. The access token is encrypted with ASP.NET Core Data Protection before being persisted.

```json
{ "publicToken": "public-sandbox-..." }
```

The exchange response includes the Plaid Item id, number of imported accounts, and whether a background sync was queued. Transaction, balance, and investment sync now run from the `plaid-daily-sync-items` queue after link exchange and from the daily timer.

### `POST /plaid/items/{itemId}/update-complete`
Called by the SPA after a Plaid Link update-mode reconnect succeeds. Marks the Item active again and queues background sync.

### `DELETE /accounts/{accountId}`
Deletes or archives an account. For Plaid-linked accounts, deleting the final active account for an Item also removes the Plaid Item and stored access token.

---

## 6. Investments & watchlist

| Method | Path | Purpose |
|---|---|---|
| GET | `/investments` | List holdings |
| POST | `/investments` | Upsert a holding |
| DELETE | `/investments/{symbol}` | Remove a holding |
| GET | `/investments/watchlist` | List watchlist symbols |
| POST | `/investments/watchlist` | Add a watchlist entry (`{ "symbol", "exchange" }`) |
| DELETE | `/investments/watchlist/{symbol}` | Remove a watchlist entry |
| GET | `/investments/overview` | Holdings valuations + company news; returns popular symbols if the user has no holdings |
| GET | `/investments/activity` | Recent Plaid investment transactions such as buys, sells, dividends, fees, and transfers |

---

## 7. Reports

### `GET /reports/{period}/latest`
- `period`: `weekly` or `monthly`
- Returns the latest AI-generated markdown report as JSON, or `404` if none exists.

---

## 8. Chat assistant

### `POST /chat`
Send a user message; the agent may invoke tools before answering.

```json
{
  "conversationId": "optional-conversation-id",
  "message": "How did my food spending change this month?"
}
```

Response:

```json
{
  "conversationId": "conv-001",
  "answer": "Food spending rose 12.4% month over month ...",
  "usedTools": ["get_transactions", "get_user_profile"],
  "traceId": "00-9d1..."
}
```

### `GET /chat/conversations`
Lists the user's conversations (summary only).

### `GET /chat/conversations/{id}`
Returns the full message history (plus tool calls) for a conversation.

Available agent tools (see `Services/Tools/`):
`get_user_profile`, `get_accounts`, `get_transactions`, `get_investments`, `get_investment_overview`, `get_watchlist`, `search_finance_news`, `generate_portfolio_report`. Every tool call is scoped to the authenticated `userId`.

---

## 9. Error contract (target)

Errors currently return plain problem details. A unified contract is planned:

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Type must be INCOME or EXPENSE.",
    "traceId": "00-..."
  }
}
```
