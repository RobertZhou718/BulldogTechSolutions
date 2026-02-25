# API 参考（当前已实现）

> Base URL 示例：`http://localhost:7071/api`

## 1. 鉴权约定

当前接口在函数层为 `Anonymous`，但业务层会读取用户标识：

- `X-MS-CLIENT-PRINCIPAL-ID`（生产）
- `X-Debug-UserId`（本地调试）

缺少 userId 时返回 `401 Unauthorized`。

---

## 2. 用户与 Onboarding

### GET `/me`

返回当前用户档案与 onboarding 状态。

**Response 200**

```json
{
  "userId": "u-123",
  "displayName": "Alice",
  "email": "alice@example.com",
  "defaultCurrency": "CAD",
  "onboardingDone": true
}
```

### POST `/onboarding`

提交首次账户初始化数据。

**Request**

```json
{
  "defaultCurrency": "CAD",
  "accounts": [
    {
      "name": "Cash",
      "type": "cash",
      "currency": "CAD",
      "initialBalance": 1000
    }
  ]
}
```

**可能返回**
- `200` 成功
- `400` 请求格式或内容非法
- `409` 已完成过 onboarding

---

## 3. 账户与交易

### GET `/accounts?includeArchived=false`

返回账户列表。

### GET `/transactions?accountId=...&from=...&to=...`

查询交易记录。

- `from`/`to` 建议传 ISO-8601 UTC 时间

### POST `/transactions`

新增交易。

**Request**

```json
{
  "accountId": "acc-001",
  "type": "EXPENSE",
  "amount": 36.5,
  "currency": "CAD",
  "category": "Food",
  "note": "Lunch",
  "occurredAtUtc": "2026-01-01T12:00:00Z"
}
```

**Response 200**

```json
{
  "transaction": {
    "transactionId": "tx-001",
    "accountId": "acc-001",
    "type": "EXPENSE",
    "amount": 36.5,
    "currency": "CAD",
    "category": "Food",
    "note": "Lunch",
    "occurredAtUtc": "2026-01-01T12:00:00Z",
    "createdAtUtc": "2026-01-01T12:00:01Z"
  },
  "accountBalanceAfter": 963.5
}
```

---

## 4. 投资与自选股

### GET `/investments`

获取用户持仓。

### POST `/investments`

新增/更新持仓。

### DELETE `/investments/{symbol}`

删除持仓。

### GET `/investments/watchlist`

获取自选股列表。

### POST `/investments/watchlist`

新增自选股。

```json
{
  "symbol": "AAPL",
  "exchange": "NASDAQ"
}
```

### DELETE `/investments/watchlist/{symbol}`

删除自选股。

### GET `/investments/overview`

返回持仓估值与新闻聚合；若用户无持仓，返回 popular symbols 信息。

---

## 5. 报告

### GET `/reports/{period}/latest`

- `period`: `weekly` 或 `monthly`

成功返回 markdown 结构的 JSON 报告；若不存在返回 `404`。

---

## 6. 后续建议：统一错误返回规范

建议引入统一错误结构：

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Type must be INCOME or EXPENSE.",
    "traceId": "00-..."
  }
}
```
