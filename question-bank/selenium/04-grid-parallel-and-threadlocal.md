# Grid, Parallel Execution & ThreadLocal WebDriver

This is the flagship Selenium-at-scale file. Interviewers who have been burned by a static `WebDriver` in TestNG parallel will stay on ThreadLocal until you can write a factory, explain slot leaks, and contrast Grid 4's Router/Distributor/Session Queue with the old Hub/Node cartoon. Answers assume Selenium Grid 4.x, Java 17, TestNG, and ChromeOptions — never DesiredCapabilities.

- Q1. Selenium Grid 4 architecture — Router, Distributor, Session Queue, Session Map, Event Bus, Nodes.
- Q2. Standalone vs hub-node vs fully distributed Grid; Docker; vs cloud vs Playwright.
- Q3. Multiple browsers simultaneously via Grid — RemoteWebDriver + TestNG parallel.
- Q4. Challenges of parallel multi-browser execution.
- Q5. ThreadLocal WebDriver — why static is broken; full DriverFactory.
- Q6. Why Singleton WebDriver is an anti-pattern (and when Singleton Config is fine).
- Q7. TestNG parallel: methods vs classes vs tests; thread-count; data-provider-thread-count.
- Q8. What happens if you forget to quit() in a parallel Grid run?
- Q9. Session request timeout, idle timeout, browser timeout on Grid.
- Q10. Video recording and screenshots in Grid/Docker.
- Q11. Debugging a test that only fails on Grid/headless.
- Q12. Selenium Docker images and Dynamic Grid.
- Q13. Cross-browser differences that bite.
- Q14. Scaling Grid on Kubernetes.
- Q15. Observability of Grid 4 (GraphQL, session counts).
- Q16. DriverFactory for local, Grid, and cloud — Factory + Strategy.

### Q1. What is Selenium Grid 4 architecture? Router, Distributor, Session Queue, Session Map, Event Bus, Nodes. Hub/node mental model vs actual 4.x components.

**Interview answer** — Grid 4 is a set of cooperating services, not a single Hub process with XML. The **Router** is the HTTP entry point. New session requests go to the **Distributor** (or wait in the **New Session Queue** if no slot fits). The Distributor picks a **Node** slot that matches capabilities. The **Session Map** stores `sessionId → node URI` so subsequent clicks are routed to the right machine. The **Event Bus** is how these pieces talk asynchronously. **Nodes** actually launch Chrome/Firefox and own slots. The Hub/Node *mental model* is still useful — "a thing that accepts sessions" plus "things that run browsers" — but if you only say Hub in a 4.x interview you will be asked to name Router and Distributor.

**Deep dive** — Grid 3 Hub was a monolith: registration, matching, proxying, UI. It aged poorly (lost registrations, sticky sessions, XML). Grid 4 split along failure domains so you can scale and fail them independently.

**Router.** Every W3C call hits the Router. If the path is `POST /session` (new session), it forwards toward queue/distributor. If the path is `/session/{id}/element`, it looks up the Session Map and proxies to that Node. The test JVM never talks to the Node URL directly — if you hardcode a Node IP you have bypassed Grid and will lose the session on Node recycle.

**Distributor.** Capability matching (`browserName=chrome`, `browserVersion=131`, `platformName=linux`). It knows Node heartbeats and slot counts. It is the scheduler: *which* slot, not *how* Chrome starts. Matching is W3C firstMatch/alwaysMatch — overspecified `browserVersion=131.0.6778.69` against a Node advertising `131` is a common "why is my session queued" bug.

**New Session Queue.** When 80 TestNG threads hit 8 Chrome slots, 72 requests wait here until `session-request-timeout`. This is why "Grid is hung" is often "queue is full of Chrome requests and we asked for Safari." Queue fairness is roughly FIFO per stereotype, not TestNG priority.

**Session Map.** Persistence option (local, Redis) so a Router replica can find the Node. Stateless Routers *must* share a map; a local map plus two Routers is how clicks 404 after session create.

**Event Bus.** Local bus in standalone; Redis (or similar) in distributed mode. Node registration, health, session created/deleted. If the bus is down, Nodes look alive in `docker ps` but the Distributor never learns they exist.

**Nodes.** Advertise stereotypes (Chrome, Firefox, maxSessions). Each session consumes a slot. Dynamic Grid nodes start a *browser container* per session (Q12). Heartbeats: a Node that stops beating is drained; in-flight sessions die with `WebDriverException`.

Walk a click: TestNG `placeOrder.click()` → Java client `POST /session/abc/element/xyz/click` → Router → Session Map `abc → http://node-3:5555` → Node chromedriver → Chrome. New session is the only path that hits Distributor/Queue.

Hub/Node mapping you can say aloud: "Hub ≈ Router + Distributor + Queue + Session Map + Event Bus; Node ≈ Node." Fully distributed means those Hub pieces are separate processes/pods.

GraphQL on the Router (`/graphql`) is how the UI and your dashboards query sessions (Q15). There is no Grid 3 XML as the primary config; TOML/CLI flags/env vars configure 4.x. Standalone is `java -jar selenium-server-<version>.jar standalone`; distributed is one process per role with `--bind-bus` / `--publish-bus` pointing at the same bus.

**Follow-ups & traps**
- Trap: "Grid 4 is just Docker Hub + Node." Docker is how you deploy; the architecture is the components.
- "Where does chromedriver run?" — On the Node (or inside the Dynamic Grid browser container), not next to TestNG.
- "Is the Event Bus Kafka?" — Default is Selenium's own bus; Redis is the common distributed choice. Do not invent Kafka unless you built it.
- Grid 3 `register` JSON from nodes — 4.x nodes still register, but via the bus/distributor protocol.

**Senior/lead angle** — Draw the boxes in the interview. Then say which boxes you would replicate (Router, Distributor) and which you would scale out (Nodes). That is the K8s conversation (Q14) in miniature.

**One-liner** — Grid 4: Router in front, Distributor matches slots, Session Queue holds overflow, Session Map routes commands, Event Bus coordinates, Nodes run browsers — Hub/Node is the cartoon of that split.

### Q2. Standalone vs hub-node vs fully distributed Grid. Docker compose Grid. When to use Selenium Grid vs cloud (BrowserStack/Sauce) vs Playwright (no grid needed).

**Interview answer** — **Standalone** runs every Grid 4 component in one JVM (`java -jar selenium-server.jar standalone`) — fine for a laptop or a single CI agent sidecar. **Hub-node** (classic) is one "hub" process plus Node processes on other machines — in 4.x the hub is the combined Router/Distributor/Queue/Map. **Fully distributed** splits those hub pieces onto their own pods for HA. Docker Compose is the usual team Grid: `selenium/hub` + `selenium/node-chrome` + `node-firefox`. I pick Grid when we already run Java Selenium and need remote browsers we control; cloud vendors when we need Safari/real devices without ops; Playwright when a new suite can avoid Grid entirely because workers + shards replace the farm.

**Deep dive** — Decision table an interviewer wants.

| Need | Tool |
| --- | --- |
| 8 Chrome sessions for a Java TestNG suite tonight | Compose standalone or hub+node-chrome |
| HA, 200 sessions, multi-team | Distributed Grid on K8s or a cloud vendor |
| Safari + iOS | Cloud (or macOS nodes you must operate) |
| Version matrix 12 browsers | Cloud, unless you enjoy Node image sprawl |
| Greenfield TS tests | Playwright workers; no Selenium Grid |
| Existing 3,000 Selenium tests | Keep Grid or map `RemoteWebDriver` to cloud |

Cost: self-hosted Grid is cheap at high utilization and expensive in people (upgrades, zombies, video). Cloud is expensive at high minutes and cheap in ops. Hybrid is normal: Chrome/Linux on internal Grid, Safari on BrowserStack.

Playwright: `npx playwright test --shard` uses CI machines that already have browsers in the Playwright image. You *can* `connect()` to a Playwright server, but you do not need Selenium Grid. Selling Grid as "our universal browser layer" for Playwright is a mismatch.

Docker Compose sketch:

```yaml
services:
  hub:
    image: selenium/hub:4.27.0
    ports: ["4444:4444"]
  chrome:
    image: selenium/node-chrome:4.27.0
    shm_size: 2gb
    depends_on: [hub]
    environment:
      SE_EVENT_BUS_HOST: hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      SE_NODE_MAX_SESSIONS: 4
```

Pin the same Grid minor on hub and nodes. `shm_size: 2gb` or Chrome crashes in `/dev/shm`. Tests use `http://localhost:4444` (Grid 4) — `/wd/hub` still works as a compatibility prefix.

**Follow-ups & traps**
- Trap: "We need Grid for Playwright parallel." No.
- Standalone `maxSessions` vs machine RAM — Chrome is ~200–400MB+ per session; 16 sessions on 4GB RAM is a flake generator.
- Cloud capability names (`bstack:options`) vs Options — still ChromeOptions, not DesiredCapabilities.

**Senior/lead angle** — Write an ADR: Grid for Linux Chrome/Firefox at volume; cloud for long-tail browsers; do not duplicate both for the same Chrome 131 smoke. Meter cost per passing test.

**One-liner** — Standalone for one box, hub-node for a small farm, distributed for HA; Docker Compose is the default team Grid; cloud for Safari/devices; Playwright does not need Selenium Grid.

### Q3. How do you run tests on multiple browsers simultaneously via Grid? RemoteWebDriver + capabilities + TestNG parallel.

**Interview answer** — Each TestNG thread (or class, depending on parallel mode) asks the DriverFactory for a `RemoteWebDriver(gridUrl, options)` where `options` is `ChromeOptions` or `FirefoxOptions` for that thread's parameter. TestNG `parallel="tests"` or a `@Parameters("browser")` / `@Factory` / data provider supplies `"chrome"` vs `"firefox"`. Grid matches slots; two threads can hold Chrome and Firefox at once if Nodes advertise both. There is no Grid API that "runs the suite on all browsers" — the runner must open those sessions.

**Deep dive** — Two patterns:

1. **Suite XML tests:** `<test name="chrome">` and `<test name="firefox">` each with a parameter, `parallel="tests"`. Same classes, two browsers, two thread pools.
2. **Single test, data provider** `{chrome, firefox}` with `parallel=true` on the provider — true multi-browser *per method*, more ThreadLocal sensitive.

Never one static driver swapped from Chrome to Firefox. Each thread: create, use, quit.

W3C: `options.setPlatformName("linux")`, `options.setBrowserVersion("131")` when you need pins. Over-specifying version when Nodes only have `stable` causes queue timeout.

TestNG + Maven: `surefire parallel=methods threadCount=8` plus Grid `maxSessions`. If threadCount > slots, you wait in the session queue (good) or timeout (bad if request timeout is tight).

**Code**

```java
@Parameters("browser")
@BeforeMethod
public void openBrowser(String browser) throws Exception {
    ChromeOptions chrome = new ChromeOptions();
    chrome.addArguments("--headless=new", "--window-size=1920,1080");
    FirefoxOptions firefox = new FirefoxOptions();
    firefox.addArguments("-headless");
    URL grid = URI.create("http://grid.internal:4444").toURL();
    WebDriver driver = switch (browser) {
        case "chrome" -> new RemoteWebDriver(grid, chrome);
        case "firefox" -> new RemoteWebDriver(grid, firefox);
        default -> throw new IllegalArgumentException(browser);
    };
    DriverFactory.set(driver);
}

@Test
public void loginOnThisBrowser() {
    DriverFactory.get().get("https://shop.example.com/login");
    // ...
}
```

**Follow-ups & traps**
- Trap: DesiredCapabilities `browserName` bag instead of Options.
- Same test, two browsers, shared `order-id` — data isolation is still required.
- `/wd/hub` vs `/` on Grid 4 — both often work; 404 means wrong URL, not wrong Options.

**One-liner** — TestNG parallel threads each create `RemoteWebDriver(grid, ChromeOptions|FirefoxOptions)`; Grid only supplies slots, it does not multiplex one session across browsers.

### Q4. Challenges of parallel multi-browser execution (driver leaks, shared data, video/screenshot collisions, node capacity, session timeouts, version skew).

**Interview answer** — Parallel multi-browser fails for operational reasons more than locator reasons: WebDriver instances leaked (slots gone), tests sharing the same buyer account, screenshots named `shot.png`, Nodes oversubscribed, session idle timeouts killing a slow checkout, and Chrome 131 tests landing on a Node still on 128. I treat those as the design checklist, not surprises after the first Grid run.

**Deep dive** — **Driver leaks.** Exception in `@BeforeMethod` after `new RemoteWebDriver` but before storing ThreadLocal — `quit` never runs. `try/finally` in `@AfterMethod` must `get()` and quit if non-null. A listener `onFinish` is too late for method-parallel. Shutdown hook is last resort (Q8).

**Shared data.** Two Chrome threads checkout the last SKU. Unique users (`buyer-%s@example.com`.formatted(UUID)), reserved stock, or API-reset. Multi-browser doubles overlap time. A static `lastOrderId` field is a parallel bug even with ThreadLocal drivers.

**Artifact collisions.** `target/screenshot.png` and Allure attachments without test+thread+browser in the name. Video files on Dynamic Grid similarly — name by `sessionId`.

**Node capacity.** CPU steal in Docker makes explicit waits expire. Cap `SE_NODE_MAX_SESSIONS` to cores/2 empirically. Chrome 4 sessions on 1 vCPU is a TimeoutException factory, not a Grid bug.

**Timeouts.** See Q9. A 6-minute checkout with a 5-minute idle timeout dies with a connection error that looks like a flake.

**Version skew.** Client `selenium-java` 4.27 talking to Grid 4.14, or Chrome vs chromedriver on the Node. Pin image tags; never `node-chrome:latest` in production CI. Selenium Manager on the *test* JVM does not patch the Node's Chrome.

**Browser-specific waits.** Firefox slower on a widget — one timeout value may be wrong; prefer conditions over raising every wait to 60s. CDP-only login headers mean Firefox tests cannot run the same factory path (Q13).

**Reports.** TestNG XML + Allure must include the browser parameter or you cannot tell which engine failed. Session id in the log MDC lets you grep Node logs.

**Follow-ups & traps**
- Trap: "parallel is flaky so we set thread-count=1 on Grid." That hides leaks and data clashes.
- Logging: include session id from `RemoteWebDriver.getSessionId()` in failure reports to grep Node logs.
- Clock skew between test JVM and Node — rare, ugly for cookie expiry.

**Senior/lead angle** — A "Grid quality" dashboard: queue time, session create failures, leak count (sessions older than suite), flake by browser. Without that, teams only see TestNG red.

**One-liner** — Parallel Grid pain is leaks, shared users, colliding artifacts, oversubscribed nodes, idle timeouts, and version skew — not "Firefox can't click."

### Q5. ThreadLocal WebDriver — WHY a static WebDriver is broken under parallel TestNG; full DriverFactory with ThreadLocal<WebDriver>, get/set/unload; quit in afterMethod. Complete code.

**Interview answer** — A `static WebDriver driver` is one field for the whole JVM. TestNG parallel methods run on several threads; they all overwrite that field. Thread A logs in as buyer, Thread B replaces `driver` with a new session and opens `/admin`, Thread A's `findElement(email)` talks to the admin browser — or to a quit session. `ThreadLocal<WebDriver>` gives each thread its own slot: `set` in `@BeforeMethod`, `get` in pages, `remove` after `quit` in `@AfterMethod`. This is the most-asked Selenium parallel question in Java shops.

**Deep dive** — ThreadLocal is not magic isolation of *data*; it only isolates the driver reference. You still need unique users. It is not a pool: each `@BeforeMethod` should create a fresh session (or a carefully designed reuse policy you can defend). It is not inheritable across thread pools unless you use `InheritableThreadLocal` — and you should not, because TestNG's data-provider threads vs test threads are a famous footgun (Q7).

Rules:

1. `DriverFactory.get()` throws if null — fail loud when someone forgot `@BeforeMethod` or used a raw thread.
2. `quit` then `remove`. `quit` without `remove` leaves a dead driver in the thread if the pool reuses the thread (TestNG does). `remove` without `quit` leaks Grid slots.
3. Pages receive `WebDriver` from the constructor (`new LoginPage(DriverFactory.get())`) or a short `get()` — do not inject a WebElement cache.
4. Listeners call `DriverFactory.getOptional()` for screenshots because a failure in `@BeforeMethod` may have no driver.

Static `WebDriver` *works* with `parallel="false"`. That is why the bug appears "when we turned on parallel."

**Code**

```java
public final class DriverFactory {
    private static final ThreadLocal<WebDriver> DRIVERS = new ThreadLocal<>();

    private DriverFactory() {}

    public static void set(WebDriver driver) {
        DRIVERS.set(driver);
    }

    public static WebDriver get() {
        WebDriver driver = DRIVERS.get();
        if (driver == null) {
            throw new IllegalStateException("WebDriver is not set for thread " + Thread.currentThread().threadId());
        }
        return driver;
    }

    public static Optional<WebDriver> getOptional() {
        return Optional.ofNullable(DRIVERS.get());
    }

    public static void unload() {
        WebDriver driver = DRIVERS.get();
        if (driver != null) {
            try {
                driver.quit();
            } finally {
                DRIVERS.remove();
            }
        }
    }
}

public abstract class BaseTest {
    @Parameters({"browser", "gridUrl"})
    @BeforeMethod(alwaysRun = true)
    public void startSession(String browser, String gridUrl) throws Exception {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new", "--window-size=1920,1080");
        WebDriver driver = "local".equals(gridUrl)
                ? new ChromeDriver(options)
                : new RemoteWebDriver(URI.create(gridUrl).toURL(), options);
        DriverFactory.set(driver);
    }

    @AfterMethod(alwaysRun = true)
    public void stopSession() {
        DriverFactory.unload();
    }
}

public class CheckoutTest extends BaseTest {
    @Test
    public void placeOrder() {
        WebDriver driver = DriverFactory.get();
        new LoginPage(driver).login("buyer@example.com", "secret");
        new CartPage(driver).placeOrder();
    }
}
```

**Follow-ups & traps**
- Trap: `static ChromeDriver` "because we only use Chrome." Still one instance.
- `InheritableThreadLocal` to "fix" data providers — usually duplicates sessions; prefer `parallel=false` on the provider or create the driver in the test method.
- `get()` in a `@BeforeSuite` — suite is one thread; methods are others. Driver would not be visible. Session per method (or per class if you accept coupling).
- Playwright-java analogy: same ThreadLocal story because PW objects are not thread-safe.

**Senior/lead angle** — This factory is infrastructure. Code review rejects `new ChromeDriver()` in a test class. ArchUnit tests can enforce it.

**One-liner** — Static WebDriver is shared across TestNG threads; `ThreadLocal` plus `set`/`get`/`quit+remove` in before/after method is the parallel-safe lifecycle.

### Q6. Why Singleton WebDriver is an anti-pattern in parallel suites (and when a Singleton Config reader is fine).

**Interview answer** — A Singleton `DriverManager.getInstance().getDriver()` is a single JVM-wide instance by definition. Under parallel TestNG it is the static WebDriver bug with a design-pattern costume. Singleton *is* fine for immutable configuration (`baseUrl`, `gridUrl`, timeouts) loaded once from env/files — many threads reading a `record AppConfig` is safe. Mutable singleton state (current user, last order id, the driver) is not.

**Deep dive** — Interviewers who just learned Singleton will put WebDriver in it because "one browser." In serial mode it even works. The anti-pattern is: hidden global, hard to reset, `quit` in one test kills others, and it fights TestNG's thread model.

Double-checked locking around `new ChromeDriver()` is still one driver.

When Singleton Config is fine: `AppConfig.fromEnv()` cached in a `static volatile` or enum singleton, all fields `final`. No setters. Secrets from env, not from a mutable map that tests write to.

ThreadLocal *inside* a class named `DriverSingleton` is a naming lie — call it `DriverFactory`. Honesty in names is part of the answer.

**Code**

```java
public record AppConfig(String baseUrl, String gridUrl, boolean headless, Duration explicitWait) {
    private static final AppConfig INSTANCE = load();

    public static AppConfig get() {
        return INSTANCE;
    }

    private static AppConfig load() {
        return new AppConfig(
                System.getenv().getOrDefault("BASE_URL", "https://shop.example.com"),
                System.getenv().getOrDefault("GRID_URL", "local"),
                Boolean.parseBoolean(System.getenv().getOrDefault("HEADLESS", "true")),
                Duration.ofSeconds(15));
    }
}
```

**Follow-ups & traps**
- Trap: "Singleton with synchronized getDriver() that creates per thread." That is a factory; you have reinvented ThreadLocal poorly.
- Spring `@Scope("prototype")` beans for pages + a ThreadLocal driver is fine; a singleton Spring bean holding WebDriver is not.

**One-liner** — Singleton WebDriver is a global session and breaks parallel; Singleton immutable config is fine.

### Q7. TestNG parallel: methods vs classes vs tests; thread-count; data-provider-thread-count; how it maps to ThreadLocal.

**Interview answer** — `parallel="methods"` runs `@Test` methods of a class on multiple threads — ThreadLocal driver *must* be per-method (`@BeforeMethod`). `parallel="classes"` gives one thread per class — `@BeforeClass` driver is tempting but still couples tests in the class. `parallel="tests"` parallelizes `<test>` tags in suite XML (the multi-browser pattern). `thread-count` is the pool size. `data-provider-thread-count` is a *separate* pool for `@DataProvider(parallel=true)` — those threads are not the test threads, so a driver created in the provider is the wrong ThreadLocal.

**Deep dive** — Mapping:

| parallel | Driver lifecycle | Risk |
| --- | --- | --- |
| false | BeforeClass ok | Slow |
| methods | BeforeMethod + ThreadLocal | Default for speed; isolation required |
| classes | BeforeClass + ThreadLocal still safer | Shared browser within class |
| tests | Per `<test>` | Good for browser matrix |

`thread-count="8"` vs Grid slots 4: session queue. `thread-count="32"` vs 4-core Node: death.

Data providers: `Object[][]` rows can run in parallel with `data-provider-thread-count`. If `@BeforeMethod` still runs on the *test* thread, you are fine — the provider should return data, not a WebDriver. If someone creates a driver in the provider to "prefetch," ThreadLocal is on the provider thread and `get()` in the test is null.

`alwaysRun = true` on AfterMethod so skipped/failed tests still quit.

Surefire: `<parallel>methods</parallel><threadCount>8</threadCount>` must agree with suite XML or you will debug the wrong knob. Canonical: Surefire only points at XML (framework file Q5).

```xml
<suite name="shop" parallel="methods" thread-count="8" data-provider-thread-count="4">
  <test name="chrome-checkout">
    <parameter name="browser" value="chrome"/>
    <classes>
      <class name="com.shop.qa.tests.checkout.PlaceOrderTest"/>
    </classes>
  </test>
</suite>
```

`parallel="tests"` with two `<test>` tags (chrome/firefox) is how you run both browsers without a Factory. Each `<test>` can have its own `thread-count` via nested suites if you must cap Safari at 2 and Chrome at 8.

`@BeforeClass` + `parallel="methods"` is the classic "I thought ThreadLocal would save a class-level driver" bug: BeforeClass runs on one thread, methods on others, `get()` is null or races.

**Follow-ups & traps**
- Trap: `parallel=methods` + `@BeforeClass` driver. Methods share and stomp.
- `dependsOnMethods` plus parallel — TestNG serializes those; still a smell (framework file).
- "thread-count is Grid maxSessions" — no, two different ceilings.

**One-liner** — methods ⇒ `@BeforeMethod` ThreadLocal; classes ⇒ one thread per class; tests ⇒ suite XML slots; never create the driver on a data-provider thread.

### Q8. What happens if you forget to quit() in a parallel Grid run? (node slot leak, suite hang)

**Interview answer** — The session stays alive on the Node until Grid's idle/session timeout. That slot cannot be given to another test. Under parallel, leaked sessions accumulate until every slot is busy with zombies; new tests sit in the Session Queue and then fail with session-request timeout. The suite "hangs" or mass-fails at the end. Locally you also leak Chrome processes until the machine dies. `close()` is not enough if other tabs remain; `quit()` ends the session.

**Deep dive** — `quit` sends `DELETE /session/{id}`. Without it, the Node believes the test is still thinking. Timeline on an 8-slot Node: 8 leaked sessions from a BeforeMethod that threw after `new RemoteWebDriver` but before `set()` so AfterMethod saw null; the next 200 tests sit in the Session Queue; at `session-request-timeout` they fail with `SessionNotCreatedException` / "Could not start a new session"; Slack says "Grid is down." GraphQL still shows 8 sessions with old `startTime`. Idle timeout (Q9) is the only automatic reaper.

A crashed test JVM leaks until that timeout. `alwaysRun` AfterMethod plus a JVM shutdown hook (`Runtime.getRuntime().addShutdownHook`) are belt and suspenders — the hook is last resort, not the primary, and it cannot run if `kill -9`.

Detect leaks: GraphQL session count after a suite should return to zero. Alert if sessions older than 2× your longest test. Log `RemoteWebDriver.getSessionId()` at start and in AfterMethod.

`quit` in a listener `onFinish` is too late for per-method parallel — slots stay held for the whole class/suite.

Exception during `quit` (node already killed the session): catch, still `ThreadLocal.remove()`, do not fail the teardown so later tests still run — log the session id.

`close()` vs `quit()`: `close` the current window; if a `_blank` tab remains, the session lives. Always `quit` in teardown.

**Follow-ups & traps**
- Trap: "Grid GC will clean immediately." Only after timeout.
- `close()` on the last window — some drivers end the session, some leave a zombie. Always `quit`.
- Debugger disconnect — same leak; timeout is your friend.

**One-liner** — Forgotten `quit()` holds a Node slot until idle timeout; in parallel that exhausts Grid and queues the rest of the suite to death.

### Q9. Session request timeout, idle timeout, browser timeout on Grid.

**Interview answer** — **Session request timeout** is how long a new `POST /session` waits in the queue for a matching slot — too short and bursts fail; too long and CI sits red-looking for 10 minutes. **Session/idle timeout** is how long an *established* session can go without a command before Grid kills it — too short kills slow explicit waits and manual debug; too long delays leak recovery. **Browser timeout** (node-side) is how long the Node waits for the browser/driver to respond to a command. I set them deliberately and quote them in the runbook, not leave image defaults unknown.

**Deep dive** — Names vary slightly across 4.x flags (`--session-request-timeout`, `--session-timeout`, `SE_SESSION_REQUEST_TIMEOUT`, `SE_NODE_SESSION_TIMEOUT`, `SE_NODE_BROWSER_TIMEOUT`). Speak in concepts if you forget a flag; know the three clocks.

Request timeout vs TestNG: if thread-count is 20 and slots are 4, naive queue wait is on the order of `(20/4 - 1) × avg test time`. Request timeout must exceed that tail, or you should lower thread-count. Symptom: `Could not start a new session` after a clean 300s — that is the request clock, not Chrome.

Idle timeout vs `Thread.sleep(300000)` in a debug test — the session dies mid-sleep. Explicit wait of 60s with polling still sends commands; idle clock resets. A breakpoint in the test JVM sends *nothing* — idle timeout fires. That is why "it dies when I debug against Grid" happens. Fix: raise idle for a debug Grid, or debug locally.

Browser timeout vs hung Chrome: chromedriver does not return (renderer crash, infinite dialog); Node aborts. Looks like `WebDriverException` / `timeout` in the client. Distinct from `pageLoadTimeout` on the Java driver — two layers; the shorter one wins.

Example starting points to quote, then measure: request 300s, session idle 600s, browser 180s, TestNG method 300s. Cloud vendors add a fourth billed-minute clock.

**Follow-ups & traps**
- Trap: raising every TestNG timeout to 1 hour instead of fixing queue capacity.
- Cloud vendors have their own idle minutes — a separate bill and a separate clock.
- pageLoadTimeout in the client vs Grid browser timeout — two layers; the shorter one wins in practice.

**Senior/lead angle** — Publish: request 5m, session idle 10m, browser 3m, max test 5m. Align TestNG method timeout with session idle so tests fail in the runner first with a stacktrace, not as a dropped socket.

**One-liner** — Request timeout bounds queue wait for a slot; idle timeout kills silent sessions (leaks and debug pauses); browser timeout kills hung drivers — set all three on purpose.

### Q10. Video recording and screenshots in Grid/Docker (sidecar, Dynamic Grid, cloud vendor recordings).

**Interview answer** — Screenshots are pulled by the test via `TakesScreenshot` over WebDriver — they land on the CI agent. Video is not a W3C command; you need a Grid/Docker sidecar (ffmpeg watching the Xvfb display), Dynamic Grid's video sidecar option, or a cloud vendor's session recording URL. I never `Robot.createScreenCapture` on the Jenkins agent — that is the wrong screen.

**Deep dive** — Selenium Docker images expose `SE_RECORD_VIDEO` / a video sidecar that records the Node's Xvfb display. Files write to a shared volume (`/videos`). Name them by session id (`((RemoteWebDriver) driver).getSessionId()`) in the TestNG reporter or you cannot match a method to an mp4. Enable via env on the Node (`SE_RECORD_VIDEO=true`, `SE_VIDEO_FILE_NAME=auto`) — exact keys evolve; the interview point is *sidecar on the Node*, not FFmpeg on Jenkins.

Dynamic Grid: browser container + optional video container per session. Costly (CPU + disk); enable on failure only if the platform supports it, or sample 10% of jobs. Headless-new may not paint a display the sidecar can grab — many teams run headed-in-Xvfb when video is required.

Cloud: BrowserStack/Sauce give a dashboard link if you set the build/session name in Options (`bstack:options`, `sauce:options`). That is often better video than self-hosted. Put `sessionName = testMethod` so the vendor UI is searchable.

Screenshots in parallel: ThreadLocal driver + unique paths (waits file Q12). Video + screenshot + browser console on failure is the gold set; video-on-green is storage waste. PII: checkout video with real PANs is a compliance incident — test cards only.

**Follow-ups & traps**
- Trap: expecting `TakesScreenshot` to return a video.
- Headless: some video stacks need a virtual framebuffer (`--headless=new` may still be recordable via other means; confirm the image docs). If video is required, headed-in-Xvfb is the traditional Node.
- PII in video — checkout with real cards is a compliance issue; use test PANs and redaction policy.

**One-liner** — Screenshots travel over WebDriver; video comes from a Node sidecar, Dynamic Grid, or the cloud dashboard — never from the CI agent's desktop.

### Q11. How do you debug a test that only fails on Grid/headless?

**Interview answer** — I assume environment delta, not a random locator ghost. Checklist: window size (headless default is not 1920×1080), timing (Grid RTT + slower Nodes), download paths on the Node, clipboard/native dialogs, missing fonts, timezone, blocked third-parties, `navigator.webdriver`, and overlay differences. I reproduce with the same Options (`--headless=new --window-size=1920,1080`) locally, then against Grid with video/screenshot/browser logs, and I log `sessionId` + Node URI if GraphQL gives it.

**Deep dive** — **Resolution.** A sticky Place Order button covered on 800×600. Fix Options, not the locator.

**Timing.** Each command pays RTT to Grid. Tight `FluentWait` 2s that passed locally fails. Conditions should wait for the *app*, with timeouts budgeted for remote.

**Downloads/uploads.** LocalFileDetector, Node path vs agent path.

**Clipboard / OS dialogs / Robot.** Do not exist on the Node the way they do on a laptop.

**Headless new vs old.** Rendering and download differences. Pin `--headless=new`.

**GPU / canvas.** `--disable-gpu` myths; sometimes you need headed Xvfb for a map widget.

**IPv6 / localhost.** `localhost` on the Node is the Node, not the app on the agent's `localhost`. App URL must be reachable *from the Node* (`host.docker.internal`, staging URL).

**Cookies Secure/SameSite** on `http://grid-internal-app`.

Reproduce order: (1) local headed same size, (2) local headless, (3) Grid with one thread, (4) Grid parallel. That isolates the dimension.

**Follow-ups & traps**
- Trap: "Grid is flaky" as a root cause.
- Adding `Thread.sleep(5000)` only on CI via `if (grid)` — hides the wait gap.
- File URIs (`file://`) on the Node — file not there.

**One-liner** — Match window size and Options first, then path/RTT/native-dialog deltas; reproduce headless locally before blaming Grid.

### Q12. Selenium Docker images and Dynamic Grid (node browsers on demand).

**Interview answer** — Official `selenium/standalone-chrome`, `selenium/hub`, `selenium/node-chrome` (and firefox/edge) are the maintained images. You pin a tag that pairs Grid version, browser, and driver. **Dynamic Grid** (`node-docker`) does not keep a warm Chrome on the Node; on each session it starts a browser container (and optionally video), then tears it down. That is elastic and slower on cold start, excellent for mixed Chrome/Firefox without idle RAM.

**Deep dive** — Standalone image (`selenium/standalone-chrome:4.x`): all Grid 4 components + one browser. Simple CI service, one slot stereotype unless you use standalone with multiple browsers (uncommon).

Hub + N `node-chrome` / `node-firefox`: warm slots, fast session create, idle RAM cost. Scale by replica count. Hub is `selenium/hub`; nodes need `SE_EVENT_BUS_HOST`.

Dynamic Grid (`selenium/node-docker`): the Node does not keep a warm Chrome. On `POST /session` it starts `selenium/standalone-chrome:<tag>` (or firefox/edge) as a sibling container, optionally with a video container, then tears it down. Stereotypes in a `config.toml` map capabilities → image. Isolation is better (dirty profile gone). Cold start is seconds, not milliseconds. Requires Docker socket mount (`/var/run/docker.sock`) or a Kubernetes driver — security review: that socket is root-equivalent.

`shm_size: 2gb` — Chrome crashes in tiny `/dev/shm`. `--disable-dev-shm-usage` is the other half.

Do not run as root-random with no memory limits; a runaway session OOMs the Node host. Pin tags (`4.27.0-20250202` style) so Monday's Chrome bump does not surprise you.

**Follow-ups & traps**
- Trap: `:latest` on Monday after a Chrome bump.
- Dynamic Grid + `LocalFileDetector` still required.
- Cannot use Dynamic Grid if the pipeline forbids Docker socket mount — then warm nodes or cloud.

**One-liner** — Pin official Selenium images for hub/nodes; Dynamic Grid boots a browser container per session for elasticity at the cost of start time and a Docker socket.

### Q13. Cross-browser differences that bite: Safari/WebKit file upload, Firefox headless downloads, Chromium-only CDP.

**Interview answer** — A "pass on Chrome" suite is not cross-browser. SafariDriver file upload and input[type=file] have long-standing holes — often cloud workarounds or skip. Firefox headless downloads need prefs that differ from Chrome and historically failed silently. CDP (`HasDevTools`, extra headers, performance logs) is Chromium-only; a login that *depends* on CDP headers will never run on Firefox/Safari. I tag tests `@chrome-only` when the hook is real, rather than failing the nightly on three browsers.

**Deep dive** — Safari: no true headless like Chrome, no CDP, stricter user-gesture rules, `input[type=file]` historically broken or cloud-workaround-only, `sendKeys` on contenteditable flaky. Real Safari means macOS hardware or a vendor. Playwright WebKit is **not** this checkbox.

Firefox: geckodriver, `-headless`, `about:config` prefs for download (`browser.download.dir`, `helperApps.neverAsk.saveToDisk`). Headless downloads have silently produced empty files. Hover/Actions differ. BiDi is comparatively strong — prefer BiDi for console logs if Firefox is in the matrix. `HasDevTools` will not cast.

Chrome/Edge: Chromium family. Edge still needs `EdgeOptions` and the Edge binary; copying `ChromeOptions` arguments usually works, vendor prefix `ms:` vs `goog:` for experimental options can bite.

Grid: a Node without Safari cannot satisfy `browserName=safari`; the request queues until **request timeout** — that looks like "Safari is slow." Check GraphQL stereotypes before adding a Safari `<test>`.

Tag CDP-dependent tests `@chrome-only` and exclude them from the Firefox XML rather than catching `ClassCastException` in a loop.

**Follow-ups & traps**
- Trap: `HasDevTools` cast on `RemoteWebDriver` Firefox.
- "WebKit = Safari" — Playwright WebKit is not SafariDriver. If the checkbox is Safari, you need Safari.
- Visual diffs without per-browser baselines.

**One-liner** — Safari uploads, Firefox downloads, and CDP are the usual cross-browser traps — do not build a core login path on Chromium-only APIs.

### Q14. How would you scale Grid on Kubernetes? (lead: autoscaling nodes, session queue, resource requests, ephemeral nodes)

**Interview answer** — I run Grid 4 distributed: Router + Distributor + Session Map + Event Bus (Redis) as a small HA control plane, and a Node Deployment/StatefulSet that autoscales on session queue depth or custom metrics (slots in use). Each Node pod has CPU/memory requests sized for `maxSessions × chrome RAM`, plus `emptyDir`/`shm`. Dynamic Grid or ephemeral Nodes (pod per session via KEDA/cluster-autoscaler) absorb spikes. Tests still point at one Router Service URL.

**Deep dive** — Control plane: 2 Routers behind a Service, Distributor (do not autoscale blindly — matching is centralized), Redis for Event Bus and Session Map. If Session Map is a local file, two Routers cannot route clicks after create.

Nodes: a Deployment of `selenium/node-chrome` with `HPA` on a Prometheus metric scraped from GraphQL (`sessionCount` / `slotCount` / queue depth). KEDA can scale on Redis queue length. Scale toward zero off hours if cold start is acceptable (Dynamic Grid or cluster-autoscaler + Node pods).

Resources: if you lie (`SE_NODE_MAX_SESSIONS=8` on 1 CPU / 2Gi), you get TimeoutException that looks like app flakes. Size `requests` ≈ `limits` for Chrome (rough starting point: 1 CPU and 2Gi per session, then measure). Mount `/dev/shm` as `emptyDir` medium Memory with 2Gi.

Network: Nodes must reach the app (NetworkPolicy allow Node → staging). Ingress/Service exposes **Router 4444 only**; do not expose Node 5555 to tests. DNS: `grid.qa.svc.cluster.local:4444`.

Ephemeral: a CI Job that boots standalone Grid in the same pod namespace as the test Job is isolation for noisy teams, at the cost of cache warmth and slower start.

Rolling updates: a PodDisruptionBudget so you never drain all Nodes mid-suite. Drain Nodes (stop new sessions) before kill.

**Follow-ups & traps**
- Trap: one giant standalone pod with 50 Chrome processes.
- Session Map on local disk with 3 Router replicas — lost routing. Shared Redis/Postgres as documented.
- PDB so rolling updates do not drop all Nodes during a suite.

**Senior/lead angle** — Capacity plan: `slots = ceil(peak_parallel × (1 + queue_buffer))`. Cost vs BrowserStack at that slot count is the annual conversation.

**One-liner** — K8s Grid: HA Router/Distributor/Redis control plane, autoscaled Node pods sized for real Chrome RAM, queue-depth scaling, ephemeral browsers for spikes.

### Q15. Observability of Grid (GraphQL endpoint in Grid 4, session counts, dashboards).

**Interview answer** — Grid 4 exposes a GraphQL endpoint on the Router (default `http://localhost:4444/graphql`) that queries nodes, sessions, capabilities, and queue. The Grid UI uses it; we should too — Prometheus exporter or a small scrape job for `sessionCount`, `slotCount`, queue size, errors. Dashboards plus alerts on queue wait and zombie sessions (age > idle/2) are how you catch leaks before TestNG times out.

**Deep dive** — Example query (field names have evolved across 4.x minors; speak conceptually and verify against `/graphql`):

```graphql
{
  sessionsInfo { sessionId, start, capabilities, nodeId }
  nodesInfo { id, status, sessionCount, slotCount, stereotypes }
  grid { sessionCount, maxSession, totalSlots }
}
```

Pair with a TestNG listener that logs `sessionId` as MDC. Grafana dashboard: session count, queue wait (derived from request latency histogram), create failures, Node disk. Alert: `sessionCount > 0` for 20 minutes after CI should be idle (leaks). Alert: queue time p95 > 30s (need more Nodes or lower thread-count).

Do not scrape the HTML UI. GraphQL is the contract. Protect `/graphql` — cluster-internal only.

Distributed tracing: Grid 4 has OpenTelemetry hooks in recent versions — traces from `POST /session` to Node. Enable if the org already has OTel; it answers "was the 8s spent in queue or in Chrome start?"

Logs: Router matching failures (no stereotype for `safari` on linux), Node chromedriver crash loops. Ship to the same Loki/ELK as CI. Correlate by session id, not by timestamp guess.

**Follow-ups & traps**
- Trap: SSH into Nodes as the only observability.
- GraphQL unauthenticated on a public Router — bind to cluster-internal only.

**One-liner** — Grid 4 GraphQL is the source of session/slot/queue metrics; alert on queue time and zombie sessions, and log WebDriver session ids from tests.

### Q16. Designing a DriverFactory that supports local, Grid, and cloud via one interface (Factory + Strategy).

**Interview answer** — Tests depend on `WebDriver DriverFactory.create()` (or `set` into ThreadLocal). A `LaunchStrategy` interface has `LocalChrome`, `GridRemote`, `CloudBrowserStack` implementations that each return a driver from the same `ChromeOptions`/`FirefoxOptions` builder. Config (`AppConfig` singleton) picks the strategy from `LAUNCH_MODE`. Adding LambdaTest is a new strategy, not a new BaseTest.

**Deep dive** — Factory Method: `create(BrowserType)`. Strategy: *where* it launches. Builder: Options (headless, download dir, acceptInsecureCerts, vendor options). Decorator: `EventFiringDecorator` / logging around the driver — optional, keep it thin.

Cloud strategy sets `options.setCapability("bstack:options", Map.of("sessionName", testName, "build", buildId))` — still Options, not DesiredCapabilities.

ThreadLocal wraps `create()` in `@BeforeMethod` and `unload()` in `@AfterMethod`. The strategy must not cache a static driver.

**Code**

```java
public enum LaunchMode { LOCAL, GRID, CLOUD }

public interface LaunchStrategy {
    WebDriver launch(Capabilities options) throws Exception;
}

public final class LocalLaunch implements LaunchStrategy {
    @Override
    public WebDriver launch(Capabilities options) {
        if (options instanceof FirefoxOptions fx) {
            return new FirefoxDriver(fx);
        }
        return new ChromeDriver((ChromeOptions) options);
    }
}

public final class GridLaunch implements LaunchStrategy {
    private final URL grid;

    public GridLaunch(String gridUrl) throws Exception {
        this.grid = URI.create(gridUrl).toURL();
    }

    @Override
    public WebDriver launch(Capabilities options) {
        return new RemoteWebDriver(grid, options);
    }
}

public final class DriverFactory {
    private static final ThreadLocal<WebDriver> TL = new ThreadLocal<>();

    public static void start(AppConfig cfg, String browser) throws Exception {
        Capabilities options = OptionsFactory.forBrowser(browser, cfg);
        LaunchStrategy strategy = switch (cfg.launchMode()) {
            case LOCAL -> new LocalLaunch();
            case GRID -> new GridLaunch(cfg.gridUrl());
            case CLOUD -> new GridLaunch(cfg.cloudUrl()); // OptionsFactory already added vendor caps
        };
        TL.set(strategy.launch(options));
    }

    public static WebDriver get() { return Objects.requireNonNull(TL.get()); }

    public static void unload() {
        WebDriver d = TL.get();
        if (d != null) {
            try { d.quit(); } finally { TL.remove(); }
        }
    }
}
```

**Follow-ups & traps**
- Trap: `if (local) ... else if (grid) ...` copied into 40 tests.
- Cloud password in Options builder — from env, not source.
- Strategy per browser *and* per env can explode; OptionsFactory × LaunchStrategy is enough (2 axes).

**Senior/lead angle** — This is the only launch story in the repo. New env = config + maybe one strategy. Interviews at Staff level want this diagram plus ThreadLocal plus Grid 4 components in one whiteboard.

**One-liner** — Factory + Strategy: Options built once, launch local/Grid/cloud behind one ThreadLocal lifecycle, tests never construct RemoteWebDriver themselves.
