# CI/CD — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. PR vs nightly — what goes where?
PR: fast high-signal (unit, contract, critical smoke). Nightly: full regression, multiplex browsers, heavier suites.

### Q2. How cut CI time without losing confidence?
Parallelize, shard by timing, cache deps, move tests down pyramid, quarantine noise, fail-fast ordering.

### Q3. Canary vs blue/green?
Canary: gradual % traffic. Blue/green: switch environments. Both need automated smoke + quick rollback.

### Q4. Feature flags and testing?
Test flag off/on paths; clean up dead flags; don’t leave permanent dual code without ownership.

### Q5. Main branch red 3 days — lead playbook?
Incident owner, restore mergeability, categorize failures, communicate, postmortem with prevention.
