# Production Java practice plan

Use these as mini-interview exercises. Start with a simple version, then add one realistic extension.

## Exercise format

For every exercise:

1. Write requirements in 3–6 bullet points.
2. Name the public API first.
3. Sketch classes before writing implementation.
4. Implement the simplest version.
5. Add one follow-up: thread safety, retry, timeout, or metrics.
6. Explain trade-offs.

## Exercise order

| # | Exercise | What to build | Follow-up interviewer may ask |
| --- | --- | --- | --- |
| 1 | `ConfigManager` | typed config loader with validation | immutability, env override |
| 2 | `RetryExecutor` | retry utility with max attempts | backoff, retryable exceptions |
| 3 | `APIClient` | request builder + response wrapper | timeout, retry, auth |
| 4 | `LRUCache` | cache with eviction | generic API, capacity edge cases |
| 5 | `ThreadSafeCache` | concurrent cache wrapper | lock strategy, visibility |
| 6 | `RateLimiter` | token bucket or fixed window | concurrency, clock abstraction |
| 7 | `WorkerPool` | task queue with workers | graceful shutdown, failures |
| 8 | `TaskScheduler` | delayed execution service | ordering, cancellation |
| 9 | `ResultAggregator` | collect concurrent test results | thread safety, summaries |
| 10 | `TestRunner` | suite/case/result/reporter model | retry policy, parallel execution |

## Minimum bar per exercise

- clear method names
- meaningful state model
- edge-case handling
- one self-check path in `main`
- one paragraph of trade-offs

## What “done” looks like

### Good enough for Senior SDET

- you can implement the simple version cleanly
- you can explain class boundaries
- you can identify failure cases

### Good enough for SDET III

- you can discuss thread safety
- you can extend the design sensibly
- you can connect it to framework or platform usage

### Good enough for Lead

- you can say where the component lives in a real system
- you can discuss metrics, scaling, and operational behavior
- you can explain what you would not build in-house

## Suggested weekly rhythm

| Day | Work |
| --- | --- |
| Day 1 | Read requirements and design aloud |
| Day 2 | Implement v1 |
| Day 3 | Add one follow-up requirement |
| Day 4 | Review code and explain trade-offs |
| Day 5 | Mock the same exercise in 25–35 minutes |

## Best pairings

- `RetryExecutor` + API / distributed systems
- `ThreadSafeCache` + Java concurrency
- `WorkerPool` + debugging / CI architecture
- `TestRunner` + framework design / system design
- `ResultAggregator` + observability / platform metrics
