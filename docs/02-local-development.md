# Local Development Guide

## 1. Project Paths

- Frontend: `BulldogFinance/DashboardUI`
- Backend: `BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions`

## 2. Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 8+
- Azure Functions Core Tools v4 (recommended)
- Azurite (recommended for local Table/Blob emulation)

## 3. Start the Frontend

```bash
cd BulldogFinance/DashboardUI
npm install
npm run dev
```

Default local URL is typically `http://localhost:5173`.

## 4. Start the Backend

```bash
cd BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions
dotnet restore
dotnet build
func start
```

If Functions Core Tools is unavailable, use:

```bash
dotnet run
```

## 5. Frontend Environment Variables

Create `.env.local` in `BulldogFinance/DashboardUI`:

```env
VITE_AUTH_TENANT_NAME=<tenant-subdomain>
VITE_SPA_CLIENT_ID=<spa-app-client-id>
VITE_REDIRECT_URI=http://localhost:5173
VITE_API_CLIENT_ID=<api-app-client-id>
VITE_API_BASE_URL=http://localhost:7071/api
```

## 6. Backend Local Settings

Create `local.settings.json` in the Functions project directory (do not commit it):

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
    "ApiKey": "<finnhub-api-key>",
    "MaxSymbolsPerUser": "10",
    "MaxNewsPerSymbol": "3",
    "NewsDays": "3"
  },
  "Plaid": {
    "BaseUrl": "https://sandbox.plaid.com",
    "ClientId": "<plaid-client-id>",
    "Secret": "<plaid-secret>",
    "Products": "transactions",
    "CountryCodes": "US",
    "Language": "en"
  },
  "AzureOpenAI": {
    "Endpoint": "https://<resource>.openai.azure.com/",
    "Key": "<api-key>",
    "Deployment": "report-writer"
  },
  "Reports": {
    "ContainerName": "reports"
  }
}
```

## 7. Authentication Behavior in Local Debugging

Backend user resolution currently checks:

1. `X-MS-CLIENT-PRINCIPAL-ID`
2. `X-Debug-UserId`

For local API testing without full auth proxying, provide `X-Debug-UserId` in your request headers.

## 8. Common Issues

### `No signed-in account`

- Validate MSAL sign-in flow in the browser.
- Confirm `VITE_SPA_CLIENT_ID` and tenant values.

### `Finnhub:ApiKey is not configured`

- Confirm `Finnhub:ApiKey` exists in `local.settings.json`.

### Storage configuration startup errors

- Provide either `TableStorage:ConnectionString` or `TableStorage:ServiceUri`.
- Provide either `BlobStorage:ConnectionString` or `BlobStorage:ServiceUri`.
