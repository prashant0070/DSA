# Concurrency, Threads & ThreadLocal for Automation

This is the flagship Java file for SDET II–III interviews. Parallel TestNG/JUnit is the default in CI, and the questions that fail candidates are not "what is a thread" — they are why a static WebDriver flakes at thread-count 8, how ThreadLocal leaks on a pool, and what happens-before actually guarantees. Answers assume one JVM with a test-thread pool unless you explicitly fork processes. Java 17/21, including virtual-thread awareness.

- Q1. Thread vs process; TestNG/JUnit parallel = threads in one JVM
- Q2. Runnable vs Callable vs Future vs CompletableFuture
- Q3. `synchronized`, ReentrantLock, `volatile` — visibility vs mutual exclusion
- Q4. ThreadLocal: mechanism, `remove()`, the WebDriver pattern (full DriverManager)
- Q5. Why static shared WebDriver / Rest Assured tokens break; happens-before
- Q6. ExecutorService for parallel API calls (and when not to)
- Q7. Deadlock; a poorly locked DriverFactory
- Q8. CountDownLatch / CyclicBarrier / Semaphore
- Q9. Concurrent collections recap
- Q10. CompletableFuture beside a UI action
- Q11. AtomicInteger for unique test IDs
- Q12. Virtual threads (Java 21)
- Q13. Thread-safe Config and Report logger
- Q14. Debugging "works at thread-count=1, fails at 8"

### Q1. Thread vs process; why TestNG/JUnit parallel = multiple threads in one JVM (usually)

**Interview answer** — A process is an OS isolation boundary: its own virtual memory, file descriptors, and (for Java) its own heap and statics. A thread is a unit of scheduling inside a process; threads of the same JVM share the heap and all `static` fields. TestNG `parallel="methods"` and JUnit 5 `parallel.enabled` create a pool of threads in **one** worker JVM. That is why `public static WebDriver driver` is a race: there is one field and many stacks. Surefire `forkCount` creates **processes**; those do not share statics, but they also don't share an in-memory cache unless you use a network service.

**Deep dive** — Each thread has its own stack, program counter, and native OS thread (until virtual threads). The JVM maps Java threads to kernel threads (platform threads). Context switching is cheaper than a new process, which is why runners prefer threads. Cost: no memory isolation. ChromeDriver still spawns OS processes per browser; Java threads racing on one `WebDriver` object are undefined (the client libraries are not thread-safe). Playwright Java is explicit: Playwright/Browser/Page are not thread-safe — one instance per thread, same as Selenium.

In-JVM parallel + one Grid hub = N sessions. In-JVM parallel + one static driver = N tests driving one session. Those two sentences are the interview. JUnit 5 `junit.jupiter.execution.parallel.mode.default = concurrent` is the same in-JVM model. `forkCount` in Surefire is the process hammer: use it when statics cannot be purged, not as the default parallel strategy.

In-JVM parallel + one Grid hub = N sessions. In-JVM parallel + one static driver = N tests driving one session. Those two sentences are the interview.

**Code**

```xml
<!-- TestNG: threads, one JVM (inside a Surefire fork) -->
<suite parallel="methods" thread-count="8">
```

```java
public class Leak {
    public static WebDriver driver; // one heap field, eight threads
}

@Test
public void a() { driver = new ChromeDriver(); driver.get(urlA); }
@Test
public void b() { driver = new ChromeDriver(); driver.get(urlB); } // overwrites
```

**Follow-ups & traps**

- Trap: "parallel means multiple ChromeDriver processes so static is fine" — Chrome is a process; the **Java reference** is still shared.
- `forkCount=8` without TestNG parallel: 8 heaps, 8 static drivers if each fork is single-threaded — works but RAM-heavy.
- JUnit 5 default is still sequential unless configured.

**Senior/lead angle** — Draw Maven → Surefire fork → TestNG pool → ThreadLocal driver → chromedriver → Chrome. Resource budget is forks × threads × browser RAM.


- forkCount = processes (isolated statics); thread-count = threads (shared heap).
- Selenium and Playwright-Java clients are not thread-safe on one instance.
- Chrome is a process; the Java WebDriver field is still one shared reference.

**Code**

```java
public static WebDriver driver; // one field, N stacks — the race
```

**One-liner** — Processes don't share heaps; test-runner "parallel" is usually threads that do — static WebDriver is then one field contended by every test.

### Q2. Runnable vs Callable vs Future vs CompletableFuture

**Interview answer** — `Runnable.run()` returns void and cannot throw checked exceptions. `Callable<V>.call()` returns `V` and may throw Exception. `ExecutorService.submit` wraps either in a `Future<V>`: `get()` blocks, rethrows execution failures as `ExecutionException`, and `cancel` may interrupt. `CompletableFuture` is a composable 2014+ Future: `thenApply`, `thenCombine`, `orTimeout`, `exceptionally`, without blocking a test thread until you choose to. In SDET code I use Callable/Future for a handful of parallel GETs, and CompletableFuture when I need to pipeline "start order API while UI loads" (Q10) — with a timeout.

**Deep dive** — `Future.get(timeout, unit)` is the minimum safety net; unbounded `get()` hangs a suite. `invokeAll` runs a collection of Callables. CompletableFuture default executor is `ForkJoinPool.commonPool()` — stealing test-runner threads can deadlock if you block inside; prefer `orTimeout` + an explicit executor sized for I/O. `Runnable` is what `new Thread(r)` wants; prefer executors over raw threads. `Future.isDone` / `cancel(true)` for a stuck poll. `CompletableFuture.handle` for "always record the HTTP status even on timeout." `ExecutorService.invokeAny` returns the first success — useful for racing two health endpoints, dangerous if you ignore the loser leaking a connection.

**Code**

```java
ExecutorService pool = Executors.newFixedThreadPool(4);
Future<Response> f = pool.submit(() -> given().get("/health"));
Response r = f.get(5, TimeUnit.SECONDS);

CompletableFuture<Response> cf = CompletableFuture
        .supplyAsync(() -> given().get("/orders/1"), pool)
        .orTimeout(5, TimeUnit.SECONDS);

pool.shutdown();
if (!pool.awaitTermination(10, TimeUnit.SECONDS)) pool.shutdownNow();
```

**Follow-ups & traps**

- Trap: `new Thread(task).start()` per API call — unbounded threads, no join, leaked on failure.
- `Future.get()` in a `@Test` without timeout — CI hang.
- Checked exceptions from Callable are wrapped; unwrap with `getCause()`.
- `CompletableFuture.join()` vs `get()` — join wraps as CompletionException, no checked Exception.


- Always Future.get(timeout).
- shutdown/awaitTermination in finally.
- CF default pool is common ForkJoinPool — don't block it with WebDriver.

**Code**

```java
Future<Response> f = pool.submit(() -> given().get("/health"));
assert f.get(5, TimeUnit.SECONDS).statusCode() == 200;
```

**One-liner** — Runnable is fire-and-forget; Callable returns a value; Future is the handle; CompletableFuture is a composable Future with timeouts — always bound `get()`.

### Q3. `synchronized`, ReentrantLock, `volatile` — visibility vs mutual exclusion

**Interview answer** — Mutual exclusion means only one thread in a critical section. Visibility means writes from one thread become visible to another. `synchronized` (and monitor `wait/notify`) provides **both**: lock acquire/release are happens-before edges. `volatile` provides **visibility and ordering** for that variable's reads/writes, but `volatile int n; n++` is still a race (read-modify-write). `ReentrantLock` is an explicit lock with `tryLock`, interruptible lock, and multiple Conditions; you must `unlock` in `finally`. I use `synchronized` for small critical sections (lazy config init), `volatile` for a published immutable config reference or a shutdown flag, and I do **not** synchronize WebDriver calls across tests — I isolate drivers per thread.

**Deep dive** — JMM: without a happens-before edge, a thread can read a stale cached value forever. `synchronized` is reentrant (same thread can re-enter). Locking on `this` or a public object lets callers deadlock you; lock on a private final `Object lock`. Double-checked locking needs `volatile` on the instance field (the classic singleton). ReentrantLock fairness is usually off (better throughput). `ReadWriteLock` is rarely worth it in test frameworks. `volatile` does not make a `HashMap` safe; it only publishes the *reference*. A `volatile boolean shutdown` is the correct abort flag for a listener. `synchronized(DriverManager.class)` on `create()` serializes browser startup — sometimes OK for Grid quota, never OK as a substitute for ThreadLocal.

**Code**

```java
public final class Flags {
    private static volatile boolean abortSuite;          // visibility, not atomic increment
    static void abort() { abortSuite = true; }
    static boolean aborted() { return abortSuite; }
}

public final class Counter {
    private int n;
    synchronized void inc() { n++; }                     // mutex + visibility
    synchronized int get() { return n; }
}

ReentrantLock lock = new ReentrantLock();
lock.lock();
try { /* create session on a shared Grid quota object */ }
finally { lock.unlock(); }
```

**Follow-ups & traps**

- Trap: "volatile makes n++ thread-safe" — no; use AtomicInteger (Q11).
- Trap: synchronizing on the WebDriver instance to "make Selenium thread-safe" — the protocol session still isn't meant for concurrent clients.
- `synchronized` static locks the `Class` object.


- volatile does not make n++ atomic.
- Lock on a private final Object, not on this.
- Don't synchronized WebDriver to 'make Selenium safe.'

**Code**

```java
private final Object lock = new Object();
synchronized (lock) { /* short critical section */ }
```

**One-liner** — synchronized/ReentrantLock = exclusion + visibility; volatile = visibility without making compound updates atomic — isolate drivers instead of locking them.

### Q4. ThreadLocal: mechanism, memory leak if not `remove()`, THE WebDriver pattern. Full DriverManager code

**Interview answer** — `ThreadLocal<T>` stores a value keyed by the current thread: `set`/`get`/`remove`. Internally each `Thread` has a `ThreadLocalMap` whose keys are **weak** references to the ThreadLocal object. If you `set` a WebDriver and never `remove()`, two bad things happen: (1) on a TestNG pool the *next* test on that thread can see the previous driver; (2) even if the ThreadLocal instance is no longer referenced, the *value* (the driver) is held strongly by the map until overwrite/remove — classic classloader/driver leak on long-lived pools. The pattern: set in `@BeforeMethod`, get from pages, quit **and** `remove()` in `@AfterMethod` `finally`.

**Deep dive** — `get()` calls `initialValue()` if unset (default null). `withInitial(supplier)` (Java 8) is lazy per thread. InheritableThreadLocal copies to child threads — usually wrong for drivers (child would share or copy the reference). Playwright-Java needs ThreadLocal of Playwright/Browser/Page similarly. Rest Assured: a ThreadLocal `RequestSpecification` beats mutating `RestAssured.requestSpecification`.

Weak key ≠ weak value: the map keeps the WebDriver alive. `remove()` drops the entry. If the Thread dies, the whole map goes — but pooled threads don't die.

**Code**

```java
public final class DriverManager {
    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    private DriverManager() {}

    public static void setDriver(WebDriver driver) {
        DRIVER.set(Objects.requireNonNull(driver, "driver"));
    }

    public static WebDriver getDriver() {
        WebDriver driver = DRIVER.get();
        if (driver == null) {
            throw new IllegalStateException(
                    "No WebDriver for thread " + Thread.currentThread().getName()
                    + " — missing @BeforeMethod setDriver?");
        }
        return driver;
    }

    public static boolean hasDriver() {
        return DRIVER.get() != null;
    }

    public static void quitDriver() {
        WebDriver driver = DRIVER.get();
        if (driver == null) {
            DRIVER.remove();
            return;
        }
        try {
            driver.quit();
        } catch (WebDriverException e) {
            throw new FrameworkException("quit failed on " + Thread.currentThread().getName(), e);
        } finally {
            DRIVER.remove(); // MUST run even if quit throws
        }
    }
}

public abstract class BaseTest {
    @BeforeMethod
    public void start() {
        DriverManager.setDriver(Browser.fromEnv().create());
    }

    @AfterMethod(alwaysRun = true)
    public void stop() {
        DriverManager.quitDriver();
    }
}

public class LoginPage {
    private final WebDriver driver = DriverManager.getDriver();
    // locators...
}
```

**Follow-ups & traps**

- Trap: `quit()` without `remove()` — next test on the pool gets a quit driver (`SessionNotCreated` / `NoSuchSession`).
- Trap: `remove()` without `quit()` — Java leak + orphan Chrome.
- `ThreadLocal.withInitial(ChromeDriver::new)` — creates a driver on first get, including on reporter threads that shouldn't have one.
- Child threads / `parallelStream` (common pool) do not see the test's ThreadLocal.

**Senior/lead angle** — This is the SDET equivalent of HTTP session affinity. Code-review every `ThreadLocal.set` for a matching `finally remove`. Prefer JUnit 5 store / TestNG ITestResult attributes if you want the runner to own lifecycle; ThreadLocal is still the industry default for Selenium Java.

**One-liner** — ThreadLocal is a per-thread map: set the driver, get it in pages, quit and `remove()` in finally — skip `remove()` on a pool and you leak sessions into the next test.

### Q5. Why static shared WebDriver / Rest Assured tokens break. Happens-before intuition

**Interview answer** — A static `WebDriver` is one heap reference. Thread A sets Chrome, thread B overwrites with Firefox, thread A clicks — commands go to the wrong session or a quit session. Even without overwrite, Selenium clients are not safe for concurrent use on one instance. Rest Assured's `RestAssured.baseURI`, `RestAssured.authentication`, and static filters are the same bug: thread A sets Bearer token for user1, thread B sets user2, thread A's request goes out as user2 — flaky 403s. Happens-before: without a sync edge, B may not even *see* A's write yet, or may see a torn combination of fields. Isolation (ThreadLocal or instance per test) is the fix, not "add synchronized around get()."

**Deep dive** — Happens-before (HB) is a JMM partial order: program order in one thread; unlock HB subsequent lock on the same monitor; volatile write HB subsequent read; thread start HB run(); run() HB join() return. Data race = conflicting accesses with no HB. A race on a reference can show null, stale, or (for longs/doubles without volatile) torn values. `synchronized` on `DriverManager.class` around a static driver serializes the whole suite — technically "safe," practically single-threaded. Rest Assured: build `given().baseUri(...).auth().oauth2(token)` on a local spec every time, or ThreadLocal spec. A stale read of a static token can be "user A with user B's cookie" without a compile error. `volatile WebDriver driver` still one object. Happens-before does not replace isolation; it only explains why a write may not be seen.

**Code**

```java
// BROKEN
public static WebDriver driver;
public static String token;

@Test public void a() {
    token = loginAs("admin");
    given().auth().oauth2(token).get("/admin"); // may send buyer's token
}

// FIXED — per-thread spec
private static final ThreadLocal<RequestSpecification> SPEC = ThreadLocal.withInitial(() ->
        new RequestSpecBuilder().setBaseUri(Env.current().baseUrl()).build());

public static RequestSpecification spec() { return SPEC.get(); }

@AfterMethod(alwaysRun = true)
public void clearSpec() { SPEC.remove(); }
```

**Follow-ups & traps**

- Trap: "it worked locally with thread-count=1" — no race.
- Faker with a static `Faker` is usually OK (thread-safe enough); static `List<User> USERS` that tests mutate is not.
- `volatile WebDriver driver` still one instance — visibility without isolation.


- RestAssured.baseURI and static auth are the API twin of static WebDriver.
- volatile on a single driver does not isolate tests.
- Build given() specs locally or in ThreadLocal.

**Code**

```java
RequestSpecification spec = new RequestSpecBuilder()
        .setBaseUri(Env.current().baseUrl())
        .setAuth(oauth2(token))
        .build();
```

**One-liner** — Static driver/token is shared mutable heap state with no isolation; happens-before explains stale reads, but the real fix is ThreadLocal or per-test instances, not a bigger lock.

### Q6. ExecutorService for parallel API calls in a test (and when not to — the test runner already parallelizes)

**Interview answer** — An `ExecutorService` is a managed pool: submit Callables, bound concurrency, shut down. Inside **one** test I use a small pool to fan out independent GETs (seed 20 orders) with a timeout and `invokeAll`. I do **not** start an unbounded pool per test when TestNG already runs 8 tests in parallel — that is 8 × N extra threads and a Grid/API stampede. If the suite is already parallel at method level, keep tests single-threaded internally unless a test's critical path is "N independent HTTP calls." Always `shutdown`/`awaitTermination` in `finally`.

**Deep dive** — `newFixedThreadPool(n)` uses an unbounded `LinkedBlockingQueue`: if all core threads are busy, tasks queue — pool never grows to `max` (that's the cached/unbounded story). `newCachedThreadPool` is unbounded threads — dangerous. `newVirtualThreadPerTaskExecutor()` (Java 21) is for many blocking I/O calls (Q12). Mixing executor threads with ThreadLocal drivers: worker threads will **not** see the test's driver unless you pass it in as a parameter (do that; don't use InheritableThreadLocal). `shutdown()` vs `shutdownNow()`: finish queued vs interrupt. Always `awaitTermination` or Surefire's JVM may hang on non-daemon workers. Cap in-flight HTTP with the pool size, not with "as many as the JSON array."

**Code**

```java
@Test
public void seedOrders() throws Exception {
    List<Callable<Response>> calls = IntStream.range(0, 20)
            .mapToObj(i -> (Callable<Response>) () ->
                    given().body(new CreateOrderRequest("SKU-" + i, 1)).post("/orders"))
            .toList();
    ExecutorService pool = Executors.newFixedThreadPool(5);
    try {
        List<Future<Response>> futures = pool.invokeAll(calls, 30, TimeUnit.SECONDS);
        for (Future<Response> f : futures) {
            assertThat(f.get().statusCode()).isEqualTo(201);
        }
    } finally {
        pool.shutdownNow();
    }
}
```

**Follow-ups & traps**

- Trap: nested parallelism (suite 8-way × test 20-way) flattening staging.
- Forgetting shutdown — JVM may hang (`non-daemon` pool threads).
- Passing ThreadLocal values into pool tasks — pass explicit arguments.

**Senior/lead angle** — Prefer suite-level parallel for independent tests; in-test executors only for embarrassingly parallel setup. Cap total HTTP in-flight with a Semaphore if the env is fragile.


- Suite already parallelizes — nested pools stampede Grid.
- Pass driver/token as arguments into Callables; ThreadLocal won't follow.
- newCachedThreadPool is unbounded — don't.

**Code**

```java
try { pool.invokeAll(calls, 30, TimeUnit.SECONDS); }
finally { pool.shutdownNow(); }
```

**One-liner** — Use a small ExecutorService to fan out independent API calls inside a test; don't multiply it by the runner's thread-count, and always shut it down.

### Q7. Deadlock basics; how a poorly locked DriverFactory can stall a suite

**Interview answer** — Deadlock is a cycle of lock waits: T1 holds A wants B, T2 holds B wants A. None progress. A DriverFactory that `synchronized create()` while also locking a Grid-client, while a listener `synchronized` on the same factory to screenshot, can stall every test thread. Diagnose with `jstack` / `jcmd Thread.print`: look for `BLOCKED` threads and "waiting to lock". Fix: consistent lock order, shorter critical sections, don't call foreign code (Grid HTTP, Allure) while holding a lock, prefer isolation to locking.

**Deep dive** — Four Coffman conditions: mutual exclusion, hold-and-wait, no preemption, circular wait. Breaking any one prevents deadlock. `tryLock(timeout)` converts deadlock into a timeout failure — better in CI than a hung job. Nested `synchronized` methods on two DriverManagers (local vs remote) are a realistic homemade cycle. Database-style deadlocks exist in test data too (two tests updating the same rows) — that's lock order at the DB, not Java, but the story is the same. `jstack` "Found one Java-level deadlock" is the quote to look for. Never call Allure / Grid HTTP while holding a factory lock. Prefer no shared locks: ThreadLocal drivers plus unique data.

**Code**

```java
// DANGEROUS sketch — do not ship
synchronized WebDriver create() {
    synchronized (GridClient.class) {     // lock order: factory then grid
        return grid.newSession();
    }
}
// listener
synchronized static void onFail() {
    synchronized (DriverFactory.class) {  // lock order reversed → deadlock
        screenshot();
    }
}

// BETTER: no lock, ThreadLocal isolation; Grid client thread-safe or per-call
```

**Follow-ups & traps**

- Trap: "deadlock is the same as a race" — races give wrong answers; deadlocks give silence.
- `join()` cycles among tests — unusual but possible with custom waits.
- Follow-up: livelock (retries that keep colliding) vs deadlock.


- jstack / jcmd Thread.print for BLOCKED cycles.
- Consistent lock order; no I/O under a factory lock.
- tryLock(timeout) turns a hang into a failure.

**Code**

```java
if (!lock.tryLock(5, TimeUnit.SECONDS)) {
    throw new FrameworkException("DriverFactory lock timeout");
}
```

**One-liner** — Deadlock is a lock cycle; never hold a factory lock while calling Grid/Allure, and prefer per-thread drivers so you don't need the lock.

### Q8. CountDownLatch / CyclicBarrier / Semaphore — rare but interviewers ask names; one SDET example

**Interview answer** — `CountDownLatch(n)`: one or more threads `await` until `n` `countDown`s — one-shot. `CyclicBarrier(n)`: n threads wait until all arrive, then optionally run a barrier action, and it can reset. `Semaphore(k)`: k permits; `acquire`/`release` bound concurrency. SDET: latch to wait until a stub server and a DB container are both up before the suite; semaphore to cap 5 concurrent browser sessions on a starved Grid; barrier is rare (all tests rendezvous at "env ready") and easy to hang if a test dies.

**Deep dive** — Latch cannot be reset; barrier can (`reset`) and throws `BrokenBarrierException` if a party fails. Semaphore `acquire` in try/`release` in finally — otherwise you leak permits. Fairness constructors exist. Prefer Testcontainers / JUnit `@BeforeAll` to a hand-rolled latch, but know the names. CyclicBarrier with `thread-count` parties hangs if a `@Test` is skipped. Semaphore of Grid slots: `acquire` before `new ChromeDriver`, `release` in the same `finally` as `quit`, or you leak permits and the suite starves. Always timeout `await`.

**Code**

```java
CountDownLatch envReady = new CountDownLatch(2);
new Thread(() -> { startWireMock(); envReady.countDown(); }).start();
new Thread(() -> { startPostgres(); envReady.countDown(); }).start();
if (!envReady.await(60, TimeUnit.SECONDS)) {
    throw new FrameworkException("env not ready");
}

Semaphore gridSlots = new Semaphore(5);
gridSlots.acquire();
try { DriverManager.setDriver(factory.create()); }
finally { /* quit first */ gridSlots.release(); }
```

**Follow-ups & traps**

- Trap: barrier with `thread-count` parties when some tests are `@Test(enabled=false)` — hang.
- Latch count too high — await forever; always timeout.
- Semaphore as a lock: `new Semaphore(1)` works; ReentrantLock is clearer.


- Latch: env ready (one-shot). Semaphore: cap Grid slots. Barrier: easy to hang.
- Always await with timeout.
- release permits in finally next to quit().

**Code**

```java
if (!envReady.await(60, TimeUnit.SECONDS)) throw new FrameworkException("env");
```

**One-liner** — Latch: wait for N one-shot events (env up); barrier: N threads rendezvous; semaphore: bound Grid slots — always `await` with a timeout.

### Q9. Concurrent collections recap in concurrency context

**Interview answer** — Concurrent collections give thread-safe *individual* operations without wrapping the whole suite in `synchronized`. `ConcurrentHashMap` for aggregating failures by test name (Q7 of collections file). `ConcurrentLinkedQueue` for lock-free append of log events. `CopyOnWriteArrayList` for listener lists mutated rarely. `BlockingQueue` (`LinkedBlockingQueue`, `ArrayBlockingQueue`) for producer-consumer (a reporter thread draining results). They do not make compound business actions atomic unless you use `compute`/`putIfAbsent` or a queue's `take`.

**Deep dive** — CHM iterators weakly consistent. COW iterators snapshot — never CME, write is O(n). `BlockingQueue.put` waits if full (bounded) — backpressure, good for report upload. Don't iterate an ArrayList from the test thread while a listener adds to it — CME or lost updates; use concurrent structures or confine the list to one thread. `CHM.computeIfAbsent` for `testName → List<Throwable>` plus a synchronized list value is the reporter pattern. `CopyOnWriteArrayList` of listeners is write-rare; don't COW on every log line.

**Code**

```java
ConcurrentHashMap<String, AtomicInteger> fails = new ConcurrentHashMap<>();
fails.computeIfAbsent(testName, k -> new AtomicInteger()).incrementAndGet();

BlockingQueue<Path> screenshots = new LinkedBlockingQueue<>(256);
screenshots.put(path);                 // producer (test thread)
Path p = screenshots.poll(2, TimeUnit.SECONDS); // consumer (uploader)
```

**Follow-ups & traps**

- Trap: ConcurrentHashMap of ArrayLists without synchronizing the lists.
- `Collections.synchronizedList` still needs lock on iteration.
- `BlockingQueue.take` without timeout can hang a reporter thread on a quiet suite.


- CHM for aggregating failures; BlockingQueue for screenshot upload.
- COW lists for rare listener mutation.
- Compound get-then-add still needs compute/merge or a synchronized list.

**Code**

```java
fails.computeIfAbsent(name, k -> new AtomicInteger()).incrementAndGet();
```

**Senior/lead angle** — Reporters append; tests never share a mutable ArrayList of results. If you need a map, it is ConcurrentHashMap plus atomic values. A listener that stores `byte[]` screenshots in that map is a heap leak — store paths.

**One-liner** — CHM/queues/COW lists make single ops safe for reporters and aggregators; they don't replace ThreadLocal drivers or atomic compound updates.

### Q10. CompletableFuture for firing an API wait alongside a UI action (careful)

**Interview answer** — You can `CompletableFuture.supplyAsync(() -> waitForOrderStatus("PAID"))` and then click Pay on the UI, then `future.get(timeout)` so the test asserts backend and UI together. The care: the async task must not use the test's WebDriver (wrong thread); it should use HTTP. The UI thread must not starve waiting on an unbounded future. Timeouts on both sides. If the click itself should wait for a network call, Playwright/Selenium listeners or Rest Assured polling on the test thread are simpler and easier to debug. I use CF when the two waits are truly independent I/O.

**Deep dive** — `thenCombine` to merge UI-derived id with API. `completeExceptionally` on test timeout. Common pool vs dedicated executor: UI tests should not block FJP workers. Flake mode: API wins the race before the click — assert eventual consistency with a poll, not a one-shot GET. Cancel the future in `finally` if the UI assertion already failed. Never `supplyAsync(() -> page.click())`. Timeouts on both the UI wait and `future.get`.

**Code**

```java
@Test
public void payShowsReceiptAndBackendPaid() throws Exception {
    String orderId = checkoutPage.orderId();
    ExecutorService http = Executors.newSingleThreadExecutor();
    try {
        CompletableFuture<String> status = CompletableFuture.supplyAsync(
                () -> pollUntilPaid(orderId, Duration.ofSeconds(20)), http);
        checkoutPage.clickPay();
        checkoutPage.assertReceiptVisible();
        assertThat(status.get(25, TimeUnit.SECONDS)).isEqualTo("PAID");
    } finally {
        http.shutdownNow();
    }
}
```

**Follow-ups & traps**

- Trap: `supplyAsync(() -> driver.findElement(...))` — WebDriver on a foreign thread.
- Ignoring `get()` exceptions — test greens while API failed.
- Follow-up: `orTimeout` (Java 9+) vs `get(timeout)`.


- HTTP on the future thread; WebDriver stays on the test thread.
- Timeout both sides; cancel in finally.
- Eventual consistency: poll API, don't one-shot GET.

**Code**

```java
assertThat(status.get(25, TimeUnit.SECONDS)).isEqualTo("PAID");
```

**One-liner** — CompletableFuture can poll an API while the UI clicks, on an HTTP executor with a timeout — never put WebDriver on that future's thread.

### Q11. AtomicInteger for generating unique test IDs

**Interview answer** — `AtomicInteger` provides atomic `incrementAndGet` without `synchronized`, via CAS. Parallel tests need unique emails, order IDs, and user names: `prefix + counter.incrementAndGet() + "@mail.test"` (plus a timestamp or UUID if tests span JVMs). `AtomicInteger` is per-heap; two Surefire forks each start at 0 — add `forkNumber` or UUID. Don't use it as a substitute for ThreadLocal. `AtomicReference<ImmutableConfig>` is the lock-free publish pattern for config reloads.

**Deep dive** — `n++` on volatile is still lost updates. `compareAndSet` loops under contention. `LongAdder` is better for hot stats (failure counts), AtomicInteger is clearer for IDs. `UUID.randomUUID()` is simpler when you don't need sequential IDs; sequential helps debugging (`user-42`). Across Surefire forks each JVM has its own AtomicInteger — prefix with `pid` or `surefire.forkNumber`. `static int n++` under parallel is lost updates and colliding emails (409 flakes).

**Code**

```java
public final class TestIds {
    private static final AtomicInteger SEQ = new AtomicInteger();
    private TestIds() {}

    public static String email() {
        return "user-%d-%d@mail.test".formatted(
                ProcessHandle.current().pid(), SEQ.incrementAndGet());
    }

    public static String orderRef() {
        return "ORD-" + UUID.randomUUID();
    }
}
```

**Follow-ups & traps**

- Trap: `Math.random()` or `new Random()` without sharing care — uniqueness not guaranteed; use UUID or AtomicInteger.
- Static `int seq++` in parallel — lost updates, colliding users, 409 flakes.
- Forks: include pid or `System.getProperty("surefire.forkNumber")`.


- incrementAndGet is unique per JVM; add pid across forks.
- static int++ is a lost-update flake.
- UUID when you don't need sequential ids.

**Code**

```java
String email = "user-%d-%d@mail.test".formatted(ProcessHandle.current().pid(), SEQ.incrementAndGet());
```

**One-liner** — `incrementAndGet` gives unique IDs inside one JVM without locks; combine with pid/UUID across forks, and never use a plain static int.

### Q12. Virtual threads (Java 21) — awareness-level: useful for API fan-out, not a magic WebDriver scaler

**Interview answer** — Virtual threads (JEP 444, Java 21) are JVM-scheduled lightweight threads that unmount from a carrier on blocking I/O, so you can have tens of thousands of blocked HTTP calls cheaply. `Executors.newVirtualThreadPerTaskExecutor()` is the API-test fan-out tool. They are **not** a way to run 10,000 Chrome instances: each WebDriver session is an OS process/browser, and Selenium/Playwright clients pin real resources. Pinning (synchronized blocks, native calls) can stall carriers. Awareness is the interview bar: I would consider virtual threads for Rest Assured fan-out, not for UI parallelism.

**Deep dive** — Platform thread ≈ OS thread. Virtual thread ≈ continuation. `Thread.ofVirtual().start(runnable)`. Structured concurrency (preview in 21) is optional trivia. Mixing virtual threads with ThreadLocal is supported but values still don't magically appear on a sibling virtual thread. Libraries using `synchronized` heavily (older JDBC drivers) pin; HTTP clients that block on socket I/O work well. Virtual threads do not multiply Grid capacity. `Thread.startVirtualThread` vs platform `new Thread` — the former is cheap blocked HTTP, the latter is what TestNG already uses for tests. Don't set `parallel=methods` to 10,000 because 21 exists.

**Code**

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Response>> futures = new ArrayList<>();
    for (int i = 0; i < 1_000; i++) {
        int n = i;
        futures.add(exec.submit(() -> given().get("/item/" + n)));
    }
    for (Future<Response> f : futures) {
        assertThat(f.get(10, TimeUnit.SECONDS).statusCode()).isEqualTo(200);
    }
}
```

**Follow-ups & traps**

- Trap: "virtual threads will let us 100× our Selenium grid" — Grid and Chrome bound you.
- `synchronized` pinning — prefer `ReentrantLock` in hot libraries if you adopt VT.
- Java 17 does not have production virtual threads (preview in 19/20).


- Java 21 only for production VT; 17 does not have them.
- Useful for 1_000 HTTP GETs; not for 1_000 Chromes.
- synchronized can pin carriers — awareness level.

**Code**

```java
try (var exec = Executors.newVirtualThreadPerTaskExecutor()) {
    exec.submit(() -> given().get("/health"));
}
```

**One-liner** — Java 21 virtual threads cheaply block on HTTP; they don't multiply browsers — use them for API fan-out, keep UI parallelism at Grid capacity.

### Q13. How you'd design a thread-safe Config and a thread-safe Report logger

**Interview answer** — Config is almost immutable: load once from env/files into a `record EnvConfig`, store in a `static final` or `AtomicReference` if you must reload. Threads only read; no setters. Per-thread overrides (base URL for a canary) go in a ThreadLocal *copy*, not mutation of the global. Report logger: slf4j (thread-safe backends) + MDC with test name set/cleared on the test thread; for structured results, a `ConcurrentLinkedQueue<TestResult>` drained by one reporter, or CHM keyed by test id. Never a static `StringBuilder log` appended from 8 threads without sync.

**Deep dive** — Safe publication: `static final Config CFG = load();` after class init is visible to all threads. Reloads: build a new immutable object, `ref.set(newCfg)` (volatile/AtomicReference). Logger: don't share `DateTimeFormatter` built from `SimpleDateFormat`. Allure is generally OK from multiple threads if you attach to the correct UUID; misuse is attaching to the wrong test because of ThreadLocal Allure lifecycle — same class of bug as WebDriver.

**Code**

```java
public record EnvConfig(String baseUrl, Browser browser, Duration defaultWait) {
    static EnvConfig load() {
        return new EnvConfig(
                System.getenv().getOrDefault("BASE_URL", "https://qa.example.com"),
                Browser.fromEnv(),
                Duration.ofSeconds(10));
    }
}

public final class Config {
    private static final EnvConfig GLOBAL = EnvConfig.load();
    private static final ThreadLocal<EnvConfig> OVERRIDE = new ThreadLocal<>();
    private Config() {}
    public static EnvConfig get() {
        EnvConfig local = OVERRIDE.get();
        return local != null ? local : GLOBAL;
    }
    public static void override(EnvConfig cfg) { OVERRIDE.set(cfg); }
    public static void clearOverride() { OVERRIDE.remove(); }
}

public final class ResultBus {
    private static final ConcurrentLinkedQueue<TestResult> Q = new ConcurrentLinkedQueue<>();
    public static void publish(TestResult r) { Q.add(r); }
    public static List<TestResult> drain() { List<TestResult> out = new ArrayList<>(); while (true) { var x = Q.poll(); if (x == null) break; out.add(x); } return out; }
}
```

**Follow-ups & traps**

- Trap: `Collections.synchronizedMap` for config that is written at random by tests — last-write-wins chaos.
- MDC leak: next test's logs tagged with previous name — `MDC.clear()` in finally.
- Mutable `EnvConfig` getters that return internal `Map` — `Map.copyOf`.

**Senior/lead angle** — Config is a published immutable snapshot; reporting is an append-only concurrent queue. Tests never share a mutable logger buffer.

**One-liner** — Immutable config (plus optional ThreadLocal override) and concurrent queues/slf4j+MDC for reports — no static StringBuilder, no mutating global maps from tests.

### Q14. Debugging a "works with thread-count=1, fails at 8" Java suite

**Interview answer** — That signature is shared mutable state or colliding test data, not "TestNG is broken." I first reproduce with `-threadcount 8` locally, then hunt: static WebDriver/tokens/Faker lists; missing ThreadLocal.remove; shared user accounts; `RestAssured.baseURI`; `SimpleDateFormat` static; HashMap reports without CHM; tests that assume row order in a shared DB; WebDriver calls from `@BeforeSuite` reused by all methods. I add logging of `Thread.currentThread().getName()` + session id. I bisect: disable half the tests; run one class parallel; dump threads if it hangs. Fix by isolation (data + driver) rather than `synchronized` around the test body.

**Deep dive** — Playbook:

1. Confirm it's in-JVM parallel (forkCount=1). If forks>1 and it still fails, it's data/env, not static Java.
2. Search `static` mutable fields; grep `RestAssured.` static setters.
3. Assert `DriverManager.getDriver()` identity hash is unique per thread.
4. Unique data: emails with AtomicInteger + pid (Q11).
5. DB: no shared "the" admin order id; use per-test rows and cleanup.
6. If only UI flakes: screenshots of the wrong page → driver swap. If only API 401s → token swap.
7. If hang: jstack deadlock (Q7) or Grid slot wait without timeout.
8. If green with 8 threads but random assertion on lists → fail-fast CME / unsorted HashSet.

**Code**

```java
@BeforeMethod
public void start(Method m) {
    WebDriver d = Browser.fromEnv().create();
    DriverManager.setDriver(d);
    MDC.put("test", m.getName());
    log.info("session start thread={} id={}", Thread.currentThread().getName(),
            ((RemoteWebDriver) d).getSessionId());
}

@AfterMethod(alwaysRun = true)
public void stop() {
    try { DriverManager.quitDriver(); }
    finally { MDC.clear(); }
}
```

**Follow-ups & traps**

- Trap: "add Thread.sleep so they don't collide" — hides the race.
- Trap: `synchronize` the entire `@Test` — you just set thread-count=1 again.
- Flaky only in CI: also check CPU/Grid capacity causing timeouts that look like races.

**Senior/lead angle** — Make parallel-by-default a definition of done. A suite that cannot run `thread-count=8` is not "almost done"; it has undefined shared state. Add a CI job that fails on leftover sessions and on tests that write statics.

**One-liner** — thread-count=8 failures are shared drivers, tokens, or data — isolate with ThreadLocal and unique IDs, prove it with session-id logs, don't sleep or globally lock.
