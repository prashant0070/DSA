# Automation Framework Architecture

Framework-architecture questions separate senior SDETs from tool users: the interviewer wants to hear layering, dependency direction, and blast-radius reasoning, not a list of libraries. This file covers structure, design patterns, scaling to thousands of tests, and the organizational questions (monorepo, shared cores) that come up at lead level.

- Q1. Explain your automation framework structure
- Q2. What are the key components of an automation framework?
- Q3. How would you design a scalable Playwright framework from scratch?
- Q4. How would you design a scalable Selenium/Java framework from scratch?
- Q5. What design patterns have you used in automation?
- Q6. Where would you use the Factory Pattern?
- Q7. Where would you use Singleton — and when is it an anti-pattern in test frameworks?
- Q8. How would you design reusable utilities without creating a "utils dumping ground"?
- Q9. How do you separate test logic, page logic, data, config, and utilities?
- Q10. How do you prevent duplication in a large framework?
- Q11. How would you maintain thousands of automated tests?
- Q12. Monorepo vs separate automation repo?
- Q13. How do you version and distribute a shared framework core across teams?
- Q14. A UI change breaks dozens of tests — how do you judge whether the framework is poorly designed?

### Q1. Explain your automation framework structure

**Interview answer** — My framework is a Playwright + TypeScript setup layered so that tests read like specifications and everything mechanical lives below them. Tests are organized by feature, page and component objects encapsulate locators, fixtures act as the dependency-injection backbone for auth, data, and clients, and an API layer handles setup and verification so the UI is only used for what we're actually testing. Config is typed and env-driven, so the same suite runs locally and in CI without code changes.

**Deep dive** — The structure exists to control blast radius: a UI change should mean one page-object edit, a new environment should mean one config entry, a new auth flow should mean one fixture change. The dependency direction is strict — tests import fixtures and pages, pages import utils, and nothing imports from tests. Data setup goes through API factories rather than the UI because UI-based setup is the single biggest source of slow, flaky suites. Fixtures rather than base classes carry shared state, because composition scales across teams where inheritance hierarchies rot.

**Code / structure**

```text
e2e/
├── tests/                        # specs by feature; no locators, no raw HTTP
│   ├── checkout/
│   │   ├── checkout-happy-path.spec.ts
│   │   └── checkout-payment-errors.spec.ts
│   ├── search/
│   └── admin/
├── pages/                        # page objects: locators + user actions
│   ├── checkout.page.ts
│   └── product-list.page.ts
├── components/                   # shared widgets used across pages
│   ├── header.component.ts
│   └── data-table.component.ts
├── fixtures/                     # DI backbone: merges auth, data, clients
│   ├── index.ts                  # single export: test, expect
│   ├── auth.fixture.ts           # storageState per role
│   └── data.fixture.ts           # factories with auto-teardown
├── api/                          # typed API clients for arrange/assert
│   ├── api-client.ts
│   └── orders.api.ts
├── data/                         # builders + static reference data
│   ├── builders/order.builder.ts
│   └── reference/countries.json
├── utils/                        # cohesive helpers (dates, formatting)
├── config/
│   ├── env.ts                    # typed, validated env config
│   └── environments/             # qa.env, staging.env examples
├── playwright.config.ts          # projects, retries-in-CI, reporters
└── .github/workflows/e2e.yml     # sharded CI run + report merge
```

**Follow-ups & traps**
- "Why fixtures instead of a BaseTest class?" — composition over inheritance; fixtures tear down in reverse order automatically and merge across teams without diamond-inheritance problems.
- "Where do assertions live?" — in tests (and shared assertion helpers), not inside page objects; page objects that assert hide intent and couple pages to specific test expectations.
- Weak answer to avoid: reciting folder names without saying why each layer exists — the interviewer is testing whether you designed it or inherited it.
- Trap: claiming "100% POM" while your specs contain `page.locator('#submit')` — be honest about enforcement (lint rules, review).

**Senior/lead angle** — At staff level, describe the same tree as a template: the golden-path skeleton every team clones, with the fixtures/api/config layers published as a shared package so ten teams don't re-solve auth and reporting independently.

**One-liner** — Tests read like specs, pages own locators, fixtures inject everything, API does the setup — and nothing imports upward.

### Q2. What are the key components of an automation framework?

**Interview answer** — Any mature framework has seven components: a test runner with parallelism and retries, a locator/page layer that isolates the UI contract, a data layer for generating and cleaning test data, an API client for fast setup and backend verification, environment-aware configuration, reporting with debuggable artifacts, and CI integration that gates merges. The tools vary — Playwright or Selenium, GitHub Actions or Jenkins — but if any of the seven is missing, that gap becomes your maintenance burden.

**Deep dive** — The map matters more than the tools because interviewers probe the gaps. No data layer means tests share state and can't parallelize. No API client means 10-minute UI setup per test. No config layer means hardcoded URLs and a suite that only runs in one place. No artifact-rich reporting means every CI failure requires local reproduction, which at scale means failures get ignored. The runner choice determines the rest: Playwright bundles runner, assertions, tracing, and parallelism; a Selenium stack must assemble those from TestNG/JUnit, Allure, and custom code, which is exactly why "key components" is asked — to see if you know what the batteries-included tools are giving you.

**Code / structure**

```text
Component            → Concrete implementation (Playwright TS stack)
test runner          → @playwright/test: workers, projects, retries, sharding
locator/page layer   → pages/ + components/, user-facing locators (getByRole)
data layer           → builders + faker + API seeding, teardown in fixtures
API client           → typed wrapper over APIRequestContext, reused for asserts
config/env           → zod-validated env module; BASE_URL, creds via CI secrets
reporting            → HTML + blob reports, traces/videos on failure, dashboards
CI integration       → sharded workflow, PR gate on smoke, nightly full run
```

**Follow-ups & traps**
- "Which component do teams most often skip?" — the data layer; it is invisible until parallel execution starts failing.
- "What would you add for a large org?" — an observability component: run metadata shipped to a warehouse for flake and duration trends.
- Weak answer: listing tools ("Playwright, Allure, Jenkins") instead of responsibilities — components are roles, tools are choices.

**Senior/lead angle** — Name the eighth component orgs at scale need: governance — tagging taxonomy, ownership metadata, and health metrics — because at 5,000 tests the hard problem is no longer running tests, it's knowing which ones matter.

**One-liner** — Runner, pages, data, API client, config, reporting, CI — seven roles; any one missing becomes your maintenance bill.

### Q3. How would you design a scalable Playwright framework from scratch?

**Interview answer** — I'd start with conventions before code: naming, folder layout, tagging, and a lint rule that no spec contains raw locators. Then I'd build the fixture layer as the DI backbone, wire authentication through setup projects with cached storage state, make all data setup go through API factories with automatic teardown, and enforce parallel-safety from day one — unique data per worker, no shared accounts. Scale features like sharding and report merging are then configuration, not redesign.

**Deep dive** — The order is the answer. Conventions first, because retrofitting naming and tagging onto 500 tests is a migration project; on day one it's a README. Fixtures second, because everything else (auth, data, clients) plugs into them — if teams start writing beforeEach blocks instead, you inherit copy-paste setup forever. Auth via a setup project writing storageState per role means login happens once per run, not once per test, which is typically the single largest runtime win. Data factories via API keep tests independent, which is the precondition for `fullyParallel` — a suite that only passes serially cannot ever be made fast. The classic failure mode is deferring parallel-safety "until we need it": by then, dozens of tests share the one admin account and the fix touches everything.

**Code / structure**

```ts
// fixtures/index.ts — the DI backbone every spec imports from
import { test as base } from '@playwright/test';
import { ApiClient } from '../api/api-client';
import { OrderFactory } from '../data/builders/order.builder';

type Fixtures = {
  api: ApiClient;
  orderFactory: OrderFactory;
};

export const test = base.extend<Fixtures>({
  api: async ({ request, baseURL }, use) => {
    await use(new ApiClient(request, baseURL!));
  },
  orderFactory: async ({ api }, use) => {
    const factory = new OrderFactory(api);
    await use(factory);
    await factory.deleteAll();   // teardown owns cleanup, tests don't
  },
});
export { expect } from '@playwright/test';
```

```ts
// playwright.config.ts — auth as a setup project, parallel-safe defaults
export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { storageState: '.auth/user.json' },
    },
  ],
});
```

**Follow-ups & traps**
- "Why not projects-per-role instead of storageState files?" — both work; storageState files scale to many roles without a project explosion, projects give clearer reporting — say you'd pick based on role count.
- "How do you enforce the conventions?" — ESLint custom rules (no `page.locator` in specs), PR templates, and a scaffolding generator so the easy path is the right path.
- Weak answer: starting with "I'd pick Allure for reporting" — tool selection before conventions signals junior thinking.
- Trap: forgetting teardown; a framework that creates data and never deletes it fails in week three, not in the demo.

**Senior/lead angle** — Add the platform move: publish the fixtures/config/api core as an internal package with a starter template, so the second team onboards in a day and your conventions replicate instead of drift.

**One-liner** — Conventions, then fixtures, then API-based auth and data — parallel-safe from commit one, so scale is a config change.

### Q4. How would you design a scalable Selenium/Java framework from scratch?

**Interview answer** — TestNG as the runner for its parallel and grouping support, a WebDriver factory returning ThreadLocal-scoped drivers so parallel threads never share a browser, page objects with explicit waits baked into a small interaction layer, TestNG listeners for screenshots and reporting, and a retry analyzer for CI-only retries. Data and config follow the same rules as any framework: API-based setup, externalized typed config, no shared mutable state.

**Deep dive** — The design centerpiece is ThreadLocal driver management — the classic Selenium scaling failure is a static WebDriver field that works until `parallel="methods"` is enabled, then every thread drives the same browser. On PageFactory: I'd skip it — `@FindBy` with lazy proxies predates modern waiting patterns, hides stale-element behavior, and offers no real benefit over locator constants plus an explicit-wait helper; knowing this debate signals real Selenium experience. Listeners (ITestListener) centralize failure artifacts so no test contains screenshot boilerplate. The honest comparison an interviewer wants: this stack hand-builds what Playwright bundles — waiting discipline, parallel isolation, tracing — so the Selenium answer must show you know where the sharp edges are.

**Code / structure**

```java
// DriverFactory.java — ThreadLocal scoping is the whole game
public final class DriverFactory {
    private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

    public static WebDriver get() { return DRIVER.get(); }

    public static void create(String browser) {
        WebDriver driver = switch (browser) {
            case "firefox" -> new FirefoxDriver(firefoxOptions());
            default        -> new ChromeDriver(chromeOptions());
        };
        driver.manage().timeouts().implicitlyWait(Duration.ZERO); // explicit waits only
        DRIVER.set(driver);
    }

    public static void quit() {
        if (DRIVER.get() != null) { DRIVER.get().quit(); DRIVER.remove(); }
    }
}
```

```java
// RetryAnalyzer.java — CI-only retry, never a flake band-aid locally
public class RetryAnalyzer implements IRetryAnalyzer {
    private int attempts = 0;
    @Override public boolean retry(ITestResult result) {
        return Boolean.parseBoolean(System.getenv("CI")) && attempts++ < 2;
    }
}
```

**Follow-ups & traps**
- "Why implicit wait zero?" — mixing implicit and explicit waits produces unpredictable compound timeouts; pick explicit and enforce it.
- "PageFactory yes or no?" — no, with the reasoning above; a confident, justified "no" beats reciting the tutorial answer.
- Weak answer: singleton WebDriver "for efficiency" — instant red flag for anyone who has run parallel suites.
- Trap: forgetting `DRIVER.remove()` — thread-pool reuse in TestNG leaks stale drivers into later tests.

**Senior/lead angle** — Frame the range: knowing both stacks lets you make honest migration calls — I'd articulate what a Selenium→Playwright move buys (auto-waiting, tracing, one dependency) and costs (rewrite, Java-team retraining) rather than cheerleading either tool.

**One-liner** — TestNG plus a ThreadLocal driver factory, explicit waits only, listeners for artifacts — Selenium scales fine if you hand-build the isolation Playwright gives you free.

### Q5. What design patterns have you used in automation?

**Interview answer** — Page Object as a facade over the UI contract, Factory for browser and API-client creation, Builder for test data with sensible defaults, Strategy for environment-specific behavior like payment sandboxes, and Observer in the form of runner listeners and reporters. I'd flag Singleton separately: fine for immutable config, dangerous for anything stateful like drivers in parallel runs.

**Deep dive** — The interviewer is checking whether you use patterns to solve problems or to decorate résumés, so tie each to its failure mode. POM controls locator blast radius. Factory centralizes construction so a new browser or environment is one edit. Builder solves the "test data with twelve constructor args" problem and keeps intent visible — a test that says `.asGuest()` documents itself. Strategy prevents `if (env === 'staging')` branches from metastasizing through page objects. Observer (TestNG listeners, Playwright reporters) keeps cross-cutting concerns — screenshots, metrics emission — out of test bodies. The pattern-abuse trap is real: a framework with AbstractPageFactoryProvider layers is worse than a plain one; patterns earn their place only when the duplication they remove has actually appeared.

**Code / structure**

```ts
// Builder — defaults + overrides, intent-revealing
const order = new OrderBuilder()
  .withItems([{ sku: 'SKU-1', qty: 2 }])
  .asGuest()
  .build();

// Strategy — env-specific payment behavior, selected once in config
interface PaymentStrategy { pay(page: Page, amount: number): Promise<void>; }
class SandboxCardPayment implements PaymentStrategy { /* test card flow */ }
class MockedPayment implements PaymentStrategy { /* route interception */ }
const payment: PaymentStrategy =
  env.paymentMode === 'mock' ? new MockedPayment() : new SandboxCardPayment();
```

```java
// Observer — TestNG listener keeps artifacts out of test code
public class ArtifactListener implements ITestListener {
    @Override public void onTestFailure(ITestResult r) {
        Screenshots.capture(DriverFactory.get(), r.getName());
        Metrics.emit("test_failed", r);
    }
}
```

**Follow-ups & traps**
- "Which pattern do you regret using?" — have a real answer; mine is over-applying Singleton to service clients, which serialized what should have been parallel.
- "Is POM itself outdated?" — partially: component objects and fixtures cover much of it in Playwright, but the principle (locators live in one place) survives every tool cycle.
- Weak answer: naming patterns without an automation-specific use — "I used Decorator" with no example reads as GoF recitation.

**Senior/lead angle** — At staff level the pattern conversation becomes a review standard: which patterns the shared core blesses, which are banned (stateful singletons), and how the lint/scaffold tooling makes the blessed path the default.

**One-liner** — POM, Factory, Builder, Strategy, Observer — each earns its place by a failure mode it prevents, and Singleton is on probation.

### Q6. Where would you use the Factory Pattern?

**Interview answer** — Three places: browser/driver creation so parallel workers and cross-browser runs are one code path, API-client creation so per-environment base URLs and auth are assembled once, and data factories that build entities via API with teardown tracking. In each case the factory exists because construction logic was starting to leak into tests.

**Deep dive** — The trigger for a factory is repeated, branching construction: `if (browser === 'firefox')` in more than one place, or auth-header assembly copy-pasted per test file. Centralizing it means adding an environment or a browser is one edit, and the construction site becomes the natural home for cross-cutting decisions — proxy settings, per-worker credentials, request logging. The data factory is the most valuable of the three because it can track what it created and delete it afterward, which makes cleanup structural rather than a per-test chore.

**Code / structure**

```ts
// api/client-factory.ts — one place assembles env + auth + logging
export function createApiClient(request: APIRequestContext, env: EnvConfig, role: Role) {
  return new ApiClient(request, {
    baseURL: env.apiBaseUrl,
    tokenProvider: () => issueToken(env, role),   // short-lived, per-role
    logRequests: !!process.env.CI,
  });
}

// data/user-factory.ts — creation + teardown tracking in one unit
export class UserFactory {
  private created: string[] = [];
  constructor(private api: ApiClient) {}

  async user(overrides: Partial<UserInput> = {}) {
    const u = await this.api.post('/users', { ...defaultUser(), ...overrides });
    this.created.push(u.id);
    return u;
  }
  async deleteAll() {
    await Promise.all(this.created.map(id => this.api.delete(`/users/${id}`)));
  }
}
```

**Follow-ups & traps**
- "Factory vs Builder?" — builder shapes the input object, factory performs the creation side effect; they compose (factory accepts a built input).
- Weak answer: a "factory" that is one `new` call with no branching or tracking — that's indirection, not a pattern.
- Trap: factories that cache instances across workers — you've built a singleton by accident and reintroduced shared state.

**Senior/lead angle** — In a shared core, factories are the extension seam: teams inject their own entity types into the data factory without forking the framework — the factory interface is part of your platform's public API.

**One-liner** — Factories go where construction branches: browsers, API clients, and data — and the data factory pays double because it remembers what to clean up.

### Q7. Where would you use Singleton — and when is it an anti-pattern in test frameworks?

**Interview answer** — Singleton is fine for immutable, read-only things: a parsed config object or an env registry loaded once. It's an anti-pattern for anything stateful in a parallel context — the classic mistake is a singleton WebDriver, which works in serial runs and then makes every parallel thread drive one browser. My rule: singletons may hold facts, never sessions.

**Deep dive** — The failure is subtle because it passes at first: the suite is developed serially, the singleton driver "saves resources," and months later someone enables parallelism and gets chaos — interleaved navigation, phantom flake, tests failing only in CI. The same applies to singleton API clients holding a mutable auth token (two workers, two users, one token slot) and singleton "test context" objects. In Java the fix is ThreadLocal or DI-scoped instances; in Playwright the problem barely arises because fixtures are per-test scoped by design — which is worth saying, since it shows you understand fixtures as the structural answer to lifecycle scoping. Config qualifies for singleton only if it is genuinely immutable after load; a config object with setters is shared mutable state wearing a disguise.

**Code / structure**

```ts
// Acceptable: immutable config, validated once at import time
// config/env.ts
const parsed = envSchema.parse(process.env);   // throws on missing vars
export const env: Readonly<EnvConfig> = Object.freeze(parsed);
```

```java
// Anti-pattern (real interview trap):
public class Driver {
    private static WebDriver instance;              // shared across threads
    public static WebDriver get() {
        if (instance == null) instance = new ChromeDriver();
        return instance;                            // parallel = one browser
    }
}
// Fix: ThreadLocal<WebDriver> (see DriverFactory in Q4)
```

**Follow-ups & traps**
- "Your suite passes serially and fails in parallel — first suspect?" — shared state; singletons and shared test data are suspects one and two.
- "Isn't the Playwright `browser` fixture a singleton?" — per-worker, not global, and contexts isolate within it — scoping is the point.
- Weak answer: "Singleton for the driver so we don't open too many browsers" — resource concern is real, the fix is worker limits, not shared sessions.

**Senior/lead angle** — Make it a platform rule: the shared core's lint config bans static mutable state, because one team's convenient singleton becomes every team's parallel-run outage once the core is shared.

**One-liner** — Singletons may hold facts, never sessions — config yes, WebDriver no, and parallel execution is the judge.

### Q8. How would you design reusable utilities without creating a "utils dumping ground"?

**Interview answer** — No `utils.ts`. Utilities live in small cohesive modules named by domain — `date-utils`, `money-format`, `api-client` — each with a single reason to change. My placement rule: if a function needs a comment explaining where it belongs, it's misplaced; and anything used by only one feature stays next to that feature until a second consumer appears.

**Deep dive** — Dumping grounds form through rational individual decisions: each engineer adds "just one helper" to the shared file, and two years later `utils.ts` is 3,000 lines of mixed abstraction levels that everyone imports and no one dares refactor. The structural defenses: modules named by cohesion (what they're about) not by layer ("helpers"), a rule that promotion to shared requires two consumers (the rule of three, slightly relaxed), ownership per module so review is meaningful, and periodic audits that demote unused exports. Distinguish utilities from framework: the API client and wait helpers are framework infrastructure with owners and tests of their own; a date formatter is a utility. Conflating them is how load-bearing code ends up unowned.

**Code / structure**

```text
utils/
├── dates.ts            # business-day math, ISO helpers — pure functions
├── money.ts            # currency formatting/parsing used in assertions
└── retry.ts            # generic poll/backoff helper, used by api layer

# NOT in utils/ (they're framework, with owners and unit tests):
api/api-client.ts
fixtures/*.ts

# Rules enforced in review:
# 1. No file named utils.ts / helpers.ts / common.ts
# 2. Shared placement requires >=2 consumers; else co-locate with the feature
# 3. Pure functions only in utils/ — anything with I/O belongs to a layer
```

**Follow-ups & traps**
- "Who reviews utils changes?" — the module owner; unowned shared code is where subtle breakage hides.
- Weak answer: "we keep utils organized by being careful" — carefulness doesn't survive team growth; structure and lint rules do.
- Trap: utilities that import page objects — utilities must sit at the bottom of the dependency graph or you get cycles.

**Senior/lead angle** — In a multi-team core, the utils question becomes API design: every exported helper is a public contract you must version and deprecate carefully, so export deliberately and keep the surface small.

**One-liner** — Name modules by cohesion, require two consumers before sharing, keep I/O out — and never create a file called utils.ts.

### Q9. How do you separate test logic, page logic, data, config, and utilities?

**Interview answer** — By a one-way dependency rule: tests import fixtures and pages, pages import utils and config, data builders import config, and nothing imports from tests. Tests own intent and assertions, pages own locators and interactions, the data layer owns entity creation, config owns environment facts, and utilities own pure logic. The direction rule is what keeps the layers honest.

**Deep dive** — Layer definitions decay without an enforcement mechanism; the dependency direction is enforceable where "keep things tidy" is not. Concretely: a page object importing a data builder is a smell (pages act on data, they don't create it); a util importing a page object is a cycle waiting to happen; a test reaching into config for a URL usually means a page or client should own that navigation. Assertions stay in tests because a page object that asserts has opinions about expectations, and two tests with different expectations of the same page will fight over it. The payoff of clean layering is measurable: locator churn touches only pages/, environment changes touch only config/, and new-hire test contributions can't destabilize the framework because the import graph won't let them.

**Code / structure**

```text
Allowed dependency direction (top may import bottom, never reverse):

tests/            → intent + assertions only
  ↓
fixtures/         → composition: injects pages, data, clients into tests
  ↓
pages/ components/  api/  data/
  ↓
utils/  config/   → pure logic and environment facts; import nothing above

Enforced with eslint-plugin-boundaries / import rules:
  { from: 'pages',  disallow: ['tests', 'fixtures'] },
  { from: 'utils',  disallow: ['pages', 'api', 'tests'] },
```

**Follow-ups & traps**
- "Where do API-based assertions live?" — in tests, using the api client fixture; the client provides access, the test owns the expectation.
- "Can a page object call an API?" — avoid it; mixing UI and HTTP in one class blurs the layer and hides setup cost — do API work in fixtures or the arrange step.
- Weak answer: describing layers with no enforcement story — every codebase has an architecture diagram; few have one the linter agrees with.

**Senior/lead angle** — Publish the dependency rules as lint config inside the shared core package, so every consuming team inherits the architecture mechanically instead of via tribal knowledge.

**One-liner** — Layers are defined by what they may import — tests at the top, pure logic at the bottom, and the linter enforces the arrows.

### Q10. How do you prevent duplication in a large framework?

**Interview answer** — Structurally, not heroically: fixtures absorb setup duplication, component objects absorb repeated UI interaction, shared assertion helpers absorb repeated verification logic, and lint rules catch raw locators and copy-paste waits. On top of that, PR review conventions treat duplicated arrange-code as a design signal, and periodic dedup audits catch what review missed.

**Deep dive** — Duplication in test code is sneakier than in production code because tests are supposed to be somewhat repetitive — the skill is separating acceptable repetition (each test arranges its own state) from structural duplication (five tests each hand-building the same order payload). The escalation path: first occurrence inline, second occurrence noted, third occurrence extracted to a builder/fixture/component. Over-extraction is the counter-failure — a helper like `setupCheckoutWithUserAndCartAndCoupon(flags)` with boolean parameters is worse than duplication because no reader knows what state they're in. Component objects deserve emphasis: most cross-page duplication is shared widgets (tables, modals, date pickers), and one DataTable component with a locator-scoped constructor removes hundreds of near-identical lines.

**Code / structure**

```ts
// components/data-table.component.ts — kills the most common duplication
export class DataTable {
  constructor(private root: Locator) {}
  row(matching: string) { return this.root.getByRole('row', { name: matching }); }
  async sortBy(column: string) {
    await this.root.getByRole('columnheader', { name: column }).click();
  }
  async cellValue(rowMatch: string, column: string) {
    const idx = await this.columnIndex(column);
    return this.row(rowMatch).getByRole('cell').nth(idx).innerText();
  }
  private async columnIndex(name: string) { /* header lookup */ return 0; }
}

// usage in two different pages — no duplication, intent stays local
const ordersTable = new DataTable(page.getByTestId('orders-table'));
const usersTable  = new DataTable(page.getByTestId('users-table'));
```

**Follow-ups & traps**
- "When is duplication fine?" — in the assert phase: explicit expectations per test beat a shared mega-assertion nobody reads.
- "How do you find existing duplication?" — jscpd or similar copy-paste detectors on the test tree, run quarterly; the report drives the dedup audit.
- Weak answer: "code review catches it" alone — review catches duplication within a PR, never across two teams' folders.
- Trap: DRY-ing test intent — when two tests share every line via helpers, one of them probably shouldn't exist.

**Senior/lead angle** — Cross-team duplication is a platform signal: if three teams built their own date-picker helper, the shared core is missing a component — track "helpers reinvented per team" as a platform-gap metric.

**One-liner** — Extract on the third occurrence into fixtures, components, and builders — and remember the assert phase is allowed to repeat itself.

### Q11. How would you maintain thousands of automated tests?

**Interview answer** — Four mechanisms: ownership — every test maps to an owning team via directory or annotation, and unowned tests get deleted or adopted; taxonomy — tags for suite, risk, and feature so we can slice execution; health tooling — dashboards for flake rate, duration, and last-failure, with an automatic quarantine flow; and a deletion policy — tests that haven't failed meaningfully in months and cover paths tested elsewhere get retired. Maintenance is a budgeted activity, not a background hope.

**Deep dive** — At thousands of tests the binding constraint shifts from writing to knowing: which tests cover what, which are trustworthy, who fixes a failure. Ownership is the keystone — a failing test with no owner stays red until someone disables the suite. Quarantine needs teeth: flaky tests are removed from the merge gate automatically, ticketed to owners, and deleted if unfixed after an SLA — quarantine-forever is deletion with extra steps and worse dashboards. The deletion policy is where leads flinch and shouldn't: a test that never fails, duplicates API-level coverage, and takes 40 seconds is a pure cost; suites should shrink as lower layers improve. Docs and onboarding round it out — a framework only three people can extend is a bus-factor incident, so measure time-to-first-merged-test for new joiners.

**Code / structure**

```text
Governance mechanics:

ownership   → CODEOWNERS per tests/<feature>/ folder; CI failure pings owner channel
tagging     → @smoke @regression @checkout @slow — enforced shape via lint rule
health     → nightly job ships run metadata (test, duration, outcome, retries)
              to warehouse; dashboard: flake %, p95 duration, days-since-real-failure
quarantine  → auto-label after 2 flaky occurrences/week → out of merge gate →
              owner ticket with 14-day SLA → delete or fix
deletion    → quarterly review: candidates = zero real failures in 6 months
              AND overlapping lower-layer coverage
```

**Follow-ups & traps**
- "Who does maintenance if teams own their tests?" — teams fix their tests; the platform team fixes the framework and the tooling that makes fixing cheap.
- "How do you delete a test safely?" — check what it uniquely covers (coverage diff / mutation spot-check); if the answer is nothing, deletion is safe by construction.
- Weak answer: "we keep tests updated as part of definition of done" — true and insufficient; without dashboards and SLAs, entropy wins.

**Senior/lead angle** — Report suite health upward in business terms: escaped defects, time-to-feedback, and maintenance share of QA capacity — the exec question is never "how many tests," it's "can we ship confidently and what does that confidence cost."

**One-liner** — Thousands of tests survive on ownership, tags, health dashboards, and the courage to delete — not on more tests.

### Q12. Monorepo vs separate automation repo?

**Interview answer** — I lean toward co-location: tests live in the application repo, run in the same PR pipeline, and change atomically with the code they test. A separate QA repo gives central control but creates version-skew pain — tests forever chasing app changes they couldn't see coming — and makes developers treat automation as someone else's code. I'd keep only the shared framework core in its own package, not the tests.

**Deep dive** — The separate-repo model dominated when QA was a separate org: one repo, one framework team, tests written after features. Its structural flaw is coupling without co-change — a PR that renames a field merges green while the test repo breaks an hour later, so failures land on the wrong people at the wrong time. Co-location fixes the feedback loop: the breaking PR sees the failing test before merge, developers can fix trivial test breakage themselves, and blame conversations disappear because there's one commit history. Costs of co-location: CI time lands in the product pipeline (mitigate with tag-sliced suites), framework consistency needs the shared-core package, and cross-service journey tests need a home — usually a thin e2e repo or a dedicated folder in the platform monorepo, kept deliberately small. Industry lean is clearly toward co-location; saying so, with the cross-service exception, is the current strong answer.

**Code / structure**

```text
Co-located (default):
app-repo/
├── src/
├── e2e/                  # feature tests, run in this repo's PR pipeline
│   └── (imports @org/e2e-core)
└── .github/workflows/pr.yml   # unit + api + tagged e2e slice

Shared, versioned separately:
packages/e2e-core/        # fixtures, api-client, config, lint rules (Q13)

Small by design:
journey-tests/            # only true cross-service flows; nightly + pre-release
```

**Follow-ups & traps**
- "How do you keep ten co-located suites consistent?" — the shared core package plus a scaffold; consistency by convenience, not mandate.
- "What about QA engineers who don't work in the app repo?" — that's an org smell worth naming: embedded quality beats over-the-wall testing regardless of repo layout.
- Weak answer: choosing a layout with no failure-mode reasoning — the repo question is really the "who sees breakage when" question.

**Senior/lead angle** — Frame it as an incentives decision: co-location makes developers own test health because red blocks their merge; a central repo makes test failures ignorable — pick the structure that makes the right behavior the lazy behavior.

**One-liner** — Co-locate tests with the code so breakage is visible before merge; keep the framework core — and only the core — as a shared package.

### Q13. How do you version and distribute a shared framework core across teams?

**Interview answer** — As an internal npm package with strict semver: patch for fixes, minor for additive fixtures and helpers, major for anything that breaks a consuming test. Every major ships with a changelog, a migration guide, and ideally a codemod; deprecations warn for at least one minor before removal. The platform team runs a canary — consuming teams' suites executed against the release candidate — before publishing.

**Deep dive** — The failure modes are both directions. Move fast and break consumers, and teams pin to an ancient version forever — you now maintain N versions in the wild and your improvements reach no one. Never break anything, and the core fossilizes around early mistakes. The disciplined middle: small public surface (export deliberately — every exported symbol is a contract), deprecation windows with loud but non-breaking warnings, migration automation for mechanical changes (codemods pay for themselves after roughly two majors), and the canary run so you discover breakage before your consumers do. Adoption tracking matters as much as publishing: a dashboard of which team is on which version tells you where the stragglers are, and upgrade-adoption speed is an honest measure of whether teams trust the core.

**Code / structure**

```text
@org/e2e-core
├── src/
│   ├── fixtures/         # test, expect — the primary public API
│   ├── api/              # ApiClient base
│   ├── config/           # env schema + loader
│   └── eslint/           # shipped lint rules (architecture enforcement, Q9)
├── CHANGELOG.md          # keep-a-changelog format, every release
├── MIGRATIONS/
│   └── v3-to-v4.md       # breaking-change guide + codemod command
└── package.json          # semver; publishes to internal registry

Release flow:
RC published → canary: run 3 consumer teams' suites against RC in CI
→ green: publish + announce with changelog
→ deprecations log warnings for >=1 minor before removal in next major
```

**Follow-ups & traps**
- "A team refuses to upgrade for a year — what do you do?" — first ask why (usually a real migration cost you underestimated); offer pairing/codemod help; only then apply an N-2 support policy.
- "Monorepo instead of versioning?" — inside one monorepo, yes: single version, atomic upgrades, no semver overhead — say versioning is for multi-repo orgs.
- Weak answer: "we publish a package" with no deprecation or canary story — distribution is easy; not breaking ten teams is the job.

**Senior/lead angle** — Treat the core as a product: consuming teams are customers, upgrade pain is churn, and version-adoption speed plus "teams reinventing what the core already does" are your product metrics.

**One-liner** — Ship the core as a semver'd internal package with deprecation windows, migration guides, and a canary — and measure adoption, not just releases.

### Q14. A UI change breaks dozens of tests — how do you judge whether the framework is poorly designed?

**Interview answer** — I'd run a blast-radius analysis: for the given UI change, what is the minimum number of edits a well-layered framework would need? If a button's locator changed, the right answer is one page-object line — and if the actual fix touches forty spec files, the diagnosis is raw locators in tests, not a flaky UI. If instead an entire flow was legitimately redesigned, dozens of test updates may be the correct cost and the framework is fine.

**Deep dive** — The question tests whether you can distinguish symptom from disease. Framework fault: locators duplicated across specs, copy-pasted interaction sequences, assertions coupled to markup structure (`.nth(3)`, CSS chains) — all fixable with page/component objects and lint enforcement, and the incident is the mandate to fix them. Not framework fault: a genuine redesign of checkout changes the user journey, so tests describing that journey must change — the framework goal is making those updates cheap and mechanical, not making tests immune to product change (immune tests would be testing nothing). There's a third diagnosis worth naming: dozens of e2e tests all walking through the same redesigned screen suggests over-testing at the e2e layer — some of that coverage belongs in component or API tests that a UI redesign wouldn't touch. The response protocol: fix the page object first, count how many tests recover free (that number is your layering grade), then fix stragglers and add the lint rule that prevents recurrence.

**Code / structure**

```text
Blast-radius rubric for "UI change X broke N tests":

expected edits if well-layered:
  locator change            → 1 line in one page/component object
  widget behavior change    → 1 component object method
  flow/journey redesign     → the tests describing that journey (legit cost)
  markup restructure only   → ~0 if locators are role/testid-based

diagnosis signals:
  N spec files edited for a locator change   → tests contain raw locators
  same 5-line sequence fixed in 20 places    → missing component object
  breaks from DOM reshuffle w/o UX change    → brittle structural selectors
  30 e2e tests through one screen            → coverage belongs lower in pyramid
```

**Follow-ups & traps**
- "The fix is urgent — refactor now or patch tests?" — patch the release path first, but land the page-object refactor in the same week while the pain is politically useful.
- "How do you prevent recurrence?" — lint rule banning raw locators in specs, `data-testid`/role-based selector convention agreed with frontend, and a blast-radius question in test-design review.
- Weak answer: "UI changes always break tests, that's normal" — normalizing high blast radius is how frameworks earn their maintenance reputation.
- Trap: over-correcting into abstraction so thick that tests no longer fail on real regressions — the goal is cheap updates, not insulation from the product.

**Senior/lead angle** — Turn incidents into a metric: track "tests edited per UI change" over time — a falling trend is objective evidence of improving architecture, and it's a number you can put in front of engineering leadership.

**One-liner** — Judge the framework by the minimum-edit test: a locator change should cost one line, and if it cost forty files, the locators were living in the wrong layer.
