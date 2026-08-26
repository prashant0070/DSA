# Distributed systems for SDET — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Largest gap for Senior → SDET III. Failures are often async, duplicated, or eventually consistent — not locator issues.

---

## 1. Core vocabulary

| Term | Meaning |
| --- | --- |
| Latency | Time for one request |
| Throughput | Requests per unit time |
| Availability | % time system works |
| Consistency | Do all nodes see same data (timing matters) |
| Partition | Network split between nodes |
| Replication | Copies of data for HA/reads |
| Fault tolerance | Continue despite failures |

Trade-off reality: you optimize for some properties and accept weaker others under failure.

---

## 2. CAP (practical, not slogan)

Under network partition, a system chooses:
- **CP** — refuse some requests to stay consistent
- **AP** — keep serving, risk stale/ divergent reads

Most real systems are nuanced (tunable consistency, quorum, etc.). Interview: explain **what breaks first** for your design.

---

## 3. Reliability patterns (must-know)

### Timeout
Fail fast rather than hang. Always set on HTTP, DB, RPC.

### Retry + exponential backoff + jitter
Retry transient faults. Cap attempts. Jitter avoids synchronized storms. Only safe if operation is **idempotent** or uses idempotency keys.

### Circuit breaker
After failures spike, open circuit → fail fast → half-open probe → close when healthy. Protects cascading failure.

### Bulkhead
Isolate pools (threads, connections) so one dependency cannot exhaust all resources.

### Rate limiting
Protect yourself and downstream.

### Caching
Lower latency/load; accept staleness; define TTL and invalidation.

### Load balancing
Spread traffic; health checks; sticky sessions caveats.

---

## 4. Messaging & Kafka

### Core concepts
```text
Producer → Topic (partitions) → Consumer Group
                ↑
         offset per partition
```

| Concept | Point |
| --- | --- |
| Topic | Named stream of events |
| Partition | Parallelism + ordering *within partition* |
| Offset | Consumer position |
| Consumer group | Competing consumers; each partition → one consumer in group |
| Replication | Leader + followers for durability |
| Retention | Time/size based; enables replay |

### Ordering
Global order across partitions is **not** guaranteed. Key by entity id for per-entity order.

### Delivery myths
“Exactly once” is hard end-to-end. Plan for **at-least-once** + idempotent consumers.

---

## 5. Testing distributed systems (SDET gold)

| Failure | What to test |
| --- | --- |
| Duplicate events | Consumer idempotency |
| Out-of-order | Handlers tolerate reorder or buffer |
| Lost message | Monitoring, DLQ, replay |
| Consumer crash mid-process | Commit offset only after side effects / transactional outbox patterns |
| Producer retry | No double charges / double emails |
| Poison message | DLQ + alert, don’t block partition forever |
| Lag | Consumer lag metrics; backlog SLOs |
| Partial failure | One service down; others degrade gracefully |

### Eventual consistency testing
- Poll/assert with timeout and backoff
- Avoid fixed `sleep(5)` as only strategy
- Assert invariants (balance ≥ 0) not only exact intermediate states
- Use test clocks / wait-for helpers

---

## 6. SDET architecture link

Distributed test platforms *are* distributed systems:
queue → workers → result store → artifact store → retries → leases.

See [../test-platform/NOTES.md](../test-platform/NOTES.md).

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
