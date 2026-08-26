# Production Java practice

This track closes one of the biggest gaps in many SDET interview plans:

> coding that is not pure LeetCode

These exercises simulate the kind of design-and-code work often asked in Senior SDET, SDET III, and Lead loops.

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)  
**Exercise plan:** [PRACTICE.md](PRACTICE.md)

## Why this track matters

Interviewers may ask you to implement or sketch:

- a retry utility
- a thread-safe cache
- a rate limiter
- an API client
- a worker pool
- a test runner or scheduler
- a result aggregator

That is closer to real engineering than reversing arrays.

## Target exercises

| Exercise | Core concepts |
| --- | --- |
| RetryExecutor | retries, backoff, exception policy |
| RateLimiter | token bucket, concurrency, time |
| ThreadSafeCache | locks, eviction, visibility |
| LRUCache | hash map + doubly linked list |
| APIClient | builder, timeout, error handling |
| ConfigManager | immutability, validation |
| WorkerPool | queue, threads, shutdown |
| TaskScheduler | delayed tasks, ordering |
| TestRunner | suite, case, result, reporter |
| ResultAggregator | concurrent writes, summary stats |

## Expected interview value

- SDET II: nice signal
- Senior SDET: highly useful
- SDET III: important
- Lead SDET: gives credibility for platform and framework design

## How to use it

For each exercise:

1. Write the requirements first.
2. Define interfaces and core classes.
3. Implement the simplest working version.
4. Add concurrency or failure handling only after the basic shape is correct.
5. State trade-offs clearly.

Pair this track with:

- [../../revision/java-engineering/README.md](../../revision/java-engineering/README.md)
- [../../revision/debugging/README.md](../../revision/debugging/README.md)
- [../../revision/system-design/LLD.md](../../revision/system-design/LLD.md)
