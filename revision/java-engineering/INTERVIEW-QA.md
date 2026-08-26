# Java engineering — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

---

## A. JVM & memory

### A1. JDK vs JRE vs JVM?
JDK = development tools + runtime. JRE = libraries to run. JVM = executes bytecode and manages memory/threads.

### A2. Where do objects live? Where do local variables live?
Objects on the **heap**. Local primitives and references in the **stack frame** of the current method (per thread).

### A3. What is Metaspace?
Native memory area for class metadata (replacing PermGen). Classloader leaks → Metaspace OOM.

### A4. What causes OutOfMemoryError: Java heap space?
Too many live objects: leak, unbounded caches/queues, loading huge files, insufficient `-Xmx`.

### A5. How diagnose a memory leak?
Heap dump (jmap/jcmd) → analyzer (VisualVM/Eclipse MAT) → Dominator tree → see growing collections/listeners. Confirm with GC logs.

### A6. Young vs old generation?
Short-lived objects die in young gen (minor GC). Survivors promote to old gen (major/full GC more expensive).

---

## B. HashMap & equals/hashCode

### B1. Explain HashMap get/put.
Hash key → bucket index → traverse list/tree comparing `equals` → return/update/insert. Resize when load high.

### B2. What is load factor?
Threshold ratio (default 0.75). Higher = less memory, more collisions. Lower = more memory, fewer collisions.

### B3. What changed in Java 8 collision handling?
Long chains treeify to red-black trees for better worst-case lookup.

### B4. Can two unequal keys have same hashCode?
Yes. Then `equals` distinguishes them in the bucket.

### B5. Why override equals and hashCode together?
If equals says equal but hashCodes differ, HashMap can’t find the key. Contract break = subtle bugs.

### B6. Mutable key in HashMap — danger?
If you mutate a field used in hashCode/equals after insert, the key is in the wrong bucket → “disappears.”

### B7. ConcurrentHashMap vs synchronized HashMap?
CHM allows concurrent reads/updates with finer locking/CAS. Synchronized Map locks the entire map. CHM disallows nulls.

---

## C. Collections quick fire

### C1. ArrayList vs LinkedList?
Prefer ArrayList: better locality, O(1) index. LinkedList rarely wins.

### C2. How make LRU with JDK?
`LinkedHashMap` with accessOrder=true and override `removeEldestEntry`.

### C3. PriorityQueue ordering?
Binary heap; peek is min/max per comparator; not a sorted full list iterator.

### C4. Fail-fast iterators?
ArrayList iterators detect concurrent structural modification via modCount → ConcurrentModificationException. Not a hard guarantee across all concurrent cases.

---

## D. Threads & executors

### D1. Runnable vs Callable?
Callable returns value and can throw checked exceptions; used with Executors returning Future.

### D2. Why prefer thread pools over new Thread per task?
Reuse threads, bound concurrency, avoid explosion of native threads, unified shutdown/metrics.

### D3. What if unbounded LinkedBlockingQueue with ThreadPoolExecutor?
Pool may never grow beyond core size; queue grows → memory risk. Know the relationship between queue type and max pool.

### D4. shutdown vs shutdownNow?
shutdown: stop accepting, finish queued. shutdownNow: interrupt workers, return waiting tasks.

### D5. CompletableFuture use case in SDET tools?
Async artifact upload, parallel env provisioning, combining API setup steps with timeouts.

---

## E. synchronized / volatile / locks

### E1. What does synchronized guarantee?
Mutual exclusion + memory visibility (happens-before on monitor entry/exit).

### E2. What does volatile guarantee?
Visibility and ordering for that variable’s reads/writes. Does **not** make `count++` atomic.

### E3. When AtomicInteger?
Counters, flags updated concurrently without full method sync.

### E4. ReentrantLock advantages?
tryLock, timed lock, interruptible lock, multiple conditions — more control than synchronized.

### E5. Semaphore for device farm?
`new Semaphore(maxDevices)`; acquire before session, release in finally.

### E6. CountDownLatch example?
Main thread waits for N workers to finish setup: each worker `countDown()`, main `await()`.

---

## F. Concurrency bugs

### F1. Deadlock example?
T1 locks A then B; T2 locks B then A. Detect with thread dump (jstack) looking for waiting locks.

### F2. Race in parallel tests?
Shared static WebDriver, shared test user, shared mutable config — classic flake sources.

### F3. How prevent ThreadLocal leaks?
Always `remove()` in finally after test; especially on pooled threads.

---

## G. Coding prompts you should rehearse

1. Thread-safe counter
2. Blocking queue (simplified)
3. LRU cache
4. Rate limiter
5. Retry with backoff
6. Simple thread pool

Use [../../practice/production-java/](../../practice/production-java/) for structured practice.

---

## H. Level bar

| Level | Must show |
| --- | --- |
| SDET II | Collections usage, basic sync awareness |
| Senior | HashMap contract, executor basics, flake races |
| SDET III | Internals + locks + visibility + design under concurrency |
| Lead | Tie to platform capacity, failure modes, standards for teams |
