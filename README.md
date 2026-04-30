# BulldogTechSolutions / Bulldog Finance

Bulldog Finance is a full-stack personal finance application centered on **personal finance management, investment tracking, AI reporting, and a Plaid-powered chat assistant**.

## Repository layout

- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + React Aria Components + MSAL + react-plaid-link — [`BulldogFinance/DashboardUI`](BulldogFinance/DashboardUI)
- Backend: Azure Functions (.NET 8, Isolated Worker) + Azure Table/Blob Storage + Going.Plaid + Finnhub + Azure OpenAI — [`BulldogFinance/BulldogFinance.Functions`](BulldogFinance/BulldogFinance.Functions)

## Documentation

- [Architecture overview](docs/01-architecture.md)
- [Local development & environment setup](docs/02-local-development.md)
- [API reference](docs/03-api-reference.md)
- [Chat agent design](docs/04-chat-agent-design.md)
- [Security & compliance](docs/05-security-compliance.md)
- [Observability & operations runbook](docs/06-observability-operations.md)
- [Testing strategy](docs/07-testing-strategy.md)
- [Roadmap](docs/08-roadmap.md)

## Current status

The core product loop is in place:

1. Authentication (Microsoft Entra External ID / MSAL Custom Native Auth via the `/api/native-auth` gateway) and user onboarding
2. Account & transaction management (manual + Plaid Link with automated balance refresh and transaction sync)
3. Investment holdings, watchlist, and aggregated market news (Finnhub)
4. Scheduled weekly / monthly AI reports (Azure OpenAI)
5. In-app AI assistant backed by a tool-calling agent with access to user data and market news

Ongoing focus: hardening security (JWT validation is live; tightening key rotation and prompt-injection defenses), richer assistant reasoning, and expanding the tool catalog.
