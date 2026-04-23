# Architecture Overview

## 1. Goals and scope

Bulldog Finance is a personal "wealth view" application that covers:

- Authentication via Microsoft Entra External ID (MSAL) plus a native email/password and social auth proxy
- First-run onboarding
- Account and transaction management, including Plaid Link bank connections
- Investment holdings, watchlist, and market information aggregation
- AI-generated reports based on financial snapshots
- An in-app AI assistant (tool-calling agent) that can query the user's financial data and market news

## 2. System layers

### Frontend (`DashboardUI`)

- Stack: **React 19**, **Vite 7**, **Tailwind CSS v4**, **React Aria Components**, **React Router 7**, **MSAL Browser 4**, **react-plaid-link 4**, **React Compiler** (babel plugin)
- Responsibilities:
  - Session / login state and routing
  - Backend API calls (via `services/apiClient.js`)
  - Pages: Dashboard, Transactions, Investments, Onboarding, Assistant (chat), Auth (native sign-in / sign-up / reset)

### Backend (Azure Functions)

- Stack: **.NET 8**, **Azure Functions v4 Isolated Worker**, **Microsoft.AspNetCore.App** (HTTP integration), **Application Insights**
- Responsibilities:
  - REST API surface (`/me`, `/onboarding`, `/accounts`, `/transactions`, `/investments`, `/reports`, `/chat`, `/plaid/*`, `/auth/*`)
  - Bearer-token middleware that validates Entra JWTs and populates the per-request user context
  - Native auth proxy (sign-in / sign-up / social / token refresh / password reset) forwarded to the Entra Native Auth API
  - Plaid webhook handling and timer-triggered balance refresh + transaction sync
  - Timer triggers for weekly / monthly AI report generation

### Service layer

- Business orchestration: `InvestmentService`, `InvestmentOverviewService`, `ReportService`, `PlaidSyncService`, `ChatAgentService`, `ConversationService`, `ToolExecutor`, `SystemPromptBuilder`
- External integrations:
  - **Going.Plaid** (bank linking, transactions, balances)
  - **Finnhub** (quotes, company news)
  - **Azure OpenAI** (chat completions + report generation via `AzureOpenAiClient` / `IAiClient`)
  - **Microsoft Entra External ID Native Auth API** (via `NativeAuthApiProxyService`)
- Storage abstractions: `IUserRepository`, `IAccountRepository`, `ITransactionRepository`, `IPlaidRepository`, `IReportStorage`
- Secret protection: **ASP.NET Core Data Protection** wraps Plaid access tokens via `IPlaidTokenProtector`

### Data layer

- **Azure Table Storage**: `Users`, `Accounts`, `Transactions`, `Investments`, `Watchlist`, `PlaidItems`, `ChatConversations`
- **Azure Blob Storage**: `reports` container (weekly/monthly latest markdown reports)
- Credentials: connection string **or** `ServiceUri` + `DefaultAzureCredential` (managed identity friendly; `ManagedIdentity:ClientId` supported)

### Agent / tool layer

- `IAgentTool` implementations are registered as singletons and discovered by `ToolExecutor`:
  - `GetUserProfileTool`
  - `GetAccountsTool`
  - `GetTransactionsTool`
  - `GetInvestmentsTool`
  - `GetInvestmentOverviewTool`
  - `GetWatchlistTool`
  - `SearchFinanceNewsTool`
  - `GeneratePortfolioReportTool`
- `ChatAgentService` composes a system prompt (`SystemPromptBuilder`), runs an Azure OpenAI tool-calling loop, and persists conversations via `ConversationService`.

## 3. Core flows

### Flow A — First-time onboarding

1. After MSAL (or native) sign-in the SPA calls `GET /me`.
2. If `onboardingDone=false`, it routes to `/onboarding`.
3. User submits default currency + initial accounts to `POST /onboarding`.
4. Backend creates the user profile, accounts, and INIT transactions; may also offer Plaid Link.

### Flow B — Plaid bank linking

1. Client calls `POST /plaid/link-token` to get a short-lived link token.
2. `react-plaid-link` completes the Link flow and returns a public token.
3. Client exchanges it via `POST /plaid/exchange-public-token`.
4. Backend encrypts the access token (Data Protection) and persists the item via `PlaidRepository`.
5. Plaid webhooks hit `/plaid/webhook`; timer triggers refresh balances and sync transactions through `PlaidSyncService`.

### Flow C — Transactions

1. `GET /accounts` lists the user's accounts.
2. `POST /transactions` posts a manual transaction; account balance is updated atomically.
3. `GET /transactions?accountId=&from=&to=` returns history.

### Flow D — Investment overview

1. `GET /investments/overview`.
2. Backend loads holdings, pulls quotes + company news from Finnhub, and returns a Holdings + Popular payload.

### Flow E — AI reports

1. Timer trigger runs weekly/monthly.
2. `ReportService` aggregates transactions into a snapshot.
3. Azure OpenAI produces a markdown report.
4. Latest report per period is written to Blob Storage.
5. SPA fetches with `GET /reports/{period}/latest`.

### Flow F — Chat assistant

1. SPA posts a message to `POST /chat` with an optional `conversationId`.
2. `ChatAgentService` loads prior turns from `ConversationService`, builds a system prompt, and calls Azure OpenAI with the registered `IAgentTool` catalog.
3. `ToolExecutor` routes tool calls, always enforcing the authenticated `userId`.
4. The assistant response + tool trace is persisted and returned to the client.

## 4. Cross-cutting

- **Auth**: `BearerTokenAuthenticationMiddleware` validates `Authorization: Bearer <jwt>` and exposes user claims downstream.
- **Observability**: Application Insights via `Microsoft.Azure.Functions.Worker.ApplicationInsights`.
- **Configuration**: `local.settings.json` for dev, environment variables / App Service settings in the cloud.

## 5. Known limitations (tracked in the roadmap)

- Transaction queries still use per-user scans with in-memory filtering; should move to partition-aware filtered queries once volume grows.
- No uniform error-code contract yet across endpoints.
- Prompt-injection mitigations for the assistant are basic and need to be hardened.
- Test matrix (unit/integration/e2e) is still thin.
