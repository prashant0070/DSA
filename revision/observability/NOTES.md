# Observability for SDET — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Lead question: “UI test failed — how do you find the root cause across five services?”

---

## 1. Three pillars

| Pillar | What | Example |
| --- | --- | --- |
| Logs | Discrete events | ERROR stack, request id |
| Metrics | Aggregates over time | RPS, error %, p99 latency |
| Traces | Request journey across services | Span per hop |

Use all three. Metrics detect; traces locate; logs explain.

---

## 2. Logs

### Structured logging
Prefer JSON fields: `timestamp`, `level`, `service`, `correlationId`, `message`, `error`.

### Correlation / request IDs
Propagate one ID across gateway → services → jobs → tests. Paste that ID into log search when a test fails.

### Levels
DEBUG/INFO/WARN/ERROR. CI artifacts should keep INFO+ and failure DEBUG dumps.

### Pitfalls
Logging secrets/PII; huge payloads; sync logging blocking hot path.

---

## 3. Metrics

| Type | Use |
| --- | --- |
| Counter | requests_total, failures_total |
| Gauge | queue_depth, active_sessions |
| Histogram / summary | latency distributions |

### Percentiles
p50 typical; **p95/p99** for tail latency (what users feel under load). Averages hide outliers.

### RED / USE (awareness)
- RED: Rate, Errors, Duration (services)
- USE: Utilization, Saturation, Errors (resources)

---

## 4. Traces

```text
TraceId
  Span: API Gateway
    Span: Order Service
      Span: Payment
      Span: Inventory
```

OpenTelemetry is the common standard for instrumentation. Sampling matters at high QPS.

---

## 5. Tool awareness (interview depth, not certification)

- OpenTelemetry
- Prometheus + Grafana
- ELK / OpenSearch
- CloudWatch
- Datadog / New Relic (vendor awareness)

---

## 6. Observability for test platforms

Emit:
- test start/end events
- pass/fail counters
- queue wait time
- worker utilization
- artifact upload failures
- flake rate by test/signature

When UI asserts fail, attach: trace id, last API status, browser console, network HAR/trace.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
