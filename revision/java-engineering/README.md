# Java engineering

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

This domain upgrades Java from “coding language” to “engineering interview subject.”

## Why it matters

SDET III / Lead interviewers may probe Java internals, debugging, collections behavior, or concurrency because framework and test-platform code lives there.

## Scope

### JVM and memory

- JDK vs JRE vs JVM
- class loading
- heap, stack, metaspace
- garbage collection
- memory leaks and GC pauses
- common OOM scenarios

### Collections internals

- `HashMap` buckets, collisions, resize, load factor, treeification
- `equals()` / `hashCode()` contract
- `ArrayList` vs `LinkedList`
- `HashSet`, `TreeMap`, `PriorityQueue`
- when interviewers ask about internals vs usage trade-offs

### Concurrency

- `Thread`, `Runnable`, `Callable`, `Future`
- `ExecutorService`, thread pools, queues
- `CompletableFuture`
- `synchronized`, `volatile`, atomics
- `ReentrantLock`, read-write lock, semaphore
- `CountDownLatch`, `CyclicBarrier`
- `ConcurrentHashMap`
- visibility, atomicity, ordering, happens-before
- race condition, deadlock, livelock, starvation

### Debugging and performance

- thread dumps
- memory leak reasoning
- CPU spikes
- connection pool exhaustion
- slow test code due to poor data structures

## Interview questions you should be able to answer

- Why is `HashMap` average `O(1)` and when does it degrade?
- What is the difference between `synchronized` and `Lock`?
- When do you use `volatile`?
- How would you implement a thread-safe cache?
- What can cause flaky tests in parallel Java execution?

## Pair with

- [../../practice/production-java/README.md](../../practice/production-java/README.md)
- [../debugging/README.md](../debugging/README.md)
- [../framework-design/](../framework-design/)
