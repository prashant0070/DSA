# Creational & Structural Patterns in Automation

Creational patterns answer "who builds the driver, the client, the test data?" Structural patterns answer "how do those pieces sit together without the tests knowing?" SDET interviews want the framework story: Singleton config vs the parallel-unsafe WebDriver singleton, Factory vs Abstract Factory vs Builder, why pooling browsers is usually wrong, Facade vs a God page, Decorator vs inheritance for screenshots, and when Adapter/Bridge/Flyweight are real versus résumé stuffing.

- Q1. Singleton — ConfigReader OK; WebDriver Singleton NOT OK in parallel
- Q2. Factory Method — DriverFactory.create(BrowserType)
- Q3. Abstract Factory — Android vs iOS page objects / cloud vs local factories
- Q4. Builder — test data (OrderBuilder) and ChromeOptions builder-style
- Q5. Prototype — cloning test data objects (and why copy constructors / records are enough)
- Q6. Object Pool — WebDriver pooling: why people try it and why it is usually a bad idea
- Q7. Facade — CheckoutFacade orchestrating CartPage + AddressPage + PaymentPage
- Q8. Adapter — wrapping a device-farm client; wrapping Selenium vs Playwright (usually don't)
- Q9. Decorator — EventFiringDecorator / ApiClient retry+metrics
- Q10. Proxy — lazy page, remote grid, and the PageFactory proxy (stale risk)
- Q11. Bridge — platform (Android/iOS) × feature pages
- Q12. Composite — a Header component containing Menu + Search + Cart widgets
- Q13. Flyweight — sharing read-only locators/config (don't over-apply)
- Q14. How you choose among Factory vs Builder vs Abstract Factory in a real framework

### Q1. Singleton — ConfigReader OK; WebDriver Singleton NOT OK in parallel

**Interview answer** — Singleton is one instance with global access. I use it for immutable configuration loaded once from env/files — a single source of truth with no session state. I never use it for WebDriver: in TestNG `parallel="methods"` every thread would drive the same browser, interleave navigation, and leak cookies. If someone asks me to write a Singleton, I can do enum, Bill Pugh, or double-checked locking with `volatile`, and then I tell them why the driver still should not be one.

**Deep dive** — Structure: `ConfigReader.getInstance()` → one Config sitting in static storage, read-only after load. UML-in-words: many tests → Config (ok); many tests → one WebDriver (not ok). Thread safety: a naive `if (instance == null) instance = new ...` is broken under concurrency (two threads can both see null). Double-checked locking works in Java only if the field is `volatile` (JMM: otherwise the constructed object can be published uninitialized). Bill Pugh (holder idiom) uses the classloader's initialization lock. Enum singleton is the Effective Java recommendation — serialization-safe, reflection-safe. Trade-off: even a "correct" Singleton is hidden global state, awkward to override in unit tests, and a magnet for mutable fields ("I'll just add a setter"). When NOT to use: anything per-test, per-thread, or per-user — driver, Rest Assured RequestSpecification with a user token, ExtentTest instance, Appium session. Grid already multiplexes browsers; your process should not.

**Code**

```java
// ----- Acceptable: immutable config, enum singleton -----
public enum ConfigReader {
    INSTANCE;

    private final String baseUrl;
    private final BrowserType browser;
    private final Duration timeout;
    private final URI gridUrl;

    ConfigReader() {
        this.baseUrl = required("BASE_URL");
        this.browser = BrowserType.valueOf(envOr("BROWSER", "CHROME"));
        this.timeout = Duration.ofSeconds(Long.parseLong(envOr("TIMEOUT_SEC", "20")));
        this.gridUrl = URI.create(envOr("GRID_URL", "http://localhost:4444"));
    }

    public String baseUrl() { return baseUrl; }
    public BrowserType browser() { return browser; }
    public Duration timeout() { return timeout; }
    public URI gridUrl() { return gridUrl; }

    private static String required(String key) {
        String v = System.getenv(key);
        if (v == null || v.isBlank()) throw new IllegalStateException("Missing " + key);
        return v;
    }
    private static String envOr(String key, String fallback) {
        String v = System.getenv(key);
        return (v == null || v.isBlank()) ? fallback : v;
    }
}

// ----- Bill Pugh holder (if you must avoid enum, e.g. to implement an interface) -----
public final class ConfigHolder {
    private ConfigHolder() {}
    private static final class Holder {
        private static final ConfigHolder INSTANCE = new ConfigHolder();
    }
    public static ConfigHolder getInstance() { return Holder.INSTANCE; }
}

// ----- Double-checked locking (interview trivia — note volatile) -----
public final class LazyConfig {
    private static volatile LazyConfig instance;
    private LazyConfig() { /* load files once */ }
    public static LazyConfig getInstance() {
        LazyConfig local = instance;
        if (local == null) {
            synchronized (LazyConfig.class) {
                local = instance;
                if (local == null) instance = local = new LazyConfig();
            }
        }
        return local;
    }
}

// ----- ANTI-PATTERN: WebDriver singleton. Works serially, explodes in parallel. -----
public final class DriverSingleton {                 // DO NOT SHIP
    private static WebDriver instance;
    public static WebDriver get() {
        if (instance == null) instance = new ChromeDriver();  // not even thread-safe
        return instance;
    }
}

// ----- Replacement: ThreadLocal factory, one session per test thread -----
public final class DriverManager {
    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();
    private DriverManager() {}

    public static void start() {
        DRIVER.set(DriverFactory.create(ConfigReader.INSTANCE.browser()));
    }
    public static WebDriver get() {
        WebDriver d = DRIVER.get();
        if (d == null) throw new IllegalStateException("No driver for this thread");
        return d;
    }
    public static void stop() {
        WebDriver d = DRIVER.get();
        if (d != null) {
            d.quit();
            DRIVER.remove();                         // critical: thread pools reuse threads
        }
    }
}
```

**Follow-ups & traps**
- "Is double-checked locking still broken?" — Without `volatile`, yes. With `volatile` on the instance field (Java 5+), it is correct and still more error-prone than enum/holder. Prefer those.
- "Playwright's browser fixture is a singleton, right?" — Per worker, not global, and each test gets an isolated context. Scoping is the whole point; a Java singleton has process scope.
- Weak answer: "Singleton so we don't open too many browsers" — cap Grid/node capacity and TestNG thread-count; don't share a session.
- Trap: a Singleton ExtentReports *with* a Singleton ExtentTest. The report object can be shared (append-only, synchronized); the test node cannot — it is per-test state.

**Senior/lead angle** — Platform rule: singletons may hold facts, never sessions. Lint/ArchUnit bans `static WebDriver` and `static AppiumDriver`. Config is loaded once, frozen, and injected as a value; even Config as enum is a convenience, not a requirement — a parsed record passed from the listener is easier to test.

**One-liner** — Enum/holder Singleton for immutable config; ThreadLocal factory for WebDriver — a singleton browser is a parallel-suite time bomb.

### Q2. Factory Method — DriverFactory.create(BrowserType)

**Interview answer** — Factory Method hides construction: tests ask for a browser type and get a configured WebDriver (local Chrome, remote Firefox, Appium UiAutomator2) without `new ChromeDriver(options)` in every class. I keep the factory responsible for capabilities, headless, grid URL, and implicit-wait-zero, so those decisions live in one place.

**Deep dive** — UML-in-words: Test → DriverFactory.create(type) → WebDriver. Classic GoF Factory Method is "subclass decides the product"; in frameworks we usually ship a Simple Factory (one class, switch or map) and only graduate to a registry of providers (OCP, see the SOLID file) when external teams add browsers. Related: Abstract Factory produces a *family*; Factory Method produces *one* product. Trade-off: a factory that also starts Appium servers, authenticates to BrowserStack, and writes video flags becomes a God Factory — split capability builders from session creation. When NOT to use: a suite locked to one local Chrome; `new ChromeDriver()` in a 20-line BaseTest is fine. When it is mandatory: cross-browser CI, local vs grid, web vs mobile. Creation is also the right place to wrap the product in Decorators (logging) — the caller still receives WebDriver.

**Code**

```java
public enum BrowserType { CHROME, FIREFOX, EDGE, ANDROID, IOS }

public final class DriverFactory {
    private DriverFactory() {}

    public static WebDriver create(BrowserType type) {
        return switch (type) {
            case CHROME  -> localChrome();
            case FIREFOX -> localFirefox();
            case EDGE    -> localEdge();
            case ANDROID -> android();
            case IOS     -> ios();
        };
    }

    private static WebDriver localChrome() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--disable-dev-shm-usage");
        if (Boolean.parseBoolean(System.getenv("HEADLESS"))) {
            options.addArguments("--headless=new");
        }
        ChromeDriver driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ZERO);
        return driver;
    }

    private static WebDriver localFirefox() {
        FirefoxOptions options = new FirefoxOptions();
        FirefoxDriver driver = new FirefoxDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ZERO);
        return driver;
    }

    private static WebDriver localEdge() {
        return new EdgeDriver(new EdgeOptions());
    }

    private static WebDriver android() {
        UiAutomator2Options caps = new UiAutomator2Options()
                .setPlatformName("Android")
                .setDeviceName(System.getenv().getOrDefault("DEVICE", "Pixel_6"))
                .setApp(System.getenv("APP"));
        try {
            return new AndroidDriver(URI.create("http://127.0.0.1:4723").toURL(), caps);
        } catch (MalformedURLException e) {
            throw new IllegalStateException(e);
        }
    }

    private static WebDriver ios() {
        XCUITestOptions caps = new XCUITestOptions()
                .setPlatformName("iOS")
                .setDeviceName(System.getenv().getOrDefault("DEVICE", "iPhone 15"))
                .setApp(System.getenv("APP"));
        try {
            return new IOSDriver(URI.create("http://127.0.0.1:4723").toURL(), caps);
        } catch (MalformedURLException e) {
            throw new IllegalStateException(e);
        }
    }
}

// Call site in a listener — tests never new a driver.
WebDriver driver = DriverFactory.create(ConfigReader.INSTANCE.browser());
```

**Follow-ups & traps**
- "Factory Method vs Simple Factory vs Abstract Factory?" — Simple Factory: one class, switch. Factory Method: a `create()` hook a subclass overrides. Abstract Factory: family of related products (Android pages + Android driver + Android waits). In interviews, `DriverFactory.create` is the expected SDET example; name the distinction.
- "Where do ChromeOptions live?" — Either in the factory or in a ChromeOptions Builder (Q4). Don't scatter `addArguments` in tests.
- Weak answer: a factory that only `return new ChromeDriver()` with no branching — that is indirection, not a factory.
- Trap: caching the created driver inside the factory as a static. You have invented Singleton again.

**Senior/lead angle** — The factory is a published seam of the shared core. Teams pass BrowserType + a capabilities overlay; they do not fork the factory. Remote vs local is a provider or an env flag inside create(), not a second factory copied into each repo.

**One-liner** — Tests call `DriverFactory.create(type)` and get a configured session; construction, capabilities, and implicit-wait-zero live there, not in the test.

### Q3. Abstract Factory — family of Android vs iOS page objects / cloud vs local factories

**Interview answer** — Abstract Factory creates a *family* of related objects that must match: an Android factory returns AndroidDriver, AndroidHomeScreen, AndroidWaitStrategy; an iOS factory returns the iOS siblings. The test depends on the abstract factory and abstract products, so it cannot accidentally pair an iOS screen with an Android driver. I also use it for Local vs Cloud (Grid/BrowserStack) families: driver + artifact collector + session namer that all agree on where the browser lives.

**Deep dive** — UML-in-words: PlatformFactory ← AndroidFactory, IosFactory. Products: MobileDriver, HomeScreen, CartScreen, GestureService. Test → PlatformFactory → (driver, screens). Contrast with Factory Method: one product (a driver) vs a set that must be consistent. Trade-off: class count explodes (2 platforms × N screens). When NOT to use: web-only Selenium, or mobile where 90% of locators are already in a shared YAML and screens are parameterized. Over-applying Abstract Factory is the classic résumé pattern — if your "family" has one member, you wanted Factory Method. Cloud vs local is a good family when artifacts differ (local screenshots to disk, cloud via vendor API) *and* capability construction differs. If only the URL of the hub changes, a parameterized Factory Method is enough.

**Code**

```java
public interface HomeScreen {
    void skipOnboarding();
    CartScreen openCart();
}

public interface CartScreen {
    void checkout();
}

public interface GestureService {
    void swipeUp();
}

public interface MobilePlatformFactory {
    AppiumDriver driver();
    HomeScreen home();
    CartScreen cart();
    GestureService gestures();
}

public final class AndroidFactory implements MobilePlatformFactory {
    private final AndroidDriver driver;

    public AndroidFactory(URL appium, UiAutomator2Options caps) {
        this.driver = new AndroidDriver(appium, caps);
    }
    public AppiumDriver driver() { return driver; }
    public HomeScreen home() { return new AndroidHomeScreen(driver); }
    public CartScreen cart() { return new AndroidCartScreen(driver); }
    public GestureService gestures() { return new AndroidGestures(driver); }
}

public final class IosFactory implements MobilePlatformFactory {
    private final IOSDriver driver;

    public IosFactory(URL appium, XCUITestOptions caps) {
        this.driver = new IOSDriver(appium, caps);
    }
    public AppiumDriver driver() { return driver; }
    public HomeScreen home() { return new IosHomeScreen(driver); }
    public CartScreen cart() { return new IosCartScreen(driver); }
    public GestureService gestures() { return new IosGestures(driver); }
}

public final class AndroidHomeScreen implements HomeScreen {
    private static final By SKIP = AppiumBy.accessibilityId("skip");
    private final AndroidDriver driver;
    public AndroidHomeScreen(AndroidDriver driver) { this.driver = driver; }
    public void skipOnboarding() { driver.findElement(SKIP).click(); }
    public CartScreen openCart() { /* ... */ return new AndroidCartScreen(driver); }
}

// Cloud vs local as another family — products that must agree on session location.
public interface SessionFactory {
    WebDriver driver();
    ArtifactSink artifacts();          // local disk vs BrowserStack REST
}

public final class LocalSessionFactory implements SessionFactory { /* ChromeDriver + FileSink */ }
public final class CloudSessionFactory implements SessionFactory { /* RemoteWebDriver + VendorSink */ }

@Test
public void addToCartOnCurrentPlatform() {
    MobilePlatformFactory platform = PlatformSelector.fromEnv();  // ANDROID / IOS
    try {
        platform.home().skipOnboarding();
        platform.home().openCart().checkout();
    } finally {
        platform.driver().quit();
    }
}
```

**Follow-ups & traps**
- "Can't I just if/else inside one page?" — You can, and it becomes a platform switch in every method. Abstract Factory pushes that switch to bootstrap.
- "Is this the same as Bridge?" — Related. Abstract Factory *creates* the matching family; Bridge *decouples* an abstraction (CartScreen) from implementors (Android/iOS) so both axes extend independently. You often use both (Q11).
- Weak answer: naming a class AbstractFactory with one `createDriver` method. That is Factory Method wearing a coat.
- Trap: sharing WebDriver-based page objects across Android and iOS through the abstract factory while locators and gestures diverge — LSP violations leak through the family.

**Senior/lead angle** — Introduce Abstract Factory at the second platform, not the first. The published type is `MobilePlatformFactory`; feature teams add screens to the interface with care, because every platform must implement them. For web+mobile, don't force one family — two factories and shared domain flows (Facade) compose better.

**One-liner** — Abstract Factory vends a matching set (Android driver + Android screens + Android gestures); Factory Method vends one driver.

### Q4. Builder — test data (OrderBuilder) and ChromeOptions builder-style

**Interview answer** — Builder constructs a complex object step by step with readable defaults, avoiding telescoping constructors. I use it for test data — `OrderBuilder.guest().withItem("SKU-1").inState("CA").build()` — and for capabilities (`ChromeOptions` is already a builder-style API). The built object is immutable; each test gets its own instance, which is how builders stay parallel-safe.

**Deep dive** — UML-in-words: Test → OrderBuilder → OrderPayload → ApiClient. Director is optional (a `CheckoutScenarios.paidGuest()` that drives the builder). ChromeOptions/FirefoxOptions/UiAutomator2Options are fluent builders the Selenium/Appium teams already gave you — don't wrap them unless you need org defaults (headless, disable-dev-shm, logging prefs) applied once. Trade-off: a builder per entity is more code than a Map. Worth it when fields are many, optional, or need validation (`build()` throws if no items). When NOT to use: three required fields and no defaults — a constructor or a record is clearer. Builder vs Factory: Builder shapes *what* the object looks like (no side effects); Factory *performs* creation (HTTP POST, driver launch) and may accept a built payload. They compose: `orderApi.create(new OrderBuilder().asGuest().build())`. Rest Assured's `RequestSpecBuilder` is the same pattern on the HTTP side.

**Code**

```java
public record OrderItem(String sku, int qty) {}
public record Address(String line1, String state, String zip) {}
public record Card(String pan, String exp, String cvc) {}
public record OrderPayload(List<OrderItem> items, Address address, Card card, String email) {}

public final class OrderBuilder {
    private final List<OrderItem> items = new ArrayList<>();
    private Address address = new Address("1 Market St", "CA", "94105");
    private Card card = Cards.VALID;
    private String email = "user-" + UUID.randomUUID() + "@example.test";

    public static OrderBuilder guest() { return new OrderBuilder(); }

    public OrderBuilder withItem(String sku, int qty) {
        items.add(new OrderItem(sku, qty));
        return this;
    }
    public OrderBuilder inState(String state) {
        address = new Address(address.line1(), state, address.zip());
        return this;
    }
    public OrderBuilder withCard(Card card) {
        this.card = card;
        return this;
    }
    public OrderPayload build() {
        if (items.isEmpty()) items.add(new OrderItem("SKU-DEFAULT", 1));
        return new OrderPayload(List.copyOf(items), address, card, email);
    }
}

public final class Cards {
    public static final Card VALID = new Card("4111111111111111", "12/30", "123");
    public static final Card DECLINED = new Card("4000000000000002", "12/30", "123");
}

// ChromeOptions is already builder-style — centralize org defaults.
public final class ChromeOptionsFactory {
    private ChromeOptionsFactory() {}
    public static ChromeOptions standard() {
        return new ChromeOptions()
                .addArguments("--disable-dev-shm-usage")
                .addArguments("--window-size=1920,1080")
                .setAcceptInsecureCerts(true);
    }
    public static ChromeOptions headless() {
        return standard().addArguments("--headless=new");
    }
}

// Rest Assured RequestSpecBuilder — same idea for API clients.
public static RequestSpecification spec(String baseUri, String token) {
    return new RequestSpecBuilder()
            .setBaseUri(baseUri)
            .setContentType(ContentType.JSON)
            .addHeader("Authorization", "Bearer " + token)
            .log(LogDetail.URI)
            .build();
}

@Test
public void declinedCardIsRejected() {
    OrderPayload order = OrderBuilder.guest()
            .withItem("SKU-1", 1)
            .withCard(Cards.DECLINED)
            .build();
    new CheckoutFacade(browser).placeOrder(order);
    assertThat(new PaymentPage(browser).error()).contains("declined");
}
```

**Follow-ups & traps**
- "Builder vs telescoping constructor vs optional parameters?" — Java has no named params; builder (or a parameter object record) is how we keep call sites readable. Don't write 8 overloads.
- "Should the builder POST to the API?" — No. Side effects belong in a Factory (`OrderFactory.create` that tracks ids for teardown). The builder stays pure so you can also use it to fill a UI form.
- Weak answer: a builder with 40 setters and no defaults/validation. You have a mutable JavaBean with extra typing.
- Trap: a static `OrderBuilder.STANDARD` reused across tests — you smuggled a Singleton into a Builder.

**Senior/lead angle** — Publish builders for the core domain entities in the shared core, with unique defaults (UUID emails) so parallel is the happy path. Teams add `withX` methods; they don't add `STANDARD_CHECKOUT`. A director class of named scenarios is optional sugar, not a second data source.

**One-liner** — Builder makes intent-visible, immutable test data (and options); Factory consumes that data to create sessions or server-side entities.

### Q5. Prototype — cloning test data objects (and why copy constructors / records are enough)

**Interview answer** — Prototype copies an existing object instead of constructing from scratch — useful when a fully valid Order is expensive to describe and you want "that, but declined card." In Java I almost never implement `Cloneable` (it's broken: shallow copy, checked CloneNotSupportedException, mixed conventions). I use a copy constructor, `record` withers, or Jackson round-trip. Prototype is worth naming in interviews; it is rarely worth a Prototype registry in a test framework.

**Deep dive** — UML-in-words: Prototype (OrderPayload) ← clone() → new OrderPayload. GoF includes a Prototype Manager (a map of named prototypes). In test data, that manager becomes "the STANDARD order again" (coupling). Cheap, honest versions: `order.withCard(Cards.DECLINED)` on a record, or `new OrderPayload(base.items(), base.address(), Cards.DECLINED, base.email())`. Deep vs shallow: if items is a mutable list, a shallow clone shares the list and two tests mutate each other — the same class of bug as a Singleton. When Prototype *is* justified: copying a BrowserContext's storage (Playwright `storageState`, Selenium cookie set) is conceptually a memento/prototype of auth, cheaper than logging in. Cloning WebDriver itself is not a thing. When NOT to use: as a substitute for a builder. If you find yourself cloning then mutating six fields, you wanted a builder from defaults.

**Code**

```java
// Records give copy-by-construction without Cloneable.
public record OrderPayload(List<OrderItem> items, Address address, Card card, String email) {
    public OrderPayload {
        items = List.copyOf(items);                   // defensive, freeze
    }
    public OrderPayload withCard(Card card) {
        return new OrderPayload(items, address, card, email);
    }
    public OrderPayload withEmail(String email) {
        return new OrderPayload(items, address, card, email);
    }
}

OrderPayload guest = OrderBuilder.guest().withItem("SKU-1", 1).build();
OrderPayload declined = guest.withCard(Cards.DECLINED);   // "prototype" via copy

// Copy constructor for non-records.
public final class UserData {
    private final String email;
    private final Set<String> roles;
    public UserData(String email, Set<String> roles) {
        this.email = email;
        this.roles = Set.copyOf(roles);
    }
    public UserData(UserData other) {                 // deep-enough copy
        this(other.email, other.roles);
    }
    public UserData withRole(String role) {
        Set<String> next = new HashSet<>(roles);
        next.add(role);
        return new UserData(email, next);
    }
}

// AVOID Cloneable in framework code.
public final class FragileOrder implements Cloneable {
    public List<OrderItem> items;                     // mutable, shallow clone shares this
    @Override public FragileOrder clone() {
        try { return (FragileOrder) super.clone(); }  // SHALLOW — two tests, one list
        catch (CloneNotSupportedException e) { throw new AssertionError(e); }
    }
}

// Auth "prototype" that is actually a memento — copy cookies onto a fresh driver.
public final class CookieSnapshot {
    private final Set<Cookie> cookies;
    public CookieSnapshot(WebDriver driver) {
        this.cookies = Set.copyOf(driver.manage().getCookies());
    }
    public void restoreOnto(WebDriver driver) {
        driver.get(ConfigReader.INSTANCE.baseUrl());  // domain must be set first
        cookies.forEach(c -> driver.manage().addCookie(c));
        driver.navigate().refresh();
    }
}
```

**Follow-ups & traps**
- "Why is Cloneable broken?" — `clone()` is not in the Cloneable contract as a public method; Object.clone is protected and shallow; mixing Cloneable with inheritance is a minefield. Say "I use copy constructors" — that is the senior Java answer.
- "Prototype vs Builder?" — Prototype starts from an existing instance; Builder starts from defaults. Prefer Builder for test data; copy methods for small variants.
- Weak answer: a Prototype Manager of twelve named orders in a static map. That is the STANDARD fixture anti-pattern (SOLID Q8).
- Trap: cloning page objects that hold a WebDriver. You copy the wrapper, not the browser, and two pages fight over one session.

**Senior/lead angle** — Standardize on immutable records plus `withX` in the data layer. Ban `Cloneable` in the core. Treat auth snapshots as mementos with an explicit restore, not as magically cloned drivers.

**One-liner** — Clone test data with records and copy constructors, not Cloneable; if you need a named catalog of prototypes, you probably wanted a builder and unique data.

### Q6. Object Pool — WebDriver pooling: why people try it and why it is usually a bad idea

**Interview answer** — Object Pool reuses expensive instances instead of constructing them per use. People pool WebDrivers because browsers are slow to launch, then they spend months debugging dirty sessions — leftover cookies, open tabs, unpaid carts, stuck alerts, geolocation permissions, downloaded files. Selenium Grid, cloud farms, and Playwright's worker-scoped browser already pool the *process*; your tests should still take a clean session (new WebDriver, or at least a new context). I do not pool drivers in the test process.

**Deep dive** — UML-in-words: Pool holds N WebDrivers; test checks out, uses, checks in. Required for a correct pool: reset protocol that is *as strict as a new session* (delete all cookies, close extra windows, clear storage, dismiss alerts, reset timeouts, uninstall leftover mobile apps). That reset is slower and flakier than `quit()` + `create()` against a warm Grid node. Grid's job *is* to keep browser processes/VMs warm and hand you a fresh session via W3C New Session. Pooling on top duplicates that, without the isolation guarantee. Legitimate pools in SDET-land: a pool of *test user accounts* (with lease/heartbeat so parallel tests don't share a login), a pool of ephemeral DB schemas, a pool of Appium devices (the farm's scheduler). When a driver pool might be justified: a local suite of thousands of ultra-short tests on one machine with no Grid, and a reset you have proven in CI — still unusual. When NOT: any parallel TestNG run, any authenticated flow, any Appium test (device state is even dirtier).

**Code**

```java
// What people build — and why it bites.
public final class DriverPool {                       // usually a bad idea
    private final BlockingQueue<WebDriver> idle = new LinkedBlockingQueue<>();

    public WebDriver checkout() {
        WebDriver driver = idle.poll();
        if (driver == null) driver = DriverFactory.create(BrowserType.CHROME);
        return driver;
    }
    public void checkin(WebDriver driver) {
        try {
            reset(driver);
            idle.offer(driver);
        } catch (Exception dirty) {
            driver.quit();                            // at least don't return a known-dirty one
        }
    }
    private void reset(WebDriver driver) {            // never actually complete
        driver.manage().deleteAllCookies();
        driver.get("about:blank");
        // missed: localStorage, sessionStorage, indexedDB, open tabs,
        // unexpected alerts, Chrome download dir, permissions, service workers...
    }
}

// Prefer: Grid/cloud pools browsers; you take a fresh session per test.
public final class DriverListener implements ITestListener, IInvokedMethodListener {
    @Override
    public void beforeInvocation(IInvokedMethod method, ITestResult result) {
        if (method.isTestMethod()) DriverManager.start();   // New Session against Grid
    }
    @Override
    public void afterInvocation(IInvokedMethod method, ITestResult result) {
        if (method.isTestMethod()) DriverManager.stop();    // quit; node is reused by Grid
    }
}

// A pool that *does* belong in a framework: leased test users.
public final class UserPool {
    private final BlockingQueue<User> idle;
    public UserPool(Collection<User> users) { this.idle = new LinkedBlockingQueue<>(users); }

    public LeasedUser borrow() throws InterruptedException {
        User user = idle.take();
        return new LeasedUser(user, () -> idle.offer(user));
    }

    public record LeasedUser(User user, Runnable giveBack) implements AutoCloseable {
        public void close() { giveBack.run(); }
    }
}
```

**Follow-ups & traps**
- "But launch time dominates our suite." — Warm the Grid (or use Playwright's reused browser + new context). Measure: session create vs test body. If create is the cost, more nodes beat a dirty pool.
- "Playwright reuses the browser — isn't that a pool?" — Browser process reused, *context* (cookies, storage) is per test. That is the isolation boundary you would be inventing, badly, in Selenium.
- Weak answer: "We pool and call deleteAllCookies." That is the incomplete reset.
- Trap: pooling Appium sessions. You inherit the previous app's user, notifications, and iOS permission state.

**Senior/lead angle** — If engineers propose a driver pool, require a written reset contract and a canary test that fails if state leaks (leave a cookie, next test must not see it). Almost every design review should end with "use Grid, quit per test." Spend pooling engineering on accounts and devices.

**One-liner** — Grid already pools browsers; pooling WebDriver inside the JVM leaves dirty sessions — quit per test, lease users and devices instead.

### Q7. Facade — CheckoutFacade orchestrating CartPage + AddressPage + PaymentPage

**Interview answer** — Facade gives tests one simple method over a messy subsystem. `CheckoutFacade.placeOrder(order)` walks CartPage, AddressPage, PaymentPage, and ConfirmationPage so the test reads as a scenario and the four-page dance lives in one place. Pages stay small (SRP); the facade is allowed to know all of them. That is also how I keep API+UI hybrids readable: `placeOrderViaApiThenOpenConfirmation()`.

**Deep dive** — UML-in-words: Test → CheckoutFacade → {CartPage, AddressPage, PaymentPage, ConfirmationPage} → ElementActions → WebDriver. Facade is not a God page: it should hold *no locators*. If it starts growing `By` fields, it has become the God object you extracted it from. Related: Mediator also coordinates, but Mediator's job is to stop colleagues talking to each other; Facade's job is to hide a subsystem from an outside client (the test). In practice CheckoutFacade is both. Trade-off: a facade per journey can duplicate overlapping steps (login, accept cookies). Extract those as helpers/components, not as a MegaFacade. When NOT to use: a test whose point *is* the address-form validation should talk to AddressPage directly. Facades hide interior details — bad when the interior is the spec. Keyword frameworks that wrap every facade method as a spreadsheet verb usually overgrow this pattern (YAGNI).

**Code**

```java
public final class CheckoutFacade {
    private final CartPage cart;
    private final AddressPage address;
    private final PaymentPage payment;
    private final ConfirmationPage confirmation;

    public CheckoutFacade(Browser browser) {
        this.cart = new CartPage(browser);
        this.address = new AddressPage(browser);
        this.payment = new PaymentPage(browser);
        this.confirmation = new ConfirmationPage(browser);
    }

    public ConfirmationPage placeOrder(OrderPayload order) {
        cart.addAll(order.items());
        cart.proceed();
        address.fill(order.address());
        address.continueToPayment();
        payment.pay(order.card());
        return confirmation.waitUntilLoaded();
    }

    public PaymentPage toPayment(OrderPayload order) {   // partial journey for payment-focused tests
        cart.addAll(order.items());
        cart.proceed();
        address.fill(order.address());
        address.continueToPayment();
        return payment;
    }
}

public final class OrderApiFacade {                      // API subsystem hidden the same way
    private final ApiClient api;
    public Order created(OrderPayload payload) {
        User user = api.post("/users", Map.of("email", payload.email()), User.class);
        Cart cart = api.post("/carts", Map.of("userId", user.id()), Cart.class);
        payload.items().forEach(i -> api.post("/carts/" + cart.id() + "/items", i, Void.class));
        return api.post("/orders", Map.of("cartId", cart.id()), Order.class);
    }
}

@Test
public void guestCheckoutSucceeds() {
    OrderPayload order = OrderBuilder.guest().withItem("SKU-1", 1).build();
    ConfirmationPage done = new CheckoutFacade(browser).placeOrder(order);
    assertThat(done.banner()).contains("thank you");
}

@Test
public void apiPlacedOrderShowsInUi() {
    Order created = new OrderApiFacade(api).created(OrderBuilder.guest().build());
    browser.open("/orders/" + created.id());
    assertThat(new ConfirmationPage(browser).orderId()).isEqualTo(created.id());
}
```

**Follow-ups & traps**
- "Facade vs Page Object?" — POM encapsulates a page's locators. Facade encapsulates a journey across pages. You want both. A page named CheckoutPage that does the whole wizard is a facade pretending to be a page (SRP break).
- "Facade vs Screenplay?" — Screenplay makes the actor/task the facade. See the behavioral file comparison. For most Java Selenium teams, POM + Facade is the honest choice.
- Weak answer: a facade that is a pass-through `clickLogin()` wrapping one page method.
- Trap: putting assertions in the facade (`placeAndAssertSuccess`). You have hidden the oracle; tests that need to assert failure cannot use it.

**Senior/lead angle** — Facades are the public API of the automation core for a domain. Review them like production API: stable names, no locators, no asserts, versioned when a journey changes. Tests in downstream repos should import `CheckoutFacade`, not four page classes.

**One-liner** — Tests call `CheckoutFacade.placeOrder`; pages keep locators; the wizard's four steps have one owner.

### Q8. Adapter — wrapping a third-party device-farm client; wrapping Selenium vs Playwright behind a common Driver if you must (usually you shouldn't)

**Interview answer** — Adapter converts an existing API into the one your framework expects. I wrap a vendor device-farm SDK (BrowserStack, Sauce, LambdaTest) behind `DeviceFarm` so the rest of the code starts sessions and fetches videos without importing vendor types. I am much more skeptical of a `Driver` adapter that makes Playwright look like Selenium (or vice versa): you throw away each tool's strengths and debug two leaky abstractions. I'd only do that during a time-boxed migration with a kill date.

**Deep dive** — UML-in-words: Client (DriverFactory) → DeviceFarm (target interface) ← VendorFarmAdapter ← BrowserStackClient (adaptee). Class adapter vs object adapter: in Java we use object adapters (composition). Other SDET adapters: wrapping an old Apache HttpClient utility behind `ApiClient` while Rest Assured becomes the new adaptee; wrapping Android's `UiDevice` gestures behind `GestureService`. Trade-off: every vendor feature you care about (network logs, app live video, accessibility scans) must be mapped or it is lost. When the adapter is worth it: three vendors, or a vendor you might replace, or vendor types you do not want in pages. When NOT: one vendor, forever, and their API is already fine — import it at the infra edge and stop. The Selenium-vs-Playwright common Driver is the interview trap: it looks like DIP, but Locator auto-wait, tracing, and browser contexts have no honest Selenium equivalent, so the adapter either lies (LSP) or exposes `unwrap()` which defeats the adapter.

**Code**

```java
public record FarmSession(String id, URL wdUrl, Capabilities caps) {}

public interface DeviceFarm {
    FarmSession start(String browser, String os);
    Path downloadVideo(String sessionId);
    void annotate(String sessionId, String message);
    void close(String sessionId, boolean passed);
}

public final class BrowserStackFarm implements DeviceFarm {
    private final BrowserStackClient vendor;          // third-party SDK you do not want in tests

    public BrowserStackFarm(String user, String key) {
        this.vendor = new BrowserStackClient(user, key);
    }
    public FarmSession start(String browser, String os) {
        Session s = vendor.createSession(browser, os);
        return new FarmSession(s.getId(), s.getWebDriverUrl(), s.getCaps());
    }
    public Path downloadVideo(String sessionId) {
        return vendor.saveVideo(sessionId, Path.of("artifacts", sessionId + ".mp4"));
    }
    public void annotate(String sessionId, String message) {
        vendor.sendLog(sessionId, message);
    }
    public void close(String sessionId, boolean passed) {
        vendor.mark(sessionId, passed ? "passed" : "failed");
        vendor.end(sessionId);
    }
}

// DriverFactory talks to DeviceFarm, not to BrowserStackClient.
public static WebDriver remote(DeviceFarm farm, String browser, String os) {
    FarmSession session = farm.start(browser, os);
    return new RemoteWebDriver(session.wdUrl(), session.caps());
}

// The adapter I usually refuse — a lowest-common-denominator Driver.
public interface UniversalDriver {                    // tempting, usually wrong
    void gotoUrl(String url);
    void click(String selector);
    void fill(String selector, String value);
}
public final class SeleniumUniversalAdapter implements UniversalDriver {
    public void click(String selector) { /* By.cssSelector, no auto-wait */ }
}
public final class PlaywrightUniversalAdapter implements UniversalDriver {
    public void click(String selector) { /* page.locator — different semantics */ }
}
// Callers cannot use getByRole, traces, routing, or Appium gestures without unwrap().
```

**Follow-ups & traps**
- "Adapter vs Facade vs Decorator vs Proxy?" — Adapter: foreign shape → our shape. Facade: many of ours → one simple API. Decorator: same interface, added behavior. Proxy: same interface, added control (lazy, remote, access). Same wrapping drawing, different intent.
- "How would you migrate Selenium to Playwright?" — Strangler: new tests in Playwright, old tests stay, share API/data/report. Not a UniversalDriver.
- Weak answer: "I'd write an adapter so we can switch tools anytime." You won't, and you will debug the adapter weekly.
- Trap: adapting Rest Assured by wrapping every HTTP verb but still using `RestAssured.baseURI` statics — the adaptee's global state leaks.

**Senior/lead angle** — Vendor adapters belong in `infra.farm` with a contract test against a recorded session. Tool-to-tool universal drivers require an ADR that names the migration end date; without that date, reject the PR. Leads protect the team from abstraction theater.

**One-liner** — Adapt vendor SDKs behind DeviceFarm; do not adapt Selenium and Playwright into one Driver unless a dated migration forces you to.

### Q9. Decorator — WebDriverListener / EventFiringDecorator (Selenium 4) for logging/screenshots; wrapping ApiClient with retry/metrics

**Interview answer** — Decorator wraps an object, implements the same interface, and adds behavior before/after delegating. In Selenium 4 I wrap WebDriver with `EventFiringDecorator` and a `WebDriverListener` to log commands and screenshot on exception — pages still receive WebDriver. I do the same for ApiClient: `RetryingApiClient` and `MetricsApiClient` wrap the Rest Assured adapter so tests never see retry loops.

**Deep dive** — UML-in-words: Test/Page → WebDriver (interface) ← LoggingDecorator ← ScreenshotDecorator ← ChromeDriver. Decorators compose in a chain (onion). Selenium 3's `EventFiringWebDriver` is deprecated; Selenium 4's `EventFiringDecorator<WebDriver>` + `WebDriverListener` is the supported form — it generates a proxy that implements all the driver interfaces (JavascriptExecutor, TakesScreenshot) so LSP is easier to keep than a hand-written wrapper that forgets `getScreenshotAs`. Trade-off: wrapping everything adds latency and can surprise (a logging decorator that `toString`s a WebElement triggers extra commands). When NOT to decorate: one extra log line in the factory. When inheritance is the wrong alternative: `ScreenshotChromeDriver extends ChromeDriver` does not wrap Firefox or Appium. Decorator vs Proxy: Decorator *adds* behavior; Proxy *controls access*. EventFiringDecorator is implemented *with* a proxy, but the pattern you are applying is Decorator.

**Code**

```java
import org.openqa.selenium.support.events.EventFiringDecorator;
import org.openqa.selenium.support.events.WebDriverListener;

public final class ArtifactListener implements WebDriverListener {
    @Override
    public void beforeGet(WebDriver driver, String url) {
        System.out.println("[wd] get " + url);
    }

    @Override
    public void afterClick(WebElement element) {
        System.out.println("[wd] clicked " + element);
    }

    @Override
    public void onError(Object target, Method method, Object[] args, InvocationTargetException e) {
        if (target instanceof TakesScreenshot ts) {
            File shot = ts.getScreenshotAs(OutputType.FILE);
            shot.renameTo(Path.of("artifacts", method.getName() + ".png").toFile());
        }
    }
}

public final class DecoratedDrivers {
    private DecoratedDrivers() {}

    public static WebDriver wrap(WebDriver raw) {
        WebDriverListener artifacts = new ArtifactListener();
        return new EventFiringDecorator<>(artifacts).decorate(raw);
    }
}

// Manual decorator when you own the interface (ApiClient) — stack retry + metrics.
public final class RetryingApiClient implements ApiClient {
    private final ApiClient delegate;
    private final int maxAttempts;

    public RetryingApiClient(ApiClient delegate, int maxAttempts) {
        this.delegate = delegate;
        this.maxAttempts = maxAttempts;
    }

    public <T> T get(String path, Class<T> type) {
        RuntimeException last = null;
        for (int i = 1; i <= maxAttempts; i++) {
            try {
                return delegate.get(path, type);
            } catch (RuntimeException ex) {
                last = ex;
                if (!RetryPolicy.isIdempotentFailure(ex) || i == maxAttempts) throw ex;
            }
        }
        throw last;
    }
    // post/delete similarly; POST is not always safe to retry
}

public final class MetricsApiClient implements ApiClient {
    private final ApiClient delegate;
    public <T> T get(String path, Class<T> type) {
        long t0 = System.nanoTime();
        try {
            return delegate.get(path, type);
        } finally {
            Metrics.timer("api.get", System.nanoTime() - t0, path);
        }
    }
}

ApiClient api = new MetricsApiClient(new RetryingApiClient(new RestAssuredClient(base, token), 3));
WebDriver driver = DecoratedDrivers.wrap(new ChromeDriver(options));
```

**Follow-ups & traps**
- "Why not a TestNG listener for screenshots?" — Use both. TestNG listener: test failed, take a shot of the current page. WebDriverListener: a command failed, you may still have a driver. Don't screenshot in every page method.
- "Can I decorate AppiumDriver?" — Yes, it is a WebDriver. Verify the decorator still exposes AndroidDriver-specific methods you call (hideKeyboard); you may need `EventFiringDecorator<AndroidDriver>` or unwrap for gestures.
- Weak answer: subclassing ChromeDriver to add logs.
- Trap: a decorator that catches Exception and swallows it to "keep going." That is an LSP break of the driver contract.

**Senior/lead angle** — The composition root (factory) is the only place that stacks decorators, so order is defined once: metrics inside, retry next, logging outside — or whatever your policy is. Document the order; it affects which layer sees which exceptions.

**One-liner** — Decorate WebDriver with Selenium 4's EventFiringDecorator and decorate ApiClient with retry/metrics — same interface, stacked behavior, no ChromeDriver subclass.

### Q10. Proxy — lazy page, remote grid, and the PageFactory proxy (stale risk)

**Interview answer** — Proxy stands in for a real object with the same interface: to delay creation, to add access control, or to talk to something remote. Selenium Grid's `RemoteWebDriver` is a remote proxy — your test speaks WebDriver, the node runs the browser. PageFactory's `@FindBy` fields are lazy proxies that `findElement` on first use, which is also why they go stale if you cache the WebElement. I sometimes lazy-proxy heavy page objects; I do not use PageFactory in new work.

**Deep dive** — UML-in-words: Subject (WebDriver) ← Proxy (RemoteWebDriver) ← RealSubject (Chrome on a node). Virtual proxy: lazy page. Protection proxy: a driver proxy that forbids `quit` from tests. Remote proxy: Grid. Selenium PageFactory: `PageFactory.initElements(driver, this)` fills `@FindBy` fields with proxies; each use calls find. That *helps* staleness versus caching a WebElement in `@FindBy` with a custom cache, but people still store the WebElement in a local variable and reuse it after a rerender — StaleElementReferenceException. Playwright locators are a better virtual proxy: re-query every action. Trade-off of lazy page proxies: first-call surprises (Appium session not started yet) and harder debugging. When NOT to use PageFactory: new Selenium frameworks. Prefer explicit `By` + wait in ElementActions. When Grid proxy bites: version skew between client and node, file uploads (`LocalFileDetector`), and timeouts that hide node death as "socket hang up."

**Code**

```java
// Remote proxy — the most important SDET Proxy.
WebDriver driver = new RemoteWebDriver(ConfigReader.INSTANCE.gridUrl().toURL(), new ChromeOptions());
((RemoteWebDriver) driver).setFileDetector(new LocalFileDetector());  // uploads through the proxy

// PageFactory virtual proxies — know it, prefer not to add it.
public class LegacyLoginPage {
    private final WebDriver driver;
    @FindBy(id = "email") private WebElement email;     // proxy, finds on use
    @FindBy(id = "password") private WebElement password;
    @FindBy(css = "[data-testid=login]") private WebElement submit;

    public LegacyLoginPage(WebDriver driver) {
        this.driver = driver;
        PageFactory.initElements(driver, this);
    }
    public void login(String user, String pass) {
        email.sendKeys(user);                           // find now
        password.sendKeys(pass);
        submit.click();
        WebElement cached = submit;                     // DON'T — rerender → stale
        cached.click();
    }
}

// Explicit locators — re-find through waits, no PageFactory proxy.
public final class LoginPage {
    private final ElementActions ui;
    private static final By EMAIL = By.id("email");
    public void login(String user, String pass) {
        ui.type(EMAIL, user);                           // find + wait every call
        ui.type(By.id("password"), pass);
        ui.click(By.cssSelector("[data-testid=login]"));
    }
}

// Lazy page proxy — delay construction until first use (optional, don't overdo).
public final class LazyPage<T> {
    private final Supplier<T> factory;
    private T real;
    public LazyPage(Supplier<T> factory) { this.factory = factory; }
    public T get() {
        if (real == null) real = factory.get();
        return real;
    }
}
```

**Follow-ups & traps**
- "Proxy vs Decorator vs Adapter?" — Same drawing. Proxy: control (lazy/remote/protect). Decorator: extra behavior, still local. Adapter: different interface.
- "Why is PageFactory considered dated?" — Hides wait policy, encourages cached WebElements, fights explicit waits, no advantage over `By` constants. Saying this calmly is a seniority signal.
- Weak answer: "Proxy is when we use a VPN." Grid is the answer they want.
- Trap: `AjaxElementLocatorFactory` with a long timeout stacked on WebDriverWait — double waits, flake of a different kind.

**Senior/lead angle** — Standardize: no PageFactory in the core, RemoteWebDriver only inside the factory, `LocalFileDetector` on by default for remote. Teach stale as "you held a WebElement across a rerender," not as a mysterious proxy bug.

**One-liner** — RemoteWebDriver is a Grid proxy; PageFactory fields are lazy find proxies that still go stale if you cache them — prefer explicit `By` plus waits.

### Q11. Bridge — platform (Android/iOS) × feature pages

**Interview answer** — Bridge separates an abstraction from its implementation so both can vary independently. In mobile automation the abstraction is the feature screen (CartScreen: add, checkout) and the implementation is the platform (Android locators/gestures vs iOS). I can add a new screen without forking platform code, and add a platform without rewriting every feature. Abstract Factory often *creates* the matching pair; Bridge is the shape of the pair.

**Deep dive** — UML-in-words: Abstraction CartScreen holds a PlatformDriver (implementor). Refined abstractions: GuestCartScreen, SavedCartScreen. Implementors: AndroidPlatform, IosPlatform (locators, tap vs click, hideKeyboard). Without Bridge, you get a class explosion: AndroidGuestCart, IosGuestCart, AndroidSavedCart, IosSavedCart (Cartesian product). With Bridge, features × platforms are additive. Trade-off: another hop (screen → platform) and the temptation to dump all locators into one giant AndroidPlatform God implementor — then you have not bridged, you have made a platform util. When NOT to use: a single platform. When locators are 95% shared (responsive web), a parameterized page with a locator strategy (Strategy) is simpler than Bridge. Bridge vs Strategy: Strategy swaps an algorithm inside one class; Bridge is for two *hierarchies* that would otherwise multiply.

**Code**

```java
public interface MobilePlatform {                     // Implementor
    void tap(By locator);
    void type(By locator, String value);
    void hideKeyboard();
    By cartIcon();
    By checkoutButton();
}

public final class AndroidPlatform implements MobilePlatform {
    private final AndroidDriver driver;
    public void tap(By locator) { driver.findElement(locator).click(); }
    public void hideKeyboard() { driver.hideKeyboard(); }
    public By cartIcon() { return AppiumBy.accessibilityId("cart"); }
    public By checkoutButton() { return AppiumBy.id("com.app:id/checkout"); }
}

public final class IosPlatform implements MobilePlatform {
    private final IOSDriver driver;
    public void tap(By locator) { driver.findElement(locator).click(); }
    public void hideKeyboard() { /* XCUITest dismiss */ }
    public By cartIcon() { return AppiumBy.accessibilityId("Cart"); }
    public By checkoutButton() { return AppiumBy.iOSNsPredicateString("name == 'Checkout'"); }
}

public abstract class CartScreen {                    // Abstraction
    protected final MobilePlatform platform;
    protected CartScreen(MobilePlatform platform) { this.platform = platform; }
    public void open() { platform.tap(platform.cartIcon()); }
    public abstract void checkout();
}

public final class GuestCartScreen extends CartScreen {   // Refined abstraction
    public GuestCartScreen(MobilePlatform platform) { super(platform); }
    public void checkout() {
        platform.tap(platform.checkoutButton());
        // guest-specific email capture lives here, not in Android/iOS duplicates
    }
}

public final class SavedCartScreen extends CartScreen {
    public SavedCartScreen(MobilePlatform platform) { super(platform); }
    public void checkout() { platform.tap(platform.checkoutButton()); }
}

// Bootstrap still uses a factory to pick the implementor.
MobilePlatform platform = "IOS".equals(os) ? new IosPlatform(iosDriver) : new AndroidPlatform(androidDriver);
CartScreen cart = new GuestCartScreen(platform);
```

**Follow-ups & traps**
- "Do I need Bridge *and* Abstract Factory?" — Factory picks Android vs iOS (and builds the driver). Bridge lets CartScreen take that platform. You can skip Bridge if every screen is a pair of independent classes created by the factory.
- "Web + mobile with Bridge?" — Only if the user journeys are truly the same. They often are not (hover vs tap, different IA). Two page trees plus shared flows (Facade) is more honest.
- Weak answer: calling any interface+impl a Bridge. If there is only one hierarchy, it is Strategy or plain DIP.
- Trap: putting feature-specific waits only in AndroidPlatform. Then iOS "just works" until it doesn't — LSP across implementors.

**Senior/lead angle** — Draw the Cartesian product on the whiteboard: screens × platforms. If both axes are growing, Bridge (or codegen from a locator table) is justified. If one axis is frozen, don't pay the hop. This is how a lead decides, not whether they can name Bridge.

**One-liner** — Bridge keeps CartScreen independent of Android vs iOS so you add screens or platforms without a Cartesian class explosion.

### Q12. Composite — a Header component containing Menu + Search + Cart widgets

**Interview answer** — Composite lets you treat a tree of objects like a single object: a Header contains Menu, Search, and Cart widgets, all sharing a Widget (or Component) interface — `isVisible()`, `root()`. Pages compose Header; Header composes children; tests that care about the header talk to Header, and Header delegates. This is the Page Component Model, which is Composite applied to UI.

**Deep dive** — UML-in-words: Component ← Header (composite), Menu, Search, MiniCart (leaves). Header.logout() may reach into Menu; Header.openCart() delegates to MiniCart. The test can also take MiniCart as a fixture when the test is about the cart drawer. Trade-off: too-deep trees recreate Law of Demeter violations if tests walk them. Composite is for the *implementors* to walk uniformly (e.g. `header.children().forEach(c -> c.waitUntilLoaded())`), not for tests to chain. When NOT to use: two locators. When it shines: a design-system header reused on every page — one Header class, every page has-a Header. Appium: a tab bar composite of tab leaves, with `select(Tab.CART)` on the parent. TestNG XML suites are also a Composite (suite → test → class → method) — mention it if asked for a non-UI example.

**Code**

```java
public interface Widget {
    By root();
    boolean isDisplayed();
    void waitUntilLoaded();
}

public final class SearchWidget implements Widget {
    private final Browser browser;
    private static final By ROOT = By.cssSelector("[data-testid=header-search]");
    private static final By INPUT = By.cssSelector("[data-testid=header-search] input");
    public SearchWidget(Browser browser) { this.browser = browser; }
    public By root() { return ROOT; }
    public boolean isDisplayed() { return browser.displayed(ROOT); }
    public void waitUntilLoaded() { browser.visible(ROOT); }
    public void query(String text) {
        browser.type(INPUT, text);
        browser.pressEnter(INPUT);
    }
}

public final class MiniCartWidget implements Widget {
    private final Browser browser;
    private static final By ROOT = By.cssSelector("[data-testid=mini-cart]");
    public MiniCartWidget(Browser browser) { this.browser = browser; }
    public By root() { return ROOT; }
    public boolean isDisplayed() { return browser.displayed(ROOT); }
    public void waitUntilLoaded() { browser.visible(ROOT); }
    public void open() { browser.click(ROOT); }
    public int count() { return Integer.parseInt(browser.text(By.cssSelector("[data-testid=cart-count]"))); }
}

public final class MenuWidget implements Widget { /* ... logout() ... */ }

public final class Header implements Widget {          // Composite
    private final Browser browser;
    private final MenuWidget menu;
    private final SearchWidget search;
    private final MiniCartWidget cart;
    private static final By ROOT = By.cssSelector("header[role=banner]");

    public Header(Browser browser) {
        this.browser = browser;
        this.menu = new MenuWidget(browser);
        this.search = new SearchWidget(browser);
        this.cart = new MiniCartWidget(browser);
    }

    public By root() { return ROOT; }
    public boolean isDisplayed() { return browser.displayed(ROOT); }

    public void waitUntilLoaded() {                    // uniform treatment of children
        browser.visible(ROOT);
        List.of(menu, search, cart).forEach(Widget::waitUntilLoaded);
    }

    public void logout() { menu.logout(); }            // Demeter-friendly surface
    public void search(String q) { search.query(q); }
    public MiniCartWidget cart() { return cart; }      // for tests that are about the cart
}

public final class HomePage {
    private final Header header;
    public HomePage(Browser browser) { this.header = new Header(browser); }
    public Header header() { return header; }
    public void logout() { header.logout(); }
}
```

**Follow-ups & traps**
- "Composite vs Facade?" — Composite is a tree of the same type. Facade is a flat simple API over unlike types (CartPage + PaymentPage). Header is both a composite of widgets and a facade to the test.
- "Should every page extend a BasePage that has Header?" — Composition: every page has-a Header. Inheritance is how Header becomes BasePage hell.
- Weak answer: a Header that exposes every child's locators as public By fields.
- Trap: tests calling `home.header().cart().root()` and then using raw By in the test — you bypassed the widget.

**Senior/lead angle** — Align components with the product design system. When design adds a widget, automation adds a leaf, not a new God page. Publish Header from the core so ten teams don't re-automate logout.

**One-liner** — Header is a composite of Menu, Search, and Cart widgets — pages have-a Header, tests don't walk the tree unless the test is about that widget.

### Q13. Flyweight — sharing read-only locators/config (don't over-apply)

**Interview answer** — Flyweight shares fine-grained, immutable state across many objects to save memory. In a test framework the honest flyweights are already there: `By.id("email")` constants, enum config, and immutable capability templates. I do not flyweight page objects or WebDrivers — those hold session state. Over-applying Flyweight is how people end up with a global locator cache and a singleton driver by accident.

**Deep dive** — UML-in-words: FlyweightFactory vends shared By/locator objects; Page instances keep *extrinsic* state (the WebDriver, the timeout). Intrinsic state (the selector string) is shared. In JVM terms, interned strings and static final By fields already do this. You will not run out of memory because you `new LoginPage(driver)` per test. The interview is checking whether you know the pattern *and* know it is almost never the bottleneck. Appium: a map of accessibility ids loaded once from JSON is a flyweight (or just a repository). When NOT to use: caching WebElements (those are not immutable; they stale). Caching RequestSpecification that contains a user token (extrinsic auth stuffed into a supposed flyweight). When it is real: thousands of data-driven row objects sharing a small set of immutable templates; a locator catalog parsed once.

**Code**

```java
// Honest flyweight: locators as immutable constants, shared by all page instances.
public final class LoginLocators {
    private LoginLocators() {}
    public static final By EMAIL = By.id("email");
    public static final By PASSWORD = By.id("password");
    public static final By SUBMIT = By.cssSelector("[data-testid=login]");
}

public final class LoginPage {
    private final Browser browser;                    // extrinsic: per-test session
    public LoginPage(Browser browser) { this.browser = browser; }
    public void login(String user, String pass) {
        browser.type(LoginLocators.EMAIL, user);      // intrinsic selector, shared
        browser.type(LoginLocators.PASSWORD, pass);
        browser.click(LoginLocators.SUBMIT);
    }
}

// Config as shared immutable flyweight — already your enum singleton.
ConfigReader.INSTANCE.timeout();

// OVER-APPLIED — a locator "pool" that caches WebElements (not flyweights; they stale).
public final class ElementCache {                     // don't
    private static final Map<By, WebElement> CACHE = new ConcurrentHashMap<>();
    public static WebElement get(WebDriver d, By by) {
        return CACHE.computeIfAbsent(by, k -> d.findElement(k));
    }
}

// Reasonable: load a read-only locator catalog once (mobile ids).
public final class LocatorCatalog {
    private static final Map<String, By> BY_NAME;
    static {
        BY_NAME = Map.copyOf(LocatorJson.load("locators/android.json"));
    }
    public static By named(String key) {
        By by = BY_NAME.get(key);
        if (by == null) throw new IllegalArgumentException("No locator " + key);
        return by;
    }
}
```

**Follow-ups & traps**
- "Is Singleton a Flyweight?" — Singleton: one instance of a *service*. Flyweight: many logical objects sharing a small intrinsic piece. Config enum is both-ish; By constants are flyweights; a driver is neither.
- "Should we intern page objects?" — No. Pages are cheap. Sessions are expensive and must not be shared.
- Weak answer: using Flyweight to justify a global map of everything.
- Trap: sharing ChromeOptions mutably. Two tests call `options.addArguments` on the same object — that is shared mutable state, not a flyweight. Copy or rebuild.

**Senior/lead angle** — If someone proposes a flyweight layer, ask for a memory profile. I have never seen locator objects as the cost center; driver processes and video artifacts are. Redirect the effort.

**One-liner** — Share immutable locators and config; never share WebElements or drivers and call it Flyweight.

### Q14. How you choose among Factory vs Builder vs Abstract Factory in a real framework

**Interview answer** — I pick by what varies. If *which class* varies (Chrome vs Firefox vs AndroidDriver) I use Factory Method. If *how a value object is populated* varies (optional fields, readable tests) I use Builder. If *several products must match as a family* (Android driver + Android screens + Android gestures, or cloud driver + cloud artifacts) I use Abstract Factory. In the framework I actually ship, that is: DriverFactory + OrderBuilder + maybe a PlatformFactory once mobile exists — not all three on day one.

**Deep dive** — Decision tree: (1) Side effect to create a session or a server entity? Factory (and a data factory that tracks teardown). (2) Many optional fields, no side effect? Builder. (3) More than one product, consistency required? Abstract Factory. (4) Algorithm after construction? That is Strategy, not a creational pattern. (5) Adding behavior around an existing instance? Decorator. Common mis-picks: Abstract Factory for a single DriverFactory switch; Builder that launches ChromeDriver in `build()` (hidden factory); Factory that takes 12 parameters (hidden telescoping constructor — use a builder for the input, factory for the effect). Trade-off of using all three together: they compose cleanly if you keep responsibilities: Builder → payload, Abstract Factory → family of ports, Factory Method inside each concrete factory for the driver. When NOT to choose any: a 10-test script. YAGNI applies to creational patterns as much as to keyword engines.

**Code**

```java
// The three, composed, in one bootstrap — each doing only its job.

OrderPayload payload = OrderBuilder.guest()           // Builder: shape the data
        .withItem("SKU-1", 1)
        .inState("CA")
        .build();

MobilePlatformFactory platform = PlatformSelector.fromEnv();  // Abstract Factory: matching family
AppiumDriver driver = platform.driver();
HomeScreen home = platform.home();

WebDriver web = DriverFactory.create(BrowserType.CHROME);     // Factory Method: one product

Order created = new OrderFactory(api).create(payload);        // Factory with side effect + teardown

// Anti-choices to call out in the interview:
// new AbstractDriverFactoryProviderBuilder().build().create()  — pattern soup
// DriverFactory.create(url, browser, headless, proxy, version, tz, locale, ...) — use Options builder
// OrderBuilder.build() that also POSTs and launches Chrome — mixed concerns
```

```text
Varies                         Pattern              Framework home
which driver class             Factory Method       infra/driver/DriverFactory
which matching family          Abstract Factory     infra/mobile/PlatformFactory
optional fields on a value     Builder              data/builders/OrderBuilder
capabilities bag               Builder (or vendor)  ChromeOptions / UiAutomator2Options
which wait/retry algorithm     Strategy             not creational — see behavioral file
wrap logging around driver     Decorator            factory composition root
```

**Follow-ups & traps**
- "Could ChromeOptions be Abstract Factory?" — No. Options are one object with fields. Builder/fluent API. Abstract Factory would be LocalChromeFamily vs CloudChromeFamily producing driver+video+logs together.
- "Where does DI fit?" — DI wires the graph (which factory, which builder defaults). It is not a GoF creational pattern but it replaces a lot of static factories in Spring/Guice tests.
- Weak answer: "I use Abstract Factory because it's more enterprise." Choose by variation axis.
- Trap: three factories that all `new ChromeDriver()`. You have duplication, not a pattern language.

**Senior/lead angle** — Publish the decision tree in the core README. Review PRs against it: a new creational type must name the axis that just started varying. That is how a lead keeps the framework from growing a pattern zoo.

**One-liner** — Factory when the class varies, Builder when the fields vary, Abstract Factory when a matching family varies — introduce each at the second implementation, not the first.
