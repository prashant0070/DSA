# Quality engineering — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. How define quality strategy for a product org?
Risk model → ownership (dev unit, SDET framework/platform, shared contracts) → CI gates → metrics → 12-month roadmap with KPIs.

### Q2. When not to automate?
Unstable UI, one-off tools, cheaper exploratory, pure visual polish better with human/design review — show judgment.

### Q3. Devs want to delete all E2E?
Acknowledge pain (slow/flake). Replace setup-heavy UI with API/contract; keep thin critical-path E2E; show cost of last escape.

### Q4. Metrics for a VP in 2 minutes?
“Fewer P0 escapes, faster PR feedback, lower flake, higher release confidence — here’s the trend and top risk.”

### Q5. Shift-left vs shift-right?
Left: prevent before merge. Right: detect/mitigate in prod. Healthy orgs do both.

### Q6. How cut 6h regression to 45m?
Parallelism, shard, move tests down pyramid, quarantine noise, fail-fast PR set vs nightly full, fix top slow tests.
