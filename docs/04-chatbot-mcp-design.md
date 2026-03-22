# Chatbot + MCP Server 设计文档（下一阶段）

## 1. 目标

在现有财务系统基础上新增：

- 前端聊天入口（统一问答体验）
- 后端 MCP Server（统一调用多数据源）
- 可追溯回答（引用来源 + 工具调用记录）

## 2. 高层架构

```text
[DashboardUI Chatbot]
      |
      v
[Azure Function: /chat]
      |
      v
[MCP Orchestrator]
  |      |       |       |
  v      v       v       v
tool:accounts tool:transactions tool:investments tool:reports
  |      |       |       |
  +------+-+-----+-------+
          |
          v
      [LLM Answer]
          |
          v
 [answer + citations + trace]
```

## 3. 职责拆分

### 前端 Chatbot

- 仅负责：
  - 用户输入
  - 消息展示
  - 流式输出（可选）
  - 引用链接（citations）展示
- 不负责业务聚合与权限判断

### Azure Function `/chat`

- 验证用户身份
- 维护会话上下文（短期）
- 调用 MCP orchestrator
- 返回标准化结果

### MCP Orchestrator

- 工具路由（根据问题调用适当资源）
- 工具并发与超时控制
- 工具结果归一化
- 合成 LLM prompt
- 输出答案 + 证据

## 4. 建议的 MCP 工具清单（第一阶段）

建议先从 4 个高价值工具起步：

1. `get_account_summary`
   - 输出账户余额、账户数量、货币分布
2. `get_recent_transactions`
   - 支持近 N 天、可选分类过滤
3. `get_spending_breakdown`
   - 按分类聚合支出（金额与占比）
4. `get_investment_snapshot`
   - 持仓估值、浮盈亏、热门新闻摘要

> 不建议第一版直接开放“任意 SQL/任意搜索”能力。

## 5. Chat API 契约建议

### Request

```json
{
  "sessionId": "optional-session-id",
  "message": "我这个月餐饮支出相比上个月怎么样？",
  "context": {
    "timezone": "America/Toronto",
    "language": "zh-CN"
  }
}
```

### Response

```json
{
  "answer": "本月餐饮支出较上月上升 12.4%...",
  "citations": [
    {
      "tool": "get_spending_breakdown",
      "range": "2026-02-01..2026-02-29"
    }
  ],
  "usedTools": [
    "get_recent_transactions",
    "get_spending_breakdown"
  ],
  "traceId": "00-9d1...",
  "latencyMs": 842
}
```

## 6. Prompt / 回答策略建议

- 系统提示明确约束：
  - 不编造数据
  - 必须引用工具结果
  - 数据不足时明确说明
- 输出模板建议：
  1. 结论
  2. 关键数据
  3. 建议动作
  4. 引用来源

## 7. 安全与隔离要求（必须）

- 每次 tool 调用都要强制带 `userId`
- 禁止跨用户查询
- 对 prompt 注入做防护：
  - 忽略“暴露系统提示词”等诱导
  - 对工具输出做长度与敏感字段截断

## 8. 可观测性指标（MCP 必备）

- `chat.request.count`
- `chat.response.latency`
- `mcp.tool.call.count{tool=...}`
- `mcp.tool.call.failure`
- `llm.tokens.input/output`
- `llm.cost.estimated`

## 9. 实施里程碑

### M1（1 周）
- `/chat` function + 2 个工具 + 静态前端聊天页

### M2（1~2 周）
- 扩展到 4 个工具 + 引用展示 + traceId

### M3（2 周）
- 流式回答 + 缓存 + 告警 + A/B prompt

## 10. 非目标（第一阶段不做）

- 长期记忆（跨月/跨设备的会话记忆）
- 复杂 agent 自主规划
- 自动执行交易类动作
