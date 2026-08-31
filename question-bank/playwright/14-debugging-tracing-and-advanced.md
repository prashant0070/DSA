# Debugging, Tracing & Advanced Features

Debugging is where Playwright most clearly outclasses older tools, and interviewers use this area to test whether you actually investigate failures or just re-run them. This file covers Trace Viewer and the Inspector, CI failure forensics, flaky-test debugging, visual regression, accessibility, cross-browser and mobile emulation, and the browser-context escape hatches.

- Q1. What is Trace Viewer?
- Q2. How do you generate and analyze traces?
- Q3. What is Playwright Inspector?
- Q4. Trace Viewer vs Inspector — when do you use each?
- Q5. How do you debug Playwright tests generally?
- Q6. A CI failure gives insufficient information — what do you enable?
- Q7. How do you debug flaky tests specifically?
- Q8. How do you do visual regression testing?
- Q9. How do you do accessibility testing?
- Q10. How do you run tests across browsers, and why does WebKit matter?
- Q11. How do you test mobile and responsive behavior?
- Q12. `page.evaluate()`, `addInitScript()`, `exposeFunction()` — when and why?
- Q13. What is the VS Code extension / UI mode watch workflow?
- Q14. How deep does emulation go — locale, timezone, geolocation, color scheme?

### Q1. What is Trace Viewer?

**Interview answer** — Trace Viewer is a post-mortem debugger: a trace records everything about a test run — the action timeline, DOM snapshots captured before and after every action, all network requests and responses, console output, and the test source — and the viewer replays it as an interactive timeline. It means a CI failure stops being "works on my machine, can't reproduce" and becomes "open the trace and watch exactly what the browser saw," which is why I call it Playwright's killer feature.

**Deep dive** — The snapshots are not screenshots — they're captured DOM states you can inspect with devtools-style tooling: hover elements, check what a locator would have matched *at that moment*, see computed state. Per action you get before/after snapshots plus the action's target highlighted, so "click hit the wrong element" or "assertion ran before data loaded" is directly visible. The network tab within the trace shows each request with full headers and bodies, and console/errors are correlated to the timeline, so app-side exceptions line up with the failing step.

**Follow-ups & traps**
- "Trace vs video?" — Video is pixels: you can watch but not inspect. A trace is structured data: you can query the DOM at any step and read network bodies. Video is for visual/animation issues; trace for everything else.
- Trap: describing Trace Viewer as "screenshots of each step" — undersells the inspectable-DOM aspect that makes it actually powerful.
- "Cost of tracing?" — Runtime and artifact-size overhead, which is why the default strategy is on-first-retry (Q2), not always-on.

**One-liner** — A trace is a complete, inspectable recording — actions, DOM snapshots, network, console — that turns unreproducible CI failures into replayable evidence.

### Q2. How do you generate and analyze traces?

**Interview answer** — In config, `use: { trace: 'on-first-retry' }` is the standard: passing runs stay cheap, and any failure that retries records a full trace of the retry. I open traces from the HTML report — the trace icon on a failed test — or with `npx playwright show-trace trace.zip`, or by dropping the zip into trace.playwright.dev. Analysis flow: find the red failing action, read the error, then walk backwards through snapshots and the network tab until I find where reality diverged from the test's assumption.

**Deep dive** — A worked diagnosis: a checkout test fails with "toHaveText expected '$89.97' received '$29.99'". In the trace, the failing assertion's snapshot shows the cart rendering one item. Walk back: the "add second item" click action's after-snapshot shows the click landed on a disabled button — and the network tab shows the stock API for that SKU returned `available: 0`. Root cause: the test data assumed stock that a parallel test had just bought — a data-isolation bug, not a locator bug. That's a trace-driven diagnosis: error → snapshot at failure → walk back through actions → correlate with network. Other trace modes: `'on'` (always, expensive), `'retain-on-failure'` (record always, keep only failures — better evidence, more overhead), `'on-all-retries'`.

```ts
export default defineConfig({
  use: { trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' },
});
```

**Follow-ups & traps**
- "Why on-first-retry rather than always?" — Tracing everything costs time and storage on thousands of green runs; retries scope the cost to failures. Trade-off: you get the *retry's* trace, and a test that passes on retry gives you a passing trace — for hard flakes, switch temporarily to `retain-on-failure`.
- Trap: reading only the final error and never opening the trace — the error says *what* mismatched, the trace says *why*.
- "Traces for passing runs?" — `--trace on` for a targeted run when you need to compare a pass against a fail.

**One-liner** — `trace: 'on-first-retry'` for cheap capture; analyze by walking back from the failing action through snapshots and network until assumption and reality diverge.

### Q3. What is Playwright Inspector?

**Interview answer** — The Inspector is the live step-through debugger: run with `--debug` (or `PWDEBUG=1`) and tests open headed with a control window where I step action by action, watching each locator highlight in the live browser before it acts. Its locator playground is the part I use most — edit a locator expression and see what it matches in real time, or use "pick locator" to click an element and get Playwright's suggested locator for it.

**Deep dive** — `--debug` implies headed mode, disables timeouts (so you can think without the test dying), and pauses before each action. You can also drop `await page.pause()` anywhere in a test to open the Inspector at exactly that point with the app in its real mid-test state — often the fastest way to develop the next few lines of a test interactively. The live-edit loop for locators is the practical superpower: instead of guess-run-fail cycles, you converge on a working locator in seconds against the actual DOM.

**Follow-ups & traps**
- "How is `page.pause()` different from a breakpoint?" — It pauses the *Playwright script* and hands you the Inspector plus a live browser; a Node breakpoint pauses JS but gives no browser-aware tooling.
- Trap: thinking Inspector works on CI failures — it needs a live run; that's Trace Viewer's territory (Q4).
- "Locator picking?" — 'Pick locator' suggests role-based locators first, mirroring Playwright's recommended priorities.

**One-liner** — The Inspector is the live debugger: step through actions, pause anywhere with `page.pause()`, and iterate locators against the real DOM in real time.

### Q4. Trace Viewer vs Inspector — when do you use each?

**Interview answer** — Direction of time: Trace Viewer looks backwards at a run that already happened — post-mortem on CI failures, evidence for flakes; the Inspector works on a run happening now — writing new tests, fixing a locator, exploring app state mid-flow. CI failure: trace. Local development or "why won't this locator match": Inspector. They complement rather than compete.

**Deep dive** — The deciding constraint is reproducibility. If a failure reproduces locally, the Inspector's live loop is faster — poke the real DOM interactively. If it only fails on CI or once per fifty runs, you cannot "step through" it by definition; the trace *is* the reproduction. Mature workflow: trace explains a CI failure → you form a hypothesis → reproduce locally with the Inspector to confirm and fix → verify with `--repeat-each`.

**Follow-ups & traps**
- "Can you trace locally too?" — Absolutely: `npx playwright test --trace on` on a local run gives you both worlds; useful when a local failure is too fast to observe live.
- Trap: trying to debug a once-in-fifty flake by re-running with `--debug` and hoping — the flake won't perform on demand; collect traces instead.

**One-liner** — Trace Viewer is the rear-view mirror for runs that already failed; the Inspector is the steering wheel for runs happening now.

### Q5. How do you debug Playwright tests generally?

**Interview answer** — Escalating toolbox: for quick looks, `--headed` with `--slow-mo` to watch the run; for interactive work, `--debug` or a `page.pause()` at the suspect line; for iterative development, `--ui` mode or the VS Code extension with breakpoints; for anything data-related, console and network listeners or a trace even locally. The choice depends on whether I need to *watch* it, *steer* it, or *inspect its data*.

**Deep dive** — UI mode (`npx playwright test --ui`) is effectively a live trace viewer with a watch loop: timeline, DOM snapshots, and network for every local run, re-running on file save — for test authoring it has largely replaced headed-plus-slowMo for me. Listener-based debugging catches what the eye can't: `page.on('console')` surfaces app errors that never render visibly, `page.on('pageerror')` catches uncaught exceptions, `page.on('response')` filtered to non-2xx exposes silent API failures — three lines that turn an opaque timeout into a labeled root cause.

```ts
// Temporary diagnostic listeners while hunting a local failure
page.on('console', (m) => m.type() === 'error' && console.log('APP ERROR:', m.text()));
page.on('pageerror', (e) => console.log('UNCAUGHT:', e.message));
page.on('response', (r) => !r.ok() && console.log('HTTP', r.status(), r.url()));
```

**Follow-ups & traps**
- "First move on a timeout failure?" — Read *which* actionability condition never became true (visible? enabled? stable?) from the error, then look at that moment in UI mode or a trace — not "add waitForTimeout and see."
- Trap: sprinkling `waitForTimeout` as a debugging tool — it changes the timing you're trying to observe.
- "Debugging in CI?" — You don't; you make CI emit artifacts (Q6) and debug from those.

**One-liner** — Watch it (`--headed`/UI mode), steer it (`--debug`, `page.pause()`), or instrument it (console/network listeners, traces) — pick by what the failure hides.

### Q6. A CI failure gives insufficient information — what do you enable?

**Interview answer** — The artifact trio in config: `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'` — then make the CI pipeline upload `test-results/` and the HTML report on failure, because artifacts that die with the runner never happened. On top, I add structure to the tests themselves: `test.step()` so the report shows which logical phase died, and `testInfo.attach()` for domain evidence like the request ID or seeded order payload.

**Deep dive** — Each artifact answers a different question: trace — what did the browser see and do (the primary tool); screenshot — instant visual state at failure, cheap to skim; video — motion/animation issues traces don't convey. Steps change failure legibility: "checkout › step 'submit payment' failed" beats a bare locator error mid-file. Attachments carry test-domain context CI can't infer — correlation IDs to grep server logs, the exact API payload used for seeding. The last mile is pipeline wiring: `if: failure()` artifact upload with sensible retention, and the HTML report published somewhere clickable.

```ts
await test.step('submit payment', async () => {
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
await testInfo.attach('order-context', {
  body: JSON.stringify({ orderId, correlationId }),
  contentType: 'application/json',
});
```

**Follow-ups & traps**
- "Why not video always-on?" — Big artifacts, meaningful runtime cost, and 95% of questions are answered better by the trace; retain-on-failure bounds the cost.
- Trap: enabling artifacts but not uploading them — the config looks right and you still have nothing when it matters.
- "What about server-side context?" — Correlation IDs in attachments plus a header injected via route/fixture, so the app logs are greppable per test.

**One-liner** — Trace, screenshot, and video on failure, uploaded — plus `test.step` for structure and attachments for the IDs that link browser evidence to server logs.

### Q7. How do you debug flaky tests specifically?

**Interview answer** — Flakes need statistics plus evidence, not single re-runs. Reproduce under pressure: `--repeat-each=30` and a high `--workers` count to force contention, since many flakes are load-dependent. Collect traces from both a passing and a failing run of the same test and diff them — same actions, different data or timing — the divergence point is the bug. `--last-failed` tightens the iteration loop to just the suspects.

**Deep dive** — Pass/fail trace comparison is the technique that actually closes hard flakes: line the runs up action by action; where they diverge, look at network ordering and payloads. Typical finds: two API responses whose order differs between runs (app race), a spinner that dismissed earlier in the failing run (missing wait condition being masked by timing), data present in pass but absent in fail (isolation bug). Because the flake might only occur under CI's slower CPU, reproduce with throttled resources or just run the repeat-each loop *in* CI with `retain-on-failure` tracing switched on temporarily.

```bash
npx playwright test orders.spec.ts --repeat-each=30 --workers=8 --trace retain-on-failure
npx playwright test --last-failed --trace on
```

**Follow-ups & traps**
- "It passes 30 times locally — done?" — No: local ≠ CI environment (CPU, headless, network). Run the repetition in CI before declaring victory.
- Trap: "fixed" by adding a `waitForTimeout(2000)` — you've reshaped the race's probability, not removed it; it returns on slower hardware.
- "Whole flaky-suite strategy?" — That's a program (quarantine, tracking, prevention) — covered in the flaky-tests file.

**One-liner** — Force flakes out with repetition and contention, then diff a passing trace against a failing one — the divergence point names the bug.

### Q8. How do you do visual regression testing?

**Interview answer** — `await expect(page).toHaveScreenshot('checkout.png')` — first run generates a baseline, later runs compare pixels and fail with a visual diff on mismatch; intentional changes re-baseline with `--update-snapshots`. The engineering is in stability: mask dynamic regions like avatars and dates, tune `maxDiffPixels`/`maxDiffPixelRatio`/`threshold` for acceptable variance, disable animations, and — critically — only compare baselines produced on the same platform, which usually means visuals run in Docker/CI only.

**Deep dive** — The cross-platform problem is fundamental: font rasterization and antialiasing differ between macOS, Windows, and Linux, so a macOS-generated baseline diffs against a Linux CI render everywhere text exists. Playwright encodes platform into the snapshot filename (`checkout-chromium-linux.png`), which prevents accidental cross-comparison but means you must *generate* baselines in the CI image — the standard workflow is updating snapshots via a container matching CI, or a dedicated CI job that commits refreshed baselines. Stability toolkit: `mask: [locator]` blanks dynamic elements; `stylePath` injects CSS to hide/normalize (kill animations, hide ads); `animations: 'disabled'` is on by default for `toHaveScreenshot`; `threshold` sets per-pixel color tolerance (YIQ), while `maxDiffPixels`/`maxDiffPixelRatio` cap how many pixels may differ.

```ts
await expect(page).toHaveScreenshot('order-summary.png', {
  mask: [page.getByTestId('user-avatar'), page.getByTestId('order-date')],
  maxDiffPixelRatio: 0.01,
  fullPage: true,
});
```

**Follow-ups & traps**
- "Screenshots differ between your laptop and CI — why?" — Font rendering per platform. Expected; fix by single-platform baselines (Docker), not by cranking thresholds.
- Trap: raising `maxDiffPixelRatio` until green — at 5% tolerance you're not doing visual testing anymore.
- "Element vs full page?" — `expect(locator).toHaveScreenshot()` scopes to a component: smaller, stabler, usually the better default.
- "Baseline update discipline?" — Diffs reviewed in PR like code; auto-updating baselines on failure defeats the entire mechanism.

**Senior/lead angle** — I keep visual coverage narrow and intentional — design-system components and money pages — because every baseline is a maintenance liability with a false-positive tax; a hundred full-page screenshots is how teams learn to ignore red visual checks.

**One-liner** — `toHaveScreenshot` with masks and tight thresholds, baselines generated only in the CI platform, updates reviewed like code.

### Q9. How do you do accessibility testing?

**Interview answer** — `@axe-core/playwright`: build an `AxeBuilder` with the page, optionally scope with `include`/`exclude` or filter by WCAG tags, run `analyze()`, and assert `violations` is empty. I run it per key page/state — including states like open modals — as part of the functional suite. And I say honestly what it covers: automated scans catch the mechanical layer — missing labels, contrast, ARIA misuse — which is roughly a third to half of accessibility issues; keyboard traps, focus order sense, and screen-reader experience still need humans.

**Deep dive** — Axe evaluates the rendered DOM against WCAG-mapped rules, so it must run *after* the state under test is fully rendered — scan the modal while it's open. Useful levers: `.withTags(['wcag2a', 'wcag2aa'])` to pin the standard; `.disableRules([...])` for documented, ticketed exceptions rather than silent ignores; attaching the violations JSON to the report so failures are actionable. A useful complement in Playwright itself: role-based locators are a passive a11y check — if `getByRole('button', { name: 'Pay now' })` can't find your button, assistive tech probably can't either.

```ts
import AxeBuilder from '@axe-core/playwright';

test('checkout page has no serious a11y violations', async ({ page }) => {
  await page.goto('/checkout');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('#third-party-chat-widget')
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**Follow-ups & traps**
- "Zero violations means accessible?" — No — it means no *automatically detectable* violations. Claiming a clean axe scan equals WCAG compliance is the classic overreach.
- Trap: scanning only initial page loads — modals, expanded menus, and error states are where violations hide.
- "New violations in legacy apps?" — Snapshot current violations as a baseline and fail on *new* ones; ratchet down over time.

**One-liner** — AxeBuilder per page-state with WCAG tags catches the mechanical layer; keyboard and screen-reader truth still needs a human.

### Q10. How do you run tests across browsers, and why does WebKit matter?

**Interview answer** — Projects in config: one project per engine — Chromium, Firefox, WebKit — sharing the same test code, run together by default or individually with `--project=webkit`. WebKit matters because it's the engine behind Safari, and every iPhone browser is WebKit under the hood regardless of its name — so for most consumer products WebKit is a huge user share, and it's the engine most likely to behave differently: dates, flexbox edge cases, input events, autoplay and storage policies.

**Deep dive** — Playwright's cross-browser story is patched builds of all three engines driven over uniform protocols — real engine coverage, unlike Chrome-only tools. Projects also carry config variation beyond engines (viewports, locales, base URLs), and a pragmatic matrix beats a uniform one: full suite on Chromium every commit; WebKit and Firefox on the critical-path subset per merge or nightly. When a test fails on WebKit only, that's the feature *working*: triage whether it's an app bug (often is), an engine behavioral difference to handle, or a test assumption (e.g. timing masked by Chromium's speed).

```ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Follow-ups & traps**
- "Is Playwright's WebKit the same as real Safari?" — Same engine, not the same product: no Safari UI layer or Apple service integration. Engine-level bugs reproduce; Safari-app-specific quirks may not.
- Trap: running everything on all three browsers "for safety" — triples cost while most tests exercise zero engine-specific behavior; be intentional.
- "Skipping one browser for a known engine gap?" — `test.skip(browserName === 'webkit', 'reason + ticket')` — documented, linked, temporary.

**One-liner** — One project per engine over shared tests; WebKit earns its place because every iOS browser is Safari's engine wearing a different icon.

### Q11. How do you test mobile and responsive behavior?

**Interview answer** — Device emulation via the `devices` registry: `devices['iPhone 14']` sets viewport, device-scale factor, user agent, touch support, and `isMobile` in one preset, as a project or per-file `test.use`. That covers responsive layout, mobile-specific UI paths, and touch interactions. I'm honest about limits: it's engine-accurate rendering at mobile dimensions, not a real device — no true device performance, no native keyboard quirks, no iOS Safari toolbar behavior — so emulation carries responsive/functional coverage and a small real-device pass covers the rest.

**Deep dive** — What the preset actually flips: viewport dimensions; `deviceScaleFactor` (DPR — matters for image-density logic and screenshots); UA string (server- and client-side UA sniffing paths); `hasTouch` (enables touch events — apps often bind different handlers); `isMobile` (viewport meta handling and mobile browser chrome behavior, Chromium/WebKit). The honest gap list interviewers want: CPU/memory of real phones (mobile perf issues won't show), gesture fidelity beyond basic taps, and OS-level integrations. Rule of thumb: breakpoints and mobile flows in emulation on every CI run; a lean real-device suite (cloud device farm) for release confidence on the money path.

```ts
export default defineConfig({
  projects: [
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});

test('mobile nav collapses into a menu button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).tap();
  await expect(page.getByRole('navigation')).toBeVisible();
});
```

**Follow-ups & traps**
- "Is this real mobile testing?" — Real engine at mobile dimensions with touch — excellent for responsive logic, not a substitute for device-farm sanity on critical flows. Claiming it replaces real devices is the trap.
- Trap: setting only `viewport` and calling it mobile — without `hasTouch`/UA/DPR you miss touch handlers and UA-dependent paths.
- "tap() vs click()?" — `tap()` needs `hasTouch: true` and exercises touch events; use it in mobile projects to hit the handlers users hit.

**One-liner** — `devices[]` presets emulate viewport, UA, touch, and DPR on a real engine — full responsive coverage, honest about not being a phone.

### Q12. `page.evaluate()`, `addInitScript()`, `exposeFunction()` — when and why?

**Interview answer** — Three escape hatches into the browser's JS context. `page.evaluate()` runs a function inside the page now — for reading app state the DOM doesn't expose or doing setup like seeding localStorage. `addInitScript()` registers code to run *before any page script* on every navigation — the tool for stubbing browser APIs like `Date` or `Math.random` before the app can capture them. `exposeFunction()` goes the other way: publishes a Node function callable from the page, so page-side events can call back into test code.

**Deep dive** — The boundary is serialization: arguments and return values cross process boundaries as serialized values, so no DOM nodes or closures over test scope — a classic misunderstanding is trying to use a test variable inside the evaluate callback without passing it as an argument. `addInitScript`'s timing guarantee (pre-page-scripts, every navigation) is exactly what stubbing needs — an `evaluate` after load is too late because the app already read the real value at startup. Legit SDET uses: evaluate — read a Redux/analytics buffer, set feature flags in localStorage before reload; initScript — freeze randomness for deterministic UI, though for time specifically `page.clock` is now the purpose-built tool; exposeFunction — capture analytics/beacon calls into a test-side array for assertion.

```ts
// Seed a feature flag before the app boots
await page.addInitScript(() => localStorage.setItem('features', JSON.stringify({ newCheckout: true })));

// Read app state not visible in the DOM (argument passed explicitly across the boundary)
const itemCount = await page.evaluate((key) => (window as any).__APP_STATE__.cart[key].length, 'items');
expect(itemCount).toBe(2);

// Let the page report analytics events into the test
const events: string[] = [];
await page.exposeFunction('recordEvent', (name: string) => events.push(name));
```

**Follow-ups & traps**
- "Why did my evaluate throw 'x is not defined'?" — Closure over test-scope variables doesn't cross the boundary; pass values as the second argument.
- Trap: driving the UI through `evaluate` (calling app functions to "click") — bypasses actionability and event reality; escape hatches are for state and observation, not interaction.
- "initScript vs evaluate for stubbing?" — initScript runs pre-app on every navigation; evaluate-after-load is too late for anything the app reads at startup.

**One-liner** — Evaluate reads/sets page state now, initScript plants code before the app boots, exposeFunction lets the page call the test — state and observation, never interaction.

### Q13. What is the VS Code extension / UI mode watch workflow?

**Interview answer** — Both give a tight authoring loop. The VS Code extension runs tests from the editor gutter with real breakpoints in test code, live locator picking against a browser, and error display inline. UI mode (`npx playwright test --ui`) is a standalone app with the test list, a watch toggle that re-runs on save, and — its best part — full trace-style time-travel (DOM snapshots, network, console) for every local run, not just failures.

**Deep dive** — The practical division: VS Code extension when I want debugger semantics — breakpoints, variable inspection, stepping through *test* code; UI mode when I want run-observation semantics — what did the browser and network do, re-running continuously while I edit. Watch mode changes authoring economics: save, see the new locator resolve against a live snapshot, adjust — a seconds-long loop that replaces the old minutes-long run-fail-reread cycle.

**Follow-ups & traps**
- "UI mode vs Trace Viewer?" — Same inspection engine; UI mode wraps it around a live watch/run loop while Trace Viewer opens saved zips from past (usually CI) runs.
- Trap: not knowing either exists and describing print-statement debugging — dated answer for a 2026 interview.

**One-liner** — VS Code extension for breakpoint debugging of test code; UI mode for watch-loop authoring with time-travel on every run.

### Q14. How deep does emulation go — locale, timezone, geolocation, color scheme?

**Interview answer** — Context-level options cover the environment axes: `locale` (language, number/date formatting), `timezoneId` (an IANA zone the page's Date and Intl APIs live in), `geolocation` plus a granted `geolocation` permission (coordinates the app reads), and `colorScheme` for light/dark. Because they're context options they work per project or per file — a matrix of markets and themes with zero app changes.

**Deep dive** — These bite in real products: timezone bugs are perennial (a booking app showing departure times in the tester's zone instead of the airport's — only findable by pinning `timezoneId` to something far from your CI's zone); locale drives Intl formatting, so price and date assertions must match the emulated locale, not your keyboard's; geolocation requires the permission grant or the app gets a denial — itself a state worth testing deliberately. `colorScheme: 'dark'` pairs with visual snapshots for dark-mode regression. Geo-based pricing example:

```ts
test.use({
  geolocation: { latitude: 28.6139, longitude: 77.209 }, // Delhi
  permissions: ['geolocation'],
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
});

test('shows INR pricing for users located in India', async ({ page }) => {
  await page.goto('/flights?from=DEL&to=BOM');
  await expect(page.getByTestId('price-currency').first()).toHaveText('₹');
  await expect(page.getByTestId('departure-time').first()).toContainText('IST');
});
```

**Follow-ups & traps**
- "Change geolocation mid-test?" — `context.setGeolocation(...)` — e.g. simulate a user crossing a delivery-zone boundary.
- Trap: forgetting `permissions: ['geolocation']` — the app receives permission-denied and the test asserts against the fallback UI without realizing it.
- "Locale vs Accept-Language?" — `locale` sets both the header and JS-visible language/Intl behavior; hand-setting only the header misses the client side.

**One-liner** — Locale, timezone, geolocation, and color scheme are context options — a full market/theme matrix per project, with permission grants as the easy-to-forget half.
