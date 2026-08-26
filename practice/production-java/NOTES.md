# Production Java — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md) · **Practice plan:** [PRACTICE.md](PRACTICE.md)

This track is for coding that looks like real engineering: utilities, caches, clients, runners — not pure LeetCode.

---

## 1. Interview mindset

Before writing code, state aloud:

1. **Requirements** — what must work
2. **Non-goals** — what you skip for v1
3. **Thread safety** — single-thread vs shared
4. **Failure modes** — timeout, null, retries, shutdown
5. **Simplest acceptable version** — ship that first

A strong answer has: clear public API → one implementation → validation → self-check in `main` → trade-offs.

---

## 2. ConfigManager

### Problem
Load typed config (base URL, timeouts, parallel workers) with validation. Prefer immutability after load.

### Design
```text
ConfigManager.load(pathOrMap)
  → validate required keys
  → parse types
  → return immutable Config
```

### Key ideas
- Fail fast on missing/invalid values
- Do not mutate config after construction
- Env overrides are common: `env > file > defaults`
- For tests, inject a `Map` or builder instead of reading disk

### Interview trade-offs
Immutable config is safer for parallel tests. Mutable global config causes flakes.

---

## 3. RetryExecutor

### Problem
Run an operation with max attempts, backoff, and a policy for which exceptions are retryable.

### Mental model
```text
attempt = 1
while true:
  try execute
  catch if retryable and attempts left → sleep(backoff) → retry
  else rethrow
```

### Key ideas
- Cap attempts (never infinite)
- Exponential backoff: `base * 2^(attempt-1)`, optionally + jitter
- Distinguish retryable (timeout, 429, 503) vs fatal (400, auth)
- Idempotent operations only for safe retries on writes
- Budget total time, not only attempt count

### SDET tie-in
UI/API flake retries without root-cause become technical debt. Same rules apply in frameworks.

---

## 4. APIClient

### Problem
HTTP client wrapper: method, URL, headers, body, timeout, parse response, map errors.

### Design pieces
- `Request` / `Response` value objects
- Builder for URL, headers, timeout
- Transport interface (so you can mock in tests)
- Error taxonomy: client error vs server vs network

### Key ideas
- Timeouts are mandatory (connect + read)
- Close resources; avoid leaking connections
- Retry sits *outside* or as policy decorator — do not bury forever-retries in client
- Auth: inject token provider; refresh on 401 carefully

---

## 5. LRUCache

### Problem
Capacity-bounded cache: get/put in O(1); evict least recently used when full.

### Structure
```text
HashMap<K, Node> + Doubly Linked List
  head = most recent
  tail = least recent
```

### Operations
- **get:** map lookup → move node to head
- **put:** update or insert → move to head → if over capacity, remove tail

### Interview points
- Why DLL + HashMap? Index + order both O(1)
- Capacity 0 / 1 edge cases
- Null keys/values policy
- Thread safety is *not* free — wrap or redesign for concurrent use

---

## 6. ThreadSafeCache

### Approaches
| Approach | Pros | Cons |
| --- | --- | --- |
| `synchronized` methods | Simple | Coarse lock, contention |
| `ReentrantReadWriteLock` | Readers parallel | Writers still exclusive; complexity |
| `ConcurrentHashMap` + eviction | Better throughput | LRU eviction harder |
| Immutable snapshots | Safe reads | Expensive writes |

### Visibility
Without proper sync/`volatile`/concurrent structures, one thread may never see another's writes.

### Interview bar
Explain *why* your lock granularity matches the workload.

---

## 7. RateLimiter

### Token bucket (common)
- Bucket holds up to `capacity` tokens
- Refills at `rate` tokens/sec
- Each request consumes 1 token; if empty → reject or wait

### Fixed window
Count requests in current second/minute; reset at window boundary. Simpler; bursty at edges.

### Sliding window
More accurate; more state.

### Concurrency
Protect refill + consume under one lock or use atomics carefully. Abstract the clock for tests.

### SDET use
Protect shared envs, external APIs, device farms from overload.

---

## 8. WorkerPool

### Problem
Fixed N workers pull tasks from a queue until shutdown.

### Lifecycle
```text
submit(task) → queue
workers loop: take → run → handle failure
shutdown(): stop accepting → drain or interrupt → await termination
```

### Key ideas
- Bounded queue vs unbounded (OOM risk)
- Rejection policy when full
- Uncaught exceptions must not kill the pool silently
- Graceful vs abrupt shutdown

Prefer understanding `ExecutorService` / `ThreadPoolExecutor` internals for interviews, even if you implement a teaching version.

---

## 9. TaskScheduler

### Problem
Run tasks after delay or at fixed rate.

### Approaches
- Priority queue ordered by next-run time + sleep until head ready
- Or wrap `ScheduledExecutorService` and discuss API

### Concerns
- Clock skew
- Cancellation
- Overlapping fixed-rate tasks
- Catching exceptions so one bad task does not stop the scheduler

---

## 10. ResultAggregator

### Problem
Many workers report test results concurrently; produce summary (pass/fail/skip, duration, failures).

### Design
- Thread-safe map or concurrent collectors
- Immutable `TestResult` records
- Snapshot method for reporting mid-run

### Metrics to compute
pass rate, flake candidates (failed then passed on retry), p95 duration, top failures by signature

---

## 11. TestRunner (mini framework LLD)

### Objects
```text
TestCase → run() → TestResult
TestSuite → list of cases
RetryPolicy → shouldRetry(result, attempt)
ExecutionStrategy → serial | parallel
Reporter → console / junit xml / dashboard
TestRunner → orchestrates suite + policy + reporter
```

### Flow
```text
load suite → for each case (maybe parallel):
  attempt with retry policy
  record result
  publish artifacts on failure
aggregate → report → exit code
```

### Interview gold
This is how you connect production Java to framework architecture and test-platform design.

---

## 12. How to practice each exercise

1. Write 5 requirement bullets
2. Define public methods first
3. Implement v1 without concurrency
4. Add one follow-up (threads, retry, metrics)
5. Explain trade-offs in 60 seconds

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md) · [PRACTICE.md](PRACTICE.md)
