# 可观测性与运维 Runbook

## 1. 可观测性目标

确保可以回答以下问题：

1. 系统慢在哪里？
2. 哪个接口或工具失败率最高？
3. 某条用户回答用到了哪些数据源？
4. AI 成本是否可控？

## 2. 指标体系（建议）

## 应用层指标

- API QPS（按 endpoint）
- p50/p95/p99 latency
- 4xx / 5xx 比例
- 超时率

## MCP/LLM 指标

- tool 调用次数/失败率（按 tool 维度）
- tool 平均耗时
- LLM 输入/输出 token
- 单请求估算成本
- fallback 触发率

## 业务指标

- 每日活跃用户（DAU）
- 聊天日请求量
- 聊天回答满意度（可通过点赞/点踩）
- 报告生成成功率（weekly/monthly）

## 3. 日志规范（建议）

统一 JSON 日志结构：

```json
{
  "timestamp": "2026-02-25T10:00:00Z",
  "level": "Information",
  "traceId": "00-...",
  "userId": "u-123",
  "endpoint": "/api/chat",
  "tool": "get_spending_breakdown",
  "latencyMs": 120,
  "status": "ok"
}
```

## 4. 分布式追踪

- 为每次请求生成 `traceId`
- `chat -> tool -> external api` 贯穿同一 trace
- 回包中可返回 traceId，便于用户/客服定位问题

## 5. 告警策略

## 关键告警

- `/chat` 5xx > 2% 持续 5 分钟
- MCP tool 超时率 > 5%
- LLM 错误率 > 3%
- 报告定时任务失败

## 可选告警

- 成本突增（超预算阈值）
- 单用户异常请求频率（疑似滥用）

## 6. 运行手册（Runbook）

### 场景 A：chat 接口 500 激增

1. 查看最近部署变更
2. 按 traceId 抽样排查失败请求
3. 判断是 tool 失败还是 LLM 失败
4. 触发降级：
   - 临时关闭高耗时工具
   - 返回“部分数据暂不可用”

### 场景 B：外部数据源（Finnhub）不稳定

1. 启用缓存兜底（最近一次成功快照）
2. 降低工具并发与调用频率
3. 在回答中标注“实时行情源不可用，以下为缓存数据”

### 场景 C：AI 成本异常

1. 查看 token 消耗 Top endpoints
2. 调整 max tokens 与 prompt 长度
3. 限制高频用户请求速率

## 7. 容量建议

- 对 chat 请求做限流（按用户 + 全局）
- 对热点统计结果做短时缓存（30s~120s）
- 对新闻类工具做去重缓存
