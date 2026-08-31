# Async/Await, Promises, and the Event Loop

This is the #1 source of TypeScript cross-questions in Playwright interviews: every Playwright API returns a promise, so interviewers probe whether you actually understand what `await` does, what happens when you forget it, and how concurrency works on a single thread. Shallow answers here end interviews; these questions cover the model from the event loop up to typed async utilities.

- Q1. How does JavaScript/Node run async code on a single thread?
- Q2. What is a Promise? The three states.
- Q3. Callbacks vs Promises vs async/await
- Q4. What does `await` actually do?
- Q5. What happens if you forget `await` on `page.click()`?
- Q6. `Promise.all` vs `allSettled` vs `race` vs `any` (and the popup pattern)
- Q7. Sequential vs parallel awaits
- Q8. The `forEach(async ...)` trap
- Q9. Error handling in async code
- Q10. Microtasks vs macrotasks
- Q11. Why `expect()` web-first assertions still need `await`
- Q12. Async fixtures and hooks
- Q13. Writing typed async utilities: `waitUntil` and `retry`
- Q14. Top-level await in global setup

### Q1. How does JavaScript/Node run async code on a single thread?

**Interview answer** — JavaScript executes on one thread with a call stack, and concurrency comes from the event loop: slow operations like network calls are handed off to the runtime, and when they complete, their callbacks are queued. The event loop runs queued callbacks only when the call stack is empty, draining the microtask queue (promise callbacks) completely between tasks. So nothing runs "in parallel" in your code — async is about not blocking while waiting, which is exactly what a Playwright test does while the browser works.

**Deep dive**

- Components: call stack (currently executing frames), the host environment doing real I/O (libuv thread pool / OS async I/O in Node), the macrotask queue (timers, I/O callbacks), and the microtask queue (promise reactions, `queueMicrotask`).
- Loop rule: run one macrotask → drain all microtasks → render/next macrotask. Microtasks scheduled during microtask processing run in the same drain — an infinite microtask chain starves timers.
- Playwright mapping: `page.click()` sends a protocol message to the browser process; Node is free while the browser acts; the response resolves the promise, queueing your continuation as a microtask.
- A `while(true)` in test code blocks the loop — no promise can resolve, so awaited Playwright calls appear "hung" until timeout. This is why polling must yield (see Q13).

**Follow-ups & traps**

- Trap: "Node is multithreaded because of async" — the JS you write runs on one thread; libuv's pool serves some I/O, and worker_threads are explicit and separate.
- Follow-up: "Where does Playwright's parallelism come from then?" — separate worker processes, not threads inside one Node process.
- Follow-up: "What executes first: `setTimeout(fn, 0)` or a resolved promise's `.then`?" — the `.then` (microtask) — see Q10.

**One-liner** — One thread, one call stack; async work is delegated and its continuations queue up, with promise microtasks always cutting in line ahead of timers.

### Q2. What is a Promise? The three states.

**Interview answer** — A promise is an object representing a value that will arrive later — the eventual result of an async operation. It's in exactly one of three states: pending, fulfilled with a value, or rejected with a reason; once settled it never changes state again. Every Playwright action — `page.goto()`, `locator.click()`, `response.json()` — hands you a promise, and the test only makes progress when those settle.

**Deep dive**

- Settled is final: attaching `.then` to an already-fulfilled promise still works — the callback is queued as a microtask with the stored value. This is why "did I subscribe too late?" is never a problem, unlike events.
- Typed as `Promise<T>`: `page.title()` is `Promise<string>`; `locator.click()` is `Promise<void>`. The rejection reason is untyped (`any`/`unknown`) — TypeScript cannot type errors in the promise channel.
- Chaining: `.then` returns a new promise; returning a promise inside `.then` flattens (no `Promise<Promise<T>>` in the chain), mirroring `Awaited<T>` at the type level.
- Creation: mostly you consume promises; you create them via `new Promise(executor)` when wrapping callback/event APIs, or `Promise.resolve/reject` in stubs.

```ts
function waitForEventOnce<T>(emitter: NodeJS.EventEmitter, event: string): Promise<T> {
  return new Promise<T>((resolve) => emitter.once(event, resolve));
}
```

**Follow-ups & traps**

- Follow-up: "Can a promise resolve twice?" — no; later `resolve`/`reject` calls are ignored.
- Trap: confusing "resolved" with "fulfilled" — a promise resolved with another promise adopts its state and can still reject; fulfilled specifically means settled-with-value.
- Follow-up: "How do you check state?" — you can't synchronously; that's by design — you subscribe with `.then`/`await`.

**One-liner** — A promise is a one-shot, single-owner container for a future value: pending, then permanently fulfilled or rejected.

### Q3. Callbacks vs Promises vs async/await

**Interview answer** — Callbacks were the original model — pass a function to run on completion — but nesting them produces the pyramid of doom and scatters error handling. Promises linearized that into chains with unified `.catch`, and made async results first-class values you can store, pass, and combine. Async/await is syntax on top of promises that makes async code read like synchronous code with real `try/catch` — which is why every Playwright test is an async function.

**Deep dive**

- Callback problems: inversion of control (the callee decides if/when/how often your callback runs), no composability, `if (err)` at every level.
- Promise wins: return values instead of continuation-passing; combinators (`all`, `race`); one `.catch` per chain; guaranteed asynchrony of reactions.
- async/await wins over raw `.then`: loops and conditionals with awaits are natural (`for` over test data with an await per iteration is painful as a chain), stack traces are more readable, `try/catch/finally` covers cleanup.
- They're the same machinery: an async function returns a promise; you can `.then` it, and you can `await` a hand-rolled promise. Old callback APIs bridge in via `new Promise` or `util.promisify`.

```ts
// The same flow, three eras — seeding an order then opening it
// 1) callback style (legacy client)
seedOrder(order, (err, id) => {
  if (err) return done(err);
  openOrderPage(id, (err2) => done(err2));
});

// 2) promise chain
seedOrder(order).then((id) => openOrderPage(id)).catch(handle);

// 3) async/await — what your Playwright tests look like
const id = await seedOrder(order);
await openOrderPage(id);
```

**Follow-ups & traps**

- Trap: "async/await replaces promises" — it *is* promises; `await` needs a thenable and combinators still require `Promise.all`.
- Follow-up: "When would you still use `.then`?" — one-off fire-and-forget with `.catch`, or attaching handlers where you can't be `async` (rare in test code).
- Follow-up: "How do you convert a callback API?" — wrap in `new Promise` / `util.promisify`; be ready to sketch it.

**One-liner** — Callbacks hand control away, promises make results values, async/await makes those values read synchronously — one model, better ergonomics each step.

### Q4. What does `await` actually do?

**Interview answer** — `await` suspends the enclosing async function until the awaited promise settles: fulfilled resumes with the value, rejected throws at the `await` line. It's syntactic sugar over `.then` — the rest of the function becomes the continuation, scheduled as a microtask. Critically, it suspends only that one function, not the thread: the event loop keeps running everything else, which is exactly why two tests in one worker file interleave safely at await points.

**Deep dive**

- Desugaring intuition: everything after `await p` behaves like the callback in `p.then(rest)`; `try/catch` around it maps to `.then(ok, err)` semantics.
- Even `await` on a resolved value yields: the continuation goes through the microtask queue, so an async function never runs its post-await code synchronously. `await 42` works — non-thenables are wrapped via `Promise.resolve`.
- The async function itself returns a promise immediately at its first suspension; callers see `Promise<T>` regardless of `return` type inside.
- Playwright consequence: between your `await page.click()` and the next line, other queued work can run — your test function is cooperative, not atomic.

```ts
async function login(page: Page, user: string, pass: string): Promise<void> {
  await page.goto('/login');            // suspend until navigation commits
  await page.getByLabel('Username').fill(user);
  await page.getByLabel('Password').fill(pass);
  await page.getByRole('button', { name: 'Sign in' }).click();
} // returns Promise<void>; caller must await it too
```

**Follow-ups & traps**

- Follow-up: "What does `await` do with a rejected promise?" — throws the rejection reason inside the function, catchable with `try/catch`.
- Trap: "await blocks the thread" — it suspends one function; the loop continues. The opposite error also appears: assuming awaited code can be preempted mid-statement — it yields only at awaits.
- Follow-up: "Is `return await p` different from `return p`?" — inside `try/catch`, yes: only `return await` lets the catch see the rejection (and it improves stack traces).

**One-liner** — `await` parks the current async function until the promise settles — value in, or throw — while the event loop keeps everything else moving.

### Q5. THE CLASSIC: What happens if you forget `await` on a Playwright call like `page.click()`?

**Interview answer** — The click still starts — Playwright begins the action immediately — but your test doesn't wait for it, so the next line races the click. You get flaky failures, assertions that check the page before the click landed, and worst case a false pass: the test ends "green" while the promise is still pending. If that floating promise later rejects, it becomes an unhandled rejection that can fail an unrelated test or crash the worker. The guardrail is `@typescript-eslint/no-floating-promises`, which makes an unawaited promise a lint error.

**Deep dive**

- `page.click()` returns `Promise<void>`; without `await` nothing consumes it — a *floating promise*. TypeScript alone doesn't complain: discarding a value is legal.
- Failure modes, in order of nastiness:
  - Race: the next action/assertion runs against pre-click state → intermittent failures that "pass on retry".
  - False positive: test function returns; the runner marks it passed while the click is unresolved. The last assertion never effectively ran.
  - Unhandled rejection: the floating click times out *after* the test ended; Playwright surfaces it as a teardown-time error or it hits another test's window — misattributed failures.
- Detection & prevention: `no-floating-promises` + `no-misused-promises` on test code; Playwright also warns for some unawaited async assertion patterns, but lint is the systematic net. `void somePromise` is the explicit opt-out where intentional.

```ts
// Bug: three races in three lines
test('submit order — flaky version', async ({ page }) => {
  page.goto('/checkout');                                   // navigation not awaited
  page.getByRole('button', { name: 'Place order' }).click(); // click not awaited
  await expect(page.getByText('Order confirmed')).toBeVisible(); // may run before either
});
```

```json
// .eslintrc — the non-negotiable rule for Playwright repos
{ "rules": { "@typescript-eslint/no-floating-promises": "error" } }
```

**Follow-ups & traps**

- Follow-up: "Why can the test still pass?" — the runner awaits your test function's promise; work not chained into it is invisible to the pass/fail decision.
- Follow-up: "Are there Playwright calls you intentionally don't await immediately?" — yes: event waiters started before the triggering action (`waitForEvent('popup')`, `waitForResponse`) — awaited later via `Promise.all` (Q6). The promise is still consumed, just later.
- Trap: fixing flakiness with `waitForTimeout` sleeps instead of finding the missing `await`.
- Trap: `expect(locator).toBeVisible()` without `await` — web-first assertions return promises too (Q11).

**Senior/lead angle** — This is a process answer, not a vigilance answer: lint rule at error level in CI, plus code review culture where any bare Playwright call is rejected — humans don't reliably spot missing awaits.

**One-liner** — A missing `await` makes the action race your test, invites false passes and stray rejections — `no-floating-promises` is the mandatory safety net.

### Q6. `Promise.all` vs `allSettled` vs `race` vs `any` — and the popup pattern

**Interview answer** — `Promise.all` waits for all promises and rejects fast on the first failure; `allSettled` always waits for all and reports each outcome; `race` settles with whichever settles first, success or failure; `any` resolves with the first fulfillment and rejects only if all fail. The Playwright signature move is `Promise.all` for correlated event-plus-action: start `page.waitForEvent('popup')` *before* the click that opens it, then await both together — start listening first, or you can miss the event.

**Deep dive**

- Types: `Promise.all` on a tuple preserves per-element types — `const [popup] = await Promise.all([p1, p2])` gives `popup: Page`. `allSettled` yields `{status: 'fulfilled', value} | {status: 'rejected', reason}` objects — narrow on `status`.
- Why the ordering matters: if you `await click()` first and *then* call `waitForEvent`, the popup may have fired during the click — the listener starts too late and times out. Inside `Promise.all`, the waiter promise is created (listener registered) before the click begins.
- `all` rejects fast but does not cancel the other promises — they keep running detached; relevant when cleanup matters.
- Use cases: `allSettled` for independent cleanup/teardown steps where you want every result; `race` for manual timeouts; `any` for "first healthy endpoint wins".

```ts
// Canonical popup pattern — waiter created BEFORE the trigger
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.getByRole('link', { name: 'Open invoice' }).click(),
]);
await expect(popup.getByRole('heading', { name: 'Invoice' })).toBeVisible();

// Same shape for a network response tied to an action
const [response] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/api/orders') && r.request().method() === 'POST'),
  page.getByRole('button', { name: 'Place order' }).click(),
]);
expect(response.status()).toBe(201);
```

**Follow-ups & traps**

- Follow-up: "Why not `await click(); await waitForEvent(...)`?" — the event can fire between the two awaits; you'd wait for something that already happened.
- Trap: `Promise.all` for actions on the *same page* — those must be sequential (Q7); `all` is for a waiter plus its trigger, or truly independent resources.
- Follow-up: "`race` for timeouts?" — `Promise.race([op, timeoutReject])` works but doesn't cancel `op`; Playwright APIs take `timeout` options — prefer those.
- Follow-up: "`allSettled` return shape?" — be able to write the discriminated union and filter fulfilled results.

**One-liner** — `all` = everything or first error, `allSettled` = every outcome, `race` = first settle, `any` = first success — and in Playwright, start the event waiter before the click inside `Promise.all`.

### Q7. Sequential vs parallel awaits

**Interview answer** — `await a; await b;` runs one after the other — if they're independent, you've doubled the wall time for nothing; `Promise.all([a, b])` runs them concurrently. But in Playwright, actions on the same page must be sequential: they represent one user on one tab, and the driver serializes them anyway — parallelizing them gains nothing and creates ordering bugs. So I parallelize independent I/O — API seeding, multi-context setup, independent read-only queries — and keep same-page UI flows strictly sequential.

**Deep dive**

- Cost model: sequential awaits sum latencies; concurrent awaits cost roughly the max. Seeding 5 users via API: ~5× latency sequential, ~1× with `Promise.all`.
- Why same-page parallel actions are unsafe: two clicks racing means nondeterministic order, actionability checks interleaving with DOM changes from the other action, and a test that no longer models a user. Playwright throws in some cases and silently serializes in others — either way you've encoded a lie.
- Legitimate parallelism: separate `page`/`context` objects (multi-user scenarios), `request` API calls, reading many `locator.textContent()` values is *technically* possible but keep it boring — parallelize setup, not interaction.
- Note the start-time subtlety: `const p = a(); await somethingElse; await p;` — `a` started when called, not when awaited.

```ts
// Wasteful: independent API seeds, sequential
await seedUser(request, alice);
await seedUser(request, bob);
await seedProducts(request, catalog);

// Better: independent I/O in parallel
await Promise.all([seedUser(request, alice), seedUser(request, bob), seedProducts(request, catalog)]);

// UI on one page: keep sequential — this is one user acting
await page.getByLabel('Email').fill(alice.email);
await page.getByLabel('Password').fill(alice.password);
await page.getByRole('button', { name: 'Sign in' }).click();

// Two users in parallel: separate contexts, then parallel flows are fine
const [buyerPage, sellerPage] = await Promise.all([
  browser.newContext().then((c) => c.newPage()),
  browser.newContext().then((c) => c.newPage()),
]);
```

**Follow-ups & traps**

- Trap: `Promise.all([page.fill(...), page.click(...)])` to "speed up" a form — wrong model; the interviewer is checking you know it's wrong.
- Follow-up: "How do you limit concurrency for 100 API calls?" — batch, or a small p-limit-style semaphore; unbounded `Promise.all` can overwhelm the service you're testing.
- Follow-up: "Does `Promise.all` make things truly parallel?" — concurrent I/O, single-threaded JS; the parallelism is in the awaited systems.

**One-liner** — Parallelize independent I/O with `Promise.all`, never actions on one page — a page is one user, and one user does one thing at a time.

### Q8. The `forEach` trap: why `array.forEach(async ...)` doesn't wait

**Interview answer** — `forEach` ignores its callback's return value, so when the callback is async it fire-and-forgets every iteration: all the promises float, `forEach` returns immediately, and your code continues before any iteration finished. In a test that means assertions run before the loop's work happened — or the test ends and the leftover actions bleed into teardown. The fixes are `for...of` with `await` for sequential work, or `Promise.all(array.map(...))` for concurrent work.

**Deep dive**

- Root cause: `forEach`'s contract is `(item) => void`; an async callback returns `Promise<void>`, which is silently discarded. `await someArray.forEach(...)` is also meaningless — `forEach` returns `undefined`.
- Same hazard in disguise: async callbacks to `filter` (a promise is always truthy — everything passes!), `some`, `every`. `map` is the exception *when* you `Promise.all` the result.
- Choose by dependency: `for...of` when order matters or each step depends on shared state (UI steps); `Promise.all(map)` for independent API calls (Q7 rules apply).
- `no-misused-promises` catches async callbacks passed where `void` returns are expected.

```ts
const skus = ['SKU-1', 'SKU-2', 'SKU-3'];

// BUG: returns immediately; three add-to-cart clicks float
skus.forEach(async (sku) => {
  await page.getByTestId(`add-${sku}`).click();
});
await expect(page.getByTestId('cart-count')).toHaveText('3'); // races all three

// Sequential — correct for same-page UI actions
for (const sku of skus) {
  await page.getByTestId(`add-${sku}`).click();
}

// Concurrent — correct for independent API seeding
await Promise.all(skus.map((sku) => request.post('/api/cart', { data: { sku, qty: 1 } })));
```

**Follow-ups & traps**

- Follow-up: "Why is async `filter` broken?" — the predicate returns `Promise<boolean>`, and any promise object is truthy; the filter keeps everything.
- Trap: "fix" it by making the `forEach` callback await internally — each iteration still floats relative to the caller; the structure is the bug.
- Follow-up: "Sequential with index and early exit?" — another point for `for...of`/`for`: `break`/`continue`/`return` work; they don't in `forEach`.

**One-liner** — `forEach` throws away the promises your async callback returns — use `for...of` to await in order, or `Promise.all(map)` to await together.

### Q9. Error handling in async code

**Interview answer** — With async/await, rejections become throws at the `await`, so `try/catch/finally` is the primary tool — catch where you can add context or recover, let everything else propagate and fail the test loudly. On raw promises it's `.catch`, and any promise nobody awaits or catches becomes an unhandled rejection, which in Node 20 crashes the process — in Playwright terms, it can take down a worker and abort unrelated tests mid-file.

**Deep dive**

- `try/finally` is the underrated half: cleanup (close contexts, delete seeded data) must run on failure paths too — or use fixtures, which are exactly this pattern institutionalized.
- `return p` vs `return await p` inside `try`: without `await`, the rejection happens after the function already returned — your `catch` never sees it.
- In tests, catching to suppress is the cardinal sin: a swallowed error is a false pass. Catch to (a) enrich and rethrow, (b) assert an *expected* failure (`await expect(fn).rejects.toThrow(...)`), or (c) implement retry logic.
- Unhandled rejection mechanics: a rejected promise with no handler attached (by the end of the microtask checkpoint) triggers `unhandledRejection`; Node's default since v15 is crash. Playwright ties most rejections to a test, but floating promises (Q5) escape that attribution.
- `catch (e)` gives `e: unknown` under strict settings — narrow with `instanceof` (file 1, Q20).

```ts
test('order search degrades gracefully', async ({ page, request }) => {
  const seeded = await seedOrder(request, buildOrder());
  try {
    await page.goto(`/orders/${seeded.id}`);
    await expect(page.getByRole('heading', { name: seeded.id })).toBeVisible();
  } catch (e) {
    // enrich, never swallow
    throw new Error(`Order page failed for seeded id=${seeded.id}`, { cause: e });
  } finally {
    await request.delete(`/api/orders/${seeded.id}`); // runs pass or fail
  }
});

// Asserting an expected rejection — no try/catch needed
await expect(api.getOrder('does-not-exist')).rejects.toThrow(/404/);
```

**Follow-ups & traps**

- Trap: `try { return doWork() }` — rejection escapes the catch; `return await` fixes it.
- Trap: empty `catch {}` around flaky steps — hides real regressions; the fix is proper waiting, not suppression.
- Follow-up: "Where does an error in a `.then` callback go?" — it rejects the chained promise; it does not throw synchronously.
- Follow-up: "How do fixtures change this?" — teardown after `use()` runs even when the test fails, replacing most hand-written `finally` blocks.

**One-liner** — Await turns rejections into throws: catch only to enrich, retry, or assert; always clean up in `finally`/fixtures; a swallowed rejection is a false pass.

### Q10. Microtasks vs macrotasks

**Interview answer** — Promise callbacks are microtasks; timers, I/O callbacks and the like are macrotasks. After every macrotask, the event loop drains the *entire* microtask queue before touching the next macrotask — so a resolved promise's `.then` always beats a `setTimeout(fn, 0)`. The practical takeaway for test code: awaits chain through microtasks and run as soon as possible, while timer-based logic waits its turn behind them.

**Deep dive**

- Microtasks: promise reactions (`.then`/`await` continuations), `queueMicrotask`. Macrotasks: `setTimeout`/`setInterval`, I/O completions, `setImmediate` (Node check phase).
- Ordering demo: sync code → all microtasks → one macrotask → its microtasks → … A microtask that queues more microtasks extends the same drain — runaway microtask loops starve timers entirely.
- Node nuance: `process.nextTick` runs even before promise microtasks; know it exists, don't reach for it.
- Where this touches Playwright: rarely directly — but it explains why `await`-heavy code interleaves predictably, and why a busy microtask loop can delay `setTimeout`-based polling helpers.

```ts
console.log('sync 1');
setTimeout(() => console.log('macrotask'), 0);
Promise.resolve().then(() => console.log('microtask'));
console.log('sync 2');
// Output: sync 1, sync 2, microtask, macrotask
```

**Follow-ups & traps**

- Follow-up: "Predict the output" of a snippet mixing `await`, `.then`, and `setTimeout` — practice one; it's the standard cross-question.
- Trap: claiming `setTimeout(fn, 0)` runs immediately — it runs no earlier than the next loop turn, after all pending microtasks (and with a clamped minimum delay).
- Follow-up: "`setImmediate` vs `setTimeout(0)` in Node?" — different phases; `setImmediate` runs after I/O callbacks in the same iteration.

**One-liner** — Microtasks (promises) drain completely between macrotasks (timers/I/O) — so `.then` beats `setTimeout(0)` every time.

### Q11. Why Playwright's `expect()` web-first assertions still need `await`

**Interview answer** — Web-first assertions like `expect(locator).toBeVisible()` re-query the page and retry until the condition holds or the timeout expires — that's inherently asynchronous, so the matcher returns a promise, and `await` is what makes your test actually wait for the verdict. Forget the `await` and the assertion floats: the test proceeds — and can pass — before the check resolved, and a late failure surfaces as an unhandled rejection instead of a clean test failure.

**Deep dive**

- Mechanics: the matcher polls the locator (visibility, text, count…) on an interval until pass or timeout — that auto-retry is what kills most explicit-wait code from the Selenium era. The returned `Promise<void>` fulfills on pass, rejects with the rich diff on timeout.
- Because retries happen *inside* the assertion's promise, `await` is the synchronization point: nothing about auto-retry removes the need to consume the promise.
- Contrast: `expect(5).toBe(5)` on plain values is synchronous — no await needed. The async ones are those taking a `Locator`/`Page`/`APIResponse`, plus `expect(fn).rejects/resolves...` and `expect.poll()`.
- Guards: `@typescript-eslint/no-floating-promises` flags it; Playwright's own lint plugin and runtime warnings catch some cases ("expect... was not awaited"); TS 5.x `@awaitable`-style checks don't exist — lint is the net.
- `expect.poll(() => value)` and `expect(async () => {...}).toPass()` extend the same retry model to arbitrary code — both also awaited.

```ts
// Correct: await is the sync point; retry happens inside
await expect(page.getByTestId('order-status')).toHaveText('Shipped', { timeout: 15_000 });

// Bug: floating assertion — test can end before the check settles
expect(page.getByTestId('order-status')).toHaveText('Shipped');

// Retrying an API condition with the same model
await expect.poll(async () => (await request.get(`/api/orders/${id}`)).status(), {
  timeout: 10_000,
}).toBe(200);
```

**Follow-ups & traps**

- Follow-up: "Which expect calls don't need await?" — value matchers on plain data; anything locator/response-based does.
- Trap: wrapping a web-first assertion in manual polling or `waitForTimeout` — redundant; the retry is built in, configure `timeout` instead.
- Follow-up: "What happens on timeout?" — the promise rejects with the formatted expected/received diff, failing the test at the await site.

**One-liner** — Auto-retrying assertions are promises whose retries run inside — `await` is what connects their verdict to your test's pass/fail.

### Q12. Async fixtures and hooks

**Interview answer** — Fixture bodies and hooks are async because everything they do — launching contexts, API seeding, logins — is I/O. A fixture wraps the test: code before `await use(value)` is setup, code after is teardown, and Playwright guarantees teardown runs in reverse dependency order even when the test fails — which is why fixtures beat hand-rolled `beforeEach`/`afterEach` for anything owning a resource.

**Deep dive**

- The `use` pattern is structured resource management: one function holds setup and teardown around an `await use(...)` suspension while the test (and dependent fixtures) run inside.
- Ordering: dependencies build setup order (a `loginPage` fixture depending on `page` sets up after it) and teardown unwinds LIFO — the page is still alive while your fixture's teardown runs.
- Hooks: `beforeAll` runs once per worker (re-runs in a fresh worker after a crash/retry-with-new-worker) — state it creates is shared across that worker's tests, so keep it immutable-ish. `beforeEach` composes with fixtures; ordering is fixtures-then-hooks nuancedly interleaved — prefer fixtures for resources, hooks for simple per-test steps.
- Worker-scoped fixtures (`{ scope: 'worker' }`) amortize expensive setup (one API token, one seeded tenant per worker) and tear down when the worker exits.
- Timeouts: fixture setup/teardown counts against timeouts; a hung teardown surfaces as a confusing "test finished but worker is stuck" — keep teardown bounded.

```ts
type Fixtures = { authedPage: Page };

export const test = base.extend<Fixtures>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'auth/qa-user.json' });
    const page = await context.newPage();
    await use(page);                 // test runs here — even if it throws...
    await context.close();           // ...this teardown still runs
  },
});

test.beforeEach(async ({ request }) => {
  await request.post('/api/test/reset-cart'); // cheap per-test hygiene: hook is fine
});
```

**Follow-ups & traps**

- Follow-up: "Fixture vs `beforeEach` — when each?" — fixture when it owns a resource or has teardown; hook for cheap stateless steps.
- Trap: doing per-test mutable seeding in `beforeAll` — shared across the worker's tests, breaks under retries and parallel shuffling.
- Follow-up: "What if teardown itself throws?" — the error is reported (can fail the test/run); guard teardown that may race resource closure.
- Follow-up: "Why is `use` awaited?" — the entire test executes during that await; it's the suspension point that makes wrap-around setup/teardown possible in one function.

**One-liner** — Fixtures are async wrappers around the test: setup, `await use()`, teardown — guaranteed to unwind in reverse order even on failure.

### Q13. Writing typed async utilities: `waitUntil` and `retry`

**Interview answer** — Two helpers every framework ends up with: `waitUntil` polls a predicate until it's true or a timeout expires — for conditions Playwright's built-in waiting can't see, like an external queue draining — and `retry` re-invokes a flaky operation with backoff — for third-party APIs in setup. The keys are: the loop must `await` a sleep so it yields to the event loop, the timeout must be enforced by deadline arithmetic not iteration counts, and failures must throw rich errors, not return silently.

**Deep dive**

- Sleep primitive: `new Promise(res => setTimeout(res, ms))` — a macrotask, so the loop yields and other work proceeds (Q1/Q10). A busy-wait `while` would block the loop and freeze everything, including the condition you're polling.
- Deadline math (`Date.now() - start < timeout`) survives predicates of varying latency; "N attempts × interval" drifts.
- Generic support: `waitUntil` can return the successful value typed `T` when the predicate produces one; `retry` is generic over the operation's return type.
- Last-error capture in `retry` preserves the real failure; exponential backoff with a cap avoids hammering a struggling dependency.
- Know when *not* to use these: for anything visible to a locator or response, Playwright's auto-waiting and `expect.poll` already do this with better reporting — these helpers are for out-of-band conditions.

```ts
export async function waitUntil<T>(
  predicate: () => Promise<T | false>,
  { timeoutMs = 15_000, intervalMs = 250, label = 'condition' } = {},
): Promise<T> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await predicate();
      if (result !== false) return result;
    } catch (e) {
      lastError = e; // condition not ready yet; keep polling
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(`waitUntil timed out after ${timeoutMs}ms waiting for ${label}`, { cause: lastError });
}

export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 3, backoffMs = 500 }: { attempts?: number; backoffMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < attempts) await new Promise((res) => setTimeout(res, backoffMs * 2 ** (attempt - 1)));
    }
  }
  throw new Error(`retry: all ${attempts} attempts failed`, { cause: lastError });
}

// Usage: wait for an async export job the UI can't observe
const job = await waitUntil(async () => {
  const res = await request.get(`/api/exports/${jobId}`);
  const body = (await res.json()) as { status: string; downloadUrl?: string };
  return body.status === 'done' && body.downloadUrl ? body : false;
}, { timeoutMs: 60_000, label: `export job ${jobId}` });
```

**Follow-ups & traps**

- Follow-up: "Why `return await fn()` inside the try?" — without `await`, a rejection escapes the catch and the retry loop never retries (Q9).
- Trap: `while (true)` without an awaited sleep — event-loop starvation; nothing else (including the polled system's responses) can be processed.
- Follow-up: "Add jitter?" — randomize backoff to avoid thundering-herd retries from parallel workers.
- Follow-up: "When would you *not* write this?" — anything `expect.poll`/web-first assertions can express; don't rebuild Playwright's waiting with worse error messages.

**One-liner** — Poll with an awaited sleep against a deadline, retry with capped exponential backoff, and always throw the last real error with context.

### Q14. Top-level await and when you'd use it in a global setup script

**Interview answer** — Top-level await lets you `await` at module scope, outside any function — supported in ES modules on Node 20 and in TS with modern `module` targets. In a Playwright repo the natural home is setup-style scripts: a global-setup module or a standalone seeding script that must complete async work — fetching an auth token, waiting for the environment's health check — before anything imports its results. Inside test files you don't need it: tests and fixtures are already async.

**Deep dive**

- Requirements: ESM only (`"type": "module"` or `.mts`), `module: ES2022`/`NodeNext` and `target: ES2017+` in tsconfig; in CommonJS it's a syntax error — the classic "why doesn't top-level await work" answer.
- Semantics: the module's evaluation suspends at the await; importers wait for it to finish — an async module graph. A slow top-level await delays *every* dependent import, which is exactly why it belongs in setup scripts, not shared libraries.
- Playwright specifics: `globalSetup` files export a function Playwright awaits — top-level await isn't required there, but project-dependency-based setup (a `setup` project with `.setup.ts` files) and one-off scripts run as ESM can use it naturally.
- Alternative in CJS contexts: the `async function main(){...} main().catch(...)` wrapper — be ready to write it, and remember the `.catch` so a failed setup exits non-zero.

```ts
// scripts/wait-for-env.ts — run before the suite in CI (ESM, Node 20)
const base = process.env.BASE_URL ?? 'https://qa.shop.example.com';

const healthy = await waitUntil(async () => {
  const res = await fetch(`${base}/api/health`);
  return res.ok ? res : false;
}, { timeoutMs: 120_000, label: 'environment health check' });

console.log(`Environment ready: ${healthy.status} from ${base}/api/health`);

// storage-state seeding is the other classic: log in once via API, save state
const token = await (await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ user: 'qa-bot', pass: process.env.QA_BOT_PASSWORD }),
  headers: { 'content-type': 'application/json' },
})).json();
await writeFile('auth/qa-user.json', JSON.stringify(token));
```

**Follow-ups & traps**

- Trap: using top-level await in a CommonJS project and being surprised by the syntax error — it's an ESM feature.
- Follow-up: "What happens to modules importing a top-level-awaiting module?" — they wait; module evaluation becomes async and ordering follows the graph.
- Follow-up: "Global setup via `globalSetup` vs a setup project?" — setup projects get fixtures, tracing, and reporting; `globalSetup` is a bare async function; either way the awaiting is handled for you.

**One-liner** — Top-level await makes module initialization async — ESM-only, importers wait — ideal for health checks and token seeding before a Playwright run.
