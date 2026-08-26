# Java engineering — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

For SDET III / Lead loops: JVM, collections internals, concurrency, memory — not just syntax.

Pair with: [../../01-java-fundamentals/](../../01-java-fundamentals/) · [../../practice/production-java/](../../practice/production-java/) · [../debugging/NOTES.md](../debugging/NOTES.md)

---

## 1. JDK vs JRE vs JVM

| Piece | Role |
| --- | --- |
| JDK | Dev kit: compiler (`javac`), tools, JRE |
| JRE | Runtime libraries to run apps |
| JVM | Executes bytecode; memory mgmt, GC, threads |

Interview: “JDK includes JRE; JVM is the engine inside.”

---

## 2. JVM architecture (interview model)

```text
Class Loader → Bytecode Verifier → Runtime Data Areas → Execution Engine (interpreter/JIT) → GC
```

### Runtime data areas
- **Method area / Metaspace** — class metadata
- **Heap** — objects/arrays (GC managed)
- **Stack (per thread)** — frames, locals, partial results
- **PC register** — current instruction per thread
- **Native method stack** — JNI

### Class loading phases
Loading → Linking (verify, prepare, resolve) → Initialization (static initializers)

**SDET angle:** classloader issues in custom agents, shaded jars, “works in IDE, fails in CI.”

---

## 3. Heap & GC basics

### Generational idea
- Young gen (Eden + Survivor): short-lived objects
- Old gen: long-lived objects
- GC pauses when collecting; goal is short, predictable pauses

### Common symptoms
| Symptom | Likely cause |
| --- | --- |
| Frequent full GC | Heap too small / leak / huge churn |
| OOM Heap | Leak, unbounded cache/queue, giant payloads |
| OOM Metaspace | Classloader leak (redeploys, generated classes) |
| High CPU + GC | Allocation storm |

### Memory leaks in Java (practical)
- Static collections growing forever
- ThreadLocals not removed in pools
- Listeners/caches without eviction
- Unclosed resources (less “leak,” more resource exhaustion)

---

## 4. HashMap internals (must-know)

### Flow
```text
key.hashCode() → spread/mix → bucket index
  → empty? insert
  → collide? linked list (or tree if long) → equals to find key
```

### Critical facts
- Average get/put **O(1)**; worst **O(n)** with bad hashes / attacks (mitigated)
- **Load factor** default 0.75; resize when size > capacity * loadFactor
- Resize doubles capacity; rehash/redistribute
- Java 8+: long collision chains **treeify** to red-black tree (order ~8, unto ~6)
- `null` key allowed once (bucket 0); ConcurrentHashMap disallows nulls

### equals / hashCode contract
1. Equal objects → same hashCode
2. Unequal may share hash (collision)
3. Mutating fields used in equals/hashCode while key is in map → lost entry

**Interview diagram:** draw bucket array + nodes.

### HashMap vs Hashtable vs ConcurrentHashMap
| | Sync | Nulls | Use |
| --- | --- | --- | --- |
| HashMap | No | yes | default |
| Hashtable | Yes (coarse) | no | legacy |
| ConcurrentHashMap | Yes (fine) | no | concurrent maps |

---

## 5. Other collection internals (interview depth)

### ArrayList
- Contiguous Object[] array
- Amortized O(1) add at end; O(n) mid insert
- Grows ~1.5× when full

### LinkedList
- Doubly linked nodes; poor cache locality
- Rarely better than ArrayList in real apps

### LinkedHashMap
- HashMap + linked list of insertion/access order → LRU building block (`removeEldestEntry`)

### TreeMap
- Red-black tree; sorted keys; O(log n)

### PriorityQueue / Heap
- Binary heap array; O(log n) offer/poll; not fully sorted iteration

### HashSet
- Backed by HashMap (dummy values)

---

## 6. Concurrency — core model

### Thread creation
- Extend Thread / implement Runnable
- Prefer **ExecutorService** over raw threads

### Runnable vs Callable
- Runnable → void, can’t throw checked
- Callable → returns value, can throw; use with Future

### Future / CompletableFuture
- Future: blocking get
- CompletableFuture: compose async pipelines (`thenApply`, `thenCompose`, `exceptionally`)

### ExecutorService & ThreadPoolExecutor knobs
- corePoolSize, maximumPoolSize
- keepAliveTime
- workQueue (bounded vs unbounded)
- RejectedExecutionHandler
- shutdown vs shutdownNow

---

## 7. Synchronization primitives

| Tool | Use |
| --- | --- |
| `synchronized` | Intrinsic lock; simple critical sections |
| `volatile` | Visibility + ordering for single variable; not atomic compound actions |
| `AtomicInteger` etc. | Lock-free atomic updates |
| `ReentrantLock` | Explicit lock; tryLock, interruptible |
| `ReadWriteLock` | Many readers / few writers |
| `Semaphore` | Limit concurrent permits (e.g., max 5 browser sessions) |
| `CountDownLatch` | Wait until N events complete (start gate / end gate) |
| `CyclicBarrier` | N threads wait for each other to proceed together |

### Happens-before (intuition)
Proper sync creates ordering so writes become visible. Without it: data races, stale reads, “impossible” bugs — often behind flaky parallel tests.

---

## 8. Concurrency bugs (name them)

| Bug | Meaning |
| --- | --- |
| Race condition | Outcome depends on timing |
| Deadlock | A waits B, B waits A |
| Livelock | Threads keep changing but make no progress |
| Starvation | Thread never gets CPU/lock |
| Visibility failure | Stale cached values across cores |

### Deadlock prevention
Consistent lock ordering; tryLock with timeout; reduce lock scope; avoid nested locks.

---

## 9. Parallel tests & ThreadLocal

### Pattern
`ThreadLocal<WebDriver>` so each test thread has its own driver.

### Risks
- Leak if not `remove()` on thread-pool threads
- Hidden global state hard to reason about
- Prefer explicit DI/context objects when possible; ThreadLocal is pragmatic for legacy runners

---

## 10. SDET mapping

| Java topic | Automation reality |
| --- | --- |
| Thread pools | Parallel Surefire/Gradle workers |
| ConcurrentHashMap | Result aggregators |
| Semaphores | Device/browser slot limits |
| Timeouts | HTTP client / wait strategies |
| Immutability | Config, test data factories |
| Memory leaks | Long CI jobs holding drivers/sessions |

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
