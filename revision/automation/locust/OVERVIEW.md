# Locust / load testing — overview

**Performance section:** [framework-design §7](../../framework-design/NOTES.md#7-load-testing--locust-and-performance-layer)  
**Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

## Concepts

| Type | Purpose |
| --- | --- |
| Load | Expected traffic |
| Stress | Beyond capacity — breaking point |
| Soak | Hours — memory leaks |
| Spike | Sudden burst |

## Metrics

- **RPS** — requests per second  
- **Latency** — p50, p90, **p95**, **p99**  
- **Error rate** — % failures  

## Locust model

```python
class ApiUser(HttpUser):
    @task
    def checkout(self):
        self.client.post("/checkout", json={...})
```

Distributed: master + workers.

## SDET integration

- Reuse API endpoints/auth from functional tests  
- Run against staging only  
- Gate release on p95 threshold  
- Correlate with APM (Datadog/New Relic)  

## Investigation story (interview)

P99 spike → check deploy time → error rate → DB slow queries → cache miss → dependency timeout → roll back or scale.
