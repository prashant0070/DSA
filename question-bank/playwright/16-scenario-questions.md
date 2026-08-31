# Real-World Scenario Questions (Worked Solutions)

These are the hands-on, machine-coding style questions where interviewers watch you write real automation: dynamic calendars, cheapest-flight selection, tables, pagination, infinite scroll, autocomplete, and API-vs-UI verification. Each question here has a substantial worked TypeScript solution plus the discussion points that turn working code into a strong answer.

- Q1. Select the calendar date with the cheapest flight price (MakeMyTrip-style)
- Q2. How would you automate a calendar whose dates are generated dynamically?
- Q3. How do you find the cheapest flight/date dynamically rather than hardcoding?
- Q4. Automate a dynamic table: find the row matching a value and act on it
- Q5. Automate pagination
- Q6. Automate an infinite-scroll page
- Q7. Automate a search suggestion / autocomplete field
- Q8. Handle an element whose locator changes every page load
- Q9. Automate a multi-step wizard/checkout with conditional steps
- Q10. Verify a UI grid against an API response

### Q1. Select the calendar date with the cheapest flight price (MakeMyTrip-style)

**Interview answer** — The calendar renders each day cell with a price sub-element, so I collect all enabled day cells, extract and parse each price, reduce to the minimum, and click that cell — the target is *derived from the DOM at runtime*, never hardcoded. The three things I make sure to say out loud: skip disabled/past dates, parse prices robustly (currency symbols, thousands separators), and handle the fact that fare calendars usually span multiple months.

**Deep dive** — The worked solution:

```ts
test('selects the departure date with the cheapest fare', async ({ page }) => {
  await page.goto('/flights');
  await page.getByRole('textbox', { name: 'From' }).click();
  await page.getByRole('option', { name: 'Delhi (DEL)' }).click();
  await page.getByRole('textbox', { name: 'To' }).click();
  await page.getByRole('option', { name: 'Bengaluru (BLR)' }).click();
  await page.getByRole('textbox', { name: 'Departure' }).click();

  // Wait for the fare calendar to actually contain prices, then collect day cells
  const dayCells = page.locator('[data-testid="calendar-day"]:not([aria-disabled="true"])');
  await expect(dayCells.first()).toBeVisible();
  await expect(dayCells.first().locator('.fare')).not.toBeEmpty();

  let cheapest = { price: Number.POSITIVE_INFINITY, index: -1 };
  const cells = await dayCells.all();
  for (const [i, cell] of cells.entries()) {
    const fareText = await cell.locator('.fare').textContent();
    if (!fareText) continue; // some dates have no fare loaded
    const price = Number(fareText.replace(/[^\d.]/g, '')); // "₹4,599" -> 4599
    if (price < cheapest.price) cheapest = { price, index: i };
  }
  expect(cheapest.index, 'no priced dates found in calendar').toBeGreaterThanOrEqual(0);

  await cells[cheapest.index].click();
  await expect(page.getByRole('textbox', { name: 'Departure' })).not.toBeEmpty();
});
```

Key mechanics: the `:not([aria-disabled="true"])` filter excludes past/blocked dates *in the locator*, which is cleaner than filtering in the loop; the pre-loop assertion that fares are non-empty synchronizes with the async fare load — without it you'd read empty strings from a calendar still fetching prices; and the price regex strips currency symbols and separators in one pass. For multi-month calendars, wrap the collection in a month loop: collect the current month's minimum, click "next month," repeat for N months, track the global minimum with its month offset, then navigate back to the winning month before clicking — or simpler, if the widget renders two months side by side, scope the day-cell locator per month container and scan both.

**Follow-ups & traps**
- "What if two dates tie on price?" — Define the rule (first/earliest wins is the natural default) and encode it — `<` keeps the earliest; `<=` would take the latest.
- Trap: reading `textContent` of the whole cell (day number + price concatenated, "15₹4,599" parses garbage) — target the fare sub-element specifically.
- "Prices load lazily as you hover?" — Then the design changes: trigger the load per cell or intercept the fare API and compute the minimum from the response instead (Q3).

**One-liner** — Collect enabled day cells, parse their fare sub-elements, reduce to the minimum, click — with sync on fare load and a loop over months.

### Q2. How would you automate a calendar whose dates are generated dynamically?

**Interview answer** — Never hardcode a date string that will be wrong tomorrow. I compute the target date in the test with the JS `Date` (or date-fns for sanity), format it to match whatever stable attribute the calendar exposes — usually `aria-label` like "15 September 2026" or a `data-date="2026-09-15"` — then navigate month by month in a loop until the displayed month matches the target, with a max-iterations guard, and finally click the cell located by that attribute.

**Deep dive** —

```ts
import { addDays, format } from 'date-fns';

async function pickDate(page: Page, target: Date) {
  const targetMonth = format(target, 'MMMM yyyy'); // "September 2026"
  const monthHeader = page.getByTestId('calendar-month-label');

  // Navigate months with a hard guard — never an unbounded while(true)
  for (let hops = 0; hops < 24; hops++) {
    if ((await monthHeader.textContent())?.trim() === targetMonth) break;
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(monthHeader).not.toHaveText(''); // re-render sync
    if (hops === 23) throw new Error(`Month ${targetMonth} not reachable in 24 hops`);
  }

  // Stable, computed locator — aria-label or data-date, never nth-child
  await page.getByRole('gridcell', { name: format(target, 'd MMMM yyyy') }).click();
}

test('books a flight departing 30 days from today', async ({ page }) => {
  const departure = addDays(new Date(), 30);
  await page.getByRole('textbox', { name: 'Departure' }).click();
  await pickDate(page, departure);
  await expect(page.getByRole('textbox', { name: 'Departure' }))
    .toHaveValue(format(departure, 'dd/MM/yyyy'));
});
```

Why each piece: computing "today + 30" keeps the test valid forever, where a hardcoded "15 September" dies at month end and works differently in CI's timezone (pin `timezoneId` in config if date math matters); the month-navigation loop handles any starting month, and the guard converts an impossible target into a clear failure instead of an infinite loop; locating by `aria-label`/`data-date` survives layout changes where positional `nth-child` selectors break on the first calendar restyle. If the widget is a native `<input type="date">`, skip all of it: `fill('2026-09-15')` works directly.

**Follow-ups & traps**
- "End of month edge cases?" — "Today + 30" crossing a year boundary, Feb 29 — date-fns handles the arithmetic; your formatting/locale assumptions are the risk to test.
- Trap: `page.locator('td').nth(14)` — position encodes month layout; it selects a different date every month.
- "Calendar in a different language?" — Format the aria-label with the app's locale (`format(date, pattern, { locale })`), or prefer the locale-neutral `data-date` attribute.

**One-liner** — Compute the date, loop months with a guard until the header matches, click by computed aria-label or data-date — nothing hardcoded, nothing positional.

### Q3. How do you find the cheapest flight/date dynamically rather than hardcoding?

**Interview answer** — Generalize Q1 into the pattern: derive test data from the DOM at runtime. Collect the candidate elements with `locator.all()`, extract a `(key, value)` pair from each — date and price, flight and fare — reduce to the optimum in plain TypeScript, then act on the winning element. The test encodes the *rule* ("choose the cheapest") rather than any specific answer, so it stays correct as prices change daily.

**Deep dive** —

```ts
// Reusable extraction: works for fare calendars, results lists, any priced collection
type Priced = { label: string; price: number; cell: Locator };

async function collectPrices(cards: Locator, priceSel: string, labelSel: string): Promise<Priced[]> {
  await expect(cards.first()).toBeVisible(); // sync before collecting
  const out: Priced[] = [];
  for (const cell of await cards.all()) {
    const [priceText, label] = await Promise.all([
      cell.locator(priceSel).textContent(),
      cell.locator(labelSel).textContent(),
    ]);
    const price = Number((priceText ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(price) && price > 0) out.push({ label: label ?? '', price, cell });
  }
  return out;
}

test('books the cheapest flight in the results list', async ({ page }) => {
  await page.goto('/flights?from=DEL&to=BLR&date=2026-09-14');
  const flights = await collectPrices(
    page.getByTestId('flight-card'), '[data-testid="fare"]', '[data-testid="flight-number"]',
  );
  const cheapest = flights.reduce((min, f) => (f.price < min.price ? f : min));

  await cheapest.cell.getByRole('button', { name: 'Book' }).click();
  // Assert downstream against the *derived* value — the test carries its data forward
  await expect(page.getByTestId('summary-fare')).toContainText(String(cheapest.price));
});
```

Two points interviewers listen for. First, the synchronization caveat: `locator.all()` is a snapshot with *no* auto-waiting — called against a still-loading list it returns a partial set, so you assert readiness first (first card visible, or better, a known count / loading-spinner-gone). Second, carrying the derived value forward: asserting the booking summary shows `cheapest.price` closes the loop — the test verified selection *and* propagation without ever knowing the price in advance. Mention the alternative extraction path: intercept the search API response and compute the minimum from JSON — more robust than text parsing when the endpoint is stable, and it cross-checks UI rendering against data.

**Follow-ups & traps**
- "Why is `locator.all()` risky?" — No auto-wait: it snapshots whatever exists at call time. Partial lists silently produce a wrong 'minimum'. Sync first.
- Trap: hardcoding the expected cheapest price in the final assertion — the whole point was deriving it; assert against the captured variable.
- "Hundreds of items with per-item textContent calls?" — Batch with one `evaluateAll` returning `(label, price)` pairs, or take the API-response path.

**One-liner** — Snapshot the collection after syncing, extract key/value pairs, reduce to the optimum in code, act — and re-assert the derived value downstream.

### Q4. Automate a dynamic table: find the row matching a value and act on it

**Interview answer** — Filter rows by content instead of position: `rows.filter({ hasText: 'ORD-1042' })` — or for precision, `filter({ has: cellLocator })` to require the match in a *specific column* — then act on controls inside that row. For sort verification, extract the column's values and compare against a sorted copy of themselves. I'd wrap the table in a small component object so row-lookup, cell-read, and sort-check are reusable across every table in the app.

**Deep dive** —

```ts
class DataTable {
  constructor(private readonly root: Locator) {}
  private rows = () => this.root.getByRole('row').filter({ has: this.root.page().getByRole('cell') });

  rowByCell(column: string, value: string): Locator {
    // Precise: value must be in the given column, not anywhere in the row
    return this.rows().filter({
      has: this.root.page().getByRole('cell', { name: value, exact: true }),
    }).filter({ hasText: value });
  }

  async columnValues(headerName: string): Promise<string[]> {
    const headers = await this.root.getByRole('columnheader').allTextContents();
    const idx = headers.findIndex((h) => h.trim() === headerName);
    expect(idx, `column "${headerName}" not found`).toBeGreaterThanOrEqual(0);
    await expect(this.rows().first()).toBeVisible();
    const rows = await this.rows().all();
    return Promise.all(rows.map(async (r) => (await r.getByRole('cell').nth(idx).textContent())?.trim() ?? ''));
  }
}

test('cancels a specific order from the orders table', async ({ page }) => {
  await page.goto('/admin/orders');
  const table = new DataTable(page.getByRole('table', { name: 'Orders' }));

  const row = table.rowByCell('Order ID', 'ORD-1042');
  await expect(row).toHaveCount(1); // exactly one match — catches duplicates and misses
  await expect(row.getByRole('cell').nth(3)).toHaveText('Pending');
  await row.getByRole('button', { name: 'Cancel' }).click();
  await expect(row.getByRole('cell').nth(3)).toHaveText('Cancelled');
});

test('sorting by amount actually sorts', async ({ page }) => {
  await page.goto('/admin/orders');
  const table = new DataTable(page.getByRole('table', { name: 'Orders' }));
  await page.getByRole('columnheader', { name: 'Amount' }).click();

  const amounts = (await table.columnValues('Amount')).map((t) => Number(t.replace(/[^\d.]/g, '')));
  expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
});
```

Design notes worth voicing: `hasText` matches anywhere in the row — fine for unique IDs, dangerous for values like "Pending" that appear in many rows or "10" that substring-matches "100"; the `has`+`exact` combination pins the match. `await expect(row).toHaveCount(1)` before acting converts both "no such row" and "ambiguous match" into immediate, readable failures. The sort check — compare the column against a sorted copy of *itself* — needs no expected data and works on any dataset, but parse before comparing (numeric vs lexicographic: as strings, "9" > "100").

**Follow-ups & traps**
- "Row is on page 3?" — Compose with the pagination loop from Q5, or better: use the table's search/filter UI if it exists — that's what users do.
- Trap: `rows.nth(4)` — position breaks the moment data changes; content-based lookup is the entire lesson.
- "Sort check for dates?" — Parse to timestamps first; string comparison of "02/01" vs "10/12" lies depending on format.

**One-liner** — Filter rows by content (scoped to the right column), assert exactly one match, act within it — and verify sorting by comparing a column to its sorted self.

### Q5. Automate pagination

**Interview answer** — A bounded loop: process the current page, check whether the next-button is enabled, click it and continue, or stop. Two guards are non-negotiable: a max-pages ceiling so a broken next-button can't loop forever, and after each click, a wait for the page to actually change — the next-button being clickable again isn't proof the new page rendered.

**Deep dive** —

```ts
test('finds an order across paginated results', async ({ page }) => {
  await page.goto('/admin/orders');
  const target = 'ORD-20991';
  const MAX_PAGES = 50;
  let found = false;

  for (let p = 1; p <= MAX_PAGES && !found; p++) {
    await expect(page.getByTestId('order-row').first()).toBeVisible();
    found = (await page.getByTestId('order-row').filter({ hasText: target }).count()) > 0;
    if (found) break;

    const next = page.getByRole('button', { name: 'Next page' });
    if (!(await next.isEnabled())) break; // last page

    const pageLabel = page.getByTestId('page-indicator');
    const before = await pageLabel.textContent();
    await next.click();
    await expect(pageLabel).not.toHaveText(before ?? ''); // page really advanced
  }

  expect(found, `${target} not found within ${MAX_PAGES} pages`).toBeTruthy();
  await page.getByTestId('order-row').filter({ hasText: target })
    .getByRole('link', { name: 'View' }).click();
});
```

The page-advanced check is the difference between stable and flaky here: clicking next fires an async fetch, and re-reading rows before the re-render scans page N twice (or a half-rendered page). Any changing signal works — a page indicator, first-row content changing, or `waitForResponse` on the page-N+1 API call. Variants to mention: *numbered pages* — jump directly with `getByRole('link', { name: String(n) })` when you know the target page; *cursor-based* ("Load more") — same loop but items accumulate, so track total count instead of page number; *infinite scroll* — Q6. And the honest caveat: exhaustively walking 50 pages to find one row is a smell in a real suite — prefer the app's search/filter, or verify pagination mechanics on 2–3 pages and find records via API.

**Follow-ups & traps**
- "Next-button implemented as a link or disabled via class?" — Check the real disabled signal: `aria-disabled`, `disabled` attr, or its absence on the last page — inspect before assuming `isEnabled()` sees it.
- Trap: unbounded `while (await next.isEnabled())` — a next-button that never disables (bug) loops until the test timeout with no useful message.
- "Assert pagination itself?" — Page-size rows per page, item counts consistent with the total badge, no duplicate IDs across consecutive pages.

**One-liner** — Loop: process page, stop if found or next is disabled, click next, *wait for the page to actually change* — all inside a max-pages guard.

### Q6. Automate an infinite-scroll page

**Interview answer** — Loop: scroll to the bottom — `mouse.wheel` or `scrollIntoViewIfNeeded()` on the current last item — then wait for the item count to increase, using `expect.poll` on `locator.count()`. Stop when the target appears, or when the count stops growing (feed exhausted), always under a max-iterations guard. The core insight is that the loading signal is *count growth*, not time passed.

**Deep dive** —

```ts
test('scrolls the activity feed until a known entry appears', async ({ page }) => {
  await page.goto('/account/activity');
  const items = page.getByTestId('activity-item');
  const target = items.filter({ hasText: 'Refund issued for ORD-1042' });
  const MAX_SCROLLS = 30;

  for (let i = 0; i < MAX_SCROLLS; i++) {
    if ((await target.count()) > 0) break;

    const before = await items.count();
    await items.last().scrollIntoViewIfNeeded(); // triggers the intersection observer

    try {
      await expect.poll(() => items.count(), { timeout: 5000 }).toBeGreaterThan(before);
    } catch {
      break; // count stable for 5s -> feed exhausted
    }
  }

  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();
});
```

Why these choices: `scrollIntoViewIfNeeded` on the *last item* reliably enters the intersection-observer trigger zone, and unlike `mouse.wheel` it's independent of viewport height and wheel-delta tuning (`mouse.wheel(0, 800)` is the alternative when the app listens to scroll events on the window rather than observing a sentinel). `expect.poll` on the count is the correct wait — it retries until growth or timeout, and the timeout doubles as the "no more content" detector, giving the loop a natural three-way exit: found, exhausted, or guard exceeded. Mention the DOM-size caveat: aggressive infinite scroll with thousands of nodes slows every subsequent locator operation — and if the app *virtualizes* the list (recycles DOM nodes), early items leave the DOM, so "scroll until the target is in the DOM" needs rethinking: the target may need to be *scrolled to* by position, or found via API and deep-linked.

**Follow-ups & traps**
- "How do you know new items loaded vs spinner still going?" — Count growth is the truth; optionally also `waitForResponse` on the feed API for a crisper signal.
- Trap: `mouse.wheel` in a fixed loop with `waitForTimeout` between scrolls — timing guesses; slow CI loads less per iteration and the test misses content.
- "Virtualized list?" — DOM presence no longer equals existence; items are recycled. Verify data via API and test the *viewport behavior* separately.

**One-liner** — Scroll the last item into view, `expect.poll` until the count grows, stop on target-found or count-stable — never on elapsed time.

### Q7. Automate a search suggestion / autocomplete field

**Interview answer** — Type with `pressSequentially()` — not `fill()` — because suggestions are driven by per-keystroke handlers that `fill` bypasses by setting the value in one shot. Then wait for the listbox to render options (`getByRole('option')`), assert the suggestions are relevant, and select one by role and name. For debounced inputs I add `waitForResponse` on the suggest API so the test syncs on the actual request rather than guessing debounce delay.

**Deep dive** —

```ts
test('autocomplete suggests airports and selection fills the field', async ({ page }) => {
  await page.goto('/flights');
  const from = page.getByRole('combobox', { name: 'From' });

  const suggestResponse = page.waitForResponse(
    (r) => r.url().includes('/api/airports/suggest') && r.url().includes('q=del'),
  );
  await from.pressSequentially('del', { delay: 80 }); // real keystrokes -> real key handlers
  await suggestResponse;

  const options = page.getByRole('listbox').getByRole('option');
  await expect(options.first()).toBeVisible();
  await expect(options).toHaveCount(5);
  for (const text of await options.allTextContents()) {
    expect(text.toLowerCase()).toContain('del');
  }

  await options.filter({ hasText: 'Indira Gandhi International' }).click();
  await expect(from).toHaveValue(/Delhi \(DEL\)/);
  await expect(page.getByRole('listbox')).toBeHidden(); // dropdown closed after selection
});
```

The API details worth stating: `pressSequentially` dispatches real `keydown`/`keypress`/`input` events per character — exactly what autocomplete listens to — and it replaced the deprecated `type()`; the `delay` option paces keystrokes which matters for debounced fields (each keystroke resets the debounce timer — typing full speed means only the final state fires a request, which is *usually* what you want to test, but per-keystroke behavior needs pacing). Debounce discussion: the app waits, say, 300ms after the last keystroke before requesting — so a fixed `waitForTimeout(300)` is a guess that breaks when debounce changes; `waitForResponse` on the suggest endpoint is the truth. Also assert the *negative* space: a query with no matches shows "No results," and the dropdown closes on selection and on Escape.

**Follow-ups & traps**
- "Why exactly does `fill` break this?" — It sets the value and fires a single `input` event — no per-key events, so key-listener-driven suggest logic never runs. The most common wrong answer is "fill is fine."
- Trap: asserting on `option` texts before the listbox is open — snapshot of nothing; sync on the first option's visibility.
- "Keyboard-only selection?" — `ArrowDown` then `Enter` via `keyboard.press` — worth a dedicated test since keyboard users hit different code paths.
- "Suggestions flaky in CI?" — Race between keystrokes and slow suggest responses (stale responses overwriting fresh ones is a real app bug class); `waitForResponse` per query exposes it.

**One-liner** — `pressSequentially` for real keystrokes, `waitForResponse` for the debounced suggest call, assert `role=option` contents, select by name.

### Q8. Handle an element whose locator changes every page load

**Interview answer** — Stop locating by what changes and locate by what doesn't. Auto-generated IDs and CSS-module classes (`id="input-8f3a"`, `class="btn_x92k"`) are build artifacts, not identity. The stable anchors, in order: role plus accessible name (`getByRole('button', { name: 'Pay now' })`), user-visible text, and `data-testid`. If the element itself has nothing stable, locate a stable *ancestor* and drill down relatively; if an attribute is only partially dynamic, match the stable part with a regex or `^=`/`$=` CSS operators.

**Deep dive** —

```ts
// Instead of the doomed: page.locator('#submit-btn-4821') / page.locator('.css-1x8qa2')

// 1. Role + accessible name — survives any styling/build churn
await page.getByRole('button', { name: 'Proceed to payment' }).click();

// 2. Stable parent, relative drill-down — the row has identity, the button doesn't
const orderRow = page.getByRole('row').filter({ hasText: 'ORD-1042' });
await orderRow.getByRole('button', { name: 'Cancel' }).click();

// 3. Partially stable attribute — anchor on the stable fragment
await page.locator('[id^="payment-method-"]').first().check();     // prefix stable, suffix random
await page.getByTestId(/^flight-card-/).first().click();           // regex on testid

// 4. Anchor by a stable sibling: label text -> the input next to it
await page.locator('label', { hasText: 'Card number' }).locator('..').getByRole('textbox').fill('4242424242424242');
```

The reasoning to narrate: role+name is stable because it's tied to what the *user perceives* — it only changes when the UX meaningfully changes, at which point the test *should* update; testids are stable because they're an explicit contract with the test suite. The strategic move a senior candidate names: when nothing stable exists, the best fix is often a one-line `data-testid` added to the app — a conversation with developers, not a cleverer selector. And the anti-pattern to call out by name: copying a full CSS path or XPath from devtools — maximum-length chains of the most fragile selectors, broken by the next re-render.

**Follow-ups & traps**
- "Dev team says they can't add testids?" — Then role/name and text anchors; but push back — testability hooks are a normal engineering ask, same as log lines.
- Trap: "use XPath with indexes" — `//div[3]/button[2]` is position-encoding, the same disease with worse syntax.
- "What if the accessible name is dynamic too (e.g. contains a count)?" — Regex name: `getByRole('button', { name: /^Cart/ })` — anchor the stable prefix.

**One-liner** — Anchor on identity that survives rebuilds — role+name, text, testid, or a stable parent — and regex-match the stable fragment of anything half-dynamic.

### Q9. Automate a multi-step wizard/checkout with conditional steps

**Interview answer** — Model each step as its own page object with a `complete()` method and an `isActive()` probe, then drive them with a small state-machine-style flow: look at which step the wizard currently shows, run that step's handler, repeat until confirmation — with a guard on total transitions. That handles conditional steps naturally — an insurance-offer step that only appears for international flights is just a state that sometimes occurs — without `if` pyramids in every test.

**Deep dive** —

```ts
// Each step: knows how to detect itself and how to complete itself
class PassengerStep {
  constructor(private page: Page) {}
  isActive = () => this.page.getByRole('heading', { name: 'Passenger details' }).isVisible();
  async complete(data: BookingData) {
    await this.page.getByRole('textbox', { name: 'Full name' }).fill(data.passenger);
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }
}
class InsuranceStep { // conditional: only for international itineraries
  constructor(private page: Page) {}
  isActive = () => this.page.getByRole('heading', { name: 'Travel insurance' }).isVisible();
  async complete(data: BookingData) {
    await this.page.getByRole('radio', { name: data.insurance ? 'Add insurance' : 'No thanks' }).check();
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }
}
class PaymentStep { /* isActive + complete, same shape */ }

class CheckoutFlow {
  constructor(private page: Page, private steps: Array<PassengerStep | InsuranceStep | PaymentStep>) {}
  async run(data: BookingData) {
    for (let hops = 0; hops < 10; hops++) {
      if (await this.page.getByRole('heading', { name: 'Booking confirmed' }).isVisible()) return;
      for (const step of this.steps) {
        if (await step.isActive()) { await step.complete(data); break; }
      }
    }
    throw new Error('Wizard did not reach confirmation within 10 transitions');
  }
}

test('international booking includes the insurance step', async ({ page }) => {
  // ... search + select a DEL -> LHR flight ...
  await new CheckoutFlow(page, [new PassengerStep(page), new InsuranceStep(page), new PaymentStep(page)])
    .run({ passenger: 'Asha Rao', insurance: true, card: testCard });
  await expect(page.getByTestId('booking-summary')).toContainText('Travel insurance');
});
```

Design points to narrate: the *dispatch-on-current-state* loop is what makes conditional steps clean — the flow never asserts "step 3 is insurance," it asks "what is the wizard showing now?"; the guard converts a wizard stuck on validation errors into a clear failure. Two testing obligations beyond the happy path: assert conditional steps appear *when they should* (the test above checks the summary includes insurance — proving the step occurred) and *don't when they shouldn't* (a domestic-flight test asserting the insurance heading never rendered). One synchronization note: `isActive()` probes with `isVisible()` — a no-wait check, correct here because the loop provides the retry; the step's own `complete()` uses auto-waiting actions for the real synchronization.

**Follow-ups & traps**
- "Why not one linear test with hardcoded step order?" — It breaks the day marketing inserts an upsell step, and it can't express conditionality without branching soup.
- Trap: `isVisible()` probes racing the step transition — the between-steps spinner makes *nothing* active for a moment; the loop's re-dispatch absorbs it, a naive single-pass `if/else` chain doesn't.
- "Skipping earlier steps to test only payment?" — Deep-link or API-seed a session at the payment step; a payment test paying the full wizard toll is slow arrange (see the API+UI pattern).

**One-liner** — Per-step page objects with detect-and-complete, dispatched by a guarded what's-active-now loop — conditional steps become states, not special cases.

### Q10. Verify a UI grid against an API response

**Interview answer** — Fetch the same data the grid claims to show — via the `request` fixture against the same endpoint with the same query parameters — normalize both sides into a comparable shape, and deep-compare with `expect(...).toEqual(...)`. The normalization is the real work: the UI renders formatted strings while the API returns raw types, so I convert both to a canonical form — parsed numbers, ISO dates, sorted by a stable key — before comparing.

**Deep dive** —

```ts
type OrderRow = { id: string; total: number; status: string };

test('orders grid matches the API page-for-page', async ({ page, request }) => {
  await page.goto('/admin/orders?page=1&size=25&sort=createdAt:desc');

  // API side: same page, size, and sort the grid requested
  const apiBody = await (await request.get('/api/orders', {
    params: { page: 1, size: 25, sort: 'createdAt:desc' },
  })).json();
  const fromApi: OrderRow[] = apiBody.items.map((o: any) => ({
    id: o.orderId,
    total: Math.round(o.totalCents) / 100, // API: cents -> canonical dollars
    status: o.status.toUpperCase(),
  }));

  // UI side: wait for the full page of rows, then extract and normalize
  const rows = page.getByTestId('order-row');
  await expect(rows).toHaveCount(fromApi.length); // sync AND count check in one
  const fromUi: OrderRow[] = [];
  for (const row of await rows.all()) {
    fromUi.push({
      id: (await row.getByTestId('order-id').textContent())!.trim(),
      total: Number((await row.getByTestId('order-total').textContent())!.replace(/[^\d.]/g, '')),
      status: (await row.getByTestId('order-status').textContent())!.trim().toUpperCase(),
    });
  }

  const byId = (a: OrderRow, b: OrderRow) => a.id.localeCompare(b.id);
  expect([...fromUi].sort(byId)).toEqual([...fromApi].sort(byId));
});
```

The pitfalls are the interview substance. *Pagination*: the grid shows page 1 of 25 — compare against the same page and size, not the full collection, and make sure both sides use the same sort or the "pages" contain different records entirely. *Formatting*: "$1,234.50" vs `123450` cents vs `1234.5` — normalize to numbers; dates rendered as "2 hours ago" can't round-trip at all — compare a stable column or expose a `data-timestamp` attribute. *Ordering*: if the comparison shouldn't care about order, sort both sides by a stable unique key first; if order *is* the contract (sorted grid), compare unsorted — deliberately, and say which contract you're testing. Also note `toHaveCount` doing double duty: it synchronizes (auto-retries until 25 rows exist — guarding the partial-render race) and asserts the count in one line. And the data-stability caveat: against a shared live environment, data can change between the API call and the UI read — run against seeded/isolated data, or mock the endpoint so both sides observably read the same bytes.

**Follow-ups & traps**
- "API and UI disagree — who's wrong?" — The trace's network tab shows what the UI *received*; if the payload was right and the render wrong, it's frontend; if the payload differs from your API call's, it's parameters or timing.
- Trap: comparing raw `textContent` against raw JSON — currency symbols, truncation, and locale formatting guarantee false failures; normalize first.
- "Virtualized grid rendering only visible rows?" — DOM holds a window, not the page; compare the visible window, scroll-and-collect, or verify data integrity at the API layer and rendering separately.

**One-liner** — Same query on both sides, normalize to canonical types, sort by a stable key (unless order is the contract), deep-compare — the work is in the normalization.
