# Assistant and Tool-Orchestration Design

## 1. Current State

The project already includes an assistant entry point and server-side orchestration:

- Frontend assistant page (`/assistant`) and chat UI components
- Backend `/chat` endpoint
- Conversation history endpoints
- Tool execution service with finance-focused tools

This document describes the architecture as currently implemented and how to evolve it safely.

## 2. High-Level Flow

```text
[Assistant UI]
    |
    v
POST /api/chat
    |
    v
[ChatFunction]
    |
    v
[IChatAgentService]
    |
    +--> [SystemPromptBuilder]
    +--> [ToolExecutor]
              |
              +--> get_user_profile
              +--> get_accounts
              +--> get_transactions
              +--> get_investments
              +--> get_investment_overview
              +--> get_watchlist
              +--> search_finance_news
              +--> generate_portfolio_report
    |
    v
[Azure OpenAI response + persisted conversation]
```

## 3. Core Components

- `ChatFunction`: validates input and user context, invokes chat agent service.
- `ChatAgentService`: orchestrates LLM + tools + persistence lifecycle.
- `SystemPromptBuilder`: composes runtime instruction context.
- `ToolExecutor`: dispatches and normalizes tool calls.
- `ConversationService`: stores and reads conversation summaries/details.

## 4. API Surface

- `POST /chat`
- `GET /chat/conversations`
- `GET /chat/conversations/{conversationId}`

## 5. Guardrails

- Every tool call must remain user-scoped.
- Reject or sanitize malformed payloads before prompt composition.
- Preserve deterministic audit fields (conversationId, timestamps, tool names) for diagnostics.
- Keep tool output constrained (size/content) before injecting into model context.

## 6. Recommended Near-Term Enhancements

1. Add explicit per-tool timeout and retry policy.
2. Standardize assistant response envelope (`answer`, `citations`, `usedTools`, `traceId`).
3. Add prompt-injection and unsafe-tool-call test cases.
4. Introduce redaction for sensitive text in stored conversation logs.
5. Add per-user and per-endpoint rate limits.

## 7. Non-Goals for the Next Iteration

- Autonomous multi-step trading execution.
- Unrestricted external web browsing from the assistant.
- Long-term memory without explicit user controls and retention policy.
