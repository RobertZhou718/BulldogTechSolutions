# Observability and Operations Runbook

## 1. Goals

Observability should make the following questions easy to answer:

1. Where is latency increasing?
2. Which endpoint/tool is failing most often?
3. Which data sources were used for a specific assistant response?
4. Is model/token cost within budget?

## 2. Metrics Baseline

### API metrics

- Request count by route
- p50/p95/p99 latency
- 4xx/5xx rates
- timeout rate

### Assistant/tool metrics

- chat request count and latency
- tool call count/failure rate (by tool)
- per-tool latency
- model input/output tokens
- estimated cost per request

### Business metrics

- DAU/WAU
- onboarding completion rate
- report generation success rate (weekly/monthly)
- assistant conversation success/fallback rate

## 3. Logging Standard

Use structured JSON logs with consistent keys:

```json
{
  "timestamp": "2026-04-15T12:00:00Z",
  "level": "Information",
  "traceId": "00-...",
  "userId": "u-123",
  "endpoint": "/api/chat",
  "tool": "get_transactions",
  "latencyMs": 180,
  "status": "ok"
}
```

## 4. Tracing

- Generate a trace/span context at API ingress.
- Propagate trace IDs through chat orchestration and tool execution.
- Include trace IDs in error responses and support logs.

## 5. Alerting Recommendations

Critical:

- `/chat` 5xx > 2% for 5 minutes
- tool timeout rate > 5%
- report timer job failure
- sustained model/API upstream failures

Cost/abuse:

- token usage exceeds daily budget threshold
- abnormal per-user request burst patterns

## 6. Runbook Scenarios

### A. Chat 500 spike

1. Check recent deployment and config changes.
2. Filter failed requests by trace ID.
3. Identify whether failures are model-side, tool-side, or storage-side.
4. Apply degradation policy (disable expensive optional tools, return partial answer messaging).

### B. Finnhub or Plaid instability

1. Enable fallback/cached data paths where safe.
2. Reduce call concurrency and retry aggressiveness.
3. Communicate stale-data state in user-facing responses.

### C. Cost anomaly

1. Inspect top token-consuming routes/tools.
2. Reduce prompt/tool payload size and max output tokens.
3. Apply rate limits and per-user usage controls.

## 7. Capacity and Reliability Tips

- Add short-lived caching for expensive aggregate reads.
- Use idempotency patterns where write retries are possible.
- Validate timer-trigger reliability and dead-letter/retry handling for background operations.
