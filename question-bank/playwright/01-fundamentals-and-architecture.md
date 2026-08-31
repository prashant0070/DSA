# Playwright Fundamentals & Architecture

This file covers the "what is it and how does it work" layer of Playwright interviews: what the tool is, how it talks to browsers, how it compares to Selenium and Cypress, and the Browser/Context/Page/Locator model. Almost every Playwright interview opens with two or three of these before moving to hands-on questions, and the architecture answers here are what separate a candidate who has used Playwright from one who understands it.

- Q1. What is Playwright?
- Q2. What are the key features of Playwright?
- Q3. Which languages does Playwright support?
- Q4. What are the advantages of Playwright over Selenium? How does it differ?
- Q5. How does Playwright compare with Cypress?
- Q6. How does Playwright communicate with browsers under the hood?
- Q7. What are the main components of Playwright?
- Q8. What is Playwright Test?
- Q9. Explain the Browser → BrowserContext → Page architecture.
- Q10. What is a BrowserContext and why is it the unit of test isolation?
- Q11. What is a Page?
- Q12. What is a Locator?
- Q13. What is the purpose of expect() in Playwright?
- Q14. Does Playwright use WebDriver? Why does not using it matter?

### Q1. What is Playwright?

**Interview answer** — Playwright is an open-source browser automation framework from Microsoft that drives Chromium, Firefox, and WebKit with a single API. It's primarily used for end-to-end web testing, and in the Node.js ecosystem it ships with its own test runner, `@playwright/test`, so you get fixtures, parallelism, tracing, and reporting out of the box. Its defining traits are auto-waiting on every action, browser-context-based isolation, and a fast bidirectional protocol connection to the browser instead of WebDriver-style HTTP.

**Deep dive** — Playwright was started by the same team that built Puppeteer at Google, which is why it feels like "Puppeteer generalized to all engines." It downloads patched browser builds it fully controls, which lets the team expose capabilities standard browsers don't (WebKit on Windows/Linux, deterministic network interception, precise event delivery). It is a full-stack testing product: the library (automation API), the runner (test orchestration), plus tooling — codegen, trace viewer, UI mode, and an `APIRequestContext` for API testing in the same test.

**Follow-ups & traps**
- "Is Playwright only for testing?" — No; the library can be used for scraping and automation without the runner.
- "Does it test Safari?" — It tests WebKit, the engine behind Safari, via a patched build — not branded Safari itself. Saying "it runs real Safari" is a small but noticed inaccuracy.
- Interviewers often follow with "who maintains it and why does that matter?" — Microsoft, very active release cadence (roughly monthly minor versions).

**One-liner** — Playwright is Microsoft's cross-browser automation framework with a built-in test runner, auto-waiting, and a fast WebSocket-based protocol instead of WebDriver.

### Q2. What are the key features of Playwright?

**Interview answer** — The features I'd highlight are: auto-waiting with actionability checks so you rarely write explicit waits; web-first assertions that retry until they pass or time out; browser contexts giving free, fast test isolation; true cross-browser support including WebKit; built-in parallelism at the worker level; and first-class tooling — trace viewer, UI mode, codegen, and HTML reports. It also handles the historically painful cases natively: multiple tabs, iframes, shadow DOM, file downloads/uploads, and network mocking.

**Deep dive** — The features reinforce each other: auto-waiting works because the Locator API defers element resolution to action time, and web-first assertions reuse the same polling machinery. Isolation via contexts is what makes parallelism safe by default — each test gets a fresh context, so tests can't leak cookies or storage into each other. Tracing is cheap enough (`trace: 'on-first-retry'`) to keep on in CI, which changes how teams debug flaky failures: you get a post-mortem DOM snapshot timeline instead of a screenshot and a prayer.

**Code**

```ts
// Several headline features in ~10 lines: auto-waiting, web-first assertions, network mock
test('search shows mocked results', async ({ page }) => {
  await page.route('**/api/search?q=laptop', route =>
    route.fulfill({ json: { items: [{ id: 1, name: 'ThinkPad X1' }] } }));

  await page.goto('/shop');
  await page.getByRole('searchbox', { name: 'Search products' }).fill('laptop');
  await page.getByRole('button', { name: 'Search' }).click(); // auto-waits for actionability

  await expect(page.getByRole('listitem')).toHaveCount(1);    // polls until true
  await expect(page.getByText('ThinkPad X1')).toBeVisible();
});
```

**Follow-ups & traps**
- "Which feature reduces flakiness the most?" — Auto-waiting plus web-first assertions; explicit-wait bugs are the #1 flake source in Selenium suites.
- Trap: listing features you can't explain. If you say "tracing," expect "open a trace and tell me what you see."
- "Any weaknesses?" — Fair answers: no real-device mobile browsers (emulation only), smaller ecosystem than Selenium for niche language bindings, patched builds are not branded browsers.

**One-liner** — Auto-waiting, retrying assertions, context-based isolation, all three engines, parallel by default, and tracing/UI-mode tooling — the flake-killers are built in, not bolted on.

### Q3. Which languages does Playwright support?

**Interview answer** — Officially: JavaScript/TypeScript (Node.js), Python, Java, and .NET/C#. But the critical nuance is that the full test-runner experience — `@playwright/test`, fixtures, projects, `playwright.config.ts`, built-in parallelism and reporting — exists only in the Node.js binding. In Java you get the automation library with a synchronous API and no runner: you pair it with TestNG or JUnit, manage Browser/Context/Page lifecycles yourself, and you must know that Playwright objects are not thread-safe, so parallel execution means one Playwright instance per thread.

**Deep dive** — All bindings speak the same underlying protocol to the same driver, so locators, auto-waiting, and browser behavior are identical. What differs is everything around the tests. `playwright.config.ts` concepts — projects, `use` blocks, fixture composition, sharding — simply don't exist in playwright-java; the equivalents are TestNG suite XML, `@BeforeMethod` lifecycle code, and your own thread-local management. Python sits in between: no dedicated runner, but the official `pytest-playwright` plugin supplies fixtures (`page`, `context`) so it feels closer to the Node experience. Interviewers whose stack is Java probe exactly here — if your resume says "Playwright with Java" and you start talking about fixtures and `playwright.config.ts`, that's an immediate credibility hit.

**Follow-ups & traps**
- "How do you run playwright-java tests in parallel?" — TestNG parallel with a `ThreadLocal<Playwright>`/`ThreadLocal<Browser>` per thread, because instances are not thread-safe. Saying "set workers in the config" is the classic wrong answer.
- "Where do assertions come from in Java?" — `com.microsoft.playwright.assertions.PlaywrightAssertions` (`assertThat(locator).isVisible()`), which does retry like web-first assertions — plus TestNG/JUnit asserts for plain values.
- Trap: claiming Ruby/Go are officially supported — those bindings are community-maintained.

**Senior/lead angle** — Language choice is a team-topology decision: if the framework will be maintained by SDETs embedded with Java backend teams, playwright-java plus TestNG is defensible; if the goal is maximum tooling leverage (UI mode, fixtures, sharding, merged blob reports), TypeScript is the strongest option and worth the onboarding cost.

**One-liner** — Four official bindings, one protocol — but fixtures, projects, and playwright.config.ts live only in the Node runner; Java gets a sync, non-thread-safe library you wire into TestNG or JUnit yourself.

### Q4. What are the advantages of Playwright over Selenium? How does it differ?

**Interview answer** — The root difference is architecture. Selenium speaks the W3C WebDriver protocol: every command is a separate HTTP request to a browser-specific driver binary, which is chatty and gives the client little visibility into browser events. Playwright opens one persistent WebSocket-style connection per browser and speaks a CDP-like bidirectional protocol, so commands are faster and the browser can push events (network, console, dialogs) to the client in real time. On top of that foundation Playwright adds auto-waiting and actionability checks built into every action, browser contexts for millisecond-cheap isolation, bundled patched browsers so there's no driver-version matching, and built-in tracing, network interception, and a test runner. In Selenium most of that is your framework's job.

**Deep dive** — The event-push capability is the underrated part: `waitForResponse`, dialog auto-handling, and download events are natural in a bidirectional protocol and awkward over request/response HTTP. Auto-waiting also goes deeper than `WebDriverWait` — Playwright checks visible, stable (not animating), enabled, and "receives events" (nothing overlaying the click point) before acting, and retries the whole sequence; Selenium's explicit waits check one condition and then act on a possibly stale reference. Fairness matters in a senior answer: Selenium's strengths are the W3C standard (works with any compliant browser, real Safari, huge grid/cloud ecosystem), more language bindings, and two decades of ecosystem. Playwright trades standardization for control via patched builds.

**Follow-ups & traps**
- "So is Selenium 4's CDP support the same thing?" — No; Selenium 4 exposes CDP for Chromium only as an escape hatch, and its successor BiDi is still maturing. Playwright's protocol is the primary channel for all three engines.
- Trap: "Playwright is faster because it's newer." The speed comes from protocol design (one persistent connection, no per-command HTTP) and context reuse — be able to say why.
- "No StaleElementReferenceException in Playwright — why?" — Locators re-resolve on every action instead of holding a remote element reference. This is a favorite cross-question; it bridges to the Locator vs ElementHandle question.
- "When would you still pick Selenium?" — Mandated real-Safari/real-device coverage, an existing large grid investment, or language bindings Playwright lacks.

**Senior/lead angle** — In a migration discussion, quantify: per-command HTTP latency × thousands of commands per suite, plus flake-rate reduction from auto-waiting, plus infra cost (no Selenium Grid to run — Playwright shards natively in CI). That's the business case, not "it's more modern."

**One-liner** — Selenium sends every command as HTTP to a driver; Playwright keeps one bidirectional WebSocket channel to a patched browser — which is what makes auto-waiting, event-driven waits, cheap contexts, and built-in tracing possible.

### Q5. How does Playwright compare with Cypress?

**Interview answer** — Cypress runs your test code inside the browser alongside the app, which gives a great interactive DX but imposes hard architectural limits: historically no multi-tab support, painful iframe and multi-origin handling (improved by `cy.origin` but still constrained), and JavaScript/TypeScript only. Playwright runs outside the browser and controls it over a protocol, so multiple tabs, multiple origins, iframes, and multiple browser contexts — like testing a buyer and a seller in one test — are first-class. Playwright also parallelizes for free with workers, while Cypress's parallelization across machines is tied to its paid Cloud service, and Playwright covers WebKit while Cypress has an experimental story there.

**Deep dive** — The in-browser model explains almost every Cypress limitation: same-origin policy restricts cross-origin navigation, one test controls one browser instance, and Node-side operations require `cy.task` bridges. It also explains Cypress's strengths — time-travel snapshots and automatic command-log DOM state came naturally from living inside the page (Playwright closed that gap with trace viewer and UI mode). Command semantics differ too: Cypress chains enqueued commands with implicit retry-ability rules that trip people up (`.then` vs chained assertions), while Playwright is plain async/await, which composes normally with the rest of your code. On waits, both auto-retry, but Playwright's actionability model (stability, receives-events) is more thorough than Cypress's default checks.

**Follow-ups & traps**
- "Multi-tab test in Cypress?" — You can't, by design; Cypress docs suggest testing tabs as separate visits. In Playwright: `context.waitForEvent('page')`. Interviewers love this concrete contrast.
- Trap: saying "Cypress can't do API tests" or "can't do cross-origin at all" — both outdated (`cy.request`, `cy.origin`). Being fair about the competitor reads as senior.
- "Which would you pick for a new project?" — Have an opinion with reasons: Playwright for cross-browser/multi-context/free parallelism; Cypress is defensible if the team already knows it deeply and needs are simple.

**One-liner** — Cypress lives inside the browser — great DX, hard limits on tabs, origins, and free parallelism; Playwright drives from outside, so multi-context, multi-origin, WebKit, and worker parallelism come standard.

### Q6. How does Playwright communicate with browsers under the hood?

**Interview answer** — Your test code talks to a Playwright driver process, which launches the browser and holds a single persistent WebSocket-style connection to it for the whole session. Over that connection Playwright speaks Chrome DevTools Protocol to Chromium, and equivalent custom protocols to its patched builds of Firefox and WebKit — the patches add the remote-debugging server those engines don't ship publicly. Because the channel is bidirectional, Playwright both sends commands and receives pushed events — network activity, console messages, dialogs, new pages — without polling.

**Deep dive** — The client bindings (JS, Java, Python, .NET) are thin: they serialize calls into a JSON protocol to the driver, which is why all languages behave identically. Objects like Browser, Context, Page, and even Locator operations map to protocol messages with GUID-addressed channels. In "browser server" mode (`browserType.launchServer()` / `connect()`), the browser and driver run on one machine and tests connect over WebSocket from another — that's the mechanism behind remote grids and Docker-based execution. The patched-builds decision is the key trade-off to articulate: it gives Playwright a uniform, capable protocol across engines, at the cost of not running branded Firefox/Safari (Chromium can use branded channels like `chrome`/`msedge` since CDP is native there).

**Follow-ups & traps**
- "Is it CDP for all browsers?" — No; CDP is Chromium-only. Firefox and WebKit use Playwright-specific protocols implemented in the patches. Saying "it's all CDP" is a common wrong answer.
- "Can you attach to an existing browser?" — Yes, `chromium.connectOverCDP()` for Chromium-based browsers; useful for hybrid setups (e.g., Electron, remote debugging), with reduced API guarantees.
- "Why one WebSocket instead of HTTP per command?" — Lower latency, ordered command stream, and server-push events that make `waitForEvent`/`waitForResponse` possible.

**One-liner** — One persistent bidirectional channel per browser — native CDP for Chromium, Playwright-patched equivalents for Firefox and WebKit — carrying both commands and pushed events.

### Q7. What are the main components of Playwright?

**Interview answer** — Two layers. The Playwright library (`playwright` package) is the automation API — BrowserType, Browser, BrowserContext, Page, Locator, network routing — usable from any script. On top of it sits `@playwright/test`, the test runner, which adds `test()` and `expect()`, fixtures, `playwright.config.ts` with projects, parallel workers, retries, reporters, and tracing integration. For testing work you install `@playwright/test` and get the library API through fixtures like `page` and `context`.

**Deep dive** — Keeping the layers separate clarifies several interview questions: web-first `expect(locator)` assertions, fixtures, and projects are runner features, not library features — which is exactly why they're absent in Java/.NET bindings. The ecosystem around them: the CLI (`npx playwright`) for running, codegen, trace viewing, and browser installation; `APIRequestContext` in the library for HTTP-level testing; and component testing packages that reuse the runner. A subtle point worth knowing: you should not install `playwright` and `@playwright/test` as separate top-level dependencies with mismatched versions — the runner bundles the library, and version skew causes confusing "browser not found" or type errors.

**Follow-ups & traps**
- "When would you use the library without the runner?" — Scraping, one-off automation scripts, or embedding browser automation in an app; also inside Jest/Vitest if a team mandates it (losing runner features).
- Trap: calling `page` "the framework" — interviewers may push on which piece provides retries or projects, and the answer is always the runner.

**One-liner** — The `playwright` library automates browsers; `@playwright/test` wraps it with a runner — fixtures, config, parallelism, retries, reporting — and testing uses both together.

### Q8. What is Playwright Test?

**Interview answer** — Playwright Test is the official test runner, installed as `@playwright/test`. It provides the `test` and `expect` APIs, dependency-injected fixtures like `page` and `context` that give every test an isolated environment, `playwright.config.ts` for configuration, projects for running the same suite across browsers or configurations, parallel execution with worker processes, retries with automatic tracing/video capture, and reporters including the interactive HTML report. It's what turns the automation library into a complete testing framework.

**Deep dive** — Its execution model matters for later questions: the runner spawns OS-level worker processes, each running test files in isolation; fixtures have test scope or worker scope, which is why `beforeAll` runs once per worker rather than truly once. Fixtures are the core design idea — instead of inheriting base classes or global setup files, you compose capabilities (a logged-in page, a seeded database, a mock server) as typed fixtures with setup/teardown around the test, and Playwright instantiates only what a test actually uses. Projects generalize "run on three browsers" into arbitrary matrix and dependency graphs — e.g., a `setup` project that logs in and saves storage state, which browser projects depend on.

**Code**

```ts
// playwright.config.ts — the runner's contract
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: { baseURL: 'https://shop.example.com', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Follow-ups & traps**
- "Can you use Playwright with Jest instead?" — Technically yes via the library, but you lose fixtures, projects, tracing integration, and web-first assertions wiring; in interviews, recommend the native runner.
- "What's a fixture?" — Be ready with a crisp definition: scoped, composable setup/teardown injected into tests by name.

**One-liner** — `@playwright/test` is the batteries-included runner: fixtures for isolation, projects for the browser matrix, workers for parallelism, retries with traces, and reporting.

### Q9. Explain the Browser → BrowserContext → Page architecture.

**Interview answer** — A Browser is one running browser instance — a heavyweight OS process launched once and reused. A BrowserContext is an isolated, incognito-like session inside that browser: its own cookies, localStorage, cache, and permissions, created in milliseconds. A Page is a single tab or popup within a context. The hierarchy is one browser → many contexts → many pages per context. The runner leans on this: one browser per worker, a fresh context and page per test, so isolation is free and startup cost is paid once.

**Deep dive** — The design solves the classic speed-vs-isolation trade-off. In Selenium, real isolation meant a new browser process per test (seconds each); sharing a browser meant leaked cookies and flaky test interdependence. Contexts give process-level-like isolation at object-creation cost because profiles are kept in memory and never written to disk (non-persistent by default). Contexts are also the unit of configuration: viewport, locale, timezone, geolocation, HTTP credentials, recorded videos, and `storageState` all attach to the context. Pages within one context share session state — which is exactly what you want for multi-tab flows — while two contexts in the same browser cannot see each other's state, enabling two-user tests in a single browser process.

**Code**

```ts
// Two isolated users in ONE browser: buyer and support agent
test('agent sees the order the buyer just placed', async ({ browser }) => {
  const buyerCtx = await browser.newContext({ storageState: '.auth/buyer.json' });
  const agentCtx = await browser.newContext({ storageState: '.auth/agent.json' });
  const buyer = await buyerCtx.newPage();
  const agent = await agentCtx.newPage();

  await buyer.goto('/checkout');
  await buyer.getByRole('button', { name: 'Place order' }).click();
  const orderId = await buyer.getByTestId('order-id').textContent();

  await agent.goto('/support/orders');
  await expect(agent.getByRole('row', { name: orderId! })).toBeVisible();

  await buyerCtx.close();
  await agentCtx.close();
});
```

**Follow-ups & traps**
- "Difference between opening a new context and a new page?" — New page shares session state with its siblings; new context is a clean, isolated user. Mixing these up is a common fail.
- "How does this map to Playwright Test?" — `context` and `page` fixtures are created fresh per test; the browser is shared per worker.
- "What's a persistent context?" — `launchPersistentContext()` with a real user-data directory on disk; needed for testing extensions or reusing a real profile, at the cost of isolation.

**One-liner** — Browser is the expensive process, context is a free incognito session and the isolation boundary, page is a tab — launch once, new context per test, pages as needed.

### Q10. What is a BrowserContext and why is it the unit of test isolation?

**Interview answer** — A BrowserContext is an independent browser session inside a running browser — think incognito profile: separate cookie jar, localStorage, sessionStorage, cache, service workers, and permissions. It's the unit of isolation because it guarantees no state leaks between tests while costing milliseconds to create, unlike launching a browser which costs seconds. Playwright Test gives every test a brand-new context automatically, which is why parallel tests can't pollute each other even inside the same worker's browser.

**Deep dive** — Isolation failures are the classic root cause of order-dependent test suites: test A logs in, test B accidentally depends on that session, and the suite breaks the moment you parallelize or reorder. Contexts make that class of bug structurally impossible. Contexts also carry the environment configuration — device emulation, locale/timezone, geolocation, offline mode, HTTP credentials, extra headers — so "run this test as a mobile user in Berlin" is a context option, not test logic. The performance-critical pattern built on contexts is `storageState`: authenticate once in a setup project, serialize cookies + localStorage to JSON, then stamp every test's fresh context with that state — isolated tests that skip the login UI entirely.

**Code**

```ts
// Log in once (setup project), reuse everywhere via storageState
// auth.setup.ts
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('qa@example.com');
  await page.getByLabel('Password').fill(process.env.QA_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation')).toContainText('My account');
  await page.context().storageState({ path: '.auth/user.json' });
});

// playwright.config.ts (excerpt): every test's new context starts logged in
// use: { storageState: '.auth/user.json' }
```

**Follow-ups & traps**
- "If contexts are isolated, how do you share login across tests?" — `storageState`, exactly as above. Answering "log in in `beforeEach`" marks you as not knowing the idiomatic pattern.
- "Is context isolation the same as process isolation?" — No — contexts share the browser process; isolation is at the profile/session level, which is sufficient for web state.
- Trap: creating one context in `beforeAll` and sharing it across tests "for speed" — you've just reintroduced state leakage; the speed win should come from `storageState`, not sharing.

**Senior/lead angle** — Context-per-test is the invariant that makes everything else scale: parallelism, sharding, retries (a retried test gets clean state), and even multi-user scenarios. When someone proposes sharing sessions across tests to save time, the answer is storage-state stamping, not weakened isolation.

**One-liner** — A context is a millisecond-cheap incognito session — fresh one per test means zero state leakage, and storageState makes it fast without sacrificing isolation.

### Q11. What is a Page?

**Interview answer** — A Page represents a single tab or popup window inside a BrowserContext, and it's the main interface you automate against: navigation with `goto`, creating locators, network routing, screenshots, and events like dialogs, downloads, and console messages. In Playwright Test, the `page` fixture hands each test a fresh page in a fresh context.

**Deep dive** — A page owns its frame tree — the main frame plus iframes — and most `page` methods delegate to the main frame; `frameLocator()` reaches into child frames. Pages are event emitters: `page.on('dialog')`, `page.on('download')`, `page.on('console')`, and `context.waitForEvent('page')` for popups — event-driven handling that the bidirectional protocol makes reliable. One page per test is the norm; multiple pages in one context model real multi-tab user flows sharing a session.

**Code**

```ts
// Popup handling: click opens a new tab with the invoice
const invoicePagePromise = context.waitForEvent('page'); // subscribe BEFORE the click
await page.getByRole('link', { name: 'View invoice' }).click();
const invoicePage = await invoicePagePromise;
await expect(invoicePage.getByRole('heading', { name: /Invoice #\d+/ })).toBeVisible();
```

**Follow-ups & traps**
- "How do you handle a link that opens a new tab?" — `context.waitForEvent('page')` started before the click; polling `context.pages()` is the amateur version.
- Trap: treating page as global/singleton in a POM framework — pages belong to a test's context; passing them explicitly (constructor injection) is the right structure.

**One-liner** — A Page is one tab in a context — your handle for navigation, locators, network, and events, delivered fresh to every test.

### Q12. What is a Locator?

**Interview answer** — A Locator is a lazy description of how to find an element — creating one does nothing and touches nothing. Every time you act on it or assert against it, Playwright re-runs the query against the live DOM, performs actionability checks, and retries until it succeeds or times out. That re-evaluation is why Playwright has no stale element problem and why locators are the recommended way to interact with the page.

**Deep dive** — Contrast with ElementHandle, which pins a specific DOM node: if the framework re-renders and replaces the node, the handle points at a corpse — Selenium's `StaleElementReferenceException` by another name. Locators invert this: they store the selector recipe, not the result. This laziness enables composition — `page.getByRole('listitem').filter({ hasText: 'Espresso' }).getByRole('button', { name: 'Add' })` builds one combined query evaluated atomically at action time. Locators are also strict by default: an action on a locator matching multiple elements throws, forcing selectors to be unambiguous instead of silently acting on the first match.

**Code**

```ts
const addButton = page
  .getByRole('listitem')
  .filter({ hasText: 'Espresso Machine' })
  .getByRole('button', { name: 'Add to cart' }); // nothing queried yet

await addButton.click();                  // resolve + actionability + retry happen HERE
await expect(addButton).toBeDisabled();   // re-resolved again for the assertion
```

**Follow-ups & traps**
- "Does creating a locator wait for the element?" — No. Nothing happens until an action or assertion; a locator for a nonexistent element is perfectly valid to hold.
- "So how do you just check existence without waiting?" — `await locator.count()` or `toHaveCount()` — instant vs asserted, respectively.
- Trap: caching `elementHandle()` from a locator "for performance" — you've reintroduced staleness for negligible gain.

**One-liner** — A locator is a stored query, not an element — re-resolved with auto-wait and retry at every use, which is why stale-element errors don't exist in Playwright.

### Q13. What is the purpose of expect() in Playwright?

**Interview answer** — `expect()` is the runner's assertion API, and its signature feature is web-first assertions: when you assert on a locator — `toBeVisible`, `toHaveText`, `toHaveURL` — Playwright polls the condition until it passes or the assertion timeout (5 seconds by default) expires. So assertions double as synchronization points; you assert the outcome you expect and the wait is implicit, instead of waiting first and asserting a one-shot snapshot after.

**Deep dive** — There are two modes: `expect(locator)`/`expect(page)` matchers auto-retry by re-querying the browser each poll; `expect(value)` on plain values is a one-shot Jest-style assertion with no retry — the distinction interviewers probe. This is why `expect(await locator.textContent()).toBe('Done')` is an anti-pattern: the `await` snapshots the text once, discarding all retry-ability, whereas `await expect(locator).toHaveText('Done')` keeps polling as the app settles. On failure, retrying matchers report the timeline of received values, which reads like a diagnosis rather than a mystery. Extensions of the same machinery: `expect.soft` (record failure, keep going), `expect.poll` (retry an arbitrary async function), and `toPass()` (retry a block).

**Code**

```ts
// Anti-pattern: one-shot snapshot, races the app
expect(await page.getByTestId('order-status').textContent()).toBe('Shipped');

// Web-first: polls until it matches or times out
await expect(page.getByTestId('order-status')).toHaveText('Shipped');

// Per-assertion timeout for a known-slow transition
await expect(page.getByTestId('order-status')).toHaveText('Delivered', { timeout: 15_000 });
```

**Follow-ups & traps**
- "Which assertions retry and which don't?" — Locator/page matchers retry; `expect(value)` matchers don't. Precise answer expected.
- "Why must you `await` these assertions?" — They're async (they poll the browser); a missing `await` means the test passes before the assertion resolves. Lint rule `@typescript-eslint/no-floating-promises` catches this.
- Trap: adding `waitForTimeout` before an assertion "to be safe" — the assertion already waits; the sleep only adds runtime.

**One-liner** — `expect(locator)` assertions poll until they pass or time out — they're your synchronization mechanism, not just your pass/fail check.

### Q14. Does Playwright use WebDriver? Why does not using it matter?

**Interview answer** — No. Playwright bypasses the W3C WebDriver protocol entirely and speaks directly to browsers over a persistent bidirectional channel — CDP for Chromium and equivalent protocols for its patched Firefox and WebKit builds. It matters because WebDriver's request/response HTTP model is both slow — every click is an HTTP round trip through a driver binary — and blind: the client can't receive browser events, so waiting is polling-based and network-level visibility is minimal. Playwright's protocol gives it speed, pushed events, network interception, and deeper control like actionability checks — and operationally, no chromedriver/geckodriver version-matching, since browsers are bundled per Playwright version.

**Deep dive** — WebDriver's design goal was standardization: one protocol any vendor can implement, which is why Selenium runs on branded Safari and real devices. The cost is a least-common-denominator API frozen around a lowest shared feature set — element interaction is in the standard; network mocking, tracing, and event streams aren't. Playwright chose the opposite trade: control the browser builds, own the protocol, ship features the standard can't express. The industry is converging back via WebDriver BiDi — a W3C bidirectional protocol WebSocket-based like Playwright's approach — which is effectively the standards body validating that request/response automation was the wrong shape. Playwright has experimental BiDi support, hedging toward a future where patched builds may not be needed.

**Follow-ups & traps**
- "Isn't testing patched builds a validity risk?" — Slightly: rendering engines are identical, but it's not branded Safari; for Chromium you can use real Chrome/Edge via channels. Acknowledging the trade-off honestly plays well.
- "What's WebDriver BiDi?" — The W3C's bidirectional successor to WebDriver; shows you track where the ecosystem is heading.
- Trap: "Playwright uses WebDriver under the hood" or "Playwright is Selenium 5" — instant credibility loss.

**One-liner** — No WebDriver: Playwright owns a bidirectional protocol to bundled browsers, trading the W3C standard for speed, pushed events, deep control, and zero driver management.
