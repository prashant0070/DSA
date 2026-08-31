# Network Interception & API Testing

Playwright's network layer — observing, waiting on, mocking, and rewriting traffic — is what turns it from a UI clicker into a full-stack test tool, and interviewers probe it heavily. This file covers response capture, `route` in all its modes, failure and latency simulation, WebSockets, HAR replay, pure API testing with `APIRequestContext`, and hybrid API+UI strategies.

- Q1. How do you capture and inspect API responses during a UI test?
- Q2. How do you wait for an API response tied to an action?
- Q3. How do you mock API requests and responses?
- Q4. `route.fulfill` vs `route.continue` vs `route.fallback` vs `route.abort` — the map
- Q5. How do you modify a real request or response on the fly?
- Q6. How do you simulate network failures?
- Q7. How do you test slow networks?
- Q8. How do you test WebSockets?
- Q9. What is `routeFromHAR`?
- Q10. What is `APIRequestContext` / the `request` fixture?
- Q11. How do you combine API and UI in one test?
- Q12. When should you mock vs hit real services?
- Q13. What is `page.clock` and when do you mock time?
- Q14. What are the limits and gotchas of request interception?

### Q1. How do you capture and inspect API responses during a UI test?

**Interview answer** — Two tools: `page.on('response')` for passively observing all traffic — useful for logging or collecting every call to an endpoint — and `page.waitForResponse()` when I need to wait for one specific response and assert on it. `waitForResponse` takes a URL substring, a glob, or a predicate function, and gives me the `Response` object so I can check status and parse the JSON body.

**Deep dive** — `page.on('response')` is fire-and-forget: it never blocks, so it's for accumulation (push matching responses into an array, assert later) and diagnostics (log every non-2xx during a test). `waitForResponse` is synchronization: it resolves when a matching response arrives or throws on timeout. The predicate form is what you use in practice because real matching needs method and status too — the same URL might serve an OPTIONS preflight or a 304 you don't want.

```ts
// Passive collection
const failed: string[] = [];
page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });

// Targeted wait with a predicate
const resp = await page.waitForResponse(
  (r) => r.url().includes('/api/orders') && r.request().method() === 'GET' && r.ok(),
);
const orders = await resp.json();
expect(orders.items.length).toBeGreaterThan(0);
```

**Follow-ups & traps**
- "Difference from `page.route`?" — Listeners *observe*; `route` *intercepts and can alter*. Observation never changes app behavior.
- Trap: awaiting `response.json()` on a redirect or empty-body response — check status/content-type first.
- "How do you inspect requests, not responses?" — `page.on('request')` and `request.postDataJSON()` for payload assertions.

**One-liner** — `page.on('response')` observes everything; `waitForResponse` with a predicate waits for the one response you care about.

### Q2. How do you wait for an API response tied to an action?

**Interview answer** — Start the wait *before* triggering the action, then await both together — usually with `Promise.all` or by holding the promise. If you click first and then call `waitForResponse`, a fast response can arrive before the listener exists and you'll wait until timeout for something that already happened. Then I assert on the response status and body, and separately on the UI that renders it.

**Deep dive** — This is a classic race: `waitForResponse` only sees responses arriving after it's called. The idiom is "arm, act, await." It also documents intent: the test says explicitly "this click causes this API call," which doubles as a contract check — if the frontend switches endpoints, the test fails loudly at the network layer instead of mysteriously at the UI layer.

```ts
test('applying a coupon recalculates the total', async ({ page }) => {
  const recalc = page.waitForResponse(
    (r) => r.url().includes('/api/cart/total') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Apply coupon' }).click();

  const resp = await recalc;
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.discountApplied).toBe(true);

  await expect(page.getByTestId('cart-total')).toHaveText(`$${body.total}`);
});
```

**Follow-ups & traps**
- "Why not just assert on the UI and skip the network wait?" — Often you should! Web-first assertions auto-wait. Use `waitForResponse` when you need the *payload* or when the UI signal is ambiguous.
- Trap: `await click(); await waitForResponse(...)` sequentially — the race described above; intermittent timeouts.
- "What if the endpoint is called multiple times?" — Tighten the predicate (method, query params, request body) so you match the specific call.

**One-liner** — Arm `waitForResponse` before the click, await after — never after-the-fact, or you race the response.

### Q3. How do you mock API requests and responses?

**Interview answer** — `page.route()` registers an interceptor for matching URLs, and inside the handler `route.fulfill()` answers with a canned status, headers, and body without the request ever reaching the server. I use it to force UI states that are hard to arrange with real data — empty lists, error banners, edge-case payloads. `context.route()` does the same for every page in the context, which is what you want for multi-tab flows or when mocking in a fixture.

**Deep dive** — Routes are matched by glob, regex, or predicate, and the *last registered* matching route wins, which lets a test override a fixture-level default mock. Register routes before the navigation that triggers the calls. Keep mock payloads shaped exactly like the real API — the strongest argument for generating them from recorded traffic or shared types, because a hand-written mock that drifts from the contract makes the test pass against a frontend that would fail in production.

```ts
test('shows empty state when the user has no orders', async ({ page }) => {
  await page.route('**/api/orders?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    }),
  );

  await page.goto('/account/orders');
  await expect(page.getByRole('heading', { name: 'No orders yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start shopping' })).toBeVisible();
});
```

**Follow-ups & traps**
- "page.route vs context.route?" — Page-level for one page; context-level applies to all pages (popups, new tabs) and fits fixtures.
- Trap: registering the route after `goto` — the initial calls already went to the real server.
- "Does the mocked call show in the trace?" — Yes, marked as fulfilled by route, which is how you verify mocking actually engaged.

**One-liner** — `page.route` + `route.fulfill` answers requests yourself — the tool for forcing empty, error, and edge states on demand.

### Q4. `route.fulfill` vs `route.continue` vs `route.fallback` vs `route.abort` — the map

**Interview answer** — Every intercepted request must end in one of four verbs. `fulfill` answers it yourself — full mock. `continue` sends it to the network, optionally with modified method, headers, or body — and it's final: no other handler runs after it. `fallback` passes the request to the next matching route handler, letting you chain handlers, each contributing an override. `abort` kills the request with a network error — the tool for failure simulation.

**Deep dive** — The `continue` vs `fallback` distinction is the senior detail: with layered routes (a context-wide handler adding an auth header, plus a test-specific handler mocking one endpoint), handlers run last-registered-first, and `fallback` is what makes them compose — each handler either handles the request terminally (`fulfill`/`abort`/`continue`) or decorates it and defers (`fallback`). If your generic handler calls `continue`, more specific handlers never see the request, which is a classic "my mock isn't working" bug.

```ts
// Context-wide decoration that stays composable
await context.route('**/api/**', (route) =>
  route.fallback({ headers: { ...route.request().headers(), 'x-test-run': runId } }),
);
// Test-specific terminal mock still gets its chance
await page.route('**/api/payments', (route) => route.fulfill({ status: 502 }));
```

**Follow-ups & traps**
- "Order of handler evaluation?" — Reverse registration order (most recent first). Wrong answer: "registration order."
- Trap: using `continue` in a shared/global handler — it terminates routing and silently disables per-test mocks.
- "What does the app see on `abort`?" — A network-level failure (like `net::ERR_FAILED`), not an HTTP status — different error path than a 500.

**One-liner** — Fulfill answers, continue sends (terminally), fallback defers to the next handler, abort fails — and only fallback keeps handler chains composable.

### Q5. How do you modify a real request or response on the fly?

**Interview answer** — Request side: `route.continue({ headers, postData, method, url })` sends the real request with your edits — great for injecting auth or test-run headers. Response side: `route.fetch()` executes the real request, you edit the result, then `route.fulfill({ response, body })` hands the modified version to the browser. That pattern — real data, surgically altered — is ideal for testing how the UI renders one weird field without maintaining a full mock.

**Deep dive** — `route.fetch` + `fulfill` keeps you honest: the payload shape stays whatever the real API returns, so contract drift can't creep into your mock; you only own the delta. Cost: the request still hits the server, so you keep backend latency and need the backend up — it's "augmented reality," not stubbing.

```ts
// Make one order in the real list appear as 'DISPUTED' to test the badge UI
await page.route('**/api/orders?*', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.items[0].status = 'DISPUTED';
  await route.fulfill({ response, body: JSON.stringify(json) });
});
await page.goto('/account/orders');
await expect(page.getByTestId('order-status-badge').first()).toHaveText('Disputed');
```

**Follow-ups & traps**
- "Why fulfill with `response` and a body?" — Passing `response` preserves real status and headers; you override only the body.
- Trap: forgetting the handler is async — not awaiting `route.fetch()` produces unhandled rejections and hung requests.
- "Modify a request header for every call?" — `context.route` with `fallback({ headers })` (composable) or `continue` if it's the only handler.

**One-liner** — `continue` with overrides edits real requests; `fetch`-then-`fulfill` edits real responses — you own the delta, the server owns the shape.

### Q6. How do you simulate network failures?

**Interview answer** — Three distinct failure types, three tools. `route.abort()` simulates network-level failure — connection refused, DNS death — which exercises the app's catch-path. `route.fulfill({ status: 500 })` simulates the server *responding* with an error, which exercises HTTP error handling — a different code path that a good test suite covers separately. And `context.setOffline(true)` flips the whole context offline to test offline detection and recovery flows.

**Deep dive** — Apps genuinely handle these differently: a fetch that rejects (abort) versus a fetch that resolves with `response.ok === false` (500) hit different branches, and I've seen apps handle one gracefully and white-screen on the other. `abort` accepts an error code (`'timedout'`, `'connectionrefused'`) for specificity. A strong scenario: fail the request once, verify the error banner *and* the retry button, then remove the route and verify retry succeeds — that tests the full failure-recovery loop.

```ts
test('payment failure shows retry and recovers', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/payments', (route) => {
    calls += 1;
    return calls === 1
      ? route.fulfill({ status: 503, body: JSON.stringify({ error: 'upstream_unavailable' }) })
      : route.continue();
  });
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('alert')).toContainText('Payment failed');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
```

**Follow-ups & traps**
- "Difference between abort and a 500 for the app?" — Rejected promise vs resolved-with-error-status; separate handling code, test both.
- Trap: only ever testing happy paths because "errors are hard to reproduce" — routes make them one line.
- "Offline testing?" — `context.setOffline(true)`; note it cuts network but doesn't emulate the OS-level offline events on every platform identically.

**One-liner** — Abort for dead network, fulfill-500 for server errors, setOffline for offline mode — three failure modes, three different app code paths.

### Q7. How do you test slow networks?

**Interview answer** — For a specific endpoint, I delay inside a route handler before fulfilling or continuing — that's cross-browser and precisely targeted, perfect for verifying spinners and skeleton states. For whole-connection throttling — bandwidth and latency shaping like "Slow 3G" — Playwright has no cross-browser API, so I drop to CDP on Chromium with `Network.emulateNetworkConditions`.

**Deep dive** — There's no cross-browser throttle because Firefox and WebKit expose no equivalent remote-control protocol for it — CDP is Chromium-specific, and Playwright's public API generally avoids features it can't offer on all engines. In practice per-request delays cover most test needs (does the UI show a loading state? does a slow response race a fast one?), while realistic bandwidth simulation for perf work belongs in dedicated tooling.

```ts
// Targeted: delay one endpoint to assert the skeleton state
await page.route('**/api/search/flights*', async (route) => {
  await new Promise((r) => setTimeout(r, 3000));
  await route.continue();
});
await page.getByRole('button', { name: 'Search flights' }).click();
await expect(page.getByTestId('results-skeleton')).toBeVisible();
await expect(page.getByTestId('flight-card').first()).toBeVisible({ timeout: 10_000 });

// Whole-connection (Chromium only) via CDP
const cdp = await context.newCDPSession(page);
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 20_000,
});
```

**Follow-ups & traps**
- "Why does Playwright lack a throttle API?" — It can't be implemented uniformly across the three engines; Playwright avoids Chromium-only public APIs.
- Trap: adding route delays and forgetting to raise the relevant expect/test timeout — you flake your own test.
- "Is a route delay realistic 3G?" — No: it delays time-to-first-byte per request, not bandwidth/packet behavior. Fine for UI states, not for perf claims.

**One-liner** — Delay inside route handlers for targeted, cross-browser slowness; CDP network conditions for real throttling, Chromium only.

### Q8. How do you test WebSockets?

**Interview answer** — For observation, `page.on('websocket')` gives me each `WebSocket` with `framesent`/`framereceived` events, so I can assert the app sent the right message and reacted to what came back. For control, `page.routeWebSocket()` intercepts the connection so the server is never contacted — my handler plays the server, pushing frames to test things like live order-status updates or chat messages without real infrastructure.

**Deep dive** — Mocking matters for WebSockets even more than HTTP because real-time servers are hard to force into specific sequences on demand. With `routeWebSocket`, the returned route can send frames to the page (`ws.send(...)`) and receive the page's frames via `onMessage`; you can also connect through to the real server and man-in-the-middle selected messages. This turns "server pushed an out-of-order update" from an unreproducible bug into a deterministic test.

```ts
test('order tracker reacts to pushed status updates', async ({ page }) => {
  await page.routeWebSocket('**/ws/orders', (ws) => {
    ws.onMessage((msg) => {
      if (JSON.parse(msg as string).type === 'subscribe') {
        ws.send(JSON.stringify({ type: 'status', orderId: 'o-991', status: 'SHIPPED' }));
      }
    });
  });
  await page.goto('/orders/o-991/track');
  await expect(page.getByTestId('order-status')).toHaveText('Shipped');
});
```

**Follow-ups & traps**
- "Can `page.route` intercept WebSockets?" — No; HTTP routing and WebSocket routing are separate APIs. Common wrong answer.
- Trap: registering `routeWebSocket` after navigation — the app connects on load; the mock must exist first.
- "Testing reconnect logic?" — Close the mocked socket from the handler and assert the app re-subscribes and recovers.

**One-liner** — `page.on('websocket')` observes frames; `routeWebSocket` lets your test *be* the server and push whatever sequence you need.

### Q9. What is `routeFromHAR`?

**Interview answer** — It replays recorded traffic: you record a HAR of real API responses (`recordHar` in context options, or `routeFromHAR` with `update: true`), then in tests `page.routeFromHAR('flights.har', { url: '**/api/**' })` serves matching requests from the file instead of the network. It's the fastest way to get a complete, realistic mock of an entire page's API surface without writing any fulfill handlers.

**Deep dive** — HAR replay beats hand-written mocks when the API surface is wide — a dashboard calling fifteen endpoints would take pages of `route.fulfill` code but is one recording. It also guarantees realistic payload shape, since the payloads *are* real. The trade-offs: staleness — the backend contract evolves and your HAR quietly diverges until tests pass against an API that no longer exists, so re-record on a schedule or on contract change; unmatched requests can be set to abort or fall through; recorded data may embed timestamps and tokens that need scrubbing; and large HARs are an artifact-size and review-diff nuisance.

```ts
test('flight results page renders from recorded traffic', async ({ page }) => {
  // Recorded earlier with: routeFromHAR(..., { update: true }) against the real env
  await page.routeFromHAR('./hars/flight-search.har', { url: '**/api/**', notFound: 'abort' });
  await page.goto('/flights?from=DEL&to=BLR&date=2026-09-14');
  await expect(page.getByTestId('flight-card')).toHaveCount(12);
});
```

**Follow-ups & traps**
- "How do you keep HARs fresh?" — A scheduled job re-records with `update: true` against a stable environment; treat diffs as contract-change review.
- Trap: `notFound: 'fallback'` letting unrecorded calls silently hit real servers — your "hermetic" test isn't.
- "HAR vs hand-written mocks?" — HAR for breadth and realism; hand-written for precision edge cases (errors, empties) that you'd never capture from a healthy env.

**One-liner** — `routeFromHAR` replays recorded real traffic as mocks — maximum realism for minimum code, at the price of staleness management.

### Q10. What is `APIRequestContext` / the `request` fixture?

**Interview answer** — It's Playwright's built-in HTTP client for testing APIs with no browser at all: the `request` fixture gives an `APIRequestContext` with `get`/`post`/`put`/`delete`, cookie handling, and `baseURL` from config, and you assert with the same `expect`. So Playwright works as an API testing tool outright — same runner, same fixtures, same reports as your UI tests, which is a real consolidation win over running a separate API framework.

**Deep dive** — The context maintains its own cookie jar and can be created standalone via `playwright.request.newContext()` with default headers (auth tokens) — the basis for authenticated API fixtures. Because no browser launches, these tests run in milliseconds, making them the right layer for CRUD coverage, and the workhorse for seeding and cleanup inside UI tests (Q11).

```ts
test('order CRUD via API', async ({ request }) => {
  const create = await request.post('/api/orders', {
    data: { sku: 'SKU-4415', qty: 2, shippingMethod: 'express' },
  });
  expect(create.status()).toBe(201);
  const order = await create.json();
  expect(order).toMatchObject({ sku: 'SKU-4415', qty: 2, status: 'PENDING' });

  const read = await request.get(`/api/orders/${order.id}`);
  expect(read.ok()).toBeTruthy();

  const del = await request.delete(`/api/orders/${order.id}`);
  expect(del.status()).toBe(204);
  expect((await request.get(`/api/orders/${order.id}`)).status()).toBe(404);
});
```

**Follow-ups & traps**
- "Does `request` share cookies with `page`?" — The context-bound `context.request` shares the context's cookies; the standalone `request` fixture does not. Frequently confused.
- Trap: benchmarking or load-testing with it — it's a functional client, not a load tool.
- "Schema validation?" — Pair with zod or JSON-schema assertions on `await resp.json()` for contract-ish checks.

**One-liner** — The `request` fixture is a browserless HTTP client inside Playwright Test — full API testing and data seeding with the same runner and assertions.

### Q11. How do you combine API and UI in one test?

**Interview answer** — API for *arrange* and *cleanup*, UI only for the *act* and *assert* that the test is actually about. If I'm testing the order-details screen, I create the order through the API in one call rather than clicking through checkout, then drive and assert the UI, then delete the order via API. Each test verifies one thing through the UI while everything else takes the fast, reliable path.

**Deep dive** — This is the single biggest lever on suite speed and stability, because setup via UI multiplies every upstream screen's flakiness and latency into every downstream test. The inverse direction also matters: after a UI action, assert the *backend* effect via API — the UI said "order placed," but did the order actually persist with the right totals? That catches bugs where the frontend lies. Wrap API helpers in fixtures so tests read cleanly.

```ts
test('user can cancel a pending order from order details', async ({ page, request }) => {
  // Arrange via API — one call instead of a six-screen checkout
  const resp = await request.post('/api/orders', {
    data: { sku: 'SKU-2210', qty: 1, userId: 'worker-user-3' },
  });
  const order = await resp.json();

  // Act + assert via UI — the actual subject under test
  await page.goto(`/account/orders/${order.id}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('Cancelled');

  // Assert backend truth, then clean up — both via API
  const after = await (await request.get(`/api/orders/${order.id}`)).json();
  expect(after.status).toBe('CANCELLED');
  await request.delete(`/api/orders/${order.id}`);
});
```

**Follow-ups & traps**
- "Doesn't API setup skip 'real user' coverage?" — Checkout *is* covered — once, by the checkout test. Re-walking it in fifty tests adds runtime, not coverage.
- Trap: cleanup as a load-bearing dependency — crashed tests skip teardown; unique per-test data keeps leaks harmless.
- "Auth for the API calls?" — A request context with a token, typically built in a worker fixture alongside UI `storageState`.

**Senior/lead angle** — I make "arrange via API" a framework guarantee: fixtures expose `createOrder()`-style seeding helpers, so the lazy path and the right path are the same path.

**One-liner** — API to arrange, UI to act and assert the one thing under test, API to verify backend truth and clean up.

### Q12. When should you mock vs hit real services?

**Interview answer** — My boundary rule: mock what you don't own or can't control — third-party APIs, payment gateways, anything unstable or rate-limited — at the network boundary; hit your own backend for real in e2e tests, because catching real integration bugs is the point of e2e. In between, keep a deliberate small set of true end-to-end paths, and use mocks freely in component-ish UI tests where the subject is frontend behavior.

**Deep dive** — Fully mocked suites are fast and stable but test a simulation — they'll happily pass while the real backend rejects your requests. Fully real suites are honest but slow and hostage to every dependency's uptime. The resolution is layering: UI-behavior tests (error states, empty states, rendering edge cases) mock aggressively because the backend isn't the subject; journey tests hit real owned services; third-party edges are always mocked in CI, with contract tests or a tiny live smoke suite covering the real integration out-of-band. Payment gateways are the canonical always-mock: nondeterministic, slow, and often billable. The full decision framework lives in the architecture track.

**Follow-ups & traps**
- "If you mock the backend, what tells you the contract still holds?" — Contract tests, schema validation on recorded traffic, or a thin live smoke suite — a mock without any of those is faith-based testing.
- Trap: mocking your own backend across the whole e2e suite because "it's flaky" — that mutes the very signal e2e exists to give; fix the environment.
- "Where exactly do you mock a third party?" — At your service boundary or via route interception at the browser edge, never by forking test-only code paths into the app.

**One-liner** — Mock the edges you don't own, test the core you do — and cover mocked contracts with something real out-of-band.

### Q13. What is `page.clock` and when do you mock time?

**Interview answer** — `page.clock` fakes time inside the page: install a clock at a chosen instant, then advance it manually with `fastForward` or `runFor`, or pause and resume it. Anything driven by timers or `Date` — session-timeout warnings, token expiry, countdowns, "posted 3 hours ago" labels — becomes deterministic and instant instead of requiring real waiting or being untestable.

**Deep dive** — It patches `Date`, `setTimeout`/`setInterval`, `requestAnimationFrame` and friends within the page, so app code observes a virtual timeline your test controls. `clock.install({ time })` pins a start instant — do it before navigation so scripts never see real time; `fastForward('30:00')` jumps ahead firing due timers; `pauseAt` is for freezing at a boundary you want to assert around. Classic wins: a 30-minute idle-timeout banner tested in milliseconds, date-dependent UI pinned so screenshots stop drifting, token-expiry refresh flows exercised on demand.

```ts
test('idle session shows a timeout warning and then logs out', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-10T09:00:00') });
  await page.goto('/dashboard');

  await page.clock.fastForward('25:00');
  await expect(page.getByRole('alert')).toContainText('Your session expires in 5 minutes');

  await page.clock.fastForward('05:00');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
```

**Follow-ups & traps**
- "Does it affect the server's clock?" — No — browser-side only. Server-issued token expiries still come from real time; mock the responses or shorten TTLs in the test env for that half.
- Trap: installing the clock after `goto` — app startup code already captured real time.
- "Why not `waitForTimeout(1_500_000)`?" — Real 25-minute waits are absurd; that's precisely what clock mocking eliminates.

**One-liner** — `page.clock` puts the browser's clock under test control — timeouts, expiries, and date-driven UI become instant and deterministic.

### Q14. What are the limits and gotchas of request interception?

**Interview answer** — The ones that bite in practice: service workers can answer requests without them ever reaching route handlers, so mocks silently don't engage — the standard fix is `serviceWorkers: 'block'` in context options; requests fired during `beforeunload`/page teardown may escape interception; what you observe is the browser's view, so CORS-restricted details and preflight behavior can differ from what a server-side proxy would show; and recorded HARs bloat fast if you don't filter to the API traffic you actually need.

**Deep dive** — The service-worker case is the classic "my route never fires" mystery: a PWA's worker serves from cache, no network request exists, handler never runs. Blocking service workers in tests is usually right unless the worker itself is under test. Also worth knowing: route handlers add a hop to every matched request, so overly broad patterns (`**/*`) tax the whole test; scope patterns to the API paths you mean. And interception is per-context — a popup into a *new context* (rare, but e.g. via `window.open` with certain options) won't inherit page routes, which is another argument for `context.route`.

**Follow-ups & traps**
- "Mock isn't engaging — first three checks?" — Service worker active? Route registered before navigation? Pattern actually matching (log `route.request().url()` from a catch-all temporarily)?
- Trap: assuming `page.route` covers new tabs — it's page-scoped; use `context.route` for multi-page flows.
- "Interception vs a proxy like mitmproxy?" — In-browser interception is per-test and programmable but browser-view only; a proxy sees true wire traffic across everything but is shared infrastructure with shared-state risks.

**One-liner** — Know the escape hatches: service workers bypass routes (block them), teardown requests escape, you see the browser's view of the wire, and HARs need dieting.
