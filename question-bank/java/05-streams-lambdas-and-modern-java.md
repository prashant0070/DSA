# Java 8+ Streams, Lambdas & Modern Java

This file is the Java 8–21 language round SDET interviews use after collections: lambdas for waits, streams for report aggregation, and the modern features (records, sealed, pattern matching, HttpClient) that separate a Java 8 resume from a Java 21 practitioner. Parallel streams are treated as a trap in test code. Selenium `ExpectedConditions` and Rest Assured are the running examples.

- Q1. Lambdas and functional interfaces (Predicate, Function, Consumer, Supplier) — custom waits
- Q2. Method references
- Q3. Streams API: map/filter/reduce/collect, lazy evaluation, terminal ops
- Q4. Parallel streams — when they're a trap in tests
- Q5. Optional with streams
- Q6. Collectors: groupingBy, partitioningBy, toMap, joining
- Q7. Interface default/static methods — framework impact
- Q8. var, records, sealed classes, pattern matching switch (Java 17–21)
- Q9. HttpClient (Java 11) vs Rest Assured
- Q10. Modules (JPMS) — awareness only
- Q11. Fluent wait using lambdas
- Q12. Common stream interview snippets

### Q1. Lambda + functional interfaces (`Predicate`, `Function`, `Consumer`, `Supplier`) — ExpectedConditions-style custom waits

**Interview answer** — A lambda is a concise implementation of a *functional interface* — an interface with one abstract method (SAM). `Predicate<T>` is `T → boolean`, `Function<T,R>` is `T → R`, `Consumer<T>` is `T → void`, `Supplier<T>` is `() → T`. Selenium's `ExpectedCondition<T>` is a SAM (`apply(WebDriver)`), so `driver -> driver.findElements(by).size() == n` is a custom wait. I use Predicate for retry-until, Supplier for lazy test data, Function for JSON mapping, Consumer for Rest Assured filters.

**Deep dive** — Lambdas capture effectively-final locals (or truly final). Capturing a mutable array `int[] box` is a hack; prefer a proper class. Bytecode: invokedynamic + LambdaMetafactory (not an anonymous class file per lambda). Closures holding `this` keep the page object alive. `@FunctionalInterface` is documentation and a compiler check. `BiPredicate`, `UnaryOperator`, `BinaryOperator` show up in `reduce`/`compute`. ExpectedConditions methods return ExpectedCondition instances — you can compose with `ExpectedConditions.and`/`or`. A lambda that uses `driver` from ThreadLocal is still bound to the creating thread's capture if you capture the reference; capturing `DriverManager::getDriver` as a method ref re-reads per call. Don't implement `ExpectedCondition` as an anonymous class unless you need fields.

**Code**

```java
@FunctionalInterface
public interface ExpectedCondition<T> extends Function<WebDriver, T> { }

WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until((ExpectedCondition<Boolean>) d ->
        d.findElements(By.cssSelector(".cart-line")).size() >= 3);

Predicate<Response> created = r -> r.statusCode() == 201;
Function<Response, String> id = r -> r.jsonPath().getString("id");
Supplier<TestUser> user = () -> new TestUser(TestIds.email(), "Pw1!", List.of("buyer"));
Consumer<RequestSpecification> auth = spec -> spec.auth().oauth2(token);

given().spec(base).filter((req, res, ctx) -> { log.debug("{}", req.getURI()); return ctx.next(req, res); });
```

**Follow-ups & traps**

- Trap: "lambda is an anonymous class" — similar use, different bytecode and `this`.
- Capturing `driver` that gets quit — same leak as inner classes.
- `Predicate.and`/`or`/`negate` for composing waits; short-circuit like `&&`.

**Senior/lead angle** — Custom waits belong in `WaitUtils` as named methods, not inline 15-line lambdas in tests — the lambda is the implementation, the name is the API.


- ExpectedCondition is Function<WebDriver,T> — custom waits are lambdas.
- Predicate/Function/Consumer/Supplier — name all four.
- Capture of driver in a lambda can retain a quit session — prefer DriverManager.getDriver() inside the lambda.

**Code**

```java
wait.until(d -> d.findElements(CART_ROWS).size() >= 3);
```

**One-liner** — Lambdas implement SAM types; Predicate/Function/Consumer/Supplier are the four to name; Selenium waits are Functions from WebDriver to a value or null.

### Q2. Method references

**Interview answer** — A method reference is a lambda that only calls an existing method: `Class::staticMethod`, `instance::method`, `Type::instanceMethod`, `Type::new`. `results.stream().map(TestResult::name)` is `r -> r.name()`. `DriverFactory::create` can be a `Function<Browser, WebDriver>` if signatures match. They are not faster in any way you should claim; they are clearer when the lambda would be trivial.

**Deep dive** — `Type::instanceMethod` on a stream of Type is `x -> x.instanceMethod()`. `list.forEach(System.out::println)` captures the `out` instance. Constructor refs: `OrderResponse::new` as a `Function<String, OrderResponse>` only if there is a matching constructor. Ambiguous overloads fail to compile — fall back to a lambda. Bound vs unbound: `driver::findElement` is `Function<By, WebElement>` bound to that driver instance. `List::of` as a Supplier doesn't work (that's a static varargs). Overload `log(String)` vs `log(Object)` makes `this::log` ambiguous. Method refs are not "pass by name"; they still capture the instance.

**Code**

```java
List<String> names = results.stream().map(TestResult::name).toList(); // Java 16+

Function<Browser, WebDriver> factory = browser -> browser.create();
Function<Browser, WebDriver> same = Browser::create; // if create is instance method on enum

results.forEach(log::info); // if log.info(TestResult) exists — otherwise lambda

Supplier<ChromeDriver> chrome = ChromeDriver::new;
```

**Follow-ups & traps**

- Trap: `map(String::toUpperCase)` vs `map(s -> s.toUpperCase(Locale.ROOT))` — locale.
- Overload ambiguity with `this::wait`.
- Method refs still capture the instance (`driver::findElement` keeps driver).
- `Type::new` for `ChromeDriver::new` as `Supplier<ChromeDriver>` is the factory-looking form.


- map(TestResult::name) vs r -> r.name() — same bytecode family.
- Ambiguous overloads: fall back to a lambda.
- driver::findElement captures that driver instance.

**Code**

```java
List<String> names = results.stream().map(TestResult::name).toList();
```

**Senior/lead angle** — Ban method refs that capture a driver field on a page that outlives the test; prefer `DriverManager::getDriver` so the lookup is per-call.

**One-liner** — Method references are lambdas that delegate to an existing method — use them when the lambda would only call that method.

### Q3. Streams API: map/filter/reduce/collect, lazy evaluation, terminal ops

**Interview answer** — A stream is a pipeline over data, not a storage. Intermediate ops (`map`, `filter`, `flatMap`, `distinct`, `sorted`, `peek`) are lazy and return a stream. Terminal ops (`collect`, `forEach`, `reduce`, `count`, `findFirst`, `anyMatch`) trigger traversal and consume the stream — you cannot reuse it. `filter` keeps elements, `map` transforms, `reduce` folds to one value, `collect` uses a Collector into a collection or string. I use streams to turn `List<TestResult>` into reports; I use a for-loop when I have indexed WebDriver actions or early `break` with side effects.

**Deep dive** — Laziness means `filter` on an infinite `Stream.iterate` is fine until a short-circuit terminal (`findFirst`). `peek` is for debugging, not production mutation. Encounter order: ordered sources (List) preserve order unless `unordered()`. `toList()` (Java 16) is unmodifiable; `collect(toList())` is a mutable ArrayList historically. Checked exceptions inside lambdas must be wrapped. Rest Assured `jsonPath().getList("$")` then stream is a common pipeline. `limit`/`skip` for "first N failures." `distinct` uses equals/hashCode. A stream of `WebElement` is a snapshot of the list `findElements` returned — stale if the DOM changes; re-find rather than stream a stored list.

**Code**

```java
List<String> failedNames = results.stream()
        .filter(r -> r.status().equals("FAIL"))
        .map(TestResult::name)
        .distinct()
        .sorted()
        .toList();

int totalMs = results.stream()
        .mapToInt(r -> (int) r.durationMs())
        .sum();

Optional<TestResult> slowest = results.stream()
        .reduce((a, b) -> a.durationMs() >= b.durationMs() ? a : b);

boolean anyFail = results.stream().anyMatch(r -> r.status().equals("FAIL"));
```

**Follow-ups & traps**

- Trap: `stream.forEach(list::add)` then using another terminal — stream already consumed.
- `count()` after `map` still traverses; don't use count to "run" side effects — use `forEach`.
- `null` in a stream of objects: `filter(Objects::nonNull)` or NPE in `map`.


- Intermediate lazy; terminal consumes the stream.
- toList() (16+) unmodifiable; collect(toList()) historically mutable.
- Don't forEach-add to a list and then count() — already consumed.

**Code**

```java
boolean anyFail = results.stream().anyMatch(r -> r.status().equals("FAIL"));
```

**One-liner** — Intermediate ops are lazy; a terminal op runs the pipeline once; map/filter/reduce/collect are transform, select, fold, and gather.

### Q4. Parallel streams — when they're a trap in tests

**Interview answer** — `list.parallelStream()` splits work on the **common ForkJoinPool**. That fights TestNG's own thread pool, does not see ThreadLocal drivers, reorders side effects, and makes WebDriver calls from random workers — undefined. I never `parallelStream` over pages or locators. The only plausible use in a suite is CPU-bound aggregation of already-collected immutable results (`results.parallelStream().mapToLong(TestResult::durationMs).sum()`) on a large list, which is rare. Prefer an explicit ExecutorService for HTTP fan-out (concurrency file).

**Deep dive** — Common pool size defaults to `cores-1`. `blocking` in a parallel stream starves other parallel streams and some framework internals. Encounter order for `forEach` is not stable (`forEachOrdered` is). Exceptions are wrapped in `RuntimeException`. `ThreadLocal` in the test thread is invisible to FJP workers — this is the same bug as Q4 in the concurrency file. `-Djava.util.concurrent.ForkJoinPool.common.parallelism` is a global knob you should not turn for one test. `parallel()` on a Rest Assured-backed stream fires HTTP from FJP threads — no test name in MDC, no ThreadLocal token. If you need parallel HTTP, use an ExecutorService you shut down (concurrency Q6).

**Code**

```java
// BAD — WebDriver on FJP threads, ThreadLocal empty
pages.parallelStream().forEach(p -> p.driver.findElement(By.id("x")).click());

// OK-ish — pure function on immutable data
long p95 = results.parallelStream()
        .mapToLong(TestResult::durationMs)
        .sorted()
        .skip((long) (results.size() * 0.95))
        .findFirst()
        .orElse(0L);

// BETTER for I/O: dedicated pool (concurrency Q6)
```

**Follow-ups & traps**

- Trap: "parallelStream makes my suite faster" — it makes it flakier.
- `Stream.generate` + parallel + limit — still easy to oversubscribe.
- Follow-up: `spliterator` characteristics — interview trivia, not SDET-critical.


- Common pool; ThreadLocal empty; WebDriver undefined.
- OK-ish only for pure aggregation of already-collected results.
- Prefer ExecutorService for HTTP fan-out.

**Code**

```java
// pages.parallelStream().forEach(p -> p.click()); // NEVER
```

**One-liner** — Parallel streams use the common ForkJoinPool, ignore ThreadLocal, and are unsafe for WebDriver — keep them off test control flow.

### Q5. Optional with streams

**Interview answer** — Terminal ops `findFirst`/`findAny`/`min`/`max`/`reduce` return `Optional`. You chain `map`/`flatMap`/`filter`/`orElseThrow` instead of `isPresent`/`get`. `flatMap(Optional::stream)` (Java 9) turns `Stream<Optional<T>>` into `Stream<T>`. Don't wrap every list element in Optional. For "first displayed element," `stream().filter(WebElement::isDisplayed).findFirst().orElseThrow(...)`.

**Deep dive** — `findAny` is allowed to be unordered (parallel); `findFirst` respects encounter order. `max(Comparator)` empty stream → empty Optional, not NPE. Avoid `orElse(new Heavy())` — use `orElseGet`. Combining: `opt1.or(() -> opt2)` (Java 9). `map(Response::jsonPath)` on Optional of Response is the missing-body path. Don't `stream().findFirst().get()`. `OptionalInt` exists for primitives; rarely needed in tests.

**Code**

```java
WebElement firstVisible = driver.findElements(By.cssSelector(".row")).stream()
        .filter(WebElement::isDisplayed)
        .findFirst()
        .orElseThrow(() -> new AssertionError("no visible row"));

List<Optional<String>> ids = responses.stream()
        .map(r -> Optional.ofNullable(r.jsonPath().getString("id")))
        .toList();
List<String> present = ids.stream().flatMap(Optional::stream).toList();
```

**Follow-ups & traps**

- Trap: `findFirst().get()` in a test — use `orElseThrow` with a message.
- `max` on empty without Optional handling.
- Optional in streams of JSON — prefer `filter(r -> r.jsonPath().get("id") != null)`.


- findFirst/min/max/reduce return Optional.
- flatMap(Optional::stream) Java 9.
- orElseThrow with a message in tests.

**Code**

```java
WebElement el = elements.stream().filter(WebElement::isDisplayed)
        .findFirst().orElseThrow(() -> new AssertionError("none visible"));
```

**One-liner** — Stream short-circuit ops return Optional; chain `orElseThrow`/`flatMap(Optional::stream)` — never blind `get()`.

### Q6. Collectors: `groupingBy`, `partitioningBy`, `toMap`, `joining` — group test results by status

**Interview answer** — Collectors are recipes for `collect`. `groupingBy(TestResult::status)` → `Map<String, List<TestResult>>`. `partitioningBy(r -> "FAIL".equals(r.status()))` → `Map<Boolean, List<...>>`. `toMap(key, value, merge)` needs a merge function when keys collide. `joining(",")` builds a String. Downstream collectors: `groupingBy(status, counting())`, `groupingBy(page, mapping(TestResult::name, toSet()))`. This is how I build a failure digest in a listener without nested loops.

**Deep dive** — `groupingBy` is not concurrent; `groupingByConcurrent` requires parallel and yields a ConcurrentHashMap without encounter order. `toMap` throws `IllegalStateException` on duplicate keys without a merge. `toUnmodifiableMap` (Java 10) / `toList()` unmodifiable. `teeing` (Java 12) combines two collectors — e.g. count and average duration. `filtering` / `flatMapping` downstream collectors (Java 9) keep grouping readable. For Allure summaries, `groupingBy(status, mapping(TestResult::name, joining(", ")))` is one pipeline.

**Code**

```java
Map<String, List<TestResult>> byStatus = results.stream()
        .collect(Collectors.groupingBy(TestResult::status));

Map<Boolean, List<TestResult>> passFail = results.stream()
        .collect(Collectors.partitioningBy(r -> r.status().equals("PASS")));

Map<String, Long> failsByPage = results.stream()
        .filter(r -> r.status().equals("FAIL"))
        .collect(Collectors.groupingBy(TestResult::page, Collectors.counting()));

Map<String, TestResult> lastByName = results.stream()
        .collect(Collectors.toMap(TestResult::name, r -> r, (a, b) -> b, LinkedHashMap::new));

String names = results.stream().map(TestResult::name).collect(Collectors.joining(", ", "[", "]"));
```

**Follow-ups & traps**

- Trap: `toMap` without merge when two tests share a name.
- `groupingBy` classifier returning null — NPE.
- Mutating lists inside `groupingBy` from another thread — use CHM aggregator instead.


- groupingBy status; partitioningBy pass/fail; toMap with merge; joining names.
- Duplicate keys on toMap throw without a merge function.
- Null classifier NPE.

**Code**

```java
Map<Boolean, List<TestResult>> pf = results.stream()
        .collect(Collectors.partitioningBy(r -> r.status().equals("PASS")));
```

**One-liner** — `groupingBy` status/page, `partitioningBy` pass/fail, `toMap` with a merge, `joining` for a digest — collectors are the report layer of streams.

### Q7. Interface default/static methods — impact on framework interfaces

**Interview answer** — Default methods let you add behavior to an interface without breaking implementors (`DriverFactory.createHeadless` in the OOP file). Static methods on interfaces are namespaced helpers (`WaitUtils` could be `Waits.untilClickable` on the interface). For frameworks this means you can evolve `ApiClient` without touching every mock. Cost: the diamond problem — two interfaces with the same default method force an override. Keep defaults small; if they need fields, you wanted an abstract class or a companion utility.

**Deep dive** — `invokeinterface` / default methods live in the interface's class file (`public` instance methods with a body). Implementors can override. `super` call: `DriverFactory.super.createHeadless()`. Private methods in interfaces (Java 9) help default methods share code. Test doubles: a mock of an interface with defaults uses the mock's stubbing, not the default, unless you `CALLS_REAL_METHODS` (Mockito) — know that trap. Adding a default `screenshot()` to `Page` that every page inherits can hide missing overrides. Prefer a small `Screenshots` helper if the default would need a driver field.

**Code**

```java
public interface ApiClient {
    Response get(String path);

    default Response getRequired(String path) {
        Response r = get(path);
        if (r.statusCode() >= 400) throw new FrameworkException("GET " + path + " -> " + r.statusCode());
        return r;
    }

    static ApiClient restAssured(String base) {
        return path -> given().baseUri(base).get(path);
    }
}
```

**Follow-ups & traps**

- Trap: adding a default that calls `this` methods in a cycle.
- Abstract class vs default: state vs evolution of API.
- Mockito + defaults: unexpected no-ops if not stubbed.


- Default methods evolve DriverFactory without breaking Chrome/Firefox impls.
- Diamond defaults require an override.
- Mockito may not call defaults unless CALLS_REAL_METHODS.

**Code**

```java
default WebDriver createHeadless(Browser b) { return create(b, headlessCaps()); }
```

**One-liner** — Default methods evolve framework interfaces without breaking pages/clients; static interface methods are helpers — overrides required if two defaults collide.

### Q8. `var`, records, sealed classes, pattern matching switch (Java 17–21 highlights interviewers mention)

**Interview answer** — `var` (Java 10) infers locals (OOP Q12). Records (Java 16) are immutable POJOs (OOP Q13). Sealed classes/interfaces (Java 17) restrict which types may extend/implement — a `Browser` sealed type with permitted `LocalBrowser` and `RemoteBrowser` makes switches exhaustive. Pattern matching for `instanceof` (Java 16) removes casts; pattern matching `switch` is finalized in **Java 21** (preview in 17–20 — don't claim it is production on 17 without `--enable-preview`). I use records daily, sealed for closed driver hierarchies, switch patterns when on 21.

**Deep dive** — Sealed: `sealed interface DriverFactory permits Local, Grid, Sauce {}` — all permits in the same module/package (or explicitly accessible). Switch on sealed types without `default` is exhaustive; adding a permit breaks compilation — that is the point. Java 21: `switch (status) { case "PASS" -> ...; case "FAIL", "SKIP" -> ...; }`, record patterns `case OrderResponse(String id, String status, _)`. Null in switch: `case null ->` in 21. Don't rewrite a working if-else in an interview unless they ask for 21.

**Code**

```java
public sealed interface WebDriverSource permits LocalSource, GridSource {
    WebDriver create();
}

public record LocalSource(Browser browser) implements WebDriverSource {
    @Override public WebDriver create() { return browser.create(); }
}

public record GridSource(URI hub, Browser browser) implements WebDriverSource {
    @Override public WebDriver create() { /* RemoteWebDriver */ throw new UnsupportedOperationException(); }
}

static String label(WebDriverSource src) {
    return switch (src) { // Java 21 exhaustive
        case LocalSource(Browser b) -> "local " + b;
        case GridSource(URI hub, Browser b) -> "grid " + hub + " " + b;
    };
}

if (page instanceof LoginPage login) {
    login.login("u", "p"); // pattern matching instanceof (16+)
}
```

**Follow-ups & traps**

- Trap: saying switch patterns are final in Java 17 — they are preview; 21 is the safe line.
- Sealed + mocks: extra permit or non-sealed for a test fake.
- Records vs Lombok — language-level, prefer records on 17+.

**Senior/lead angle** — Adopt records immediately; adopt sealed+switch when the team is on 21 and the hierarchy is truly closed (browsers, result statuses). Don't sealed-ify Page objects.

**One-liner** — var for obvious locals, records for DTOs, sealed for closed hierarchies, pattern-switch on 21 — know which language level made each final.

### Q9. HttpClient (Java 11) vs Rest Assured

**Interview answer** — `java.net.http.HttpClient` is the JDK HTTP/1.1 and HTTP/2 client: fluent builder, `send`/`sendAsync`, `BodyHandlers`, HTTP/2 multiplex, no JSON binding. Rest Assured is a testing DSL: `given/when/then`, JSON path, Hamcrest/AssertJ-friendly status/body asserts, filters, OAuth helpers, easy POJO `body()`. I use Rest Assured in API tests and as setup for UI tests. I use HttpClient when I want zero extra deps (a tiny health-check in a library) or async HTTP/2 fan-out. They can coexist: HttpClient for a custom transport, Rest Assured for assertions — usually Rest Assured alone is enough.

**Deep dive** — HttpClient is immutable and thread-safe; `HttpRequest` is immutable. You still write JSON with Jackson yourself. Timeouts: `connectTimeout` on client, `timeout` on request. Redirects configurable. Rest Assured 5.x still defaults to Apache/HTTP URL connection under the hood depending on config; it is not "worse HTTP," it is a test wrapper. WireMock + Rest Assured is the common local stack. Don't invent an assertion layer on HttpClient that Rest Assured already is. HttpClient `sendAsync` + `thenApply` is CompletableFuture-shaped; still parse JSON yourself. Rest Assured `RequestSpecification` is mutable — copy per thread (concurrency Q5). Use HttpClient for a framework health ping with zero test DSL.

**Code**

```java
HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();
HttpRequest req = HttpRequest.newBuilder(URI.create(Env.current().baseUrl() + "/health"))
        .timeout(Duration.ofSeconds(5))
        .GET()
        .build();
HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
if (res.statusCode() != 200) throw new FrameworkException("health " + res.statusCode());

given().baseUri(Env.current().baseUrl())
       .when().get("/orders/{id}", id)
       .then().statusCode(200)
       .body("status", equalTo("PAID"));
```

**Follow-ups & traps**

- Trap: "HttpClient replaced Rest Assured" — different jobs.
- HttpClient does not follow a test-oriented given/then; you will reimplement JSONPath poorly.
- `sendAsync` + virtual threads (21) is a valid API-load sketch; still not UI.


- HttpClient = JDK transport; Rest Assured = test DSL + JSON asserts.
- Don't reimplement JSONPath on HttpClient.
- HttpClient is thread-safe; Rest Assured statics are not.

**Code**

```java
HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
given().when().get("/orders/{id}", id).then().statusCode(200);
```

**One-liner** — HttpClient is the JDK transport; Rest Assured is the API-testing DSL with JSON asserts — use Rest Assured in SDET suites unless you need a dependency-free client.

### Q10. Modules (JPMS) — awareness only, most test frameworks don't bother

**Interview answer** — Java 9 modules (`module-info.java`) declare `requires`/`exports`/`opens`. The JDK itself is modular (`java.base`). Most Maven test frameworks live on the **classpath** (unnamed module) and never write `module-info`. You hit JPMS when a library `requires` something you didn't, or when reflection (Jackson, TestNG, Mockito) needs `opens com.acme.pages to jackson.databind`. I would not modularize a test framework unless the org already ships a modular product.

**Deep dive** — Split packages (same package in two jars) fail on the module path. `jlink` custom runtimes are a product topic. Surefire can run on module path; it is extra config for little gain. `opens` is the reflection escape hatch. Interviewer asking this is checking you know it exists and that Selenium tests aren't blocked on it. `--add-opens java.base/java.lang=ALL-UNNAMED` shows up when Mockito/Byte Buddy hits a strong JDK encapsulation; that is a JVM arg, not a reason to write `module-info`. Most SDET repos stay unnamed-module/classpath.

**Code**

```java
// module-info.java — rarely in a test repo
module com.acme.framework {
    requires org.openqa.selenium.chrome;
    requires io.restassured;
    exports com.acme.framework.pages;
    opens com.acme.framework.api to com.fasterxml.jackson.databind;
}
```

**Follow-ups & traps**

- Trap: a 10-minute JPMS lecture in an SDET loop — awareness, then "we use the classpath."
- `IllegalAccessError` on reflection — `--add-opens` JVM arg as a pragmatic CI fix.


- Classpath unnamed module is the SDET default.
- opens for Jackson/Mockito reflection.
- --add-opens as a CI hammer, not a framework design.

**Code**

```java
// module-info.java is optional; most test jars never add one
```

**Senior/lead angle** — Stay on the classpath until a product module-info forces `opens`; don't modularize the test JAR for fashion.

**One-liner** — JPMS is `module-info` requires/exports/opens; SDET suites almost always stay on the classpath and only add `opens` when Jackson/Mockito hit a wall.

### Q11. Writing a fluent wait using lambdas

**Interview answer** — A fluent wait polls a function until it returns a non-null/non-false value or the timeout expires, ignoring specified exceptions while polling. Selenium `FluentWait` is that engine; the lambda is the condition. I set timeout, polling interval, ignored exceptions (`NoSuchElementException`, `StaleElementReferenceException`), and a timeout message. I do **not** `Thread.sleep`. Custom waits for "API until 200" use the same shape with Rest Assured inside the function.

**Deep dive** — `until` throws `TimeoutException` wrapping the last exception. Returning `null` or `false` means "keep polling"; any other value succeeds. Don't put assertions that throw `AssertionError` inside unless you ignore that too — better to return boolean. Clock is injectable in Selenium 4 for tests of the wait itself. Nested waits (wait inside wait) multiply timeouts — a flake source.

**Code**

```java
public final class Waits {
    private Waits() {}

    public static WebElement clickable(WebDriver driver, By by, Duration timeout) {
        return new FluentWait<>(driver)
                .withTimeout(timeout)
                .pollingEvery(Duration.ofMillis(250))
                .ignoring(NoSuchElementException.class, StaleElementReferenceException.class)
                .withMessage(() -> "not clickable: " + by)
                .until(ExpectedConditions.elementToBeClickable(by));
    }

    public static void untilJson(Supplier<Response> call, Predicate<Response> ok, Duration timeout) {
        new FluentWait<>(call)
                .withTimeout(timeout)
                .pollingEvery(Duration.ofSeconds(1))
                .ignoring(Exception.class)
                .until(supplier -> {
                    Response r = supplier.get();
                    return ok.test(r) ? r : null;
                });
    }
}

Waits.untilJson(
        () -> given().get("/jobs/" + id),
        r -> "DONE".equals(r.jsonPath().getString("status")),
        Duration.ofSeconds(30));
```

**Follow-ups & traps**

- Trap: `Thread.sleep(5000)` "because FluentWait is complicated."
- Polling too fast against a rate-limited API.
- Ignoring `Exception` on UI waits can hide `NullPointerException` in the lambda — be specific.

**One-liner** — FluentWait polls a lambda until a non-null/non-false result; ignore stale/not-found, set a message — never sleep, and reuse it for JSON status too.

### Q12. Common stream interview snippets: first duplicate, frequency map, sort objects, flatten

**Interview answer** — These are the whiteboard stream versions of the coding file. First duplicate: a `Set` add in `filter`/`filterNot` or two-pass. Frequency: `groupingBy(Function.identity(), counting())`. Sort objects: `sorted(Comparator.comparing(...))`. Flatten: `flatMap(list -> list.stream())` or `flatMap(Collection::stream)`. I can write the loop form too — interviewers often say "now without streams."

**Deep dive** — Streams can be slower and harder to debug on a whiteboard; say complexity: frequency O(n), sort O(n log n), flatten O(n). Stateful `filter` with a captured `Set` is a side-effect in an intermediate op — legal but ugly; a loop is clearer for first-duplicate. `flatMap` on `null` NPE — filter first.

**Code**

```java
static <T> Optional<T> firstDuplicate(List<T> items) {
    Set<T> seen = new HashSet<>();
    return items.stream().filter(x -> !seen.add(x)).findFirst();
}

static Map<String, Long> frequency(List<String> words) {
    return words.stream().collect(Collectors.groupingBy(w -> w, Collectors.counting()));
}

static List<TestResult> byDurationDesc(List<TestResult> results) {
    return results.stream()
            .sorted(Comparator.comparingLong(TestResult::durationMs).reversed())
            .toList();
}

static List<String> flatten(List<List<String>> nested) {
    return nested.stream().flatMap(List::stream).toList();
}

// tags from each test
List<String> allTags = results.stream()
        .flatMap(r -> r.tags().stream())
        .distinct()
        .toList();
```

**Follow-ups & traps**

- "Do it without streams" — coding file Q4/Q11/Q13.
- `groupingBy` vs `toMap` for frequency — groupingBy+counting is the idiom.
- Side-effecting `seen.add` in `filter` — mention it; some interviewers dislike it.

**One-liner** — Frequency is groupingBy+counting, flatten is flatMap, sort is Comparator, first duplicate is a Set — and be ready to rewrite each as a loop.
