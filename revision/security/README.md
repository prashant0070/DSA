# Security for SDET interviews

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

You do not need to become a penetration tester, but senior loops increasingly expect security awareness.

## Scope

### OWASP and web risk

- SQL injection
- XSS
- CSRF
- SSRF
- broken access control
- security misconfiguration
- insecure deserialization awareness
- vulnerable dependencies

### API and auth security

- OAuth2
- OIDC
- JWT structure and risk
- scopes and RBAC
- API keys
- token expiry and refresh

### Secrets and infra

- secrets management
- vault / Secrets Manager / K8s secrets awareness
- CI secret handling
- artifact and log redaction

### SDET angle

- negative testing
- auth boundary validation
- tenant isolation
- rate-limit / abuse scenarios
- security regression coverage

## Interview questions

- What security tests belong in an API suite?
- How do you avoid secrets leaking in automation?
- What is the difference between authN and authZ?
- How would you test role-based access control?
