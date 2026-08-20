# Framework architecture — technical interview Q&A

Answer structure: **requirements → architecture → trade-off → how you’ve done it**.  
Whiteboard the layers from [NOTES.md](NOTES.md) when asked to “design a framework.”

---

## Whiteboard designs

**Q: Design an automation framework from scratch for a web product with 2,000 UI tests.**  
A: Config layer (env, secrets). Driver factory (Strategy: local/grid/cloud). Decorator for logging + screenshot. Page + component layer. Business flow facades. TestNG/JUnit with tags (smoke/regression). Parallel methods with **isolated Playwright Context or WebDriver per test**. Allure + trace on failure. CI: PR smoke 15 min; nightly sharded regression. Test data via API factories. No static driver. Flaky quarantine job. Document coding standards and PR template for tests.

**Q: Same question but mobile (iOS + Android) + web.**  
A: Shared config, reporting, business flows where domains overlap. Separate driver modules: `playwright-web`, `appium-mobile`. Screen objects mirror POM. Cloud device farm for mobile parallel. Capability factory per platform. Hybrid app: context switch helper. Deep links to shorten setup. Unified CI matrix: web shards + mobile device queue.

**Q: How do UI and API tests live in one framework?**  
A: Shared `Config`, `TestDataFactory`, reporting. `api-clients` module (Rest Assured POJOs). Tests choose UI-only, API-only, or hybrid via business flows (`CheckoutFlow.placeOrderViaApiThenVerifyUi`). API sets up state; UI validates what users see. Avoid duplicating assertions in both layers for the same field.

**Q: Design distributed test execution for 10,000 tests in 30 minutes.**  
A: Estimate: 10k tests, 30 min → ~5.5 tests/sec if serial; need massive parallel. Shard suite into N chunks (by time balance, not count). M workers (CI containers or Kubernetes jobs). Each worker: M parallel browsers (cap CPU). Queue for mobile devices. Central report aggregation (ReportPortal). Artifact store (S3). Retry once with trace. Avoid shared DB accounts — pool or UUID users. Monitor worker health.

**Q: Design a device farm / test lab (Lead SDET).**  
A: Inventory (devices, OS versions). Scheduling queue. Agent on each device/container. Appium grid or cloud integration. Booking + cleanup (reset app, clear accounts). Metrics: utilization, queue wait, flake by device. Security: no prod data on devices.

---

## Selenium deep

**Q: WebDriver architecture — explain the stack.**  
A: Test code → language bindings (Java) → JSON Wire/W3C protocol → driver executable → browser. RemoteWebDriver sends commands to grid hub → node.

**Q: Implicit vs explicit wait — what do you use?**  
A: Explicit (WebDriverWait + ExpectedConditions or custom). Implicit global wait causes hidden coupling; mixing both is unpredictable. Never sleep.

**Q: How do you run 500 Selenium tests in parallel safely?**  
A: One driver per test thread; no static driver. RemoteWebDriver to grid. Isolated test data. Thread-safe reporting. Cap parallel sessions to grid capacity. Idempotent tests.

**Q: StaleElementReferenceException — causes and fixes?**  
A: DOM changed after find. Re-locate element; wait for stability; avoid long chains of cached WebElements.

**Q: Selenium Grid vs cloud (BrowserStack/Sauce)?**  
A: Grid: control, cost at scale, ops burden. Cloud: maintenance, device/browser matrix, cost per minute. Hybrid common.

---

## Playwright deep

**Q: Browser, Context, Page — explain.**  
A: Browser = process. Context = isolated session (cookies, storage, permissions) — **use one per test in parallel**. Page = tab/window within context. Locator = query with auto-wait.

**Q: Why Playwright over Selenium for new projects?**  
A: Auto-wait, trace, network control, faster execution, modern API, built-in fixtures. Selenium still valid for legacy, grid investment, language/browser constraints. Senior answer: pick based on team, existing stack, not hype.

**Q: How do you debug a flaky Playwright test in CI?**  
A: Trace on first retry, video, screenshot. Compare local vs CI (viewport, timezone, headless). Check race on network/API. Stabilize locators (role/testid). Remove shared state.

**Q: Playwright parallel in CI?**  
A: `fullyParallel: true`, workers = CPU cores, shard across jobs, one context per test, storageState for auth reuse.

**Q: Mock API in Playwright test?**  
A: `page.route()` intercept, or `APIRequestContext` for direct API + UI assertion separately.

---

## Appium deep

**Q: Appium architecture.**  
A: Test → Appium client → Appium server → platform driver (UiAutomator2/XCUITest) → device.

**Q: Native vs WebView context?**  
A: Hybrid apps need `driver.context()` switch. Locators differ. Wait for WebView load.

**Q: iOS real device pain points?**  
A: Signing, provisioning, WDA stability, Apple permissions dialogs. Plan for simulator in CI, real device nightly.

**Q: Parallel mobile tests?**  
A: One session per device; queue if devices < tests. Cloud farms scale; local lab limited by USB/hosts.

**Q: Flaky mobile test — top causes?**  
A: Animations, keyboard covering elements, OS permission popups, network, wrong context, stale element.

---

## API / Rest Assured deep

**Q: Structure Rest Assured in a framework.**  
A: `BaseApiClient` (spec, auth, logging). Domain clients extend it. POJOs for bodies. Shared `RequestSpec` per env. Schema validation for contract. Separate integration vs E2E tags.

**Q: 401 vs 403 vs 422?**  
A: 401 unauthenticated; 403 authenticated but forbidden; 422 validation/business rule failure (common in APIs). Tests assert correct code per scenario.

**Q: Test OAuth/JWT in automation?**  
A: Client credentials or password grant in setup (test env only); cache token with expiry; refresh in `@BeforeClass` or interceptor; never commit secrets.

**Q: Contract testing vs E2E API tests?**  
A: Contract (Pact): consumer/provider schema compatibility, fast. E2E API: full path + DB side effects. Both needed; different CI stages.

---

## Load / performance

**Q: P99 latency jumped 300ms → 4s — how investigate?**  
A: Check deploy correlation, error rate, CPU/memory, DB slow queries, cache hit rate, downstream dependency, load increase. Locust/Grafana traces. Rollback vs fix forward. Reproduce in staging with load test.

**Q: Where does Locust fit in test pyramid?**  
A: Above unit/integration; below or beside full E2E UI. API load tests share clients with functional API layer.

**Q: Load test in CI?**  
A: Short smoke load on staging nightly; threshold gates (p95 < X). Full stress monthly — too heavy for every PR.

---

## Framework engineering

**Q: How do you make a framework thread-safe?**  
A: No static mutable state; instance-per-test drivers; immutable config; ThreadLocal only with clear; concurrent-safe reporters; isolated data.

**Q: Retry strategy — when yes/no?**  
A: Yes: max 1–2 for infra blip with trace. No: infinite retry masking product bugs. Track retries in report; fail if retry rate high.

**Q: How do you version the framework vs product?**  
A: Framework as internal library (semver); product tests depend on version; breaking changes with migration guide.

**Q: Test pyramid for microservices?**  
A: Many unit (dev), contract + API integration (SDET), fewer E2E UI, targeted E2E critical paths, load on hot paths.

**Q: How test Kafka/event-driven flow?**  
A: Publish event → assert consumer processed (DB/API/poll topic). Test containers for local Kafka. Idempotent consumers. Timeout + DLQ scenarios.

**Q: How reduce maintenance when UI changes?**  
A: Stable test ids with dev partnership, component-level page objects, business layer absorbs flow changes, visual regression optional, contract tests catch API breaks early.

**Q: Metrics you track as Lead SDET?**  
A: Pass rate, duration, flake rate, coverage of critical paths, time to feedback on PR, escaped defects, cost per run.

**Q: Build vs buy for test infrastructure?**  
A: Grid/cloud, ReportPortal, device farm — TCO, team size, compliance. Lead owns the decision matrix.

---

## Tool comparison (quick)

**Q: Playwright vs Selenium?**  
A: See Playwright section; respect legacy Selenium investment.

**Q: Appium vs native XCUITest/Espresso?**  
A: Appium cross-platform, slower, one stack. Native faster, per-platform code. Appium for SDET breadth; native for dev-owned unit/UI component tests.

**Q: Cucumber BDD — when worth it?**  
A: When product/BA read scenarios; cost is glue maintenance. Not for every team.

**Q: Page Object vs Screenplay?**  
A: POM page-centric; Screenplay actor/tasks — scales for large teams. Both valid.

---

## Self-check

- [ ] Draw 6-layer architecture in 3 minutes  
- [ ] Explain parallel isolation for Playwright and Selenium  
- [ ] One hybrid API+UI flow design  
- [ ] One flake RCA story with concrete fix  
- [ ] One scale story (sharding/workers)

Behavioral / leadership: [BEHAVIORAL-QA.md](BEHAVIORAL-QA.md)
