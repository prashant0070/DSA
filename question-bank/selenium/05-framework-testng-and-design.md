# TestNG, Listeners & Selenium Framework Design

This file is how a Java shop actually ships Selenium: TestNG lifecycle, data providers, failure screenshots, parallel XML, assertions, retries, Page Object Model that stores `By` not `WebElement`, PageFactory's honest limits, hybrid-framework interview speak, and how to organize thousands of tests. It assumes Selenium 4.x, Java 17, ThreadLocal WebDriver, and no DesiredCapabilities.

- Q1. TestNG annotations and execution order; groups; dependsOnMethods smell.
- Q2. @DataProvider — parallel providers, Object[][], Iterator, Excel/JSON/CSV.
- Q3. @Factory vs @DataProvider.
- Q4. Screenshots for failed tests — ITestListener + ThreadLocal + Extent/Allure.
- Q5. Execute TestNG tests in parallel — suite XML + surefire.
- Q6. Assert vs Verify (hard vs SoftAssert and the forgotten assertAll).
- Q7. RetryAnalyzer — flakes, when retry is acceptable, IAnnotationTransformer.
- Q8. Page Object Model — By locators, fluent returns, PageFactory debate, LoginPage.
- Q9. Page Factory initElements, AjaxElementLocatorFactory — honest assessment.
- Q10. Hybrid framework — keyword + data + POM, sane architecture.
- Q11. Key components of a Selenium framework and folder tree.
- Q12. Design patterns in Selenium frameworks.
- Q13. How do you make a Selenium framework scalable?
- Q14. Jenkins integration.
- Q15. BaseTest design vs listeners vs utilities; inheritance smell.
- Q16. Organizing thousands of Selenium tests.

### Q1. TestNG annotations and execution order (BeforeSuite → BeforeTest → BeforeClass → BeforeMethod → Test → After*). Groups, dependsOnMethods smell.

**Interview answer** — TestNG runs `@BeforeSuite` once per `<suite>`, `@BeforeTest` once per `<test>` tag in XML (not once per `@Test` method — that naming is the classic trap), `@BeforeClass` once per class, `@BeforeMethod` before each `@Test`, then the test, then matching `After*` in reverse spirit (`AfterMethod`, `AfterClass`, `AfterTest`, `AfterSuite`). I put Grid session start/stop in `@BeforeMethod`/`@AfterMethod` for parallel methods. Groups (`@Test(groups="smoke")`) select subsets. `dependsOnMethods` couples tests into a chain that parallel and retries both punish — I avoid it for checkout steps and use a single test or API setup instead.

**Deep dive** — The `@BeforeTest` trap: people put `new ChromeDriver()` there expecting per-method, then add `parallel="methods"` and share one browser. `@BeforeTest` is suite-XML scoped.

`alwaysRun = true` on AfterMethod so a failed BeforeMethod still tries cleanup if a driver was set. `enabled=false` vs groups: groups are for CI selection; `enabled` is a kill switch.

`@BeforeGroups` / `@AfterGroups` run around a group's tests — rare, surprising in parallel.

Order among multiple `@BeforeMethod` in a hierarchy: superclass before subclass (typically); don't rely on sibling method name order — use `dependsOnMethods` only inside the same class for Before* if you must, or one method that calls helpers.

`dependsOnMethods = "login"` on `placeOrder`: if login fails, placeOrder is skipped (not failed). You lose a signal, you cannot run placeOrder in isolation, retries restart the chain (see Retry). Smell: encode login in `@BeforeMethod` or a fluent `givenLoggedInBuyer()`.

Groups + surefire: `-Dgroups=smoke`. Do not invent two conflicting grouping systems (TestNG groups and JUnit tags) in one repo.

**Code**

```java
@BeforeSuite
public void startReport() { /* Extent/Allure environment */ }

@BeforeMethod(alwaysRun = true)
public void startDriver() throws Exception { DriverFactory.start(AppConfig.get(), "chrome"); }

@Test(groups = {"smoke", "checkout"})
public void placeOrderHappyPath() { /* ... */ }

@AfterMethod(alwaysRun = true)
public void stopDriver() { DriverFactory.unload(); }
```

**Follow-ups & traps**
- "`@BeforeTest` runs before each `@Test`?" — No. XML `<test>`.
- Trap: `dependsOnMethods` for a four-step wizard. Make it one `@Test` with steps or API-seeded state.
- `@AfterSuite` `quit` as the only teardown — leaks for the whole suite.

**One-liner** — Suite → Test (XML) → Class → Method → `@Test`; groups select; `dependsOnMethods` is a serial chain that fights parallel.

### Q2. @DataProvider — parallel data providers, returning Object[][], Iterator; Excel/JSON/CSV feeding.

**Interview answer** — `@DataProvider` supplies rows to `@Test(dataProvider=...)`. `Object[][]` is the simple form (each inner array is one invocation). `Iterator<Object[]>` streams rows so you need not materialize a 10,000-line Excel in memory. I keep providers in a dedicated class, load JSON/CSV with Jackson/OpenCSV, and map to a `record LoginCase(String email, String password, String expectedFlash)`. `parallel=true` on the provider uses `data-provider-thread-count` — the provider must return data only, not a WebDriver.

**Deep dive** — Indices: first dimension = invocations, second = method parameters. Mismatch is a runtime error.

Excel: Apache POI in a `ExcelData` util — fine, but JSON/CSV review better in PRs. Do not put passwords in a committed xlsx; encrypt or use env for secrets and files for SKUs.

`ITestContext` / `Method` as extra provider parameters: TestNG injects them so you can branch on groups.

Parallel providers: each row can run concurrently. Isolation: unique emails `buyer-%s@example.com`.formatted(UUID). Same coupon code on all rows will clash.

Soft assertion + data provider: `assertAll` per invocation, not across rows.

**Code**

```java
public record LoginCase(String email, String password, boolean expectSuccess) {}

@DataProvider(name = "loginCases")
public Object[][] loginCases() {
    return new Object[][] {
            { new LoginCase("buyer@example.com", "correct-horse", true) },
            { new LoginCase("buyer@example.com", "wrong", false) },
            { new LoginCase("not-an-email", "x", false) }
    };
}

@Test(dataProvider = "loginCases")
public void loginMatrix(LoginCase row) {
    new LoginPage(DriverFactory.get()).login(row.email(), row.password());
    if (row.expectSuccess()) {
        Assertions.assertTrue(DriverFactory.get().getCurrentUrl().contains("/account"));
    } else {
        Assertions.assertTrue(new LoginPage(DriverFactory.get()).flashText().toLowerCase().contains("invalid"));
    }
}
```

**Follow-ups & traps**
- Trap: creating ChromeDriver inside the provider.
- Excel as the only source of truth for locators — that is keyword-driven hell (Q10).
- `Object[][]` of 50 columns unnamed — use a record.

**One-liner** — Data providers feed typed rows (`record` + JSON/CSV/Excel); they must not own WebDriver, especially when `parallel=true`.

### Q3. @Factory vs @DataProvider.

**Interview answer** — `@DataProvider` parametrizes a *method* (N invocations of one `@Test`). `@Factory` parametrizes *instance creation*: TestNG constructs N objects of the test class with different constructor args, then runs all `@Test` methods on each instance. Factory is useful when the whole class should bind to a browser or a locale (`new CheckoutIT("chrome")`, `new CheckoutIT("firefox")`). For a login matrix, DataProvider is simpler. Combining both is how people get N×M explosions they did not intend.

**Deep dive** — Factory methods return `Object[]` of test instances. Those instances can have their own `@DataProvider` tests — multiplicative. Listeners see distinct instances; reports get messier.

When Factory wins: class-level fixtures that are expensive to express per method (a custom profile, a mobile emulation Options set). Even then a TestNG XML `<test>` parameter plus `@Parameters` is often clearer.

DataProvider wins: 20 SKUs through the same `addToCart` method.

Interview trick: "How do you run the same class on two browsers?" — XML `<test>` parameters (Q5) or Factory. I prefer XML for browsers so CI can shard by `<test>` without code.

**Code**

```java
@Factory
public static Object[] browsers() {
    return new Object[] { new SearchIT("chrome"), new SearchIT("firefox") };
}

public class SearchIT {
    private final String browser;
    public SearchIT(String browser) { this.browser = browser; }

    @BeforeMethod
    public void open() throws Exception { DriverFactory.start(AppConfig.get(), browser); }

    @Test
    public void searchOrders() { /* ... */ }
}
```

**Follow-ups & traps**
- Trap: using Factory because it "sounds more enterprise" than DataProvider.
- Factory + parallel classes — know which instance lands on which thread; still ThreadLocal.

**One-liner** — DataProvider parametrizes methods; Factory parametrizes test class instances — use Factory sparingly (e.g. browser-bound classes), not for login tables.

### Q4. How do you capture screenshots for failed tests? ITestListener onTestFailure + ThreadLocal driver + Extent/Allure attach. Full listener code.

**Interview answer** — An `ITestListener` `onTestFailure` pulls `WebDriver` from `DriverFactory.getOptional()`, takes `TakesScreenshot` BYTES, writes a unique file, and attaches to Allure/Extent. The listener must not assume the driver exists (failure in `@BeforeMethod`). ThreadLocal is mandatory so parallel methods do not screenshot the sibling thread's checkout. I do not put screenshot calls in every catch in the test.

**Deep dive** — `ITestListener` vs `TestListenerAdapter` vs `@AfterMethod(ITestResult)`: AfterMethod also works and has easy access to result status; a listener is reusable across suites without every class remembering to call `screenshot()`. Both can coexist; pick one primary path to avoid duplicate PNGs.

`onTestSkipped` after a failed dependency — maybe screenshot, maybe not (driver may already be dead).

Extent: `MediaEntityBuilder.createScreenCaptureFromBase64String`. Allure: `Allure.addAttachment("failure", "image/png", bytes, ".png")`.

Name: `{class}.{method}-{browser}-{threadId}-{timestamp}.png`.

**Code**

```java
public class FailureScreenshotListener implements ITestListener {
    @Override
    public void onTestFailure(ITestResult result) {
        DriverFactory.getOptional().ifPresent(driver -> {
            try {
                byte[] png = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
                String name = result.getTestClass().getRealClass().getSimpleName()
                        + "." + result.getMethod().getMethodName()
                        + "-" + Thread.currentThread().threadId();
                Path dest = Path.of("target", "screenshots", name + ".png");
                Files.createDirectories(dest.getParent());
                Files.write(dest, png);
                Allure.addAttachment(name, "image/png", new ByteArrayInputStream(png), ".png");
            } catch (Exception e) {
                result.setThrowable(new AssertionError("screenshot failed: " + e.getMessage(), result.getThrowable()));
            }
        });
    }
}
```

**Follow-ups & traps**
- Trap: `DriverFactory.get()` throwing in the listener, masking the original assertion.
- Alert open — screenshot may fail; try dismiss then capture, or catch and still attach logs.
- Register in `testng.xml` `<listeners>` or `@Listeners` — missing registration is "our listener doesn't run."

**One-liner** — `ITestListener.onTestFailure` + ThreadLocal driver + unique PNG bytes attached to Allure/Extent; never a static `driver.screenshot()`.

### Q5. How do you execute TestNG tests in parallel? suite XML + surefire parallel.

**Interview answer** — Two knobs must agree: `testng.xml` (`parallel="methods|classes|tests"` and `thread-count`) and Maven Surefire (`<parallel>` / `<threadCount>` or `suiteXmlFiles` only). I prefer suite XML as the source of truth (`surefire` just points at the XML) so local and Jenkins run the same graph. Thread-count is sized to Grid slots, not to "as many as CI cores."

**Deep dive** — If Surefire parallel *and* XML parallel both fire, you can get surprising pools. Canonical: `<suiteXmlFiles>src/test/resources/testng.xml</suiteXmlFiles>` and no Surefire parallel.

Shard in CI: multiple jobs with different XMLs (`smoke.xml`, `checkout.xml`) or TestNG `<packages>` + Jenkins matrix. Unlike Playwright `--shard`, TestNG does not hash-split one class list unless you add a plugin or split XMLs.

`preserve-order="true"` vs parallel — order is not guaranteed across threads.

**Code**

```xml
<suite name="shop-regression" parallel="methods" thread-count="8">
  <listeners>
    <listener class-name="com.shop.qa.listeners.FailureScreenshotListener"/>
  </listeners>
  <test name="chrome">
    <parameter name="browser" value="chrome"/>
    <packages>
      <package name="com.shop.qa.tests.checkout"/>
      <package name="com.shop.qa.tests.orders"/>
    </packages>
  </test>
</suite>
```

```xml
<!-- surefire: XML is the orchestrator -->
<configuration>
  <suiteXmlFiles>
    <suiteXmlFile>src/test/resources/testng-smoke.xml</suiteXmlFile>
  </suiteXmlFiles>
</configuration>
```

**Follow-ups & traps**
- Trap: Surefire `threadCount=8` with a suite `parallel=false` — you think you parallelized.
- JUnit engine vs TestNG — this file is TestNG; mixed engines in one module confuse surefire.

**One-liner** — Drive parallel from `testng.xml` (`parallel` + `thread-count` sized to Grid); Surefire should execute that XML, not a second parallel policy.

### Q6. Assert vs Verify (hard assert vs soft assert SoftAssert.assertAll — and the forgotten assertAll trap).

**Interview answer** — Hard asserts (`Assert.assertEquals`, AssertJ, JUnit `Assertions`) abort the test at the first failure — good for "we are not on `/checkout`, stop." Soft asserts (`SoftAssert`) record failures and continue so you can gather that total, tax, and shipping are all wrong in one run. The trap is forgetting `soft.assertAll()` — the test **passes**. I use hard asserts for control flow and a small soft block for a group of independent field checks on the order confirmation page.

**Deep dive** — TestNG `Assert` vs `org.testng.asserts.SoftAssert`. `verify*` in old TestNG docs is the soft idea, not a separate API you should hunt for. AssertJ `SoftAssertions.assertAll()` has the same trap.

Do not soft-assert that login succeeded and then try to checkout — you will get a pile of secondary exceptions. Hard-assert the invariant, soft-assert the details.

Parallel: one `SoftAssert` instance per test method, not a field on a shared page object.

Verify in old QTP/UFT language ≈ soft assert. In TestNG there is no `verifyEquals` you should hunt for — people mix JUnit `Assert` and TestNG `Assert` in one class; pick one. AssertJ `SoftAssertions.assertSoftly(s -> { ... })` auto-calls `assertAll` at the end of the lambda — that is the safer soft API if the team already uses AssertJ.

When a soft block fails, you still want a screenshot of the confirmation page; the listener runs on `onTestFailure` after `assertAll` throws. Do not catch `AssertionError` from `assertAll` to "continue the suite."

**Code**

```java
Assert.assertTrue(driver.getCurrentUrl().contains("/orders/confirmation"), "should land on confirmation");

SoftAssert soft = new SoftAssert();
OrderConfirmationPage page = new OrderConfirmationPage(driver);
soft.assertEquals(page.email(), "buyer@example.com");
soft.assertEquals(page.total(), "$42.00");
soft.assertTrue(page.orderId().matches("ORD-\\d+"));
soft.assertAll();
```

**Follow-ups & traps**
- Trap: class-level `SoftAssert` reused across methods — leaked failures or lost failures.
- "We only use soft asserts so CI shows everything." Then a missing `assertAll` shows nothing. Prefer hard + one confirmation soft block.

**One-liner** — Hard assert stops the test; SoftAssert continues and *must* `assertAll()` or the test passes — never soft-assert control-flow invariants.

### Q7. RetryAnalyzer — why retries hide flakes; when a retry is acceptable; IAnnotationTransformer to attach retry.

**Interview answer** — `IRetryAnalyzer` re-runs a failed `@Test` up to N times. A retry that then passes is a flake the dashboard may still paint green. I allow *one* retry in CI for known infrastructure noise (Grid slot steal, ephemeral 502) while we fix it, never three retries as a stability strategy, and never retry `AssertionError` from a wrong total. `IAnnotationTransformer` attaches the analyzer globally so authors cannot forget (or so they cannot silently add retries on a class).

**Deep dive** — Why retries hide flakes: the first failure's screenshot is the truth; the pass is a different timing. If reports keep only the last result, you lose the failure. Allure/TestNG must show retry history.

Acceptable: `SessionNotCreatedException`, connection reset to Grid, HTTP 502 on `get(baseUrl)` during deploy. Unacceptable: `NoSuchElementException` on Place Order, stale, intercept — those are test or product bugs.

Implementation: retry count in a `ThreadLocal<Integer>` keyed by method, because the analyzer instance may be reused.

Transformer:

```java
public class RetryTransformer implements IAnnotationTransformer {
    @Override
    public void transform(ITestAnnotation annotation, Class testClass, Constructor testConstructor, Method testMethod) {
        annotation.setRetryAnalyzer(InfraRetryAnalyzer.class);
    }
}
```

Quarantine (`enabled=false` or group `flaky`) is more honest than retry=3 for a bad test.

**Code**

```java
public class InfraRetryAnalyzer implements IRetryAnalyzer {
    private static final int MAX = 1;
    private final AtomicInteger n = new AtomicInteger();

    @Override
    public boolean retry(ITestResult result) {
        Throwable t = result.getThrowable();
        boolean infra = t instanceof org.openqa.selenium.SessionNotCreatedException
                || (t != null && t.getMessage() != null && t.getMessage().contains("disconnected"));
        return infra && n.incrementAndGet() <= MAX;
    }
}
```

**Follow-ups & traps**
- Trap: retry everything twice to "get green CI."
- `dependsOnMethods` + retry restarts the chain — another reason to avoid depends.
- Count retries as a quality metric; if retry rate climbs, stop shipping features into that suite.

**Senior/lead angle** — Flake budget: >1% retried-then-pass is a platform incident, not a TestNG setting.

**One-liner** — One infra-only retry is a shock absorber; retries on assertion failures hide flakes — attach via `IAnnotationTransformer` and measure them.

### Q8. Page Object Model in Selenium: store By locators not WebElements; constructor(WebDriver); fluent returns; PageFactory/@FindBy debate (lazy proxy still stale-prone; many seniors avoid PageFactory). Full LoginPage + test.

**Interview answer** — A page object wraps a screen: locators as `private static final By`, a `WebDriver` (and wait) from the constructor, and methods named like user intent (`login`, `placeOrder`). Methods that navigate return the next page; asserts on a page can live in the page or in the test — I keep assertions in tests or a small `OrderConfirmationPage.assertPlaced()` that is still readable. I do **not** store `WebElement` fields. I generally skip PageFactory: `@FindBy` proxies cache after first use and go stale, and they hide the `By` from waits.

**Deep dive** — Fluent: `loginPage.enterEmail(e).enterPassword(p).submit()` returning `AccountPage`. Over-fluent (`click().click().click()`) is theater. Returning `this` for same-page fills is useful.

Component objects: `HeaderNav`, `MiniCart` composed into pages — same `By` rule.

No WebDriver in tests except `get()` into the first page — some teams pass DriverFactory into pages statically; constructor injection is easier to test.

PageFactory debate belongs in Q9; the senior one-liner here: "By + wait in methods."

**Code**

```java
public final class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    private static final By EMAIL = By.id("email");
    private static final By PASSWORD = By.id("password");
    private static final By SUBMIT = By.cssSelector("[data-testid=login-submit]");
    private static final By FLASH = By.cssSelector("[data-testid=login-flash]");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public AccountPage login(String email, String password) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(EMAIL)).sendKeys(email);
        driver.findElement(PASSWORD).sendKeys(password);
        wait.until(ExpectedConditions.elementToBeClickable(SUBMIT)).click();
        wait.until(ExpectedConditions.urlContains("/account"));
        return new AccountPage(driver);
    }

    public String flashText() {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(FLASH)).getText();
    }
}

public class LoginTest extends BaseTest {
    @Test
    public void buyerLogsInAndSeesOrdersLink() {
        WebDriver driver = DriverFactory.get();
        driver.get(AppConfig.get().baseUrl() + "/login");
        AccountPage account = new LoginPage(driver).login("buyer@example.com", "correct-horse");
        Assertions.assertTrue(account.ordersLinkVisible());
    }
}
```

**Follow-ups & traps**
- Trap: `private WebElement email` assigned in the constructor.
- Assertions in POM vs tests — have a rule; don't fight it in the interview. Many seniors: wait + get in POM, assert in test.
- God page `ShopPage` with 80 methods — split by screen.

**One-liner** — POM stores `By`, takes `WebDriver` in the constructor, re-finds in methods, returns the next page — skip PageFactory.

### Q9. Page Factory initElements, AjaxElementLocatorFactory — honest assessment.

**Interview answer** — `PageFactory.initElements(driver, this)` wires `@FindBy` fields to lazy proxies. The first `email.sendKeys` calls `findElement`. After that the proxy **caches the WebElement**, so a cart re-render produces `StaleElementReferenceException` unless you throw the page away. `AjaxElementLocatorFactory` re-finds with a timeout on *every* access — closer to Playwright locators, slower, still awkward with explicit waits, and still a poor fit for lists. I can explain it; I do not recommend it for a new 4.x framework.

**Deep dive** — Why it exists: 2010s reduction of `driver.findElement`. Why it hurts: locators are strings in annotations, hard to compose, hard to use with `ExpectedConditions.visibilityOfElementLocated(By)`, and `@FindBy(how=How.XPATH, using="//div[3]")` is still brittle.

`AjaxElementLocatorFactory(driver, 10)` plus implicit wait is stacking in disguise.

`@FindBys` / `@FindAll` — AND/OR lists; rarely worth the cognitive load vs a method.

Selenium 4 did not make PageFactory the default recommendation. The `selenium-support` class still exists; that is not an endorsement for Staff-level design.

If a legacy suite is PageFactory: wrap the dangerous bits, do not rewrite overnight; new pages use `By`.

**Code**

```java
// Legacy pattern — know it, don't copy it
public class LegacyLoginPage {
    private final WebDriver driver;
    @FindBy(id = "email") private WebElement email;
    @FindBy(id = "password") private WebElement password;
    @FindBy(css = "[data-testid=login-submit]") private WebElement submit;

    public LegacyLoginPage(WebDriver driver) {
        this.driver = driver;
        PageFactory.initElements(new AjaxElementLocatorFactory(driver, 10), this);
    }
}
```

**Follow-ups & traps**
- Trap: "PageFactory is the official POM in Selenium 4."
- "Ajax factory fixes stale." It reduces stale on single elements; it does not fix cached lists or make waits explicit.
- Mixing `@FindBy` and `WebDriverWait` on the same field — two clocks.

**One-liner** — `initElements` lazy-finds then caches; Ajax re-finds with a hidden timeout — both are inferior to explicit `By` + `WebDriverWait` in a modern POM.

### Q10. Hybrid framework: keyword + data + POM — what "hybrid" means in interviews and a sane architecture (don't oversell keyword-driven).

**Interview answer** — In interviews "hybrid" usually means **data-driven + POM** (and sometimes a thin keyword layer). Keyword-driven — Excel columns `OPEN, CLICK, TYPE` interpreted at runtime — sounds powerful and becomes untyped, un-refactored, and un-IDE-navigable. A sane hybrid: POM for UI, JSON/CSV/`@DataProvider` for data, API clients for setup, TestNG for orchestration. I would not sell a keyword engine unless the org has non-coder authors *and* a budget to build a real DSL.

**Deep dive** — Keyword engines fail because locators still change (now in Excel), waits are generic, git diffs are unreadable, and there is no compiler. `CLICK | //div[3]/button` in a sheet is worse than a bad POM. If business users must author, a curated Java/Kotlin DSL (`Checkout.placeOrder(sku, qty)`) beats a runtime interpreter. Robot Framework is a different product — do not pretend your Excel runner is Robot.

What "hybrid" should mean when you say it:

1. **Data-driven:** `@DataProvider` / JSON / CSV for login matrix, SKUs, locales.
2. **Keyword-ish only as facades:** `CheckoutFlow.buy(sku)` is a business keyword implemented in Java, not a spreadsheet opcode.
3. **POM:** screens and components.
4. **API-augmented:** Rest Assured seeds the cart; Selenium asserts the last mile.

That stack is hybrid in the useful sense — multiple techniques, one architecture. Interviewers who learned "keyword + data + hybrid" from a 2014 institute still want the word; give them the word, then the architecture, then why you did **not** build an Excel VM.

If a vendor sold keyword Excel, plan an exit: wrap each keyword as a facade method, freeze the sheet, new tests in Java POM. Do not add Healenium on top of Excel to "fix" locators.

**Follow-ups & traps**
- Trap: keyword framework as the default Staff answer.
- "Robot Framework is hybrid." It is a different product; this question is about Java Selenium.

**Senior/lead angle** — If a vendor sold keyword Excel, plan an exit: wrap keywords as facade methods, freeze the sheet, new tests in Java POM.

**One-liner** — Hybrid means POM + data-driven (+ API setup); a runtime Excel keyword engine is usually a trap, not a senior architecture.

### Q11. Key components of a Selenium framework (DriverFactory, Config, POM, TestData, Listeners, Utilities, Reports, CI). Folder tree.

**Interview answer** — A production Java Selenium repo is not "tests + pages." It is DriverFactory (ThreadLocal, local/Grid/cloud), Config, page/component objects, flow facades, test data, TestNG listeners, utilities (waits, files), reporting, and CI that runs suite XML. Tests stay thin.

**Deep dive** — Tree:

```text
src/test/java/com/shop/qa/
  config/AppConfig.java
  driver/DriverFactory.java
         OptionsFactory.java
         LaunchStrategy.java
  pages/login/LoginPage.java
        cart/CartPage.java
        components/HeaderNav.java
  flows/CheckoutFlow.java
  data/UserFactory.java
       testdata/login-cases.json
  listeners/FailureScreenshotListener.java
  util/Waits.java
  tests/checkout/PlaceOrderTest.java
        smoke/LoginSmokeTest.java
src/test/resources/testng-smoke.xml
                   testng-regression.xml
```

What stays out of tests: ChromeOptions, raw waits, JSON parsing, Allure plumbing.

**Follow-ups & traps**
- Trap: `Utils.java` with 80 static methods including click and Excel and S3.
- Production code in `src/main` vs tests in `src/test` — framework for tests can live in `src/test` or a `qa-core` module. Multi-module is for multiple teams.

**One-liner** — DriverFactory, Config, POM, flows, data, listeners, reports, CI — tests only script intent.

### Q12. Design patterns in Selenium frameworks: Factory (driver), Singleton (config — with caution), Builder (test data), Strategy (env/browser), Facade (flows), Observer (listeners).

**Interview answer** — Factory creates WebDriver. Strategy picks local/Grid/cloud or Chrome/Firefox Options. Singleton holds immutable config. Builder builds `OrderDraft` test data. Facade (`CheckoutFlow.buy(sku)`) sequences pages so tests do not repeat five page calls. Observer is TestNG listeners (screenshots, timing). I do not force AbstractFactory-on-AbstractFactory; I name the pattern when it is really there.

**Deep dive** — Decorator: logging WebDriver wrap (`EventFiringDecorator` in Selenium 4 replaced `EventFiringWebDriver`). Use for tracing commands, not for business waits.

Template Method: BaseTest lifecycle — keep it small or it becomes inheritance soup (Q15).

Value objects: `Money`, `Sku` — stop passing raw strings everywhere.

Anti-patterns: Singleton driver, Factory that is a 400-line switch, Facade that is a second POM with locators.

**Code**

```java
public final class UserBuilder {
    private String email = "buyer-%s@example.com".formatted(UUID.randomUUID());
    private String password = "correct-horse";
    public UserBuilder email(String email) { this.email = email; return this; }
    public UserBuilder password(String password) { this.password = password; return this; }
    public User build() { return new User(email, password); }
}

public final class CheckoutFlow {
    private final WebDriver driver;
    public CheckoutFlow(WebDriver driver) { this.driver = driver; }
    public OrderConfirmationPage buy(Sku sku) {
        new CatalogPage(driver).addToCart(sku);
        new CartPage(driver).proceed();
        new CheckoutPage(driver).placeOrder();
        return new OrderConfirmationPage(driver);
    }
}
```

**Follow-ups & traps**
- Trap: reciting all GoF patterns including Interpreter for XPath.
- "Which pattern for parallel?" — ThreadLocal is a concurrency pattern; say it.

**One-liner** — Factory + Strategy for drivers, Singleton for immutable config, Builder for data, Facade for flows, Observer for listeners — no Singleton WebDriver.

### Q13. How do you make a Selenium framework scalable? (ThreadLocal, Grid, API setup, tagging, no shared mutable state)

**Interview answer** — Scalability is wall-clock and people. Wall-clock: ThreadLocal sessions, Grid/cloud slots, tests that seed state via API so UI starts at the assertion, smoke vs regression tags, no shared carts. People: package-by-domain, page objects that do not fight, CI shards, flake metrics. Adding 2,000 sleeps or a static driver does not scale.

**Deep dive** — API setup: `POST /api/test/cart` then open `/checkout`. One UI test for the cart page, many API tests for pricing. This is the highest leverage — every UI login you delete is minutes back.

Idempotent tests: create their own buyer, delete in `finally` or rely on ephemeral env reset. No `static OrderId` , no shared coupon with `maxRedemptions=1`.

Config as 12-factor env vars so PR jobs point at ephemeral stacks (`BASE_URL=https://pr-1842.shop-staging.internal`).

Observability: Allure + session id + Grid GraphQL. Flake dashboard by class/package, not a spreadsheet.

Do not scale by cloning the repo per team with diverged DriverFactories — a versioned `qa-core` module. New squads get pages in their package and depend on core.

Horizontal scale: TestNG thread-count sized to Grid slots; CI shards as separate Jenkins jobs with different XMLs (checkout vs search). Vertical: fewer, deeper journeys instead of 50 tests that all login via UI.

People scale: CODEOWNERS, a page-object review checklist (`By` not `WebElement`, no JS click in BasePage), office hours for the platform SDET — not a 200-page Confluence novel nobody reads.

**Follow-ups & traps**
- Trap: "we scale with more Thread.sleep because Grid is slow."
- 10,000 tests × UI login — will not meet a 20-minute gate.

**Senior/lead angle** — Publish a test pyramid target: UI smoke 10 min, UI regression sharded 30 min, API the rest. Selenium's job is the user-visible slice.

**One-liner** — ThreadLocal + Grid + API-seeded tests + tags + zero shared mutable user state — that is how a Selenium suite scales.

### Q14. How do you integrate Selenium tests with Jenkins? (mvn test, surefire XML, junit/allure publish, agents with browsers or Docker)

**Interview answer** — A Jenkins pipeline checks out, `mvn -q test -DsuiteXmlFile=testng-smoke.xml`, publishes Surefire/JUnit XML and Allure, and archives `target/screenshots`. Agents do not need local Chrome if tests point at Grid/cloud; if they run local Chrome, the agent is a Docker image with Chrome + matching selenium-java, or a `docker compose` Grid sidecar. Credentials (Grid URL, cloud key) come from Jenkins credentials, not the pom.

**Deep dive** — Pipeline stages: lint → unit → API → UI smoke (PR) → nightly regression. `H` cron for nightly. Simpler to `mvn test` on an image that has the browser story than to split compile and run across agents unless the suite is huge.

Parallel: Jenkins `parallel` matrix of shards (different XMLs) plus TestNG thread-count inside each agent. Two layers, like Playwright workers + shards.

Agents with browsers: frozen images, not `apt-get chrome` on the fly. Or zero browsers on the agent + Grid URL from credentials.

Allure Jenkins plugin or `allure generate` + HTML publisher. JUnit publisher for the red/green trend. Archive `target/screenshots/**`. Fail the build on test failure — never `|| true`.

```groovy
pipeline {
  agent { label 'qa-maven' }
  environment {
    GRID_URL = credentials('grid-url')
    BASE_URL = 'https://staging.shop.example.com'
  }
  stages {
    stage('UI smoke') {
      steps {
        sh 'mvn -q test -DsuiteXmlFile=src/test/resources/testng-smoke.xml'
      }
    }
  }
  post {
    always {
      junit 'target/surefire-reports/*.xml'
      allure includeProperties: false, jdk: '', results: [[path: 'target/allure-results']]
      archiveArtifacts artifacts: 'target/screenshots/**', allowEmptyArchive: true
    }
  }
}
```

**Follow-ups & traps**
- Trap: Chrome on the Jenkins controller.
- Headless without window-size on the agent.
- Not failing the build on test failure (`|| true`).

**One-liner** — Jenkins runs `mvn test` with the TestNG XML, publishes Allure/JUnit and screenshots, and talks to Grid/cloud rather than installing random Chrome on the controller.

### Q15. BaseTest design: what belongs in BaseTest vs listeners vs utilities. Inheritance explosion as a smell; prefer composition.

**Interview answer** — `BaseTest` may own TestNG lifecycle hooks that start/stop the ThreadLocal driver and maybe load config. Listeners own cross-cutting failure artifacts and retries. Utilities are static-free-ish helpers (parse money, wait for file) used by pages. When you have `BaseTest → WebBase → ShopBase → CheckoutBase` with overlapping BeforeMethods, stop and compose: `CheckoutFlow` + a tiny BaseTest. Inheritance explosion is a smell.

**Deep dive** — Belong in BaseTest: `@BeforeMethod`/`@AfterMethod` driver, optional `@BeforeClass` log of class name. Not in BaseTest: locators, Excel reads, `click(By)`, business `login()`.

Listeners: screenshots, Allure steps, timing. They should not `new ChromeDriver()`.

Prefer composition: tests that need a logged-in buyer call `UserFactory` + `LoginPage` or an API cookie inject. A `LoggedInBaseTest` subclass is acceptable *once*; a tree of five is not.

Java 17: default methods on an interface `DriverLifecycle` if you want mixin without a deep class tree — still easier to keep one BaseTest.

```java
public abstract class BaseTest {
    @BeforeMethod(alwaysRun = true)
    public void startDriver() throws Exception {
        DriverFactory.start(AppConfig.get(), browserParam());
    }

    @AfterMethod(alwaysRun = true)
    public void stopDriver() {
        DriverFactory.unload();
    }

    protected String browserParam() {
        return Optional.ofNullable(System.getProperty("browser")).orElse("chrome");
    }
}

// Wrong: CheckoutBaseTest extends ShopBaseTest extends WebBaseTest extends BaseTest
// with overlapping BeforeMethods that each "log in just in case."
```

Utilities: `Money.parse("$42.00")`, `Downloads.waitForCsv(dir)` — no WebDriver inside if you can avoid it; if they need a driver, pass it as an argument, do not `DriverFactory.get()` from a util used in production-ish helpers (hidden global).

**Follow-ups & traps**
- Trap: `BaseTest.click(By)` wrapping JS click.
- Multiple BeforeMethods in the hierarchy with unclear order.

**One-liner** — BaseTest is driver lifecycle only; listeners are artifacts; pages/flows hold behavior — do not grow a BaseTest inheritance tree.

### Q16. How do you organize thousands of Selenium tests? (packages by domain, groups/tags smoke/regression, ownership)

**Interview answer** — Packages follow product domains (`checkout`, `orders`, `search`, `account`), not `tests/positive` vs `tests/negative`. TestNG groups (or custom annotations) mark `smoke`, `regression`, `nightly`, `chrome-only`. Each package has an owning squad in CODEOWNERS. Naming: `PlaceOrderTest` not `Test1`. Suite XMLs are views over the same classes, not copies of code.

**Deep dive** — 3,000 tests in one class is un-mergeable. One class per user journey or per page-critical path. Shared locators live in pages, not duplicated. `PlaceOrderGuestTest` and `PlaceOrderLoggedInTest` can share `CheckoutFlow`.

Smoke: <15 minutes, PR gate, critical paths (login, add to cart, place order). Regression: sharded nightly. Exploratory/visual: separate job. `chrome-only` group for CDP tests.

Ownership: a failing `checkout` test pages the checkout squad, not "QA." SDETs embedded vs platform team: platform owns DriverFactory/Grid; squads own their pages/tests. CODEOWNERS:

```text
src/test/java/com/shop/qa/tests/checkout/  @checkout-squad
src/test/java/com/shop/qa/driver/          @qa-platform
```

Delete tests: if the feature shipped a year ago and the test is skipped, burn it. Thousands of skips is not a suite. Track skip count as a metric.

Suite XMLs are *views*: `testng-smoke.xml` includes groups `smoke`; `testng-checkout.xml` includes package `...checkout`. Do not copy-paste class lists that drift. Naming: method `placeOrderWithSavedCard_showsConfirmation` — the report is the documentation.

**Follow-ups & traps**
- Trap: organizing by author name.
- Duplicate smoke in three XMLs that drift.

**Senior/lead angle** — A catalog in the README: domains, suite XMLs, time budgets, flake owners. Governance is how thousands stay runnable.

**One-liner** — Domain packages, smoke/regression groups, CODEOWNERS per domain, thin suite XML views — not one giant class and not organization by author.
