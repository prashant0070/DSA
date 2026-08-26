# Distributed systems — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Latency vs throughput?
Latency = time per request. Throughput = volume over time. Optimizing one can hurt the other (batching raises throughput, may raise latency).

### Q2. Explain CAP without buzzwords.
If nodes cannot talk, you either serve possibly stale/split data (favor availability) or refuse/quorum until safe (favor consistency). Real systems pick per operation.

### Q3. Why are retries dangerous?
They create duplicates and amplify load. Pair with idempotency keys, dedupe stores, or natural idempotent APIs.

### Q4. Circuit breaker vs retry?
Retry helps transient blips. Breaker stops calling a sick dependency so the caller survives and dependency recovers.

### Q5. Kafka consumer group?
Consumers in a group share topic partitions. Adding consumers scales consumption until partition count is hit.

### Q6. How guarantee order in Kafka?
Same key → same partition → ordered within that partition. Not global across partitions.

### Q7. How test eventual consistency?
Wait-with-timeout for expected state; assert business invariants; avoid single fixed sleep; consider out-of-order arrivals.

### Q8. Poison message handling?
After N failures, send to DLQ, alert, continue processing others. Fix and replay.

### Q9. What is consumer lag?
Difference between latest offset and consumer offset. High lag = falling behind; alert on SLO breach.

### Q10. Design tests for payment + email async flow?
Produce payment event; assert DB; assert email event/API; inject duplicate payment event; assert single email/charge; kill consumer mid-way and restart.

### Q11. How does this appear in Lead interviews?
“Design notification system” or “test platform queue” — same patterns: retries, idempotency, observability, backpressure.

### Q12. At-least-once vs exactly-once?
At-least-once common: may redeliver. Exactly-once needs careful producer/broker/consumer design; often “effectively once” via idempotent processing.
