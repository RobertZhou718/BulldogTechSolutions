# Local Development & Environment Setup

## 1. Project layout

- Frontend: [`BulldogFinance/DashboardUI`](../BulldogFinance/DashboardUI)
- Backend: [`BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions`](../BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions)

## 2. Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 8.0+
- Azure Functions Core Tools v4 (recommended)
- Azurite (Azure Storage emulator) for local Table/Blob storage
- A Plaid developer account (sandbox) if you want to exercise bank linking
- A Microsoft Entra External ID tenant with an SPA app registration + an API app registration

## 3. Frontend

```bash
cd BulldogFinance/DashboardUI
npm install
npm run dev
```

Vite defaults to `http://localhost:5173`. Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

The frontend uses **Tailwind CSS v4** (no `tailwind.config.js` needed — configured through `@tailwindcss/vite`) and **React Aria Components** for accessible primitives. The **React Compiler** is enabled via `babel-plugin-react-compiler`.

## 4. Backend

```bash
cd BulldogFinance/BulldogFinance.Functions/BulldogFinance.Functions
dotnet restore
dotnet build
func start
```

If `func` is not installed, `dotnet run` also works.

> Note: timer triggers fire locally too. Watch the log output and disable them if noisy.

## 5. Frontend environment variables

Create `BulldogFinance/DashboardUI/.env.local` (do not commit):

```env
# MSAL (Entra External ID)
VITE_AUTH_TENANT_NAME=<your-entra-tenant-subdomain>
VITE_AUTH_TENANT_ID=<your-entra-tenant-id>
VITE_SPA_CLIENT_ID=<your-spa-client-id>
VITE_REDIRECT_URI=http://localhost:5173
VITE_API_CLIENT_ID=<your-api-app-client-id>

# Backend API
VITE_API_BASE_URL=http://localhost:7071/api
```

## 6. Backend environment variables

Create `local.settings.json` in the Functions project directory (do not commit):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "QueueStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<optional>"
  },
  "TableStorage": {
    "ConnectionString": "UseDevelopmentStorage=true"
  },
  "BlobStorage": {
    "ConnectionString": "UseDevelopmentStorage=true"
  },
  "Auth": {
    "TenantId": "<tenant-id>",
    "TenantSubdomain": "<tenant-subdomain>",
    "ApiClientId": "<api-app-client-id>"
  },
  "Plaid": {
    "ClientId": "<plaid-client-id>",
    "Secret": "<plaid-secret>",
    "Environment": "Sandbox"
  },
  "DataProtection": {
    "KeysDirectory": "./keys"
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
    "Deployment": "report-writer",
    "ChatDeployment": "chat-agent"
  },
  "Reports": {
    "ContainerName": "reports"
  }
}
```

Managed-identity variant (cloud): instead of `ConnectionString`, set `TableStorage:ServiceUri` / `BlobStorage:ServiceUri` and optionally `ManagedIdentity:ClientId`. The Functions host will fall back to `DefaultAzureCredential`.

For the Plaid daily sync queue, set `QueueStorage` to the same storage account as `TableStorage` and `BlobStorage`. In connection-string mode, `QueueStorage` is the queue binding app setting that contains the storage account connection string. In managed-identity mode, use the queue binding prefix settings:

```text
QueueStorage__queueServiceUri=https://<storage-account>.queue.core.windows.net
```

If you use a user-assigned managed identity, also set the Functions queue binding identity settings for the same prefix, for example `QueueStorage__credential=managedidentity` and `QueueStorage__clientId=<managed-identity-client-id>`.

## 7. Authentication in local dev

The backend validates real Entra JWTs via `BearerTokenAuthenticationMiddleware`. For local development:

- Sign in through the SPA to get a real token (MSAL acquires tokens against the API scope defined by `VITE_API_CLIENT_ID`), and pass it as `Authorization: Bearer <jwt>` when calling the API from tools like Postman.
- The SPA's custom email/password sign-in and sign-up UI uses the MSAL Custom Native Auth SDK, which forwards CIAM native auth requests through `POST /api/native-auth/{*path}`.

There is no anonymous debug-header or EasyAuth-header fallback. Business endpoints require a valid bearer token; only `NativeAuthProxy` is intentionally anonymous.

## 8. Plaid sandbox tips

- Set `Plaid:Environment=Sandbox` and use Plaid's sandbox credentials (e.g. `user_good` / `pass_good`).
- The Data Protection keys directory (`DataProtection:KeysDirectory`) must be writable; without it the encrypted Plaid access tokens won't survive a host restart.
- Linking a sandbox institution queues background sync work on `plaid-daily-sync-items`. Keep Azurite running with queue support, or configure `QueueStorage` to a real storage account, before testing end-to-end Plaid data import.

## 9. Common issues

### Q1: Frontend shows `No signed-in account`
- MSAL login did not complete; check `VITE_*` configuration.

### Q2: Backend logs `Finnhub:ApiKey is not configured`
- Set `Finnhub:ApiKey` in `local.settings.json`.

### Q3: Backend throws Table/Blob configuration errors
- You must set either `<Storage>:ConnectionString` or `<Storage>:ServiceUri`.

### Q4: Plaid calls fail with `INVALID_API_KEYS`
- Confirm `Plaid:ClientId`, `Plaid:Secret`, and `Plaid:Environment` match the same Plaid dashboard environment.

### Q5: `401 Unauthorized` on every call
- Confirm `Auth:TenantId`, `Auth:TenantSubdomain`, and `Auth:ApiClientId` match the tenant and API app registration that issued the token, and that the SPA requested the `api://<api-client-id>/api.access` scope.
