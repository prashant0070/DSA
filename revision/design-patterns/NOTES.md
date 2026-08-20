# Design patterns — notes (beginner → interview)

**Use with:** [INTERVIEW-QA.md](INTERVIEW-QA.md) for deep questions.  
**Code:** small Java examples in `src/revision/patterns/` — read, then explain aloud.

Design patterns are **recurring solutions to recurring design problems**. In SDET interviews they show up twice:

1. **Framework design** — “How would you structure Playwright/Selenium for 500 tests in parallel?”
2. **Java/OOP rounds** — “Strategy vs Factory? When not to use Singleton?”

Page Object Model (POM) is **not** a GoF pattern, but interviewers treat it like one — it’s covered at the end.

---

## How to talk about any pattern in an interview

1. **Problem** — what pain does this remove?
2. **Structure** — who depends on whom (diagram in words)?
3. **Trade-off** — what you gain vs what you complicate?
4. **SDET example** — one line from a real framework (driver, reporting, env, retry).

---

## Creational — *how objects are built*

### Singleton

**One instance** shared globally (config, logger, driver pool manager).

```text
Config.getInstance()
```

| Pros | Cons |
| --- | --- |
| Single source of truth | Hidden global state |
| Easy access | Hard to test (mock/replace) |
| | Breaks parallel isolation if misused |
| | Thread safety needs care in Java |

**SDET:** OK for **read-only config** loaded once. **Bad** for `WebDriver` per test — use factory + scope instead.

**Java:** enum singleton is the safest simple form; double-checked locking is interview trivia.

---

### Factory Method / Simple Factory

**Hide construction** — caller asks for `Browser.CHROME`, gets a configured driver without `new ChromeDriver(...)` everywhere.

```text
Test
  → DriverFactory.create(Browser.FIREFOX)
  → WebDriver
```

**Factory Method:** subclass decides which product (OOP, extensible).  
**Simple Factory:** one class with a switch/map (fine for tests).

**SDET:** Every multi-browser framework uses this. Remote vs local is another factory branch.

---

### Abstract Factory

**Families of related objects** — e.g. `MobileFactory` returns `(Driver, LocatorStrategy, GestureHelper)` that all match “Android”.

**SDET:** Less common in small suites; appears in **cross-platform** frameworks (web + mobile + API client from one “Environment” factory).

---

### Builder

**Step-by-step construction** of a complex object.

```text
TestConfig.builder()
    .baseUrl("https://staging")
    .browser(Browser.CHROME)
    .headless(true)
    .timeout(Duration.ofSeconds(30))
    .build();
```

**SDET:** Test data builders, API request builders (Rest Assured fluent API *is* builder-style), Playwright `Browser.newContext()` options.

**vs telescoping constructor:** readable, optional fields, immutable result.

---

### Prototype

**Clone** an existing object instead of rebuilding.

**SDET:** Copy a default `BrowserContext` / auth storage state template for “logged-in user” tests. Less asked than Factory/Builder.

---

## Structural — *how pieces fit together*

### Adapter

**Wraps** an incompatible interface so your code can use it.

```text
LegacyRestClient  →  ApiClientAdapter  →  Your TestApi interface
```

**SDET:** Wrap Selenium API behind your own `Element` interface; wrap old JSON client when migrating to Rest Assured.

---

### Decorator

**Add behavior** layer by layer without subclass explosion.

```text
WebDriver
  → LoggingDriver wraps
  → ScreenshotOnFailureDriver wraps
  → RetryDriver wraps
```

**SDET:** `@Step` reporting wrappers, listeners that screenshot on failure. Playwright fixtures behave like decorators.

---

### Facade

**One simple entry** to a messy subsystem.

```text
CheckoutTestFacade.placeOrder(sku)  // hides 6 API calls + DB check
```

**SDET:** Business-layer keywords in keyword-driven frameworks; “LoginHelper.loginAsAdmin()”.

---

### Proxy

**Stand-in** with same interface — often lazy load, access control, or remote stub.

**SDET:** Remote WebDriver / Grid is literally a proxy to a browser elsewhere. Mock server proxy for API tests.

---

### Composite

**Tree** where leaf and container share the same interface.

```text
TestSuite
 ├── TestClass
 │    ├── testMethod
 │    └── testMethod
 └── TestClass
```

**SDET:** TestNG suites, nested describe blocks; UI component trees (form = composite of fields).

---

### Bridge

**Separate abstraction from implementation** so both can vary.

**SDET:** `TestRunner` (abstraction) × `Reporter` (implementation: Allure vs Extent). Less common name in interviews — same idea as Strategy + interface.

---

## Behavioral — *how objects collaborate*

### Strategy

**Swap algorithm** at runtime via interface.

```text
interface WaitStrategy { void until(Condition c); }
  → ExplicitWaitStrategy
  → FluentWaitStrategy
  → PlaywrightAutoWaitStrategy
```

**SDET:** Browser selection, wait policy, locator resolution (id vs css vs data-testid), retry policy, data source (JSON vs Excel vs DB).

**This is the #1 pattern for test frameworks.** Also appears in DSA (`Comparator`, sort strategies in Phase 6).

---

### Template Method

**Skeleton in base class** — subclasses fill hooks.

```text
abstract BaseTest {
  @BeforeEach setup() { loadConfig(); createDriver(); }
  abstract void runTest();
  @AfterEach teardown() { quitDriver(); attachReport(); }
}
```

**SDET:** Base test class with fixed lifecycle; Page Object with `abstract isLoaded()`.

---

### Observer

**Publish/subscribe** — listeners react to events.

**SDET:** TestNG `@Listeners`, JUnit extensions, Playwright `page.on("request")`, reporting hooks on pass/fail.

---

### Command

**Encapsulate an action** as an object (execute, undo, queue).

**SDET:** Keyword-driven tests (`ClickCommand`, `TypeCommand`), job queue for distributed test execution.

---

### Chain of Responsibility

**Pass request along a chain** until someone handles it.

**SDET:** Exception handler chain (screenshot → retry → fail), filter chain for HTTP assertions.

---

### State

**Object behavior changes** with internal state.

**SDET:** Test run state machine (PENDING → RUNNING → PASSED/FAILED/SKIPPED), app under test state (logged out vs logged in page objects).

---

### Iterator

**Traverse** without exposing internals.

**SDET:** `Iterable<TestCase>`, walking data-driven rows. Java `Iterable` in your own collections (Phase 1).

---

### Mediator

**Central hub** so objects don’t talk to each other directly.

**SDET:** Event bus in large frameworks; test orchestrator coordinating API + UI + DB steps.

---

### Memento

**Save/restore state** for rollback.

**SDET:** Snapshot browser storage/cookies before a test and restore after (isolation).

---

### Visitor

**Add operations** to object structure without changing classes.

**SDET:** Rare in test code; know the name. AST visitors in static analysis tools (relevant to your AI automation tool).

---

## Test-architecture patterns (not GoF, but always asked)

### Page Object Model (POM)

**One class per page/screen** — locators + actions, no assertions in page (ideally).

```text
LoginPage.login(user, pass)
HomePage home = new HomePage(page)
```

**Page Component Model:** break shared widgets (header, modal) into components composed into pages.

| Good | Bad |
| --- | --- |
| Stable locators in one place | God page with 400 lines |
| Returns next page object | Assertions scattered in pages |
| No sleeps — waits inside | Duplicated XPath everywhere |

---

### Page Factory (Selenium)

Lazy-init `@FindBy` elements. **Legacy** pattern — know it, but prefer explicit locators in Playwright.

---

### Dependency Injection (DI)

**Don’t `new` dependencies inside classes** — inject driver, config, api client.

```text
LoginTest(WebDriver driver, Config config, UserApi api)
```

**SDET:** Makes parallel runs and mocking possible. Contrast with Singleton driver anti-pattern.

**Frameworks:** PicoContainer (Cucumber), Spring Test, Playwright fixtures, TestNG `@Parameters` + factory.

---

### Object Repository

Central map of locators (properties/YAML). **Trade-off:** indirection vs readability. Often combined with Factory.

---

## SOLID (patterns in disguise)

| Letter | Pattern link | SDET example |
| --- | --- | --- |
| **S** Single responsibility | Small Page Objects | `LoginPage` doesn’t send email |
| **O** Open/closed | Strategy + new classes | Add `FirefoxDriverFactory` without editing tests |
| **L** Liskov | Subtypes substitutable | `MobileDriver` subclass must honor `Driver` contract |
| **I** Interface segregation | Small interfaces | `ReadablePage` vs `WritablePage`, not one mega-interface |
| **D** Dependency inversion | DI + interfaces | Tests depend on `Driver`, not `ChromeDriver` |

---

## Anti-patterns interviewers mention

| Anti-pattern | Why it hurts tests |
| --- | --- |
| Singleton driver | Parallel tests stomp each other |
| Thread.sleep everywhere | Flaky + slow |
| God object base test | 2000-line `BaseTest` |
| Inheritance for reuse only | Fragile; prefer composition + helpers |
| Static mutable state | Order-dependent failures |
| Copy-paste Page Objects | Locator drift |

---

## Pattern picker (quick reference)

| You need… | Reach for… |
| --- | --- |
| Swap browser / wait / retry algorithm | **Strategy** |
| Hide `new ChromeDriver(...)` | **Factory** |
| Complex test config | **Builder** |
| Wrap driver with logging/screenshots | **Decorator** |
| Simple API for messy flow | **Facade** |
| Shared setup/teardown skeleton | **Template Method** |
| Pass/fail hooks, reporting | **Observer** |
| One config for whole JVM | **Singleton** (careful) |
| Logged-in context copy | **Prototype** / storage state |
| Remote grid browser | **Proxy** |
| Suite of suites | **Composite** |
| Inject mocks in unit tests | **DI** (not GoF but essential) |

---

## Study order

1. Strategy, Factory, Builder, Singleton (pros/cons), Template Method  
2. Facade, Decorator, Observer, Adapter  
3. Composite, DI, POM / Page Component  
4. Rest (Abstract Factory, Bridge, Command, State) — skim + Q&A  

Then open [INTERVIEW-QA.md](INTERVIEW-QA.md) and answer out loud without reading.
