# Observability for SDET and Lead SDET

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Great SDETs do not stop at “the test failed.” They trace the failure through the system.

## Scope

### Logs

- structured logging
- correlation IDs
- log levels
- searchability and retention

### Metrics

- counters
- gauges
- histograms
- p50/p95/p99 latency
- error rate
- saturation signals

### Traces

- spans and trace IDs
- distributed tracing basics
- request path across services

### Tool awareness

- OpenTelemetry
- Prometheus
- Grafana
- ELK / OpenSearch
- CloudWatch basics
- Datadog awareness

## Interview questions

- How would you debug a UI failure that is really a backend issue?
- What signals would you expose for a flaky runner or device farm?
- What metrics would a lead report for quality health?

## Pair with

- [../debugging/README.md](../debugging/README.md)
- [../test-platform/README.md](../test-platform/README.md)
- [../quality-engineering/README.md](../quality-engineering/README.md)
