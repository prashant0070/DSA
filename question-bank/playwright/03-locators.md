# Locators

Locator questions are the heart of most Playwright interviews because they reveal how you think about test resilience, not just API recall. This file covers the strategy hierarchy, the Locator-vs-ElementHandle classic, strict mode, filtering and chaining, shadow DOM, and the scenario questions ("the ID changes every load", "one UI change broke 30 tests") that senior interviews lean on.

- Q1. What locator strategies are available in Playwright?
- Q2. Which locator strategy is recommended and why?
- Q3. What is getByRole() and where do roles come from?
- Q4. getByRole() vs locator() — when do you use each?
- Q5. What is getByTestId() and when is it the right choice?
- Q6. Locator vs ElementHandle — what's the difference and why does it matter?
- Q7. What is strict mode?
- Q8. How do you handle multiple matching elements?
- Q9. first(), last(), nth() — and why is nth() fragile?
- Q10. What is locator chaining?
- Q11. How does locator filtering work?
- Q12. Why avoid long XPath/CSS chains?
- Q13. A button gets a different ID every page load — how do you build a reliable locator?
- Q14. A small UI change breaks 30 tests — what does that say about locator strategy?
- Q15. How does Playwright handle Shadow DOM?
- Q16. When do you still need CSS or XPath?

### Q1. What locator strategies are available in Playwright?

**Interview answer** — The recommended, user-facing family: `getByRole()` for elements by ARIA role and accessible name, `getByLabel()` for form fields by their label, `getByPlaceholder()`, `getByText()`, `getByAltText()` for images, `getByTitle()`, and `getByTestId()` for dedicated test attributes. Beneath those sits the generic `locator()`, which accepts CSS and XPath selectors. Everything returns a Locator, so filtering, chaining, and auto-waiting work identically across all of them.

**Deep dive** — The `getBy*` methods aren't just sugar over CSS — `getByRole` queries the accessibility tree, which CSS cannot express, and `getByText` normalizes whitespace and pierces shadow DOM. Under `locator()`, Playwright's selector engine auto-detects: strings starting with `//` or `..` parse as XPath, others as CSS, and there are prefixed engines (`css=`, `xpath=`, `text=`, `internal:` ones used by getBy*). Options matter in interviews: most getBy* accept `{ exact: true }` for exact-string matching versus default case-insensitive substring behavior for strings, and regex for controlled fuzz.

**Code**

```ts
page.getByRole('button', { name: 'Place order' });
page.getByLabel('Email address');
page.getByPlaceholder('Search products');
page.getByText('Order confirmed', { exact: true });
page.getByTestId('cart-total');
page.locator('css=.price >> nth=0');   // generic engine, discouraged as first choice
page.locator('//td[@data-col="sku"]'); // xpath auto-detected
```

**Follow-ups & traps**
- "Which of these query the accessibility tree?" — Only `getByRole`; the others match DOM attributes/text. Blurring this is common.
- "Is `getByText` exact by default?" — No — substring, case-insensitive for strings; `exact: true` or a regex tightens it.
- Trap: listing "id, name, className" Selenium-style — Playwright's answer is the getBy* family first, generic selectors second.

**One-liner** — Seven user-facing getBy* locators plus a generic locator() for CSS/XPath — all returning the same auto-waiting Locator type.

### Q2. Which locator strategy is recommended and why?

**Interview answer** — User-facing attributes first — `getByRole` with an accessible name above all, then `getByLabel`/`getByText` — because they select elements by what users perceive, not how the DOM happens to be built. Markup refactors, CSS-class renames, and framework-generated attribute churn don't break them; only an actual UX change does — and if the UX changed, the test should be revisited anyway. When no user-facing handle is reliable, `getByTestId` is the stable fallback; raw CSS/XPath is last resort.

**Deep dive** — The resilience argument is really a coupling argument: a locator couples the test to some layer of the app. CSS chains couple to DOM structure — highest churn. Test IDs couple to a contract you control — low churn but invisible to users, so they verify nothing about accessibility or visible text. Role+name couples to the accessibility contract — which is simultaneously what assistive technology uses, meaning your tests continuously verify a slice of accessibility for free, and it's what the Playwright team's own tooling (codegen, locator picker, UI mode) recommends by default. The priority order to state: role → label → placeholder/text/alt → testid → CSS/XPath.

**Follow-ups & traps**
- "Doesn't text break with i18n?" — Yes — the real counterpoint. Answers: assert against translation keys' rendered values via fixtures, run locale-pinned tests, or lean on testids in multi-locale suites. Having thought about this is a senior signal.
- "Why not testids everywhere? They're most stable." — Stability isn't the only goal — role-based locators also verify the element is what it claims to be (a real button, an accessible name). Testids-everywhere passes tests against an inaccessible UI.
- Trap: "use XPath because it's most powerful" — power isn't resilience; this answer usually sinks the interview.

**Senior/lead angle** — Codify the priority as a team rule with lint/PR-review enforcement, and treat missing accessible names as bugs to file, not obstacles to route around — the test suite then doubles as an accessibility canary.

**One-liner** — Locate the way a user perceives: role and accessible name first, testid as the engineered fallback, raw CSS/XPath only when nothing better exists.

### Q3. What is getByRole() and where do roles come from?

**Interview answer** — `getByRole()` selects elements from the accessibility tree by their ARIA role plus options, most importantly the accessible name: `getByRole('button', { name: 'Sign in' })`. Roles mostly come for free — implicit roles from native HTML semantics: `<button>` is `button`, `<a href>` is `link`, `<input type=checkbox>` is `checkbox`, `<h2>` is `heading` — with explicit `role=` attributes overriding or supplementing for custom widgets. The accessible name is computed from the standard name algorithm: `aria-label`, associated `<label>`, text content, alt text, and so on.

**Deep dive** — Because it queries the accessibility tree, `getByRole` matches what a screen reader would announce — which makes it structure-independent: whether the button is nested in three divs or none, `button "Sign in"` still resolves. Useful options beyond `name` (string or regex, `exact` for strings): `level` for headings, `checked`/`selected`/`expanded`/`pressed` for stateful widgets, and `includeHidden` since by default only elements exposed to a11y (not `aria-hidden`, not display:none) match. Frequent practical roles: `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `option`, `row`/`cell`, `heading`, `dialog`, `listitem`, `tab`. When `getByRole` fails to find a "button," it's often because the app used a clickable `<div>` — the locator just surfaced an accessibility bug.

**Code**

```ts
await page.getByRole('textbox', { name: 'Email' }).fill('qa@example.com');
await page.getByRole('button', { name: /sign in/i }).click();
await expect(page.getByRole('heading', { name: 'Your orders', level: 1 })).toBeVisible();
await page.getByRole('row', { name: 'ORD-1042' }).getByRole('button', { name: 'Refund' }).click();
```

**Follow-ups & traps**
- "The button is a styled `<div onclick>` — will getByRole find it?" — Not as `button` unless it has `role="button"`; the right move is to get the markup fixed, falling back to testid meanwhile.
- "Where does the accessible name of `<img>` come from?" — Its alt text; for inputs, the associated label or aria-label. Knowing the name algorithm's main sources reads well.
- Trap: `getByRole('input')` — `input` isn't a role; text inputs are `textbox`. Role-vocabulary slips are noticed.

**One-liner** — getByRole queries the accessibility tree — implicit roles from semantic HTML plus explicit ARIA — matching elements by role and accessible name, exactly as assistive tech sees them.

### Q4. getByRole() vs locator() — when do you use each?

**Interview answer** — `getByRole` whenever the element has a meaningful role and name — buttons, links, form fields, headings, rows — which in a well-built app is most interactive elements. `locator()` with CSS/XPath when I need something the accessibility tree can't express: structural relationships like "the second column of this row," attribute-value matching on non-test attributes, or generic containers with no role. Even then, I chain the CSS off a role- or testid-anchored parent rather than writing a full path from the root.

**Deep dive** — They're complementary layers, not competitors — `getByRole` is implemented as a selector engine within the same system, and both return identical Locator objects. The practical pattern is anchor-then-refine: anchor on something semantically stable (`getByRole('table', ...)`, `getByTestId('order-card')`), then refine with a short relative selector (`.locator('td').nth(2)`). That confines fragile structural coupling to one hop instead of a whole path. Signals to switch to `locator()`: no role (plain `div`/`span` content), pseudo-class needs (`:nth-child` semantics), or attribute selectors like `[data-status="failed"]`.

**Code**

```ts
// Anchor semantically, refine structurally
const orderRow = page.getByRole('row', { name: 'ORD-1042' });
await expect(orderRow.locator('td').nth(3)).toHaveText('$249.00');
```

**Follow-ups & traps**
- "Is getByRole slower since it walks the a11y tree?" — Any difference is negligible against network/render time; choosing locators on micro-performance grounds is the wrong optimization and interviewers know it.
- Trap: presenting them as either/or — the chaining pattern above is the answer that lands.

**One-liner** — getByRole for anything with a role and a name; locator() for structural or attribute queries — ideally chained off a semantic anchor, never a root-to-leaf path.

### Q5. What is getByTestId() and when is it the right choice?

**Interview answer** — `getByTestId('checkout-button')` matches elements by a dedicated test attribute — `data-testid` by default — that exists purely as a stable contract between the app and the tests. It's the right choice when no reliable user-facing handle exists: unnamed containers, duplicated text, heavily localized UIs, or dynamic content where role/name can't disambiguate. The attribute name is configurable in `playwright.config.ts` via `use.testIdAttribute`, e.g. to `data-test-id` or `data-qa` to match an existing codebase convention.

**Deep dive** — Test IDs are engineered stability: developers commit to not renaming them, so refactors are safe — but they verify nothing user-visible, so a suite of only testids can pass against a UI whose labels are wrong or missing. That's why the official guidance ranks them below role/label: fallback, not default. Good testid hygiene: put them on stable containers (a card, a row) and use user-facing locators within; name them by domain meaning (`order-card`, not `div-27`); add them via a code-review convention so they don't rot. Configuration is one line and applies to every `getByTestId` call and codegen's output.

**Code**

```ts
// playwright.config.ts
export default defineConfig({ use: { testIdAttribute: 'data-qa' } });

// Container by testid, interaction by role — the hybrid pattern
const card = page.getByTestId('order-card').filter({ hasText: 'ORD-1042' });
await card.getByRole('button', { name: 'Cancel order' }).click();
```

**Follow-ups & traps**
- "Team says add data-testid to everything — your take?" — Push back gently: testids on landmarks/containers, user-facing locators for interactions; all-testid suites stop testing what users experience.
- "Does testIdAttribute affect codegen?" — Yes, codegen respects it and will emit getByTestId with your attribute.
- Trap: not knowing the default attribute (`data-testid`) or that it's configurable — this is asked verbatim.

**One-liner** — getByTestId targets a dedicated stable attribute (default data-testid, configurable via testIdAttribute) — the deliberate fallback when user-facing locators can't do the job.

### Q6. Locator vs ElementHandle — what's the difference and why does it matter?

**Interview answer** — A Locator stores the query and re-executes it against the live DOM on every action or assertion, with actionability checks and retry built in. An ElementHandle pins one specific DOM node at capture time: if the framework re-renders and replaces that node — which React, Angular, and Vue do constantly — the handle references a detached element and operations fail. That's Selenium's StaleElementReferenceException recreated, which is exactly why Playwright's docs discourage ElementHandle and every modern API is Locator-based.

**Deep dive** — The distinction is snapshot vs recipe. `page.$()`/`$$()` and `locator.elementHandle()` produce handles — a protocol-level reference to a remote object in the browser. Handles predate locators (inherited from the Puppeteer lineage) and survive for the rare cases where you genuinely need node identity: passing an element into `page.evaluate()` for custom DOM work, or interop with APIs that require a handle. Locators additionally enforce strictness (multi-match throws) and defer resolution, enabling atomic combined queries — `filter().nth().getByRole()` evaluates as one query at action time, so there's no gap between "find" and "act" for the DOM to shift in. That find-act atomicity is the deep reason locators kill an entire flake class.

**Code**

```ts
// Handle: node captured once — dies on re-render
const handle = await page.$('#order-status');
// ...app re-renders the status badge...
await handle!.click(); // Error: element is not attached to the DOM

// Locator: re-resolved at click time — survives re-renders
await page.getByTestId('order-status').click();
```

**Follow-ups & traps**
- "So Playwright never throws stale element errors?" — With locators the class disappears; deliberately held handles can still detach. Precision here distinguishes candidates.
- "Any legit ElementHandle use left?" — `evaluate` with node arguments and niche interop; "none in normal tests" is the expected stance.
- Trap: `const el = await page.$('.buy'); await el.click();` in your own examples — writing handle-style code in a Playwright interview is self-incrimination.

**One-liner** — ElementHandle pins a node that re-renders can kill; a Locator re-runs the query at every use — recipe over snapshot is why stale-element flake doesn't exist in idiomatic Playwright.

### Q7. What is strict mode?

**Interview answer** — Strict mode means an action on a locator that resolves to more than one element throws immediately — Playwright refuses to guess which one you meant. The error lists the matched elements, and the fix is to make the locator genuinely unambiguous: a more specific role/name, `filter()` by text or child, or scoping under a container. `.first()` silences the error but keeps the ambiguity — a band-aid I only accept when "any one of them" is truly the intent.

**Deep dive** — Strictness is a deliberate philosophy difference from Selenium's `findElement`, which silently returns the first match in document order — a behavior that made tests pass while clicking the wrong element, the worst failure mode because it's invisible. Rules of the system: single-element actions (`click`, `fill`) enforce strictness; inherently multi-element operations (`count()`, `all()`, `toHaveCount`) don't; explicit selection via `first()/last()/nth()` opts out. The strict-mode violation error message is genuinely helpful — it prints each matched element's preview so you can see why two things matched. Treat every strict violation as a design prompt: usually a missing accessible name, a missing container scope, or a locator that was always weaker than you thought.

**Code**

```ts
// Throws: strict mode violation — 3 "Add to cart" buttons on the listing page
await page.getByRole('button', { name: 'Add to cart' }).click();

// Right fix: scope to the product you mean
await page
  .getByRole('listitem').filter({ hasText: 'Sony WH-1000XM5' })
  .getByRole('button', { name: 'Add to cart' }).click();

// Band-aid: works, but encodes "whichever comes first"
await page.getByRole('button', { name: 'Add to cart' }).first().click();
```

**Follow-ups & traps**
- "Why not just default to first match like Selenium?" — Because silent wrong-element interaction produces green tests that lie; loud ambiguity is a feature. This reasoning is what's being tested.
- "When is .first() legitimate?" — Homogeneous lists where any item serves ("open any product"), or asserting on a known-ordered first item — stated intent, not evasion.
- Trap: reflexively sprinkling `.first()` on every strict error — interviewers read that in take-home code and it costs you.

**One-liner** — Multi-match on an action throws by design — fix the locator's ambiguity with filters and scoping; .first() is an intent statement, not an error-silencer.

### Q8. How do you handle multiple matching elements?

**Interview answer** — Depends on the goal. To assert about the set: `toHaveCount()` for a retrying count check, or `count()` for an instant number. To iterate: `all()` returns an array of per-element locators to loop over. To act on one: narrow with `filter()` until a single element matches — or `nth()/first()/last()` when position genuinely is the selection criterion.

**Deep dive** — The sharp edge is that `count()` and `all()` are immediate — they query the DOM now, with no waiting: calling `all()` while a list is still loading happily returns fewer items or zero. The idiom is to synchronize first with a web-first assertion (`toHaveCount(3)` or `toBeVisible()` on a known element), then enumerate. For set-level text assertions, skip iteration entirely: `toHaveText(['a', 'b', 'c'])` asserts all items and their order in one retrying call. In loops over `all()`, each entry is itself a locator (index-bound via nth internally), so actions inside the loop still get auto-waiting.

**Code**

```ts
const cartItems = page.getByRole('listitem');
await expect(cartItems).toHaveCount(3);                 // sync point: list fully rendered
await expect(cartItems).toHaveText([/Espresso/, /Grinder/, /Filters/]); // set + order

for (const item of await cartItems.all()) {
  await expect(item.getByRole('button', { name: 'Remove' })).toBeEnabled();
}
```

**Follow-ups & traps**
- "Why did my `all()` loop process zero items with no error?" — Enumerated before render; anchor with toHaveCount first. This exact bug is a favorite probe.
- "count() vs toHaveCount()?" — Instant number vs retrying assertion; use the latter for synchronization.
- Trap: `for (let i = 0; i < await items.count(); i++)` re-counting per iteration while the DOM mutates — snapshot with `all()` or fix the sync point instead.

**One-liner** — Assert sets with toHaveCount/toHaveText arrays, iterate with all(), act on one via filter() — and always synchronize before enumerating, because count()/all() don't wait.

### Q9. first(), last(), nth() — and why is nth() fragile?

**Interview answer** — They select one locator out of a multi-match set by position: `first()` is `nth(0)`, `last()` is `nth(-1)`, `nth(i)` is zero-based index. They're fragile because they encode position, not identity: any reordering — a new default sort, an inserted promo card, personalization, an A/B variant — silently changes which element `nth(2)` means, and the test either fails mysteriously or, worse, passes against the wrong element. I reach for `filter()` by content first and keep nth() for cases where position is the requirement.

**Deep dive** — The legitimate uses are exactly the ones where the assertion is about position: "the first row after sorting by date descending is the newest order" — there `first()` expresses the requirement. Illegitimate use is disambiguation-by-coincidence: `nth(3)` because the target happened to be fourth during authoring. A useful heuristic: if you can't say in domain language why that index is correct, the locator is wrong. Note nth() also bypasses strict mode's protection — you asked for guessing by index, so Playwright obliges.

**Follow-ups & traps**
- "Your nth(2) test went red after a feature shipped — walk me through it." — Expected story: item inserted above shifted indexes; fix by filtering on identity (text, testid), not by updating the index. Updating the index is the trap answer.
- "Is last() safer than nth(5)?" — Marginally — it survives length changes but still breaks on reordering; same identity-vs-position problem.

**One-liner** — first/last/nth select by position — use them when position IS the assertion (e.g., verifying sort order), and filter by identity every other time.

### Q10. What is locator chaining?

**Interview answer** — Calling locator methods on a locator rather than on the page, so each step searches within the previous match: `page.getByTestId('cart').getByRole('button', { name: 'Remove' })` finds the Remove button inside the cart only. It's how you scope queries to a region, and since the whole chain stays lazy, it resolves as one atomic query at action time with full auto-waiting.

**Deep dive** — Chaining is subtree scoping — each link narrows the search root — and it composes with `filter()`, which narrows the match set of the current link instead of descending. The atomicity is the underrated property: a chained locator isn't "find parent, then find child" as two operations with a race window between them; it's one combined query evaluated at action time, so a re-render between conceptual steps can't produce a stale intermediate. Chains also map naturally onto component structure, which is why page objects typically expose region locators (`this.cart = page.getByTestId('cart')`) and methods chain off them.

**Code**

```ts
const cart = page.getByTestId('mini-cart');
await cart.getByRole('listitem')
  .filter({ hasText: 'USB-C Cable' })
  .getByRole('button', { name: 'Remove' })
  .click();
await expect(cart.getByText('Your cart is empty')).toBeVisible();
```

**Follow-ups & traps**
- "Does each link in the chain wait separately?" — No: one resolved query at action time; the waiting applies to the final combined result.
- Trap: chaining page-level locators repeatedly instead of storing region anchors — works, but interviewers reviewing code look for the region-anchor structure.

**One-liner** — Chaining scopes each query inside the previous match and resolves the whole path as one lazy, atomic, auto-waiting query.

### Q11. How does locator filtering work?

**Interview answer** — `filter()` narrows a multi-match locator by conditions: `filter({ hasText })` keeps elements containing text (string or regex), `filter({ has })` keeps elements containing a matching descendant, and both have `hasNot`/`hasNotText` negations. For combining whole locators there's `and()` — must match both — and `or()` — match either. The bread-and-butter pattern is rows or cards: filter the collection to the one representing your domain entity, then act inside it.

**Deep dive** — `filter({ hasText })` matches text anywhere in the element's subtree, case-insensitively for strings — broader than `getByText`, which locates the text-bearing element itself. `filter({ has })` takes a locator evaluated relative to each candidate — powerful for state-based selection like "the row that has an Unpaid badge." `or()` deserves a caveat: if both branches match simultaneously you're back to a strict-mode violation; it's for genuine alternatives (e.g., either the results list or the empty-state message). These operations compile into the single combined query, so filtering costs no extra round trips.

**Code**

```ts
// The order row that is still unpaid, regardless of its position
const unpaidRow = page.getByRole('row')
  .filter({ hasText: 'ORD-1042' })
  .filter({ has: page.getByRole('status').filter({ hasText: 'Unpaid' }) });
await unpaidRow.getByRole('button', { name: 'Pay now' }).click();

// Either outcome is acceptable to proceed
await expect(page.getByRole('list', { name: 'Results' })
  .or(page.getByText('No results found'))).toBeVisible();
```

**Follow-ups & traps**
- "filter({ hasText }) vs getByText?" — Filter selects the container that includes the text; getByText selects the text node's element. Mixing them up produces wrong-element clicks.
- "How would you pick the row with a specific status badge?" — `filter({ has })` with a relative locator — this is the exact scenario interviewers pose.
- Trap: assuming or() picks the first available — it matches the union; two live matches still violate strictness on action.

**One-liner** — filter() narrows by contained text or descendants (with hasNot negations), and()/or() combine locators — all compiled into one lazy query, making identity-based selection cheap.

### Q12. Why avoid long XPath/CSS chains?

**Interview answer** — A selector like `div.main > div:nth-child(3) > ul > li:nth-child(2) > button` encodes the entire DOM path, so it asserts a dozen structural facts nobody promised to keep — one wrapper div added by a refactor and it's dead, one layout change and it silently points elsewhere. It's also unreadable: no reviewer can tell what it targets. Structure is the highest-churn layer of a front end; coupling tests to it maximizes maintenance.

**Deep dive** — Generated markup makes this worse: CSS-in-JS class hashes (`css-1x2y3z`), framework-generated wrapper layers, and build-dependent attribute output mean structural selectors can break between deploys with zero intentional UI change. Long XPath from browser devtools "Copy XPath" — absolute paths with indexes — is the worst offender and a known interview red flag. The alternative isn't avoiding CSS entirely; it's keeping structural hops short and anchored: semantic anchor (role/testid) plus at most one or two relative steps. That confines breakage to a single named place when structure moves.

**Follow-ups & traps**
- "Where do you get selectors for a page with no testids and poor semantics?" — Short attribute-based CSS off the most stable nearby anchor, plus a ticket to add testids/roles — process answer, not just syntax.
- Trap: defending devtools-copied XPath as a time-saver — this is one of the strongest negative signals in SDET interviews.
- "Are classes ever OK to select on?" — Semantic, hand-written, stable classes (BEM-style) are middling; hashed/generated ones never.

**One-liner** — Every hop in a selector chain is an unpromised structural assumption — anchor semantically and keep structural steps to one or two, or pay for every refactor.

### Q13. A button gets a different ID every page load — how do you build a reliable locator?

**Interview answer** — A random ID just means ID was never the right handle. First choice: what the user sees — `getByRole('button', { name: 'Continue to payment' })`; the accessible name doesn't change per load. If the name is ambiguous, scope it: chain under a stable container or `filter()` by surrounding content. If there's a stable non-ID attribute, use an attribute selector; if part of the ID is stable, match the stable part with `[id^="pay-btn"]`-style prefix/suffix operators. And if nothing stable exists at all, the durable fix is a one-line `data-testid` from the developers.

**Deep dive** — Dynamic IDs come from component frameworks generating instance IDs, server-rendered session-scoped IDs, or CSS-in-JS — all legitimate app behavior, which is why "ask devs to make IDs static" is usually the wrong request, while "add a testid" is cheap and sanctioned. The escalation ladder worth reciting: role+name → label/text → scoped chain/filter → stable attribute or partial-attribute match (`^=` prefix, `$=` suffix, `*=` contains) → request testid. Each step trades a little user-facing fidelity for stability; knowing the order and the trade shows judgment, not just API knowledge.

**Code**

```ts
// id="continue-btn-8f3a2c" changes every load
await page.getByRole('button', { name: 'Continue to payment' }).click();   // best

await page.getByTestId('checkout-summary')
  .getByRole('button', { name: 'Continue' }).click();                      // scoped

await page.locator('button[id^="continue-btn-"]').click();                 // stable prefix
```

**Follow-ups & traps**
- "What if the button text is also dynamic — 'Pay $34.99'?" — Regex name: `{ name: /^Pay \$/ }`. Interviewers often add this twist.
- "Would you regex-match the random ID?" — No — matching randomness is fighting the symptom; match the stable fragment or move up the ladder.
- Trap: jumping straight to XPath gymnastics over the random ID — the point of the question is whether you abandon ID-thinking, not whether you can outsmart it.

**One-liner** — Random ID means wrong handle: climb the ladder — role+name, scoped filter, stable attribute fragment, then ask for a testid — never try to out-pattern the randomness.

### Q14. A small UI change breaks 30 tests — what does that say about locator strategy?

**Interview answer** — Two separate failures. Thirty breakages from one change means locators are duplicated — the same element is located thirty times across the suite instead of once in a page object or component fixture; with centralization the blast radius of any change is one line. And if the change was a small internal refactor rather than a visible UX change, the locators were also coupled to the wrong layer — structure or styling instead of user-facing attributes. Fix both: centralize into page objects, and rebuild the broken locators role-first while you're there.

**Deep dive** — This question is about maintenance economics. Locator duplication is the e2e equivalent of copy-pasted constants: cost of change scales with occurrence count. Centralization (POM, component objects, or locator-returning fixtures) makes cost O(1) per UI change; user-facing locators reduce the frequency of changes that cost anything at all — orthogonal defenses, and you want both. The mature process response: fix the pattern, not just the tests — a quick audit for the same duplication elsewhere, a team convention (locators live only in page objects), and review enforcement. Also worth saying: if the UI change was intentional UX, some tests should change — the goal is that they change in one place.

**Follow-ups & traps**
- "Concretely, where would the locator live?" — A page object property (`readonly addToCart = this.page.getByRole('button', { name: 'Add to cart' })`) or a fixture-provided component object — concrete answer expected, not just "POM."
- "Would better locators alone have prevented this?" — Reduced likelihood, not the blast radius — you need centralization for that. Candidates who see they're orthogonal stand out.
- Trap: answering only "use POM" without the coupling half, or only "use getByRole" without the duplication half — the question is engineered to need both.

**Senior/lead angle** — Track "tests touched per UI change" as a suite-health metric; a spike is an architecture smell, and it justifies refactoring investment to leadership in business terms — regression-suite maintenance cost per feature shipped.

**One-liner** — Thirty breakages from one change = duplicated locators coupled to the wrong layer; centralize into page objects and locate user-facing, and the next change costs one line.

### Q15. How does Playwright handle Shadow DOM?

**Interview answer** — Playwright's locators pierce open shadow roots automatically — `getByRole`, `getByText`, `getByTestId`, and CSS via `locator()` all reach into shadow trees with no special syntax, which removes an entire category of Selenium pain where you manually walked `shadowRoot` via JavaScript. Two limits: closed shadow roots are not reachable — by design nothing outside the component can access them — and XPath does not pierce shadow DOM, which is another practical reason it's a last-resort engine.

**Deep dive** — Web components encapsulate their internals in a shadow tree attached to a host element; `mode: 'open'` exposes `element.shadowRoot`, `mode: 'closed'` returns null to everyone — including Playwright, which can only see what the page could see. Playwright's selector engines traverse the composed tree (light DOM plus open shadow trees), so a deeply nested `<checkout-form>` component's inner submit button is one ordinary `getByRole('button', { name: 'Place order' })` away. Contrast to articulate: Selenium historically required `getShadowRoot()` hops per boundary or `executeScript` chains — brittle, per-level, and version-dependent. For closed roots in a first-party app, the pragmatic answer is a testing seam: ask component owners to expose test hooks or use open mode in test builds.

**Code**

```ts
// <payment-widget> #shadow-root(open) → <button>Pay now</button>
await page.getByRole('button', { name: 'Pay now' }).click(); // just works — no piercing syntax

// XPath will NOT find it:
await page.locator('//button[text()="Pay now"]').click();    // fails across the shadow boundary
```

**Follow-ups & traps**
- "How do you test a closed shadow root?" — You don't, directly; request a test seam (open mode in test env, exposed hooks) or test via visible effects. "Hack it with JS internals" is the trap answer.
- "Why doesn't XPath pierce?" — XPath is defined over a single document tree and predates shadow DOM's composed-tree model; Playwright's CSS/text/role engines were built composed-tree-aware.
- Trap: importing Selenium habits — writing `shadowRoot` evaluate chains in Playwright signals the candidate hasn't internalized that piercing is automatic.

**One-liner** — Open shadow roots are transparent to every Playwright locator except XPath; closed roots are off-limits by web-platform design — ask for a seam, don't hack.

### Q16. When do you still need CSS or XPath?

**Interview answer** — Legitimately, when the query is structural or attribute-based in ways getBy* can't express: nth-child positional structures like table columns, attribute selectors (`[data-status="failed"]`, `[aria-expanded="true"]`, prefix/suffix matches for semi-dynamic values), and element-type constraints with no role. XPath specifically earns its place for upward/sibling traversal — finding a row by a cell's text then acting on a sibling cell — via `ancestor::` or `following-sibling::`, though locator `filter({ has })` now covers most of those cases more readably.

**Deep dive** — The honest hierarchy: prefer `filter({ has })`/chaining first because they stay in the retrying, composed-tree-aware locator world; drop to CSS for short attribute/structural hops; reach XPath only for axis traversal CSS genuinely lacks (parent/ancestor — CSS `:has()` support in Playwright's engine covers "element containing X" cases). Also know the `text=` engine nuance: `text="Log in"` (quoted) is exact-match while `hasText`/unquoted text is normalized substring — occasionally the precise tool. Every CSS/XPath use should be short, anchored under a semantic parent, and commented with why — that convention is what reviewers and interviewers look for.

**Code**

```ts
// Attribute selector: legit — no getBy* equivalent
page.locator('[data-status="failed"]');

// Column extraction: structural by nature
const priceCell = page.getByRole('row', { name: 'ORD-1042' }).locator('td:nth-child(4)');

// XPath axis traversal — when you must go sideways/up
page.locator('//td[text()="ORD-1042"]/following-sibling::td[3]');
// ...though filter({ has }) is usually the cleaner modern equivalent
```

**Follow-ups & traps**
- "Rewrite that XPath sibling query with modern locators." — Row via `getByRole('row', { name })` then cell via nth/testid — be ready to actually do it live.
- Trap: framing this question as permission to default to XPath — the expected answer keeps CSS/XPath exceptional, scoped, and justified.
- "CSS `:has()` — usable in Playwright?" — Yes, the selector engine supports it; it often eliminates an XPath ancestor hop.

**One-liner** — CSS/XPath survive for attribute and structural queries getBy* can't express — keep them short, anchored under semantic parents, and remember filter({ has }) replaces most XPath acrobatics.
