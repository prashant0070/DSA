# Test platform — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Framework vs platform?
Framework: APIs/patterns for writing tests. Platform: scheduling, compute, isolation, artifacts, analytics for many teams.

### Q2. Design a distributed UI runner (outline).
Clarify scale → API to trigger run → shard tests → queue → workers with browsers → results/artifacts → retries/quarantine → CI callback. Estimate workers from tests×duration/SLA.

### Q3. How handle worker crash mid-test?
Lease with TTL + heartbeat. On expiry, requeue if retries remain. Mark unknown/failed otherwise. Idempotent result writes.

### Q4. How prevent flaky chaos from blocking merges?
Quarantine with visibility; keep P0 smoke trusted; separate flake budget; fix owners with SLA.

### Q5. Build vs buy device farm?
Compare cost, privacy/compliance, device coverage, queue time, ops headcount. Pilot both; measure $/useful minute.

### Q6. What metrics do you show leadership?
CI p95, flake %, escaped P0/P1, queue wait, cost trend, critical-path coverage — tied to release confidence.

### Q7. How multi-team without fragmentation?
Shared result schema, auth to secrets, reporting contract, paved-road templates; allow language plugins; governance without mandating one giant repo overnight.
