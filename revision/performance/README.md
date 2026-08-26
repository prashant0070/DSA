# Performance engineering

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Locust is a good start, but performance interviews go beyond tool commands.

## Scope

- latency vs throughput
- p50, p95, p99
- Little's Law awareness
- bottleneck analysis
- CPU saturation
- memory pressure and GC
- queue depth
- connection pools
- DB bottlenecks
- thread pools
- load generation architecture

## Tool awareness

- Locust
- k6
- JMeter
- Gatling

## Interview angle

- what changed when p99 spiked but average stayed okay?
- how would you design load tests for a login or checkout flow?
- how do you distinguish app bottleneck from test-tool bottleneck?
