# Chat Assistant Design

## 1. Goals

On top of the existing finance platform, the in-app assistant provides:

- A single conversational entry point over the user's own accounts, transactions, holdings, watchlist, and market news
- Traceable answers (tool-call trace + cited data)
- Persistent conversations that can be resumed

## 2. High-level architecture

```text
[DashboardUI /assistant page]
           |
           v
[Azure Function: POST /chat]
           |
           v
[ChatAgentService]
     |              \
     v               v
[ConversationService]  [SystemPromptBuilder]
     |                        |
     +---------> [Azure OpenAI (tool calling)]
                          |
                          v
                   [ToolExecutor]
                          |
 +-----+-------+----------+----------+--------+---------+------------------+
 |     |       |          |          |        |         |                  |
 v     v       v          v          v        v         v                  v
user accounts transactions invest. invest.   watch-  finance        portfolio
profile                    holdings overview  list   news            report
```

## 3. Component responsibilities

### Frontend (`pages/Assistant.jsx`)
- Handles user input, message rendering, loading state, and error surfaces.
- Displays the assistant's final answer plus the set of tools that were used.
- Does **not** aggregate data itself — it only talks to `/chat`.

### `POST /chat` Azure Function
- Validates the bearer token (middleware) and extracts `userId`.
- Delegates to `IChatAgentService`.

### `ChatAgentService`
- Loads (or creates) a conversation via `IConversationService`.
- Builds a system prompt via `ISystemPromptBuilder` (with user context + tool catalog description).
- Runs the tool-calling loop against `IAiClient` (`AzureOpenAiClient`).
- Persists user + assistant turns and the tool trace.

### `ToolExecutor` + `IAgentTool`
- Discovers all registered `IAgentTool` singletons.
- Routes tool calls from the model, enforces timeouts, and injects the authenticated `userId` — tools **cannot** be invoked for a different user.

## 4. Current tool catalog

| Tool | Purpose |
|---|---|
| `get_user_profile` | Basic profile + default currency |
| `get_accounts` | Account list with balances |
| `get_transactions` | Transactions with optional date / account filters |
| `get_investments` | Current holdings |
| `get_investment_overview` | Holdings + quotes + news |
| `get_watchlist` | Watchlist symbols |
| `search_finance_news` | Market news via Finnhub |
| `generate_portfolio_report` | On-demand portfolio summary via the report pipeline |

New tools are added by implementing `IAgentTool` and registering as a singleton in `Program.cs`.

## 5. Chat API contract

### Request

```json
{
  "conversationId": "optional-conversation-id",
  "message": "How did my food spending change this month?"
}
```

### Response

```json
{
  "conversationId": "conv-001",
  "answer": "Food spending rose 12.4% month over month ...",
  "usedTools": ["get_transactions", "get_user_profile"],
  "traceId": "00-9d1..."
}
```

Conversation history is retrievable via `GET /chat/conversations` and `GET /chat/conversations/{id}`.

## 6. Prompting strategy

- System prompt constraints:
  - Never fabricate numbers or dates
  - Always ground answers in tool results; if data is insufficient, say so
  - Operate only on the authenticated user's data
- Preferred answer shape:
  1. Conclusion
  2. Key numbers
  3. Suggested next action
  4. Which tools informed the answer

## 7. Security requirements

- Every tool call is bound to the authenticated `userId`; cross-user access is structurally impossible.
- Plaid access tokens are encrypted at rest via ASP.NET Core Data Protection (`IPlaidTokenProtector`) and never reach the LLM.
- Basic prompt-injection mitigations (ignore "reveal system prompt" style inputs, bound tool output length). Hardening is ongoing.
- Tool output is truncated before being fed back to the model to limit cost and leak surface.

## 8. Observability

- Each `/chat` request logs `traceId`, `userId`, conversation id, invoked tools, tool latencies, token usage, and final status to Application Insights.
- Conversation + trace data is stored in the `ChatConversations` table for replay.

## 9. Roadmap items (not yet implemented)

- Streaming responses (SSE)
- Long-term / cross-conversation memory
- Autonomous multi-step agent planning
- Action-taking tools (posting transactions, placing trades) — intentionally out of scope until explicit confirmation UX exists
