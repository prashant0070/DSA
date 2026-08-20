# Design patterns — interview Q&A (deep)

Answer in **problem → pattern → trade-off → SDET example**. Practice verbally (45–90 seconds per question).

---

## Core OOP + patterns

**Q: Strategy vs Factory — what’s the difference?**  
A: Factory **creates** the right object (which driver). Strategy **selects behavior** at runtime (how to wait, how to retry). A framework often uses both: factory builds `WebDriver`, strategy defines `WaitPolicy`. Factory answers “which object”; strategy answers “which algorithm.”

**Q: When would you use Builder over a constructor with many parameters?**  
A: Many optional fields (env, browser, headless, timeouts, proxy, auth state). Builder avoids telescoping constructors, reads fluently in tests, and can validate before `build()`. Example: `TestContext.builder().baseUrl(...).withStorageState(...).build()`.

**Q: Singleton for WebDriver — good or bad?**  
A: **Bad for parallel UI tests** — one session shared across threads causes race and state leaks. Acceptable for **immutable config** or a **thread-safe driver pool** with explicit checkout/checkin, not a naive `getInstance()` driver. Prefer one driver **per test** (or per worker) via factory + DI.

**Q: Composition vs inheritance in test frameworks?**  
A: Inheritance (`extends BaseTest`) for **fixed lifecycle** (template method). Composition for **reusable helpers** (`LoginHelper`, `ApiClient`) injected into tests. Inheritance deep trees break when teams need different mixes of behavior — favor composition + small base class.

**Q: Interface vs abstract class for `Driver` abstraction?**  
A: Interface if only behavior contract (click, navigate). Abstract class if shared code (common wait wrapper). In Java, prefer interface + default methods or a small abstract base for shared logging.

**Q: Decorator vs inheritance to add screenshots on failure?**  
A: Decorator wraps `WebDriver` and delegates all calls, adding screenshot on exception. Inheritance (`ScreenshotChromeDriver extends ChromeDriver`) couples to one browser and explodes subclasses. Decorator stacks: log → screenshot → retry.

**Q: Facade in API + UI testing?**  
A: `OrderFlowFacade.placeOrderAndVerify()` hides create cart → checkout API → poll DB → open confirmation UI. Tests stay readable; changes to 6 calls live in one place.

**Q: Template Method in TestNG/JUnit?**  
A: Base class defines `@BeforeMethod` setup, abstract `runScenario()`, `@AfterMethod` teardown. Subclasses only implement the varying part. Risk: base class becomes a god object — keep it thin.

**Q: Observer for reporting?**  
A: Test framework fires events (onStart, onSuccess, onFailure). Listeners (Allure, Slack, screenshot) subscribe without modifying test code. Open/closed: add reporter without editing tests.

**Q: Adapter when migrating Selenium → Playwright?**  
A: Define your `UiElement` / `BrowserSession` interface. Adapter wraps Playwright `Page` to implement it. Legacy tests depending on the interface migrate incrementally.

**Q: Command pattern in keyword-driven automation?**  
A: Each keyword (`Click`, `EnterText`) is a command object with `execute()`. Queue commands for replay, remote execution, or AI-generated steps (relevant to your automation tool).

**Q: Composite for test suites?**  
A: `Suite` contains `TestClass` contains `TestMethod` — all implement `Runnable`/`TestNode`. Runners traverse uniformly. Same idea as nested TestNG XML or CI matrix grouping.

**Q: Proxy and Selenium Grid?**  
A: Local test talks to `RemoteWebDriver` proxy; proxy forwards to node running real browser. Same interface, different network location.

**Q: Abstract Factory for cross-platform?**  
A: `PlatformFactory.create()` returns matching triple: driver + locator helpers + gestures for Android vs iOS vs Web. Keeps platform-specific types from leaking into tests.

**Q: State pattern for login flows?**  
A: `GuestState`, `LoggedInState` — same `Session` object, different allowed actions. Page objects or session object switch state after login instead of boolean flags everywhere.

**Q: Why is “God Page Object” an anti-pattern?**  
A: Violates SRP — one class owns every locator on a SPA. Merge conflicts, slow loads, brittle tests. Split into **Page Component Model** (header, checkout modal, payment form).

**Q: Dependency Injection in Cucumber/TestNG?**  
A: PicoContainer or custom factory injects `Driver`, `Config`, `ApiClient` into step defs. Enables parallel runs (new instance per scenario) and test doubles without static fields.

**Q: How does Strategy help parallel CI?**  
A: Same test code; CI parameter chooses `ParallelStrategy` (local sharding vs BrowserStack vs Playwright workers). No test edits — config only.

**Q: Memento for test isolation?**  
A: Save cookies/localStorage before test; restore in `@AfterEach` so test B doesn’t inherit test A’s cart. Playwright `storageState()` is a practical memento.

**Q: Chain of Responsibility for failure handling?**  
A: On failure: try soft assert collection → retry once → capture trace → mark fail. Each handler passes to next if it doesn’t handle.

---

## Framework design (whiteboard)

**Q: Design a multi-browser, parallel-safe automation framework.**  
A: Layers: Tests → Business flows (facade) → Pages/components → Driver factory (strategy per browser) → Driver wrapper (decorator: log + screenshot). DI scopes driver **per test method**. Config via builder from env/CI params. No singleton driver. Thread-local or TestNG parallel=methods with isolated context. Reporting via observer listeners.

**Q: How do design patterns help flaky-test reduction?**  
A: Strategy for wait policy (explicit conditions, not sleep). Decorator to attach trace/video on retry. Template method ensures consistent setup/teardown. Facade reduces duplicate partial flows that half-complete state.

**Q: Page Object vs Screenplay / Actor pattern?**  
A: POM: page-centric. Screenplay: actor performs tasks (“Sam attempts to login”) — better for large teams, more abstraction. Interviewers accept POM + components if you explain SRP and composition.

**Q: Factory vs DI container — overlap?**  
A: Factory creates objects; DI container **wires** graph (which factory, which scope, which impl of interface). Spring/PicoContainer = DI; simple `DriverFactory` = factory only. Senior answer: use DI when many dependencies and scopes.

**Q: Where would you *not* use a pattern?**  
A: Don’t force Abstract Factory for 3 UI tests. YAGNI. Patterns earn their complexity at scale (many browsers, envs, teams). Simple suite: plain functions + one `BaseTest` may suffice.

---

## Java / threading (SDET parallel runs)

**Q: Singleton + parallel TestNG — what breaks?**  
A: Shared mutable driver, shared cart state, shared static counters. Fix: instance per test, no static mutable fields, `ThreadLocal` only when truly needed and documented.

**Q: ConcurrentHashMap in a test runner?**  
A: Shared result cache or live status board across workers — thread-safe map. Contrast with HashMap + synchronized — know why CHM scales.

---

## DSA crossover (they connect patterns to code)

**Q: Strategy in sorting / heaps?**  
A: `SortStrategy`, `Comparator` for heap — same pattern as wait strategies. Shows you unify OOP and algorithms.

**Q: Iterator in your own linked list?**  
A: Phase 1 `Iterable` — pattern for traversing without exposing nodes.

---

## Trick / “gotcha” questions

**Q: Is double-checked locking Singleton still valid?**  
A: In Java, broken without `volatile` (memory model). Prefer enum singleton or holder idiom. For tests, question why you need Singleton at all.

**Q: Factory Method vs Abstract Factory — one sentence each?**  
A: Factory Method: **one product**, subclass chooses variant. Abstract Factory: **family of products** that belong together.

**Q: Prototype vs Builder?**  
A: Prototype: clone existing object. Builder: construct fresh step-by-step. Use prototype when copying default auth context is cheaper than rebuilding login.

**Q: Visitor in test tooling?**  
A: Walk AST/test tree applying operations (lint, coverage, AI step generation) without changing node classes — ties to static analysis / your AI tool.

---

## Self-check before interview

- [ ] Draw Strategy + Factory on a whiteboard for “multi-browser CI”  
- [ ] Explain why Singleton driver fails parallel  
- [ ] Name 3 patterns in Playwright fixtures (scope, decorator-like hooks, strategy via config)  
- [ ] Give Facade example from API+UI flow  
- [ ] SOLID letter for “don’t put assertions in Page Objects” (SRP)
