# Observability & Operations Runbook

Telemetry flows into **Azure Application Insights** via `Microsoft.Azure.Functions.Worker.ApplicationInsights`. Set `APPLICATIONINSIGHTS_CONNECTION_STRING` to enable it.

## 1. Questions the stack must answer

1. Where is the system slow?
2. Which endpoint or agent tool fails most often?
3. Which data sources contributed to a given assistant answer?
4. Is AI / Plaid / Finnhub cost under control?

## 2. Metrics

### Application layer
- Request rate per endpoint
- p50 / p95 / p99 latency
- 4xx / 5xx rates
- Timeout rate

### Agent / LLM layer
- `chat.request.count`
- `chat.response.latency`
- `agent.tool.call.count{tool=...}`
- `agent.tool.call.failure{tool=...}`
- `agent.tool.latency{tool=...}`
- `llm.tokens.input` / `llm.tokens.output`
- `llm.cost.estimated`

### External integrations
- `plaid.call.count{endpoint=...}` / failure rate
- `plaid.daily_sync.queued`
- `plaid.daily_sync.failure`
- `finnhub.call.count` / failure rate
- `openai.call.count` / failure rate

### Business
- DAU
- Daily chat volume
- Assistant thumbs-up / thumbs-down ratio (once feedback UI ships)
- Weekly / monthly report generation success rate
- Plaid items linked / unlinked per day

## 3. Structured logging

Emit JSON-friendly log entries (Application Insights customDimensions) for each request:

```json
{
  "timestamp": "2026-04-23T10:00:00Z",
  "level": "Information",
  "traceId": "00-...",
  "userId": "u-123",
  "endpoint": "/api/chat",
  "tool": "get_transactions",
  "latencyMs": 120,
  "status": "ok"
}
```

Never log access tokens, Plaid access tokens, or raw transaction notes at `Information` level.

## 4. Distributed tracing

- Each request produces a `traceId` (W3C trace context, auto-propagated by Application Insights).
- The trace spans `HTTP trigger -> service -> tool -> external API`.
- `traceId` is returned in `/chat` responses to help with user-side debugging.

## 5. Alerts

### Critical
- `/chat` 5xx > 2% for 5 minutes
- Any agent tool failure rate > 5% for 5 minutes
- Azure OpenAI error rate > 3%
- Scheduled report job failure
- Plaid `/transactions/sync` error rate > 5%
- Data Protection decryption failure on Plaid tokens (indicates lost / rotated keys)

### Warning
- Token spend above daily budget threshold
- Unusual per-user request rate (possible abuse)
- Plaid daily sync queue backlog or message age growing

## 6. Runbooks

### Scenario A — `/chat` 5xx spike
1. Check recent deploys.
2. Sample failing requests by `traceId` in Application Insights.
3. Determine whether failure is in a tool, the LLM call, or conversation persistence.
4. Mitigate:
   - Temporarily disable the failing tool by removing its singleton registration
   - Return a graceful "some data is temporarily unavailable" answer

### Scenario B — Finnhub unstable
1. Fall back to the most recent cached snapshot.
2. Reduce concurrency / request frequency.
3. Annotate responses with "live quotes unavailable, showing cached data".

### Scenario C — AI cost spike
1. Inspect token usage by endpoint.
2. Reduce `max_tokens` / trim prompt context.
3. Rate-limit heavy users on `/chat`.

### Scenario D — Plaid access token decryption failures
1. Confirm the Data Protection keys directory is intact and hasn't been rotated without re-encryption.
2. If keys are lost, prompt affected users to re-link accounts; there is no recovery path for old ciphertext.

### Scenario E — Plaid daily sync backlog
1. Check the `plaid-daily-sync-items` queue length and oldest message age.
2. Inspect `ProcessDailyPlaidSyncItem` failures by `ItemId` and Plaid endpoint.
3. If a single Item is failing repeatedly, check its stored Plaid status and `/transactions/sync` cursor, then prompt the user to reconnect if the error is `ITEM_LOGIN_REQUIRED`.

## 7. Capacity & cost hygiene

- Rate-limit `/chat` per user and globally.
- Short-TTL cache (30–120s) for hot aggregates (accounts summary, investment overview).
- Deduplicate news queries across users within the same time window.
- Cap tool output size before returning it to the model.
