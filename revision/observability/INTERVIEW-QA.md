# Observability — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Logs vs metrics vs traces?
Logs = detailed events. Metrics = aggregates for alerting. Traces = cross-service path of one request.

### Q2. UI failed but UI isn’t root cause — how proceed?
Grab correlation/trace id from test logs → find failing span → read service logs/metrics around that time → check deploys/dependencies → file bug with evidence pack.

### Q3. Why p99 over average?
Averages hide rare slow requests that dominate user pain and SLO burn.

### Q4. What is a correlation ID?
Unique id propagated across services and ideally into test reports so you can stitch one journey.

### Q5. What metrics for a device farm?
Queue wait, lease time, device utilization, session failure rate, image pull failures, cost per minute.

### Q6. How avoid secret leakage in logs?
Redact tokens; never log Authorization headers; scan CI artifacts; structured allowlists.

### Q7. Cardinality problem?
Too many unique label values (userId on every metric) blows up metric systems. Keep labels low-cardinality.

### Q8. Lead-level answer on quality dashboards?
Track escaped defects, flake %, CI duration, p95 of critical journeys, open P0s — not vanity line coverage alone.
