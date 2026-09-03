# Behavioral Patterns & Putting a Framework Together

Behavioral patterns are how a framework *runs*: which wait algorithm, who listens to pass/fail, how a BaseTest lifecycle fights listeners, why keyword Command engines rot, how Rest Assured filters chain, and how journeys mediate pages. The second half of this file is the lead-SDET whiteboard: combining patterns in a production Selenium+API stack, Page Object vs Screenplay vs Facade, the anti-pattern catalog, and a Driver + Page + Data + Report architecture with dependency direction.

- Q1. Strategy — WaitStrategy, RetryStrategy, EnvConfig per environment
- Q2. Observer — TestNG ITestListener / ISuiteListener; Extent reports
- Q3. Template Method — BaseTest lifecycle vs prefer listeners/composition
- Q4. Command — keyword-driven engines (and why most become unmaintainable)
- Q5. Chain of Responsibility — Rest Assured filters; failure handlers
- Q6. State — checkout wizard / test-run state machines
- Q7. Iterator — paging through API/UI lists
- Q8. Mediator — a Flow / Journey object coordinating pages
- Q9. Memento — storageState / cookie snapshot as memento of auth
- Q10. Interpreter — rarely; Gherkin step parsers if asked
- Q11. How would you combine patterns in a production Selenium+API framework?
- Q12. Page Object vs Screenplay vs Facade — honest comparison
- Q13. Anti-patterns catalog
- Q14. Design a Driver + Page + Data + Report architecture on a whiteboard

### Q1. Strategy — WaitStrategy, RetryStrategy, EnvConfig per environment

**Interview answer** — Strategy encapsulates an algorithm behind an interface so the rest of the framework does not `if (env)` its way through waits, retries, or credentials. I inject a WaitStrategy into ElementActions, a RetryStrategy into the API client, and an EnvConfig strategy selected once at bootstrap (local vs staging vs prod-read-only). Tests never see the switch.

**Deep dive** — UML-in-words: Context (ElementActions) holds Strategy (WaitStrategy) ← ExplicitWait, FluentWait, AppiumWait. Client (test/page) calls `ui.click(locator)` and does not know which wait ran. This is the #1 pattern in test frameworks because waiting, retry, locator resolution, payment sandbox, and environment *all* are algorithms that vary independently of the test. Trade-off: a strategy per one-liner is noise; a strategy when you have two real algorithms is design. When NOT to use: a single explicit wait for the whole suite — just construct WebDriverWait. Strategy vs Factory: Factory *creates* the strategy (and the driver); Strategy *is* the interchangeable behavior. Strategy vs Bridge: Strategy swaps one algorithm; Bridge splits two hierarchies. EnvConfig as Strategy: `StagingConfig` vs `LocalConfig` providing baseUrl, timeout, feature flags — selected by `ENV` — keeps pages free of environment branches.

**Code**

```java
public interface WaitStrategy {
    WebElement clickable(By locator);
    WebElement visible(By locator);
}

public final class ExplicitWaitStrategy implements WaitStrategy {
    private final WebDriverWait wait;
    public ExplicitWaitStrategy(WebDriver driver, Duration timeout) {
        this.wait = new WebDriverWait(driver, timeout);
    }
    public WebElement clickable(By locator) {
        return wait.until(ExpectedConditions.elementToBeClickable(locator));
    }
    public WebElement visible(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }
}

public final class FluentWaitStrategy implements WaitStrategy {
    private final Wait<WebDriver> wait;
    public FluentWaitStrategy(WebDriver driver, Duration timeout) {
        this.wait = new FluentWait<>(driver)
                .withTimeout(timeout)
                .pollingEvery(Duration.ofMillis(200))
                .ignoring(StaleElementReferenceException.class);
    }
    public WebElement clickable(By locator) {
        return wait.until(ExpectedConditions.elementToBeClickable(locator));
    }
    public WebElement visible(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }
}

public interface RetryStrategy {
    <T> T execute(Supplier<T> action);
}

public final class CiRetryStrategy implements RetryStrategy {
    private final int max;
    public CiRetryStrategy(int max) { this.max = max; }
    public <T> T execute(Supplier<T> action) {
        RuntimeException last = null;
        for (int i = 0; i < max; i++) {
            try { return action.get(); }
            catch (RuntimeException ex) {
                last = ex;
                if (!isTransient(ex)) throw ex;
            }
        }
        throw last;
    }
    private boolean isTransient(RuntimeException ex) {
        return ex instanceof HttpStatusException h && h.status() >= 500;
    }
}

public interface EnvConfig {
    String baseUrl();
    String apiBase();
    Duration timeout();
    boolean mutationsAllowed();
}

public final class StagingConfig implements EnvConfig {
    public String baseUrl() { return "https://staging.example.com"; }
    public String apiBase() { return "https://api.staging.example.com"; }
    public Duration timeout() { return Duration.ofSeconds(20); }
    public boolean mutationsAllowed() { return true; }
}

public final class ProdReadOnlyConfig implements EnvConfig {
    public String baseUrl() { return "https://www.example.com"; }
    public String apiBase() { return "https://api.example.com"; }
    public Duration timeout() { return Duration.ofSeconds(30); }
    public boolean mutationsAllowed() { return false; }   // tests must not place real orders
}

public final class ElementActions {
    private final WaitStrategy waits;
    public void click(By locator) { waits.clickable(locator).click(); }
}

// Bootstrap selects strategies once — OCP for new environments.
WaitStrategy waits = new ExplicitWaitStrategy(driver, env.timeout());
RetryStrategy retries = Boolean.parseBoolean(System.getenv("CI"))
        ? new CiRetryStrategy(3) : action -> action.get();
```

**Follow-ups & traps**
- "Is browser selection Strategy or Factory?" — Creating ChromeDriver is Factory. *Choosing* a WaitStrategy or an EnvConfig is Strategy. You often Factory-create a Strategy.
- "Implicit wait as a strategy?" — Don't. Implicit + explicit compound timeouts. Your strategies should all be explicit.
- Weak answer: an enum `WaitType` with a 40-line switch inside ElementActions. That is a strategy trying to get out.
- Trap: RetryStrategy that retries AssertionError. You will green a wrong oracle.

**Senior/lead angle** — Publish two or three strategies from the core (explicit wait, CI retry, env configs). Feature teams do not invent `Thread.sleep` strategies. Strategy is also how you disable mutations in prod-smoke: `mutationsAllowed()` is a policy algorithm, not an if in every test.

**One-liner** — Wait, retry, and env are algorithms — inject them as Strategy so tests and pages never `if (CI)` or `Thread.sleep`.

### Q2. Observer — TestNG ITestListener / ISuiteListener; Extent reports

**Interview answer** — Observer is publish/subscribe: the runner is the subject, listeners are observers. I implement TestNG `ITestListener` and `ISuiteListener` (and `IInvokedMethodListener` for driver lifecycle) so screenshots, Extent/Allure nodes, log collection, and Slack notifications attach without any test calling them. Adding a reporter is Open/Closed — a new observer, no test edits.

**Deep dive** — UML-in-words: Subject (TestNG) notifies Observer (ITestListener) on start/success/failure/skip. Suite-level observers handle start/finish for report flush. ExtentReports: create the report in `onStart` (suite), create a test node in `onTestStart`, log pass/fail in the corresponding callback, flush in `onFinish`. Thread safety: Extent's `ExtentTest` is per-test state — store it in ThreadLocal, not in a static field, or parallel methods will write into each other's nodes. Playwright's reporter API and JUnit 5 extensions are the same pattern. Trade-off: listeners that do too much (driver create, login, data seed, report, video) become a God Observer. Split: DriverListener, ArtifactListener, ReportListener. When NOT to use Observer: a one-off `try/finally` in a single test. When you skip it: screenshots copied into every `@AfterMethod` — that is the duplication Observer exists to remove.

**Code**

```java
import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.Status;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;

public final class ReportListener implements ITestListener, ISuiteListener {
    private static ExtentReports extent;
    private static final ThreadLocal<ExtentTest> NODE = new ThreadLocal<>();

    @Override
    public void onStart(ISuite suite) {
        ExtentSparkReporter spark = new ExtentSparkReporter("target/extent.html");
        extent = new ExtentReports();
        extent.attachReporter(spark);
        extent.setSystemInfo("browser", ConfigReader.INSTANCE.browser().name());
        extent.setSystemInfo("baseUrl", ConfigReader.INSTANCE.baseUrl());
    }

    @Override
    public void onFinish(ISuite suite) {
        if (extent != null) extent.flush();
        NODE.remove();
    }

    @Override
    public void onTestStart(ITestResult result) {
        ExtentTest test = extent.createTest(result.getMethod().getMethodName())
                .assignCategory(result.getTestClass().getName());
        NODE.set(test);
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        NODE.get().log(Status.PASS, "passed");
        NODE.remove();
    }

    @Override
    public void onTestFailure(ITestResult result) {
        ExtentTest node = NODE.get();
        node.log(Status.FAIL, result.getThrowable());
        WebDriver driver = DriverManager.getOrNull();
        if (driver instanceof TakesScreenshot ts) {
            String b64 = ts.getScreenshotAs(OutputType.BASE64);
            node.addScreenCaptureFromBase64String(b64, "failure");
        }
        NODE.remove();
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        NODE.get().log(Status.SKIP, result.getThrowable());
        NODE.remove();
    }
}

public final class DriverListener implements IInvokedMethodListener {
    @Override
    public void beforeInvocation(IInvokedMethod method, ITestResult result) {
        if (method.isTestMethod()) {
            DriverManager.start();
        }
    }
    @Override
    public void afterInvocation(IInvokedMethod method, ITestResult result) {
        if (method.isTestMethod()) {
            DriverManager.stop();
        }
    }
}

// testng.xml
// <listeners>
//   <listener class-name="com.company.automation.infra.report.ReportListener"/>
//   <listener class-name="com.company.automation.infra.driver.DriverListener"/>
// </listeners>
```

**Follow-ups & traps**
- "IHookable / IInvokedMethodListener vs ITestListener?" — ITestListener is test-level events. IInvokedMethodListener wraps every configuration *and* test method — better for driver start/stop so `@BeforeMethod` in the test still has a driver. IHookable lets you wrap the test invoke (retry, timeout).
- "JUnit 5?" — `TestWatcher` / `Extension` is Observer. Same sketch, different types.
- Weak answer: "I put Extent.flush() in each test." That is the problem Observer solves.
- Trap: static `ExtentTest` without ThreadLocal. Passes with `parallel=false`, corrupts reports with `parallel=methods`.

**Senior/lead angle** — Listeners are the composition root's event bus. Keep them in `infra`, register via TestNG XML or a parent suite, never by annotating every class. A new team adding Slack notification ships a new listener JAR, not a fork of ReportListener.

**One-liner** — TestNG listeners are Observer: driver lifecycle, Extent nodes, and screenshots subscribe to pass/fail so tests stay silent about reporting.

### Q3. Template Method — BaseTest lifecycle vs prefer listeners/composition

**Interview answer** — Template Method puts a skeleton in a base class and lets subclasses fill hooks: `setUp` opens a driver, `runScenario` is abstract, `tearDown` quits. That is how BaseTest is born, and how BaseTest hell is born. I still use Template Method for a tiny `Page.isLoaded()` hook. For test lifecycle I prefer Observer (listeners) plus composition, so there is no inheritance tree of tests.

**Deep dive** — UML-in-words: AbstractClass BaseTest defines `final template()` calling `setUp()`, `test()`, `tearDown()`. ConcreteClass implements `test()`. Hollywood principle: the base calls you. The SDET failure mode is the skeleton accumulating optional hooks (`maybeLogin`, `maybeSeed`, `maybeStartAppium`) with booleans — a poor man's Strategy inside a Template. Trade-off: Template Method is simple and obvious to juniors; it does not compose when one test needs API+mobile and another needs web-only. Listeners compose; multiple `@BeforeMethod` in a hierarchy have order pitfalls (`@BeforeMethod` in child vs parent, `alwaysRun`, groups). When Template Method is the right tool: `AbstractScreen.open()` that always waits for `isLoaded()` after navigation; a retry loop with `protected abstract boolean attempt()`. When NOT: sharing `login()` via extends (that is reuse-by-inheritance). This question is paired with SOLID Q7 — say both.

**Code**

```java
// Template Method on a page — small, justified.
public abstract class Page {
    protected final Browser browser;
    protected Page(Browser browser) { this.browser = browser; }

    public final void open(String path) {            // skeleton
        browser.open(path);
        waitUntilLoaded();                           // hook
    }
    protected abstract void waitUntilLoaded();
}

public final class CartPage extends Page {
    public CartPage(Browser browser) { super(browser); }
    protected void waitUntilLoaded() {
        browser.visible(By.cssSelector("[data-testid=cart-root]"));
    }
}

// Template Method BaseTest — the form I would move away from.
public abstract class LegacyBaseTest {
    @BeforeMethod public final void templateSetUp() {
        DriverManager.start();
        extraSetUp();                                // hook
    }
    @AfterMethod public final void templateTearDown() {
        extraTearDown();
        DriverManager.stop();
    }
    protected void extraSetUp() {}
    protected void extraTearDown() {}
}

// Preferred: no test inheritance. Listeners own the skeleton; tests compose helpers.
@Listeners({DriverListener.class, ReportListener.class})
public class GuestCheckoutTest {
    private CheckoutFacade checkout;
    @BeforeMethod
    public void compose() {
        checkout = new CheckoutFacade(new SeleniumBrowser(DriverManager.get(), ConfigReader.INSTANCE.timeout()));
    }
    @Test
    public void placesOrder() {
        checkout.placeOrder(OrderBuilder.guest().build());
    }
}
```

**Follow-ups & traps**
- "Isn't TestNG `@BeforeMethod` already Template Method?" — It is a lifecycle hook provided by the runner (closer to Observer/framework callbacks). Your *own* abstract BaseTest on top of it is the Template Method you control — and the one that grows.
- "JUnit 5 `@BeforeEach` in an interface default method?" — Still a template, just mixed in. Prefer extensions.
- Weak answer: "I never use inheritance." Pages with `open()`/`isLoaded()` are a clean Template Method.
- Trap: `abstract void testBody()` forcing one test per class. That fights the runner's method-level parallel.

**Senior/lead angle** — Policy: Template Method allowed on pages (load skeleton), banned as a multi-level test base. Provide a sample test class, not an abstract one, in the starter repo.

**One-liner** — Keep Template Method for `Page.open()` → `isLoaded()`; put test lifecycle in listeners, not in a BaseTest hierarchy.

### Q4. Command — keyword-driven engines (and why most become unmaintainable)

**Interview answer** — Command wraps a request as an object with `execute()` (and sometimes `undo()`). Keyword-driven frameworks are Command: `ClickCommand`, `TypeCommand`, `AssertTextCommand` queued from Excel/JSON. I have used small command queues for replay and for AI-generated steps. I do not build a general keyword engine for product tests — you lose types, refactoring, and stack traces, and you invent a worse language on top of Java.

**Deep dive** — UML-in-words: Invoker (engine) → Command (`execute`) → Receiver (page/driver). Keywords are the invoker reading a script. Why it rots: (1) the verb vocabulary never stops growing (`clickIfPresent`, `swipeUntil`); (2) arguments are strings, so SKU vs locator vs timeout is discovered at runtime; (3) control flow (if/else, loops) sneaks into the spreadsheet; (4) nobody can "Find Usages" of a locator; (5) failures point at the interpreter, not the scenario. When Command *is* healthy: recording a list of API operations to undo in teardown (`DeleteUserCommand`); a retry wrapper around a single action; Appium gesture sequences. When NOT: as the primary authoring model for a team of SDETs who write Java. Cucumber is Interpreter + Command (step defs as commands); it has the same honesty check — if developers write all the Gherkin, you paid for a layer users don't use.

**Code**

```java
public interface Command {
    void execute();
}

public final class ClickCommand implements Command {
    private final Browser browser;
    private final By locator;
    public ClickCommand(Browser browser, By locator) {
        this.browser = browser;
        this.locator = locator;
    }
    public void execute() { browser.click(locator); }
}

public final class TypeCommand implements Command {
    private final Browser browser;
    private final By locator;
    private final String value;
    public void execute() { browser.type(locator, value); }
}

// A justified command: teardown undo log.
public final class CompensationLog {
    private final Deque<Command> undos = new ArrayDeque<>();
    public void register(Command undo) { undos.push(undo); }
    public void rollback() {
        while (!undos.isEmpty()) {
            try { undos.pop().execute(); }
            catch (RuntimeException ignored) { /* best-effort cleanup */ }
        }
    }
}

@Test
public void createUserAndCleanup() {
    CompensationLog undo = new CompensationLog();
    User user = api.post("/users", UserBuilder.guest().build(), User.class);
    undo.register(() -> api.delete("/users/" + user.id()));
    try {
        // assertions...
    } finally {
        undo.rollback();
    }
}

// The engine I would not make the default authoring path.
public final class KeywordEngine {
    public void run(List<String[]> rows) {
        for (String[] row : rows) {                   // ["Click", "#submit", ""]
            commandFor(row).execute();                // ClassNotFound / NoSuchMethod at runtime
        }
    }
}
```

**Follow-ups & traps**
- "Isn't POM plus fluent methods just Command?" — No. Command is an *object* representing a request, invocable later. A page method is just a method.
- "Can AI emit commands?" — Yes, and then you still need typed page methods underneath or you cannot review the output. Generate Java, not a new DSL, unless you have a parser and a typechecker.
- Weak answer: "I built a 200-keyword framework so QA can write Excel tests" without mentioning debug/ownership cost.
- Trap: mixing keyword data (test oracles) with keyword verbs in one sheet. Data should be data (Builder); verbs should be code.

**Senior/lead angle** — Allow Command for compensation/undo and for tightly scoped batch jobs. Require an ADR for any keyword interpreter, with a named non-SDET author population and a debugger story. Most ADRs should close as "use Java page objects."

**One-liner** — Command is excellent for undo logs and terrible as Excel-driven product tests — don't replace Java with an untyped interpreter.

### Q5. Chain of Responsibility — Rest Assured filters; failure handlers

**Interview answer** — Chain of Responsibility passes a request along handlers until one handles it (or all decorate it). Rest Assured `Filter`s are a chain: logging → auth token attach → tracing id → retry. I also chain failure handlers: retry analyzer → screenshot → dump DOM → attach to Extent → mark Grid session failed. Each handler does one thing and calls the next.

**Deep dive** — UML-in-words: Handler has `setNext` and `handle(ctx)`. Rest Assured: `Filter.filter(req, resp, ctx)` must call `ctx.next(req, resp)` or the request never goes out — that is the chain. Order matters: auth before log (so you can redact), retry outside (so the inner chain re-runs). Failure chain is similar but on the TestNG listener side, or an explicit `FailurePipeline`. Trade-off: implicit order in a long chain is hard to debug ("why is the token missing?" — someone didn't call next). When NOT to use: two `if`s in one listener. When it shines: pluggable infra (teams add a filter JAR). Chain vs Decorator: a decorating chain where every node calls next is both; Chain of Responsibility emphasizes that a node may *stop* the chain (auth filter rejects, retry handler short-circuits on success).

**Code**

```java
public final class TracingFilter implements Filter {
    public Response filter(FilterableRequestSpecification req,
                           FilterableResponseSpecification resp,
                           FilterContext ctx) {
        req.header("X-Request-Id", UUID.randomUUID().toString());
        return ctx.next(req, resp);
    }
}

public final class AuthFilter implements Filter {
    private final Supplier<String> token;
    public Response filter(FilterableRequestSpecification req,
                           FilterableResponseSpecification resp,
                           FilterContext ctx) {
        req.header("Authorization", "Bearer " + token.get());
        return ctx.next(req, resp);
    }
}

public final class RedactingLogFilter implements Filter {
    public Response filter(FilterableRequestSpecification req,
                           FilterableResponseSpecification resp,
                           FilterContext ctx) {
        Response response = ctx.next(req, resp);
        System.out.println(req.getMethod() + " " + req.getURI() + " -> " + response.statusCode());
        return response;
    }
}

RequestSpecification spec = new RequestSpecBuilder()
        .setBaseUri(env.apiBase())
        .addFilter(new AuthFilter(TokenService::issue))
        .addFilter(new TracingFilter())
        .addFilter(new RedactingLogFilter())
        .build();

// Failure handlers — a node may handle and stop, or pass on.
public interface FailureHandler {
    void setNext(FailureHandler next);
    void handle(FailureContext ctx);
}

public abstract class BaseFailureHandler implements FailureHandler {
    private FailureHandler next;
    public void setNext(FailureHandler next) { this.next = next; }
    protected void pass(FailureContext ctx) { if (next != null) next.handle(ctx); }
}

public final class RetryHandler extends BaseFailureHandler {
    public void handle(FailureContext ctx) {
        if (ctx.attempts() < 2 && ctx.isTransient()) {
            ctx.retryTest();                          // stops the chain
            return;
        }
        pass(ctx);
    }
}

public final class ScreenshotHandler extends BaseFailureHandler {
    public void handle(FailureContext ctx) {
        ctx.captureScreenshot();
        pass(ctx);
    }
}

public final class ReportHandler extends BaseFailureHandler {
    public void handle(FailureContext ctx) {
        ctx.attachToExtent();
        pass(ctx);
    }
}

RetryHandler retry = new RetryHandler();
ScreenshotHandler shots = new ScreenshotHandler();
ReportHandler report = new ReportHandler();
retry.setNext(shots);
shots.setNext(report);
retry.handle(ctx);                                    // retry → screenshot → report
```

**Follow-ups & traps**
- "Filter vs Specification in Rest Assured?" — Specification is the immutable-ish request template (Builder). Filter is the chain that runs per call. You want both.
- "Where should retry live — filter, TestNG IRetryAnalyzer, or CI?" — HTTP 502 on idempotent GET: filter or client decorator. UI flake: IRetryAnalyzer CI-only. Don't retry POST place-order in a filter.
- Weak answer: one 200-line Filter that logs, auths, retries, and parses.
- Trap: a filter that calls `ctx.next` twice (accidental double POST).

**Senior/lead angle** — The filter chain is a published SPI: auth and tracing in core, team-specific headers as extra filters. Failure handling is the same: core ships screenshot+report, teams add a defect-ticket handler at the end. Document order in README.

**One-liner** — Rest Assured filters and failure pipelines are Chain of Responsibility — each node does one job and calls next, and retry is allowed to stop the chain.

### Q6. State — checkout wizard / test-run state machines

**Interview answer** — State lets an object change behavior when its internal state changes, without a nest of booleans. A checkout wizard is the textbook SDET example: `CartState`, `AddressState`, `PaymentState`, `ConfirmedState` each expose only legal actions (`pay()` in AddressState throws or is absent). I also model the test-run itself: `CREATED → RUNNING → PASSED|FAILED|SKIPPED → REPORTED`, which listeners already implement as callbacks.

**Deep dive** — UML-in-words: Context (CheckoutSession) holds State; states implement `next()` / domain verbs and replace the context's state. Alternative: an enum plus a transition table — lighter, often enough. Why it appears in interviews: wizard UIs and mobile onboarding are full of "don't click pay before address." Encoding that in the type system (methods only on the right state) catches illegal test steps at compile time if you return a new type per step (see fluent page returns — a poor man's State). Trade-off: a class per state is heavy for three screens; returning `AddressPage` from `CartPage.proceed()` is usually enough. When the pattern is justified: long-lived session objects, protocol-like flows (WebSocket connect/auth/subscribe), device farms (device idle/leased/dirty/offline). When NOT: a boolean `loggedIn` on a page. Don't build a general state-machine framework for checkout.

**Code**

```java
public interface CheckoutState {
    CheckoutState addItem(OrderItem item);
    CheckoutState address(Address address);
    CheckoutState pay(Card card);
    boolean isConfirmed();
}

public final class CheckoutSession {
    private CheckoutState state = new CartState(new Cart());
    public void addItem(OrderItem item) { state = state.addItem(item); }
    public void address(Address address) { state = state.address(address); }
    public void pay(Card card) { state = state.pay(card); }
    public boolean isConfirmed() { return state.isConfirmed(); }
}

public final class CartState implements CheckoutState {
    private final Cart cart;
    public CartState(Cart cart) { this.cart = cart; }
    public CheckoutState addItem(OrderItem item) { cart.add(item); return this; }
    public CheckoutState address(Address address) {
        if (cart.isEmpty()) throw new IllegalStateException("cart empty");
        return new AddressState(cart, address);
    }
    public CheckoutState pay(Card card) {
        throw new IllegalStateException("cannot pay from cart");
    }
    public boolean isConfirmed() { return false; }
}

public final class AddressState implements CheckoutState {
    private final Cart cart;
    private final Address address;
    public CheckoutState addItem(OrderItem item) {
        throw new IllegalStateException("cannot add items after address");
    }
    public CheckoutState address(Address address) { return new AddressState(cart, address); }
    public CheckoutState pay(Card card) { return new PaymentState(cart, address, card).settle(); }
    public boolean isConfirmed() { return false; }
}

// Simpler cousin used in POM: type-state via return types (usually enough).
public final class CartPage {
    public AddressPage proceed() { /* ... */ return new AddressPage(browser); }
}
public final class AddressPage {
    public PaymentPage continueToPayment() { return new PaymentPage(browser); }
}

public enum RunState { CREATED, RUNNING, PASSED, FAILED, SKIPPED, REPORTED }
```

**Follow-ups & traps**
- "State vs Strategy?" — Strategy: the caller picks the algorithm. State: the object picks the next algorithm itself after a transition. WaitStrategy is Strategy; wizard is State.
- "Should tests use the state machine or pages?" — Tests use pages/facades. The state machine may live inside the facade to forbid illegal sequences.
- Weak answer: a `switch (status)` in every method claiming to be State.
- Trap: storing wizard step in ThreadLocal statics so tests can jump steps — that is hidden global state, not State pattern.

**Senior/lead angle** — Prefer type-state page returns for UI wizards (cheap, readable). Reserve explicit State classes for infrastructure (device lease, run lifecycle) where illegal transitions cause resource leaks.

**One-liner** — Encode legal checkout steps as states or as page return types so `pay()` before address is impossible, not just flaky.

### Q7. Iterator — paging through API/UI lists

**Interview answer** — Iterator gives a uniform way to walk a collection without exposing page size, cursors, or DOM. I implement `Iterable<Order>` over a Rest Assured paginated API (`next` URL or `page/size`) and a UI table pager, so the test can `for (Order o : orders)` or stream until it finds a row. The paging mechanism stays behind the iterator.

**Deep dive** — UML-in-words: Iterable → Iterator (`hasNext`, `next`) hiding Aggregate (API or table). API flavors: offset/limit, cursor/next-link, GraphQL `after`. UI flavors: "Next" button, infinite scroll (IntersectionObserver), "Load more." The iterator must have a termination condition (max pages) or a buggy API will infinite-loop the suite. Trade-off: materializing all pages into a List is simpler when N is small; a true iterator is for large or streaming data and for memory. When NOT to use: a table that always fits on one page — just locators. When it shines: admin consoles and list APIs in cleanup jobs (`for (User u : staleUsers()) delete(u)`). Appium: iterator over RecyclerView items with swipe-to-load is the same idea; be careful with stale cells.

**Code**

```java
public final class OrderPages implements Iterable<Order> {
    private final ApiClient api;
    private final int pageSize;
    private final int maxPages;

    public OrderPages(ApiClient api, int pageSize, int maxPages) {
        this.api = api;
        this.pageSize = pageSize;
        this.maxPages = maxPages;
    }

    public Iterator<Order> iterator() {
        return new Iterator<>() {
            private int page = 0;
            private List<Order> buffer = List.of();
            private int index = 0;
            private boolean done = false;

            public boolean hasNext() {
                fill();
                return index < buffer.size();
            }
            public Order next() {
                if (!hasNext()) throw new NoSuchElementException();
                return buffer.get(index++);
            }
            private void fill() {
                while (index >= buffer.size() && !done) {
                    if (page >= maxPages) { done = true; return; }
                    OrderListResponse resp = api.get(
                            "/orders?page=" + page + "&size=" + pageSize,
                            OrderListResponse.class);
                    buffer = resp.content();
                    index = 0;
                    page++;
                    if (buffer.isEmpty() || resp.last()) done = true;
                }
            }
        };
    }
}

public final class TablePager implements Iterable<WebElement> {
    private final Browser browser;
    private final By rows = By.cssSelector("table tbody tr");
    private final By next = By.cssSelector("[data-testid=next-page]");

    public Iterator<WebElement> iterator() {
        return new Iterator<>() {
            private Iterator<WebElement> current = browser.all(rows).iterator();
            public boolean hasNext() {
                if (current.hasNext()) return true;
                if (!browser.displayed(next) || !browser.enabled(next)) return false;
                browser.click(next);
                current = browser.all(rows).iterator();
                return current.hasNext();
            }
            public WebElement next() {
                if (!hasNext()) throw new NoSuchElementException();
                return current.next();
            }
        };
    }
}

@Test
public void findOrderAcrossPages() {
    Order match = StreamSupport.stream(new OrderPages(api, 50, 20).spliterator(), false)
            .filter(o -> o.email().equals(target))
            .findFirst()
            .orElseThrow();
    assertThat(match.status()).isEqualTo("PAID");
}
```

**Follow-ups & traps**
- "Why not `while (true)` in the test?" — Because every test will implement off-by-one and max-page differently. Iterator is the DRY that doesn't hide oracles.
- "Infinite scroll?" — Iterator that scrolls the last row into view, waits for count to grow, stops when count is stable. Still needs a cap.
- Weak answer: loading all 10,000 orders into a List for one lookup. Use a filter query; iterator is a fallback.
- Trap: holding WebElement rows from page 1 after clicking next — stale. Re-find per page (the iterator above does).

**Senior/lead angle** — A paginated client is a core API-layer primitive, unit-tested against WireMock with next-links. UI pagers stay in components. Tests should prefer API search over UI iteration when the oracle is "does this order exist."

**One-liner** — Hide cursor/page/next-button behind Iterable so tests scan lists without reimplementing paging — and always cap the walk.

### Q8. Mediator — a Flow / Journey object coordinating pages without them knowing each other

**Interview answer** — Mediator stops colleague objects from referring to each other by routing communication through a hub. In a framework the hub is a Flow/Journey: CartPage does not construct PaymentPage and PaymentPage does not know CartPage exists. The flow holds both, sequences them, and owns the transitions. Tests talk to the flow (or to a single page when the test is page-local). This is the design cousin of Facade; I name Mediator when the point is decoupling pages from each other.

**Deep dive** — UML-in-words: Mediator (CheckoutFlow) ↔ Colleague pages. Colleagues emit events or return results; they do not `new NextPage(driver)`. In naive POM, `CartPage.proceed()` returns `new AddressPage(driver)` — convenient, but CartPage now depends on AddressPage (package coupling). A mediator/flow moves that dependency up, so pages depend only on Browser. Trade-off: you lose fluent `cart.proceed().fill(address).pay(card)` unless the flow itself is fluent. Many teams keep page-to-page returns for DX and accept the coupling — be honest. When Mediator is worth it: pages reused in different orders (guest vs logged-in vs buy-now skips cart), or API+UI mixed journeys where a page should not import ApiClient. When NOT: two pages that always go together — `proceed()` returning the next page is fine. Mediator vs Facade: Facade is the test's simple API; Mediator is the pages' decoupling. CheckoutFlow is often both.

**Code**

```java
// Pages know Browser only — no next-page construction.
public final class CartPage {
    private final Browser browser;
    public void add(OrderItem item) { /* locators */ }
    public void clickProceed() { browser.click(By.cssSelector("[data-testid=proceed]")); }
}

public final class AddressPage {
    public void fill(Address address) { /* ... */ }
    public void clickContinue() { browser.click(By.cssSelector("[data-testid=continue]")); }
}

public final class PaymentPage {
    public void pay(Card card) { /* ... */ }
}

// Mediator / Journey — the only type that knows the set and the order.
public final class CheckoutFlow {
    private final CartPage cart;
    private final AddressPage address;
    private final PaymentPage payment;
    private final ConfirmationPage confirmation;

    public CheckoutFlow(Browser browser) {
        this.cart = new CartPage(browser);
        this.address = new AddressPage(browser);
        this.payment = new PaymentPage(browser);
        this.confirmation = new ConfirmationPage(browser);
    }

    public ConfirmationPage placeOrder(OrderPayload order) {
        order.items().forEach(cart::add);
        cart.clickProceed();
        address.fill(order.address());
        address.clickContinue();
        payment.pay(order.card());
        return confirmation;
    }

    public ConfirmationPage buyNowSkippingCart(OrderPayload order) {  // different mediation
        address.fill(order.address());
        address.clickContinue();
        payment.pay(order.card());
        return confirmation;
    }
}

@Test
public void buyNowSkipsCart() {
    ConfirmationPage done = new CheckoutFlow(browser).buyNowSkippingCart(OrderBuilder.guest().build());
    assertThat(done.banner()).contains("thank you");
}
```

**Follow-ups & traps**
- "If CartPage.proceed() returns AddressPage, is that wrong?" — It is convenient POM, not Mediator. I'll use it until CartPage is reused in a journey that does not go to AddressPage; then I extract a flow.
- "Is Screenplay's actor a mediator?" — The actor/ability hub is Mediator-like; tasks are Commands. See Q12.
- Weak answer: a mediator that still holds locators.
- Trap: a global `PageNavigator` singleton every page calls — a God Mediator plus hidden state.

**Senior/lead angle** — Flows are the published language of the domain (placeOrder, buyNow, cancel). Pages are internal. Downstream teams import flows; they do not import five page classes and re-sequence them. That is also how you keep journeys consistent with product.

**One-liner** — A Flow mediates pages so they don't `new` each other — journeys vary in the hub, locators stay in pages.

### Q9. Memento — storageState / cookie snapshot as memento of auth

**Interview answer** — Memento captures internal state so you can restore it later without exposing that state. Playwright `storageState` is the canonical example: cookies + localStorage dumped to JSON, then loaded into a fresh context. In Selenium I snapshot cookies (and sometimes localStorage via JS) after an API login and restore them onto a new browser, so tests don't UI-login every time. The Originator is the browser session; the Caretaker is the auth setup class or a file on disk.

**Deep dive** — UML-in-words: Originator (Browser) → createMemento() → Memento (cookies/storage JSON). Caretaker (AuthStore) holds it, later `restore(browser)`. Isolation: a memento is copied *into* a new session, not a shared live session (that would be Singleton). Stale mementos: expired JWTs. Handle by TTL, a setup job that refreshes storageState, or API login per worker. Trade-off: cookie-only restore misses localStorage tokens and vice versa; you must restore on the correct domain (`driver.get(baseUrl)` before `addCookie`). When NOT to use: capturing the whole WebDriver (you cannot). When not to share one memento across roles: admin storage on a buyer test is an auth bug. Appium: restoring auth is often a deep link plus token in app prefs, not cookies — still a memento, different payload.

**Code**

```java
public final class AuthMemento {
    private final Set<Cookie> cookies;
    private final String localStorageJson;            // serialized map
    private final Instant capturedAt;
    private final Duration ttl;

    public AuthMemento(Set<Cookie> cookies, String localStorageJson, Duration ttl) {
        this.cookies = Set.copyOf(cookies);
        this.localStorageJson = localStorageJson;
        this.capturedAt = Instant.now();
        this.ttl = ttl;
    }

    public boolean expired() {
        return Instant.now().isAfter(capturedAt.plus(ttl));
    }
}

public final class AuthCaretaker {
    private final Map<Role, AuthMemento> store = new ConcurrentHashMap<>();
    private final ApiClient api;

    public AuthMemento capture(Role role, Browser browser) {
        String token = api.post("/auth/token", role.credentials(), Token.class).value();
        browser.open("/");                            // domain first
        browser.addCookie("session", token);
        browser.refresh();
        AuthMemento m = new AuthMemento(browser.cookies(), browser.dumpLocalStorage(), Duration.ofMinutes(25));
        store.put(role, m);
        return m;
    }

    public void restore(Role role, Browser browser) {
        AuthMemento m = store.get(role);
        if (m == null || m.expired()) m = capture(role, browser);
        browser.open("/");
        m.cookies().forEach(browser::addCookie);
        browser.loadLocalStorage(m.localStorageJson());
        browser.refresh();
    }
}

// Playwright equivalent (TypeScript) — same pattern, batteries included:
// setup project writes storageState: 'auth/user.json'
// tests use: use: { storageState: 'auth/user.json' }
```

**Follow-ups & traps**
- "Is this Prototype?" — Prototype copies an object to make a new one of the same type. Memento copies *state* out so a *new* session can be brought to that state. storageState is Memento; cloning a payload record is Prototype.
- "Parallel?" — One memento file per role, read-only after setup, each test gets a new context/driver and loads it. Don't restore into a shared driver.
- Weak answer: "we keep the browser open and logged in" — that is session reuse, not memento, and it leaks state.
- Trap: committing storageState JSON with live tokens to git.

**Senior/lead angle** — Auth setup is a first-class pipeline stage: refresh mementos, fail fast on expiry, never login via UI in the hot path. Measure login time saved; this is usually the largest runtime win after parallelization.

**One-liner** — Snapshot cookies/storage as a memento of auth and restore onto a fresh session — don't UI-login every test, and don't share a live logged-in driver.

### Q10. Interpreter — rarely; Gherkin step parsers if asked

**Interview answer** — Interpreter defines a grammar and evaluates sentences in that language. In SDET work it shows up as Gherkin (Cucumber step defs as the "terminal expressions") and as keyword-engine parsers. I rarely implement an interpreter. If asked, I explain that Cucumber already is one, and that writing a second DSL on top of Java is usually YAGNI unless you have a true non-developer author group and a real grammar.

**Deep dive** — UML-in-words: AbstractExpression + TerminalExpression + NonterminalExpression (and/or/repeat) over a Context. Cucumber: feature files are the language; step defs bind terminals; Scenario Outline is a simple nonterminal. Keyword Excel engines are interpreters with a terrible grammar (columns as verbs). Trade-off: a language gives non-coders a surface and costs you parsing, error messages, IDE support, and versioning. When it is justified: a compliance team already writes Given/When/Then, and you invest in a shared step library that stays stable. When NOT: SDETs writing features that are one-to-one with Java methods (`When I click #submit`). That interpreter adds no meaning. Don't confuse Interpreter with Command: Command is one action object; Interpreter composes a grammar tree.

**Code**

```java
// Minimal interpreter for a tiny assertion language — interview sketch, not a product DSL.
// Grammar:  STATUS IS paid
//           TOTAL GTE 10

public interface Expr {
    boolean eval(Order context);
}

public final class StatusIs implements Expr {
    private final String expected;
    public boolean eval(Order context) { return context.status().equalsIgnoreCase(expected); }
}

public final class TotalGte implements Expr {
    private final BigDecimal min;
    public boolean eval(Order context) { return context.total().compareTo(min) >= 0; }
}

public final class And implements Expr {
    private final Expr left, right;
    public boolean eval(Order context) { return left.eval(context) && right.eval(context); }
}

public final class TinyParser {
    public Expr parse(String sentence) {
        String[] parts = sentence.trim().split("\\s+AND\\s+");
        Expr acc = parseClause(parts[0]);
        for (int i = 1; i < parts.length; i++) acc = new And(acc, parseClause(parts[i]));
        return acc;
    }
    private Expr parseClause(String clause) {
        String[] t = clause.split("\\s+");
        if (t.length == 3 && t[0].equals("STATUS") && t[1].equals("IS")) return new StatusIs(t[2]);
        if (t.length == 3 && t[0].equals("TOTAL") && t[1].equals("GTE"))
            return new TotalGte(new BigDecimal(t[2]));
        throw new IllegalArgumentException("Cannot parse: " + clause);
    }
}

// Cucumber is the interpreter you already have — keep steps at domain level.
@When("a guest places an order for sku {string}")
public void guestPlacesOrder(String sku) {
    checkout.placeOrder(OrderBuilder.guest().withItem(sku, 1).build());
}
```

**Follow-ups & traps**
- "Difference between Interpreter and Command?" — Interpreter: grammar tree evaluated against context. Command: one request, possibly queued. Keyword engines often are a flat Command list pretending to be a language.
- "Should we parse Gherkin ourselves?" — No. Use Cucumber or don't use Gherkin.
- Weak answer: implementing Interpreter because it is on the GoF list.
- Trap: an interpreter that `eval`s locator strings from PM-edited YAML in production CI with no review.

**Senior/lead angle** — Language layers are product decisions. If the org commits to Gherkin, the lead's job is a small, domain-level step catalog (Interpreter terminals that call facades), not 500 steps like `click(String xpath)`.

**One-liner** — Interpreter is Gherkin/keywords; don't write one unless you have real non-developer authors — and even then the terminals should call typed flows.

### Q11. How would you combine patterns in a production Selenium+API framework?

**Interview answer** — I would draw a layered graph and pin a pattern on each type: Factory Method builds WebDriver, Singleton/frozen record holds config, Builder shapes test data, Facade/Mediator flows orchestrate pages, pages are components (Composite) over an ElementActions that uses Wait Strategy, listeners are Observer, Rest Assured filters are Chain of Responsibility, ApiClient may be Decorated with retry/metrics, Grid is a Proxy, auth restore is Memento. Tests sit on top and depend only on flows, builders, and ApiClient. I would not have Abstract Factory or a keyword Interpreter until a second platform or a real DSL user appears.

**Deep dive** — This is the whiteboard question. Structure, top-down, with dependency arrows pointing inward/down:

```text
tests/  (no pattern — scenarios + oracles)
   ↓
flows/  Facade + Mediator (CheckoutFlow)
   ↓
pages/ + components/   POM + Composite (Header)
   ↓
ElementActions         Strategy (WaitStrategy)
   ↓
Browser adapter        DIP; Decorator (EventFiringDecorator)
   ↓
DriverFactory          Factory Method (+ ThreadLocal, not Singleton)
        ↘ RemoteWebDriver  Proxy (Grid)
config                 Singleton or immutable record
data/builders          Builder; OrderFactory (side-effect factory + teardown)
api/                   ApiClient + Rest Assured Filter chain (CoR)
                       Decorator (retry, metrics)
auth/                  Memento (cookie/storage snapshot)
listeners/             Observer (ITestListener, IInvokedMethodListener)
report/                Observer subscribers (Extent/Allure)
```

Trade-offs to say out loud: each pattern earns its box by a failure mode (parallel → no driver singleton; locator blast radius → POM; journey duplication → Facade). Pattern soup is the competing failure mode — if a box has one implementation, don't introduce Abstract Factory. When NOT to draw all 23 GoF: you will look like you memorized a list. Draw *this* graph and mention two you deliberately omitted (Interpreter, Flyweight).

**Code**

```java
// Composition root — where patterns meet. Not a God class: it only binds.

public final class Framework {
    private Framework() {}

    public static void onTestStart() {
        EnvConfig env = EnvSelector.fromEnv();                          // Strategy
        WebDriver raw = DriverFactory.create(env.browser());            // Factory Method
        WebDriver decorated = DecoratedDrivers.wrap(raw);               // Decorator
        DriverManager.set(decorated);                                   // ThreadLocal, not Singleton
    }
}

public class CheckoutApiUiTest {
    private Browser browser;
    private ApiClient api;
    private CheckoutFlow checkout;
    private OrderFactory orders;

    @BeforeMethod
    public void bind() {
        browser = new SeleniumBrowser(DriverManager.get(), ConfigReader.INSTANCE.timeout());
        api = new MetricsApiClient(                                             // Decorator
                new RetryingApiClient(new RestAssuredClient(specWithFilters()), 2));
        checkout = new CheckoutFlow(browser);                                   // Facade/Mediator
        orders = new OrderFactory(api);                                         // Factory + teardown
        new AuthCaretaker(api).restore(Role.GUEST, browser);                    // Memento
    }

    @AfterMethod
    public void cleanup() { orders.deleteAll(); }

    @Test
    public void guestOrderShowsThankYou() {
        OrderPayload payload = OrderBuilder.guest().withItem("SKU-1", 1).build(); // Builder
        ConfirmationPage done = checkout.placeOrder(payload);
        assertThat(done.banner()).contains("thank you");                        // oracle in test (SRP)
    }
}

RequestSpecification specWithFilters() {                                        // Chain of Responsibility
    return new RequestSpecBuilder()
            .setBaseUri(ConfigReader.INSTANCE.apiBase())
            .addFilter(new AuthFilter(TokenService::issue))
            .addFilter(new TracingFilter())
            .build();
}
```

**Follow-ups & traps**
- "Where is Abstract Factory?" — I'd add it when Android *and* iOS (or local *and* a second cloud) must vend matching families. Until then DriverFactory + env is enough.
- "Where is Template Method?" — `Page.open()` / `waitUntilLoaded()`, not BaseTest.
- Weak answer: listing ten patterns without saying which class is which, or drawing a cycle (pages → tests).
- Trap: putting DriverFactory in tests. The composition root is listeners + a small bind method.

**Senior/lead angle** — This map *is* the onboarding diagram and the ArchUnit rules. New patterns need an ADR that names the box they enter. The lead's job is less "know Bridge" than "keep this DAG acyclic and the boxes few."

**One-liner** — Factory, Builder, Facade, Strategy, Decorator, Observer, CoR, Proxy, Memento — each pinned to one layer — tests depend down, nothing depends up.

### Q12. Page Object vs Screenplay vs Facade — honest comparison

**Interview answer** — Page Object Model puts locators and atomic actions on a class per screen. Facade/Flow sits on top of pages so tests call `placeOrder` instead of four pages. Screenplay puts the actor at the center: `actor.attemptsTo(Login.as(user), PlaceOrder.with(payload))` — tasks and questions, not pages, are the primary vocabulary. I ship POM + Facade for most Java Selenium teams; I reach for Screenplay only when many actors/roles and many overlapping tasks make page-fluent tests noisy, and the team will maintain the extra types.

**Deep dive** — Comparison, in architecture terms:

| | POM | POM + Facade | Screenplay |
| --- | --- | --- | --- |
| Primary type | Page | Flow | Actor + Task + Question |
| Test reads as | `cart.add(); address.fill();` | `checkout.placeOrder(order)` | `sam.attemptsTo(PlaceOrder.of(order))` |
| Locators live in | Page | Page (not in flow) | Target / Page-like abilities |
| Extra types | Few | One flow per journey | Tasks, questions, abilities, actors |
| Best at | UI contract isolation | Readable journeys | Multi-actor, reusable tasks across UIs |
| Failure mode | God page, Demeter chains | God facade, hidden asserts | Framework-inside-a-framework, onboarding cost |

Screenplay is Command (tasks) + Mediator (actor) + DIP (abilities). Serenity/JS and Serenity BDD popularized it. Honest cost: a `Click` task wrapping every click is Interpreter/Command rot. Good Screenplay keeps tasks at domain level (`PlaceOrder`) and uses pages underneath. Facade gives 80% of the readability at 20% of the type count. When NOT POM: a 5-test script. When NOT Screenplay: a team of two SDETs on one UI. When Facade is wrong: the test *is* about the address form — talk to AddressPage.

**Code**

```java
// POM — page-centric
new CartPage(browser).add(item);
new AddressPage(browser).fill(address);
new PaymentPage(browser).pay(card);

// POM + Facade — journey-centric (my default)
new CheckoutFlow(browser).placeOrder(order);

// Screenplay sketch — actor-centric
public interface Task { void performAs(Actor actor); }
public interface Ability {}

public final class BrowseTheWeb implements Ability {
    private final Browser browser;
    public Browser browser() { return browser; }
}

public final class Actor {
    private final String name;
    private final Map<Class<?>, Ability> abilities = new HashMap<>();
    public Actor can(Ability ability) {
        abilities.put(ability.getClass(), ability);
        return this;
    }
    public <T extends Ability> T ability(Class<T> type) { return type.cast(abilities.get(type)); }
    public void attemptsTo(Task... tasks) {
        for (Task t : tasks) t.performAs(this);
    }
}

public final class PlaceOrder implements Task {
    private final OrderPayload order;
    public static PlaceOrder with(OrderPayload order) { return new PlaceOrder(order); }
    public void performAs(Actor actor) {
        Browser browser = actor.ability(BrowseTheWeb.class).browser();
        new CheckoutFlow(browser).placeOrder(order);     // domain task over pages, not Click.of(By.id)
    }
}

Actor sam = new Actor("Sam").can(new BrowseTheWeb(browser));
sam.attemptsTo(PlaceOrder.with(OrderBuilder.guest().build()));
```

**Follow-ups & traps**
- "Is POM a GoF pattern?" — No. It is a UI-testing pattern that *uses* Facade/Composite. Say that; then talk about SRP.
- "Does Playwright make POM obsolete?" — Locators-as-fields plus fixtures replace some POM ceremony; you still want a home for locators and journeys. Component objects + fixtures ≅ POM + composition.
- Weak answer: "Screenplay is always superior." It is more abstraction; superiority depends on team size and actor complexity.
- Trap: Screenplay tasks named `Click`, `Enter` — you reinvented a keyword engine.

**Senior/lead angle** — Choose one vocabulary for the org and scaffold it. Mixing POM-fluent tests, Screenplay actors, and Cucumber in one repo without a boundary is how new hires write a fourth style. A lead documents "POM + flows, domain tasks if we ever need actors," and enforces it in review.

**One-liner** — POM isolates locators, Facade isolates journeys, Screenplay isolates actors/tasks — default to POM plus Facade unless multi-actor reuse pays for the extra model.

### Q13. Anti-patterns catalog

**Interview answer** — The catalog I watch for: God BaseTest, static WebDriver, a `Thread.sleep` util, `catch (Exception)`, hardcoded waits, tests that depend on each other's side effects, singleton driver (same as static, dressed up), and copy-pasted POM per test. Each one maps to a principle we already covered — inheritance hell, shared state, implicit timing, swallowed failures, coupling, and locator drift.

**Deep dive** — Walk the catalog with *why it fails in CI* and *what replaces it*:

1. **God BaseTest** — 2,000 lines, every test extends it, every change reruns the world. Replace with listeners + composed helpers.
2. **Static WebDriver / singleton driver** — parallel threads share a session. Replace with ThreadLocal factory, quit per test. Grid pools processes; you don't pool sessions.
3. **Thread.sleep utility** — hides timing, slows the suite, still flakes on slow CI. Replace with WaitStrategy / explicit conditions. Sleep is allowed only as a last-ditch for a known animation with a ticket.
4. **catch (Exception)** — greens tests that never reached the oracle; hides NoSuchElement, 500s, NPEs. Catch specific types at boundaries (retry on 502), never in pages.
5. **Hardcoded waits** — `new WebDriverWait(driver, Duration.ofSeconds(30))` copied 50 times, then one page needs 60. Wait timeout belongs in config/strategy.
6. **Test interdependence** — test B assumes test A created the user. Random order and parallel kill you. Each test seeds via API (Builder + Factory) and cleans up.
7. **Copying POM per test** — `loginEmail` locator in 12 classes. Drift. One LoginPage / Header component.
8. **Related extras to mention if time:** implicit+explicit mix, PageFactory caching, STANDARD shared data, utils dumping ground, keyword Excel as the only API, asserting in pages, Law-of-Demeter chains.

When NOT to be dogmatic: a 20-line BaseTest that only starts the driver is not a God. A one-off sleep while reproducing a bug locally is not a util.

**Code**

```java
// 1 God BaseTest — symptom
public abstract class BaseTest { /* driver, login, excel, db, report, waits, users */ }

// 2+7 static / singleton driver
public class Driver { public static WebDriver instance; }

// 3 sleep util
public final class WaitUtils {
    public static void pause(int seconds) {
        try { Thread.sleep(seconds * 1000L); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}

// 4 swallowing
public void click(By by) {
    try { driver.findElement(by).click(); }
    catch (Exception ignored) {}                     // test continues, oracle is a lie
}

// 5 hardcoded wait in a page
new WebDriverWait(driver, Duration.ofSeconds(45)).until(/* ... */);

// 6 interdependence
@Test(priority = 1) public void createUser() { /* writes Shared.userId */ }
@Test(priority = 2) public void userCanBuy() { /* needs Shared.userId */ }

// 8 copied POM
public class CheckoutTest {
    By email = By.id("email");                       // also in LoginTest, RegisterTest, HeaderTest
}

// Replacements (pointers)
// listeners + helpers          — God BaseTest
// DriverManager ThreadLocal    — static/singleton driver
// WaitStrategy explicit        — sleep util / hardcoded waits
// catch HttpStatusException    — catch Exception
// OrderFactory per test        — interdependence
// LoginPage / Header           — copied locators
```

**Follow-ups & traps**
- "Which one is the most common in Selenium Java shops?" — Static driver and Thread.sleep, then God BaseTest. Name them in that order.
- "Is TestNG `dependsOnMethods` always an anti-pattern?" — For functional independence, yes. For a true setup method in the same class that cannot be a `@BeforeMethod`, it is a smell, not always a block.
- Weak answer: listing anti-patterns without a replacement.
- Trap: replacing sleep with `WebDriverWait` of 120 seconds globally. You traded flake for a slow suite.

**Senior/lead angle** — Turn the catalog into CI gates: ArchUnit (no static WebDriver, pages don't import JDBC), Checkstyle/PMD (no `Thread.sleep`, no `catch (Exception)`), PR template checkboxes. Culture plus gates; slides alone don't kill sleep utils.

**One-liner** — God BaseTest, static/singleton driver, sleep utils, swallowed exceptions, hardcoded waits, coupled tests, copied locators — each has a named replacement in this file.

### Q14. Design a Driver + Page + Data + Report architecture on a whiteboard

**Interview answer** — Four layers plus tests: Driver (session lifecycle, factory, wait adapter), Page (locators, components, flows), Data (builders, API factories, auth mementos), Report (observers, artifacts). Dependencies point down: tests → flows/pages/data → driver/report/config. Report never calls pages; pages never call report; data factories never import locators. Parallel-safety is a Driver+Data property: ThreadLocal sessions, unique data, no singletons with state.

**Deep dive** — Draw this, then walk responsibilities:

```text
                    ┌────────────── tests ──────────────┐
                    │  oracles, tags, no locators       │
                    └───────┬──────────────┬────────────┘
                            │              │
                   ┌────────▼──┐     ┌─────▼─────┐
                   │  flows    │     │  data     │
                   │  Facade   │     │  Builder  │
                   │  Mediator │     │  Factory  │
                   └────┬──────┘     │  Memento  │
                        │            └─────┬─────┘
                   ┌────▼──────┐           │
                   │  pages    │           │
                   │  Composite│           │
                   └────┬──────┘           │
                        │                  │
              ┌─────────▼─────────┐  ┌─────▼─────┐
              │  driver           │  │  api      │
              │  Factory, TL      │  │  CoR      │
              │  Strategy waits   │  │  Decorator│
              │  Decorator logs   │  └───────────┘
              │  Proxy (Grid)     │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐     ┌──────────────┐
              │  config (facts)   │     │  report      │
              │  Singleton/record │     │  Observer    │
              └───────────────────┘     │  screenshots │
                                        └──────▲───────┘
                                               │
                                        runner events
```

Responsibilities:
- **Driver:** create/quit per test thread; capabilities; wrap WebDriver; no business locators.
- **Page:** UI contract; components for header/cart; no asserts, no JDBC, no Extent.
- **Data:** unique payloads; API create/delete; auth snapshot; no WebDriver.
- **Report:** subscribe to runner; attach artifacts from driver on failure; flush at suite end.

Dependency direction (enforce with ArchUnit): `tests → flows → pages → driver`. `tests → data → api`. `report` depends on runner + driver (for screenshots), not on pages. `config` depends on nothing. When NOT to add a fifth layer: a "business keyword" interpreter. Flows *are* that layer.

**Code**

```java
// Package rules matching the whiteboard (what I'd write after drawing).

@AnalyzeClasses(packages = "com.company.automation")
public class ArchitectureTest {

    @ArchTest
    static final ArchRule tests_dont_import_chrome =
            noClasses().that().resideInAPackage("..tests..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("org.openqa.selenium.chrome..", "io.appium.java_client..");

    @ArchTest
    static final ArchRule pages_dont_report_or_query_db =
            noClasses().that().resideInAPackage("..pages..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("..infra.report..", "java.sql..", "com.aventstack.extentreports..");

    @ArchTest
    static final ArchRule data_does_not_depend_on_pages =
            noClasses().that().resideInAPackage("..data..")
                    .should().dependOnClassesThat().resideInAPackage("..pages..");

    @ArchTest
    static final ArchRule driver_does_not_depend_on_tests =
            noClasses().that().resideInAPackage("..infra.driver..")
                    .should().dependOnClassesThat().resideInAPackage("..tests..");
}

// Runtime skeleton matching the boxes
public final class DriverLayer {
    public static void start() { DriverManager.start(); }          // Factory + ThreadLocal
    public static void stop() { DriverManager.stop(); }
}

public final class ReportLayer implements ITestListener {          // Observer — see Q2
    public void onTestFailure(ITestResult r) { /* screenshot from DriverManager */ }
}

// A test that respects the arrows
public class SmokeCheckoutTest {
    @Test
    public void guestCheckout() {
        OrderPayload data = OrderBuilder.guest().build();          // Data
        ConfirmationPage page = new CheckoutFlow(browser).placeOrder(data); // Page via Flow
        assertThat(page.banner()).contains("thank you");           // oracle here
    }
}
```

**Follow-ups & traps**
- "Where does Appium live?" — Same Driver box, different provider (Factory/Abstract Factory). Pages become Screens; Data and Report stay.
- "Where does CI fit?" — Outside the diagram: it invokes the runner, collects `target/extent.html` and screenshots as artifacts. Don't put Jenkins into the Java DAG.
- Weak answer: folders without arrows. Architecture is the edges.
- Trap: Report calling CheckoutFlow to "log the order id" — that's a hidden dependency; pass the id from the test or a listener context.

**Senior/lead angle** — This diagram is the contract with other teams: they may add pages and flows in their domain packages; they may not add statics in Driver or assertions in Report. Scale is more teams on the same DAG, not more patterns. If you can draw this from memory and defend each arrow, you have cleared the design loop.

**One-liner** — Tests down to flows/pages/data down to driver/api, report observes the runner — four responsibilities, one direction, no singleton sessions.
