# Security and Compliance Guidance

## 1. Current Security Posture

The application has foundational controls but still needs production hardening:

- Frontend acquires bearer tokens via MSAL.
- Backend function auth level is currently anonymous.
- User identity is primarily derived from request headers.

## 2. Identity and Authorization (High Priority)

Required for production:

- Validate JWT tokens (issuer, audience, signature, expiration).
- Remove trust in debug headers for production environments.
- Enforce strict user-scoped authorization checks in all data access operations.
- Separate permissions for Function App, Storage, OpenAI, and external API credentials.

## 3. Secrets and Configuration

- Never commit API keys or connection strings.
- Store runtime secrets in Azure Key Vault.
- Use environment-specific configuration for dev/staging/prod.
- Rotate secrets on a fixed cadence and after incidents.

## 4. Data Protection

- Enforce HTTPS-only ingress.
- Keep storage encryption enabled (Azure managed encryption by default).
- Minimize PII in logs (email, raw tokens, free-text notes).
- Define retention rules for chat history and generated reports.

## 5. Assistant and Tooling Security

- Enforce allowlisted tool execution only.
- Implement prompt-injection defenses in instruction handling.
- Redact sensitive data before returning model output when needed.
- Bound tool payload size and sanitize potentially unsafe content.

## 6. Compliance Readiness by Stage

### Development

- Define data classification levels.
- Define logging retention and deletion behavior.

### Pilot / pre-production

- Run privacy impact review for real user data.
- Validate access-control and auditability requirements.

### Production

- Maintain auditable trace IDs across requests.
- Establish incident response and breach notification process.
- Run periodic access reviews and secret-rotation verification.

## 7. Minimum Pre-Launch Checklist

- [ ] JWT validation enabled in backend pipeline
- [ ] Debug identity headers blocked in production
- [ ] Secrets sourced from Key Vault
- [ ] Trace IDs visible across API and assistant flows
- [ ] PII scrubbing in logs verified
- [ ] Security tests for prompt injection and cross-user isolation pass
