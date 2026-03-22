# 架构总览

## 1. 目标与边界

Bulldog Finance 的目标是提供一个面向个人用户的“财富视图”应用，覆盖：

- 身份认证（Microsoft Entra / MSAL）
- 初始账户配置（Onboarding）
- 账户与交易管理
- 投资持仓与市场信息聚合
- 基于财务快照的 AI 报告

## 2. 系统分层

### 前端（DashboardUI）

- 技术：React + Vite + MUI + React Router + MSAL
- 主要职责：
  - 登录态控制与页面路由
  - 调用后端 API
  - 展示 Dashboard / Transactions / Investments / Onboarding / Login

### 后端（Azure Functions）

- 技术：.NET 8 + Azure Functions Isolated Worker
- 主要职责：
  - 暴露 REST API（me / onboarding / accounts / transactions / investments / reports）
  - 调用服务层执行业务逻辑
  - 定时触发周报与月报生成

### 服务层（Services）

- 业务编排：InvestmentService, InvestmentOverviewService, ReportService
- 外部集成：
  - Finnhub（行情 / 新闻）
  - Azure OpenAI（报告生成）
- 存储抽象：
  - IReportStorage
  - IUserRepository / IAccountRepository / ITransactionRepository

### 数据层

- Azure Table Storage：Users / Accounts / Transactions / Investments / Watchlist
- Azure Blob Storage：reports（weekly/monthly latest 报告）

## 3. 核心业务流程

### 流程 A：首次用户 Onboarding

1. 前端登录成功后访问 `/`，由 OnboardingGate 触发 `GET /me`
2. 若 `onboardingDone=false`，跳转 `/onboarding`
3. 提交初始账户列表到 `POST /onboarding`
4. 后端创建用户档案、账户及 INIT 交易

### 流程 B：交易管理

1. 前端请求 `GET /accounts` 展示账户
2. 新增交易时调用 `POST /transactions`
3. 后端写入交易并同步更新账户余额
4. 历史查询通过 `GET /transactions`（支持 accountId / from / to）

### 流程 C：投资总览

1. 前端请求 `GET /investments/overview`
2. 后端读取用户持仓
3. 调用 Finnhub 获取 quote + company-news
4. 聚合返回 Holdings + Popular 结构

### 流程 D：AI 报告

1. Timer 触发每周/每月任务
2. ReportService 聚合交易快照
3. 调用 Azure OpenAI 生成 markdown
4. 存储 latest 到 Blob
5. 前端可通过 `GET /reports/{period}/latest` 获取最新报告

## 4. 当前架构优点

- 前后端边界清晰，职责明确
- Functions + Services + Repository 分层合理
- 已具备多数据源整合能力
- 已有 AI 报告链路，为 Chatbot 奠定基础

## 5. 当前架构限制（需在下一阶段解决）

- 鉴权仍是过渡实现（Header 取 userId）
- 交易查询存在“按用户全量扫描后内存过滤”上限
- 缺少统一错误码与追踪标准
- 缺少系统化文档与测试矩阵
