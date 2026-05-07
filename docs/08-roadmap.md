# Roadmap

## Phase 0 — delivered

- Authentication (MSAL + native auth proxy for email/password and social)
- JWT validation middleware
- Onboarding
- Accounts & transactions (manual)
- Plaid Link, balance refresh, and transaction sync (Going.Plaid)
- Encrypted Plaid token storage (ASP.NET Core Data Protection)
- Investment holdings + watchlist + Finnhub aggregation
- Plaid investments product sync for holdings, securities, investment transactions, and portfolio snapshots
- Weekly / monthly AI reports (Azure OpenAI)
- In-app chat assistant with tool-calling agent and persistent conversations
- Application Insights telemetry

## Phase 1 — assistant depth (in progress)

- Streaming responses on `/chat` (SSE)
- Follow-up / context-aware questions inside a single conversation
- Thumbs-up / thumbs-down feedback UI and storage
- Richer tools: budget vs. actual, spending anomalies, category trend
- Expanded prompt-injection test suite in CI

## Phase 2 — reliability & hardening

- Key Vault for all runtime secrets
- Durable Data Protection key storage (Key Vault + Blob)
- Rate limiting on `/chat` and Plaid endpoints
- Uniform error contract across all APIs (`{ error: { code, message, traceId } }`)
- Cached hot aggregates (30–120s TTL) for accounts / overview
- Complete alerting + runbook coverage per [docs/06](06-observability-operations.md)

## Phase 3 — experience & growth

- Smart suggestion cards on the dashboard (budget, category trend, anomaly)
- Multi-currency refinements (FX rates, display vs. base currency)
- Prompt A/B experiments with metric-linked rollout
- Accessibility audit of React Aria Components usage

## Phase 4 — long-term platform

- Plug-in data sources (tax, bills, additional aggregators)
- Internal tool registry so new `IAgentTool` implementations auto-register
- Policy engine (budget thresholds, alerts, scheduled plans)
- Mobile surface (PWA / native shell over the existing React app)

## Risks & dependencies

- External data-source stability (Plaid, Finnhub)
- AI cost volatility (Azure OpenAI token pricing)
- Identity & permissions governance (Entra External ID tenant setup, key rotation)
- Test & operational maturity (coverage, on-call rotation)
