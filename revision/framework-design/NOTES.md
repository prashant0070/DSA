# Automation framework architecture — notes

**Browser version (diagrams + definitions):** [NOTES.html](NOTES.html)

**Audience:** SDET → Senior SDET → Lead SDET at product companies (Amazon, Google, Microsoft, Meta, Flipkart, Uber, etc.)  
**Use with:** [INTERVIEW-QA.md](INTERVIEW-QA.md) (technical whiteboard) + [BEHAVIORAL-QA.md](BEHAVIORAL-QA.md) (STAR / leadership)

You are not learning “what is Selenium.” You are learning **how to design, defend, and scale** a test system like an engineer.

---

## 1. Reference architecture (all stacks)

One mental model works for **Web (Selenium/Playwright), Mobile (Appium), API (Rest Assured), and load (Locust)**:

```text
┌─────────────────────────────────────────────────────────┐
│  CI / Orchestration (Jenkins, CircleCI, GitHub Actions) │
│  shards · workers · matrix · artifacts · notifications  │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Test layer (TestNG/JUnit/Cucumber/Playwright test)     │
│  tags · priorities · data-driven · smoke vs regression  │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Business / flow layer (facades, workflows, keywords)   │
│  "checkout as guest" · "onboard merchant" · API chains  │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Page / Screen │  │  API clients  │  │ Load scenarios│
│  + components │  │  Rest Assured │  │    Locust     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Driver / client layer (Factory + Strategy + Decorator) │
│  WebDriver · Playwright Page/Context · Appium driver    │
└───────────────────────────┬─────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Cross-cutting: Config · Logging · Reporting · Retry      │
│  Test data · DB · Messaging · Secrets · Env management  │
└─────────────────────────────────────────────────────────┘
```

**Interview sentence:**  
“We separate **what** we test (tests), **how** we express flows (business layer), **where** locators/API live (page/client layer), and **how** we run (driver + CI). Cross-cutting concerns never leak into tests as copy-paste.”

---

## 2. Layer rules (best practices)

| Layer | Owns | Must NOT own |
| --- | --- | --- |
| **Test** | Arrange, act, assert, tags | Locators, sleeps, raw HTTP |
| **Business / flow** | Multi-step user journeys | Browser-specific APIs in every test |
| **Page / screen / component** | Locators, waits, safe actions | Assertions on business outcomes (debate: light checks OK) |
| **API client** | Endpoints, auth, serialization | UI locators |
| **Driver layer** | Create/quit, capabilities, decorators | Test assertions |
| **Config** | URLs, timeouts, secrets refs | Hard-coded prod URLs in tests |
| **Reporting** | Listeners, attachments | Test logic |

**Golden rules**

1. **One driver/context per test** (or per worker) — never a global singleton for parallel.  
2. **No `Thread.sleep`** — explicit conditions (Selenium) or auto-wait (Playwright).  
3. **Stable locators** — `data-testid` > role > css; avoid brittle XPath.  
4. **Tests independent** — order must not matter; own data or cleanup.  
5. **Fail fast with artifacts** — screenshot, trace, HAR, logs on failure.  
6. **Environment from outside** — `-Denv=staging`, not edited source.  
7. **Flaky = bug** — track, quarantine, fix; don’t infinite retry.

---

## 3. Web — Selenium architecture

```text
Test → LoginFlow.login() → LoginPage → WebDriver (decorated) → ChromeDriver / RemoteWebDriver
```

**Must know for interviews**

| Topic | Depth |
| --- | --- |
| WebDriver architecture | Test → bindings → driver → browser |
| Locators | id, css, xpath; relative locators |
| Waits | Explicit (WebDriverWait) preferred; implicit rarely; never sleep |
| Grid | Hub/node, RemoteWebDriver, capabilities |
| Parallel | TestNG `parallel=methods`, thread-safe driver scope |
| Page Object Model | Locators + actions; Page Factory legacy |
| Listeners | `@Listeners`, screenshot on failure |

**Selenium-specific pitfalls**

- Stale element → re-find or wait for stability  
- Implicit + explicit wait stacking → unpredictable timeouts  
- Shared static WebDriver → parallel disaster  
- Headless vs headed differences → run both in CI matrix  

---

## 4. Web — Playwright architecture (make this a strength)

```text
Test → Browser (launch once per worker)
         → Context (isolated: cookies, storage, permissions)
              → Page(s)
                   → Locator (auto-wait + retry)
```

**Must know**

| Topic | Why interviewers ask |
| --- | --- |
| Browser vs Context vs Page | Isolation model — **Context per test** for parallel |
| Locator vs ElementHandle | Locator re-resolves; less stale |
| Auto-waiting | Default actionability checks |
| Fixtures | Setup/teardown, dependency injection |
| `storageState` | Reuse auth without re-login |
| Trace / video / screenshot | Debug flaky in CI |
| Network | `route`, mock, HAR |
| API + UI same test | `APIRequestContext` |
| Sharding | `--shard=1/4` for CI split |
| Workers | `fullyParallel`, project dependencies |

**Playwright best practice**

- Prefer **role + name** locators (`getByRole`, `getByTestId`)  
- **One context per test** in parallel suites  
- Enable **trace on first retry** in CI  
- Use **projects** for browser matrix (chromium, firefox, webkit)  
- Page objects optional — thin wrappers around Page + locators  

---

## 5. Mobile — Appium architecture

```text
Test → Screen objects → AppiumDriver (Android/iOS)
         → Appium Server → Device (emulator / real) / cloud (BS, Sauce)
```

**Must know**

| Topic | Depth |
| --- | --- |
| W3C WebDriver protocol | Same mental model as web |
| Capabilities | platformName, deviceName, app path, autoGrantPermissions |
| Contexts | NATIVE_APP vs WEBVIEW — switch for hybrid |
| iOS | XCUITest, provisioning, real device vs simulator |
| Android | UiAutomator2, ADB, activities, intents |
| Gestures | W3C actions, mobile: swipe/scroll |
| Parallel | One session per device; device farm / cloud |
| Flaky mobile | Animations, keyboard, system dialogs, network |

**Mobile framework extras**

- **Screen Object Model** (same as POM)  
- **Deep link** entry to skip long flows  
- **App install / reset** strategy per test vs suite  
- **Image / accessibility id** locators when IDs missing  

---

## 6. API — Rest Assured (and HTTP layer)

```text
Test → OrderApiClient.createOrder() → Rest Assured spec → HTTP
         ↓
    Schema / JSONPath / DB assert
```

**Must know**

| Topic | Depth |
| --- | --- |
| Request/response spec | Reusable given/when/then |
| POJOs | Serialize/deserialize |
| JSONPath / Hamcrest | Assertions |
| Schema validation | JSON Schema |
| Auth | Basic, Bearer JWT, OAuth flows |
| Chaining | Create → extract id → update → delete |
| Contract testing | Pact / schema vs consumer-driven (conceptual) |

**API framework best practice**

- **ApiClient per domain** (UserApi, PaymentApi), not one 2000-line class  
- **Base URI from config** per environment  
- **Idempotent setup/teardown** for test data  
- **Separate contract tests** from E2E UI tests  

---

## 7. Load testing — Locust (and performance layer)

```text
Locustfile (tasks) → HttpUser → target env
         ↓
    Metrics: RPS, p50/p95/p99, failures
         ↓
    Compare to SLA · correlate with APM/logs
```

**Must know**

| Topic | Interview use |
| --- | --- |
| Load vs stress vs soak | Terminology |
| RPS, latency percentiles | P99 spike investigation story |
| Think time | Realistic user simulation |
| Distributed Locust | Master/workers |
| Thresholds | Fail build if p95 > X |

**SDET angle:** You don’t replace functional framework — you **share API clients**, env config, and auth with Locust tasks.

---

## 8. Unified multi-tool framework (senior whiteboard)

Product companies often want **one repo / one pattern** for:

```text
           ┌─────────────┐
           │   Config    │
           └──────┬──────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
 Playwright    Appium      Rest Assured
    │             │             │
    └─────────────┼─────────────┘
                  ▼
           Business flows
                  ▼
              Tests + CI
```

**Shared**

- Environment config (dev/stage/prod-like)  
- Test data service / factories  
- Reporting (Allure, ReportPortal)  
- Logging (correlation id per test)  
- Secrets (Vault, CI credentials)  
- Tagging (`@smoke`, `@regression`, `@mobile`)  

**Tool-specific only in driver/client layer** — Strategy pattern swaps Playwright vs Selenium without rewriting business flows (ideal; partial overlap is OK in practice).

---

## 9. CI/CD integration

```text
PR → smoke (10 min) → merge
Nightly → full regression (sharded)
Release → smoke + critical path + perf gate
```

| Practice | Why |
| --- | --- |
| **Sharding** | Split by time, not by count only |
| **Parallel workers** | Match worker count to CPU/containers |
| **Fail fast** | Smoke on PR blocks broken main |
| **Artifacts** | Trace, video, logs retained 7–30 days |
| **Flaky quarantine** | `@Flaky` job or separate pipeline; don’t block release forever |
| **Retry policy** | Max 1–2 retries with trace; not 5 |
| **Docker** | Reproducible browsers/agents |
| **Matrix** | browser × os × env |

**Lead SDET:** design **test orchestration** — which suite on which trigger, SLA for feedback (<15 min PR check).

---

## 10. Test data strategy

| Approach | When | Risk |
| --- | --- | --- |
| **Static JSON/Excel** | Stable smoke | Stale data |
| **Factory / builder** | Unit-style test data | Maintenance |
| **API setup** | Fast, realistic | Depends on API stability |
| **DB scripts** | Backend validation | Coupling to schema |
| **Fresh user per test** | Parallel isolation | Slower |
| **Shared pool** | Expensive setup | Needs lock/cleanup |

**Best practice:** Tests **create what they need** and clean up in `@AfterEach` or use disposable tenants.

---

## 11. Parallel execution and thread safety

**Checklist**

- [ ] No static mutable WebDriver / Page / Context  
- [ ] ThreadLocal only if documented and cleared  
- [ ] Separate test accounts or UUID suffix usernames  
- [ ] File downloads isolated per worker  
- [ ] Reporting handles concurrent writes (Allure thread-safe config)  
- [ ] Database connections pooled per thread  

**Interview:** “10,000 tests in 30 minutes” → shard into N workers, each with M parallel browsers, grid or Playwright workers, queue + device farm for mobile, avoid shared state.

---

## 12. Flaky test playbook

```text
Detect (history) → Quarantine → Root cause → Fix → Re-enable
```

| Cause | Fix |
| --- | --- |
| Timing | Explicit wait / Playwright auto-wait |
| Locator | data-testid, less DOM depth |
| Data | Isolated data, no shared cart |
| Environment | Stabilize test env, mock third parties |
| Order dependency | Independent tests |
| Animation | Disable or wait for idle |
| Network | Mock or retry with cap |

**Never:** “Just add 5 second sleep” or “retry 10 times” without tracking.

---

## 13. Reporting and observability

- **Allure / Extent / ReportPortal** — history, trends, flaky rate  
- **Attach on failure:** screenshot, trace, console, HAR  
- **Link to CI build** and commit SHA  
- **Slack/email** on main branch failure only (avoid alert fatigue)  

**Lead:** metrics dashboard — pass rate, duration trend, flaky top 10, coverage of critical paths.

---

## 14. What changes by seniority

| Level | Framework expectation |
| --- | --- |
| **SDET** | Write tests in framework; follow POM; debug failures |
| **Senior SDET** | Design layers; parallel CI; reduce flake; mentor; API+UI |
| **Lead SDET** | Multi-team standards; orchestration; capacity planning; build vs buy (grid, cloud); quality gates in release; hire/coach |

---

## 15. Anti-patterns (say these in interviews)

| Anti-pattern | Fix |
| --- | --- |
| Record-and-playback only | Maintainable code + POM |
| 2000-line BaseTest | Thin base + composition |
| Sleep-driven tests | Condition-driven waits |
| Prod testing | Prod-like staging + synthetic |
| No ownership of framework | Platform team or rotation |
| Tests as second-class | Same code review as prod |
| Ignoring flake rate | SLA on flake budget (<1–2%) |

---

## 16. Study path

1. Draw the **reference architecture** from memory (2 min).  
2. Explain **Playwright Context** vs Selenium **driver scope** for parallel.  
3. Walk **one E2E flow** across UI + API + DB assert.  
4. Answer **one flaky** and **one scale** question from [INTERVIEW-QA.md](INTERVIEW-QA.md).  
5. Prepare **3 STAR stories** from [BEHAVIORAL-QA.md](BEHAVIORAL-QA.md).  

Related: [design patterns](../design-patterns/NOTES.md) (Factory, Strategy, Decorator, DI).
