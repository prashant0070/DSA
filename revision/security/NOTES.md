# Security for SDET — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Not pentest depth — interview-ready awareness for Senior/Lead loops.

---

## 1. AuthN vs AuthZ

- **Authentication** — who are you?
- **Authorization** — what may you do?

Always test both: login works ≠ role permissions correct.

---

## 2. OWASP Top 10 (SDET view)

| Risk | Test angle |
| --- | --- |
| Broken access control | IDOR: user A accesses user B resource by ID |
| Injection (SQLi, etc.) | Malicious strings in inputs; parameterized queries expected |
| XSS | Script in fields reflected/stored unsafely |
| CSRF | State-changing requests without anti-CSRF token |
| SSRF | Server fetches attacker URL |
| Security misconfig | Default creds, open admin, verbose errors |
| Vulnerable components | Dependency scanning awareness |
| Auth failures | Brute force, session fixation, weak reset |
| Insecure design | Missing rate limits, trust boundaries |
| Integrity / deserialization | Untrusted blobs (awareness) |

---

## 3. API security

### OAuth2 / OIDC (practical)
- OAuth2: authorization framework (tokens)
- OIDC: identity layer on OAuth2 (who user is)

### JWT
Header.payload.signature. Validate signature, exp, aud, iss. Don’t trust payload alone. Store carefully (XSS risks with localStorage).

### Common API tests
- Missing/invalid/expired token → 401
- Valid token wrong role → 403
- Scope too narrow for action
- Rate limit exceeded
- Tenant isolation (multi-tenant)

---

## 4. Secrets management

| Bad | Good |
| --- | --- |
| Secrets in git | Vault / AWS Secrets Manager / CI secrets |
| Secrets in logs | Redaction |
| Long-lived plain keys | Rotation, least privilege |
| K8s secret in plaintext manifests committed | Sealed secrets / external operator |

SDET: inject secrets at runtime; never commit `.env` with prod creds.

---

## 5. What SDETs actually automate

- Auth boundary matrices (role × endpoint)
- Negative tests for injection payloads (safe environments)
- Dependency CVE gates in CI (process ownership)
- Security headers smoke checks
- Session expiry / logout invalidation

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
