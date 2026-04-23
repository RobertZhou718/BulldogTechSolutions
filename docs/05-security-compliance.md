# Security & Compliance

## 1. Current state

- **JWT validation is live.** `BearerTokenAuthenticationMiddleware` validates issuer / audience / signature against Microsoft Entra External ID. There is no dev-header fallback.
- **Plaid access tokens are encrypted at rest** using ASP.NET Core Data Protection (`IPlaidTokenProtector`).
- **Storage access** supports managed identity (`DefaultAzureCredential`) in addition to connection strings.
- Areas still being hardened: centralized secret storage (Key Vault wiring), prompt-injection defenses for the assistant, rate limiting / abuse detection, and uniform error responses.

## 2. Identity & authorization

### Required

- Validate JWTs on every request (done). Reject tokens with the wrong issuer, audience, or signature.
- Enforce per-user isolation on every read and write path, including every `IAgentTool` — user id always comes from the validated token, never from the request body.
- Separate credentials per external dependency (Plaid, Finnhub, Azure OpenAI, Storage).

### Recommended

- Put API Management (or an equivalent gateway) in front of the Functions app for uniform auth, throttling, and WAF.
- Keep admin / operational endpoints separate from user-facing ones, with distinct scopes.

## 3. Secret & configuration management

- No secrets in source control.
- Use **Azure Key Vault** for production API keys and connection strings; reference them from App Service / Functions configuration.
- Rotate Plaid secrets, Finnhub API keys, Azure OpenAI keys, and signing keys on a schedule.
- `DataProtection:KeysDirectory` must be a durable, access-controlled path (or replaced with Key Vault + Blob key storage) in production so encrypted Plaid tokens remain decryptable after restarts.

## 4. Data protection

- Transport: HTTPS only.
- Storage: Azure default encryption; Plaid access tokens additionally wrapped by Data Protection.
- Logs: never log full tokens, Plaid access tokens, raw transaction notes, or email addresses at `Information` level.
- Reports and chat history are per-user and never shared across tenants.

## 5. LLM / agent safety

- System prompt instructs the model not to fabricate data and to ground answers in tool output.
- Injection mitigations: ignore instructions that try to override the system prompt or exfiltrate credentials; tool outputs are length-capped.
- Tools are whitelisted — the model can only call registered `IAgentTool` instances, and each receives the authenticated `userId` from the executor.
- Output review: PII beyond what the user already owns is not generated; no cross-user data reachable.

## 6. Compliance posture (by stage)

- **Development**
  - Data classification (public / internal / sensitive)
  - Log retention policy defined
- **Pilot**
  - DPIA / privacy impact assessment if onboarding real users
  - Financial-data handling reviewed (Plaid / PCI-adjacent scope)
- **Production**
  - Audit logs traceable by `traceId`
  - Security incident response runbook

## 7. Pre-production checklist

- [x] JWT validation enforced
- [x] Plaid access tokens encrypted at rest
- [ ] Key Vault holds all runtime secrets
- [ ] Data Protection keys persisted to durable, access-controlled storage
- [x] HTTPS-only transport
- [ ] Rate limiting on `/chat` and Plaid endpoints
- [ ] Audit logs tagged with `traceId`
- [ ] Assistant prompt-injection suite exercised in CI
