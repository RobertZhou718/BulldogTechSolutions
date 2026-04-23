# API Reference (current implementation)

> Base URL (local): `http://localhost:7071/api`

## 1. Authentication

All endpoints (except the native auth proxy endpoints themselves) require a valid Microsoft Entra External ID access token:

```
Authorization: Bearer <jwt>
```

Tokens are validated by `BearerTokenAuthenticationMiddleware` against `Auth:Authority`, `Auth:Audience`, and `Auth:ValidIssuers`. A missing or invalid token returns `401 Unauthorized`.

---

## 2. Native auth proxy (`/auth/native/*`)

These endpoints forward to the Entra External ID Native Auth API for email/password and social flows so the SPA does not need to talk to Entra directly.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/native/signin` | Email + password sign-in |
| POST | `/auth/native/signup` | Email + password sign-up |
| POST | `/auth/native/social` | Social provider flow |
| POST | `/auth/native/token` | Token refresh |
| POST | `/auth/native/signout` | Sign out / revoke |
| POST | `/auth/native/password-reset` | Password reset flow |

Requests and responses mirror the Entra Native Auth API contract (see `Services/Auth/AuthProxyModels.cs`).

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

### `POST /plaid/refresh-balances`
Forces a balance refresh for all linked items for the current user.

### `POST /plaid/sync-transactions`
Pulls new transactions using Plaid's `/transactions/sync` cursor.

### `DELETE /plaid/items/{itemId}`
Unlinks a Plaid item and clears stored tokens.

### `POST /plaid/webhook`
Webhook endpoint called by Plaid. Verifies the payload and queues the appropriate refresh/sync.

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
