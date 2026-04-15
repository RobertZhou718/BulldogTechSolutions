# Roadmap

## Current Baseline (as of April 2026)

Implemented capabilities:

- Authentication-integrated SPA with onboarding flow
- Accounts and transactions management
- Investments + watchlist + market news overview
- Assistant endpoint and conversation history APIs
- Weekly/monthly generated report retrieval
- Plaid account linking and sync endpoints

## Phase 1 (Next 2–4 weeks): Production Hardening

Focus:

- Enforce JWT validation in backend
- Remove production dependency on debug identity headers
- Standardize error schema and trace IDs
- Add per-user rate limiting and safer retry policies
- Expand automated tests for assistant/tooling and Plaid flows

Success criteria:

- Authn/authz baseline is production-ready
- Core endpoints have consistent error/trace behavior
- Operational alerts and runbook are actionable

## Phase 2 (Next 4–8 weeks): Reliability and Data Quality

Focus:

- Improve Table Storage query and partition strategy
- Add caching for high-cost aggregate/read patterns
- Harden external dependency fallback behavior
- Improve chat response consistency with structured citations

Success criteria:

- Lower p95 latency for dashboard/assistant queries
- Lower upstream-failure user impact
- Clear provenance in assistant responses

## Phase 3 (8+ weeks): Product Experience Expansion

Focus:

- Streaming assistant responses in UI
- Proactive insights cards (spending drift, anomaly signals)
- Feedback loops for assistant quality tuning
- Better report personalization and narrative quality

Success criteria:

- Increased assistant engagement and positive feedback
- Lower repeated-support questions
- Measurable uplift in user retention metrics

## Key Risks and Dependencies

- Upstream API reliability (Plaid/Finnhub/OpenAI)
- Security hardening timeline and identity integration dependencies
- Cost control for model-driven features
- Team bandwidth for simultaneous feature and reliability work
