# Performance — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Why p99 matters?
Captures tail latency that averages hide; drives SLO burn and user complaints.

### Q2. Throughput up but users unhappy?
Tail latency or error rate worsened; check p99 and saturation.

### Q3. How know bottleneck is DB not app?
DB CPU/locks/slow query log; app idle waiting on pool; traces show time in DB span.

### Q4. Load tool bottleneck?
Generator CPU/network saturated; not enough workers; client timeouts — scale generators, verify open connections.

### Q5. Performance gate in CI?
Smoke load on critical API with thresholds (p95, error %). Full soak elsewhere.
