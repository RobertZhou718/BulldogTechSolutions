# Architecture Overview

## 1. Product Scope

Bulldog Finance is a full-stack personal finance application focused on:

- Microsoft Entra CIAM sign-in in the SPA
- First-time user onboarding
- Accounts and transactions management
- Investments, watchlist, and market news aggregation
- AI assistant responses and generated weekly/monthly reports

## 2. Current Technology Stack

### Frontend (`BulldogFinance/DashboardUI`)

- React 19 + Vite 7
- React Router 7
- MSAL (`@azure/msal-browser`, `@azure/msal-react`) for authentication
- Tailwind CSS 4 + React Aria component patterns

### Backend (`BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions`)

- .NET 8
- Azure Functions v4 (isolated worker)
- Azure Table Storage (operational entities)
- Azure Blob Storage (report snapshots)
- Azure OpenAI (assistant/report generation)
- Finnhub (market quotes and company news)
- Plaid (bank account linking, sync, and balance refresh)

## 3. Logical Architecture

```text
[React SPA]
  |- MSAL login/session
  |- Dashboard, Transactions, Investments, Assistant pages
  v
[Azure Functions HTTP API]
  |- User/account/transaction/investment/report endpoints
  |- Chat endpoints and conversation history
  |- Plaid integration endpoints + webhook
  v
[Domain Services + Repositories]
  |- business orchestration
  |- external API clients (Plaid/Finnhub/OpenAI)
  v
[Storage]
  |- Azure Table Storage
  |- Azure Blob Storage
```

## 4. Key Runtime Flows

### A. Sign-in and onboarding gate

1. SPA authenticates user with MSAL.
2. `GET /me` determines onboarding status.
3. If onboarding is incomplete, user is redirected to `/onboarding`.
4. `POST /onboarding` creates the user profile and initial accounts/seed transactions.

### B. Daily finance operations

1. Accounts are loaded through `GET /accounts`.
2. Transactions are created by `POST /transactions`.
3. Account balances are updated in backend transaction/account services.
4. Filtered history is retrieved through `GET /transactions`.

### C. Investment and market context

1. Portfolio/watchlist entities are stored in Table Storage.
2. `GET /investments/overview` merges holdings with Finnhub quote/news data.
3. The UI renders holdings, popular symbols, and watchlist insights.

### D. Assistant and reports

1. `/chat` receives the user prompt and delegates to chat orchestration services.
2. Tool execution retrieves user-scoped data (accounts, transactions, investments, watchlist, news, report generation).
3. Weekly/monthly timers generate report artifacts and save them to Blob Storage.
4. `GET /reports/{period}/latest` returns the latest generated report snapshot.

## 5. Current Constraints

- Function HTTP triggers are still `AuthorizationLevel.Anonymous`; user isolation depends on request headers (`X-MS-CLIENT-PRINCIPAL-ID` / `X-Debug-UserId`) and must be hardened for production JWT validation.
- The service is heavily Table Storage-based, so query efficiency and partition strategy should continue to be optimized as data grows.
- Error payloads and tracing conventions are not yet fully standardized across all endpoints.
