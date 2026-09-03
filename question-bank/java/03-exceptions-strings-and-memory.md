# Exceptions, Strings, Memory & JVM

This file is the Java runtime round: exceptions you should throw vs catch, strings you should not concatenate in loops, and the JVM/memory questions that appear when a suite OOMs or forks 8 Surefire JVMs. Answers are Java 17/21 accurate and tied to WebDriver lifecycle, Rest Assured, and Surefire.

- Q1. Handling NullPointerException (prevent, don't catch)
- Q2. Checked vs unchecked vs Error; custom framework exceptions
- Q3. try/catch/finally and try-with-resources
- Q4. `throw` vs `throws`
- Q5. Exception vs Error; OOM and StackOverflow — what testers can do
- Q6. String vs StringBuilder vs StringBuffer; intern pool
- Q7. String immutability and concatenation in loops
- Q8. JVM memory areas and GC generations
- Q9. Diagnosing a memory leak in a test suite
- Q10. Classloading basics and Metaspace leaks
- Q11. Optional — returns, not fields; no blind `get()`
- Q12. Logging: slf4j vs System.out
- Q13. `java.time` — never `new Date()` in new code
- Q14. Reading files / classpath resources in tests
- Q15. Serialization basics (Jackson, not Java serialization)
- Q16. What happens when you run a Java test (javac, Surefire, forks)

### Q1. How do you handle NullPointerException? (prevent: Optional, `Objects.requireNonNull`, null-safe locators; don't catch NPE as control flow). Java 14+ helpful NPE messages

**Interview answer** — I don't catch `NullPointerException` as control flow — that hides bugs and is slower than a check. I prevent it: `Objects.requireNonNull(driver, "driver")` at construction, return `Optional` from "maybe missing" APIs, and never unbox a wrapper that might be null. Locators should wait until present (`WebDriverWait`) rather than `findElement` + NPE on a later `click`. Since Java 14, NPEs say which variable was null (`Cannot invoke "WebDriver.findElement" because "this.driver" is null`) — that is usually enough to fix the test. Catch NPE only at a top-level reporter if you must convert it to a framework failure, and even then prefer fixing the source.

**Deep dive** — NPE is a `RuntimeException`. Common SDET sources: static WebDriver not initialized on this thread; `response.jsonPath().get("id")` returning null then `.toString()`; `Integer timeout = map.get("t"); int t = timeout`; `driver` field on a page constructed with a null ThreadLocal. `Optional.ofNullable(json.get("id")).orElseThrow(...)` makes the missing field the failure. `Objects.requireNonNullElse(x, default)` for defaults. Selenium `findElement` throws `NoSuchElementException`, not NPE — NPE means *your* reference was null, which is a framework bug more often than an app bug.

Helpful NPE messages: JEP 358, on by default in 14+; `-XX:-ShowCodeDetailsInExceptionMessages` disables them. They can theoretically expose field names in logs — acceptable in CI.

`Objects.requireNonNull` throws NPE *with your message* at the boundary, which is better than a later `driver.findElement`. `Optional.of(null)` throws immediately; `ofNullable` is the missing-JSON path. Don't write `if (x == null) throw new NullPointerException()` — requireNonNull is the idiom.

**Code**

```java
public abstract class BasePage {
    protected final WebDriver driver;
    protected BasePage(WebDriver driver) {
        this.driver = Objects.requireNonNull(driver, "WebDriver");
    }
}

public Optional<String> orderId(Response r) {
    return Optional.ofNullable(r.jsonPath().getString("id"));
}

String id = orderId(res).orElseThrow(() -> new AssertionError("order id missing"));

WebElement el = wait.until(ExpectedConditions.elementToBeClickable(By.id("go")));
el.click(); // no null check needed if wait succeeded
```

**Follow-ups & traps**

- Trap: `catch (NullPointerException e) { return; }` in a page object — swallows the real bug.
- `Optional.get()` without `isPresent` is just a delayed NPE (`NoSuchElementException` actually).
- Autoboxing NPE (wrappers file) is still an NPE — same prevention.
- `Objects.requireNonNull` vs assert: requireNonNull stays on in production/CI; asserts can be off.


- NoSuchElementException is Selenium; NPE is your null reference — don't conflate them.
- Java 14+ NPE messages name the variable — quote that in the answer.
- Never catch NPE in a page object to 'retry the click.'

**Code**

```java
Objects.requireNonNull(DriverManager.getDriver(), "driver on " + Thread.currentThread().getName());
```

**One-liner** — Prevent NPE with requireNonNull, waits, and Optional; never catch it as logic — Java 14+ messages already tell you which field was null.

### Q2. Checked vs unchecked vs Error. When to create custom exceptions (`FrameworkException` wrapping `WebDriverException`)

**Interview answer** — Checked exceptions extend `Exception` but not `RuntimeException` — the compiler forces `catch` or `throws` (`IOException`, `InterruptedException`). Unchecked extend `RuntimeException` (`IllegalArgumentException`, `WebDriverException` in Selenium is actually a RuntimeException). `Error` is for JVM-level failures (`OutOfMemoryError`) you should not catch. I create a custom unchecked `FrameworkException` (or a small family) to wrap driver/HTTP failures with test context — URL, browser, last locator — so Allure/Surefire shows a useful message instead of a 40-line Selenium stack. I do not create a checked exception for every page method; that infects the whole suite with `throws`.

**Deep dive** — The industry trend (Spring, Jackson, Selenium) is unchecked at API boundaries. Checked still appears for `Thread.sleep` (`InterruptedException` — restore interrupt flag) and I/O. Wrapping: always pass the cause (`new FrameworkException(msg, e)`) or you lose the root. Don't catch `Exception` in a listener and wrap without rethrowing — tests go green. A hierarchy (`ConfigException`, `DriverSetupException` extends `FrameworkException`) helps retry analyzers classify "infra vs assertion."

`WebDriverException` already wraps many session errors; wrapping again is for *your* context, not to hide the type forever — log/cause chain matters. Checked exceptions on every page method (`login() throws IOException`) poison call sites; wrap at the I/O boundary. `Error` is not "a serious Exception" — it is a sibling under `Throwable`; catching `Exception` misses `Error` and that is usually correct.

**Code**

```java
public class FrameworkException extends RuntimeException {
    public FrameworkException(String message, Throwable cause) { super(message, cause); }
    public FrameworkException(String message) { super(message); }
}

public final class DriverFactory {
    public static WebDriver create(Browser browser) {
        try {
            return browser.create();
        } catch (WebDriverException e) {
            throw new FrameworkException(
                    "Failed to start %s session on %s".formatted(browser, Env.current().gridUrl()), e);
        }
    }
}
```

**Follow-ups & traps**

- Trap: `catch (Exception e) {}` in `@AfterMethod` — masks quit failures and leaks.
- Catching `Error` or `Throwable` in tests — don't, except a top-level reporter that rethrows.
- Checked `throws Exception` on every test method — TestNG allows it; it is still sloppy.
- Follow-up: `InterruptedException` — `Thread.currentThread().interrupt(); throw new FrameworkException(e);`

**Senior/lead angle** — One root unchecked type plus causes is enough. Document which exceptions retries treat as flake (timeout) vs product bug (assertion).


- Always wrap with cause: new FrameworkException(msg, e).
- InterruptedException: restore interrupt flag, then wrap.
- Don't create a checked exception type for login failures.

**Code**

```java
catch (WebDriverException e) {
    throw new FrameworkException("session failed browser=" + browser, e);
}
```

**One-liner** — Checked = compiler-enforced recoverability; unchecked = bugs and most driver/HTTP failures; wrap Selenium in a contextual FrameworkException, never swallow it.

### Q3. try/catch/finally, try-with-resources (`AutoCloseable` WebDriver wrapper / file streams)

**Interview answer** — `try/catch` handles specific exceptions; `finally` runs on success and failure for cleanup. try-with-resources (Java 7) is the preferred form for anything `AutoCloseable`: the compiler generates `close()` in a hidden finally and *suppresses* secondary exceptions on the primary via `addSuppressed`. Files, streams, and a thin `WebDriverSession` wrapper should be TWR. `driver.quit()` in a TestNG `@AfterMethod` is the usual pattern because JUnit/TestNG own the lifecycle; if you do manage the session yourself, wrap it.

**Deep dive** — TWR close order is reverse of declaration. If `quit()` throws after a test assertion error, you want both in the chain — TWR does that; a poorly written finally that `return`s will swallow. `WebDriver` itself implements nothing AutoCloseable in older Selenium; Selenium 4 `WebDriver` does **not** universally implement AutoCloseable on every binding — check the version. A wrapper is explicit and interview-friendly. Never TWR a driver stored in ThreadLocal if another method still uses it. Suppressed exceptions show as "Suppressed:" under the primary in the stack — interviewers ask you to read that on a failed `quit()` after an assertion. Multiple resources: declare driver last if you want it closed first? No — close is reverse declaration order, so declare driver first if it should close last (usually you want driver closed last after streams). For sessions, one resource wrapping quit is enough.

**Code**

```java
public final class WebDriverSession implements AutoCloseable {
    private final WebDriver driver;
    public WebDriverSession(WebDriver driver) { this.driver = driver; }
    public WebDriver driver() { return driver; }
    @Override public void close() { driver.quit(); }
}

try (WebDriverSession session = new WebDriverSession(new ChromeDriver());
     InputStream in = classLoader.getResourceAsStream("users.json")) {
    session.driver().get(Env.baseUrl());
    // parse in
} // quit + close, suppressed exceptions preserved

try {
    driver.get(url);
} finally {
    DriverManager.quitDriver(); // ThreadLocal remove even if get() threw
}
```

**Follow-ups & traps**

- Trap: TWR on ThreadLocal driver at the start of a test and also quitting in AfterMethod — double quit.
- `close()` vs `quit()` — close closes a window; quit ends the session. Wrappers must call `quit()`.
- finally vs TWR: prefer TWR for AutoCloseable; finally for ThreadLocal.remove and non-closeable cleanup.


- close() vs quit() — wrappers must quit.
- TWR reverse close order; suppressed exceptions stay on the primary.
- ThreadLocal remove still needs finally even with TWR.

**Code**

```java
try (InputStream in = Resources.open("/data/users.json")) {
    return new ObjectMapper().readValue(in, TestUser[].class);
}
```

**One-liner** — finally is manual cleanup; try-with-resources is the compiler's finally for AutoCloseable — wrap sessions so quit runs and suppressed errors aren't lost.

### Q4. `throw` vs `throws`

**Interview answer** — `throw` is a statement that actually raises an exception instance (`throw new AssertionError("cart empty")`). `throws` is a method declaration clause listing checked exceptions callers must handle (`void load() throws IOException`). You can `throw` unchecked without declaring `throws`. In tests I `throw` assertion errors and framework exceptions; I declare `throws IOException` only on methods that truly leak checked I/O, or I catch and wrap so test methods stay `void testLogin()`.

**Deep dive** — `throw null` is a NullPointerException. Rethrow: `catch (IOException e) { throw e; }` preserves type; `throw new FrameworkException(e)` wraps. `throws` on overrides cannot add new checked exceptions (Liskov). Constructors can `throws`. A method that always throws can be declared to return `X` and still compile if all paths throw — useful for helpers. `throws` is not inherited documentation for unchecked types; adding `throws FrameworkException` on a test method is noise. In TestNG, undeclared unchecked failures still fail the test; checked must be declared or wrapped. `throw e` in a catch of a broader type may need a cast or wrapping if the compiler has widened it.

**Code**

```java
public static String readJson(String classpath) {
    try (InputStream in = resource(classpath)) {
        if (in == null) throw new FrameworkException("Missing resource " + classpath);
        return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    } catch (IOException e) {
        throw new FrameworkException("Failed reading " + classpath, e); // wrap, no throws
    }
}

public void interruptibleWait() throws InterruptedException { // checked leaks
    Thread.sleep(100);
}
```

**Follow-ups & traps**

- Trap: confusing the two words — a favorite interviewer trick.
- Declaring `throws Exception` on TestNG tests works but disables useful checking.
- `throw e` vs wrap: wrap when you add context; rethrow when you are a pass-through.
- `throws` on a constructor of `BasePage` forces every subclass to declare or wrap.


- throw is the statement; throws is the clause — they will quiz the words.
- Unchecked throws do not need a throws clause.
- Override cannot add new checked exceptions.

**Code**

```java
public String read() {
    try { return Files.readString(path); }
    catch (IOException e) { throw new FrameworkException("read " + path, e); }
}
```

**One-liner** — `throw` does it; `throws` declares checked leakage — wrap I/O into FrameworkException so tests don't sprout `throws`.

### Q5. Exception vs Error; `OutOfMemoryError` / `StackOverflowError` — what testers can do

**Interview answer** — `Exception` is for recoverable (or at least handleable) conditions; `Error` signals the JVM is in a bad state. `OutOfMemoryError` means the heap (or metaspace, or native) could not satisfy an allocation. `StackOverflowError` is usually unbounded recursion. Testers should not catch them and continue. What we *can* do: quit drivers, bound log buffers, stop loading entire reports into memory, increase `-Xmx` only after proving we aren't leaking, and fix recursive page-object calls. After OOM the JVM is not trustworthy — fail the suite and capture a heap dump on the next run.

**Deep dive** — OOM subtypes: `Java heap space`, `Metaspace`, `GC overhead limit exceeded`, `Unable to create native thread`, `Direct buffer memory`. Each points to a different leak (Q9, Q10). StackOverflow in tests: a page method calling itself via a mistyped `this.click()` override, or Jackson exploding on cyclic JSON. `-Xss` increases stack size; it does not fix infinite recursion. "Unable to create native thread" is often OS `ulimit` / Chrome process explosion, not Java heap — `ps -L` / leftover chromedriver. Catching `OutOfMemoryError` to dump and continue is unsafe; `-XX:+HeapDumpOnOutOfMemoryError` is the supported path. Soft assertions catching `AssertionError` are intentional and not this question.

Catching `Throwable` in a listener to screenshot is common; rethrow Errors. `SoftAssertions` catching AssertionError is intentional and different from catching OOM.

**Code**

```java
// JVM flags for a leaky suite (diagnosis, not the first "fix"):
// -Xmx2g -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=target/heap.hprof

public void openRecursive() {
    openRecursive(); // StackOverflowError — fix the code, don't catch
}

try {
    runTest();
} catch (OutOfMemoryError e) { // DON'T — JVM may already be unusable
    throw e;
}
```

**Follow-ups & traps**

- Trap: `-Xmx` as the only response to CI OOM — you will OOM a bigger heap later.
- Catching OOM to "retry the test" — allocations may already be corrupted.
- Heap OOM vs Metaspace vs native thread — different flags, different dumps.
- StackOverflow: fix recursion; don't raise `-Xss` as the first move.
- Chrome process RAM is outside `-Xmx`.
- `Error` and `RuntimeException` both skip `throws`; only Error means "don't recover."

**Senior/lead angle** — Distinguish Java-heap OOM from Chrome-process RAM in capacity planning; they need different dashboards. A 1 GB Surefire heap plus eight Chromes is a machine-RAM problem, not a G1 tuning problem.

**One-liner** — Don't catch Error; OOM and StackOverflow are suite-stoppers — dump the heap, quit drivers, fix leaks and recursion, then consider `-Xmx`.

### Q6. String vs StringBuilder vs StringBuffer (sync, mutability, when each). Intern pool

**Interview answer** — `String` is immutable (char/byte data never changes). `StringBuilder` is a mutable buffer, not synchronized — the default for building strings in a loop on one thread. `StringBuffer` is the synchronized 1.0 version; I don't use it unless I must share a buffer across threads, which I wouldn't — I'd build per thread and join. The intern pool (`String.intern`, literals) stores unique strings in the heap (historically PermGen, now the heap). Literals are interned; `new String("qa")` is not, until `intern()`. Never identify strings with `==`.

**Deep dive** — Java 9 compact strings: `byte[]` + coder (LATIN1/UTF16). `StringBuffer` methods are synchronized; that does not make `append` chains atomic across calls. Interning too many runtime strings can bloat the heap. `==` true for two literals with the same content is a pool accident. Rest Assured bodies: prefer StringBuilder or `formatted` for a few pieces; for JSON use Jackson, not concatenation. `StringBuffer` in a static field shared by tests is still a race on the *content* even though methods are synced — one test's append interleaves with another's. Intern pool is on the heap (not PermGen since 7/8); intern'ing every test name in a 50k-test run is a self-inflicted leak.

**Code**

```java
String env = "qa";
String also = "qa";
env == also;                          // true — both literals interned
env == new String("qa");              // false
env.equals(new String("qa"));         // true
new String("qa").intern() == env;     // true — don't write this in tests

StringBuilder sb = new StringBuilder(64);
for (TestResult r : results) {
    sb.append(r.name()).append(',').append(r.status()).append('\n');
}
String csv = sb.toString();
```

**Follow-ups & traps**

- Trap: StringBuffer "because tests are parallel" — the buffer would still need to be shared; don't share it.
- `String.concat` vs `+` — compiler uses StringBuilder for a single expression of `+`.
- Intern pool location: heap in modern JDKs, not a reason to intern test names.


- StringBuilder in loops; StringBuffer only if you truly share a buffer (don't).
- Literals intern; new String does not.
- Never == strings from JSON or locators.

**Code**

```java
assert "qa" == "qa";
assert "qa" != new String("qa");
assert "qa".equals(new String("qa"));
```

**One-liner** — String immutable and interned for literals; StringBuilder for mutation on one thread; StringBuffer is leftover sync — never `==` strings.

### Q7. String immutability implications (concatenation in loops)

**Interview answer** — Because each `s = s + chunk` allocates a new String and copies the growing prefix, a loop of n concatenations is O(n²) time and produces n discarded objects. Use `StringBuilder` (or `String.join`, streams `Collectors.joining`). The compiler rewrites a *single* statement `a + b + c` into one StringBuilder; it does **not** hoist a builder across loop iterations. This shows up in SDET code when building giant HTML reports or logging every WebElement's `getAttribute("outerHTML")` into one string.

**Deep dive** — javac for `s += x` in a loop is roughly `s = new StringBuilder().append(s).append(x).toString()` each time. JIT may help small loops; interviews want StringBuilder. `repeat` (Java 11), `formatted` (Java 15), text blocks (Java 15) reduce clumsy concatenation for literals. Memory: those intermediate strings die in Eden if you don't keep references — still CPU and GC tax. Building a huge Allure step string from `getPageSource()` in a loop of elements is the same bug. `String.join(",", list)` and `Files.readString` beat hand-rolled loops. Text blocks (`"""`) are for literals, not a loop optimizer.

**Code**

```java
// BAD: O(n²)
String report = "";
for (TestResult r : results) {
    report += r.name() + " " + r.status() + "\n";
}

// GOOD
StringBuilder sb = new StringBuilder(results.size() * 32);
for (TestResult r : results) {
    sb.append(r.name()).append(' ').append(r.status()).append('\n');
}
String report = sb.toString();

String csv = results.stream()
        .map(TestResult::name)
        .collect(Collectors.joining(","));
```

**Follow-ups & traps**

- Trap: "the compiler always optimizes +" — not across loops.
- Logging: `log.debug("html: " + huge)` builds the string even if debug is off; use parameterized `log.debug("html: {}", () -> huge)` (slf4j 2.x) or `isDebugEnabled`.
- Text blocks don't change loop complexity.


- javac does not hoist StringBuilder across loop iterations.
- Collectors.joining for CSV of failed names.
- log.debug("" + huge) still builds the string — use {}.

**Code**

```java
String csv = results.stream().map(TestResult::name).collect(Collectors.joining(","));
```

**One-liner** — `+` in a loop copies the whole prefix each time; StringBuilder or `joining` is O(n) — the same rule as not building reports with String concat.

### Q8. JVM memory areas: heap (young/old), stack, metaspace, code cache. GC generations

**Interview answer** — Heap holds objects and arrays, split into young generation (Eden + two survivor spaces) and old generation. Short-lived objects (page objects, JSON trees, response bodies) die in young gen — minor GC. Survivors get promoted to old gen; major/full collections there are more expensive. Each thread has a stack for frames (locals, return addresses). Metaspace (native memory, replaced PermGen) holds class metadata. Code cache holds JIT-compiled native code. Direct/native buffers (Netty, some drivers) sit off-heap. GC algorithms in 17/21: G1 is the default; ZGC/Shenandoah exist for low pause.

**Deep dive** — Allocation: bump-the-pointer in TLAB (thread-local allocation buffer) in Eden. Minor GC: copy live Eden/survivor objects to the other survivor. Tenuring threshold controls promotion. Old gen: G1 uses regions and mixed collections rather than one stop-the-world sweep of the whole heap (CMS is gone). Metaspace grows as classes load; `-XX:MaxMetaspaceSize` caps it. Stack: `-Xss`. Heap: `-Xms`/`-Xmx`. Code cache: `-XX:ReservedCodeCacheSize`; overflowing it disables compilation.

For tests: many short tests ⇒ lots of young GC, usually fine. Retaining every `Response` body in a static list ⇒ old gen growth ⇒ full GC / OOM. Direct buffers (some HTTP clients) don't show in `-Xmx`; native Chrome RAM doesn't either. G1 region size is derived from heap; you rarely tune it for a test JVM. Serial/Parallel GC exist but G1 is the 17/21 default to name.

**Code**

```text
Thread stack          → DriverManager locals, method frames
Eden                  → new LoginPage, JSON trees, byte[] from files
Survivor / Old        → static caches, ThreadLocal leftovers, listeners
Metaspace             → loaded classes (byte-buddy mocks, Rest Assured proxies)
Code cache            → JIT of hot wait loops
```

```java
// typical Surefire JVM args
// -Xms512m -Xmx1024m -XX:+UseG1GC -Xlog:gc*:file=target/gc.log
```

**Follow-ups & traps**

- Trap: "PermGen" on a Java 17 interview — it's Metaspace since 8.
- Stack is not where objects live (escape analysis aside).
- Follow-up: native memory (Chrome processes!) is *outside* the Java heap — `-Xmx` does not bound Chrome. Grid nodes OOM the machine, not just the JVM.

**Senior/lead angle** — Quote heap vs Chrome process memory separately in capacity planning. A 1 GB Surefire JVM plus 8 Chrome instances is a RAM story, not a G1 story.


- Young gen: page objects and JSON; old gen: static caches and ThreadLocal leftovers.
- Metaspace: class metadata; PermGen is gone since 8.
- G1 is the 17/21 default; Chrome RAM is a separate budget.

**Code**

```java
// -Xms512m -Xmx1024m -XX:+UseG1GC -Xlog:gc*:file=target/gc.log
```

**One-liner** — Heap = young (short-lived tests) + old (leaks/caches); stack per thread; metaspace = classes; code cache = JIT; G1 is the 17/21 default.

### Q9. Diagnosing a memory leak in a test suite (driver not quit, listeners holding pages, huge logs). jmap, MAT, GC logs — SDET-flavored

**Interview answer** — A suite leak is almost never "the JDK." Classic causes: `WebDriver` never `quit()`, Grid sessions held; TestNG/JUnit listeners retaining page objects or screenshots in a static list; Allure/log buffers keeping every DOM dump; caches without bounds; ThreadLocal not `remove()` on pooled threads. Symptoms: heap grows across tests, GC overhead, OS RAM climbs from Chrome processes, "unable to create new native thread." I turn on GC logging, run a slice of the suite, dump the heap (`jcmd <pid> GC.heap_dump`), open it in Eclipse MAT, look at Dominator Tree for `ChromeDriver`, `RemoteWebDriver`, `ArrayList` of results, `ThreadLocalMap`. Then I fix teardown, not `-Xmx`.

**Deep dive** — Process vs heap: `ps`/`top` showing Chrome after tests means quit() didn't run or ChromeDriver children were orphaned. Heap-only growth with no Chrome ⇒ Java caches. `jstat -gc` watch Old gen. `jmap -histo:live` for class counts (`WebDriver` instances should ≈ parallel threads, not test count). MAT leak suspects: `DriverManager` statics, `RestAssured` response filters storing bodies, `SoftAssert` lists. Listeners should store *paths* to artifacts, not `byte[]` screenshots.

ChromeDriver is a separate OS process; Java leak of the driver object often implies the process is still alive. `driver.quit()` in `finally` + `DRIVER.remove()`.

**Code**

```bash
# GC log (Java 17 unified logging)
java -Xlog:gc*:file=gc.log:time,uptime -jar ...

# live histogram
jcmd $PID GC.class_histogram
jcmd $PID GC.heap_dump /tmp/tests.hprof
```

```java
@AfterMethod(alwaysRun = true)
public void tearDown() {
    try {
        if (DriverManager.getDriver() != null) {
            DriverManager.getDriver().quit();
        }
    } finally {
        DriverManager.remove(); // ThreadLocal
    }
}
```

**Follow-ups & traps**

- Trap: blaming TestNG parallelism itself — parallelism *reveals* static leaks.
- MAT: incoming refs to `RemoteWebDriver` tell you who retained it (listener vs ThreadLocal vs page static).
- Follow-up: native leak with stable Java heap — Chrome zombies, gRPC stubs, direct buffers.

**Senior/lead angle** — Add a CI canary: after smoke, assert `jcmd histo` WebDriver count is ≤ thread-count, and fail the build on leftover chromedriver processes.

**One-liner** — Quit drivers, drop listener references, bound logs; then GC logs + heap dump + MAT Dominator Tree — `-Xmx` is last.

### Q10. Classloading basics and why it rarely matters until Metaspace leaks from generating many classes

**Interview answer** — A class loader loads bytecode, links it, and defines a `Class<?>`. The bootstrap, platform, and application loaders form a parent-delegation chain: ask parent first, so `java.lang.String` isn't replaced by the app. Test JVM: app classloader sees `target/classes` + Maven test classpath. This rarely matters until something *generates* classes forever — Byte Buddy/Mockito inline mocks, Groovy/JavaScript engines, old CGLIB, Rest Assured/Jackson versions that spin proxies — and Metaspace grows (`OutOfMemoryError: Metaspace`). Surefire `forkCount` with `reuseForks=true` keeps those classes across tests.

**Deep dive** — Each class loader has its own namespace; the same class file loaded twice is two Classes (`ClassCastException` "X cannot be cast to X"). Web app leaks were "container loader holds static." In tests: static caches of generated mappers keyed by `Class` loaded from a discarded loader (rare unless you embed a container). Mockito mockito-inline uses the instrumentation agent; excessive unique mock classes in a long reused JVM can pressure metaspace. Fix: `reuseForks=false` as a diagnostic, then stop generating a class per test. Parent delegation: application loader asks platform then bootstrap before defining `com.acme.LoginPage`. Byte Buddy/Mockito generate classes in a child loader or via redefine; unique mock types per test method in a 2-hour reused fork show up as Metaspace climb in `jstat -gcmetacapacity`. `-XX:MaxMetaspaceSize=256m` fails fast.

**Code**

```text
Bootstrap  → JDK classes
Platform   → java.xml etc.
App        → your framework + Selenium + Rest Assured
(child)    → Surefire isolated providers / sometimes plugin loaders
```

```xml
<!-- diagnostic: new JVM per class to see if Metaspace resets -->
<reuseForks>false</reuseForks>
```

**Follow-ups & traps**

- Trap: explaining OSGi in an SDET interview — keep it to delegation + metaspace.
- `Class.forName` vs `Thread.currentThread().getContextClassLoader()`.
- Follow-up: `-XX:MaxMetaspaceSize=256m` to fail fast on a leak.


- reuseForks=false as a diagnostic when Metaspace climbs.
- Mockito inline mocks generate classes — unique mocks per test add up.
- Class.forName vs context class loader is rare in SDET but worth naming.

**Code**

```java
// jcmd $PID VM.metaspace
```

**Senior/lead angle** — Cap Metaspace in CI so a mock-happy suite fails fast instead of eating the node overnight.

**One-liner** — Parent-delegation class loaders define Class objects in metaspace; you care when mocks/proxies generate unbounded classes in a reused Surefire JVM.

### Q11. Optional — use in returns, not fields; don't `Optional.get()` blindly

**Interview answer** — `Optional<T>` is a container for a value that may be absent, designed as a **return type** so callers must choose `orElse` / `orElseThrow` / `ifPresent`. Do not use it for fields or method parameters (noisy, not serializable-friendly, extra allocation). Never `optional.get()` without a guarantee — that's `NoSuchElementException`. In APIs: `Optional<String> jsonPath(String path)` for missing keys; in page objects prefer waits that throw `TimeoutException` rather than `Optional<WebElement>` for elements that *must* exist.

**Deep dive** — `Optional` is a value class (not a full monad in Java). `orElse(compute())` always computes; `orElseGet(this::compute)` is lazy. `orElseThrow()` (Java 10) throws `NoSuchElementException`. `map`/`flatMap`/`filter` chain. Don't `optional == null` — return `Optional.empty()`, never null Optional. Jackson: `Optional` fields work with modules but records with nullable components or `JsonNullable` may be clearer for DTOs. `Optional` is not `Serializable` in a useful way and is a bad REST field. `stream().findFirst()` already returns Optional — don't wrap again. Empty Optional in an assertion should be `orElseThrow(() -> new AssertionError("missing id"))` so the test name and field appear.

**Code**

```java
public Optional<String> csrfToken(Response r) {
    return Optional.ofNullable(r.getHeader("X-CSRF"));
}

String token = csrfToken(r).orElseThrow(() -> new FrameworkException("missing CSRF"));

Optional<WebElement> banner = driver.findElements(By.id("cookie")).stream().findFirst();
banner.ifPresent(WebElement::click);

// BAD field
private Optional<WebDriver> driver; // don't
```

**Follow-ups & traps**

- Trap: `orElse(null)` — back to NPE land.
- `Optional` of `Optional` — use `flatMap`.
- Streams: `findFirst` already returns Optional (streams file).
- `orElseGet` vs `orElse` is the lazy-vs-eager follow-up they expect.


- orElseGet lazy; orElse eager.
- orElseThrow with a message beats get().
- Optional as a field is a style fail in reviews.

**Code**

```java
String id = Optional.ofNullable(json.getString("id"))
        .orElseThrow(() -> new AssertionError("id missing"));
```

**One-liner** — Optional is a return type for "maybe"; `orElseThrow`/`orElseGet` instead of `get()`; not for fields, not for elements a wait should have found.

### Q12. Logging: slf4j, why System.out is wrong in frameworks

**Interview answer** — Use SLF4J as the API (`LoggerFactory.getLogger`) with Logback or Log4j2 as the backend. `System.out.println` is unlevelled, unsynchronized in useful ways, has no correlation IDs, bypasses CI log capture config, and cannot be silenced per package. In parallel tests, stdout interleaves without test names. Parameterized messages (`log.info("opened {}", url)`) skip string building when the level is off. Bind Selenium's noisy loggers (`org.openqa.selenium` to WARN) so signal isn't drowned.

**Deep dive** — SLF4J is a facade: compile against it, ship one implementation. Don't mix `java.util.logging`, log4j-1, and println. MDC (`MDC.put("test", name)`) in a TestNG listener tags every line — then `remove()` in finally (ThreadLocal underneath). Rest Assured `filters` should log through slf4j, not print the entire body at INFO in CI (PII, size). Binding: `logback-classic` or Log4j2 on the test classpath, one only. Selenium 4 uses JUL internally; bridge with `jul-to-slf4j` if driver logs drown the report. Never log passwords or `Authorization` headers at INFO.

**Code**

```java
public final class LoginPage {
    private static final Logger log = LoggerFactory.getLogger(LoginPage.class);

    public HomePage login(String user, String pass) {
        log.info("Logging in as {}", user);          // not log.info("..." + user)
        // ...
        return new HomePage(driver);
    }
}

// BAD
System.out.println("driver=" + driver);
```

**Follow-ups & traps**

- Trap: logging passwords — redact.
- `log.debug("" + expensive)` still concatenates; use `{}` or guards.
- Follow-up: Allure vs slf4j — Allure is reporting; slf4j is diagnostics; both, not println.


- MDC.put test name in BeforeMethod; MDC.clear in finally.
- One backend: logback or log4j2, not both plus println.
- Redact Authorization headers.

**Code**

```java
private static final Logger log = LoggerFactory.getLogger(LoginPage.class);
log.info("open {}", url);
```

**One-liner** — SLF4J with parameterized messages and MDC test names; System.out is unlevelled, interleaved, and unconfigurable in CI.

### Q13. Date/time: `java.time` (`Instant`, `ZonedDateTime`, `DateTimeFormatter`) — never `new Date()` in new code

**Interview answer** — Use `java.time` (JSR-310). `Instant` is a UTC timestamp (expiry, "wait until"). `ZonedDateTime` is a civil date-time with a zone (user-local reports). `LocalDate`/`LocalDateTime` have no zone — fine for date-of-birth, dangerous for "now in QA vs UTC Jenkins." Format with `DateTimeFormatter` (immutable, thread-safe); `SimpleDateFormat` is not thread-safe. `new Date()` and `Calendar` are legacy. Rest Assured/Jackson: configure `JavaTimeModule` and ISO-8601 strings.

**Deep dive** — `Date` is a mutable instant; `Calendar` is a mutable bag. `Duration`/`Period` for waits (`Duration.ofSeconds(10)` in Selenium 4). Never store server times as `LocalDateTime` without a zone. Tests: freeze time with a `Clock` dependency (`Clock.fixed`) instead of `Instant.now()` scattered — otherwise expiry tests flake at midnight. Java 21 has no excuse for `new Date()`. `DateTimeFormatter` is immutable and thread-safe; a `static final` formatter is correct, unlike `SimpleDateFormat`. `Instant.parse` for ISO-8601 API fields. Selenium 4 waits take `Duration`, not `int seconds` — that API change is the interview hook.

**Code**

```java
Instant expires = Instant.now().plus(Duration.ofMinutes(15));
ZonedDateTime qaNow = ZonedDateTime.now(ZoneId.of("America/New_York"));
String stamp = DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(qaNow);

WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

public final class Time {
    private final Clock clock;
    public Instant now() { return clock.instant(); }
}

// Jackson
ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
```

**Follow-ups & traps**

- Trap: `SimpleDateFormat` as a static field in parallel tests — races.
- Epoch millis in APIs: `Instant.ofEpochMilli`.
- `LocalDateTime.now()` on CI in UTC vs laptop in IST — off-by-hours flakes.


- DateTimeFormatter is thread-safe; SimpleDateFormat is not.
- Inject Clock for expiry tests.
- Selenium 4 waits take Duration.

**Code**

```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
Instant exp = Instant.now(clock).plus(Duration.ofMinutes(15));
```

**One-liner** — Instant for timestamps, ZonedDateTime for zoned display, DateTimeFormatter not SimpleDateFormat, Duration for waits — never `new Date()` in Java 17/21 code.

### Q14. Reading files / resources from classpath in tests

**Interview answer** — Test data that ships with the repo belongs on the classpath (`src/test/resources/users.json`), read via `getResourceAsStream`, not `new File("src/test/resources/...")` which breaks from a different CWD and from a packaged JAR. Use `Class.getResourceAsStream("/users.json")` (leading slash = classpath root) or `class.getClassLoader().getResourceAsStream("users.json")` (no leading slash). Always specify charset (`UTF_8`). Large downloads and screenshots belong on the filesystem (`target/`) via `Path` / `Files`.

**Deep dive** — Class vs classloader: `Class.getResource` is package-relative without a leading `/`. Surefire runs with `target/test-classes` on the classpath. `Files.readString(Path.of("..."))` is fine for CWD-relative artifacts the test just downloaded. Don't lock files; TWR the stream. JSON: Jackson `readValue(is, Order[].class)`. Leading slash: `LoginPage.class.getResourceAsStream("/data/users.json")` vs `getClassLoader().getResourceAsStream("data/users.json")` — mix them up and you get a null stream then NPE on `readAllBytes`. JAR vs exploded `target/test-classes` should both work if you stay on the classpath API.

**Code**

```java
public final class Resources {
    public static String read(String classpath) {
        try (InputStream in = Resources.class.getResourceAsStream(classpath)) {
            if (in == null) throw new FrameworkException("Missing " + classpath);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new FrameworkException("Read failed " + classpath, e);
        }
    }
}

OrderRequest[] cases = new ObjectMapper()
        .readValue(Resources.read("/data/orders.json"), OrderRequest[].class);

Path downloaded = Path.of("target", "invoice.pdf");
byte[] pdf = Files.readAllBytes(downloaded);
```

**Follow-ups & traps**

- Trap: `new File("src/test/resources/x")` green in IDE, red in Jenkins (CWD = workspace or `target`).
- Forgetting leading `/` on `Class.getResource`.
- Not closing streams — use TWR.


- Leading / on Class.getResourceAsStream is classpath root.
- new File("src/test/resources") breaks in Jenkins.
- Always UTF_8.

**Code**

```java
try (InputStream in = Resources.class.getResourceAsStream("/data/users.json")) {
    if (in == null) throw new FrameworkException("missing users.json");
}
```

**One-liner** — Classpath via `getResourceAsStream` for fixtures; `Files`/`Path` for runtime artifacts; never hardcode `src/test/resources` paths.

### Q15. Serialization basics (and why you use Jackson not Java serialization)

**Interview answer** — Serialization turns an object into bytes or text. Java's built-in `Serializable` / `ObjectOutputStream` is a brittle binary protocol: fragile `serialVersionUID`, security gadgets (don't deserialize untrusted bytes), poor versioning, not what HTTP APIs speak. REST tests use JSON (sometimes XML) via Jackson (or Gson): map records/POJOs to JSON with an `ObjectMapper`. Rest Assured uses Jackson/Gson under `body(pojo)` / `as(Pojo.class)`. Configure the same mapper as the service (dates, `FAIL_ON_UNKNOWN_PROPERTIES`, records).

**Deep dive** — Jackson databind: annotations `@JsonProperty`, `@JsonIgnore`, `@JsonFormat`. Java 16+ records work with Jackson 2.12+. Java serialization is still in the JDK (`Serializable`) but is in maintenance / strongly discouraged for new designs. Test snapshots: prefer JSON files over `.ser` blobs. Deep copy via serialize-deserialize is a hack; use records/`with`. Java serialization gadgets (ysoserial) are why you never `readObject` from a test artifact you didn't write. Jackson `FAIL_ON_UNKNOWN_PROPERTIES` false in e2e, true in contract tests. Don't `Serializable` a page object.

**Code**

```java
ObjectMapper mapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

String json = mapper.writeValueAsString(new CreateOrderRequest("SKU-1", 2));
CreateOrderRequest back = mapper.readValue(json, CreateOrderRequest.class);

given().contentType(JSON).body(new CreateOrderRequest("SKU-1", 2))
       .post("/orders")
       .then().statusCode(201)
       .extract().as(OrderResponse.class);

// DON'T
// new ObjectOutputStream(file).writeObject(driver); // WebDriver isn't a DTO
```

**Follow-ups & traps**

- Trap: serializing WebDriver or ThreadLocal — not the model.
- Unknown properties failing CI when the API adds a field — often disable FAIL_ON_UNKNOWN in tests, enable in contract tests.
- Gson vs Jackson: pick one per framework.


- Jackson + records for Rest Assured bodies.
- Never Java-serialize a WebDriver.
- FAIL_ON_UNKNOWN_PROPERTIES: false in e2e, true in contract tests.

**Code**

```java
OrderResponse r = new ObjectMapper().registerModule(new JavaTimeModule())
        .readValue(json, OrderResponse.class);
```

**One-liner** — HTTP uses JSON via Jackson; Java Serializable is a legacy binary trap — POJOs/records in, never deserialize untrusted bytes.

### Q16. What happens when you run a Java test (javac/bytecode, Surefire, JVM fork, parallel forks)

**Interview answer** — Source is compiled to bytecode (`javac` or the Maven compiler plugin) in `target/test-classes`. Surefire (or Failsafe for integration tests) launches one or more JVM processes (forks), puts your test classpath on them, and uses a provider (JUnit 4/5, TestNG) to discover and run methods. Parallelism is two-layered: multiple forks (`forkCount`) are separate processes (isolated heaps, no shared statics), and within a JVM TestNG/JUnit threads share statics and ThreadLocals. Each test method is invoked by reflection. Failures are `AssertionError`/`Exception` reported back to the parent Maven JVM via the Surefire protocol.

**Deep dive** — Bytecode: `invokevirtual`, constant pool, no types for generics (erasure). First use of a class triggers load + `<clinit>`. `reuseForks=true` (default) reuses the JVM — faster, but static pollution and metaspace carry over. `forkCount=1C` can mean one fork per CPU. JUnit 5 parallel is in-JVM (`junit.jupiter.execution.parallel`). TestNG `parallel="methods"` is in-JVM threads. Mixing forkCount > 1 and in-JVM parallel is a resource multiplier (browsers = forks × threads). Selenium Grid sessions are another process layer.

Debug: `-DforkCount=0` used to run in-Maven JVM (old Surefire); modern versions still fork by default. `argLine` passes `-Xmx`, Jacoco agents.

**Code**

```xml
<plugin>
  <artifactId>maven-surefire-plugin</artifactId>
  <configuration>
    <forkCount>1</forkCount>
    <reuseForks>true</reuseForks>
    <parallel>methods</parallel>      <!-- TestNG/JUnit in-JVM, not a new process -->
    <threadCount>4</threadCount>
    <argLine>-Xmx1024m -Dfile.encoding=UTF-8</argLine>
  </configuration>
</plugin>
```

```text
mvn test
  → compile main + test
  → Surefire parent JVM
      → fork worker JVM (classpath, argLine)
          → TestNG starts thread pool
              → @BeforeMethod: ThreadLocal driver
              → test method bytecode
              → @AfterMethod: quit + remove
      → results XML / Allure
```

**Follow-ups & traps**

- Trap: "parallel always means multiple JVMs" — usually multiple threads, one heap.
- Static WebDriver fails at `threadCount=8` with `forkCount=1` (concurrency file).
- Jacoco `argLine` overwritten by Surefire `argLine` — use `@{argLine}` property merge.
- Failsafe vs Surefire: failsafe runs in `integration-test`/`verify` and doesn't fail `test` phase.

**Senior/lead angle** — Draw the process tree: Maven → Surefire forks → test threads → chromedriver → Chrome. Resource math is `forks × threads × (JVM heap + browser RAM)`.

**One-liner** — javac to bytecode, Surefire forks worker JVMs, TestNG/JUnit may thread inside them — forks isolate statics; in-JVM parallel does not.
