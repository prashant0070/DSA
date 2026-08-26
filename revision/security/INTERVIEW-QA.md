# Security — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. AuthN vs AuthZ with example?
AuthN: login with password/SSO. AuthZ: logged-in user cannot delete another tenant’s invoice.

### Q2. How test broken access control?
As user A, call APIs/UI with B’s resource ids. Expect 403/404. Automate role matrix.

### Q3. JWT risks?
Accepting alg=none; not checking exp; putting sensitive data in payload; XSS stealing tokens.

### Q4. Where store secrets for automation?
CI secret store / cloud secrets manager. Rotate. Least-privilege IAM. Never in repo.

### Q5. SQL injection — what do you expect from eng?
Parameterized queries / prepared statements. SDET sends payloads in lower envs and asserts rejection/safe handling.

### Q6. CSRF in simple terms?
Browser sends victim’s cookies to site on attacker-initiated request. Mitigate with tokens/SameSite.

### Q7. How discuss security in Lead interview?
Threat model for test data, secret handling standards, release gates for critical auth paths, partner with AppSec — not cowboy scanning prod.
