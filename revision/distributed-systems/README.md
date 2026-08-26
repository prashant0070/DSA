# Distributed systems for SDET

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

This is one of the most important missing domains for SDET III and Lead-level preparation.

## Why it matters

Modern test failures often come from distributed behavior, not from locators.

You need to reason about:

- asynchronous systems
- retries and duplicate events
- eventual consistency
- queues and backpressure
- service-to-service failures
- state across multiple workers and regions

## Scope

### Fundamentals

- latency vs throughput
- availability, consistency, partitions
- replication and fault tolerance
- leader/follower basics
- read/write trade-offs

### Reliability patterns

- timeout
- retry
- exponential backoff
- circuit breaker
- bulkhead
- rate limiting
- caching
- idempotency

### Messaging and Kafka

- topic, partition, producer, consumer, offset
- consumer group
- ordering and exactly-once myths
- retries and poison messages
- replay and lag
- event-driven testing concerns

### Testing distributed systems

- duplicate messages
- out-of-order processing
- eventual consistency verification
- partial failures
- downstream outages
- data freshness and propagation delay

## Interview questions

- How do you test eventual consistency?
- How do retries create duplicates?
- What would you validate in a Kafka-based workflow?
- How would you design resilient automation for async systems?

## Pair with

- [../test-platform/README.md](../test-platform/README.md)
- [../observability/README.md](../observability/README.md)
- [../system-design/](../system-design/)
