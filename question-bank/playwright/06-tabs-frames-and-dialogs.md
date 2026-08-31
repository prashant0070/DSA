# Multiple Tabs, Frames & Dialogs

Multi-page flows, iframes, and browser dialogs are where most flaky Playwright suites are born, and interviewers know it. This file covers the canonical patterns for new tabs and popups, frame handling with `frameLocator`, and the auto-dismiss behavior of dialogs that trips up nearly everyone at least once.

- Q1. Library API vs test runner: launching browsers manually
- Q2. Handling multiple tabs/pages in one context
- Q3. The canonical new-tab pattern: wait before click
- Q4. `popup` event vs context `page` event
- Q5. Reliably validating a newly opened page
- Q6. `window.open` popups and OAuth popup flows
- Q7. Handling iframes with `frameLocator`
- Q8. `frameLocator()` vs `page.frame()`
- Q9. Handling alerts, confirms, and prompts — the auto-dismiss trap
- Q10. The `beforeunload` dialog
- Q11. Non-web popups: file pickers, print dialogs, basic auth
- Q12. Closing pages and contexts properly

### Q1. How do you launch and manage browsers manually with the library API vs letting the test runner manage them?

**Interview answer** — Playwright ships as two layers: the core library, where I explicitly call `chromium.launch()`, `browser.newContext()`, and `context.newPage()`, and the test runner, where the `browser`, `context`, and `page` fixtures do all of that for me. In tests I almost always let the runner manage lifecycles because it handles isolation, parallelism, teardown, and tracing. I reach for the library API only for scripts outside the runner — scraping jobs, health checks, or custom tooling.

**Deep dive** — The runner creates one browser per worker process and a fresh context per test, which is what gives you test isolation for free. If you launch browsers manually inside runner tests, you lose fixture-managed teardown, trace collection, and the config's `use` options, and you can easily leak processes. The hierarchy matters: a `Browser` is a heavyweight OS process, a `BrowserContext` is a cheap in-memory incognito profile, and a `Page` is a tab. The runner exploits this by reusing the expensive browser and recreating only the cheap context.

**Code**

```ts
// Library API — standalone script, you own the lifecycle
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: 'https://shop.example.com' });
const page = await context.newPage();
await page.goto('/orders');
console.log(await page.getByRole('heading', { name: 'Your Orders' }).textContent());
await context.close();
await browser.close();
```

```ts
// Test runner — fixtures manage everything
import { test, expect } from '@playwright/test';

test('orders page loads', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Your Orders' })).toBeVisible();
});
```

**Follow-ups & traps**
- "When would you create an extra context inside a runner test?" — multi-user scenarios (buyer and seller chatting), still via the `browser` fixture, and close it yourself.
- Wrong answer: "I launch a browser in `beforeAll` for speed." The runner already reuses one browser per worker; manual launching just breaks isolation.
- "What's the difference between a context and a browser?" — candidates who say "basically the same" fail; context creation is milliseconds, launch is seconds.

**One-liner** — Let the runner own browser/context/page in tests; use `chromium.launch()` only in standalone scripts where no runner exists.

### Q2. How do you handle multiple tabs/pages in Playwright?

**Interview answer** — Every tab is a `Page` inside a `BrowserContext`, and `context.pages()` returns all of them. Pages I open myself I just keep in variables; pages the app opens I capture through the `page` or `popup` events. Each `Page` is fully independent — I can interact with several in one test without switching "focus", because Playwright doesn't have Selenium's single-active-window model.

**Deep dive** — There is no `switchTo().window()` in Playwright. Every `Page` object is a live handle you can act on at any time, even when the tab isn't focused — actions work on background tabs because Playwright talks to the browser over CDP/protocol, not through simulated OS input. `context.pages()` reflects the current set in creation order. The main event to know is `context.on('page')`, which fires for every new page in the context regardless of how it was opened.

**Code**

```ts
test('compare two product tabs', async ({ context }) => {
  const productA = await context.newPage();
  await productA.goto('/products/laptop-15');
  const productB = await context.newPage();
  await productB.goto('/products/laptop-17');

  // Both pages are usable simultaneously — no "switching"
  await expect(productA.getByTestId('price')).toHaveText('$1,299');
  await expect(productB.getByTestId('price')).toHaveText('$1,599');
  expect(context.pages()).toHaveLength(3); // default page + two we opened
});
```

**Follow-ups & traps**
- "How do you switch to the new tab?" — trick question; you don't switch, you hold both handles. Answering with a Selenium-style loop over window handles signals shallow Playwright knowledge.
- Wrong answer: polling `context.pages()` in a loop to detect a new tab — use `context.waitForEvent('page')` instead.
- "Do actions on a background tab work?" — yes; visibility of the tab is irrelevant to locator actions.

**One-liner** — Tabs are just `Page` objects you hold references to; there is no window switching in Playwright.

### Q3. How do you handle a button that opens a new tab? What's the canonical pattern and why?

**Interview answer** — The canonical pattern is: start waiting for the page *before* clicking. I create the promise with `context.waitForEvent('page')` — or `page.waitForEvent('popup')` — without awaiting it, then click, then await the promise. If you click first and only then start waiting, the new page can be created before your listener exists, and you either hang until timeout or miss it entirely. Starting the wait first eliminates that race.

**Deep dive** — `waitForEvent` registers a listener and returns a promise that resolves on the next matching event. Events are not buffered: if the `page` event fires before anyone is listening, it's gone. A fast `target="_blank"` link can open the tab within milliseconds of the click — often before the click's own promise resolves — so `await click(); await waitForEvent(...)` is a genuine race, not a theoretical one. The correct shape (`const p = waitForEvent(); await click(); const newPage = await p`) guarantees the listener is installed before the browser can emit the event. `Promise.all` is the same idea written differently.

**Code**

```ts
test('invoice opens in a new tab', async ({ page, context }) => {
  await page.goto('/orders/1042');

  // 1. Start listening BEFORE the action — do not await yet
  const pagePromise = context.waitForEvent('page');
  // 2. Trigger the new tab
  await page.getByRole('link', { name: 'View invoice' }).click();
  // 3. Now await the captured page
  const invoicePage = await pagePromise;

  await invoicePage.waitForLoadState();
  await expect(invoicePage.getByRole('heading', { name: 'Invoice #1042' })).toBeVisible();
});
```

**Follow-ups & traps**
- "Why not click first and then wait?" — the event may fire before the listener exists; events aren't replayed. This is the core of the question — explain the race, not just the syntax.
- Wrong answer: `await page.waitForEvent('popup'); await click()` — awaiting *before* the click deadlocks: the wait blocks and the click never happens.
- "Could you use `Promise.all([waitForEvent, click()])`?" — yes, semantically identical; the promise is created before the click runs.
- "What if the click sometimes doesn't open a tab?" — guard with a predicate or timeout, or branch the test; don't blanket-catch the timeout.

**Senior/lead angle** — This wait-before-act shape generalizes: `waitForRequest`, `waitForResponse`, `waitForEvent('download')`, `waitForEvent('dialog')` all have the same race if started after the trigger. In review, any `await action(); await waitForX()` sequence is a flake waiting to be filed.

**One-liner** — Create the `waitForEvent('page')` promise before the click and await it after — listeners must exist before events fire.

### Q4. What's the difference between the `popup` event and the context's `page` event?

**Interview answer** — `page.on('popup')` fires only for pages opened *by that specific page* — `window.open` or `target="_blank"` from it. `context.on('page')` fires for *every* new page in the context, whatever opened it, including tabs my test creates with `context.newPage()`. I use `popup` when I care about a popup caused by a known opener page, and the context event when I need to catch anything.

**Deep dive** — A popup has an opener relationship: `popup.opener()` returns the page that spawned it, and the pages may share a browsing context group (relevant for `window.opener` scripting in OAuth flows). Both events fire for the same popup — a `window.open` triggers `popup` on the opener *and* `page` on the context. The practical distinction is scoping in parallel or multi-page tests: the context event can capture an unrelated page opened elsewhere, while `popup` on a specific page can't.

**Code**

```ts
// Scoped: only popups from this page
const popupPromise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Open size chart' }).click();
const sizeChart = await popupPromise;

// Broad: any new page in the context
const pagePromise = context.waitForEvent('page');
```

**Follow-ups & traps**
- "Does `context.newPage()` fire the `popup` event?" — no, only the context's `page` event; there's no opener.
- "How do you find which page opened a popup?" — `await popup.opener()`; returns `null` for pages with no opener.
- Wrong answer: treating the two events as aliases — in a test juggling several pages, subscribing to the wrong scope captures the wrong page.

**One-liner** — `popup` is scoped to a specific opener page; the context's `page` event catches every new page from any source.

### Q5. How do you reliably validate a newly opened page?

**Interview answer** — After capturing the new page from the event, I remember it may still be mid-navigation — the event fires when the page is created, not when it's loaded. So I `await newPage.waitForLoadState()` or, better, lean on web-first assertions like `toHaveURL` and `toBeVisible`, which auto-retry and make the explicit wait often unnecessary. `bringToFront()` is only needed for the rare screenshot or focus-sensitive scenario, not for normal interaction.

**Deep dive** — The `page`/`popup` event resolves as soon as the browser creates the target, potentially at `about:blank` before the real URL commits. Asserting immediately against `newPage.url()` (a synchronous snapshot) is a classic flake; `expect(newPage).toHaveURL(...)` retries until the navigation lands. `waitForLoadState('load')` waits for the load event; `'domcontentloaded'` is a lighter option. Avoid `'networkidle'` in tests — it's discouraged in current Playwright because apps with polling or websockets never go idle. Since actions work on unfocused tabs, `bringToFront()` matters mainly for headed debugging and viewport-dependent screenshots.

**Code**

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Track shipment' }).click();
const tracking = await popupPromise;

await tracking.waitForLoadState();
await expect(tracking).toHaveURL(/carrier\.example\.com\/track/);
await expect(tracking.getByTestId('shipment-status')).toHaveText('In transit');
```

**Follow-ups & traps**
- "Why did `newPage.url()` return `about:blank`?" — you read it before navigation committed; use the retrying `toHaveURL` assertion.
- Wrong answer: sprinkling `waitForTimeout(2000)` after capturing the popup — web-first assertions already wait.
- "Is `bringToFront()` required to click on the new tab?" — no; that's a Selenium habit.

**One-liner** — The new-page event fires at creation, not load — validate with retrying assertions like `toHaveURL`, not synchronous reads.

### Q6. How do you handle `window.open` popups and OAuth popup flows?

**Interview answer** — Mechanically it's the same wait-before-click pattern: capture the popup via `page.waitForEvent('popup')`, interact with the provider's login form inside it, and the popup usually closes itself and signals the opener. For third-party OAuth (Google, GitHub), I try hard *not* to automate the real provider UI in CI — it's slow, rate-limited, and bot-protected. Instead I stub the provider with route interception, use a test IdP, or authenticate via API and reuse `storageState`, keeping one non-CI smoke test for the real flow if the business insists.

**Deep dive** — In a real OAuth popup flow, the popup navigates to the provider, the user authenticates, the provider redirects to your callback, and the callback page posts a message to `window.opener` and closes. In tests you can interact with the popup like any page, then `await popup.waitForEvent('close')` to know the handshake finished, and assert the opener's logged-in state. The reason to avoid the real provider: CAPTCHA and device checks are explicitly designed to defeat automation, and your suite's pass rate becomes hostage to a third party. Route-level stubbing of the authorize/token endpoints keeps the client-side flow under test without the external dependency.

**Code**

```ts
test('login via OAuth popup', async ({ page }) => {
  await page.goto('/login');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with AcmeID' }).click();
  const oauthPopup = await popupPromise;

  await oauthPopup.getByLabel('Email').fill('qa-buyer@example.com');
  await oauthPopup.getByLabel('Password').fill(process.env.OAUTH_TEST_PASSWORD!);
  await oauthPopup.getByRole('button', { name: 'Authorize' }).click();

  await oauthPopup.waitForEvent('close'); // popup closes itself on success
  await expect(page.getByTestId('account-menu')).toContainText('qa-buyer');
});
```

**Follow-ups & traps**
- "Would you automate real Google login in CI?" — the expected answer is no, with reasons (bot detection, 2FA, rate limits) and alternatives (stub, test IdP, API auth + storageState).
- Wrong answer: `page.waitForTimeout` while "the popup does its thing" — wait for the popup's `close` event or for the opener's UI change.
- "How do you know the popup finished?" — `popup.waitForEvent('close')` or a retrying assertion on the opener.

**Senior/lead angle** — Push the team toward testing *your* OAuth client integration (redirects, token handling, error states) against a stub, and cover the real provider with a scheduled, quarantined smoke job — never in the merge-blocking pipeline.

**One-liner** — Capture OAuth popups with the standard popup pattern, but in CI prefer stubbed providers or API auth over automating a real third-party login.

### Q7. How do you handle iframes in Playwright?

**Interview answer** — I use `page.frameLocator()` (or `locator.contentFrame()` in newer style) to scope locators into the iframe, then use normal `getByRole`/`getByTestId` inside it. It's lazy and auto-waiting like everything else — it resolves the frame at action time, so it survives the iframe reloading or being attached late. For nested iframes I just chain `frameLocator` calls. `page.frames()` exists but it's a lower-level snapshot API I rarely need in tests.

**Deep dive** — `frameLocator('iframe#payment')` doesn't search for the frame when created; it captures a selector and resolves it on each action, retrying until the iframe element exists *and* its content frame is available. That kills the classic Selenium failure mode where a frame handle goes stale after a reload — common with payment iframes (Stripe re-renders its frame). Chaining works because each `frameLocator` scopes the next: `page.frameLocator(a).frameLocator(b).getByRole(...)` walks two levels down. Playwright also auto-pierces frames for some operations, but explicit `frameLocator` keeps intent readable.

**Code**

```ts
test('pay with card inside Stripe iframe', async ({ page }) => {
  await page.goto('/checkout');

  const cardFrame = page.frameLocator('iframe[title="Secure card payment input frame"]');
  await cardFrame.getByPlaceholder('Card number').fill('4242424242424242');
  await cardFrame.getByPlaceholder('MM / YY').fill('12/28');
  await cardFrame.getByPlaceholder('CVC').fill('123');

  // Nested frame: widget inside a container iframe
  const chat = page.frameLocator('#support-widget').frameLocator('iframe.chat-body');
  await chat.getByRole('button', { name: 'Start chat' }).click();

  await page.getByRole('button', { name: 'Pay $89.00' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
```

**Follow-ups & traps**
- "The iframe reloads mid-test — does your frameLocator break?" — no; it re-resolves on each action. Saying "I'd re-acquire the frame" reveals a Selenium mental model.
- Wrong answer: `page.frame({ name: 'payment' })` as first choice — it returns `null` if the frame isn't there yet and doesn't auto-wait.
- "How do you assert inside an iframe?" — same web-first assertions on frame-scoped locators; nothing special.

**One-liner** — `frameLocator` scopes lazy, auto-waiting locators into an iframe and chains for nesting — no switching, no stale frames.

### Q8. `frameLocator()` vs `page.frame()` — when would you use each?

**Interview answer** — `frameLocator()` is the test-facing API: lazy, auto-waiting, selector-based, the default for interacting with iframe content. `page.frame()` returns a concrete `Frame` object by name or URL from the current frame tree — a snapshot with no waiting, which returns `null` if the frame hasn't attached yet. I use `Frame` objects only for frame-level operations a locator can't express, like `frame.url()`, evaluating script in a specific frame, or walking `page.frames()` diagnostically.

**Deep dive** — The difference mirrors `Locator` vs `ElementHandle`: one is a re-resolvable description, the other a pinned reference. A `Frame` dies when the iframe detaches or reloads, so holding one across navigation is a stale-reference bug. `frameLocator` can't answer "what is this frame's URL" or "how many frames exist" — those are legitimately `Frame`/`page.frames()` territory. In modern code, `locator.contentFrame()` and `frameLocator.owner()` convert between the element view and the frame-content view of the same iframe.

**Code**

```ts
// Interaction: frameLocator
await page.frameLocator('#kyc-widget').getByLabel('Document type').selectOption('passport');

// Introspection: Frame objects
const frame = page.frame({ url: /kyc-provider\.com/ });
expect(frame?.url()).toContain('session=');
console.log(page.frames().map(f => f.url())); // debugging the frame tree
```

**Follow-ups & traps**
- "Which one auto-waits?" — only `frameLocator`. `page.frame()` returning `null` in a race is a classic flake.
- Wrong answer: "they're interchangeable" — holding a `Frame` across an iframe reload breaks; a `frameLocator` doesn't.
- "How do you get from a frameLocator to its `<iframe>` element?" — `frameLocator.owner()`.

**One-liner** — Interact through `frameLocator` (lazy, auto-waiting); drop to `page.frame()`/`page.frames()` only for frame metadata and diagnostics.

### Q9. How do you handle JavaScript alerts, confirms, and prompts?

**Interview answer** — The critical fact: Playwright *auto-dismisses* all dialogs by default — if no `dialog` handler is registered, an `alert` is closed and a `confirm` is cancelled automatically, so tests don't hang. When I need to accept or interact, I register `page.on('dialog')` *before* the triggering action, then call `dialog.accept()` — with text for prompts — or `dialog.dismiss()`. The two traps are registering the handler too late and registering a handler that never accepts or dismisses, which then blocks the page.

**Deep dive** — Native dialogs are synchronous and block the page's JS execution, so Playwright must resolve them for the click that triggered them to complete. Auto-dismiss is why "my confirm dialog never appears" bug reports are usually working-as-designed: the dialog appeared and was instantly cancelled. Once you register any `dialog` listener, auto-dismiss turns off and *you* own resolution — a handler that only logs will hang the test. `dialog.type()` tells you which kind it is, `dialog.message()` gives the text to assert on, and `dialog.accept('value')` supplies prompt input. `page.once('dialog', ...)` is usually right, so the handler doesn't leak into later steps.

**Code**

```ts
test('deleting an order requires confirm', async ({ page }) => {
  await page.goto('/orders/1042');

  // Register BEFORE the action that triggers the dialog
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe('Delete order #1042? This cannot be undone.');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Delete order' }).click();
  await expect(page.getByText('Order #1042 deleted')).toBeVisible();
});

test('prompt for gift message', async ({ page }) => {
  page.once('dialog', dialog => dialog.accept('Happy birthday, Sam!'));
  await page.getByRole('button', { name: 'Add gift message' }).click();
  await expect(page.getByTestId('gift-note')).toHaveText('Happy birthday, Sam!');
});
```

**Follow-ups & traps**
- "What happens with no handler at all?" — auto-dismiss: alerts closed, confirms/prompts cancelled. Saying "the test hangs" is the classic wrong answer — that's Selenium behavior.
- "Why is your confirm being cancelled when you never wrote dismiss code?" — that *is* the default; register a handler that accepts.
- Trap: `on('dialog')` with a handler that neither accepts nor dismisses — now the page blocks forever.
- "Can you use `waitForEvent('dialog')`?" — yes, with the same wait-before-click ordering as popups.

**One-liner** — Playwright auto-dismisses dialogs unless you register `page.on('dialog')` before the trigger and explicitly accept or dismiss.

### Q10. How do you handle the `beforeunload` dialog?

**Interview answer** — The `beforeunload` confirmation ("leave site? changes may not be saved") only fires if I close the page with `page.close({ runBeforeUnload: true })` — by default Playwright closes pages without running unload handlers, so most tests never see it. To test it, I trigger the close with that flag, catch the `dialog` event, and accept to allow the close or dismiss to stay.

**Deep dive** — Browsers only show `beforeunload` after a user gesture, and Playwright's default `page.close()` intentionally bypasses unload prompts so teardown never hangs. With `runBeforeUnload: true`, `close()` returns without waiting for the page to actually close — the dialog may still be pending — so you handle the resulting dialog of type `'beforeunload'` and the page closes (or doesn't) based on accept/dismiss. In-page navigations that would trigger it are auto-dismissed like any other dialog unless handled. This is a niche question, but it's asked precisely because it distinguishes people who've tested unsaved-changes guards.

**Code**

```ts
test('warns about unsaved checkout notes', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Delivery notes').fill('Leave at reception');

  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss(); // stay on the page
  });
  await page.close({ runBeforeUnload: true });
  await expect(page.getByLabel('Delivery notes')).toHaveValue('Leave at reception');
});
```

**Follow-ups & traps**
- "Why does my `beforeunload` never fire in tests?" — default `close()` skips unload handlers; you must opt in.
- Wrong answer: asserting on the dialog's message text — browsers ignore custom `beforeunload` messages and show generic text.
- Note `close({ runBeforeUnload: true })` doesn't wait for the close to complete — assert the outcome, don't assume it.

**One-liner** — `beforeunload` only appears with `page.close({ runBeforeUnload: true })`, and you resolve it like any other dialog.

### Q11. How do you handle browser-level popups that are NOT web content — native file pickers, print dialogs, basic auth?

**Interview answer** — Native OS dialogs live outside the web page, so Playwright can't drive them like DOM — the strategy is always to intercept or avoid them. For file uploads I use `setInputFiles()` directly, or the `filechooser` event when a click is unavoidable — either way the native picker never opens. HTTP Basic auth is handled declaratively with `httpCredentials` on the context. Print dialogs and OS-level prompts I avoid by stubbing `window.print` or asserting the trigger rather than the dialog.

**Deep dive** — Playwright automates through the browser's debugging protocol, which ends at the web-content boundary; a native picker is an OS window with no DOM. `setInputFiles` sets the `<input type="file">` payload programmatically — including buffer-based uploads with no file on disk. The `filechooser` event intercepts the *intent* to open a picker (same wait-before-click pattern) and lets you supply files without any native UI. `httpCredentials` answers the 401 challenge at the network layer, so the auth dialog never renders. For `window.print`, stub it with `addInitScript` and assert it was called — you're testing your app's behavior, not Chrome's print UI.

**Code**

```ts
// Preferred: no picker involved
await page.getByLabel('Attach receipt').setInputFiles('fixtures/receipt.pdf');

// When only a button triggers the picker
const chooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Upload receipt' }).click();
const chooser = await chooserPromise;
await chooser.setFiles('fixtures/receipt.pdf');
```

```ts
// Basic auth — no dialog ever appears
export default defineConfig({
  use: {
    httpCredentials: { username: 'qa', password: process.env.STAGING_PASSWORD! },
  },
});
```

**Follow-ups & traps**
- "Can Playwright click OK on the OS file dialog?" — no, and explaining *why* (protocol ends at web content) scores better than just "no".
- Wrong answer: reaching for AutoIt/robotjs to drive native dialogs — fragile, headless-incompatible; the interviewer wants interception, not screen automation.
- "How do you upload a file that doesn't exist on disk?" — `setInputFiles({ name, mimeType, buffer })`.
- "Basic auth popup blocks the page — now what?" — `httpCredentials` in `use{}`; typing into that dialog is impossible.

**One-liner** — Native dialogs can't be automated — intercept the intent (`filechooser`, `httpCredentials`, stubs) so they never open.

### Q12. How do you close pages and contexts properly, and why does leaking contexts hurt parallel runs?

**Interview answer** — Anything the fixtures create, the runner closes; anything I create manually — `browser.newContext()`, `context.newPage()` — I close myself, ideally in a `finally` block or a custom fixture's teardown so it runs even on failure. Leaked contexts hold real browser resources — processes, memory, network sockets — and under parallel workers that accumulates fast: CI machines start swapping, tests slow down and time out, and you get flakiness that looks random but is really resource exhaustion.

**Deep dive** — Each context carries renderer state, cache, and open connections; a leaked one lives until the worker's browser dies, so in a long worker serving hundreds of tests, a per-test leak compounds. Multiply by `workers: 8` and a 2GB CI container tips over. Side effects beyond memory: leaked pages keep polling/websocket traffic hitting your backend and can hold locks or sessions (seat reservations, row locks) that collide with other tests' data. Videos and traces for a context are also finalized on close — leak the context and you can lose artifacts. The clean pattern is a fixture whose teardown closes what its setup opened, making leaks structurally impossible.

**Code**

```ts
// Fixture guarantees cleanup even when the test fails
const test = base.extend<{ sellerPage: Page }>({
  sellerPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: '.auth/seller.json' });
    const page = await context.newPage();
    await use(page);
    await context.close(); // teardown always runs
  },
});

test('buyer sees seller price update', async ({ page, sellerPage }) => {
  await sellerPage.goto('/listings/889/edit');
  await sellerPage.getByLabel('Price').fill('49.99');
  await sellerPage.getByRole('button', { name: 'Publish' }).click();

  await page.goto('/listings/889');
  await expect(page.getByTestId('price')).toHaveText('$49.99');
});
```

**Follow-ups & traps**
- "Closing a context vs closing its pages?" — `context.close()` closes all its pages; closing a page leaves the context alive.
- Wrong answer: cleanup written after the last assertion with no `finally`/fixture — it never runs on failure, exactly when you're rerunning most.
- "CI slowly gets flaky over a run — first suspects?" — resource leaks from manual contexts is a strong answer.

**Senior/lead angle** — Ban raw `browser.newContext()` inside test bodies via review or lint; require multi-user setups to go through fixtures. It converts "remember to clean up" into "can't forget".

**One-liner** — You close what you create — preferably in fixture teardown — because leaked contexts turn parallel CI into a slow, flaky memory leak.
