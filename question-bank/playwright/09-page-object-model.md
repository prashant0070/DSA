# Page Object Model in Playwright

POM questions look basic but are where interviewers assess design judgment: how you structure locators, where assertions live, and whether you know when the pattern stops paying for itself. Playwright's lazy `Locator` changes the classic Selenium answers in ways worth stating explicitly.

- Q1. POM in Playwright vs Selenium POM
- Q2. Benefits of POM — with honest limits
- Q3. Full example: LoginPage + OrdersPage + a test
- Q4. Designing POM for a large application
- Q5. Component objects for shared widgets
- Q6. Refactoring an oversized LoginPage
- Q7. Preventing tight coupling between POMs and tests
- Q8. Should page objects contain assertions?
- Q9. Injecting page objects via fixtures
- Q10. When is POM overkill?
- Q11. How POM and getByRole coexist
- Q12. Keeping POMs DRY across web and mobile-web

### Q1. What is POM in Playwright and how does it differ from Selenium POM?

**Interview answer** — Same intent — encapsulate a page's locators and interactions in a class so tests read as user behavior — but the mechanics are simpler in Playwright. Locators are `readonly` fields initialized once in the constructor, because a `Locator` is a lazy description re-resolved at every action, not a live element reference. That eliminates Selenium's `PageFactory`/`@FindBy` machinery and the entire stale-element-reference problem: a Playwright locator can't go stale, so POMs need no re-lookup or retry plumbing.

**Deep dive** — In Selenium, `driver.findElement` returns a `WebElement` pinned to a DOM node — if the node re-renders, the reference dies, which is why Selenium POMs grew lazy-proxy factories and wait wrappers. A Playwright `Locator` stores only *how to find* the element; resolution happens inside each `click()`/`fill()` with auto-waiting and actionability checks built in. Consequences for POM design: constructor-initialized locator fields are safe even before the page loads (nothing is queried at construction); explicit waits mostly vanish from page objects; and methods become short verbs over locators. What remains identical to Selenium: one class per page/area, actions as methods, selectors never appearing in test files.

**Code**

```ts
export class SearchPage {
  readonly searchBox: Locator;
  readonly results: Locator;

  constructor(private readonly page: Page) {
    // Nothing is queried here — locators are descriptions, resolved at action time
    this.searchBox = page.getByRole('searchbox', { name: 'Search products' });
    this.results = page.getByTestId('search-result');
  }

  async search(term: string) {
    await this.searchBox.fill(term);
    await this.searchBox.press('Enter');
  }
}
```

**Follow-ups & traps**
- "Can a locator field created before `goto` be invalid?" — no; nothing resolves until an action runs. Candidates with Selenium reflexes get this wrong.
- "Where did the waits go?" — into the actions themselves (auto-waiting); a POM full of explicit waits is a ported-from-Selenium smell.
- Wrong answer: caching `elementHandle()` results in fields "for performance" — that reintroduces staleness deliberately.

**One-liner** — Playwright POM is Selenium POM minus PageFactory and stale elements: readonly lazy locators in the constructor, auto-waiting actions as methods.

### Q2. What are the benefits of POM — and what are its honest limits?

**Interview answer** — Benefits: selectors live in one place, so a UI change is a one-file fix instead of a thirty-test grep; tests read as intent (`checkoutPage.applyDiscount(...)`) rather than DOM mechanics; and shared flows aren't copy-pasted. The honest limits: POM is indirection, and indirection has a cost — readers must hop between test and class to know what actually happens, over-abstracted POMs accumulate dead methods, and POM does nothing for the harder problems of test data and environment flakiness. It's a maintainability trade, not free.

**Deep dive** — The economics: POM is an investment repaid by change frequency and suite size. High-churn UI plus hundreds of tests → the centralization pays weekly. Stable UI or a 20-test suite → you paid indirection for savings that never materialize. Failure modes to name (they signal experience): god objects (one class, ninety methods), speculative methods written "for future tests" that rot unused, and wrapper methods like `clickLoginButton()` that add a layer without adding meaning — `loginPage.submitButton.click()` in a test is fine; wrapping every one-liner is ritual, not design. Also worth saying: Playwright's user-facing locators already absorb much cosmetic UI churn (see Q11), so POM's selector-centralization benefit is real but smaller than it was in Selenium's CSS/XPath era.

**Follow-ups & traps**
- "Is POM ever a bad idea?" — yes (see Q10); "no, always use POM" is the weak answer interviewers are screening for.
- "What does POM *not* solve?" — test data management, auth strategy, flaky environments; candidates who claim POM fixes flakiness confuse encapsulation with stability.
- Trap: citing "reusability" alone — the interviewer will ask "reusability of *what*?"; the precise answer is selectors and multi-step flows.

**One-liner** — POM buys one-place selector changes and intent-revealing tests at the price of indirection — a trade that pays only at sufficient scale and churn.

### Q3. Show a full example: LoginPage and OrdersPage with a test using them.

**Interview answer** — Each class takes `page` in the constructor, exposes `readonly` locators, and offers action methods. Navigation-triggering actions return the next page object — `login()` returns an `OrdersPage` — so tests chain naturally and the page flow is encoded in types; methods that stay on the page return `void`. The test composes the objects and keeps all `expect` calls to itself.

**Code**

```ts
// pages/login.page.ts
import { type Locator, type Page } from '@playwright/test';
import { OrdersPage } from './orders.page';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    this.errorAlert = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  // Successful login navigates away — return the next page object
  async login(email: string, password: string): Promise<OrdersPage> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    return new OrdersPage(this.page);
  }

  // Failure path stays on the page — void
  async loginExpectingError(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

```ts
// pages/orders.page.ts
import { type Locator, type Page } from '@playwright/test';

export class OrdersPage {
  readonly heading: Locator;
  readonly orderRows: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Your Orders' });
    this.orderRows = page.getByTestId('order-row');
  }

  orderRow(orderId: string): Locator {
    return this.orderRows.filter({ hasText: orderId });
  }

  async openOrder(orderId: string) {
    await this.orderRow(orderId).getByRole('link', { name: 'Details' }).click();
  }
}
```

```ts
// tests/login.spec.ts — assertions live here, not in the POMs
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('valid login lands on orders', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  const ordersPage = await loginPage.login('qa-buyer@example.com', process.env.QA_PASSWORD!);
  await expect(ordersPage.heading).toBeVisible();
  await expect(ordersPage.orderRows).not.toHaveCount(0);
});

test('invalid password shows error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginExpectingError('qa-buyer@example.com', 'wrong');
  await expect(loginPage.errorAlert).toHaveText('Invalid email or password.');
});
```

**Follow-ups & traps**
- "Why does `login()` return `OrdersPage` but the error variant returns void?" — return types encode navigation outcomes; one method can't honestly do both, hence two methods.
- "Why are locators public?" — so tests can assert on them directly (web-first assertions need the `Locator`); hiding them forces assertion methods into the POM.
- Trap: `login()` that internally asserts success — now the negative test can't reuse it; keep outcomes in the test.

**One-liner** — Readonly locators in the constructor, verbs as methods, navigation methods returning the next page object, assertions staying in tests.

### Q4. How would you design POM for a large application?

**Interview answer** — Three tiers. A slim `BasePage` for genuinely universal things — `page`, common navigation chrome, at most a helper or two. Component objects for widgets repeated across pages: header, side nav, data tables, toast notifications — pages *compose* these rather than re-declaring their locators. Then page classes, one per meaningful screen, kept flat in a `pages/` folder with `components/` beside it. For multi-page journeys like checkout I add a thin flow layer that orchestrates page objects, rather than letting any single page class absorb the whole journey.

**Deep dive** — The base-class warning is the senior part of the answer: inheritance is the most abused tool in POM design — utility dumps in `BasePage` create a god dependency every page drags around, and deep hierarchies (`BasePage` → `AuthenticatedPage` → `AdminPage` → …) make behavior impossible to trace. Prefer composition: a `Header` component field on pages that have a header beats inheriting `clickLogo()` from an ancestor. Page-vs-flow granularity: page classes map to screens (stable, DOM-shaped); flow functions map to journeys (volatile, business-shaped) — separating them stops journey changes from rippling through page classes. Folder layout mirrors this: `pages/`, `components/`, `flows/`, with tests importing flows for journeys and pages for targeted interactions.

**Code**

```ts
// components/header.component.ts — shared widget, composed not inherited
export class Header {
  readonly cartLink: Locator;
  readonly accountMenu: Locator;
  constructor(page: Page) {
    this.cartLink = page.getByRole('link', { name: 'Cart' });
    this.accountMenu = page.getByTestId('account-menu');
  }
}

// pages/catalog.page.ts
export class CatalogPage {
  readonly header: Header;
  readonly productCards: Locator;
  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.productCards = page.getByTestId('product-card');
  }
}

// flows/purchase.flow.ts — journey orchestration, no locators of its own
export async function purchase(page: Page, sku: string) {
  const catalog = new CatalogPage(page);
  await catalog.addToCart(sku);
  await catalog.header.cartLink.click();
  return new CheckoutPage(page);
}
```

**Follow-ups & traps**
- "One class per page or per flow?" — per page for structure, thin flow layer for journeys; either extreme alone is a maintenance problem worth articulating.
- "What goes in BasePage?" — as little as possible; "all our helper methods" is the answer that fails this question.
- Wrong answer: deep inheritance to share behavior — composition via component objects is the Playwright-idiomatic move.

**Senior/lead angle** — Codify the structure so it survives contributors: lint rules forbidding raw selectors in specs, a template for new page classes, and review pressure against BasePage growth. Architecture that isn't enforced regresses to a utils file.

**One-liner** — Slim base page, shared widgets as composed component objects, one class per screen, and a thin flow layer for journeys — composition over inheritance throughout.

### Q5. How do you model a reusable widget — like a data table — as a component object?

**Interview answer** — Give the component a constructor that takes a *root locator* instead of the page, and derive every internal locator from that root. Any page that has the widget instantiates the component scoped to its own instance — two tables on one page are two component instances with different roots, and there's no ambiguity about which table a method touches.

**Deep dive** — Locator-scoped construction works because locators chain: `root.getByRole('row')` searches only within the root's subtree, so the component is positionally independent — it doesn't know or care where on the page it lives. This is exactly how component-based frontends (React/Vue) are built, so the test model mirrors the app's actual architecture, which frontend-savvy interviewers notice. Methods returning locators (like `rowByText`) keep the component assertion-friendly: tests get `Locator`s back and use web-first assertions directly. The chaining also composes downward — a table component can itself instantiate a row component scoped to a row locator — though one level of nesting is usually plenty.

**Code**

```ts
// components/data-table.component.ts
export class DataTable {
  readonly rows: Locator;
  readonly emptyState: Locator;

  constructor(private readonly root: Locator) {
    this.rows = root.getByRole('row').filter({ hasNot: root.getByRole('columnheader') });
    this.emptyState = root.getByText('No records found');
  }

  row(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  async sortBy(column: string) {
    await this.root.getByRole('columnheader', { name: column }).click();
  }
}

// pages/admin-orders.page.ts — two independent tables, one component class
export class AdminOrdersPage {
  readonly pendingOrders: DataTable;
  readonly completedOrders: DataTable;
  constructor(page: Page) {
    this.pendingOrders = new DataTable(page.getByTestId('pending-orders-table'));
    this.completedOrders = new DataTable(page.getByTestId('completed-orders-table'));
  }
}
```

```ts
await adminOrders.pendingOrders.sortBy('Date');
await expect(adminOrders.pendingOrders.row('#1042')).toBeVisible();
await expect(adminOrders.completedOrders.rows).toHaveCount(12);
```

**Follow-ups & traps**
- "Why a root `Locator` and not `Page` plus a selector prefix?" — the locator *is* the scope; string-prefixing selectors is fragile and defeats chaining.
- "Two identical widgets on one page?" — precisely the case this pattern solves; page-scoped locators would be ambiguous.
- Wrong answer: putting table methods on every page that has a table — the duplication component objects exist to remove.

**One-liner** — Scope a component to a root `Locator` and chain everything off it — one class serves every instance of the widget anywhere in the app.

### Q6. Your LoginPage has become extremely large — how do you refactor it?

**Interview answer** — First diagnose why it grew: usually it's absorbed things that aren't the login page. I'd extract embedded widgets into component objects (SSO buttons, MFA panel, password-reset form), split distinct flows the class accreted — registration, forgot-password — into their own page objects for their own screens, delete explicit waits by trusting auto-waiting actions, and evict test logic: assertions, conditionals branching on test scenario, and test data baked into methods all move back to tests or fixtures.

**Deep dive** — Each smell has a mechanical fix. Twenty locators for the MFA panel → an `MfaPanel` component with a root locator, class shrinks by twenty lines and the panel becomes reusable in the settings page tests. Methods like `loginAndGoToCheckoutAndApplyCoupon` → journey logic belongs in a flow function; page objects expose steps, not itineraries. `waitForSelector`/`waitForTimeout` scattered through methods → almost always deletable in Playwright; if a method genuinely must wait for app-specific readiness, one `expect(...).toBeVisible()` at the end of the action is the honest form. Scenario parameters like `login(user, { expectFailure: true })` → split into `login()` and `loginExpectingError()`; boolean scenario flags are the classic sign that test logic has invaded the POM. The refactor is safe to do incrementally because tests are the callers — types drive the migration.

**Follow-ups & traps**
- "How do you refactor without breaking 200 tests?" — extract behind the existing method signatures first, then migrate callers incrementally; TypeScript surfaces every call site.
- "What's the first thing you'd extract?" — the biggest cohesive locator cluster (a widget), because it shrinks the class and creates a reusable component in one move.
- Wrong answer: "split it into LoginPage1 and LoginPage2" — mechanical splitting without a cohesion principle just doubles the mess.
- Trap question: "why is `expectFailure: true` a smell?" — the POM is branching on test intent; outcome-specific methods keep intent in the test.

**One-liner** — Shrink a bloated POM by extracting components, moving journeys to flows, deleting redundant waits, and evicting assertions and scenario flags back to tests.

### Q7. How do you prevent page objects from becoming tightly coupled to tests?

**Interview answer** — Direction discipline: tests depend on page objects, never the reverse. Page objects return data and locators — state the test can assert on — rather than encoding expected outcomes; no method should know what a particular test considers "correct". I keep scenario-specific parameters out of POM signatures, and for bigger frameworks I keep the debate in mind about whether POMs should import from the test framework at all — at minimum they shouldn't import test files or fixtures, though importing `Locator` types and even `expect` is idiomatic in Playwright.

**Deep dive** — Coupling shows up as: POM methods with boolean flags describing test scenarios; methods asserting specific expected values ("verify total is $80.99"); page objects reading test data files; or worst, importing helpers from spec files. The purist position — POMs import zero test-framework symbols so they're reusable outside the runner — is defensible but costs you `expect` for actionability helpers and fights Playwright's grain, where the docs themselves show POMs using framework types. The pragmatic line most strong teams draw: framework *types* yes, fixtures and spec imports never, expected *values* never. Returning locators (not asserting on them) is the key enabler — the test decides what "correct" means; the POM just knows where things are and how to operate them.

**Code**

```ts
// Coupled — the POM knows the test's expected value
async verifyCartTotal(expected: string) {
  await expect(this.total).toHaveText(expected); // scenario knowledge leaked in
}

// Decoupled — POM exposes state, test owns the expectation
get total(): Locator { return this.page.getByTestId('cart-total'); }
async itemCount(): Promise<number> { return this.items.count(); }
```

```ts
// The test decides what correct means
await expect(cartPage.total).toHaveText('$80.99');
expect(await cartPage.itemCount()).toBe(2);
```

**Follow-ups & traps**
- "What's wrong with `verifyCartTotal(expected)`?" — it's an assertion wearing a method costume; every new expectation shape needs a new POM method.
- "Can POMs import `expect`?" — discuss both positions and land somewhere (see Q8); refusing to engage with the debate reads as inexperience.
- Wrong answer: private locators with a `verifyX()` method per assertion — inverts the dependency and bloats the POM.

**One-liner** — POMs expose locators and data, tests own expectations — the moment a page object knows a test's expected value, the dependency arrow has flipped.

### Q8. Should page objects contain assertions?

**Interview answer** — Both positions exist. "No assertions in POMs" keeps a clean action/verification split, keeps POMs reusable across scenarios, and keeps failures pointing at test lines. "Assertions in POMs" reduces duplication for checks every test repeats and reads fluently. My recommendation: `expect` lives in tests as the rule; POMs expose expect-ready public locators so those assertions stay one-liners. Exceptions I'm comfortable with: *readiness* guards inside actions (asserting a form is visible before filling it) and `expect(...).toPass()` wrappers for polling app-specific readiness — those assert preconditions of the action, not outcomes of the scenario.

**Deep dive** — The precondition/outcome distinction is what resolves the debate cleanly: an assertion that a modal is open before interacting with it is part of *performing the action correctly* — it produces a better failure message than a timeout on the next click, and it's scenario-independent, so it belongs in the POM. An assertion that the total equals $80.99 is an *outcome* — scenario knowledge — and belongs in the test. Teams that ban even precondition asserts end up with worse diagnostics; teams that allow outcome asserts in POMs end up with `verifyEverything()` methods and tests you can't read the intent of. The public-locator convention is the hinge: it's what keeps outcome assertions in tests cheap enough that nobody is tempted to push them down.

**Code**

```ts
export class CheckoutPage {
  readonly total: Locator;          // public: expect-ready for tests
  readonly payButton: Locator;

  async applyDiscount(code: string) {
    // Precondition assert — better failure message than a timeout downstream
    await expect(this.discountInput, 'discount field should be open').toBeVisible();
    await this.discountInput.fill(code);
    await this.applyButton.click();
  }
}

// Outcome assertion stays in the test
await checkoutPage.applyDiscount('WELCOME10');
await expect(checkoutPage.total).toHaveText('$80.99');
```

**Follow-ups & traps**
- "Where do you draw the line exactly?" — preconditions/readiness in POMs, outcomes in tests; a crisp line beats "it depends".
- "What about a `expectLoaded()` method on the POM?" — acceptable as a named readiness check; it asserts the page's own invariant, not a scenario outcome.
- Wrong answer at either extreme: "never, ever" (loses diagnostics) or "sure, POMs verify everything" (unreadable tests). Interviewers want the trade-off navigated, not a slogan.

**One-liner** — Outcome assertions belong in tests against public POM locators; POMs may assert their own preconditions and readiness — that line satisfies both camps.

### Q9. How do you inject page objects via fixtures instead of `new LoginPage(page)` in every test?

**Interview answer** — Define one fixture per page object in a `test.extend` and have specs import that extended `test`: the test declares `{ loginPage, ordersPage }` and receives constructed, typed instances. Construction is centralized — constructor changes touch one file — tests lose their `new` boilerplate, and page objects automatically compose with the rest of the fixture graph, like an overridden `page` or role-specific contexts.

**Deep dive** — Beyond deleted lines, the injection point is where cross-cutting decisions plug in: if `loginPage` should be built from an authenticated context, the fixture changes and no test knows; if a POM gains an `ApiClient` constructor parameter, the fixture supplies it from the `api` fixture. Fixtures are lazy per test, so declaring ten POM fixtures in the framework costs nothing for a test that uses two. The trade-off to acknowledge: the fixture list becomes the framework's API surface, and readers must know `ordersPage` means "an `OrdersPage` for this test's page" — a consistent naming convention (fixture name = camelCase class name) keeps that free.

**Code**

```ts
// fixtures.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { OrdersPage } from './pages/orders.page';

type Pages = { loginPage: LoginPage; ordersPage: OrdersPage };

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  ordersPage: async ({ page }, use) => use(new OrdersPage(page)),
});
export { expect };
```

```ts
// orders.spec.ts
import { test, expect } from './fixtures';

test('cancel an order', async ({ ordersPage }) => {
  await ordersPage.goto();
  await ordersPage.openOrder('#1042');
  await ordersPage.cancelButton.click();
  await expect(ordersPage.orderRow('#1042')).toContainText('Cancelled');
});
```

**Follow-ups & traps**
- "Ten POM fixtures — is every test constructing all ten?" — no; fixtures are on-demand, only declared ones are built.
- "Where would you wire an authenticated page into `ordersPage`?" — in the fixture, by depending on a role-page fixture instead of raw `page`; zero test changes.
- Wrong answer: one `pages` mega-fixture returning every POM — forces eager construction and untyped grab-bag access.

**One-liner** — One fixture per POM in `test.extend` gives tests typed, ready page objects and gives the framework a single place to change construction.

### Q10. When is POM overkill?

**Interview answer** — When the abstraction costs more than the duplication it prevents: small suites (a couple dozen tests) where a selector change is a five-minute grep; API-heavy suites where UI interaction is incidental; prototypes and spike tests that won't live long; and one-off admin screens touched by a single test. In those cases plain helper functions — or lightweight task functions in a screenplay-lite style — give reuse where it's actually needed without a class hierarchy nobody maintains.

**Deep dive** — The failure mode of premature POM is concrete: classes with one caller, methods written speculatively, and a `pages/` tree that's larger than the `tests/` tree — abstraction overhead with no amortization. The helper-function alternative scales further than people expect because Playwright's locators already encapsulate the fragile part: a `loginAs(page, role)` function plus `getByRole` calls inline in tests is perfectly maintainable at moderate scale. "Screenplay-lite" — plain task functions like `addToCart(page, sku)` composed in tests, without the full actor/ability ceremony of formal Screenplay — is the honest middle: flow reuse without class plumbing. The judgment interviewers want: start with helpers, introduce page classes when the same page's locators appear in a third file, not on day one. And the inverse trap exists too — staying with helpers at 500 tests until selectors are duplicated everywhere.

**Code**

```ts
// helpers/auth.ts — enough structure for a small suite
export async function loginAs(page: Page, role: 'buyer' | 'admin') {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`qa-${role}@example.com`);
  await page.getByLabel('Password').fill(process.env.QA_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('account-menu')).toBeVisible();
}
```

**Follow-ups & traps**
- "You said POM is best practice — why not always?" — best practice at scale; at small scale the indirection is pure cost. Nuance is the point of the question.
- "What's the signal to introduce POM?" — same page's locators duplicated across ~3+ files, or a widget needing identical interaction logic in many tests.
- Wrong answer: "always POM, it's the standard" — signals pattern-following over engineering judgment.

**One-liner** — POM pays off with scale and churn; for small, short-lived, or API-heavy suites, helper functions deliver the reuse without the class tax.

### Q11. How do POM and getByRole coexist? ("A UI change broke 30 tests — fix the strategy.")

**Interview answer** — They solve different fragilities, so use both: user-facing locators (`getByRole`, `getByLabel`, `getByTestId` for the rest) *inside* page objects. Role-based locators make each selector resilient to markup and styling churn — they break only when the accessible UI actually changes. POM makes whatever does break a one-file fix. For "a UI change broke 30 tests": if 30 tests broke from one change, selectors were duplicated across tests — centralize them in a POM; and if the selectors were CSS/XPath, moving to role-based locators means most such changes wouldn't have broken anything at all.

**Deep dive** — The two mechanisms compose because they address orthogonal axes: locator *strategy* determines break frequency (role locators track the user contract — an ARIA role and accessible name — which survives class renames, div-to-section swaps, CSS refactors); locator *location* determines break blast radius (POM: one file; inline: N files). CSS selectors centralized in a POM still break on every markup refactor — just cheaply; role locators scattered inline break rarely — but expensively when they do. Both together minimize frequency × cost. Bonus argument worth voicing: `getByRole` fails when accessibility regresses (a button losing its accessible name), so the suite doubles as an a11y tripwire — POM alone gives you nothing like that.

**Code**

```ts
export class CheckoutPage {
  readonly promoInput: Locator;
  readonly payButton: Locator;
  readonly lineItems: Locator;

  constructor(page: Page) {
    // User-facing first; test-id where no accessible handle exists
    this.promoInput = page.getByRole('textbox', { name: 'Promo code' });
    this.payButton = page.getByRole('button', { name: /^Pay \$/ });
    this.lineItems = page.getByTestId('line-item');
  }
}
```

**Follow-ups & traps**
- "If getByRole is so stable, why bother with POM?" — locators still need one home, flows still need reuse, and *some* changes (renamed button text) legitimately require a fix — in one file.
- "Why not just test-ids everywhere?" — maximally stable but tests stop verifying the user-visible contract and never catch a11y regressions; use test-ids as the fallback tier.
- Wrong answer to the 30-tests scenario: "add try/catch or fallback selectors" — resilience theater; fix duplication and strategy instead.

**One-liner** — Role-based locators cut how often selectors break; POM cuts how much each break costs — the strategy is both, with locators living inside page objects.

### Q12. How do you keep POMs DRY across web and mobile-web variants?

**Interview answer** — One page class serves both viewports as long as differences are cosmetic — role-based locators don't care about CSS breakpoints. When behavior genuinely diverges — nav collapsing into a hamburger menu, different interaction flows — I keep a shared base class holding the common locators and actions, and small per-variant subclasses overriding only the divergent parts. Playwright projects (desktop vs `devices['iPhone 15']`) run the same tests, and a fixture picks the right variant based on the project.

**Deep dive** — The discipline is keeping the override surface honest: if a "mobile subclass" overrides most methods, it isn't a variant — it's a different page and deserves its own class. Often the divergence is one widget (navigation), so the cleanest cut is at the component level: a `NavComponent` with desktop and mobile implementations, injected into an otherwise-identical page class — smaller override surface than subclassing whole pages. The selection mechanism matters for scale: branching `isMobile ? ... : ...` inside every method is scattered conditionals (the anti-pattern); polymorphism via fixture selection centralizes the decision at construction. `isMobile` comes free as a built-in fixture set by device profiles, so the wiring is one line per fixture.

**Code**

```ts
// Shared base: everything viewport-independent
export class CatalogPage {
  readonly productCards: Locator;
  constructor(protected readonly page: Page) {
    this.productCards = page.getByTestId('product-card');
  }
  async openCart() { await this.page.getByRole('link', { name: 'Cart' }).click(); }
}

// Mobile overrides only what diverges
export class MobileCatalogPage extends CatalogPage {
  async openCart() {
    await this.page.getByRole('button', { name: 'Menu' }).click();
    await this.page.getByRole('link', { name: 'Cart' }).click();
  }
}

// Fixture picks the variant per project — tests are identical
export const test = base.extend<{ catalogPage: CatalogPage }>({
  catalogPage: async ({ page, isMobile }, use) => {
    await use(isMobile ? new MobileCatalogPage(page) : new CatalogPage(page));
  },
});
```

**Follow-ups & traps**
- "Why not `if (isMobile)` inside each method?" — works for one method, becomes scattered conditionals at ten; polymorphism centralizes the divergence.
- "When do you stop sharing?" — when overrides dominate; a subclass overriding 80% is two pages pretending to be one.
- Wrong answer: duplicate `pages/` trees for mobile and desktop — double maintenance for pages that are 90% identical.

**One-liner** — Share one class while differences are cosmetic; when behavior diverges, subclass or swap components per variant and let a project-aware fixture choose.
