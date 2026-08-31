# Fixtures

Fixtures are Playwright Test's dependency-injection system and the backbone of every serious framework built on it — interviewers use them to separate people who write tests from people who design test infrastructure. This file goes from the built-ins through `test.extend`, scoping, options, and composition with `mergeTests`.

- Q1. What are fixtures in Playwright?
- Q2. Fixtures vs `beforeEach` hooks
- Q3. Custom fixtures with `test.extend<T>()`
- Q4. Built-in vs custom fixtures — and overriding built-ins
- Q5. Test-scoped vs worker-scoped fixtures
- Q6. Automatic fixtures (`auto: true`)
- Q7. Fixture options and per-project overrides
- Q8. Fixture teardown order and failure behavior
- Q9. "What custom fixtures have you implemented?"
- Q10. Designing reusable fixtures for a large framework
- Q11. Page-object fixtures
- Q12. `mergeTests` / `mergeExpects`

### Q1. What are fixtures in Playwright?

**Interview answer** — Fixtures are Playwright Test's dependency-injection mechanism: a test declares what it needs in its callback's destructured argument, and the runner constructs exactly those things, on demand, with setup before the test and teardown after. The built-ins cover the browser stack — `page`, `context`, `browser`, `browserName`, `request` — plus `testInfo` as the second callback argument for metadata and attachments. Everything else in a good framework is a custom fixture built on the same mechanism.

**Deep dive** — The destructuring isn't cosmetic — Playwright parses the parameter list to build a dependency graph, so only requested fixtures (and their transitive dependencies) are initialized. Ask for `page` and the runner materializes `browser` → `context` → `page`; never mention `page` in an API-only test and no browser page is created. Fixtures are also lifecycle boundaries: `context` is per-test, which is where test isolation actually comes from, while `browser` is worker-scoped and reused. `request` gives an `APIRequestContext` for HTTP calls, and `testInfo` exposes title, status, retry number, `attach()`, and output paths.

**Code**

```ts
import { test, expect } from '@playwright/test';

test('search finds products', async ({ page, browserName }, testInfo) => {
  await page.goto('/search?q=espresso');
  await expect(page.getByRole('list', { name: 'Results' })).toBeVisible();
  if (testInfo.retry > 0) console.warn(`retry #${testInfo.retry} on ${browserName}`);
});

test('API-only: no page fixture, no browser page created', async ({ request }) => {
  const res = await request.get('/api/products?q=espresso');
  expect(res.ok()).toBeTruthy();
});
```

**Follow-ups & traps**
- "How does Playwright know which fixtures to set up?" — it reads the destructured parameters; naming this shows you understand the DI, not just the syntax.
- Wrong answer: "fixtures are just global variables" — they're per-test (or per-worker) constructed values with teardown.
- "Is `testInfo` a fixture?" — effectively yes; it's also available as `test.info()` anywhere in scope.

**One-liner** — Fixtures are declared-by-destructuring dependency injection: the runner builds only what each test asks for and tears it down after.

### Q2. How do fixtures differ from `beforeEach` hooks?

**Interview answer** — Three differences. Composition: fixtures are on-demand — a test gets a fixture only if it declares it, while `beforeEach` runs for every test in the file whether needed or not. Encapsulation: a fixture packages setup *and* teardown in one place around `await use()`, instead of splitting logic across `beforeEach`/`afterEach` with shared mutable variables. Reuse: fixtures live in a module and are imported anywhere; hooks are copy-pasted per file. Hooks still have a place for small, file-specific steps like a shared `goto`.

**Deep dive** — The deeper point interviewers probe for: hooks force a linear, all-or-nothing model — as a file grows, its `beforeEach` accretes setup for the union of all tests, slowing every test for the needs of a few. Fixtures invert that: each test pulls its exact dependencies, and the runner topologically orders construction. Fixtures also carry semantics hooks lack: worker scoping (Q5), auto-run (Q6), option-ness (Q7), and overrides. The shared-state hazard is real too — `let page` mutated in `beforeEach` invites cross-test leakage and defeats typing, whereas fixture values are passed, not shared. This comparison is a favorite interview probe precisely because the surface behavior looks identical.

**Code**

```ts
// Hook style: every test pays for cart setup, state shared via closure
let cartId: string;
test.beforeEach(async ({ request }) => {
  cartId = (await (await request.post('/api/carts')).json()).id;
});

// Fixture style: only tests that ask for `cart` pay for it
const test = base.extend<{ cart: { id: string } }>({
  cart: async ({ request }, use) => {
    const cart = await (await request.post('/api/carts')).json();
    await use(cart);
    await request.delete(`/api/carts/${cart.id}`); // teardown lives with setup
  },
});

test('empty cart shows hint', async ({ page, cart }) => { /* uses cart */ });
test('landing page renders', async ({ page }) => { /* no cart created at all */ });
```

**Follow-ups & traps**
- "Can fixtures fully replace hooks?" — mostly; hooks remain fine for trivial per-file steps. Absolutism either way is a red flag.
- Wrong answer: "fixtures are just renamed beforeEach" — misses on-demand construction, scoping, and reuse.
- "Where does teardown go in each model?" — fixture: after `use()` in the same function; hook: a separate `afterEach` that must re-derive state.

**One-liner** — Hooks run unconditionally and split setup from teardown; fixtures are on-demand, self-contained, reusable units the runner composes per test.

### Q3. What are custom fixtures? Show a typed example.

**Interview answer** — Custom fixtures extend the base `test` object via `test.extend<T>()`, where `T` types the new fixtures. Each fixture is an async function receiving the fixtures it depends on plus `use`: code before `await use(value)` is setup, the value is what tests receive, code after is teardown. Tests then import this extended `test` and destructure the fixture like a built-in. My canonical pair: a `loggedInPage` that delivers an authenticated page, and a data fixture that creates and cleans up a test entity.

**Deep dive** — `use` is the elegant trick: instead of separate setup/teardown registrations, the fixture is one function *suspended* around the test body — everything in scope before `use` is naturally available for teardown after, no state stashing. The type parameter flows through so tests get full IntelliSense on fixture values. Fixtures compose: `loggedInPage` depends on `page`, which depends on `context` — declare the dependency in the destructured first argument and the runner orders construction. Convention: define extended `test` in a `fixtures.ts`, re-export `expect`, and have all specs import from there rather than `@playwright/test`.

**Code**

```ts
// fixtures.ts
import { test as base, expect, Page } from '@playwright/test';

type Order = { id: string; total: number };

export const test = base.extend<{ loggedInPage: Page; order: Order }>({
  loggedInPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await context.newPage();
    await page.goto('/');
    await use(page);            // test runs here
    await context.close();      // teardown
  },
  order: async ({ request }, use) => {
    const res = await request.post('/api/orders', {
      data: { sku: 'ESP-1042', quantity: 1 },
    });
    const order: Order = await res.json();
    await use(order);
    await request.delete(`/api/orders/${order.id}`); // cleanup even on failure
  },
});
export { expect };
```

```ts
// order-details.spec.ts
import { test, expect } from './fixtures';

test('shows order total', async ({ loggedInPage, order }) => {
  await loggedInPage.goto(`/orders/${order.id}`);
  await expect(loggedInPage.getByTestId('order-total')).toHaveText(`$${order.total}`);
});
```

**Follow-ups & traps**
- "What happens if you forget `await use()`?" — the test body never runs; the fixture just completes. Knowing this shows you understand `use` as the suspension point.
- "Does teardown run when the test fails?" — yes, code after `use` runs regardless of test outcome.
- Wrong answer: doing cleanup inside the test — it won't run on failure; fixture teardown will.

**One-liner** — `test.extend<T>()` defines typed fixtures as one function paused around `await use(value)` — setup above, teardown below, test in between.

### Q4. Built-in vs custom fixtures — and how do you override built-ins?

**Interview answer** — Built-ins ship with the runner and cover the browser stack; custom fixtures are whatever the framework adds. The powerful middle ground is *overriding* built-ins: `test.extend` with the same fixture name replaces it for all consumers — the classic examples are overriding `page` to auto-navigate to `baseURL` before every test, or to block trackers and third-party noise. Every downstream fixture and test transparently receives the modified version.

**Deep dive** — An override receives the original fixture as a dependency (`async ({ page }, use)` inside the `page` override refers to the parent's `page`), decorates it, and passes it on — decorator pattern, enforced by the DI container. Because dependency resolution happens by name, anything depending on `page` — including your own page-object fixtures — gets the override with zero changes; that's the leverage and also the risk: overrides are invisible at the call site, so an aggressive one (e.g., blanket request blocking) becomes spooky action at a distance. Keep overrides boring and universally valid. Overriding `context` options is often better done via the `contextOptions` fixture or `test.use`.

**Code**

```ts
export const test = base.extend({
  page: async ({ page }, use) => {
    // Block analytics noise that slows tests and pollutes network logs
    await page.route(/(googletagmanager|hotjar|segment)\.(com|io)/, r => r.abort());
    await page.goto('/');            // every test starts at baseURL
    await use(page);
  },
});
```

**Follow-ups & traps**
- "Inside the override, what does `{ page }` refer to?" — the original built-in; the override wraps it.
- "How would a test opt out of the override?" — it can't easily; that's the design smell to mention — overrides must be safe for *all* tests, or belong in an opt-in fixture instead.
- Wrong answer: monkey-patching `page` methods in a helper file — invisible, untyped, and bypasses teardown ordering.

**Senior/lead angle** — Overrides are framework policy: use them for cross-cutting, always-correct behavior (tracker blocking, console-error collection), never for feature-specific setup. Document each override in the fixtures module, because nobody can see it from a spec file.

**One-liner** — Redefining a built-in in `test.extend` decorates it for every consumer — great for universal policy, dangerous for anything test-specific.

### Q5. Test-scoped vs worker-scoped fixtures — when do you use `{ scope: 'worker' }`?

**Interview answer** — Test-scoped fixtures (the default) are built and torn down per test — right for anything carrying per-test state. Worker-scoped fixtures are built once per worker process and shared by all tests that worker runs — right for expensive, reusable resources: an authenticated session, a DB connection pool, a seeded tenant, or a per-worker test account that makes parallel runs collision-free. `browser` itself is worker-scoped, which is the built-in precedent.

**Deep dive** — Workers are OS processes, so worker fixtures are also the *sharing boundary*: two workers never share a fixture instance, which means a worker-scoped account gives natural data isolation under parallelism with zero locking — the docs' recommended pattern, keyed by `test.info().parallelIndex` (stable across worker restarts, unlike `workerIndex` which increments when a worker is replaced after a crash). Constraint to volunteer: worker fixtures cannot depend on test-scoped fixtures (a per-worker thing can't be built from a per-test thing) — declare the second type parameter in `test.extend<TestFixtures, WorkerFixtures>` accordingly. Teardown runs when the worker exits, not between tests, so anything mutable in a worker fixture is shared mutable state across that worker's tests — keep it immutable or reset it per test.

**Code**

```ts
type WorkerFixtures = { account: { email: string; password: string } };

export const test = base.extend<{}, WorkerFixtures>({
  account: [async ({}, use, workerInfo) => {
    // One account per parallel worker — tests in this worker share it,
    // tests in other workers can never collide with it
    const email = `qa-worker-${workerInfo.parallelIndex}@example.com`;
    await createAccountViaApi(email, process.env.QA_PASSWORD!);
    await use({ email, password: process.env.QA_PASSWORD! });
    await deleteAccountViaApi(email);
  }, { scope: 'worker' }],
});
```

**Follow-ups & traps**
- "Can a worker fixture use `page`?" — no; `page` is test-scoped and the dependency direction is illegal. This is the standard gotcha.
- "`parallelIndex` vs `workerIndex`?" — `parallelIndex` is the stable slot (0..workers-1); `workerIndex` grows when workers restart. Account naming should use `parallelIndex`.
- Wrong answer: worker-scoping a fixture that holds test data "for speed" — cross-test contamination in exchange for milliseconds.
- "When does worker fixture teardown run?" — at worker shutdown, not after each test.

**One-liner** — Worker scope amortizes expensive setup across a worker's tests and doubles as the parallel-isolation boundary — one account per worker, no collisions.

### Q6. What are automatic fixtures (`auto: true`)?

**Interview answer** — An auto fixture runs for every test without being declared in any test's parameters — you opt the fixture in globally instead of opting in per test. It's the fixture-world replacement for "global beforeEach/afterEach", used for cross-cutting concerns: attaching browser console logs on failure, seeding a clean database, starting a mock server, or enforcing a no-console-errors policy.

**Deep dive** — Mechanically it's the same fixture function with `{ auto: true }` in the options tuple; the runner adds it to every test's dependency graph. The high-value pattern is *teardown-side reporting*: because code after `use()` runs post-test with access to `testInfo.status`, an auto fixture can collect diagnostics during the test and attach them only on failure — logs appear in the HTML report next to the trace. Auto fixtures respect scope too: an auto worker fixture runs once per worker (e.g., start a stub service). The discipline point: every auto fixture taxes every test, so they must be cheap and universally safe — the same caution as built-in overrides.

**Code**

```ts
export const test = base.extend<{ consoleCapture: void }>({
  consoleCapture: [async ({ page }, use, testInfo) => {
    const lines: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') lines.push(msg.text());
    });
    await use();
    if (testInfo.status !== testInfo.expectedStatus && lines.length) {
      await testInfo.attach('console-errors', {
        body: lines.join('\n'), contentType: 'text/plain',
      });
    }
  }, { auto: true }],
});
```

**Follow-ups & traps**
- "How is this different from `beforeEach` in a global setup file?" — it travels with the `test` import, gets scoping, and has teardown with access to test status.
- "Do tests declare it?" — no; that's the definition. Typing it as `void` signals it produces no value.
- Wrong answer: making an expensive fixture auto "so nobody forgets it" — now every API-only test pays for it too.

**One-liner** — `{ auto: true }` runs a fixture for every test undeclared — ideal for failure diagnostics and policies, taxed onto every test so keep it cheap.

### Q7. What are fixture options, and how do you override them per project?

**Interview answer** — A fixture defined with `[defaultValue, { option: true }]` becomes a configuration knob: tests read it like a fixture, but its value can be overridden in `playwright.config.ts` per project via `use`, or per file via `test.use()`. It's how you parameterize a framework — run the same suite as `persona: 'guest'` in one project and `persona: 'member'` in another without touching test code.

**Deep dive** — Options are the bridge between config and fixtures: built-in settings like `baseURL` and `storageState` are themselves option fixtures, which is why they're settable at every level of the same chain (global `use` → project `use` → `test.use()`, most specific wins). Custom options type-check in config when you register them via the config's type parameter or just rely on `use` accepting your extended options shape. Other fixtures can depend on an option and branch on it — a `loggedInPage` depending on a `persona` option picks a state file per persona, and each project selects its persona declaratively. That combination (option + dependent fixture) is the pattern that makes one suite serve many configurations.

**Code**

```ts
// fixtures.ts
type Options = { persona: 'guest' | 'member' | 'admin' };

export const test = base.extend<Options & { shopPage: Page }>({
  persona: ['guest', { option: true }],
  shopPage: async ({ browser, persona }, use) => {
    const context = await browser.newContext(
      persona === 'guest' ? {} : { storageState: `.auth/${persona}.json` },
    );
    await use(await context.newPage());
    await context.close();
  },
});
```

```ts
// playwright.config.ts — same tests, different persona per project
projects: [
  { name: 'guest-chromium', use: { ...devices['Desktop Chrome'], persona: 'guest' } },
  { name: 'member-chromium', use: { ...devices['Desktop Chrome'], persona: 'member' } },
]
```

**Follow-ups & traps**
- "Option fixture vs environment variable?" — options are typed, per-project, and visible in config; env vars are stringly-typed globals. Prefer options for suite parameters.
- "What's the precedence order?" — default in `extend` → global `use` → project `use` → `test.use()`.
- Wrong answer: `if (process.env.PERSONA === ...)` scattered through tests — the thing options exist to eliminate.

**One-liner** — `[default, { option: true }]` turns a fixture into a typed config knob, overridable per project or per file through the standard `use` chain.

### Q8. What is fixture teardown order, and how do failures in fixtures surface?

**Interview answer** — Teardown is LIFO relative to setup: the last fixture constructed is torn down first, so dependencies outlive their dependents — a page-object fixture tears down before the `context` it's built on. Failures split by phase: a setup failure means the test never runs and is reported failed with the fixture's error; a teardown failure marks the test failed even if its body passed. All-test-scoped teardown runs on test failure too — that's the whole cleanup guarantee.

**Deep dive** — LIFO falls out of the dependency graph — construction is a topological order, destruction its reverse — so teardown can rely on its dependencies still being alive (an `order` fixture's DELETE call can still use `request`). A worker-level fixture setup failure is worse than a test failure: the worker may be restarted, and tests can cascade-fail, so worker fixtures deserve extra defensive care. Errors thrown *after* `use()` surface attributed to the fixture, which is dramatically more debuggable than `afterEach` soup. One subtlety: if the test body throws and a teardown also throws, you get both reported — resist swallowing teardown errors with bare try/catch, or you'll hide real resource leaks; if a teardown failure is genuinely non-fatal, log it deliberately.

**Code**

```ts
export const test = base.extend<{ tenant: { id: string } }>({
  tenant: async ({ request }, use) => {
    const tenant = await (await request.post('/api/tenants')).json();
    await use(tenant);
    // Runs even when the test failed; `request` is still alive (LIFO)
    const res = await request.delete(`/api/tenants/${tenant.id}`);
    if (!res.ok()) throw new Error(`tenant cleanup failed: ${res.status()}`);
  },
});
```

**Follow-ups & traps**
- "Test passed but is reported failed — how?" — a teardown threw. Recognizing this saves real debugging time.
- "Does teardown run if setup of a *later* fixture failed?" — already-constructed fixtures are torn down; the failed one's `use` never ran.
- Wrong answer: "teardown order doesn't matter" — deleting via an API client that was disposed first is exactly how order bites.

**One-liner** — Setup is topological, teardown is its reverse (LIFO), teardown always runs, and a throwing teardown fails an otherwise green test.

### Q9. What custom fixtures have you implemented? (model answer)

**Interview answer** — Four families, which between them cover most of a framework. Authenticated pages per role — `adminPage`, `buyerPage` — wrapping context creation with the right `storageState`. An API client fixture: a thin typed wrapper over `request` with base URL and auth headers, used for setup shortcuts and hybrid UI+API assertions. A test-data factory with cleanup — creates orders/products via API before the test, tracks IDs, deletes them in teardown. And page-object fixtures, so tests receive constructed POMs instead of `new`-ing them. Plus one auto fixture attaching console errors on failure.

**Deep dive** — What interviewers listen for in this question is *why*, not the list: each fixture removes a category of boilerplate and a category of bugs. Role pages remove login duplication and context leaks (teardown closes the context). The API client removes hand-rolled fetch code and centralizes auth-header logic. The data factory is the big one — it makes tests self-provisioning, which is what actually enables `fullyParallel`, and its teardown-side cleanup keeps shared environments from silting up with orphaned records. The factory pattern worth describing: the fixture exposes *creator functions* and accumulates created IDs internally, so cleanup is automatic no matter how many entities a test creates.

**Code**

```ts
export const test = base.extend<{ orderFactory: (sku: string) => Promise<Order> }>({
  orderFactory: async ({ request }, use) => {
    const created: string[] = [];
    await use(async (sku: string) => {
      const res = await request.post('/api/orders', { data: { sku, quantity: 1 } });
      const order = await res.json();
      created.push(order.id);
      return order;
    });
    for (const id of created.reverse()) {
      await request.delete(`/api/orders/${id}`);
    }
  },
});

test('cancel order from history', async ({ page, orderFactory }) => {
  const order = await orderFactory('ESP-1042');
  await page.goto(`/orders/${order.id}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('Cancelled');
});
```

**Follow-ups & traps**
- "Why a factory function rather than a fixed `order` fixture?" — tests control quantity and parameters while cleanup stays centralized.
- "How does this help parallelism?" — every test owns its data; no shared seed records means no cross-worker collisions.
- Wrong answer: listing fixtures with no rationale — the question is really "show me you design infrastructure".

**One-liner** — Role pages, an API client, self-cleaning data factories, and POM fixtures — each one deletes a whole category of boilerplate and flake.

### Q10. How would you design reusable fixtures for a large framework?

**Interview answer** — In layers, each a separate `test.extend` building on the last: a base layer with universal concerns (logging, API client, options), a domain layer with data factories and role sessions, and a UI layer with page-object fixtures. Specs import the top of the chain. When fixture sets live in separate packages — say a shared platform package and a team's own — I combine them with `mergeTests` instead of forcing one inheritance chain.

**Deep dive** — Chained `extend` works because each call returns a new `test` whose type accumulates — the layering is really dependency management: lower layers must not know about higher ones, so the API-client layer never imports a page object. That keeps API-only test packages able to import layer two without pulling browser-facing code. The chain-vs-merge decision is ownership: one team, one repo → a chain is simpler to trace; multiple packages or plugin-style fixture sets → `mergeTests` composes without a shared ancestor. Two governance rules that keep this healthy at scale: specs may only import `test` from the framework entry point (lintable), and fixture count is curated — fixtures are API surface, and forty ad-hoc fixtures are as bad as forty utils files.

**Code**

```ts
// base.fixtures.ts
export const baseTest = base.extend<{ api: ApiClient }>({
  api: async ({ request }, use) => use(new ApiClient(request)),
});

// domain.fixtures.ts
export const domainTest = baseTest.extend<{ buyer: Buyer }>({
  buyer: async ({ api }, use) => {
    const buyer = await api.createBuyer();
    await use(buyer);
    await api.deleteBuyer(buyer.id);
  },
});

// ui.fixtures.ts — the entry point specs import
export const test = domainTest.extend<{ checkoutPage: CheckoutPage }>({
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
});
```

**Follow-ups & traps**
- "Why layers instead of one big `extend`?" — dependency direction and selective imports (API tests shouldn't load POMs); one blob becomes unmaintainable API surface.
- "Chain vs `mergeTests`?" — chain within one owner; merge across packages without a common ancestor.
- Wrong answer: helpers imported and called manually inside tests — abandons DI, teardown guarantees, and typing.

**Senior/lead angle** — Treat the fixture set as a published API: changelog it, review additions like you'd review public interface changes, and lint that specs import only the framework's `test` — that single rule prevents most architectural erosion.

**One-liner** — Layer `test.extend` chains by dependency direction — base, domain, UI — and reach for `mergeTests` only when fixture sets cross package boundaries.

### Q11. How do page-object fixtures remove boilerplate from tests?

**Interview answer** — Instead of every test starting with `const loginPage = new LoginPage(page)` lines, a fixture constructs each page object and hands it in typed: the test declares `{ checkoutPage }` and starts doing real work on line one. Beyond deleted lines, construction is centralized — if a POM's constructor gains a dependency, one fixture changes rather than every test — and page objects can arrive "ready", already navigated to their route.

**Deep dive** — This is DI applied to POMs, and the compound wins show at scale: POM fixtures compose with everything else in the graph — build `checkoutPage` from an overridden `page` or a role-specific page and every test inherits it silently. The "arrives ready" variant (fixture performs `goto` before `use`) removes the most duplicated line in most suites, though it should be a deliberate choice per page object — some tests need the POM without its default navigation, so teams often expose both or keep navigation explicit. Cost worth admitting: fixture indirection means a reader must look up what `checkoutPage` is; a well-named fixtures module keeps that cheap.

**Code**

```ts
export const test = base.extend<{ loginPage: LoginPage; checkoutPage: CheckoutPage }>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  checkoutPage: async ({ page }, use) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();               // arrives ready
    await use(checkout);
  },
});

test('applies discount code', async ({ checkoutPage }) => {
  await checkoutPage.applyDiscount('WELCOME10');
  await expect(checkoutPage.total).toHaveText('$80.99');
});
```

**Follow-ups & traps**
- "Isn't `new LoginPage(page)` only one line anyway?" — one line × hundreds of tests × every constructor-signature change; the value is centralized construction, not the line count.
- "Should the fixture navigate?" — judgment call; navigate when the POM is meaningless un-navigated, keep explicit otherwise.
- Wrong answer: a god fixture returning an object with *all* page objects — forces construction of everything for every test.

**One-liner** — POM fixtures inject constructed, typed, optionally pre-navigated page objects, centralizing construction that would otherwise be repeated in every test.

### Q12. What are `mergeTests` and `mergeExpects`?

**Interview answer** — `mergeTests` combines fixture sets from multiple independent `test.extend` chains into one `test` object; `mergeExpects` does the same for `expect` extended with custom matchers. They exist for composition across module boundaries — a shared platform package exports auth fixtures, another exports data-factory fixtures, your project merges them — where a single inheritance chain is impossible because the sets have no common ancestor.

**Deep dive** — Extension chains are linear; merging is how you get lattice-shaped composition. The merged `test` unions the fixtures with full typing preserved. Name collisions resolve last-wins, which is a real hazard between independently developed packages — worth a naming convention (prefix fixtures by package) in a multi-team setup. `mergeExpects` matters because custom matchers (`expect.extend`) also arrive from multiple sources — a visual-testing package and an API-schema package each ship matchers, and you want one `expect` carrying both. These APIs are what make "fixtures as shareable libraries" viable, which is the real interview point: they're the packaging story for test infrastructure.

**Code**

```ts
import { mergeTests, mergeExpects } from '@playwright/test';
import { test as authTest, expect as authExpect } from '@acme/pw-auth';
import { test as dataTest, expect as dataExpect } from '@acme/pw-data';

export const test = mergeTests(authTest, dataTest);
export const expect = mergeExpects(authExpect, dataExpect);
```

```ts
test('member checkout', async ({ memberPage, orderFactory }) => {
  // memberPage from @acme/pw-auth, orderFactory from @acme/pw-data
  const order = await orderFactory('ESP-1042');
  await memberPage.goto(`/orders/${order.id}`);
});
```

**Follow-ups & traps**
- "When merge vs chain?" — chain when you own both layers; merge when sets come from separate packages with no shared base.
- "What happens on fixture name collision?" — later argument wins, silently; naming discipline is the mitigation.
- Wrong answer: re-implementing another package's fixtures locally "to keep one chain" — duplication that merging exists to prevent.

**One-liner** — `mergeTests`/`mergeExpects` compose fixtures and matchers from unrelated packages into one `test`/`expect` — the packaging mechanism for shared test infrastructure.
