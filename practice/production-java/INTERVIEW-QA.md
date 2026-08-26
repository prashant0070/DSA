# Production Java — interview Q&A

**Notes:** [NOTES.md](NOTES.md) · **Practice:** [PRACTICE.md](PRACTICE.md)

Answer out loud. Prefer design + trade-offs over memorized code dumps.

---

## A. General approach

### A1. How do you approach a “design a retry utility” prompt?

Clarify: sync vs async, which exceptions retry, max attempts, backoff, jitter, total time budget, idempotency. Sketch interface (`execute(Callable)`), then implement loop. Mention logging and metrics.

### A2. Simple version first or concurrent from the start?

Simple first. Correct single-thread design, then add thread safety. Premature locking hides bugs.

### A3. What do interviewers look for beyond working code?

API clarity, edge cases, failure handling, complexity honesty, and whether you over-engineer.

---

## B. ConfigManager

### B1. Why immutable config?

Safe to share across parallel tests/threads without races. Accidental mutation is a common flake source.

### B2. How handle missing required keys?

Fail fast at load with a clear error listing missing keys — never discover at runtime mid-test.

### B3. Env override strategy?

`defaults < file < env < explicit flags`. Document precedence. In CI, secrets come from vault/env, not checked-in files.

---

## C. RetryExecutor

### C1. When should you *not* retry?

Non-idempotent POST that already may have committed; 400/401/403; business validation errors; after budget exhausted.

### C2. Exponential backoff + jitter — why?

Backoff reduces thundering herd. Jitter spreads retries so all clients do not retry in lockstep.

### C3. Infinite retries in test frameworks — good idea?

No. Cap retries, quarantine flakes, fix root cause. Endless retry hides product bugs and burns CI minutes.

### C4. How relate retries to distributed systems?

Retries create duplicates. Downstream must be idempotent or use idempotency keys.

---

## D. APIClient

### D1. What timeouts do you set?

Connect timeout and read/response timeout at minimum. Optionally overall deadline. Never “wait forever.”

### D2. How test an API client without hitting real network?

Inject a transport interface / mock server. Assert request shape and error mapping.

### D3. Where does auth live?

Token provider/interceptor, not hard-coded headers in every call. Handle 401 refresh carefully to avoid retry loops.

---

## E. LRUCache

### E1. Why HashMap + doubly linked list?

HashMap: O(1) lookup. DLL: O(1) move-to-front and evict-from-tail. Either alone is not enough for O(1) LRU.

### E2. get and put complexity?

Both amortized O(1) if map + DLL operations are O(1).

### E3. Is classic LRU thread-safe?

No. Concurrent get/put needs external sync or a concurrent design. `LinkedHashMap` with `accessOrder` + sync is a common teaching answer; production may use Caffeine/Guava.

### E4. Capacity 0 or 1?

Define behavior: capacity ≤ 0 invalid, or no storage. Capacity 1: every new put evicts the only entry after insert rules.

---

## F. Thread safety & caches

### F1. `synchronized` vs `ConcurrentHashMap`?

`synchronized` on whole cache: simple, coarse. CHM: better concurrent reads/writes, but LRU ordering across threads is harder.

### F2. What is a visibility bug?

Thread A updates field; Thread B never sees it without happens-before (sync, volatile, concurrent util). Looks like “impossible” stale reads.

### F3. ReadWriteLock when?

Many readers, rare writers. If writes are frequent, RW lock may not help.

---

## G. RateLimiter

### G1. Token bucket vs fixed window?

Token bucket smooths rate and allows controlled bursts. Fixed window is simple but allows 2× burst at window edges.

### G2. How test rate limiter?

Inject a fake clock. Advance time deliberately; assert allow/deny counts.

### G3. Where use in SDET work?

Throttle hits to shared staging, third-party APIs, SMS gateways, device allocation.

---

## H. WorkerPool / scheduler

### H1. Unbounded queue risk?

Memory blow-up under load. Prefer bounded queue + rejection policy.

### H2. Graceful shutdown steps?

Stop accepting work → interrupt or finish current → await termination with timeout → force if needed → report unfinished tasks.

### H3. How does this map to `ThreadPoolExecutor`?

Core/max pool size, keep-alive, work queue, rejection handler — interviewers love this mapping.

### H4. Fixed-rate vs fixed-delay schedule?

Fixed-rate: aim for cadence from start times (may overlap if slow). Fixed-delay: wait delay after previous finish.

---

## I. TestRunner / ResultAggregator

### I1. Design a minimal test runner — main classes?

`TestCase`, `TestSuite`, `TestResult`, `RetryPolicy`, `Reporter`, `TestRunner`. Optional: `ExecutionStrategy` for parallel.

### I2. How aggregate results under parallel execution?

Concurrent structures or per-worker buffers merged at end. Avoid unlocked `HashMap` puts from many threads.

### I3. What should a reporter emit for CI?

Exit code, pass/fail counts, failed test names, duration, links to artifacts (logs, screenshots, traces).

### I4. How connect this to Lead-level design?

Runner is the local brain; platform adds queue, workers, artifact store, flake service — see test-platform track.

---

## J. Scenario questions

### J1. Implement a thread-safe cache with TTL — approach?

Map of key → (value, expiry). On get, check expiry. Background cleaner or lazy eviction. Discuss lock strategy and clock.

### J2. API client must retry 503 but not 400 — how encode policy?

Status-based predicate + exception type predicate in RetryPolicy. Unit-test the predicate table.

### J3. Parallel tests corrupt shared config — root cause?

Mutable global singleton. Fix: immutable config, ThreadLocal only when required, or DI per test.

### J4. Worker pool tasks hang forever — what do you add?

Per-task timeout, interruptible work, monitoring of active tasks, kill switch for stuck workers.

---

## K. Level calibration

| Level | Expectation |
| --- | --- |
| SDET II | Clean simple Config/Retry/LRU |
| Senior | Failure handling + clear API |
| SDET III | Concurrency + trade-offs + framework mapping |
| Lead | Where it sits in platform; ops/metrics; build vs buy |

Practice order: [PRACTICE.md](PRACTICE.md)
