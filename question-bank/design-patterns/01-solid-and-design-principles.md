# SOLID, GRASP & Design Principles for Test Frameworks

SOLID and GRASP questions in SDET/Lead loops are not a recitation of five letters. The interviewer wants to hear where a principle changed a class boundary in *your* framework — a page object split, a DriverFactory that stopped growing a switch, a BaseTest you tore down. This file covers SOLID, composition vs inheritance, DRY vs coupling, YAGNI/KISS, Law of Demeter, package cohesion, design-oriented PR review, the `utils` anti-pattern, and a brief Playwright/TypeScript contrast so mixed-stack candidates can speak both.

- Q1. What are SOLID principles? Overview with one SDET example each
- Q2. SRP — a page class doing locators, flows, asserts, waits, and DB is the violation; how to split
- Q3. OCP — adding a new browser without editing DriverFactory internals
- Q4. LSP — FakeWebDriver or AppiumDriver used where WebDriver is expected; broken substitutions
- Q5. ISP — fat IPage / IDriver interfaces; how to split
- Q6. DIP — tests depend on abstractions (Browser, ApiClient), not ChromeDriver
- Q7. Composition over inheritance (BaseTest hell)
- Q8. DRY vs coupling — shared fixtures that create hidden dependencies
- Q9. YAGNI / KISS — over-engineered keyword frameworks
- Q10. Law of Demeter in page objects
- Q11. Coupling and cohesion in framework packages
- Q12. How do you review a PR for design (not just style)?
- Q13. When is a "utils" package an anti-pattern?
- Q14. How SOLID applies to Playwright TypeScript as well

### Q1. What are SOLID principles? Overview with one SDET example each

**Interview answer** — SOLID is five constraints on how classes change, not a slogan. Single Responsibility keeps a page object from also asserting and hitting the database. Open/Closed lets me add Safari by registering a provider instead of editing DriverFactory. Liskov says a FakeWebDriver or AppiumDriver must honor the WebDriver contract tests already rely on. Interface Segregation forbids a fat IPage that every screen is forced to implement. Dependency Inversion means tests and pages depend on Browser and ApiClient abstractions, never on ChromeDriver or RestAssured directly.

**Deep dive** — Structure in words: tests sit at the top and depend only on abstractions; factories and adapters sit at the bottom and know about ChromeDriver, UiAutomator2, Rest Assured RequestSpecBuilder. Each letter is a different failure mode. SRP failures show up as merge conflicts on LoginPage. OCP failures show up as a 200-line switch in DriverFactory. LSP failures show up as "it works with Chrome, blows up with the fake / Appium." ISP failures show up as empty method stubs. DIP failures show up as tests that cannot run without a real browser. GRASP (Information Expert, Creator, Controller, Low Coupling, High Cohesion, Polymorphism, Pure Fabrication, Indirection, Protected Variations) is the same conversation in responsibility language — a Page is Information Expert for locators, a Flow/Facade is Controller, a DriverFactory is Creator. When NOT to invoke SOLID by name: a 20-test suite. Name the pain, not the acronym. Trade-off: applying all five rigidly produces interface soup; applying none produces a God BaseTest.

**Code**

```java
// One SDET example per letter, from a Selenium + Rest Assured stack.

// S — LoginPage owns locators + user actions only (not asserts, not DB).
public final class LoginPage {
    private final WebDriver driver;
    private final By email = By.id("email");
    private final By password = By.id("password");
    private final By submit = By.cssSelector("[data-testid=login]");

    public LoginPage(WebDriver driver) { this.driver = driver; }

    public HomePage login(String user, String pass) {
        driver.findElement(email).sendKeys(user);
        driver.findElement(password).sendKeys(pass);
        driver.findElement(submit).click();
        return new HomePage(driver);
    }
}

// O — new browser = new class registered in a map, DriverFactory closed for edit.
public interface BrowserProvider {
    boolean supports(BrowserType type);
    WebDriver create(Capabilities caps);
}

// L — a test double must honor the same postconditions as the real driver.
public final class FakeWebDriver implements WebDriver {
    // If production code calls getCurrentUrl() after get(url), the fake must too.
    // Returning null or throwing UnsupportedOperationException is an LSP break.
}

// I — small interfaces; a read-only confirmation page does not implement fill().
public interface Navigable { void open(String path); }
public interface Fillable { void fill(By field, String value); }
public interface Submittable { void submit(); }

// D — test depends on ApiClient, not io.restassured.RestAssured.
public interface ApiClient {
    <T> T get(String path, Class<T> type);
    <T> T post(String path, Object body, Class<T> type);
}
```

**Follow-ups & traps**
- "Which letter is 'don't put assertions in page objects'?" — SRP (and a bit of ISP). The page's reason to change is the UI contract, not the test's oracle.
- "Is SOLID only for production code?" — No. A framework is production code that happens to drive tests; the same blast-radius reasoning applies.
- Weak answer: listing the five names without an automation example. Interviewers grade the example, not the expansion of the acronym.
- Trap: claiming your DriverFactory is OCP while it is a `switch (browser)` that you edit every time. That is a Simple Factory, not Open/Closed.

**Senior/lead angle** — At staff level SOLID is a review rubric, not a lecture. You bless a small set of seams (BrowserProvider, ApiClient, WaitStrategy) and you reject PRs that introduce a new static WebDriver or a new method on a 40-method IPage. You also know when to waive a letter: a one-off script does not need a BrowserProvider SPI.

**One-liner** — SOLID in a test framework is five ways of keeping a UI change, a new browser, or a fake driver from detonating the suite.

### Q2. SRP — a page class doing locators, flows, asserts, waits, and DB is the violation; how to split

**Interview answer** — A class named CheckoutPage that holds locators, walks a three-step wizard, asserts order totals, wraps WebDriverWait, and queries the orders table has five reasons to change. I split it: CheckoutPage owns locators and atomic actions, CheckoutFlow (a facade) orchestrates the wizard, assertions live in the test or a dedicated assertion helper, waits live in an interaction/wait layer, and the database is an OrderRepository used from the arrange/assert of the test — never from the page.

**Deep dive** — UML-in-words: Test → CheckoutFlow → CheckoutPage → ElementActions → WebDriver. Test also → OrderAssertions and OrderRepository. Nothing in pages imports JDBC or Rest Assured. The original God page changes when the button CSS changes, when the business flow adds a tip step, when the assertion on tax changes, when wait policy changes, and when the schema changes — five axes, one class, constant merge conflicts. Trade-off of the split: more types, more navigation of the package tree. When NOT to split: a three-locator settings toggle. SRP is about reasons to change, not "one method per class." GRASP Information Expert says the page knows locators; a Pure Fabrication (CheckoutFlow) exists only to keep the page from becoming a controller. The wait layer is the one teams skip, then every page reimplements click-and-wait.

**Code**

```java
// BEFORE — five responsibilities in one type (do not ship this).
public class CheckoutPage {
    public void completeCheckout(Order order) { /* locators + 40-line flow */ }
    public void assertTotalIs(BigDecimal expected) { /* test oracle in the page */ }
    public void waitForSpinner() { Thread.sleep(3000); }
    public Order fetchOrderFromDb(String id) { /* JDBC in a page object */ }
}

// AFTER — each type has one reason to change.
public final class CheckoutPage {                    // UI contract
    private final ElementActions ui;
    private final By placeOrder = By.cssSelector("[data-testid=place-order]");

    public CheckoutPage(ElementActions ui) { this.ui = ui; }

    public void placeOrder() { ui.click(placeOrder); }
}

public final class CheckoutFlow {                    // orchestration
    private final CartPage cart;
    private final AddressPage address;
    private final PaymentPage payment;
    private final CheckoutPage checkout;

    public OrderConfirmationPage placeOrder(Order order) {
        cart.add(order.items());
        address.fill(order.address());
        payment.pay(order.card());
        checkout.placeOrder();
        return new OrderConfirmationPage(cart.ui());
    }
}

public final class ElementActions {                  // waits + interactions
    private final WebDriver driver;
    private final WebDriverWait wait;

    public void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }
}

public final class OrderRepository {                 // data plane
    public Order findById(String id) { /* JDBC or API, never called from pages */ }
}

@Test
public void guestCheckoutChargesTax() {
    Order order = OrderBuilder.guest().withItem("SKU-1").build();
    confirmation = new CheckoutFlow(pages).placeOrder(order);
    OrderAssertions.assertTax(confirmation.total(), order);
}
```

**Follow-ups & traps**
- "Where do assertions live?" — In tests, or in assertion helpers that take page-read values. Pages that assert hide intent and couple the page to one scenario.
- "Is a Flow just a fat page with a new name?" — If the Flow starts holding locators, you have not split SRP; you have renamed the God object.
- Weak answer: "I put everything in BasePage so pages stay small" — you moved the God, you did not remove it.
- Trap: "component objects" that still call the DB. SRP is about dependencies, not file size.

**Senior/lead angle** — Make the split a platform convention: a checkstyle/ArchUnit rule that `pages..` must not import `java.sql`, `io.restassured`, or TestNG Assert. Architecture tests catch SRP violations faster than review comments.

**One-liner** — Locators in pages, journeys in flows, oracles in tests, waits in an interaction layer, DB behind a repository — five types, five reasons to change.

### Q3. OCP — adding a new browser without editing DriverFactory internals

**Interview answer** — Open/Closed means DriverFactory is closed for modification and open for extension: I add Safari by shipping a SafariProvider that registers itself, not by opening the factory and adding a case. Internally that is Strategy plus a registry (a form of Factory Method). The tests still call `DriverFactory.create(BrowserType.SAFARI, caps)` and never know a class was added.

**Deep dive** — UML-in-words: BrowserProvider (strategy) ← SafariProvider, ChromeProvider, AndroidProvider. DriverFactory holds Map<BrowserType, BrowserProvider> populated at startup via ServiceLoader, Spring, or a static registrar. Tests depend on DriverFactory and BrowserType, not on providers. The naive `switch (type)` Simple Factory is convenient and is *not* OCP — every new browser is an edit plus a risk of merge conflict with every other team adding Edge, Firefox, a BrowserStack remote. Trade-off of a true registry: more types, a registration story (SPI file, Spring `@Component`, or explicit `DriverFactory.register` in a bootstrap). When NOT to do this: two browsers in one team. A switch of size two is clearer than an SPI. OCP pays off at the third implementation or when an external team must add a cloud provider without forking the core. Protected Variations (GRASP) is the same idea: hide the browser axis behind a stable interface.

**Code**

```java
public enum BrowserType { CHROME, FIREFOX, SAFARI, ANDROID }

public interface BrowserProvider {
    BrowserType type();
    WebDriver create(MutableCapabilities requested);
}

public final class ChromeProvider implements BrowserProvider {
    public BrowserType type() { return BrowserType.CHROME; }

    public WebDriver create(MutableCapabilities requested) {
        ChromeOptions options = new ChromeOptions().merge(requested);
        options.addArguments("--disable-dev-shm-usage");
        return new ChromeDriver(options);
    }
}

public final class SafariProvider implements BrowserProvider {   // NEW FILE, no factory edit
    public BrowserType type() { return BrowserType.SAFARI; }
    public WebDriver create(MutableCapabilities requested) {
        return new SafariDriver(new SafariOptions().merge(requested));
    }
}

public final class DriverFactory {
    private static final Map<BrowserType, BrowserProvider> PROVIDERS = new EnumMap<>(BrowserType.class);

    static {
        // In production: ServiceLoader.load(BrowserProvider.class) or Spring injection.
        register(new ChromeProvider());
        register(new FirefoxProvider());
        register(new SafariProvider());
        register(new AndroidAppiumProvider());
    }

    public static void register(BrowserProvider provider) {
        PROVIDERS.put(provider.type(), provider);
    }

    public static WebDriver create(BrowserType type, MutableCapabilities caps) {
        BrowserProvider provider = PROVIDERS.get(type);
        if (provider == null) {
            throw new IllegalArgumentException("No provider registered for " + type);
        }
        return provider.create(caps);
    }
}

public final class AndroidAppiumProvider implements BrowserProvider {
    public BrowserType type() { return BrowserType.ANDROID; }

    public WebDriver create(MutableCapabilities requested) {
        UiAutomator2Options options = new UiAutomator2Options().merge(requested);
        options.setDeviceName(System.getenv().getOrDefault("DEVICE", "Pixel_6"));
        return new AndroidDriver(URI.create("http://127.0.0.1:4723").toURL(), options);
    }
}
```

**Follow-ups & traps**
- "Isn't a switch statement simpler?" — Yes, until two teams add browsers in the same week. Say you'd start with a switch and extract a registry at the third implementation.
- "How does this relate to Strategy?" — Each BrowserProvider *is* a creation strategy. Factory Method is the `create` hook; the factory is the context that selects it.
- Weak answer: "I would add an else-if for Safari" — that is the violation the question is hunting.
- Trap: claiming OCP while the enum BrowserType still has to be edited. True OCP for unknown future browsers needs a string/capability key, not a closed enum. In practice we edit the enum and add a class — honest answer: "closed against factory internals, not against the type list."

**Senior/lead angle** — In a shared core, BrowserProvider is a public SPI: cloud teams ship `browserstack-provider.jar` with a META-INF/services registration, and the core never hears about BrowserStack. That is the organizational form of OCP.

**One-liner** — Add a browser by adding a provider class that registers itself; if you opened DriverFactory to type `case SAFARI`, you failed OCP.

### Q4. LSP — a FakeWebDriver or AppiumDriver used where WebDriver is expected; broken substitutions

**Interview answer** — Liskov Substitution says any subtype you pass where WebDriver is expected must preserve the contract: postconditions, exceptions, and timing assumptions. A FakeWebDriver that no-ops `get()` and returns null from `getCurrentUrl()` will green unit tests and red the suite. An AppiumDriver stuffed into a page written for desktop WebDriver breaks on window handles, alerts, and hover. I only substitute types that honor the same behavioral contract, and I keep mobile on its own abstractions when the contract diverges.

**Deep dive** — UML-in-words: pages depend on WebDriver (or, better, on a slimmer Browser/ElementActions abstraction). ChromeDriver, RemoteWebDriver, AndroidDriver, FakeWebDriver are candidate substitutes. LSP is violated when a substitute weakens postconditions (`get(url)` does not navigate), strengthens preconditions (must call `context("NATIVE_APP")` first), or throws new unchecked exceptions the caller cannot expect. Classic breaks: (1) FakeWebDriver used to unit-test a page object but `findElement` returns a mock that never becomes stale — you have tested a fantasy DOM. (2) AndroidDriver as WebDriver in a shared Header component that calls `getWindowHandles()` or `Actions.moveToElement`. (3) a RetryingDriver decorator that swallows NoSuchElementException and returns null, changing the exception policy. Trade-off: a strict LSP reading says "don't share page objects across web and mobile." That is usually correct. When NOT to force one WebDriver type: hybrid apps and true responsive web can share a small ElementActions if you have proven the methods used. When NOT to use a fake: if the page is 90% waits and DOM, an in-memory fake will not catch the bugs; use a contract test against a real browser instead.

**Code**

```java
// Contract the rest of the framework assumes (implicit LSP spec):
//   get(url) → currentUrl equals url (or a redirect of it)
//   findElement(locator) → throws NoSuchElementException, never returns null
//   quit() is idempotent

// BROKEN substitute — unit tests pass, production pages NPE.
public final class BrokenFakeDriver implements WebDriver {
    public void get(String url) { /* no-op */ }
    public String getCurrentUrl() { return null; }          // postcondition broken
    public WebElement findElement(By by) { return null; }   // should throw
    public void quit() { throw new UnsupportedOperationException(); }
}

// HONEST fake — same postconditions, in-memory page map for fast unit tests of flows.
public final class InMemoryWebDriver implements WebDriver {
    private String current = "";
    private final Map<By, WebElement> dom = new HashMap<>();

    public void get(String url) { this.current = url; }
    public String getCurrentUrl() { return current; }

    public WebElement findElement(By by) {
        WebElement el = dom.get(by);
        if (el == null) throw new NoSuchElementException(by.toString());
        return el;
    }

    public void quit() { dom.clear(); current = ""; }
}

// BROKEN substitution of Appium into a desktop-only page.
public final class Header {                              // written for desktop WebDriver
    public void switchToHelpTab(WebDriver driver) {
        String parent = driver.getWindowHandle();
        driver.findElement(By.linkText("Help")).click();
        for (String h : driver.getWindowHandles()) {     // Appium: often 1 handle, or throws
            if (!h.equals(parent)) driver.switchTo().window(h);
        }
    }
}

// HONEST split — mobile does not pretend to be desktop WebDriver for windowing.
public interface BrowserSession { void open(String url); void quit(); }
public interface MobileSession extends BrowserSession {
    void tap(AppiumBy locator);
    void background(Duration seconds);
}
```

**Follow-ups & traps**
- "Can AndroidDriver extend/implement WebDriver?" — It does, historically, but LSP is about behavior, not the implements clause. If callers use windowing, alerts, or hover, AndroidDriver is not a valid substitute.
- "Should page objects be unit-tested with fakes?" — Only the pure orchestration (Flow) is worth faking; pages that wrap locators are cheaper to exercise against a real browser or Playwright component test.
- Weak answer: "LSP means the child class should not throw exceptions" — children may throw the same types; they must not invent new failure modes the caller cannot handle.
- Trap: a decorator that "helps" by catching Exception and retrying forever. That is an LSP break of the timeout/exception contract.

**Senior/lead angle** — Write the contract down: a one-pager "what WebDriver means here" (no implicit wait, find throws, quit always). Then ArchUnit-ban `AndroidDriver` from `pages.web`. Substitutability is an architectural boundary, not a Java keyword.

**One-liner** — If a FakeWebDriver or AppiumDriver can be passed where WebDriver is expected but does not navigate, find, or window-switch the same way, you have an LSP bug, not a test double.

### Q5. ISP — fat IPage / IDriver interfaces; how to split

**Interview answer** — Interface Segregation says clients must not depend on methods they do not use. A 30-method IPage with `login`, `acceptCookie`, `swipe`, `hideKeyboard`, `selectFrame`, and `executeJs` forces every screen to stub half of it. I split by role: Navigable, Authenticatable, GestureCapable, CookieBanner — pages implement only what they are. Same for drivers: a JsExecutor-capable wrapper is a separate interface from a Screenshotable one.

**Deep dive** — UML-in-words: fat IPage is a hub every page implements; after the split, LoginPage implements Navigable + Authenticatable, AndroidCartScreen implements Navigable + GestureCapable, ConfirmationPage implements Navigable only. Fat IDriver similarly dumps TakesScreenshot, JavascriptExecutor, HasCapabilities, PerformsTouchActions onto every collaborator. Trade-off: more interfaces to name and discover. The failure mode of over-segregation is a package of 40 one-method interfaces nobody can remember. When NOT to split: if every implementor truly uses every method, one interface is cohesive, not fat. ISP is diagnosed by empty stubs, `UnsupportedOperationException`, or Boolean parameters like `isMobile`. GRASP: those stubs are a sign you needed Polymorphism across smaller roles, not one inheritance tree.

**Code**

```java
// FAT — every page pays for mobile + auth + cookies.
public interface IPage {
    void open(String path);
    void login(String user, String pass);
    void acceptCookies();
    void swipe(Direction direction);
    void hideKeyboard();
    void switchToFrame(By frame);
    File screenshot();
}

// SPLIT by role — implement what you are.
public interface Opens { void open(String path); }
public interface Authenticates { HomePage login(Credentials creds); }
public interface CookieAware { void acceptCookiesIfPresent(); }
public interface Gestures {
    void swipe(Direction direction);
    void hideKeyboard();
}
public interface Frames { void switchToFrame(By frame); }
public interface Screenshots { File screenshot(); }

public final class LoginPage implements Opens, Authenticates, CookieAware {
    private final ElementActions ui;
    public void open(String path) { ui.get(path); }
    public HomePage login(Credentials creds) { /* ... */ return new HomePage(ui); }
    public void acceptCookiesIfPresent() { ui.clickIfPresent(By.id("accept")); }
}

public final class AndroidCartScreen implements Opens, Gestures {
    private final AndroidDriver driver;
    public void swipe(Direction direction) { /* W3C actions sequence */ }
    public void hideKeyboard() { driver.hideKeyboard(); }
}

// Driver side — pages that never screenshot should not take TakesScreenshot.
public interface Clicks { void click(By locator); }
public interface Types { void type(By locator, String value); }
public interface Captures { File screenshot(); }

public final class SeleniumActions implements Clicks, Types, Captures {
    private final WebDriver driver;
    private final TakesScreenshot camera;   // required only here

    public SeleniumActions(WebDriver driver) {
        this.driver = driver;
        this.camera = (TakesScreenshot) driver;     // fail fast if substitute cannot
    }

    public File screenshot() { return camera.getScreenshotAs(OutputType.FILE); }
}
```

**Follow-ups & traps**
- "Isn't this just more files?" — Yes. ISP is a dependency tax you pay to stop every page recompiling when you add `hideKeyboard` to IPage.
- "Default methods on the fat interface?" — They hide the problem. A default `swipe()` that no-ops on web is an LSP landmine for anyone who later calls it.
- Weak answer: one IPage "for consistency so every page has the same methods." Consistency of unused methods is the violation.
- Trap: splitting so finely that a constructor takes eight role interfaces. If they always travel together, they are one cohesive interface.

**Senior/lead angle** — Publish two or three role interfaces from the shared core (Clicks/Types/Captures, Opens/Authenticates) and refuse new methods on them without an ADR. Feature teams add local roles; they do not fatten the platform interface.

**One-liner** — If a confirmation page has to stub `hideKeyboard()`, the interface is too fat — split by role, implement only what the screen is.

### Q6. DIP — tests depend on abstractions (Browser, ApiClient), not ChromeDriver concrete

**Interview answer** — Dependency Inversion means high-level policy — tests, flows, pages — depends on abstractions, and the concrete ChromeDriver, AndroidDriver, and Rest Assured live in adapters at the edge. I inject a Browser and an ApiClient into tests; a factory or TestNG `@BeforeMethod` binds those to ChromeDriver or a RestAssuredClient. That is what lets me swap grid vs local, or stub the API, without editing tests.

**Deep dive** — UML-in-words: Test → (Browser, ApiClient) ← ChromeBrowserAdapter, RestAssuredClient, MockApiClient. Arrows of source dependency point toward abstractions; creation happens in a composition root (DriverFactory + ClientFactory + listeners). The violation is `new ChromeDriver()` inside a page, or `RestAssured.given()` static calls inside a test, which couples every test to a concrete, a static, and a specific environment. Trade-off: an extra interface and an adapter per technology. When NOT to abstract: if you are a one-browser Selenium shop that will never mock the driver, wrapping WebDriver in Browser adds indirection without a second implementation. Do still abstract ApiClient, because you *will* want a fake for unit-testing flows and a real client for e2e. DIP is the principle; Factory + DI is the mechanism. Playwright fixtures are DIP with a nicer API — mention that in mixed-stack interviews (see Q14).

**Code**

```java
public interface Browser {
    void open(String url);
    void click(By locator);
    void type(By locator, String value);
    String text(By locator);
    void quit();
}

public interface ApiClient {
    <T> T get(String path, Class<T> type);
    <T> T post(String path, Object body, Class<T> type);
    void delete(String path);
}

public final class SeleniumBrowser implements Browser {
    private final WebDriver driver;
    private final WebDriverWait wait;
    public SeleniumBrowser(WebDriver driver, Duration timeout) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, timeout);
    }
    public void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }
    public void quit() { driver.quit(); }
    // ...
}

public final class RestAssuredClient implements ApiClient {
    private final RequestSpecification spec;

    public RestAssuredClient(String baseUri, String token) {
        this.spec = new RequestSpecBuilder()
                .setBaseUri(baseUri)
                .addHeader("Authorization", "Bearer " + token)
                .setContentType(ContentType.JSON)
                .build();
    }

    public <T> T post(String path, Object body, Class<T> type) {
        return given().spec(spec).body(body).post(path).then().extract().as(type);
    }
}

public abstract class BaseTest {                         // composition root, not a God object
    protected Browser browser;
    protected ApiClient api;

    @BeforeMethod
    public void bind() {
        WebDriver raw = DriverFactory.create(Config.browser(), Config.caps());
        browser = new SeleniumBrowser(raw, Config.timeout());
        api = new RestAssuredClient(Config.apiBase(), TokenService.issue());
    }

    @AfterMethod
    public void unbind() { browser.quit(); }
}

public class CheckoutApiThenUiTest extends BaseTest {
    @Test
    public void orderCreatedViaApiShowsInUi() {
        Order created = api.post("/orders", OrderBuilder.guest().build(), Order.class);
        browser.open("/orders/" + created.id());
        assertThat(browser.text(By.cssSelector("h1"))).contains(created.id());
    }
}
```

**Follow-ups & traps**
- "Why not inject WebDriver itself?" — You can, and many Selenium frameworks do. The next step (Browser) pays off when you add Appium or want to ban raw `findElement` in tests. Be honest about which layer you actually have.
- "Is Rest Assured's static given() DIP?" — No. It is a fluent facade with global state (`RestAssured.baseURI`). Wrap it.
- Weak answer: "I use interfaces because it's best practice" — name the swap you have actually done (grid, fake API, mobile).
- Trap: an interface with only one implementation *and* a 1:1 method mapping to ChromeDriver. That is not inversion, it is a pass-through.

**Senior/lead angle** — The composition root is a privileged place: only `infra/` may import `org.openqa.selenium.chrome` and `io.restassured`. ArchUnit enforces DIP; review then focuses on whether the abstraction is the right shape, not whether someone new'ed a ChromeDriver in a test.

**One-liner** — Tests depend on Browser and ApiClient; ChromeDriver and Rest Assured live in adapters bound once in the composition root.

### Q7. Composition over inheritance (BaseTest hell)

**Interview answer** — Inheritance is the right tool for a true is-a lifecycle hook, not for reuse. BaseTest hell is `MobileCheckoutTest extends CheckoutTest extends AuthenticatedTest extends ApiTest extends DriverTest extends BaseTest`, each layer adding a `@BeforeMethod` and a couple of helpers. I keep at most one thin lifecycle class — or none, using TestNG listeners — and I compose LoginHelper, ApiClient, DataFactory as fields injected into the test.

**Deep dive** — UML-in-words (the hell): a linear chain of five abstract classes, diamond problems when someone needs Api but not Driver, and Fragile Base Class when `DriverTest.setUp` changes order and breaks Mobile. Composition: Test has-a Browser, has-a ApiClient, has-a UserFactory. TestNG listeners / JUnit extensions own setup and teardown (Observer), not a parent class (Template Method). Trade-off: inheritance gives you a one-line `extends BaseTest` and implicit setup — that is why it spreads. Composition requires constructors or fields plus a binding story. When inheritance *is* appropriate: a tiny abstract Page with `isLoaded()` as a Template Method, or a single BaseTest that only creates/quits the driver. When NOT: sharing `login()` by making every test extend LoginTest. That couples checkout tests to login's fixtures and data. GRASP: reuse through Indirection (helpers) and Pure Fabrication, not through a taxonomy of tests.

**Code**

```java
// BASETEST HELL — do not do this.
public class BaseTest { @BeforeMethod public void openBrowser() {} }
public class ApiTest extends BaseTest { @BeforeMethod public void api() {} }
public class AuthenticatedTest extends ApiTest { @BeforeMethod public void login() {} }
public class CheckoutTest extends AuthenticatedTest { /* 800 lines of helpers */ }
public class MobileCheckoutTest extends CheckoutTest { /* overrides setUp, breaks parent */ }

// COMPOSITION — one optional lifecycle, helpers as collaborators.
public final class LoginHelper {
    private final ApiClient api;
    private final Browser browser;
    public LoginHelper(ApiClient api, Browser browser) {
        this.api = api;
        this.browser = browser;
    }
    public void as(Role role) {
        String token = api.post("/auth/token", role.credentials(), Token.class).value();
        browser.open("/");
        browser.addCookie("session", token);          // skip the UI login when testing checkout
    }
}

public final class UserFactory {
    private final ApiClient api;
    private final List<String> created = new ArrayList<>();
    public UserFactory(ApiClient api) { this.api = api; }
    public User create(Role role) {
        User u = api.post("/users", UserBuilder.of(role).build(), User.class);
        created.add(u.id());
        return u;
    }
    public void cleanup() { created.forEach(id -> api.delete("/users/" + id)); }
}

@Listeners(DriverListener.class)                     // lifecycle in Observer, not parent
public class GuestCheckoutTest {
    private Browser browser;
    private ApiClient api;
    private LoginHelper login;
    private UserFactory users;

    @BeforeMethod
    public void collaborators() {
        browser = DriverListener.currentBrowser();
        api = ClientFactory.create();
        login = new LoginHelper(api, browser);
        users = new UserFactory(api);
    }

    @AfterMethod
    public void cleanup() { users.cleanup(); }

    @Test
    public void guestCanPay() {
        User guest = users.create(Role.GUEST);
        login.as(Role.GUEST);
        new CheckoutFlow(browser).placeOrder(OrderBuilder.forUser(guest).build());
    }
}
```

**Follow-ups & traps**
- "Isn't a BaseTest simpler for new hires?" — A 30-line BaseTest is. A hierarchy is not. Scaffold a test template that constructs helpers, don't encode reuse in extends.
- "What about TestNG's `extends` for parallel BaseTest fields?" — Instance fields on a common parent are a data race unless you are careful with `parallel=methods`. Composition plus ThreadLocal in the listener is explicit about isolation.
- Weak answer: "We don't use inheritance at all" — Template Method on a page `isLoaded()` is fine. The principled answer is "inheritance for true variation, composition for reuse."
- Trap: replacing BaseTest with a 2,000-line `TestHelpers` God object. That is the same coupling with a different keyword.

**Senior/lead angle** — Ban multi-level test inheritance in the contributing guide. Provide a sample test that composes published helpers. When a team files "I need a MobileAuthenticatedApiBaseTest," that is a design smell, not a class to add.

**One-liner** — One thin lifecycle or a listener, and helpers as fields — if you need a five-class BaseTest chain, you are using inheritance as a junk drawer.

### Q8. DRY vs coupling — shared fixtures that create hidden dependencies

**Interview answer** — DRY is not "one function everyone calls." A shared `seedStandardCheckout()` used by 80 tests looks dry and creates a hidden dependency: every test now relies on that fixture's users, SKUs, cookies, and side effects, so a one-line change to the fixture flakes half the suite. I dry up *intent-revealing builders* and *true duplicates*, and I allow some duplication when the alternative is a secret contract between tests.

**Deep dive** — Structure: a fixture/helper is a coupling hub. Incoming: N tests. Outgoing: pages, APIs, DB, clock. Changing any outgoing dependency recompiles/reruns all N, and worse, changes their meaning. The DRY/coupling trade-off is the most common senior design question dressed as a principle. Symptoms of bad DRY: tests that fail together for a reason not in the test body; a fixture name that no longer describes what it does (`setup1`); comments like "don't change the address, checkout tests need it." When sharing is correct: a login-via-API helper with an explicit role argument; a locator in a single page object (that is DRY of the UI contract, which *should* have one owner). When NOT to DRY: two tests that happen to click the same three buttons on the way to different oracles — a flow object is fine; a shared mutable `TestData.CURRENT_ORDER` is not. GRASP Low Coupling beats mechanical DRY.

**Code**

```java
// BAD DRY — hidden contract. Changing SKU-1 or the address breaks unrelated tests.
public final class SharedFixtures {
    public static Order STANDARD;                     // mutable global
    public static void seedStandardCheckout(ApiClient api) {
        STANDARD = api.post("/orders", Map.of(
                "sku", "SKU-1",
                "address", "1 Infinite Loop"
        ), Order.class);
    }
}

public class TaxTest {
    @Test public void caTax() {
        SharedFixtures.seedStandardCheckout(api);     // what did we actually get?
        assertThat(SharedFixtures.STANDARD.tax()).isPositive();
    }
}

// GOOD DRY — explicit builders, per-test data, shared only the construction language.
public final class OrderBuilder {
    private String sku = "SKU-" + UUID.randomUUID();  // isolated by default
    private String state = "CA";
    private String address = UUID.randomUUID() + " Market St";

    public OrderBuilder inState(String state) { this.state = state; return this; }
    public OrderBuilder withSku(String sku) { this.sku = sku; return this; }
    public OrderPayload build() { return new OrderPayload(sku, state, address); }
}

public class TaxTest {
    @Test public void caTax() {
        OrderPayload payload = new OrderBuilder().inState("CA").build();
        Order created = api.post("/orders", payload, Order.class);
        assertThat(created.tax()).isPositive();
    }
}

// Acceptable shared fixture — explicit, immutable, no leftover state.
public final class AuthTokens {
    public static String forRole(Role role) { /* cached by role, not by test */ }
}
```

**Follow-ups & traps**
- "Isn't copying builders the opposite of DRY?" — Builders are the dry language; instances are wet on purpose so tests stay independent.
- "Our Cucumber Background seeds everything." — That is this anti-pattern with Gherkin syntax. Backgrounds that grow become hidden fixtures.
- Weak answer: "We never share anything." Over-wet suites duplicate login and locator strings; that is the other failure.
- Trap: a `@BeforeSuite` that loads a 50-row Excel "master data" sheet. Fast to write, impossible to change, serializes the suite.

**Senior/lead angle** — Review metric: if a helper is imported by more than one package, it needs a documented contract (inputs, side effects, cleanup) and a unit test. Un-documented shared fixtures are how platforms ossify.

**One-liner** — Share the language for building data, not a single STANDARD order — DRY that hides a fixture contract is coupling wearing a principle.

### Q9. YAGNI / KISS — over-engineered keyword frameworks

**Interview answer** — YAGNI and KISS are how I push back on a keyword engine, an AbstractPageFactoryProvider, or a YAML DSL "so non-coders can write tests." I have seen keyword frameworks become interpreters of a poorly typed language, with worse debugging than the Java they replaced. I start with page objects plus flows, and I introduce a pattern only when a second or third implementation has appeared.

**Deep dive** — Over-engineering in SDET orgs usually looks like: Excel/JSON keywords (`CLICK | #submit`), a custom interpreter (Command + Interpreter patterns), a reflection-based PageFactory, runtime locator injection from a CMS, and a "framework team" that ships the DSL instead of product tests. Each layer was justified by a future user who rarely arrives. KISS says the test should read like a scenario in the language the team already debugs — Java or TypeScript. YAGNI says do not build the keyword engine for the hypothetical manual-QA author until that person exists and has written ten tests in Java and felt the pain. Trade-off: a small keyword table can be the right design for a highly repetitive data-entry audit with non-developer authors — that is a real niche, not the default. When NOT to invoke YAGNI: logging, screenshots-on-failure, and parallel-safe driver scoping are not YAGNI; they are table stakes you will need on day two of CI. Distinguish accidental complexity (DSL, reflection) from essential complexity (isolation, waiting).

**Code**

```java
// OVER-ENGINEERED — a keyword interpreter nobody can debug in the IDE.
public final class KeywordEngine {
    public void run(Path excel) {
        for (Step step : ExcelSteps.read(excel)) {
            Object page = PageRegistry.get(step.page());
            Method action = page.getClass().getMethod(step.keyword(), String.class);
            action.invoke(page, step.arg());          // runtime errors, no refactor
        }
    }
}
// Excel row: LoginPage | type | email | user@test.com

// KISS — same scenario as Java the IDE can rename, grep, and debug.
@Test
public void userLogsIn() {
    HomePage home = new LoginPage(browser)
            .open("/login")
            .login("user@test.com", Secrets.password("user"));
    assertThat(home.signedInName()).isEqualTo("user@test.com");
}

// Justified complexity — wait policy as Strategy, because we already have three.
public interface WaitStrategy { WebElement clickable(By locator); }
// Explicit, fluent, and Appium-specific waits actually exist → pattern earns its keep.
```

**Follow-ups & traps**
- "Our VP wants Cucumber so PMs can write tests." — Cucumber is not free KISS. If PMs will not write Gherkin, you have added an interpreter for developers. Screenplay/keywords have the same honesty check.
- "Is POM itself over-engineering?" — Not at 50+ tests. POM is essential complexity of the UI contract. A fourth abstract layer over POM often is YAGNI.
- Weak answer: "I always use all GoF patterns so the framework is enterprise-ready." That sentence fails this question.
- Trap: calling any abstraction YAGNI. DriverFactory at two browsers is already earned.

**Senior/lead angle** — Hold a "complexity budget": the core may add a pattern when a third implementation exists or when a CI failure mode demands it. Keyword engines require an ADR with a named author population and a debug story. Most ADRs should conclude "not yet."

**One-liner** — Ship page objects and flows first; a keyword DSL is a new language you will debug without an IDE — do not build it for users who are not in the room.

### Q10. Law of Demeter in page objects (`test.loginPage.header.userMenu.logout` — too much chaining)

**Interview answer** — The Law of Demeter says a test should talk only to its immediate collaborators, not reach through them. `loginPage.header.userMenu.logout()` means the test knows the header internals, the menu internals, and the logout action — four types coupled to one line. I expose `home.logout()` (or a Session / Header API) so the test asks a friend, not a friend-of-a-friend. Internally the page may compose Header and UserMenu.

**Deep dive** — UML-in-words: Test → HomePage → Header → UserMenu → WebElement. Demeter trains you to flatten the last three hops behind HomePage (or a Header component used as a collaborator of the test, not a chain). The chain is attractive because it mirrors the DOM. It hurts because a header redesign breaks tests that never cared about the header structure, and because it leaks locators/components into every caller. Trade-off: flattening can turn HomePage into a God facade (`home.logout()`, `home.search()`, `home.openCart()`). The balanced design is: tests that are *about* the header take a Header component; tests that merely need to logout call `session.logout()` on a small Session/Header service composed into the fixture. When NOT to flatten: a dedicated Header visual test should talk to Header directly — that is its immediate collaborator. Demeter is about not reaching *through*; it is not "one object for the whole app."

**Code**

```java
// VIOLATION — test knows three internals.
@Test
public void userCanLogOut() {
    loginPage.header.userMenu.open().logout();       // friend of a friend of a friend
}

// STILL A VIOLATION — fluent chain, same coupling.
loginPage.getHeader().getUserMenu().logout();

// BETTER — test talks to a session collaborator. Pages compose the widgets.
public final class Header {
    private final ElementActions ui;
    private final By menu = By.cssSelector("[data-testid=user-menu]");
    private final By logout = By.cssSelector("[data-testid=logout]");

    public void logout() {
        ui.click(menu);
        ui.click(logout);
    }
}

public final class HomePage {
    private final Header header;
    public HomePage(ElementActions ui) { this.header = new Header(ui); }
    public Header header() { return header; }         // available for header-focused tests
    public void logout() { header.logout(); }         // Demeter-friendly for everyone else
}

public final class Session {
    private final Header header;
    public Session(Header header) { this.header = header; }
    public void logout() { header.logout(); }
}

@Test
public void userCanLogOut() {
    home.logout();                                    // or session.logout()
    assertThat(browser.currentPath()).isEqualTo("/login");
}

@Test
public void userMenuShowsAccountName() {              // this test *is* about the header
    assertThat(home.header().accountName()).isEqualTo("Ada");
}
```

**Follow-ups & traps**
- "Isn't `home.header().accountName()` still a chain?" — One hop to a component the test is asserting on is fine. Three hops to reach an action is the smell.
- "Appium page source is a tree — should tests walk it?" — No. Same rule: Screen objects expose gestures, they do not return raw MobileElements to the test to chain `findElement.findElement`.
- Weak answer: "I never expose components." Then HomePage becomes a God class (Q2). Demeter and SRP both have to win.
- Trap: returning `this` from every widget method so the test can fluent-chain across widgets. Fluency is not a get-out-of-Demeter card.

**Senior/lead angle** — A lint/review rule: tests may call methods on pages and on components they received as fixtures; they may not call `getX().getY()`. Component objects are first-class, injected, not reached through.

**One-liner** — Tests ask a page or a header to logout; they do not walk `loginPage.header.userMenu` like a DOM tree.

### Q11. Coupling and cohesion in framework packages

**Interview answer** — Cohesion is "do the types in this package change for the same reason?"; coupling is "how many packages must move when this one does?" I want `pages.checkout` highly cohesive (only checkout UI), `api.orders` cohesive (only order HTTP), and I want tests depending downward on those, never the reverse. The smell is a `common` package that everything imports and that imports everything — low cohesion, high coupling, impossible to split across teams.

**Deep dive** — Structure: a healthy graph is a DAG — `tests` → `flows` → `pages`/`api` → `infra` (driver, http, config). `infra` never imports `tests`. Horizontal coupling (checkout pages importing cart pages' locators) should go through a component or a public flow, not through internals. Metrics you can actually use: afferent/efferent coupling, and "who imports this package?" Afferent high on `infra.config` is expected; afferent high on a single test helper is a hub of death. Trade-off: more packages increase navigation cost. When NOT to split packages: a 15-class framework. Package lines should follow team and change axes (web vs mobile vs api, or domain bounded contexts) rather than technical layers alone — a `checkout` vertical slice (pages + api + flows) can be more cohesive than a global `pages` dump. GRASP High Cohesion / Low Coupling is this question.

**Code**

```text
com.company.automation
  config/          # cohesive: env, timeouts, secrets access. imported by many, imports none
  infra/
    driver/        # DriverFactory, ThreadLocal store, Browser adapters
    http/          # RestAssuredClient implements ApiClient
  pages/
    checkout/      # CartPage, AddressPage, PaymentPage — one domain
    account/       # LoginPage, ProfilePage
    components/    # Header, CookieBanner — shared widgets
  flows/           # CheckoutFlow, LoginHelper — orchestration, no locators
  api/
    orders/        # OrderClient
    users/         # UserClient
  data/            # builders, not shared mutable STANDARD data
  tests/
    checkout/      # depends on flows + api + data; never on infra.chrome directly
    account/

FORBIDDEN edges:
  pages → tests
  infra.driver → pages
  pages.checkout → pages.account (use components or a flow)
  tests → org.openqa.selenium.chrome (DIP)
```

```java
// ArchUnit-style guard you can describe on a whiteboard (and actually run).
@AnalyzeClasses(packages = "com.company.automation")
public class PackageRules {
    @ArchTest
    static final ArchRule pages_do_not_depend_on_tests =
            noClasses().that().resideInAPackage("..pages..")
                    .should().dependOnClassesThat().resideInAPackage("..tests..");

    @ArchTest
    static final ArchRule tests_do_not_depend_on_chrome =
            noClasses().that().resideInAPackage("..tests..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("org.openqa.selenium.chrome..");

    @ArchTest
    static final ArchRule pages_do_not_use_jdbc =
            noClasses().that().resideInAPackage("..pages..")
                    .should().dependOnClassesThat().resideInAPackage("java.sql..");
}
```

**Follow-ups & traps**
- "Layered vs feature packages?" — Feature slices (checkout/) scale better with multiple teams; technical layers (pages/, api/) scale better with one team. Hybrid: feature packages that internally layer.
- "Where do listeners live?" — `infra.report`, depended on by the runner config, not by tests. Tests should not call the reporter.
- Weak answer: listing Maven modules without saying which way dependencies point.
- Trap: a `core` module that became the new `common`. High afferent *and* high efferent means it is a knot, not a core.

**Senior/lead angle** — Draw the DAG in the README and enforce it with ArchUnit in CI. When a team needs to violate an edge, that is an ADR, not a quiet import. Package design is how you split ownership later.

**One-liner** — Packages change for one reason and depend downward — tests to flows to pages/api to infra — and `common` is not a package strategy.

### Q12. How do you review a PR for design (not just style)?

**Interview answer** — Style is formatter and Checkstyle; design review asks where the new code sits in the DAG, what it depends on, whether it introduces shared mutable state, and what will have to change when the UI or the API changes. I look for SRP breaks (asserts in pages, JDBC in pages), new statics, new methods on fat interfaces, TestNG inheritance growth, and fixtures that hide data contracts. I also ask "what is the blast radius if this locator or this helper changes?"

**Deep dive** — A practical checklist, in order: (1) Direction of dependencies — did a page import Rest Assured? (2) State — static WebDriver, static test data, ThreadLocal without remove, `@BeforeSuite` mutation. (3) Surface area — new public methods on core types, fattened interfaces (ISP). (4) Duplication vs coupling — copied locator vs a hidden shared fixture (Q8). (5) Waits — new `Thread.sleep`, implicit waits, hard timeouts. (6) Parallel safety — will this pass with `parallel=methods`? (7) Test intent — can I read the test and know the oracle without opening five helpers? (8) YAGNI — is this Abstract Factory for one implementation? Trade-off: over-reviewing design on a one-line locator fix burns goodwill. Match the depth to the blast radius. When NOT to block: stylistic preference about builder vs factory when both are already in the codebase — pick the local convention. GRASP Controller: if the test became the controller of six pages, request a flow object.

**Code**

```text
Design review notes I'd leave on a PR (examples):

[block] pages/CheckoutPage.java now calls OrderRepository.find()
        → DIP/SRP: move the DB read to the test arrange/assert.

[block] DriverFactory.getInstance() returns a static ChromeDriver
        → parallel-unsafe singleton; use ThreadLocal factory (see Q3/Q6).

[block] IPage gained swipe() and hideKeyboard() with default no-ops
        → ISP + LSP; put gestures on a mobile-only interface.

[comment] test reaches loginPage.header.userMenu.logout()
        → Demeter; add HomePage.logout() or inject Header.

[comment] SharedFixtures.STANDARD_ORDER mutated in @BeforeMethod
        → hidden coupling; switch to OrderBuilder per test.

[nit] new AbstractPageFactory with one implementation
        → YAGNI; a method on DriverFactory is enough until a second family exists.

[pass] CheckoutFlow extracted; tests no longer chain three pages.
[pass] ArchUnit still green; no new edge from pages → api.
```

```java
// A review-friendly test: intent, local data, flow, oracle — no hidden fixture.
@Test
public void declinedCardShowsInlineError() {
    OrderPayload order = new OrderBuilder().withCard(Cards.DECLINED).build();
    PaymentPage payment = new CheckoutFlow(browser).toPayment(order);
    payment.submit();
    assertThat(payment.errorBanner()).contains("declined");
}
```

**Follow-ups & traps**
- "How is this different from a code-quality rubric?" — Quality is cyclomatic complexity and naming. Design is dependencies, state, and change axes. You can have pretty code that is undeployable in parallel.
- "What if the author says they'll refactor later?" — Shared mutable state and DAG violations do not get later; extra interfaces can.
- Weak answer: "I check that they used POM and a factory." That is a keyword scan, not a design review.
- Trap: rewriting the PR in your style. Lead review proposes the boundary, does not reimplement the page.

**Senior/lead angle** — Encode the checklist: ArchUnit, a ban on `Thread.sleep`, a PR template with "parallel-safe? shared state? new core API?" Design review that lives only in your head does not survive vacation. Mentoring is walking one PR live against this list.

**One-liner** — Review the DAG, the state, and the blast radius — if a locator or helper change would surprise twenty tests, the design is the defect.

### Q13. When is a "utils" package an anti-pattern?

**Interview answer** — A `utils` package is an anti-pattern when it is a dumping ground: date math, WebDriver waits, Excel readers, screenshot helpers, and a `StringUtils` fork in one place, with no owner and every other package importing it. That package has low cohesion and maximum coupling. I allow small cohesive modules named after the domain — `dates`, `money`, `retry` — and I keep wait/screenshot/driver code in `infra`, not in utils.

**Deep dive** — Why it happens: "I don't know where this goes" plus a 200-line `TestUtils.java`. Why it hurts: nothing can be split across repos because everything depends on utils, and utils depends on Selenium, Rest Assured, POI, and Allure — a knot (Q11). The test is: does the file name describe a reason to change? `WaitUtils` maybe; `GenericUtils` no. Promotion rule: a helper gets a shared home when a second consumer appears, not before (otherwise you couple on speculation). Utils that hold WebDriver or static state are not utilities; they are hidden infrastructure with the wrong name. When a utils package is acceptable: a handful of pure functions (ISO date formatting, money comparison) with no Selenium imports, covered by unit tests, no mutable statics. When NOT to create one: day one of the framework. Start with `infra` and `data`.

**Code**

```text
# Anti-pattern
utils/
  TestUtils.java          # 2,400 lines: waits, Excel, JSON, screenshots, random names
  GenericHelper.java
  Constants.java          # URLs, locators, passwords

# Cohesive replacement
infra/driver/ElementActions.java    # waits + clicks — framework, has tests
infra/report/Screenshots.java
infra/http/RestAssuredClient.java
data/builders/OrderBuilder.java
data/ids/Unique.java                # UUID/time-based ids for parallel isolation
support/dates/BusinessDays.java     # pure functions, no WebDriver import
support/money/MoneyAssert.java
```

```java
// Forbidden shape.
public final class TestUtils {
    public static WebDriver driver;                   // singleton driver in utils
    public static void sleep(int ms) { Thread.sleep(ms); }
    public static void click(String xpath) { driver.findElement(By.xpath(xpath)).click(); }
    public static Workbook readExcel(String path) { /* ... */ }
    public static void screenshot(String name) { /* ... */ }
}

// Acceptable utility — pure, cohesive, no driver.
public final class BusinessDays {
    private BusinessDays() {}
    public static LocalDate plus(LocalDate from, int days) { /* skip weekends/holidays */ }
}

// Driver-facing code lives in infra and is instance-scoped.
public final class ElementActions {
    private final WebDriver driver;
    private final WebDriverWait wait;
    public void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }
}
```

**Follow-ups & traps**
- "What about Apache Commons / Guava?" — Depend on them; don't wrap every method in `TestUtils`. A wrap is justified only to standardize an error policy.
- "Our utils hold locators in a properties file." — That is an object repository, not utils. Debate it on its own (indirection vs greppability); don't hide it in TestUtils.
- Weak answer: "Utils are fine if we name them well." A well-named junk drawer is still a junk drawer.
- Trap: `WaitUtils.click()` that takes a raw xpath string. You have bypassed POM *and* created a util hub.

**Senior/lead angle** — Ownership: every shared module has a CODEOWNERS entry. `utils/` with no owner is how dead Excel helpers live forever. Periodically demote one-consumer "shared" helpers back next to their feature.

**One-liner** — Utils are an anti-pattern when they mix waits, Excel, and a static driver; pure domain helpers may exist, infrastructure may not hide there.

### Q14. How SOLID applies to Playwright TypeScript as well

**Interview answer** — The letters do not change; the seams do. In Playwright, fixtures *are* DIP and composition — tests depend on injected `page`, `api`, and page objects, not on `chromium.launch()`. SRP still bans assertions and DB in page objects. OCP is a new fixture or a new project instead of editing a DriverFactory switch. LSP is about custom fixtures and locators honoring the Page/Locator contract (don't return `null` from a helper that should throw). ISP is small fixture types instead of one mega `test.extend` with thirty fixtures. I would not port Java's BrowserProvider SPI blindly; I would use Playwright's fixtures and projects as the extension model.

**Deep dive** — Contrast table, in words: Java Selenium needs ThreadLocal + factory to get the isolation Playwright gives per test via context. Java DIP is interfaces plus a composition root; Playwright DIP is `test.extend`. Java OCP is a provider registry; Playwright OCP is a new project in `playwright.config.ts` or a new fixture file. Java Template-Method BaseTest is the thing Playwright teams should not recreate with a deep `extends`; mergeTests and fixture composition replace it. LSP breaks in TS are subtler (structural typing): a fake `Page` that only implements three methods will compile if you type it loosely, then blow up. ISP: one giant `Fixtures` type is the fat interface. YAGNI: Playwright already has auto-wait, tracing, storageState — wrapping Page in a custom Driver to "look like Selenium" is usually an Adapter you should not build (see the Adapter question in the creational/structural file). When NOT to over-apply: a POM that simply holds locators as `this.page.getByRole(...)` is enough; a Java-style ElementActions layer on top of Locator throws away auto-wait.

**Code**

```ts
// DIP + composition — tests depend on fixtures (abstractions), not on chromium.launch().
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { OrderBuilder } from '../data/order.builder';

type Fixtures = {            // ISP: grow this slowly; split files and mergeTests when it fattens
  api: ApiClient;
  loginPage: LoginPage;
};

class ApiClient {            // DIP: tests do not call request.get directly everywhere
  constructor(private request: APIRequestContext, private baseURL: string) {}
  post<T>(path: string, body: unknown) {
    return this.request.post(this.baseURL + path, { data: body }).then(r => r.json() as Promise<T>);
  }
}

export const test = base.extend<Fixtures>({
  api: async ({ request, baseURL }, use) => {
    await use(new ApiClient(request, baseURL!));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

// SRP — page owns locators + actions, not asserts, not DB.
export class LoginPage {
  constructor(private page: Page) {}
  async login(user: string, pass: string) {
    await this.page.getByLabel('Email').fill(user);
    await this.page.getByLabel('Password').fill(pass);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}

test('guest checkout', async ({ api, page, loginPage }) => {
  const order = new OrderBuilder().asGuest().build();     // data builder, not a shared STANDARD
  await api.post('/orders', order);
  await loginPage.login(order.email, order.password);
  await expect(page.getByRole('heading', { name: /order/i })).toBeVisible();
});

// OCP — add Firefox by adding a project, not by editing test code.
// playwright.config.ts: projects: [{ name: 'ff', use: { browserName: 'firefox' } }]

// LSP trap in TS — a partial fake Page that returns null instead of throwing.
const fakePage = { locator: () => null } as unknown as Page;  // compiles with a cast, violates contract
```

**Follow-ups & traps**
- "So we don't need DriverFactory in Playwright?" — Correct for browser creation. You may still want a factory for API clients and data. Don't clone Selenium's factory onto `chromium.launch` without a reason.
- "Is storageState a Singleton?" — No. It is a file-backed memento of auth, applied per context. Singleton would be one shared Page across tests.
- Weak answer: "SOLID is a Java thing." The interviewer is checking whether you can transfer the design, not the syntax.
- Trap: wrapping Locator in a custom Element class that adds `waitForTimeout`. That fights the tool and breaks LSP relative to auto-wait.

**Senior/lead angle** — In a mixed org, publish one design language: "pages don't assert, no shared mutable driver, fixtures/composition over BaseTest, builders over STANDARD data." The Java and TS implementations differ; the review rubric does not. That is how a lead talks SOLID without starting a tool war.

**One-liner** — Playwright fixtures are DIP and composition baked in — still split SRP on pages, still refuse fat fixtures and fake Pages that lie about the contract.
