# Auto-Waiting & Actions

Waiting is where test suites live or die, and interviewers know it: most flaky-test war stories reduce to synchronization done wrong. This file covers Playwright's actionability model, the action APIs (fill, select, check, hover, drag, scroll), the full map of waiting mechanisms, and the scenario questions — pushing back on hard-coded sleeps, slow APIs, and "visible but not ready" UIs — that separate senior candidates.

- Q1. What is auto-waiting?
- Q2. What actionability checks run before an action?
- Q3. Why is waitForTimeout() not recommended — and how do you push back when asked to add one?
- Q4. fill() vs type()/pressSequentially() — which and when?
- Q5. How do you handle dropdowns?
- Q6. How do you handle checkboxes and radio buttons?
- Q7. How do you hover over an element?
- Q8. How do you do drag and drop?
- Q9. How do you handle dynamic elements?
- Q10. How does scrolling work in Playwright?
- Q11. What waiting mechanisms exist in Playwright? (the map)
- Q12. How do you wait for a URL change?
- Q13. How do you wait for an API/network response?
- Q14. domcontentloaded vs load vs networkidle — what's the difference?
- Q15. An element is visible but the app is still processing the previous action — how do you handle it without hard waits?
- Q16. An API sometimes takes 10–15 seconds and the UI test fails — how do you make it reliable?
- Q17. When is force: true acceptable, and why is it usually a smell?
- Q18. What keyboard and mouse APIs exist?

### Q1. What is auto-waiting?

**Interview answer** — Every Playwright action runs a set of actionability checks on its target — visible, stable, enabled, receives events, editable as applicable — and retries the whole find-and-check cycle until everything passes or the action timeout expires, then performs the action. So `click()` on a button that's still rendering, animating in, or briefly covered by a spinner just waits and succeeds; I don't write explicit waits before actions at all.

**Deep dive** — Two properties make this stronger than Selenium-style explicit waits. First, it's a retry loop over re-resolution: the locator re-queries the DOM each cycle, so re-renders can't stale the target between wait and act. Second, the checks model real user constraints — "receives events" performs a hit test at the click point to ensure nothing overlays the element, which catches the loading-overlay flake that visibility checks miss. Auto-waiting covers preconditions of an action, not its outcomes: it will wait for the Pay button to be clickable, but knowing the payment succeeded is the job of web-first assertions or network waits. That precondition/outcome split is the mental model interviewers want stated.

**Code**

```ts
// No explicit waits: click waits for the button to be visible, stable,
// enabled, and unobstructed; the assertion waits for the outcome.
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
```

**Follow-ups & traps**
- "So you never need waits in Playwright?" — Preconditions: never. Outcomes and non-action synchronization (navigation, network): you use assertions and wait helpers. The blanket "never" is a trap.
- "What happens when checks don't pass in time?" — TimeoutError carrying the actionability log — which check failed and why, per attempt.
- Trap: adding `waitForSelector` before every click — redundant with auto-waiting and a tell of Selenium habits.

**One-liner** — Every action retries visible/stable/enabled/receives-events checks until it can act like a real user could — preconditions are automatic; outcomes are your assertions' job.

### Q2. What actionability checks run before an action?

**Interview answer** — Five checks, applied per action type: **visible** — nonzero size and not display:none/visibility:hidden; **stable** — the element's position isn't changing between animation frames; **receives events** — a hit test confirms the element (not an overlay) gets the pointer event at the action point; **enabled** — not disabled; **editable** — enabled and not readonly, for text input. Clicks and checks run all of visible/stable/receives-events/enabled; `fill()` runs visible plus editable(which implies enabled); `hover()` skips enabled since you can hover disabled elements; pure keyboard/reading operations run few or none.

**Deep dive** — The per-action mapping is what's actually probed. Roughly: `click`/`dblclick`/`check`/`setChecked`/`selectOption` → visible, stable, receives events, enabled; `fill`/`clear`/`selectText` → visible, editable (enabled + not readonly); `hover` → visible, stable, receives events (no enabled); `pressSequentially`/`press` act on the focused element via the keyboard, so their entry point is focus rather than the full pointer checks; `screenshot` of a locator → visible, stable. "Stable" is defined as identical bounding box across two consecutive animation frames — the anti-flake for slide-in menus and transitions. "Receives events" is the subtle one: it fires an elementFromPoint-style check at the click coordinates, so a toast, backdrop, or sticky header covering the point blocks the action — correctly, because a user couldn't click through it either.

**Follow-ups & traps**
- "Test times out clicking a visible button — what does the error tell you?" — The actionability log names the failing check; classically "element receives pointer events" failing because an overlay intercepts — read the log before touching the test.
- "Does fill() require the element to be stable?" — No — fill's checks are visible + editable; stability is a pointer-action concern. Precision here scores.
- Trap: reciting "Playwright waits for the element to be present" — presence isn't the bar; a present-but-covered button still blocks. The five named checks are the expected vocabulary.

**One-liner** — Visible, stable, receives events, enabled, editable — clicks take the first four, fill takes visible+editable, hover skips enabled — and the failure log names exactly which check blocked.

### Q3. Why is waitForTimeout() not recommended — and how do you push back when asked to add one?

**Interview answer** — A fixed sleep is always wrong twice: too short on a slow day, so the test still flakes, and too long every other day, so the suite burns time — thousands of runs multiply five wasted seconds into hours. It also documents nothing: the next reader can't tell what condition the sleep was covering for. When a developer asks me to "just add waitForTimeout(5000)", I ask what we're actually waiting for — a response? a spinner? a render? — and encode that condition instead: `waitForResponse`, an assertion on the spinner detaching, or `toBeEnabled` on the next control. Same stability, deterministic, self-documenting, and fast on fast days.

**Deep dive** — The deeper argument is that sleeps convert a race condition into a probabilistic pass — the bug is still there, now hidden behind odds. Condition-based waits eliminate the race: they complete the instant the condition holds and fail loudly with a named condition when it never does, which is diagnostic gold compared to "failed after sleep." The pushback conversation is itself the assessed skill: it's collaborative ("help me name what we're waiting for"), and it usually surfaces something valuable — an endpoint the UI depends on, a missing loading state, sometimes a real front-end bug where the UI enables a button before it's safe to click. The only defensible `waitForTimeout` uses: temporary diagnosis while investigating, and genuinely time-based behavior like debounce intervals — narrow, commented, and ideally still replaced by outcome waits.

**Code**

```ts
// Requested: await page.waitForTimeout(5000); // "search is slow"
// Encoded condition instead — wait for the thing the sleep was hiding:
const results = page.waitForResponse(r => r.url().includes('/api/search') && r.ok());
await page.getByRole('searchbox', { name: 'Search' }).fill('espresso');
await results;
await expect(page.getByTestId('results-list').getByRole('listitem')).not.toHaveCount(0);
```

**Follow-ups & traps**
- "Is waitForTimeout ever OK?" — Debounce/throttle windows and throwaway debugging; anything else should name its condition. A flat "never" is less credible than the narrow exception.
- "The dev insists — the sleep 'works'." — Show cost: retries × suite runs × 5s, plus the flake that survives; offer to pair on finding the condition. Interviewers are testing the influence skill, not just the API.
- Trap: replacing the sleep with `networkidle` — trading one non-deterministic wait for another (see Q14).

**One-liner** — Sleeps are either too short or too long and always mute the real condition — ask "waiting for what?", then wait for that: a response, a detached spinner, an enabled button.

### Q4. fill() vs type()/pressSequentially() — which and when?

**Interview answer** — `fill()` is the default: it focuses the field, sets the value in one operation, and fires the input/change events frameworks listen for — fast and reliable. `type()` is deprecated; its replacement `locator.pressSequentially()` presses keys one at a time with real keydown/keypress/keyup per character, which you only need when the UI reacts per keystroke — autocomplete/typeahead suggestions, input masks, character counters, or custom key handlers. If someone's Playwright code still calls `type()`, that's a version-awareness flag.

**Deep dive** — The mechanism difference explains the rule: `fill()` sets the value programmatically and dispatches a synthesized `input` event — one DOM update, no key events at all; `pressSequentially()` drives the real keyboard pipeline, so per-key listeners (`keydown` handlers implementing masks or shortcuts) fire as with a human. Consequences: fill is immune to per-key timing issues and much faster; pressSequentially can interleave with app reactions (a suggestion dropdown re-rendering mid-word) and supports a `delay` option to emulate human pacing when a debounce needs distinct events. fill also clears existing content first — with pressSequentially you clear explicitly (`fill('')` or select-all + delete) or you're appending.

**Code**

```ts
// Default: fill
await page.getByLabel('Email').fill('qa@example.com');

// Typeahead needs real keystrokes to trigger suggestions
const destination = page.getByRole('combobox', { name: 'Destination' });
await destination.pressSequentially('Lisb', { delay: 80 });
await page.getByRole('option', { name: 'Lisbon, Portugal' }).click();
```

**Follow-ups & traps**
- "Why did fill() not trigger the autocomplete?" — The suggestion logic listens to key events fill never fires — the canonical probe for whether you know the mechanism, not just the names.
- "How do you clear a field?" — `fill('')` or `clear()`; pressSequentially appends to existing content — a real bug people write.
- Trap: recommending `type()` — deprecated; saying "type, I mean pressSequentially" gracefully is fine, teaching it as current API is not.

**One-liner** — fill() sets the value in one event and is the default; pressSequentially() (type's replacement — type is deprecated) sends real per-key events for typeaheads, masks, and key handlers.

### Q5. How do you handle dropdowns?

**Interview answer** — Two different problems. A native `<select>`: `selectOption()`, which picks by value, label, or index in one call and fires the change event. A custom dropdown — a styled div/listbox, which is most modern UIs — is just two clicks: open the trigger, then `getByRole('option', { name })` to pick, with auto-waiting covering the open animation.

**Deep dive** — `selectOption` only works on real `<select>` elements — calling it on a custom widget is the classic error, and recognizing which kind you're facing (inspect for `<select>` vs `role="listbox"`/`combobox`) is the first step. It supports `{ value }`, `{ label }`, `{ index }`, and arrays for multi-select. Custom dropdowns built accessibly expose `combobox`/`listbox`/`option` roles, making getByRole natural; poorly built ones (divs without roles) force testids and are worth an accessibility bug report. Verify selection outcome explicitly: `toHaveValue` for native, or asserting the trigger's new text for custom widgets.

**Code**

```ts
// Native <select>
await page.getByLabel('Country').selectOption({ label: 'Portugal' });
await expect(page.getByLabel('Country')).toHaveValue('PT');

// Custom dropdown (listbox pattern)
await page.getByRole('combobox', { name: 'Sort by' }).click();
await page.getByRole('option', { name: 'Price: low to high' }).click();
await expect(page.getByRole('combobox', { name: 'Sort by' })).toContainText('Price: low to high');
```

**Follow-ups & traps**
- "selectOption isn't working on this dropdown — why?" — It's not a `<select>`; it's a custom widget — the intended realization.
- "Multi-select?" — `selectOption(['PT', 'ES'])` on native; repeated option clicks on custom.
- Trap: keyboard-hacking a custom dropdown (arrow keys + Enter) as first resort — valid for testing keyboard a11y deliberately, clumsy as the default interaction.

**One-liner** — Native select → selectOption by value/label/index; custom dropdown → click the trigger, click the role=option — first diagnose which one you have.

### Q6. How do you handle checkboxes and radio buttons?

**Interview answer** — `check()` and `uncheck()` rather than `click()`: they're idempotent — checking an already-checked box is a no-op instead of a toggle-off — and they verify the state actually changed after acting. For data-driven code where desired state comes from a variable, `setChecked(bool)` maps directly. Radios: `check()` on the specific option. Assert with `toBeChecked()` / `not.toBeChecked()`.

**Deep dive** — Idempotency is the whole point: `click()` toggles relative to current state, so a test that assumes "unchecked" start silently inverts when state differs (retries, seeded data, defaults changed) — `check()` encodes the desired end state, not a transition. These methods also run full actionability plus a post-action verification that the input's checked state flipped, catching handlers that swallow the event. For custom-styled checkboxes where the real input is visually hidden, check() targeting the input generally still works since a11y-visible inputs qualify; fully custom `role="checkbox"` widgets accept check() too when they expose `aria-checked`.

**Code**

```ts
await page.getByLabel('Subscribe to newsletter').check();          // no-op if already on
await page.getByRole('radio', { name: 'Express shipping' }).check();
await page.getByLabel('Gift wrap').setChecked(order.giftWrap);     // state from data
await expect(page.getByLabel('Subscribe to newsletter')).toBeChecked();
```

**Follow-ups & traps**
- "Why check() over click()?" — Idempotent target-state semantics + built-in state verification; "they're the same" is the wrong answer being fished for.
- "Uncheck a radio?" — You don't — radios clear by selecting another option; API knowledge nuance.
- Trap: clicking the styled span wrapper instead of the labeled input — locate by label/role and the right element comes free.

**One-liner** — check/uncheck/setChecked declare the end state, no-op when already there, and verify the flip — click() toggles blindly and inherits whatever state it found.

### Q7. How do you hover over an element?

**Interview answer** — `locator.hover()` — it auto-waits for visible/stable/receives-events, moves the mouse to the element, and triggers the CSS and JS hover behavior. The typical pattern is hover to reveal, then act on what appeared: hover the menu, click the item that shows, with auto-waiting bridging the reveal animation.

**Deep dive** — Hover state persists only until the mouse moves again — a subsequent action elsewhere un-hovers, so hover-dependent assertions must happen before moving on. For nested hover menus, hover each level in sequence. Fine control exists via `hover({ position })` or `page.mouse.move()` for coordinate-sensitive UIs (canvas, sliders). One honest caveat: hover states don't exist on touch devices — in mobile-emulation projects, hover-revealed UI needs a different interaction path, which is an app-design conversation as much as a test one.

**Code**

```ts
await page.getByRole('button', { name: 'Account' }).hover();
await page.getByRole('menuitem', { name: 'Order history' }).click();
```

**Follow-ups & traps**
- "Tooltip assertion flakes — hover then expect fails sometimes." — Something moved the mouse (another action, scroll) before the assertion; keep hover→assert adjacent, and assert the tooltip's own locator (role=tooltip) which retries.
- Trap: dispatching synthetic `mouseover` via `dispatchEvent` as the default — a real hover through the pointer pipeline is what `hover()` does and what CSS `:hover` needs.

**One-liner** — locator.hover() with full actionability; hover then immediately act/assert on the revealed UI, and remember hover evaporates the moment the mouse moves on.

### Q8. How do you do drag and drop?

**Interview answer** — First choice: `source.dragTo(target)` — one call that hovers, presses, moves to the target, and releases, with actionability on both ends. When the app's drag logic needs intermediate movement events — HTML5 drag-and-drop libraries or physics-y sortable lists often do — the fallback is manual mouse composition: `hover`, `mouse.down()`, `mouse.move()` in steps, `mouse.up()`.

**Deep dive** — The `steps` parameter in `mouse.move(x, y, { steps: 10 })` is the key to the manual fallback: many drag libraries track `mousemove` deltas to compute drop position, and a single teleporting move event defeats them — stepped movement emulates a human path. `dragTo` options cover precision: `sourcePosition`/`targetPosition` offset within elements (dropping between list items rather than onto one). HTML5 native DnD (dragstart/dragover/drop events) is historically the flakiest corner across all tools; if the manual path also fights you, `page.dispatchEvent` with a DataTransfer payload is the documented low-level escape hatch — know it exists more than memorize it.

**Code**

```ts
// Preferred
await page.getByTestId('task-PAY-142').dragTo(page.getByTestId('column-done'));

// Manual fallback for libraries needing movement events
const card = page.getByTestId('task-PAY-142');
const done = page.getByTestId('column-done');
await card.hover();
await page.mouse.down();
const box = (await done.boundingBox())!;
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
await page.mouse.up();
await expect(done.getByTestId('task-PAY-142')).toBeVisible();
```

**Follow-ups & traps**
- "dragTo didn't move the card — no error, no move. Now what?" — Library needs intermediate mousemove events; switch to stepped manual mouse. The intended diagnosis.
- "How do you verify the drop?" — Assert new parentage/order (target contains the item), not just absence from source.
- Trap: sleeping between down and up — timing isn't the issue; movement events are.

**One-liner** — dragTo() first; if the drag library listens for movement deltas, fall back to hover → mouse.down → stepped mouse.move → mouse.up — and always assert the landing.

### Q9. How do you handle dynamic elements?

**Interview answer** — Mostly by doing nothing special: locators re-resolve at action time and auto-waiting absorbs late rendering, so elements that appear after API calls or animations just work. When I need explicit synchronization on presence or absence, web-first assertions are the tool — `toBeVisible()`, `toHaveCount()` — or `locator.waitFor({ state })` when there's no assertion to make, like waiting for a spinner to detach mid-flow.

**Deep dive** — The `waitFor` states are worth precise knowledge: `attached` (in DOM), `visible` (default — attached + visible), `hidden` (not visible or not in DOM), `detached` (removed from DOM). The high-value use is negative waits on transient elements: `spinner.waitFor({ state: 'detached' })` as a mid-flow sync point where an assertion would read awkwardly. Beyond that, "handling dynamic elements" is usually a locator-strategy question in disguise — dynamic IDs and repositioning content are solved by identity-based locators (role/name, filter by text), covered in the locators file. The anti-pattern being screened for: checking `isVisible()` in an if-statement as pseudo-synchronization — it's an instant, non-waiting snapshot and races the render.

**Code**

```ts
await page.getByRole('button', { name: 'Load more orders' }).click();
await expect(page.getByRole('listitem')).toHaveCount(20);            // assertion as sync

await page.getByTestId('loading-overlay').waitFor({ state: 'detached' }); // no assertion needed
```

**Follow-ups & traps**
- "isVisible() vs toBeVisible()?" — Instant boolean, no retry vs polling assertion — using the former for synchronization is the trap this question hunts.
- "Wait for an element to disappear?" — `not.toBeVisible()`/`toBeHidden()` or `waitFor({ state: 'detached' })`; know that hidden ≠ detached.
- Trap: `waitForSelector` habit — legacy page-level API; locator `waitFor` and assertions are current idiom.

**One-liner** — Locators plus auto-waiting handle appearance for free; synchronize explicitly with retrying assertions or waitFor states — and never gate logic on the instant isVisible() snapshot.

### Q10. How does scrolling work in Playwright?

**Interview answer** — Usually it doesn't need handling: actions auto-scroll the target into view as part of actionability, so clicking something below the fold just works. Explicit needs: `locator.scrollIntoViewIfNeeded()` when I want an element in view without acting on it — say, before a screenshot or to trigger lazy-loaded images — and `page.mouse.wheel(dx, dy)` for infinite-scroll feeds, where content only loads when a real scroll event fires at the viewport level.

**Deep dive** — The infinite-scroll case is the interesting one: there's no target element to act on — the next page of content doesn't exist yet — so element-based scrolling can't help; you emit wheel events (or `page.keyboard.press('End')`, or evaluate `window.scrollTo`) and synchronize on the outcome, typically `toHaveCount` growing or a sentinel element appearing, in a loop with a hard cap. Also worth knowing: scroll position can affect actionability indirectly — sticky headers overlapping a scrolled-to element cause receives-events failures, which is an app-layout issue the actionability log will surface.

**Code**

```ts
// Infinite scroll: scroll until the target order appears (bounded)
const target = page.getByRole('link', { name: 'ORD-0042' });
for (let i = 0; i < 15 && !(await target.isVisible()); i++) {
  await page.mouse.wheel(0, 1200);
  await page.waitForLoadState('networkidle').catch(() => {}); // best-effort settle
}
await target.click();
```

**Follow-ups & traps**
- "Why doesn't scrollIntoViewIfNeeded solve infinite scroll?" — The element to scroll to doesn't exist until scrolling loads it — chicken-and-egg; wheel/viewport scrolling is the answer sought.
- Trap: manual scrolls before ordinary clicks "to be safe" — auto-scroll already covers it; the habit signals not trusting/knowing actionability.
- "Element scrolled to but click still fails?" — Sticky header intercepts the point — read the receives-events failure in the log.

**One-liner** — Actions auto-scroll their targets; reach for scrollIntoViewIfNeeded for non-action visibility and mouse.wheel loops for infinite scroll, always synced on content actually loading.

### Q11. What waiting mechanisms exist in Playwright? (the map)

**Interview answer** — I organize them in layers. Implicit: auto-waiting inside every action. Assertions: web-first `expect(locator)` polling — the workhorse for outcomes. Element-state: `locator.waitFor({ state })`. Navigation: `waitForURL`, `waitForLoadState`. Network: `waitForResponse`/`waitForRequest` with predicates. Events: `waitForEvent` for popups, downloads, dialogs. Escape hatch: `waitForFunction` polling arbitrary page-side JS. And the anti-mechanism, `waitForTimeout`, which I avoid. Picking the right layer for the situation is the actual skill: element questions → assertions; data questions → network waits; everything as close to the real condition as possible.

**Deep dive** — The selection heuristic to articulate: wait on the most direct observable of the condition you care about. Waiting for a spinner to vanish as a proxy for "data loaded" is one remove from truth — the response predicate is the truth; asserting the rendered row is the user-level truth. Subscription-before-trigger is the shared discipline for the event/network layer: create the `waitForResponse`/`waitForEvent` promise before the click that causes it, or you race the event. `waitForFunction` is last-resort by design — it's powerful (any page-side predicate) but opaque in failure and easy to overuse where an assertion would do; a legit example is polling a JS global set by an analytics or feature-flag script.

**Code**

```ts
// Layered example: network truth + user-level truth
const orders = page.waitForResponse(r => r.url().includes('/api/orders') && r.ok());
await page.getByRole('link', { name: 'My orders' }).click();
await orders;                                             // data arrived
await page.waitForURL('**/orders');                       // navigation done
await expect(page.getByRole('row')).not.toHaveCount(0);   // user sees it
```

**Follow-ups & traps**
- "Which do you use most?" — Web-first assertions by far; explicit waits are for navigation/network/event edges. An answer centered on waitForFunction suggests inverted instincts.
- "Wait for a download?" — `page.waitForEvent('download')` before the click — event layer.
- Trap: presenting the list without a selection principle — the enumeration is table stakes; "closest observable to the condition" is the differentiator.

**One-liner** — Auto-wait for preconditions, assertions for outcomes, waitForURL/LoadState for navigation, waitForResponse/Event for data and side channels, waitForFunction as last resort — always wait on the closest observable of what you actually care about.

### Q12. How do you wait for a URL change?

**Interview answer** — Two idioms: `await expect(page).toHaveURL(/\/orders\/\d+/)` — a retrying assertion, my default when the URL is the thing being verified — and `await page.waitForURL('**/checkout/confirmation')` — a wait, natural mid-flow when subsequent steps need the navigation completed. Both take globs or regexes; actions that trigger navigation also auto-wait for it in simple cases, so these are for SPA route changes and multi-step redirects.

**Deep dive** — `waitForURL` also waits for a load state (default `'load'`, tunable via `waitUntil`), so it's "URL matches AND page reached state" — slightly stronger than the assertion, which checks URL only. SPA client-side routing (History API) is fully supported by both — no full page load required. For redirect chains (login → SSO → callback → app), match the final URL pattern; intermediate hops don't need enumeration. Relative URLs resolve against configured `baseURL`, which keeps specs environment-portable.

**Code**

```ts
await page.getByRole('button', { name: 'Place order' }).click();
await page.waitForURL('**/orders/*/confirmation');
await expect(page).toHaveURL(/orderId=\d+/);
```

**Follow-ups & traps**
- "toHaveURL vs waitForURL — pick one, why?" — Verification → assertion (reports as an expectation); flow-control mid-test → waitForURL (also awaits load state). Knowing both exist and differ slightly is the point.
- Trap: asserting `page.url()` with a plain expect — one-shot string check, races the navigation; the retrying forms exist precisely for this.

**One-liner** — toHaveURL to verify, waitForURL to sequence — both glob/regex-aware, SPA-aware, and retrying, unlike a one-shot check on page.url().

### Q13. How do you wait for an API/network response?

**Interview answer** — `page.waitForResponse()` with a predicate matching URL and status, and the critical discipline: create the wait promise before triggering the action, then await it after — otherwise the response can arrive in the gap and you wait forever for a repeat. This is the tool when the UI's readiness depends on specific data landing — search results, order submission acknowledgments — and it's more precise than any element-level proxy.

**Deep dive** — The race is the substance: `waitForResponse` only observes responses after subscription; click-then-subscribe means a fast server beats you to it, producing timeout flake that reproduces worst on the fastest environments — a nicely counterintuitive fact worth stating. Predicates can inspect method, URL, and status (`r.request().method() === 'POST' && r.ok()`); the resolved Response exposes `json()` for asserting payloads — which enables hybrid checks: UI shows success AND the API returned the right body. Sibling APIs: `waitForRequest` (the outbound side — useful for verifying analytics fired), and for gluing response arrival to render completion, follow the response wait with a normal locator assertion.

**Code**

```ts
const submitted = page.waitForResponse(
  r => r.url().endsWith('/api/orders') && r.request().method() === 'POST' && r.status() === 201
);
await page.getByRole('button', { name: 'Place order' }).click();
const response = await submitted;
const body = await response.json();
await expect(page.getByTestId('order-id')).toHaveText(body.orderNumber);
```

**Follow-ups & traps**
- "Why does the wait sometimes time out even though the call clearly happened?" — Subscribed after the response landed — the exact bug this question exists to check.
- "waitForResponse vs asserting the UI?" — Complementary layers: response = data truth, assertion = render truth; the strongest tests often chain both.
- Trap: matching on full URL with query strings hardcoded — predicates should match stably (path suffix, method), not brittle exact strings.

**One-liner** — Subscribe with a predicate BEFORE the triggering action, await after — waitForResponse gives you data-level truth, then a locator assertion confirms the render.

### Q14. domcontentloaded vs load vs networkidle — what's the difference?

**Interview answer** — They're the `waitUntil` milestones for navigation. `domcontentloaded`: HTML parsed, DOM built — earliest. `load`: all static resources (images, stylesheets) finished — the default. `networkidle`: no network connections for 500ms — latest, and explicitly discouraged for testing because modern apps rarely go network-silent: polling, websockets, analytics, and lazy-loading keep connections alive, so it either times out or waits far longer than needed. My practice: default `load`, and synchronize on what the test needs via locator assertions rather than page-global milestones.

**Deep dive** — The deprecation-in-spirit of networkidle reflects an architectural truth: page-global network silence is a proxy metric with no relationship to "the element I need is ready" — an SPA can be fully interactive while a long-poll keeps the network busy, or network-quiet while still rendering from memory. Web-first assertions made these milestones mostly irrelevant for readiness: `goto` with default `load`, then assert the specific element — the assertion polls through any remaining rendering. `domcontentloaded` earns use in perf-sensitive suites that then rely on assertions anyway, and as `waitUntil` for `goto` on pages with slow third-party resources you don't care about.

**Code**

```ts
await page.goto('/dashboard', { waitUntil: 'domcontentloaded' }); // don't wait on ad pixels
await expect(page.getByRole('heading', { name: 'Sales overview' })).toBeVisible(); // real readiness
```

**Follow-ups & traps**
- "Why is networkidle discouraged?" — 500ms of global network silence is undefined for apps with polling/websockets — non-deterministic waits or false timeouts; this exact articulation is what's tested.
- "So how do you know the page is 'ready'?" — Ready is per-element, not per-page: assert what you'll use — the modern-mindset answer.
- Trap: sprinkling `waitForLoadState('networkidle')` after every goto — the pattern this question is designed to catch.

**One-liner** — domcontentloaded = DOM parsed, load = resources done (default), networkidle = 500ms of silence that modern apps never reliably reach — synchronize on elements, not page milestones.

### Q15. An element is visible but the app is still processing the previous action — how do you handle it without hard waits?

**Interview answer** — Wait on the outcome of the previous action rather than the availability of the next target — visibility of the next button was never the right readiness signal. Depending on what "processing" means, that's: the mutation's response via `waitForResponse`, the spinner or overlay reaching `detached`, the button becoming genuinely enabled via `toBeEnabled`, or a status text via `toHaveText`. Some observable in the app distinguishes processing from done; the job is to find it and wait on it.

**Deep dive** — This scenario exposes the boundary of auto-waiting: actionability checks the target's state, and here the target looks fine — the pending state lives elsewhere (in-flight request, optimistic UI, a disabled-in-spirit-but-not-in-DOM button). If genuinely no observable distinguishes the states — the button is enabled and clickable while clicks are dropped — that's a front-end bug by definition: real users hit the same race. Filing it (with the trace as evidence) and getting a disabled state or spinner added is the correct resolution; papering over it with a sleep hides a user-facing defect. That reframing — flaky test as bug detector — is the senior move this question fishes for.

**Code**

```ts
// Add to cart triggers async recalculation before checkout is truly ready
const recalc = page.waitForResponse(r => r.url().includes('/api/cart/totals') && r.ok());
await page.getByRole('button', { name: 'Add to cart' }).click();
await recalc;                                                       // processing done: data truth
await expect(page.getByTestId('cart-spinner')).toHaveCount(0);      // and UI truth
await page.getByRole('button', { name: 'Checkout' }).click();
```

**Follow-ups & traps**
- "And if there's no spinner and no response you can key on?" — Then users face the same race — file the bug, request an observable (disabled state, aria-busy); the answer interviewers reward over any workaround.
- "Isn't toBeEnabled enough?" — Only if the app actually disables during processing; verify it does before trusting it.
- Trap: `waitForTimeout(2000)` "since it's brief" — the entire question is a trap for exactly this.

**One-liner** — Visible ≠ ready: wait on the previous action's outcome — response, spinner detached, truly enabled — and if no observable exists, that's a user-facing bug to file, not a sleep to add.

### Q16. An API sometimes takes 10–15 seconds and the UI test fails — how do you make it reliable?

**Interview answer** — Scope a longer wait to exactly that step, nothing global: a per-assertion timeout override — `await expect(orderStatus).toHaveText('Confirmed', { timeout: 20_000 })` — or a `waitForResponse` on that endpoint with a matching timeout. Inflating the global assertion or test timeout to accommodate one slow endpoint makes every other failure in the suite take that much longer to report, which wrecks feedback time. And in parallel: 10–15 seconds might itself be the bug — I'd flag the latency to the API owners rather than only absorbing it.

**Deep dive** — The timeout hierarchy makes surgical overrides possible: expect timeout (default 5s) and action timeout are configurable globally but overridable per call, all under the test timeout (default 30s) — a 20s assertion may also need `test.setTimeout()` or `test.slow()` (which triples the test timeout) on that test. The failure-cost asymmetry is the argument that lands: timeouts bound how long failures take, not how long successes take — polling completes on arrival; a global 30s assertion timeout means every genuine failure in a thousand-test suite now burns 30s. Complementary strategies to name: if the slow call isn't the behavior under test, mock it via `page.route` and test the slow path separately; consider a UX bug report too — 15 silent seconds needs a progress indicator, which would also give the test a better observable.

**Code**

```ts
test('order confirmation absorbs slow payment API', async ({ page }) => {
  test.slow(); // triples test timeout for this known-slow flow
  const payment = page.waitForResponse(
    r => r.url().includes('/api/payments') && r.ok(), { timeout: 20_000 });
  await page.getByRole('button', { name: 'Pay now' }).click();
  await payment;
  await expect(page.getByTestId('order-status')).toHaveText('Confirmed', { timeout: 20_000 });
});
```

**Follow-ups & traps**
- "Why not raise the global expect timeout to 20s?" — Every failing assertion suite-wide now takes 20s to fail; feedback-loop cost — the reasoning being tested.
- "Assertion timeout is 20s but the test still died at 30s?" — Test timeout caps everything; `setTimeout`/`slow()` — checks hierarchy knowledge.
- Trap: retries as the fix — retrying a deterministic 12s wait fails identically; retries address nondeterminism, not latency.

**Senior/lead angle** — Chronic endpoint latency is a product signal: raise it with data (trace timings across runs), and split test strategy — mocked-fast for UI logic, one real-integration test that owns the latency budget explicitly.

**One-liner** — Override timeouts at the slow step only — per-assertion or per-waitForResponse, plus test.slow() — never globally, because timeouts price your failures, and report the latency upstream too.

### Q17. When is force: true acceptable, and why is it usually a smell?

**Interview answer** — `force: true` skips actionability checks and dispatches the action regardless — clicking through overlays, acting on invisible or unstable elements. It's a smell because the checks encode "a real user could do this": forcing means performing an interaction no user could perform, so the test passes while users may be blocked — a false green on exactly the kind of bug e2e exists to catch. Acceptable cases are narrow: known custom-widget patterns where the semantic element is deliberately obscured — the classic being a visually-hidden native checkbox behind a styled overlay — or a deliberately non-user-path setup shortcut, always commented with why.

**Deep dive** — When force "fixes" a test, something specific was true: an overlay intercepts the point (often a real z-index/layout bug), the element never stabilizes (infinite animation — receives special mention since `stable` can't pass), or the wrong element is targeted (the styled twin instead of the input). Each has a proper fix — wait for the overlay's detachment, disable animations in test config (`reducedMotion`), or retarget the locator — and the actionability log names which one you're in. The strongest framing: an actionability failure is information about the app; force deletes the information. In review, an uncommented `force: true` should trigger the same scrutiny as a disabled test.

**Follow-ups & traps**
- "force: true made the test pass — ship it?" — Read the log first: what check failed and why; the pass may be masking a user-blocking overlay bug — the judgment being probed.
- "Difference from dispatchEvent('click')?" — force still sends real pointer events at coordinates, skipping checks; dispatchEvent synthesizes the DOM event directly, bypassing even hit-testing — one level deeper into "no user could do this."
- Trap: force as standard flake treatment — suites where force proliferates have converted their e2e checks into fiction; interviewers probing this want visible discomfort with the flag.

**One-liner** — force: true performs interactions no user could — acceptable only for known widget patterns like hidden native inputs, and every other use is deleting the exact signal the failing check was giving you.

### Q18. What keyboard and mouse APIs exist?

**Interview answer** — Element-scoped: `locator.press('Enter')` for a key on a focused element, `pressSequentially()` for character streams. Page-global: `page.keyboard` — `press` with combos like `'Control+A'`, `down`/`up` for held modifiers, `insertText` for raw text injection — and `page.mouse` — `move`, `down`, `up`, `click(x, y)`, `wheel` — for coordinate-level control underpinning custom drag, canvas, and scroll work.

**Deep dive** — Key names follow the spec: `'Enter'`, `'Escape'`, `'ArrowDown'`, `'Tab'`, plus modifier chords `'Control+Shift+P'`; `'Meta'` vs `'Control'` differs across platforms — parameterize if the suite runs on macOS and Linux. These APIs are also the accessibility-testing surface: keyboard-only navigation tests (Tab through the form, Enter to submit, assert focus order via `toBeFocused()`) are built from press. `insertText` bypasses key events entirely (like an IME commit) — the inverse trade of pressSequentially.

**Code**

```ts
await page.getByRole('searchbox', { name: 'Search' }).press('Enter');
await page.keyboard.press('Control+K');            // command-palette shortcut
await page.getByLabel('Quantity').press('ArrowUp'); // stepper interaction
await expect(page.getByRole('option', { name: 'Espresso' })).toBeFocused();
```

**Follow-ups & traps**
- "Test a keyboard shortcut that opens a dialog." — `page.keyboard.press('Control+K')` then assert `getByRole('dialog')` — quick composite check.
- Trap: pressSequentially for shortcuts — it types characters; chords are `press`. Confusing the two is the common slip.

**One-liner** — locator.press for element keys, page.keyboard for global chords and held modifiers, page.mouse for coordinates — and together they're your keyboard-accessibility test surface too.
