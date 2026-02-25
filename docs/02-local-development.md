# 本地开发与环境配置

## 1. 目录结构

- 前端：`BulldogFinance/DashboardUI`
- 后端：`BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions`

## 2. 先决条件

- Node.js 20+
- npm 10+
- .NET SDK 8.0+
- Azure Functions Core Tools v4（建议）
- Azure Storage Emulator / Azurite（本地联调建议）

## 3. 前端启动

```bash
cd BulldogFinance/DashboardUI
npm install
npm run dev
```

默认 Vite 地址通常为 `http://localhost:5173`。

## 4. 后端启动

```bash
cd BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions
dotnet restore
dotnet build
func start
```

如果本地未安装 `func`，可使用：

```bash
dotnet run
```

> 注意：Timer Trigger 在本地也可能触发，调试时请关注日志输出。

## 5. 前端环境变量（建议）

在 `BulldogFinance/DashboardUI` 创建 `.env.local`：

```env
VITE_AUTH_TENANT_NAME=<your-entra-tenant-subdomain>
VITE_SPA_CLIENT_ID=<your-spa-client-id>
VITE_REDIRECT_URI=http://localhost:5173
VITE_API_CLIENT_ID=<your-api-app-client-id>
VITE_API_BASE_URL=http://localhost:7071/api
```

## 6. 后端环境变量（建议）

在 Functions 项目目录创建 `local.settings.json`（不要提交到仓库）：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
  },
  "TableStorage": {
    "ConnectionString": "UseDevelopmentStorage=true"
  },
  "BlobStorage": {
    "ConnectionString": "UseDevelopmentStorage=true"
  },
  "Finnhub": {
    "BaseUrl": "https://finnhub.io/api/v1/",
    "ApiKey": "<your-finnhub-api-key>",
    "MaxSymbolsPerUser": "10",
    "MaxNewsPerSymbol": "3",
    "NewsDays": "3"
  },
  "AzureOpenAI": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "Key": "<your-key>",
    "Deployment": "report-writer"
  },
  "Reports": {
    "ContainerName": "reports"
  }
}
```

## 7. 本地鉴权调试

当前后端通过请求头获取 userId：

- 生产建议：`X-MS-CLIENT-PRINCIPAL-ID`
- 本地调试：`X-Debug-UserId`

联调时可在 API 调用工具（Postman 等）里带上 `X-Debug-UserId`。

## 8. 常见问题

### Q1: 前端报 `No signed-in account`
- 确认 MSAL 登录成功
- 确认 `VITE_*` 变量配置正确

### Q2: 后端报 `Finnhub:ApiKey is not configured`
- 确认 `local.settings.json` 中 `Finnhub:ApiKey` 已设置

### Q3: 后端报 Table/Blob 配置错误
- 至少需要配置 `TableStorage:ConnectionString` 或 `TableStorage:ServiceUri`
- Blob 同理
