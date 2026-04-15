# Testing Strategy

## 1. Objectives

- Protect core finance workflows from regressions.
- Keep API contracts stable for the React frontend.
- Validate assistant correctness, safety, and traceability.

## 2. Test Pyramid

## Unit tests (backend)

Prioritize coverage for:

- `ReportService`: empty-input behavior, aggregation correctness, output format.
- `InvestmentOverviewService`: missing API key behavior, upstream fallback logic.
- `PlaidSyncService`: sync cursor/state transitions, duplicate handling.
- Repository filters: date/account/user boundary conditions.
- Chat orchestration components: tool selection and response normalization.

## Integration tests

Cover key endpoint chains:

- `POST /onboarding` -> `GET /accounts`
- `POST /transactions` -> `GET /transactions`
- Plaid token exchange/sync happy path
- `POST /investments` -> `GET /investments/overview`
- `POST /chat` -> conversation retrieval endpoints

## End-to-end tests (frontend)

- Login and onboarding gate behavior.
- Transaction creation and list refresh.
- Investment/watchlist CRUD flows.
- Assistant prompt submission and response rendering.

## 3. Assistant-Specific Quality Gates

- Responses should not fabricate financial values.
- Tool calls must remain user-scoped.
- Empty/partial data should produce explicit fallback messaging.
- Prompt-injection attempts should not bypass guardrails.
- Conversation retrieval must be consistent after chat completion.

## 4. Non-Functional Testing

- Load testing for chat and transaction endpoints.
- Soak testing for timer-trigger report generation.
- Cost regression tracking for assistant token usage.
- Basic resilience testing for upstream outages (Finnhub/Plaid/OpenAI).

## 5. CI Gate Recommendations

At minimum before merge:

- [ ] Build passes (frontend + backend)
- [ ] Lint/static checks pass
- [ ] Unit test suite passes
- [ ] Integration smoke suite passes
- [ ] Security checks for auth/user isolation pass
