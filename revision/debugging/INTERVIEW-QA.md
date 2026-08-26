# Debugging — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Walk me through debugging a flaky UI test.
Reproduce locally with trace → check isolation → classify timing/locator/data/env → fix root cause → add stable wait/assertion → monitor flake rate. Don’t “just retry.”

### Q2. Test fails only in parallel — first checks?
Shared static state, shared users, DB collisions, port conflicts, rate limits, ThreadLocal leaks.

### Q3. How use a thread dump?
jstack during hang → look for BLOCKED threads and lock cycles → identify deadlock or stuck I/O.

### Q4. API returns 500 intermittently.
Check dependency error rates, timeouts, connection pool, deploy overlap, retries amplifying load — use metrics+traces.

### Q5. Difference between product bug and test bug?
Product: wrong behavior under valid use. Test: brittle selector, hidden race in harness, wrong assumption. Prove with minimal manual repro outside harness when possible.

### Q6. Lead answer: nightly red for 3 days.
Incident owner, stop merge if needed, categorize failures, restore green smoke, communicate daily, postmortem with preventive owners.
