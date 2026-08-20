# Load testing — interview Q&A

**Q: Load vs stress vs soak?** — Expected load; beyond limits; endurance over hours.

**Q: P99 jumped 300ms → 4s — investigate?** — Timeline vs deploy; errors; CPU/memory; DB; cache; downstream; reproduce in staging with Locust; thread pool exhaustion.

**Q: Locust vs JMeter?** — Locust code-based, Python; JMeter GUI, enterprise familiar. Both valid.

**Q: Load test in CI?** — Short smoke load nightly; thresholds; not full stress every PR.

**Q: What metrics matter?** — p95/p99 latency, RPS, error %, saturation (CPU, connections).

**Q: Functional SDET doing perf?** — Own SLA gates, scripts for critical APIs, partner with SRE on analysis.

**Q: Avoid prod load test?** — Staging prod-like; synthetic data; legal/ops approval for prod synthetic monitoring only.

Behavioral: production incident story — [BEHAVIORAL-QA](../../framework-design/BEHAVIORAL-QA.md).
