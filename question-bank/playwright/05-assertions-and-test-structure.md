# Assertions & Test Structure

Assertions are where Playwright's retry model shows up most visibly, and test structure is where the runner's worker model bites people who assume JUnit semantics. This file covers web-first assertions and their variants (soft, poll, toPass, custom matchers), the timeout hierarchy, hooks and their per-worker gotchas, test annotations, execution order, and the perennial "do assertions belong in page objects" debate.

- Q1. What are web-first assertions?
- Q2. toHaveText() vs toContainText()
- Q3. How do you verify URL, title, visibility, enabled/disabled, attribute, value, and count?
- Q4. What are soft assertions and when do you use them?
- Q5. What is expect.poll()?
- Q6. What is expect().toPass()?
- Q7. How do you write custom matchers with expect.extend()?
- Q8. Assertion timeout vs action timeout vs test timeout — the hierarchy
- Q9. What is test.describe() used for?
- Q10. beforeEach vs beforeAll — and the worker gotcha
- Q11. afterEach vs afterAll — and conditional cleanup with testInfo
- Q12. test.skip vs test.only vs test.fixme vs test.fail
- Q13. What is the execution order of Playwright tests?
- Q14. What is test.step() and why do senior candidates use it?
- Q15. Negating assertions — not.toBeVisible() vs toBeHidden()
- Q16. Where should assertions live — tests or page objects?

### Q1. What are web-first assertions?

**Interview answer** — Assertions on locators and pages — `toBeVisible`, `toHaveText`, `toHaveURL` — that don't check once and fail: they re-query the browser and re-evaluate until the condition passes or the assertion timeout (5s default) expires. That makes them synchronization points, not just checks — the assertion itself absorbs render delays. The contrast is `expect(value)` on plain JavaScript values, which is a one-shot Jest-style check with no retry, because there's nothing live to re-query.

**Deep dive** — The two forms are the core distinction to hold precisely: retrying matchers exist on `expect(locator)` and `expect(page)` (and `expect(apiResponse)`); generic matchers (`toBe`, `toEqual`, `toContain`) on extracted values never retry. This is why extracting first destroys the mechanism: `expect(await locator.textContent()).toBe('Shipped')` snapshots once — the await froze a moment in time — while `await expect(locator).toHaveText('Shipped')` keeps sampling as the app settles. Failures from retrying matchers include the received-value timeline, which turns "expected X got Y" into a visible progression of what the app did during the window. All retrying assertions are async and must be awaited — an unawaited one is a test that can pass before its assertion runs.

**Code**

```ts
// One-shot — races the render, no retry
expect(await page.getByTestId('order-status').textContent()).toBe('Shipped'); // anti-pattern

// Web-first — polls up to the assertion timeout
await expect(page.getByTestId('order-status')).toHaveText('Shipped');
await expect(page).toHaveTitle(/Order ORD-\d+/);
```

**Follow-ups & traps**
- "Which expects retry and which don't?" — Locator/page matchers retry; value matchers don't — asked verbatim in most interviews.
- "What enforces the awaits?" — Discipline plus lint (`no-floating-promises`); Playwright also warns on some unawaited assertions, but lint is the reliable guard.
- Trap: wrapping a web-first assertion in manual retry logic or preceding it with a sleep — both indicate the retry model wasn't understood.

**One-liner** — expect(locator) matchers poll the live browser until pass or timeout — assertion and wait in one — while expect(value) is a one-shot check on a dead snapshot.

### Q2. toHaveText() vs toContainText()

**Interview answer** — `toHaveText` asserts the element's full text matches — for a string that means exact equality after whitespace normalization; `toContainText` asserts the expected text appears somewhere within — substring semantics. I use toHaveText when the complete rendered text matters ("Total: $49.99") and toContainText when surrounding content is incidental or dynamic. Both take arrays against multi-element locators: toHaveText with an array asserts exact texts, full count, and order; toContainText's array form asserts the listed items appear in order but allows other elements between.

**Deep dive** — Details that surface in probing: normalization — both collapse whitespace and use the rendered (visible) text, so markup line breaks don't fail exact matches; regex — both accept regexes, which converts toHaveText into pattern-matching ("full text matches this shape") and is the standard answer for dynamic fragments like order numbers; the array forms are the hidden gem — a single retrying call replaces a loop of per-item assertions and additionally locks the count (toHaveText form) and order, which per-item loops silently don't. Related boundary: `toHaveValue` for inputs — text assertions read rendered text, not input values, a frequent beginner confusion.

**Code**

```ts
await expect(page.getByTestId('cart-total')).toHaveText('Total: $49.99');   // exact
await expect(page.getByRole('alert')).toContainText('payment declined');    // substring
await expect(page.getByTestId('order-id')).toHaveText(/^ORD-\d{6}$/);       // pattern

// Whole list in one retrying assertion: texts, count, and order
await expect(page.getByRole('listitem')).toHaveText(['Espresso', 'Grinder', 'Filters']);
```

**Follow-ups & traps**
- "Assert a list's contents — how?" — The array form; looping `nth(i)` assertions is the amateur version and misses count/order guarantees.
- "Why does toHaveText pass despite a `<br>` in the markup?" — Normalized rendered text; source whitespace is irrelevant.
- Trap: toHaveText on an `<input>` — inputs have value, not text; `toHaveValue` is the matcher.

**One-liner** — toHaveText is normalized-exact (or regex), toContainText is substring — and their array forms assert an entire list's texts, count, and order in one retrying call.

### Q3. How do you verify URL, title, visibility, enabled/disabled, attribute, value, and count?

**Interview answer** — Each has a dedicated retrying matcher: `toHaveURL` and `toHaveTitle` on the page; `toBeVisible`/`toBeHidden`, `toBeEnabled`/`toBeDisabled` on locators; `toHaveAttribute(name, value)` for attributes, `toHaveValue` for inputs, `toHaveCount` for match-set size. The principle: reach for the specific matcher rather than extracting a value and comparing — the specific matcher retries, and its failure message names exactly what diverged.

**Deep dive** — Rapid-fire map worth memorizing:

| Verify | Matcher |
| --- | --- |
| URL | `expect(page).toHaveURL(glob \| regex)` |
| Title | `expect(page).toHaveTitle(str \| regex)` |
| Visible / hidden | `toBeVisible()` / `toBeHidden()` |
| Enabled / disabled | `toBeEnabled()` / `toBeDisabled()` |
| Attribute | `toHaveAttribute('aria-expanded', 'true')` |
| Input value | `toHaveValue(str \| regex)` |
| Count | `toHaveCount(n)` |
| CSS property | `toHaveCSS('display', 'flex')` |
| Class | `toHaveClass(regex)` / `toContainClass('active')` |
| Focus | `toBeFocused()` |
| Checkbox state | `toBeChecked()` |

The anti-pattern every row replaces: `expect(await locator.getAttribute('x')).toBe('y')` — one-shot, race-prone, and with a generic failure message. Also useful: `toHaveAttribute` with just the name asserts presence; multi-select values use `toHaveValues`.

**Follow-ups & traps**
- "Assert a button is disabled — two ways, which is better?" — `toBeDisabled()` beats `toHaveAttribute('disabled', ...)`: it understands aria-disabled and inherited disabled state from fieldsets, not just the attribute.
- Trap: `expect(await page.title()).toBe(...)` — the extraction habit; every one of these has a retrying form and interviewers watch for it in live coding.

**One-liner** — There's a dedicated retrying matcher for every common check — toHaveURL/Title/Attribute/Value/Count, toBeVisible/Enabled/Checked — and extracting-then-comparing is always the worse version.

### Q4. What are soft assertions and when do you use them?

**Interview answer** — `expect.soft()` records a failure without throwing, so the test continues; at the end, any recorded soft failure still marks the test failed. I use them when one flow verifies several independent facts and I want the full picture from one run — verifying five fields of an order confirmation, where hard assertions would report only the first mismatch and hide the other four until the next run.

**Deep dive** — Soft failures accumulate on `testInfo.errors`, and every one is reported with its own stack and received values. The discipline is scope: soft is for independent verifications, never for preconditions — a soft assertion on "logged in successfully" lets the test continue into a meaningless cascade of failures, all noise. Rule of thumb: if later steps depend on it, hard; if it's one item in a checklist of outcomes, soft is a candidate. You can also gate mid-test: `expect(test.info().errors).toHaveLength(0)` converts accumulated soft failures into a hard stop at a chosen point.

**Code**

```ts
await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible(); // hard: gate

// Independent facts — collect all failures in one run
await expect.soft(page.getByTestId('order-id')).toHaveText(/^ORD-\d{6}$/);
await expect.soft(page.getByTestId('delivery-eta')).toContainText('3–5 business days');
await expect.soft(page.getByTestId('total')).toHaveText('$49.99');
await expect.soft(page.getByTestId('shipping-address')).toContainText('Lisbon');
```

**Follow-ups & traps**
- "Does a soft failure fail the test?" — Yes, at the end — soft defers, it doesn't forgive. A surprisingly common misconception.
- "Soft assert the login, then test the dashboard?" — No — dependency means hard; the cascade of nonsense failures is the trap being probed.
- Trap: softening everything to "make suites more informative" — it removes the fail-fast property that keeps failures cheap and diagnosable.

**One-liner** — expect.soft records instead of throwing and fails the test at the end — use it for independent checklist facts, never for anything later steps depend on.

### Q5. What is expect.poll()?

**Interview answer** — `expect.poll(fn)` repeatedly evaluates an arbitrary async function until the returned value satisfies the matcher or a timeout hits — it brings web-first retry semantics to things that aren't locators. The canonical case is backend state: poll an API until a job status flips to "processed" after a UI action, without sleeping or hand-rolling a retry loop.

**Deep dive** — Signature knowledge: the function's return value feeds ordinary generic matchers (`toBe`, `toEqual`, `toBeGreaterThan`), with options for `timeout` and custom polling `intervals` (e.g. `[1000, 2000, 5000]` backoff), plus a `message` for failure clarity. It fills the gap between locator assertions (retry, but DOM-only) and generic expects (any value, but one-shot). Distinction from `toPass()`: poll retries a value-producing function against one matcher; toPass retries a block that itself contains assertions — poll for "eventually this value", toPass for "eventually this group of checks".

**Code**

```ts
// UI action → async backend processing → verify via API
await page.getByRole('button', { name: 'Export orders' }).click();

await expect.poll(async () => {
  const res = await request.get('/api/exports/latest');
  return (await res.json()).status;
}, {
  message: 'export job should complete',
  timeout: 30_000,
  intervals: [1000, 2000, 5000],
}).toBe('completed');
```

**Follow-ups & traps**
- "Why not a while-loop with a sleep?" — poll gives bounded timeout, backoff intervals, and a proper assertion failure with the last value — hand-rolled loops reinvent it worse.
- "Poll a locator's text?" — Use `toHaveText` — poll is for non-locator values; using it where a web-first matcher exists is a smell.
- Trap: unbounded polling logic in tests — interviewers read hand-rolled retry loops as not knowing this API.

**One-liner** — expect.poll retries an arbitrary async value until a matcher passes — web-first semantics for API status, queue depth, or anything that isn't a locator.

### Q6. What is expect().toPass()?

**Interview answer** — `toPass()` retries a whole block of code until every assertion inside it passes or the timeout expires: `await expect(async () => { ...assertions... }).toPass()`. It's for multi-step or interdependent checks that must be evaluated together and might transiently disagree — like reading two UI values that update asynchronously and asserting a relationship between them.

**Deep dive** — The block re-executes fully on each attempt, so it must be idempotent — no side effects like clicks inside a toPass block, or retries compound the action (the classic misuse: retrying a click-and-check block double-submits an order). Options mirror poll: `timeout` and `intervals`. Placement in the retry toolbox: locator matcher for one live condition; poll for one derived value; toPass for a compound read-and-assert unit. It's also the pragmatic wrapper when a check needs several extractions that must be mutually consistent — extract both inside the block, assert inside the block, and transient inconsistency retries away.

**Code**

```ts
// Cart badge and cart panel update on different ticks — assert consistency
await expect(async () => {
  const badge = Number(await page.getByTestId('cart-badge').textContent());
  const rows = await page.getByTestId('cart-panel').getByRole('listitem').count();
  expect(badge).toBe(rows);
}).toPass({ timeout: 10_000 });
```

**Follow-ups & traps**
- "Can I put the click inside toPass so it retries the action?" — No — re-execution repeats side effects; toPass blocks must be read-only. The key probe.
- "toPass vs test retries?" — toPass retries a check within a running test in milliseconds; a retry re-runs the entire test in a fresh context — different granularity, different cost.
- Trap: wrapping a single locator assertion in toPass — redundant; the matcher already retries.

**One-liner** — toPass retries a side-effect-free block of assertions as a unit — for compound or interdependent checks; never put actions inside it.

### Q7. How do you write custom matchers with expect.extend()?

**Interview answer** — `expect.extend({ matcherName })` registers matchers that then chain like built-ins. A matcher receives the subject and arguments, returns `{ pass, message }`, and — the useful part — can await async work and use `this.isNot` for negation support. I use them to give domain assertions a name: `toBeConfirmedOrder(orderPage)` reads in review like a requirement, and its failure message speaks the domain instead of raw comparisons.

**Deep dive** — Wiring: define matchers in a shared module, merge via `mergeExpects` if composing several sources, and declare TypeScript types so autocomplete and type-checking work. Inside a matcher you can call other expects or poll — matchers wrapping web-first assertions inherit their retry behavior. The design bar: a custom matcher pays for itself when the same multi-part verification appears across many tests or when failure messages need domain language; a matcher used once is indirection. It's also a lighter-weight alternative to assertion-bearing page-object methods — the assertion logic is centralized but still visibly an expect at the call site.

**Code**

```ts
// fixtures/matchers.ts
import { expect as base, Locator } from '@playwright/test';

export const expect = base.extend({
  async toShowPrice(locator: Locator, expected: string) {
    try {
      await base(locator).toHaveText(new RegExp(`\\$${expected.replace('.', '\\.')}`));
      return { pass: true, message: () => `expected not to show price $${expected}` };
    } catch {
      return {
        pass: false,
        message: () => `expected ${locator} to show price $${expected}, got "${await locator.textContent()}"`,
      };
    }
  },
});

// in a test:  await expect(page.getByTestId('total')).toShowPrice('49.99');
```

**Follow-ups & traps**
- "When is a custom matcher worth it vs a helper function?" — When call-site readability and failure messages matter and reuse is real; a helper returning boolean loses both. Judgment question.
- "Do custom matchers retry?" — Only if they delegate to retrying assertions or poll internally — nothing is free.
- Trap: not mentioning the TypeScript declaration — untyped custom matchers break the DX that justifies them.

**One-liner** — expect.extend registers domain-named, optionally async matchers with real failure messages — worth it when a multi-part verification recurs and should read like a requirement.

### Q8. Assertion timeout vs action timeout vs test timeout — the hierarchy

**Interview answer** — Three nested budgets. Test timeout — 30s default — caps the whole test including hooks and fixtures. Inside it, each action (click, fill) gets the action timeout, and each web-first assertion gets the expect timeout — 5s default; action timeout defaults to unlimited-within-the-test unless configured. Overrides go from global to surgical: config for suite-wide, `test.setTimeout()` or `test.slow()` per test, `{ timeout }` per individual action or assertion — and the craft is overriding at the narrowest scope that solves the problem.

**Deep dive** — Configuration map: `timeout` (test) and `expect.timeout` at config top level, `actionTimeout` and `navigationTimeout` under `use`; per-call `{ timeout }` on actions and assertions; `test.slow()` triples the test timeout and reads as intent ("this flow is known-heavy"). The interaction that catches people: a per-assertion 20s override inside a test that has already spent 15s still dies at the 30s test cap — inner budgets live inside the outer one. Timeouts price failures, not successes: polling returns on the instant of truth, so raising a timeout never slows passing tests — it slows every failure, which is why global inflation degrades the suite's feedback loop while a targeted override costs almost nothing.

**Code**

```ts
// playwright.config.ts
export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: { actionTimeout: 10_000, navigationTimeout: 15_000 },
});

// Surgical overrides where reality demands it
test('slow settlement flow', async ({ page }) => {
  test.slow(); // 90s budget for this test only
  await expect(page.getByTestId('settlement-status'))
    .toHaveText('Settled', { timeout: 25_000 });
});
```

**Follow-ups & traps**
- "Assertion timeout 20s, test timeout 30s, test already used 15s — what happens?" — Test timeout wins at 30s; the hierarchy question in concrete form.
- "Why not set test timeout to 5 minutes and stop thinking about it?" — Every hung failure now costs 5 minutes × retries × parallel occurrences — CI time and feedback latency; the reasoning is the answer.
- Trap: not knowing expect timeout is separate from action timeout — many candidates conflate them into one "wait setting."

**One-liner** — Test timeout ⊃ action timeout and expect timeout; override at the narrowest scope — timeouts bound failure cost, so global inflation taxes every failure while targeted overrides are nearly free.

### Q9. What is test.describe() used for?

**Interview answer** — Grouping related tests under a shared title, with the group as the scope for shared hooks, per-group `use` overrides, tags and annotations, and execution-mode settings like `test.describe.configure({ mode: 'serial' })`. Group titles prefix test titles in reports and grep matching, so describes also shape reporting and filtering.

**Deep dive** — Scoping is the substance: `beforeEach` inside a describe applies to that group only; nested describes compose hooks outer-first; `test.use({ ... })` inside a describe reconfigures fixtures (viewport, storageState, locale) for that group alone — which is the idiomatic way to run a subset as, say, a mobile viewport or a logged-out user without a separate file. Variants worth naming: `describe.only`/`skip`/`fixme` cascade to contents; `describe.configure({ mode })` sets parallel/serial/default per group; `describe` with `{ tag }` tags everything inside. Describes are optional — flat files are fine when no scoping is needed; empty ceremony describes are noise.

**Code**

```ts
test.describe('checkout as guest', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // logged-out for this group only

  test.beforeEach(async ({ page }) => { await page.goto('/checkout'); });

  test('requires email before payment', async ({ page }) => { /* ... */ });
  test('shows guest shipping options', async ({ page }) => { /* ... */ });
});
```

**Follow-ups & traps**
- "Run one group with a different viewport?" — `test.use` inside the describe — the follow-up that checks you know describes scope fixtures, not just titles.
- Trap: assuming describe creates shared state between its tests — isolation is unchanged; each test still gets a fresh context.

**One-liner** — describe groups tests and scopes hooks, fixture overrides (test.use), tags, and execution mode — structure and configuration, not shared state.

### Q10. beforeEach vs beforeAll — and the worker gotcha

**Interview answer** — `beforeEach` runs before every test with access to that test's fresh fixtures — the right place for per-test setup like navigation. `beforeAll` runs once per worker process, not once globally: with four workers running a file's tests, beforeAll executes up to four times, and after a retry or worker crash it runs again in the replacement worker. So beforeAll can't hold per-test state, and anything it creates must be safe to create multiple times.

**Deep dive** — The gotcha is a direct consequence of the process model: workers are separate OS processes with no shared memory, so "once" can only ever mean once-per-process. beforeAll also can't use test-scoped fixtures like `page` (there's no test yet) — worker-scoped fixtures only. Legitimate beforeAll uses: expensive per-worker resources — a DB connection pool, a seeded dataset keyed by worker index (`testInfo.workerIndex` for collision-free parallel data). For genuinely-once-globally setup, the right tools are project dependencies (a `setup` project other projects depend on — reportable, traceable) or `globalSetup` (runs in a separate process before everything, outside fixtures and tracing). The auth-storageState pattern is the canonical genuinely-once example.

**Code**

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/orders');            // per-test, fresh context each time
});

test.beforeAll(async ({}, workerInfo) => {
  // Runs once PER WORKER — must be re-runnable and worker-safe
  await seedOrders(`worker-${workerInfo.workerIndex}`);
});
```

**Follow-ups & traps**
- "beforeAll logs appeared 4 times — bug?" — No: 4 workers; the exact scenario interviewers construct.
- "Log in once for the whole suite — beforeAll?" — No: setup project + storageState; beforeAll would log in per worker and couple tests to shared mutable session state.
- Trap: storing a `page` created in beforeAll and reusing it across tests — breaks isolation and fights the fixture model; a red flag in code review and interviews alike.

**One-liner** — beforeEach is per-test with fresh fixtures; beforeAll is once per WORKER — re-runnable, worker-scoped-fixtures only — and "once globally" belongs to setup projects or globalSetup.

### Q11. afterEach vs afterAll — and conditional cleanup with testInfo

**Interview answer** — `afterEach` runs after every test and — the valuable part — can read the outcome via `testInfo.status`, enabling conditional behavior: extra diagnostics or artifact capture on failure, cleanup of created data on success. `afterAll` mirrors beforeAll — once per worker — for tearing down per-worker resources. Comparing `testInfo.status` to `testInfo.expectedStatus` is the precise "did it fail" check, since for a `test.fail()`-marked test, failing is the expected outcome.

**Deep dive** — `testInfo` in afterEach exposes status, expectedStatus, retry number, duration, errors, and `attach()` for adding artifacts to the report — an afterEach that attaches app-state JSON on failure is a genuinely useful pattern (failure screenshots themselves are better left to `screenshot: 'only-on-failure'` config). For resource cleanup, though, the stronger pattern than afterEach is custom fixtures: teardown after the yield is guaranteed, coupled to the resource's creation, and composable — afterEach cleanup is disconnected from setup and easy to orphan when tests move files. Cleanup should also be defensive about partial failures: a test that died mid-flow may not have created what afterEach assumes exists.

**Code**

```ts
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await testInfo.attach('app-state', {
      body: await page.evaluate(() => JSON.stringify(window.localStorage)),
      contentType: 'application/json',
    });
  }
});

test.afterAll(async ({}, workerInfo) => {
  await purgeSeededOrders(`worker-${workerInfo.workerIndex}`);
});
```

**Follow-ups & traps**
- "Screenshot on failure — afterEach?" — Config option `screenshot: 'only-on-failure'` first; hand-rolled afterEach is the fallback answer that signals not knowing the platform.
- "Why status !== expectedStatus instead of status === 'failed'?" — test.fail() tests expect failure; the strict comparison handles them correctly — a detail that reads senior.
- Trap: relying on afterAll for critical cleanup — a crashed worker skips it; external cleanup (dedicated teardown project, TTL-based test data) is the robust layer.

**One-liner** — afterEach + testInfo.status (vs expectedStatus) enables on-failure diagnostics and conditional cleanup; afterAll is per-worker teardown — and fixtures beat hooks for resource lifecycles.

### Q12. test.skip vs test.only vs test.fixme vs test.fail

**Interview answer** — `skip`: don't run, report as skipped — for tests inapplicable in some condition. `only`: run just these — a local development filter that must never reach CI. `fixme`: don't run, marked as needing repair — the honest quarantine for broken tests. `fail`: run the test and expect it to fail — the counterintuitive one: it documents a known bug, and the test goes red when the bug is fixed, forcing you to remove the marker. All support conditional forms — `test.skip(condition, reason)` inside the body — for browser- or environment-dependent applicability.

**Deep dive** — skip vs fixme is intent taxonomy: skip says "not applicable," fixme says "broken, owed a fix" — reports distinguish them, so a growing fixme count is visible debt while skips are legitimate. fail's mechanism is inversion: pass becomes fail ("expected failure but passed"), which is what makes it self-cleaning bug documentation — unlike a skipped test, it keeps executing the repro path and notifies you the moment behavior changes. Conditional annotations take `({ browserName })` context: `test.skip(browserName === 'webkit', 'video codecs unavailable')`. CI protection for only is `forbidOnly: !!process.env.CI`. There's also `test.slow()` in the same family — not a skip, a 3× timeout grant.

**Code**

```ts
test.skip(({ browserName }) => browserName === 'webkit', 'DRM unsupported in WebKit build');

test.fixme('coupon stacking miscalculates total', async ({ page }) => { /* flaky, JIRA-812 */ });

test.fail('known: refund shows stale total until reload — BUG-1042', async ({ page }) => {
  await page.getByRole('button', { name: 'Refund order' }).click();
  await expect(page.getByTestId('order-total')).toHaveText('$0.00'); // fails today, by design
});
```

**Follow-ups & traps**
- "What happens when a test.fail test passes?" — The run fails with "expected to fail" — the mechanism most candidates get backwards; this is the sharpest probe in the set.
- "skip or fixme for a flaky test?" — fixme: it's broken, not inapplicable — taxonomy matters for debt visibility.
- Trap: describing test.fail as "marks the test as failed" or as a skip variant — it runs the test; inversion is the whole point.

**One-liner** — skip = not applicable, only = local filter (forbidOnly on CI), fixme = quarantined debt, fail = executable bug documentation that goes red when the bug is fixed.

### Q13. What is the execution order of Playwright tests?

**Interview answer** — Files run in parallel across workers with no guaranteed cross-file order — never build dependencies between files. Within one file, by default, tests run in declaration order in a single worker. With `fullyParallel: true`, even same-file tests distribute across workers, and any intra-file ordering disappears too. The design intent: order is an implementation detail; every test must stand alone.

**Deep dive** — The scheduling model: the runner partitions tests into groups (per file by default), workers pull groups; `fullyParallel` (global or per-describe via `configure({ mode: 'parallel' })`) makes individual tests schedulable units. `mode: 'serial'` is the explicit opposite — tests in the group run in order, a failure skips the remainder, and retries re-run the whole group; legitimate for genuinely sequential multi-step flows, but it couples tests and is a smell when used to share state for speed (storageState and fixtures are the right speed tools). Sharding (`--shard=2/4`) splits the same scheduling across machines. Alphabetical file ordering exists as a default listing detail, but any answer that relies on file naming for order dependence is the wrong answer.

**Follow-ups & traps**
- "Test B needs the order created by test A — how do you order them?" — You don't: either one test with test.step boundaries, serial mode if truly one flow, or best — make B create its own order via API setup. The design answer beats the mechanism answer.
- "What changes when you flip on fullyParallel?" — Order-dependent same-file tests start failing intermittently — flushing out exactly the hidden coupling the flag exists to prevent.
- Trap: "tests run alphabetically" as the model — cross-file order is explicitly not guaranteed under parallelism.

**One-liner** — Parallel across files, declaration order within a file by default, no order anywhere under fullyParallel — so write every test as if it runs first, alone, on a fresh worker.

### Q14. What is test.step() and why do senior candidates use it?

**Interview answer** — `test.step('name', async () => {...})` wraps a chunk of a test as a named step that shows up hierarchically in reports and traces — so a failed checkout test reads "failed in 'Apply discount code'" with the error nested inside, instead of a bare locator error at line 47. In long flows it converts debugging from re-reading test code to reading the report. It also nests, returns values, and integrates with the trace viewer's timeline.

**Deep dive** — Steps are reporting structure, not behavior — no retry or isolation semantics — which is precisely why they're cheap to adopt. The senior rationale: failure triage cost dominates suite cost at scale, and steps cut it by localizing failures to named business actions; they also give traces navigable structure and make reports readable by non-authors (manual QA, developers on rotation). Idiomatic combo: page-object methods wrap their own bodies in test.step, so every test using the method gets structured reporting for free. Also worth knowing: `{ box: true }` collapses a step's internals in reports — presenting a helper as a single opaque action — and step names should be business-language ("Submit payment"), not restated code ("click button").

**Code**

```ts
test('guest checkout end to end', async ({ page }) => {
  await test.step('Add espresso machine to cart', async () => {
    await page.goto('/products/espresso-machine');
    await page.getByRole('button', { name: 'Add to cart' }).click();
  });

  const orderId = await test.step('Complete payment', async () => {
    await page.getByRole('link', { name: 'Checkout' }).click();
    await page.getByLabel('Card number').fill('4242 4242 4242 4242');
    await page.getByRole('button', { name: 'Pay now' }).click();
    return page.getByTestId('order-id').textContent();     // steps return values
  });

  await test.step(`Verify order ${orderId} in history`, async () => {
    await page.goto('/orders');
    await expect(page.getByRole('row', { name: orderId! })).toBeVisible();
  });
});
```

**Follow-ups & traps**
- "Does a failing step stop the test?" — The error propagates like any thrown error — steps add structure, not error-handling semantics.
- "Steps vs comments?" — Comments are invisible at triage time; steps appear in the report and trace where failures are actually investigated.
- Trap: step-wrapping every single line — structure at the business-action grain informs; at the statement grain it's noise.

**One-liner** — test.step names business actions in reports and traces so failures localize themselves — zero behavior change, major triage payoff, and page-object methods should emit them for free.

### Q15. Negating assertions — not.toBeVisible() vs toBeHidden()

**Interview answer** — Any matcher negates via `.not` — `not.toHaveText`, `not.toBeChecked` — and it retries like the positive form: polls until the condition becomes false or times out. For visibility specifically, `not.toBeVisible()` and `toBeHidden()` are equivalent in the way that matters: both pass when the element is invisible or doesn't exist at all. The real trap in this area is neighboring API: locator `waitFor({ state: 'hidden' })` vs `'detached'` distinguishes invisible-but-in-DOM from removed — and `isHidden()` returns instantly without retrying, so it's not a synchronization tool.

**Deep dive** — The "or doesn't exist" semantics are the load-bearing detail: asserting a toast disappeared shouldn't depend on whether the app hides it (`display:none`) or unmounts it — both negated-visibility forms treat absence as hidden, so the assertion survives implementation changes in how the element leaves. When the distinction is the point — e.g., asserting a component fully unmounted, not just hidden — `waitFor({ state: 'detached' })` or `toHaveCount(0)` says it precisely. Negation timing nuance: `not` assertions pass at the first poll where the condition is false — asserting `not.toBeVisible` on something that hasn't appeared yet passes instantly, which can mask a wrong-locator bug; assert the appearance first when the sequence matters (toast appears, then disappears).

**Code**

```ts
const toast = page.getByRole('status').filter({ hasText: 'Order placed' });
await expect(toast).toBeVisible();      // it actually appeared (guards against wrong locator)
await expect(toast).toBeHidden();       // gone — hidden OR removed both pass

await page.getByTestId('upload-modal').waitFor({ state: 'detached' }); // specifically unmounted
```

**Follow-ups & traps**
- "not.toBeVisible passed — is the element hidden or absent?" — Unknown, by design; if the difference matters, detached/toHaveCount(0) is the precise tool.
- "Why did not.toBeVisible pass immediately when the toast never showed?" — A never-matching locator satisfies non-visibility trivially — assert appearance first; the subtle bug interviewers love.
- Trap: `expect(await locator.isHidden()).toBe(true)` — instant snapshot, no retry — the extraction anti-pattern in negative clothing.

**One-liner** — .not negates any retrying matcher; not.toBeVisible and toBeHidden both accept hidden-or-absent — assert the appearance first, and use detached when unmounting specifically is the claim.

### Q16. Where should assertions live — tests or page objects?

**Interview answer** — My default: actions and locators in page objects, assertions in tests — the test then reads as scenario-plus-expectations, each test states its own intent, and page objects stay reusable across tests that expect different outcomes from the same action. The defensible exception: highly repeated verification bundles as clearly named `expectX` methods on the page object — `orderPage.expectConfirmed(orderId)` — using web-first assertions inside, named as assertions so the call site still reads as a check. What I avoid is verification hidden inside action methods, where a `login()` silently asserts success and every consumer inherits an expectation it didn't state.

**Deep dive** — The classical POM rule (no assertions in page objects) exists for separation of concerns: page objects model "what you can do here," tests own "what should be true." The modern counter-argument is DRY on multi-part verifications — five assertions duplicated across twenty tests are a real maintenance cost, and an expect-method centralizes them exactly like custom matchers do; Playwright's own docs show assertion-bearing page object methods, so appeals to authority cut both ways. The synthesis interviewers reward: the boundary isn't "no expects in page objects," it's explicitness — verification methods are fine when named as verifications and composed of retrying assertions; implicit asserts inside actions are the genuine anti-pattern because they hide expectations and fire where no one stated them. Alternatives on the same axis: custom matchers (Q7) and fixture-provided assertion helpers achieve the centralization with even clearer call sites.

**Code**

```ts
export class OrderPage {
  constructor(private page: Page) {}
  readonly status = () => this.page.getByTestId('order-status');

  async cancelOrder() {                       // action: no hidden asserts
    await this.page.getByRole('button', { name: 'Cancel order' }).click();
  }

  async expectCancelled(orderId: string) {    // verification: named as one
    await expect(this.status()).toHaveText('Cancelled');
    await expect(this.page.getByRole('row', { name: orderId })).toContainText('Refund pending');
  }
}

// test — intent visible at the call site:
await orderPage.cancelOrder();
await orderPage.expectCancelled('ORD-1042');
```

**Follow-ups & traps**
- "Strictly no assertions in page objects — agree?" — Present both positions and land on the explicitness boundary; dogmatic answers in either direction read as recited rather than reasoned.
- "What's actually wrong with login() asserting success internally?" — Consumers can't test failed login through the same method, and failures fire from inside an action nobody reads as a check — the concrete harm, not just "it violates POM."
- Trap: assertion-free tests where every check hides in page objects — the test body becomes an opaque script of method calls; the reader can't see what's being claimed.

**Senior/lead angle** — Whatever position you take, take it as a written team convention with examples — the expensive outcome isn't either policy, it's a suite where every author decided differently and readers can't predict where expectations live.

**One-liner** — Default: actions in page objects, assertions in tests; explicit expect-named verification methods are a fair exception — the true anti-pattern is assertions hiding inside actions.
