# System design — interview Q&A (FAANG + SDET)

Pair with [NOTES.md](NOTES.md), [LLD.md](LLD.md), [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md).

---

## Process

**Q: How do you start a system design interview?**  
A: Restate. Clarify users, scale, constraints, non-goals. List functional + NFRs. Estimate. APIs + diagram. Deep dive. Failures. Trade-offs.

**Q: LLD vs HLD?**  
A: LLD = classes/sequences for one component. HLD = services, storage, scale. Zoom when asked.

**Q: What if you don’t know the domain?**  
A: Ask clarifying questions, state assumptions, use generic building blocks, stay structured.

---

## Core HLD concepts

**Q: SQL vs NoSQL here?**  
A: SQL for relationships + transactions. NoSQL for flexible docs / massive keyed access. Many systems use both.

**Q: Why cache?**  
A: Cut latency and DB load for hot keys. Discuss invalidation, TTL, stampede.

**Q: Sync vs async?**  
A: Sync for user-facing correctness path. Async for email, analytics, transcode — absorb spikes.

**Q: How do you handle at-least-once delivery?**  
A: Idempotent consumers, dedupe keys, upserts.

**Q: Strong vs eventual consistency?**  
A: Payments need strong. Feed counts can be eventual. Be explicit per feature.

**Q: How estimate machines?**  
A: Peak QPS / QPS-per-instance × headroom. State the assumed QPS-per-box.

**Q: Single point of failure?**  
A: Multi-AZ LB, DB failover, queue HA, no single worker.

---

## Classic prompts (answer outline)

**Q: Design URL shortener.**  
A: POST creates code (hash or RNG + collision check). Store mapping. Redirect reads cache then DB. Scale reads with cache/CDN. Analytics via async click stream. Rate limit create.

**Q: Design rate limiter.**  
A: Gateway middleware. Redis token bucket per key. Local + Redis for multi-node. Return 429 + Retry-After.

**Q: Design notification system.**  
A: API → validate → enqueue → workers per channel → provider APIs. Preferences DB. Idempotent message id. DLQ + retry backoff.

---

## Automation / SDET design

**Q: Design running 10k Playwright tests in 30 minutes.**  
A: Compute concurrency ≈ total seconds / 1800. Orchestrator + queue + K8s workers. One context per test. Shard by historical duration. Artifacts to S3. Results upsert. One retry with trace. Metrics on queue lag and flake %.

**Q: Why not one giant VM with 200 browsers?**  
A: Blast radius, noisy neighbor, hard scale, OS limits. Prefer many small workers.

**Q: How avoid flaky cross-talk?**  
A: Isolated context/driver, unique users, no shared mutable statics, deterministic waits, quarantine process.

**Q: Device farm vs BrowserStack?**  
A: Lab: control, cost at volume, ops burden, signing. Cloud: matrix speed, less ops, per-minute cost. Hybrid common.

**Q: Where do results live?**  
A: Hot OLTP for UI; events to warehouse for flake trends; blobs in object storage.

**Q: How design idempotent test result write?**  
A: Primary key `(runId, testId, attempt)`; upsert status; worker lease prevents double run or makes second write no-op.

**Q: AI test gen platform risks?**  
A: Bad selectors, secrets in codegen, cost blowups, non-determinism. Sandbox exec, static validators, eval gates, human review.

**Q: Lead-level: 12-month test platform roadmap?**  
A: Phase 1 smoke orchestration + reporting. Phase 2 sharding + flake DB. Phase 3 mobile farm. Phase 4 self-service + AI assist. Metrics each phase.

---

## LLD

**Q: Design LRU.**  
A: HashMap + doubly linked list; O(1) get/put; capacity invariant; optional TTL.

**Q: Thread-safe DriverFactory.**  
A: No static driver. `create()` returns new session. Config immutable. Optional pool with borrow/return and health check — document not to share across tests.

**Q: Parking lot fee strategies.**  
A: `FeeCalculator` interface; hourly vs daily implementations; lot depends on abstraction (DIP).

---

## Trade-off bank (say these)

- Cache hit rate vs freshness  
- Shard by user vs by test duration  
- Exactly-once illusion vs at-least-once + idempotent  
- Build grid vs buy cloud  
- Retry flake vs hide product bugs  

---

## Red flags

- Jumping to Kafka without requirements  
- No numbers  
- Only happy path  
- “We’ll make it eventually consistent” for payments / test pass-fail without nuance  
- Static shared WebDriver in parallel design  

Practice list: [PRACTICE.md](PRACTICE.md).
