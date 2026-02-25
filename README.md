# BulldogTechSolutions / Bulldog Finance

Bulldog Finance 是一个以 **个人财务管理 + 投资追踪 + AI 报告** 为核心的全栈项目。

当前仓库包含：

- 前端：React + Vite + MUI + MSAL（`BulldogFinance/DashboardUI`）
- 后端：Azure Functions (.NET 8) + Azure Table/Blob + Finnhub + Azure OpenAI（`BulldogFinance/BulldogFinance.Functions`）

## 文档导航

- [架构总览](docs/01-architecture.md)
- [本地开发与环境配置](docs/02-local-development.md)
- [API 参考](docs/03-api-reference.md)
- [Chatbot + MCP Server 设计](docs/04-chatbot-mcp-design.md)
- [安全与合规建议](docs/05-security-compliance.md)
- [可观测性与运维 Runbook](docs/06-observability-operations.md)
- [测试策略](docs/07-testing-strategy.md)
- [阶段路线图](docs/08-roadmap.md)

## 当前状态

项目已完成核心业务闭环：

1. 登录鉴权与 Onboarding
2. 账户与交易管理
3. 投资持仓 + 自选股 + 市场新闻聚合
4. 定时生成周报/月报

接下来建议重点推进：**前端 Chatbot + 后端 MCP Server**，统一多数据源查询与回答能力。
