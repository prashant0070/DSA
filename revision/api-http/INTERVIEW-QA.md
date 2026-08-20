# HTTP & REST — interview Q&A

**Q: PUT vs PATCH?**  
A: PUT full replacement; PATCH partial. PATCH may not be idempotent if it increments a field.

**Q: 400 vs 422?**  
A: 400 malformed request; 422 semantically invalid (validation failed on well-formed JSON).

**Q: 502 vs 503 vs 504?**  
A: 502 bad response from upstream; 503 server overloaded/down; 504 upstream timeout.

**Q: How test authenticated API?**  
A: Token in setup (test env), cache until expiry, inject in Rest Assured spec; never commit secrets; rotate test users.

**Q: Idempotency in tests?**  
A: POST create twice may duplicate; use unique ids; DELETE/PUT idempotent — safe to retry assertions.

**Q: Contract vs integration test?**  
A: Contract: consumer/provider schema agreement, fast, no full stack. Integration: real service + DB side effects.

**Q: How validate JSON response?**  
A: Status + schema + critical fields JSONPath + business rules; avoid asserting entire huge payload.

**Q: Test rate limiting?**  
A: Send burst, expect 429, Retry-After header; load tool or scripted loop.

**Q: Microservice chain test?**  
A: Create via API A, verify event in B via poll, assert DB C — correlation id in logs.

**Q: Negative tests?**  
A: Missing auth, wrong role, invalid body, boundary values, SQL injection strings (expect 400 not 500).

Framework: [framework-design INTERVIEW-QA](../framework-design/INTERVIEW-QA.md)
