# Waits, Locators & Actions

Synchronization and locators produce more Selenium interview time than any other day-to-day topic: implicit-versus-explicit, the implicit+explicit stacking trap, XPath for dynamic IDs, Actions-API drag-and-drop flakes, and StaleElementReferenceException as an architecture rule (store `By`, never cache `WebElement`). These answers assume Selenium 4.x, Java 17, `Duration`, and explicit waits as the default.

- Q1. Implicit vs explicit vs fluent wait — complete comparison and the stacking trap.
- Q2. Thread.sleep vs WebDriverWait — never-sleep, with one narrow exception.
- Q3. ExpectedConditions catalog — when each condition.
- Q4. Element is not interactable — diagnosis tree.
- Q5. Locator strategies — priority order and why.
- Q6. Dynamic elements with XPath — reliable patterns vs brittle ones.
- Q7. CSS vs XPath — performance myth, text, axes, shadow.
- Q8. Relative locators (Selenium 4).
- Q9. Challenges testing dynamic websites (SPA, virtual lists, A/B, lazy load).
- Q10. Actions API — hover, drag-and-drop, context click.
- Q11. How do you zoom a webpage?
- Q12. Screenshots with custom filename (TakesScreenshot, TestNG listener).
- Q13. File uploads — sendKeys vs Robot/AutoIT.
- Q14. File downloads — Chrome prefs, wait for file, content verification.
- Q15. Select class vs custom dropdowns.
- Q16. Checkboxes and radios — isSelected vs click.
- Q17. sendKeys vs JavascriptExecutor set value.
- Q18. StaleElementReferenceException — why, how to recover, POM implication.

### Q1. Implicit vs explicit vs fluent wait — COMPLETE comparison: scope, polling, ignored exceptions, when implicit+explicit combine (the classic trap: they stack).

**Interview answer** — Implicit wait is a global `findElement`/`findElements` timeout on the driver: if `#email` is missing, WebDriver polls until it appears or the implicit clock expires, then throws or returns empty. Explicit wait is a `WebDriverWait` for *one* condition (`visibilityOfElementLocated`, `elementToBeClickable`) with its own timeout. Fluent wait is the same engine — `WebDriverWait` *extends* `FluentWait` — with custom polling interval and ignored exceptions. I set implicit wait to zero and use explicit waits only. Mixing them is the classic trap: they *stack*, because each explicit poll calls `findElement`, which itself may block for the full implicit timeout.

**Deep dive** — Scope. Implicit is driver-wide (`driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10))`) and applies to every find, including finds inside page objects you did not think about. You cannot say "wait 10s for login, 0s for optional promo." Explicit is local: this call, this By, this timeout. Fluent is explicit with knobs.

Polling. Implicit polling interval is driver-implementation defined (often ~500ms, not a contract you should tune). `FluentWait` defaults to 500ms; set `pollingEvery(Duration.ofMillis(200))` for a fast spinner, slower for a heavy grid. Faster polling increases HTTP chatter (see protocol file).

Ignored exceptions. Implicit: the driver keeps polling on "no such element" until timeout. `FluentWait.ignoring(NoSuchElementException.class, StaleElementReferenceException.class)` is what makes a re-find loop survive SPA replacement. `WebDriverWait` ignores `NotFoundException` by default (which includes `NoSuchElementException`); it does **not** ignore `StaleElementReferenceException` unless you add it. That is a frequent "my explicit wait still flakes stale" bug.

Timeout exception. Implicit miss → `NoSuchElementException`. Explicit miss → `TimeoutException` whose cause is often `NoSuchElementException`. Interviewers listen for that distinction.

The stacking trap, mechanically: `implicitlyWait(10s)` + `new WebDriverWait(driver, 20s).until(visibilityOfElementLocated(By.id("place-order")))`. Each `until` poll calls `findElement`. If the button is absent, that inner find can sit for up to 10s. The outer wait's 20s clock is wall-clock of `until` iterations, but those iterations are no longer 500ms — they can be 10s each. You may wait far longer than 20s, or get a confusing timeout. Selenium's own docs say do not mix. Selenium 4 did not "fix" this; the `Duration` API just changed the types.

`pageLoadTimeout` and `scriptTimeout` are *not* implicit waits. They bound `get()`/`navigate` and `executeAsyncScript`. Three different clocks.

**Code**

```java
// Production default: implicit 0, explicit with stale ignored
driver.manage().timeouts().implicitlyWait(Duration.ZERO);
driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
driver.manage().timeouts().scriptTimeout(Duration.ofSeconds(15));

Wait<WebDriver> wait = new WebDriverWait(driver, Duration.ofSeconds(15))
        .pollingEvery(Duration.ofMillis(250))
        .ignoring(NoSuchElementException.class)
        .ignoring(StaleElementReferenceException.class);

WebElement placeOrder = wait.until(ExpectedConditions.elementToBeClickable(
        By.cssSelector("[data-testid=place-order]")));
placeOrder.click();
```

**Follow-ups & traps**
- "Is WebDriverWait different from FluentWait?" — WebDriverWait is a FluentWait with WebDriver defaults (clock, ignored NotFoundException, timeout message).
- Trap: "implicit wait is deprecated in Selenium 4." It is not deprecated; it is discouraged as a strategy.
- "Does implicit wait apply to ExpectedConditions.visibilityOf(element)?" — That condition does not re-find; it uses the handle. Implicit wait is irrelevant there; stale is not.
- "Can I set implicit wait to 2s as a safety net?" — You still stack. Zero plus explicit is the clean model.

**Senior/lead angle** — Encode this in `DriverFactory` (implicit 0) and a single `WaitFactory`. Do not let each author pick 5/10/20/30. Flake dashboards that show 22s timeouts on a 20s wait are often stacking, not a slow app.

**One-liner** — Implicit is global find-timeout, explicit/fluent are per-condition; never mix them — they stack because every explicit poll is a findElement.

### Q2. Thread.sleep vs WebDriverWait — never-sleep argument with the one narrow exception.

**Interview answer** — `Thread.sleep` waits a fixed time whether the Place Order button appeared at 200ms or never. It is slow when the app is fast and still racy when the app is slow. `WebDriverWait` polls a condition and proceeds at the first success, failing at a bounded timeout with a useful exception. I do not sleep in page objects or tests. The only narrow exception is a documented, condition-less pause against a third-party widget that exposes no DOM/network hook — and even then I wrap it in a named helper with a ticket, not a raw `sleep(5000)` in checkout.

**Deep dive** — The never-sleep argument is economic as well as correctness: 200 tests × 3 sleeps × 2s = 20 minutes of scheduled waste per run, every run, forever. Explicit waits convert that to near-zero on a warm environment.

Why people sleep: animation, "stale if I click too fast," file download not hooked, canvas, Flash-era habit. Almost all have a condition: `invisibilityOf` spinner, `stalenessOf` old grid, `numberOfElementsToBeMoreThan` for lazy rows, `FluentWait` on `Files.exists` for downloads, `frameToBeAvailableAndSwitchToIt`.

The narrow exception, stated tightly: a closed-shadow payment iframe from a vendor who animates for 300ms with no attribute change and no request you are allowed to wait on, on a Grid where CDP is blocked. You try: animation-complete via class, `ExpectedConditions.and(...)`, JS `getAnimations()`. If none exist, a single `Thread.sleep` inside `PaymentWidget.waitForVendorPaint()` with a MAX of a few hundred milliseconds and a comment linking the vendor bug is honest. Copy-pasting that sleep into LoginPage is not the exception.

`Thread.sleep` in a `catch` to retry is a poorly written FluentWait. `Thread.sleep` to "let the browser start" is a DriverFactory bug (wait for a URL or a landmark after `get`).

Selenium 3 vs 4: no change. Playwright interviews weaponize this; have the same discipline in Java.

**Code**

```java
// Wrong — always pays 5s, still flakes at 5.1s
WebElement search = driver.findElement(By.id("q"));
search.sendKeys("noise-cancelling headphones");
Thread.sleep(5000);
driver.findElement(By.cssSelector("[data-testid=suggestion]")).click();

// Right — proceeds when the typeahead list exists
search.sendKeys("noise-cancelling headphones");
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=suggestion]")))
        .click();
```

**Follow-ups & traps**
- "Is `FluentWait` with 10s timeout just a sleep?" — No; it *can* return at 150ms.
- Trap: `Sleeper.SYSTEM_SLEEPER` jokes. Stay practical.
- "Our app has 300ms CSS transitions — sleep 300?" — Wait for `elementToBeClickable` / overlay `invisibilityOf`; transitions that block clicks should be waited as intercept, not time.
- Exception abuse: "the animation is 300ms" is not evidence you measured it.

**One-liner** — Sleep always waits the full time and still races; WebDriverWait waits for a condition — raw sleep only inside a named, ticketed helper when no condition exists.

### Q3. ExpectedConditions catalog: visibility, clickable, presence, staleness, url/title, frameToBeAvailable, alertIsPresent, textToBe, numberOfElements. When each.

**Interview answer** — `ExpectedConditions` are canned `Function<WebDriver, T>` implementations you pass to `until`. Presence means in the DOM; visibility means displayed (non-zero size, not `display:none`); clickable means visible and enabled. Those three are not synonyms — a hidden email field is present, a disabled Place Order is visible but not clickable. I pick the weakest condition that still makes the next action legal, and I prefer `*Located(By)` over conditions that take a stale-prone `WebElement`.

**Deep dive** — Catalog with checkout-suite usage.

**presenceOfElementLocated(By)** — the node exists. Use for hidden inputs (`type=hidden` CSRF), or a container you will search inside. Do not click after presence alone.

**visibilityOfElementLocated(By) / visibilityOfAllElementsLocatedBy** — displayed. Use before `getText()` on an order total, before asserting a toast. `visibilityOf(WebElement)` does not re-find.

**invisibilityOfElementLocated / invisibilityOf** — spinner gone, modal closed, "Saving…" disappeared. Best wait *before* asserting the orders grid.

**elementToBeClickable(By)** — visible + enabled. Use immediately before `.click()` on Place Order, Apply Coupon, pagination Next. Does **not** mean "nothing is covering it"; overlay intercept is a different exception after you click.

**stalenessOf(WebElement)** — the handle is dead. Pattern: find spinner or old table, click filter, `until(stalenessOf(oldTable))`, then find the new table. You *must* pass the old handle.

**urlToBe / urlContains / urlMatches / titleIs / titleContains** — navigation and redirects after login or checkout. Cheap and stable when the app uses real URLs.

**frameToBeAvailableAndSwitchToIt(By|id|index)** — waits and switches. Use instead of `switchTo().frame` immediately after a payments iframe mount.

**alertIsPresent()** — returns `Alert`. Use before `getText/accept`. Unexpected alerts still throw elsewhere if you never wait.

**textToBe / textToBePresentInElementLocated / textToBePresentInElementValue** — wait for "Order confirmed" instead of sleeping after submit. Prefer this over `getText().equals` in a loop.

**numberOfElementsToBe / numberOfElementsToBeMoreThan / numberOfElementsToBeLessThan** — cart lines after add-to-cart, infinite scroll append, search results. The right tool for lists.

**attributeContains / attributeToBe / attributeToBeNotEmpty** — `aria-busy=false`, `aria-expanded=true` on a custom dropdown, `value` on a date input.

**elementToBeSelected / elementSelectionStateToBe** — checkboxes after click.

Custom: `wait.until(d -> d.findElement(total).getText().startsWith("$"))`. In Java 17 a lambda is an `ExpectedCondition` if the types match; this is how you wait for a parsed price without sleeping.

Deprecated/removed names: some 3.x helpers were pruned; do not memorize `ExpectedConditions.and` as guaranteed — compose with lambdas if needed.

**Code**

```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email")));
wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid=login-submit]"))).click();
wait.until(ExpectedConditions.urlContains("/account"));
wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid=spinner]")));
wait.until(ExpectedConditions.numberOfElementsToBeMoreThan(By.cssSelector("[data-testid=order-row]"), 0));
wait.until(ExpectedConditions.textToBePresentInElementLocated(
        By.cssSelector("[data-testid=flash]"), "Order placed"));
wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(By.cssSelector("iframe[name=stripe]")));
```

**Follow-ups & traps**
- "visibility vs presence vs clickable?" — DOM vs displayed vs displayed+enabled. Recite with a disabled Place Order example.
- Trap: `elementToBeClickable` as overlay insurance. It does not hit-test. `ElementClickInterceptedException` still happens.
- "Why did presence pass and getText was empty?" — Node exists, text not bound yet. Wait on text or a data attribute.
- Prefer By over WebElement in condition names.

**One-liner** — Presence is DOM, visibility is displayed, clickable is displayed and enabled — use By-based ExpectedConditions, and clickable does not mean unobstructed.

### Q4. What would you do if an element is not interactable? (overlay, animation, iframe, stale, wrong frame, disabled, covered — diagnosis tree)

**Interview answer** — "Not interactable" is several exceptions wearing one sentence. I read the actual type: `ElementNotInteractableException`, `ElementClickInterceptedException`, `InvalidElementStateException`, `StaleElementReferenceException`, `NoSuchElementException`. Then I walk a tree: is it in the DOM, in this frame, visible, enabled, uncovered, stable, and inside an open shadow? Overlay and wrong iframe are the two most common checkout answers; JS-click is the last resort, not the first.

**Deep dive** — Diagnosis tree I would whiteboard.

1. **Did find fail?** `NoSuchElementException` — locator or wait, not interactable yet. Wrong By, still loading, closed shadow, other window.
2. **Wrong browsing context?** Default content vs iframe vs nested payments iframe vs other tab. `switchTo().defaultContent()` then `frameToBeAvailableAndSwitchToIt`. Confirm with a unique landmark in that frame.
3. **Stale?** Re-find from `By`. Do not click a handle from before the cart re-rendered.
4. **Present but not displayed?** CSS `display:none`, `visibility:hidden`, off-screen mobile markup duplicated in DOM. `isDisplayed()` false. Fix locator to the visible clone (`:not([hidden])`, the desktop form).
5. **Disabled?** `disabled` attribute, `aria-disabled=true`, or a parent fieldset. Place Order before terms checkbox. `elementToBeClickable` should have caught this — if they used presence, they skipped it. Product bug vs test skipped a step.
6. **Covered / intercepted?** Cookie banner, chat widget, sticky header, loading overlay, toast. Selenium 4 `ElementClickInterceptedException` message often names the covering element. Dismiss the overlay, wait `invisibilityOf` the spinner, scroll the target into the center (`scrollIntoView`), then click. Do not start with JS click.
7. **Animating?** Coordinates move; click hits the old point. Wait for stability: overlay gone + `elementToBeClickable` + optionally a custom condition that `getRect()` is unchanged across two polls.
8. **Outside viewport / need scroll?** `Actions.moveToElement` or JS `scrollIntoView({block:'center'})`. Infinite lists: the node may not exist until you scroll (virtualization) — that is find, not interactable.
9. **File input / hidden?** `input[type=file]` is often opacity 0. `sendKeys` to the input is legal; `click` may be not interactable. Do not un-hide via JS unless the product is untestable (and then you are not testing the chooser).
10. **Shadow / custom element?** Click the inner interactable in the shadow tree (`getShadowRoot()`), not the host.

Logging: screenshot + `getPageSource` snippet + exception message + current URL + iframe inventory (`findElements(By.tagName("iframe"))`). That package is what you attach in CI.

**Code**

```java
public void clickReady(By locator) {
    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector("[data-testid=overlay]")));
    WebElement el = wait.until(ExpectedConditions.elementToBeClickable(locator));
    ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", el);
    try {
        el.click();
    } catch (ElementClickInterceptedException ex) {
        dismissCookieBannerIfPresent();
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }
}
```

**Follow-ups & traps**
- Trap: "I use JS click for all not-interactable." That hides overlay bugs (cookie banner covering Place Order — a real defect).
- "Intercepted vs not interactable?" — Intercepted: hit-test found another element. Not interactable: not displayed / cannot receive events / not in view depending on driver.
- Iframe without switch looks exactly like NoSuchElement. Always inventory frames.
- Disabled button: confirm product rules before "fixing" with JS.

**Senior/lead angle** — Put overlay dismissal (cookies, nps, chat) in one `ChromeOptions` + one `BannerKiller` in `BeforeMethod`, not in every page. If Place Order is intercepted in production by a promo modal, that is a product P1, not a wait tweak.

**One-liner** — Read the exception, then walk frame → stale → displayed → enabled → overlay → animation → scroll; JS click is a last resort, not a strategy.

### Q5. Locator strategies: id, name, className, tagName, linkText, partialLinkText, cssSelector, xpath. Priority order and why.

**Interview answer** — I prefer locators that are unique, stable across redesigns, and cheap to evaluate: `data-testid` via CSS first (partnership with dev), then `id` if it is a real stable id, then CSS using roles/attributes, then link text only for unique anchors, then XPath when I need text+axis that CSS cannot express. `className` and `tagName` are too coarse for a checkout form. `name` is good on classic forms (`email`, `password`) if unique. I do not start with absolute XPath from the recorder.

**Deep dive** — WebDriver strategies map to `By.*`:

| Strategy | Strength | Failure mode |
| --- | --- | --- |
| id | Fast, unique *if* HTML id is unique and stable | Auto-generated `email_9f3a`, duplicate ids |
| name | Native forms, radio groups | Duplicate names (radios share name on purpose) |
| cssSelector | Fast, readable, attributes, combinators | No parent axis, no text node match |
| xpath | Text, axes, "row that contains SKU" | Verbose, more brittle if absolute |
| linkText / partialLinkText | Unique `<a>` text | i18n, truncation, wrapping `<span>` inside `<a>` |
| className | Single class only in By.className | Compound `btn btn-primary` is invalid for this By |
| tagName | `iframe` inventory, `table` | Never unique on real pages |

Priority I actually implement in a Java shop:

1. `By.cssSelector("[data-testid=place-order]")` — contract with developers, enforced in code review.
2. `By.id("email")` when ids are semantic and unique.
3. Accessible attributes: `[aria-label='Search orders']`, `[type=search]`.
4. CSS structural but short: `#cart [data-sku='SKU-44']`.
5. `By.linkText("View order")` if one on the page.
6. XPath for "the row where the SKU cell is SKU-44, then the cancel button": `//tr[.//td[@data-col='sku'][normalize-space()='SKU-44']]//button[@data-testid='cancel']`.
7. Never: `/html/body/div[3]/div/form/div[2]/input[1]`.

`By.className("btn-primary")` vs `By.cssSelector(".btn.btn-primary")`: the former does not accept compound classes. This is a live trick question.

Selenium 4 relative locators are an extra strategy, not a replacement (Q8). Playwright's getByRole is not in Selenium; you approximate with CSS/XPath.

**Code**

```java
By email = By.id("email");
By password = By.name("password");
By search = By.cssSelector("[data-testid=order-search]");
By placeOrder = By.cssSelector("[data-testid=place-order]");
By viewOrder = By.linkText("View order");
By cancelSku44 = By.xpath(
        "//tr[.//*[@data-testid='sku'][normalize-space()='SKU-44']]//button[@data-testid='cancel']");
```

**Follow-ups & traps**
- "Which is fastest?" — See Q7. Uniqueness beats microbenchmarks.
- Trap: `By.className("btn primary")` — invalid.
- "Why not always XPath?" — Text and axes are worth it; `contains(@class,'btn')` on everything is not.
- `data-testid` in production HTML: some teams strip it. Then use `data-qa` kept in prod, or roles. Have a team convention.

**One-liner** — Prefer stable testids and ids, then CSS, then XPath for text and axes; never recorder absolute paths, and `By.className` takes one class only.

### Q6. How do you handle dynamic elements using XPath? (contains, starts-with, normalize-space, following-sibling, ancestor, axes). Reliable patterns vs brittle ones.

**Interview answer** — Dynamic IDs (`email_7c21`, React `id=":r1:"`) mean I stop matching the whole id and start matching stable substrings, labels, and structure. The XPath functions I actually use are `contains()`, `starts-with()`, `normalize-space()`, and axes (`following-sibling`, `ancestor`, `descendant`) to pin a node by a nearby static label. I avoid index-heavy paths (`div[3]/div[2]`) and `contains(@class,'col')` that match half the page.

**Deep dive** — Patterns that survive a login/checkout redesign.

**Label-to-input.** The email field's id changes; the label text does not.

`//label[normalize-space()='Email']/following-sibling::input`

or `//label[normalize-space()='Email']/@for` then id — two-step, often cleaner in Java (read `for`, then `By.id`).

**Row by cell value.**

`//tr[td[@data-col='status'][normalize-space()='Shipped']][td[@data-col='sku'][normalize-space()='SKU-44']]`

**Button in the same card as a heading.**

`//article[.//h2[normalize-space()='Order #1842']]//button[@data-testid='reorder']`

**contains vs starts-with.** `contains(@id,'email')` matches `email` and `confirm_email` and `email_error`. Prefer `starts-with(@id,'email_')` or a testid. `contains(text(),'Order')` misses nested `<span>Order</span>`; use `contains(.,'Order')` or `normalize-space(.)`.

**normalize-space()** collapses whitespace so `"  Shipped  "` matches. Essential on tables.

**Axes worth reciting:** `ancestor::form`, `following-sibling::td[1]`, `preceding-sibling::label`, `descendant::button`. `following::` (the whole document after) is usually too wide.

**Brittle:** `/html/body/div[2]/div[1]/input`, `//div[3]//button[2]`, `contains(@class,'s-')` for hashed CSS modules (the hash is the dynamic part — you lost). If classes are hashed, you need a testid or a role; XPath cannot save you.

**text() vs string value.** `text()` is the first text node. `.` is the string-value of the element. For "Total: **$42.00**" split across nodes, `td[contains(.,'$42.00')]`.

**Code**

```java
By email = By.xpath("//label[normalize-space()='Email']/following-sibling::input");
By shippedSku = By.xpath(
        "//tr[td[@data-col='sku'][normalize-space()='SKU-44']"
                + " and td[@data-col='status'][normalize-space()='Shipped']]");
By reorder = By.xpath(
        "//article[.//h2[contains(normalize-space(.),'Order #1842')]]"
                + "//button[@data-testid='reorder']");
```

**Follow-ups & traps**
- Trap: `contains(@class,'active')` matching `inactive`. Use `contains(concat(' ',normalize-space(@class),' '),' active ')`.
- "Dynamic id every load" — if nothing nearby is stable, that is a product testability bug; negotiate `data-testid`.
- `starts-with(@href,'/orders/')` for links is solid.
- Performance: a `//tr[...]` from root on a 5,000-row unvirtualized table is slow — scope from a table testid.

**One-liner** — For dynamic IDs, XPath off a stable label or cell value with `normalize-space` and sibling/ancestor axes — never indexed `div[3]` paths.

### Q7. CSS vs XPath — performance myth vs reality, text matching, axes, shadow (neither pierces closed; CSS can pierce open with >>> /shadow).

**Interview answer** — In modern browsers the performance difference between a *well-written* CSS selector and a *well-written* XPath is noise next to HTTP-per-command and network. The real differences are expressiveness: CSS cannot match on text content or walk to a parent; XPath can. Neither XPath nor standard `querySelector` pierces **closed** shadow DOM. Open shadow is not pierced by normal CSS/XPath from the document either — in Selenium 4 you use `getShadowRoot()` (a `SearchContext`) and then CSS inside. Chrome's old `/deep/` and `::shadow` are dead; the `>>>` piercing combinator is not a portable W3C Selenium strategy you should depend on.

**Deep dive** — Myth: "CSS is always faster so never XPath." Origin: IE-era and naive `//*` scans. Blink/Gecko evaluate both in native code. A descendant CSS `.orders [data-sku]` and a tight XPath `//*[@data-testid='orders']//*[@data-sku]` are both fine. A document-wide `//div[contains(@class,'row')]` is slow because it is a bad query, not because XPath is cursed.

CSS wins: readability, compound classes (`.btn.primary`), attributes (`[data-testid=cart]`), `:nth-child`, `:not([disabled])`. Selenium CSS is browser `querySelector` — no parent combinator (`$0 parent` in DevTools is not in CSS).

XPath wins: `parent::`, `ancestor::`, text, `normalize-space`, "td then sibling td". Table row by cell text is XPath's home turf.

Shadow:

- **Closed shadow:** `element.shadowRoot` is null in page JS; Selenium `getShadowRoot()` throws. Neither CSS nor XPath from outside can enter. You need open mode, a test hook, or (Chromium) CDP piercing hacks you should not build a suite on.
- **Open shadow:** Selenium 4 `searchContext = host.getShadowRoot(); searchContext.findElement(By.cssSelector("button"))`. XPath inside shadow is historically unsupported or unreliable — prefer CSS from that `SearchContext`.
- **`>>>` / `::part`:** Playwright locators pierce open shadow by default. Some Chrome experimental piercing combinators appeared in tooling; they are **not** the Selenium 4 public contract. If an interviewer says "CSS `>>>` pierces open shadow," acknowledge Playwright/Chrome-debug history, then say: "In selenium-java I use `getShadowRoot()` + CSS, not a piercing selector from the document root."

**Code**

```java
// CSS — unique testid
By placeOrder = By.cssSelector("[data-testid=place-order]");

// XPath — text + axis CSS cannot express
By row = By.xpath("//tr[normalize-space(td[@data-col='sku'])='SKU-44']");

// Open shadow — not a document-level CSS pierce
WebElement host = driver.findElement(By.cssSelector("checkout-pay"));
SearchContext shadow = host.getShadowRoot();
shadow.findElement(By.cssSelector("[data-testid=card-number]")).sendKeys("4242424242424242");
```

**Follow-ups & traps**
- Trap: "XPath cannot do ids." `By.xpath("//*[@id='email']")` works; `By.id` is still clearer.
- "Which do you use 80% of the time?" — CSS + testids; XPath for tables/labels.
- Closed shadow on a payment widget — automation strategy becomes CDP, vendor test mode, or lower layer (API), not a smarter selector.
- `By.cssSelector("div:contains('Order')")` — jQuery, not W3C CSS. That is a famous wrong answer.

**One-liner** — CSS vs XPath is expressiveness (text/axes), not speed; neither enters closed shadow, and in Selenium 4 open shadow is `getShadowRoot()`, not a portable `>>>`.

### Q8. Relative locators (Selenium 4): above, below, near, toLeftOf, toRightOf — when useful, when fragile.

**Interview answer** — Relative locators find an element by visual proximity to an anchor: `with(By.tagName("input")).above(passwordField)`. They are useful when the DOM order is messy but the screenshot layout is clear — the email field is above password on the login card. They are fragile under responsive layouts, wrapping, zoom, and Grid resolution differences: `toLeftOf` on a 1920px desktop becomes `above` on a 375px viewport.

**Deep dive** — API: `org.openqa.selenium.support.locators.RelativeLocator.with(By).above(By|WebElement)` and `below`, `toLeftOf`, `toRightOf`, `near` (default 50px, overloads with distance). Selenium uses element bounding rects from the driver, not DOM sibling order. Two inputs that are siblings in a column: `above` works. The same form in two columns at wide width: `toLeftOf` might be correct and `above` wrong.

Chaining: `with(By.tagName("button")).below(email).toLeftOf(helpIcon)` — intersection of filters. Over-constraining flakes when the help icon wraps.

`near` is the loosest and the most collision-prone: a "close" spinner and a "close" cookie button.

They do not wait. Wrap in `WebDriverWait` + a By you built, or find the anchor first with a wait.

Not a replacement for testids. If you can add `data-testid=email`, do that. Relative locators are for third-party widgets you cannot mark, or for a demo of 4.x API literacy.

**Code**

```java
import static org.openqa.selenium.support.locators.RelativeLocator.with;

WebElement password = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("password")));
WebElement email = driver.findElement(with(By.tagName("input")).above(password));
email.sendKeys("buyer@example.com");

WebElement terms = driver.findElement(By.cssSelector("[data-testid=terms]"));
WebElement placeOrder = driver.findElement(with(By.tagName("button")).below(terms));
```

**Follow-ups & traps**
- "Are they W3C?" — They are a Selenium helper computed from rects, not a new locator wire type like xpath.
- Trap: using them as the primary strategy for the whole POM.
- Headless window-size 800×600 vs headed 1920×1080 — relative locators change meaning. Pin window size.
- `near` two matches — you get one; it may be the wrong one. Prefer unique `with(By.cssSelector(...))` not `with(By.tagName("input"))`.

**One-liner** — Relative locators match by on-screen geometry — handy for unlabeled fields, fragile under responsive and resolution changes.

### Q9. Challenges testing dynamic websites — practical scenarios (SPA re-render, virtual lists, A/B, lazy load).

**Interview answer** — Dynamic sites break the mental model of "find once, click once." SPAs replace nodes (stale), virtual lists omit off-screen rows (not in DOM), lazy load hydrates after `document.complete`, and A/B tests change locators or flow. The response is the same architecture: re-find via `By`, wait on network-or-DOM conditions, scroll to materialize virtual rows, and pin experiments in test accounts or headers — not harder XPath.

**Deep dive** — Four scenarios from an orders/checkout product.

**SPA re-render.** Filter "Shipped" rebuilds the table. Cached `WebElement` rows die. Wait for `stalenessOf(oldTbody)` or for a counter `aria-busy` to flip, then `findElements` again. Route-level: login is a client redirect — wait `urlContains` + landmark, not `pageLoadTimeout`.

**Virtual lists (react-window, huge order history).** Only ~20 rows exist. `findElement` for order #1 from last year fails until you scroll. Loop: scroll container, wait `numberOfElementsToBeMoreThan` or wait for a specific text, with a max-iteration guard. Asserting `findElements(rows).size() == 10_000` is wrong; assert via search/filter or API.

**Lazy load / skeleton.** `get()` returns, skeletons are visible, then real SKUs. Wait for `invisibilityOf` skeleton or `attributeToBe(aria-busy, false)` or first real `data-sku`. Do not `sleep`.

**A/B / feature flags.** Experiment puts "Place order" behind a new checkout stepper. Tests that look for the old button flake 50/50. Fix: test user bucketing (`X-Experiment-Override` header via CDP), a dedicated flag-off account, or `findElements` branching with both experiences asserted (expensive). Never "retry until the right experiment appears."

**Other dynamics:** infinite scroll (Q in scenarios file), typeahead debounce, websocket order-status ticks (wait on text, not a fixed 3s), hydration mismatch (server HTML then client replace — classic stale on a handle taken too early).

**Code**

```java
WebElement tbody = driver.findElement(By.cssSelector("[data-testid=orders-body]"));
driver.findElement(By.cssSelector("[data-testid=filter-shipped]")).click();
new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.stalenessOf(tbody));
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.numberOfElementsToBeMoreThan(
                By.cssSelector("[data-testid=order-row]"), 0));
```

**Follow-ups & traps**
- Trap: "dynamic means I must use XPath contains." Dynamics are timing and identity, not just ids.
- "How do you know it is virtualized?" — Scroll and watch row count stay ~constant while first SKU changes; or inspect.
- A/B: pinning is a test-data/infra concern, not a locator concern.
- Skeletons that reuse the same testids as real rows — wait on a child that only exists when loaded (price format).

**Senior/lead angle** — Testability stories: `aria-busy`, stable testids on *real* rows not skeletons, experiment override headers. SDETs who only patch waits are paying forever for missing hooks.

**One-liner** — SPAs stale handles, virtual lists hide DOM, lazy load hydrates late, A/B splits the UI — re-find, wait on busy/landmarks, scroll to materialize, pin experiments.

### Q10. Actions API: mouse hover (moveToElement), click-and-hold, drag-and-drop (and why drag-and-drop is flaky — HTML5 vs Actions), context click, sendKeys to body.

**Interview answer** — The Actions API builds a W3C actions chain (pointer ticks + key ticks) and performs it: hover menus (`moveToElement`), click-and-hold, context click, drag-and-drop, sending keys to the active page. Hover is the legitimate use for "Account" menus that only render on `:hover`. Drag-and-drop is the flaky one: HTML5 `dragstart`/`drop` events are not the same as Actions pointer moves, so many sortables need a JS helper. I treat `dragAndDrop` as "try Actions, prove with an assertion, have a JS fallback for HTML5."

**Deep dive** — Selenium 4 Actions map to the W3C actions spec (the same reason DesiredCapabilities died — standardized input). `new Actions(driver).moveToElement(menu).pause(Duration.ofMillis(200)).click(openOrders).perform()`. `pause` is not `Thread.sleep` in your test thread in the same way — it is a tick in the input sequence — but it is still a smell if used to wait for a submenu; prefer wait for submenu visibility after move.

**Hover:** `moveToElement(accountMenu)` then wait for `[data-testid=orders-link]`. Headless and some Grid nodes: hover can fail if the window is not focused or the element is covered. Real-device vs headless differences show up here.

**click-and-hold / release:** sliders, some map pins. Must `release()` or the next test inherits a stuck pointer in that session (another reason not to reuse sessions badly).

**contextClick:** right-click custom menus. Afterward wait for the menu; do not assume it is there.

**sendKeys to body:** `driver.findElement(By.tagName("body")).sendKeys(Keys.ESCAPE)` to close a modal, or Actions `sendKeys(Keys.ENTER)`. Focus matters; if focus is in an iframe, you are typing in the iframe. `Actions.sendKeys` without an element sends to the active element.

**Drag-and-drop flakiness:** `dragAndDrop(source, target)` moves the pointer. HTML5 DnD relies on `DataTransfer`. Chrome often does not fire the HTML5 events from WebDriver pointer moves. Symptoms: no error, item does not move. Workarounds: a well-known HTML5 `simulateDragDrop` script, or the app exposes buttons ("move up") you should have tested instead. Native HTML5 file drops onto a dropzone are a different problem (CDP `Input.dispatchDragEvent` or a hidden file input).

**Code**

```java
WebElement account = wait.until(ExpectedConditions.visibilityOfElementLocated(
        By.cssSelector("[data-testid=account-menu]")));
new Actions(driver)
        .moveToElement(account)
        .pause(Duration.ofMillis(100))
        .perform();
wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid=orders-link]")))
        .click();

WebElement sku = driver.findElement(By.cssSelector("[data-sku=SKU-44]"));
WebElement wishlist = driver.findElement(By.cssSelector("[data-testid=wishlist]"));
new Actions(driver).dragAndDrop(sku, wishlist).perform();
Assertions.assertTrue(
        driver.findElements(By.cssSelector("[data-testid=wishlist] [data-sku=SKU-44]")).size() == 1,
        "HTML5 drag may have silently no-op'd — assert the drop");
```

**Follow-ups & traps**
- Trap: hover tests that pass headed and fail headless — window size and first-hover.
- "Why pause after moveToElement?" — Give CSS `:hover` a tick; still wait for the submenu, do not pause 2s.
- `build().perform()` vs `perform()` — `perform()` builds if needed; both fine.
- Selenium 3 Actions vs 4 — 4 is W3C ticks; some 3-era Safari bugs died, HTML5 DnD did not magically work.

**One-liner** — Actions is W3C pointer/key ticks for hover, right-click, and hold; HTML5 drag-and-drop often silently fails under pointer moves, so always assert the drop.

### Q11. How do you zoom a webpage? (JS zoom, ChromeOptions force-device-scale-factor — limitations)

**Interview answer** — Two common knobs: JavaScript `document.body.style.zoom` (or `transform: scale`) after load, and Chrome launch flag `--force-device-scale-factor=1.25` / a reduced factor to "see more." Both are approximations of user zoom. JS zoom does not match Chrome's real zoom (layout viewport, media queries, CDP emulation). I use zoom only for a specific layout bug or to un-cover a sticky footer in a constrained Grid viewport — not as a default for every test.

**Deep dive** — `executeScript("document.body.style.zoom='80%'")` is Chrome-oriented (`zoom` is not uniformly applied in Firefox; use `transform` + `transformOrigin`). It can change hit-testing: WebDriver clicks use layout rects that may disagree with visual zoom. That produces intercept/miss flakes you introduced.

`--force-device-scale-factor=1` in Docker/Grid is the more legitimate trick: some nodes start with a scale that makes 1920×1080 layout overflow. Pair with `--window-size=1920,1080`. This is device pixel ratio, not Ctrl-+.

CDP `Emulation.setDeviceMetricsOverride` is the precise Chromium tool (width, height, deviceScaleFactor, mobile). Firefox/Safari will not honor it.

Limitations to recite: screenshots capture the zoomed surface (good for visual bugs, bad for image diffs if only CI zooms). Relative locators (Q8) shift. Responsive CSS breakpoints fire if you change width, not if you only set `zoom`. Accessibility zoom (user 200% text) is *not* `body.style.zoom` — do not claim WCAG coverage.

Interviewers sometimes want "Ctrl +". `Keys.chord(Keys.CONTROL, Keys.ADD)` is not reliable: it depends on OS, whether the browser chrome has focus, and headless. Do not use it. If the product under test has an in-app zoom control, click that — you are then testing the product, not Chrome.

**Code**

```java
ChromeOptions options = new ChromeOptions();
options.addArguments("--window-size=1920,1080", "--force-device-scale-factor=1");
WebDriver driver = new ChromeDriver(options);
driver.get("https://shop.example.com/checkout");
((JavascriptExecutor) driver).executeScript("document.body.style.zoom='90%';");
```

**Follow-ups & traps**
- Trap: zooming to "make the element visible" instead of scrolling or dismissing a banner.
- Firefox: `zoom` CSS may no-op; test the actual engine.
- "Can I send Keys.chord(CONTROL, ADD)?" — Unreliable (OS, focus, browser chrome). Not a strategy.

**One-liner** — Zoom with JS `body.style.zoom` or Chrome `--force-device-scale-factor`, knowing neither is real user zoom and both can break hit-testing.

### Q12. Screenshots with custom filename (TakesScreenshot, Files.copy, attach on failure via TestNG listener).

**Interview answer** — `(TakesScreenshot) driver` → `getScreenshotAs(OutputType.FILE)` (or `BYTES`/`BASE64`), then `Files.copy` to a path that includes test name, timestamp, and thread id so parallel runs do not overwrite. I do not screenshot in every page method; I screenshot in `ITestListener.onTestFailure` using the ThreadLocal driver so the file matches the failing thread's browser. Attach the same bytes to Extent/Allure.

**Deep dive** — Viewport screenshot is the default — the visible window, not full page. Full-page screenshot is not a portable W3C command; Chromium can do CDP capture beyond viewport; Firefox has had `fullPage` in some bindings. In Java 4.x, assume viewport unless you add a helper (scroll-stitch is flaky; prefer CDP on Chrome only).

Custom filename: sanitize `ITestResult.getMethod().getMethodName()`, plus `LocalDateTime` formatted `uuuuMMdd-HHmmss`, plus `Thread.currentThread().threadId()`. Extension `.png`. Directory `target/screenshots/` created once in `onStart`.

`OutputType.BYTES` is better for Allure `addAttachment` without a race on disk. `FILE` is a temp file you must copy before the JVM deletes it — `Files.copy(src.toPath(), dest, REPLACE_EXISTING)`.

RemoteWebDriver on Grid: screenshot comes back over the wire as PNG bytes. It works; it is the Node's viewport (headless 1920×1080 if you set it).

Do not cast blindly: `RemoteWebDriver` implements `TakesScreenshot`. A wrapped decorator must forward the interface (or `Augmenter` on remote).

Listener vs try/finally in BaseTest: listener catches asserts; try/finally in the test catches only that test's structure. Prefer listener + ThreadLocal (full code in the TestNG file). This question wants the TakesScreenshot fragment.

**Code**

```java
public static Path screenshot(WebDriver driver, String testName) throws IOException {
    Path dir = Path.of("target", "screenshots");
    Files.createDirectories(dir);
    String safe = testName.replaceAll("[^a-zA-Z0-9-_]", "_");
    Path dest = dir.resolve(safe + "-" + Thread.currentThread().threadId() + ".png");
    File src = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
    Files.copy(src.toPath(), dest, StandardCopyOption.REPLACE_EXISTING);
    return dest;
}
```

**Follow-ups & traps**
- Trap: `screenshot.png` overwritten by parallel methods.
- "Element screenshot?" — `((TakesScreenshot) element).getScreenshotAs` on WebElement in 4.x (Chromium). Useful for a chart; still attach the viewport on failure.
- Alert open: screenshot may fail or omit the native alert. Dismiss or use CDP.
- Base64 in Extent: `OutputType.BASE64` into `<img src="data:image/png;base64,...">`.

**One-liner** — `TakesScreenshot` → copy to a unique path (test + thread) and attach from `onTestFailure` via the ThreadLocal driver.

### Q13. File uploads: sendKeys on input[type=file]; Robot/AutoIT as last resort and why they fail in CI/Grid/headless.

**Interview answer** — The WebDriver-native upload is `sendKeys(absolutePath)` on the `input[type=file]` — even if the input is visually hidden. That injects the file path without opening a native OS chooser. Robot, AutoIT, and Sikuli drive the OS dialog; they need a real desktop, a focused window, and the same OS as the author, so they fail on headless Chrome, Docker Grid, and most CI agents. I only reach for OS automation when the page has no file input (a custom dropzone that cannot be hooked) and even then I prefer a test hook or CDP.

**Deep dive** — Many checkout "Upload invoice" widgets hide the input with `opacity:0` or `display:none`. `click()` on the "Choose file" button opens a native dialog WebDriver cannot see. Do not click the button. Locate the `input[type=file]` (may be outside the shadow or in a different part of the tree) and `sendKeys`. If the input is not in the DOM (pure canvas dropzone), ask for a hidden input — that is a testability story.

Multiple files: `sendKeys(path1 + "\n" + path2)` on Chrome, or multiple inputs. Verify with the filename chip in the UI, not only the sendKeys return.

Remote: the *browser* must see the path. `RemoteWebDriver` + local path fails because the file is on the test JVM, not the Node. Use `((RemoteWebDriver) driver).setFileDetector(new LocalFileDetector())` so the client uploads the file to the Node. Forgetting LocalFileDetector is the #1 Grid upload bug.

Safari: file upload has been historically painful; cloud vendors document workarounds. Do not promise Safari parity.

**Code**

```java
Path invoice = Path.of("src/test/resources/invoices/order-1842.pdf").toAbsolutePath();
if (driver instanceof RemoteWebDriver remote) {
    remote.setFileDetector(new LocalFileDetector());
}
WebElement fileInput = driver.findElement(By.cssSelector("input[type=file][name=invoice]"));
fileInput.sendKeys(invoice.toString());
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.textToBePresentInElementLocated(
                By.cssSelector("[data-testid=invoice-name]"), "order-1842.pdf"));
```

**Follow-ups & traps**
- Trap: AutoIT script in Jenkins Linux. Instant fail.
- "The input is hidden, sendKeys throws not interactable." — Some drivers require the input to be in the DOM but not necessarily displayed; if it throws, JS to set `display:block` is a last resort, or `sendKeys` via JS is a smell compared to unhiding.
- LocalFileDetector only for remote. Locally it is unnecessary.
- Dropzone-only: `input` injection via JS `DataTransfer` is a known pattern; treat as a documented hole.

**One-liner** — Upload with `sendKeys` to `input[type=file]` plus `LocalFileDetector` on Grid; Robot/AutoIT die in headless CI.

### Q14. File downloads: Chrome prefs (download.default_directory, prompt_for_download), waiting for file to appear, content verification.

**Interview answer** — I set Chrome prefs so downloads go to a known directory without a prompt, click the "Export orders CSV" button, then `FluentWait` until the file exists and is not a `.crdownload` in progress. I assert content (header row, an order id), not only that a file appeared. On Grid the directory is on the Node — I use a shared volume, a cloud download API, or fetch via the app's export URL instead of pretending the CI agent disk is the Node disk.

**Deep dive** — Prefs: `download.default_directory` (absolute path), `download.prompt_for_download=false`, `download.directory_upgrade=true`. For PDFs that Chrome wants to *open*: `plugins.always_open_pdf_externally=true` or the newer settings that force download.

Wait: Chrome writes `export.csv.crdownload` then renames. Waiting for `export.csv` without excluding in-progress files asserts a half-written CSV. Wait until the name exists *and* size is stable across two polls, or `.crdownload` is gone.

Content: `Files.readAllLines`, OpenCSV, or PDFBox. For "Export" you care that order `#1842` is in the CSV, matching the UI or the API.

Firefox: `browser.download.folderList=2`, `browser.download.dir`, `helperApps.neverAsk.saveToDisk`. Headless Firefox download has been flakier; mention it.

Headless Chrome historically needed CDP `Browser.setDownloadBehavior`. New headless (`--headless=new`) respects prefs more like headed; still verify on your version.

Grid: screenshot of the Node's `/tmp` is not on Jenkins. Options: Dynamic Grid volume mounts, BrowserStack media URL, or skip UI download and `RestAssured.get("/api/orders/export")` for the same bytes (honest split: one UI test that the button starts a download, API tests for file shape).

**Code**

```java
Path dir = Path.of("target", "downloads", String.valueOf(Thread.currentThread().threadId()));
Files.createDirectories(dir);
ChromeOptions options = new ChromeOptions();
options.setExperimentalOption("prefs", Map.of(
        "download.default_directory", dir.toAbsolutePath().toString(),
        "download.prompt_for_download", false,
        "download.directory_upgrade", true));
WebDriver driver = new ChromeDriver(options);
driver.findElement(By.cssSelector("[data-testid=export-orders]")).click();

Path csv = new FluentWait<>(dir)
        .withTimeout(Duration.ofSeconds(20))
        .pollingEvery(Duration.ofMillis(250))
        .until(d -> {
            try (var stream = Files.list(d)) {
                return stream
                        .filter(p -> p.getFileName().toString().endsWith(".csv"))
                        .filter(p -> !p.getFileName().toString().endsWith(".crdownload"))
                        .findFirst()
                        .orElse(null);
            } catch (IOException e) {
                return null;
            }
        });
List<String> lines = Files.readAllLines(csv);
Assertions.assertTrue(lines.get(0).contains("order_id"));
Assertions.assertTrue(lines.stream().anyMatch(l -> l.contains("1842")));
```

**Follow-ups & traps**
- Trap: asserting file existence only — empty or HTML login page saved as `.csv`.
- Parallel: per-thread download dirs or unique names.
- Grid path mismatch — the flagship follow-up.
- `safebrowsing` blocking a test CSV — prefs or a trusted type.

**One-liner** — Chrome download prefs to a known dir, wait until the file is complete (not `.crdownload`), then assert bytes/content — and remember Grid files live on the Node.

### Q15. Select class for `<select>`; custom dropdowns (click + list item).

**Interview answer** — Native `<select>` is `new Select(element)`: `selectByVisibleText`, `selectByValue`, `selectByIndex`, `getFirstSelectedOption`, `getOptions`, `isMultiple`. Custom dropdowns (divs, listboxes, React Select) are not `<select>` — `Select` throws `UnexpectedTagNameException`. For those I click the combobox, wait for options, click the option by testid or accessible name, and wait for the trigger to show the chosen text.

**Deep dive** — `Select` requires `tagName=select`. It uses option `value` and text. `selectByVisibleText("United States")` is more stable than index. Multi-select: `deselectAll`, `deselectByValue`. Disabled options: selecting them throws `UnsupportedOperationException` / invalid state — good, that is a real constraint.

Custom: `[role=combobox]` + `[role=option]`. Pattern: click trigger → `visibilityOfAllElementsLocatedBy(options)` → filter by text → click → `textToBe` on trigger. Typeahead custom selects: `sendKeys` into the combobox then option click (see autocomplete question).

Do not JS-set `select.value` and skip the change event unless you also dispatch `input`/`change` — still a smell (Q17).

Nested options / `<optgroup>`: `selectByVisibleText` still works on the option text.

**Code**

```java
Select country = new Select(driver.findElement(By.id("country")));
country.selectByVisibleText("United States");
Assertions.assertEquals("US", country.getFirstSelectedOption().getAttribute("value"));

// Custom dropdown — not Select
driver.findElement(By.cssSelector("[data-testid=shipping-method]")).click();
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.elementToBeClickable(
                By.cssSelector("[data-testid=shipping-option][data-value=express]")))
        .click();
new WebDriverWait(driver, Duration.ofSeconds(5))
        .until(ExpectedConditions.textToBe(
                By.cssSelector("[data-testid=shipping-method]"), "Express"));
```

**Follow-ups & traps**
- Trap: wrapping a React Select with `new Select(...)`.
- `getAttribute("value")` vs `getText()` on `<option>` — value is the form payload; text is the label.
- Invisible native select replaced by a widget: the native select may still exist and be hidden — updating it via Select may work *and* skip UI validation. Prefer the visible widget if that is what users use.

**One-liner** — `Select` is only for real `<select>`; custom comboboxes are click, wait for options, click item, assert the trigger.

### Q16. Checkboxes/radios; isSelected vs click.

**Interview answer** — `isSelected()` reads the selected state of checkbox/radio (and `<option>`). `click()` toggles a checkbox; it does not "set true." The production pattern is: if I need terms accepted, `if (!box.isSelected()) box.click();` — a second click would uncheck and fail checkout. Radios: click the one whose value I want; `isSelected()` on the others should be false. Do not use `isSelected` on a styled `div` with `aria-checked` — read the ARIA or the real input.

**Deep dive** — Hidden native input + custom CSS box: `click()` on the label is more reliable than on a 0×0 input. `isSelected()` still runs on the `input`. If you click the decorative `div`, you might miss the input — then `isSelected` stays false.

`sendKeys(Keys.SPACE)` on a focused checkbox also toggles. Same toggle trap.

Wait: after click, `elementSelectionStateToBe(box, true)` rather than assuming the click applied (some UIs debounce, some validate and revert).

Radio groups share `name`. `findElements(By.name("shipping"))` and assert exactly one `isSelected`.

**Code**

```java
WebElement terms = driver.findElement(By.cssSelector("input[name=terms]"));
if (!terms.isSelected()) {
    driver.findElement(By.cssSelector("label[for=terms]")).click();
}
new WebDriverWait(driver, Duration.ofSeconds(5))
        .until(ExpectedConditions.elementToBeSelected(terms));

driver.findElement(By.cssSelector("input[name=shipping][value=express]")).click();
Assertions.assertTrue(
        driver.findElement(By.cssSelector("input[name=shipping][value=express]")).isSelected());
```

**Follow-ups & traps**
- Trap: always `click()` in `@BeforeMethod` "to be sure" — that unchecks.
- `getAttribute("checked")` returns `"true"` or `null`, not boolean; `isSelected()` is the API.
- Custom switch with no input: `aria-checked="true"`.

**One-liner** — `isSelected` reads state; `click` toggles — set a checkbox by clicking only when it is not already in the desired state.

### Q17. sendKeys vs JavascriptExecutor set value — when JS-set is a test smell.

**Interview answer** — `sendKeys` synthesizes user typing: focus, key events, input/change depending on the driver and browser. JS `element.value = '...'` writes the DOM property and often **skips** React/Vue listeners, input masks, Stripe-hosted fields, and validation that runs on keyup. I use `sendKeys` (or `sendKeys` + `Keys.TAB` to blur) for email, card, search. JS-set is a smell except for a hidden field the user never types, or an unblockable widget you have already quarantined.

**Deep dive** — React controlled inputs are the usual failure: JS sets `value`, the virtual DOM resets it on next render, or the store never updates so Place Order submits empty. Symptom: test types in a screenshot but the request payload is blank. `sendKeys` still works because it fires `input` events React listens for. If `sendKeys` is slow on a 16-digit card with per-key formatting, that is still closer to the user than JS.

Clear then type: `email.clear(); email.sendKeys(user);`. `clear()` can fail on custom widgets; `Keys.chord(CONTROL, "a")` then backspace. JS `value=""` has the same event problem.

File inputs: `sendKeys(path)` is the *right* non-keyboard injection (Q13). That is not the smell. The smell is JS-setting visible text fields.

Contenteditable / TinyMCE: often needs `sendKeys` on the body inside an iframe, or a vendor API. JS `innerHTML` skips the editor's model.

Clear then type: `email.clear(); email.sendKeys(user);`. `clear()` can fail on custom widgets; `Keys.chord(CONTROL, "a")` then backspace. JS `value=""` has the same event problem.

The one legitimate JS set: a hidden `input type=hidden` the user never types (CSRF you already have from the API). Still prefer the server to set it. If a React input ignores `sendKeys` (rare, usually a locator on the wrong node), fix the locator before JS.

**Code**

```java
WebElement email = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email")));
email.clear();
email.sendKeys("buyer@example.com");
email.sendKeys(Keys.TAB); // trigger blur validation

// Smell — may not update React state or masks
// ((JavascriptExecutor) driver).executeScript("arguments[0].value = arguments[1];", email, "buyer@example.com");
```

**Follow-ups & traps**
- Trap: "JS is faster so we JS-set everything." You are not testing the form.
- `sendKeys` on an intercept-covered field throws; JS-set "succeeds" and hides the overlay bug.
- Character-by-character vs blob: `sendKeys` can send the whole string; some typeaheads need slow typing (Actions pause) — that is still sendKeys, not JS.

**One-liner** — `sendKeys` fires real typing events; JS `value=` skips masks, React, and validation — treat it as a smell on user-facing fields.

### Q18. StaleElementReferenceException — WHY it happens (DOM replace), how to recover (re-find, never cache WebElements in POM fields — store By, re-query). This is THE architecture implication.

**Interview answer** — A `WebElement` is a remote ID pointing at a specific node. When the SPA destroys that node and creates a new one that *looks* identical — cart refresh, React key change, toast re-mount, pagination replace — the ID is dead and the next `click()`/`getText()` throws `StaleElementReferenceException`. Recovery is to locate again from a `By`. The architecture implication: page objects store locators (`By`), not elements; every interaction re-queries (usually through a wait). Caching `WebElement` fields in a POM is how you schedule flakes.

**Deep dive** — The W3C error name is `stale element reference`. The driver checks its node map; the UUID is gone. The Java exception wraps that.

Common checkout triggers:

- Click "Apply coupon" → cart summary re-renders → the Place Order handle you found earlier is stale.
- `findElements` rows, click delete on row 0, the list re-renders, row 1's handle is stale — do not iterate a stored list across mutations; re-find each loop.
- `PageFactory` `@FindBy` proxy: first use resolves and **caches**; after re-render the proxy is stale until you get a new page object. `AjaxElementLocatorFactory` re-finds with a timeout but still races and hides the By. Many seniors skip PageFactory for this reason.
- Switch frame or window and use an element from the other context — can present as stale or no-such-element depending on driver.

Recovery patterns:

1. Catch stale, retry find+action N times (FluentWait ignoring stale).
2. Wait `stalenessOf(old)` then find the new node (intentional rebuild).
3. Never hold handles across known re-renders.

What not to do: refresh the page as a generic stale fix; JS-click the stale handle (still stale); increase implicit wait (stale is not "not yet present").

Playwright contrast: Locator re-resolves, so this exception is rare. Saying that in a Selenium interview shows you understand the handle model (Q9).

**Code**

```java
public final class CartPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    private static final By PLACE_ORDER = By.cssSelector("[data-testid=place-order]");
    private static final By APPLY_COUPON = By.cssSelector("[data-testid=apply-coupon]");
    private static final By TOTAL = By.cssSelector("[data-testid=cart-total]");

    public CartPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15))
                .ignoring(StaleElementReferenceException.class);
    }

    public void applyCoupon(String code) {
        driver.findElement(By.id("coupon")).sendKeys(code);
        WebElement totalBefore = driver.findElement(TOTAL);
        wait.until(ExpectedConditions.elementToBeClickable(APPLY_COUPON)).click();
        wait.until(ExpectedConditions.stalenessOf(totalBefore));
        wait.until(ExpectedConditions.visibilityOfElementLocated(TOTAL));
    }

    public void placeOrder() {
        wait.until(ExpectedConditions.elementToBeClickable(PLACE_ORDER)).click();
    }
}
```

**Follow-ups & traps**
- Trap: "stale means the locator is wrong." The locator may be perfect; the *handle* died.
- "Is implicit wait related?" — No. The element was found; then the DOM changed.
- PageFactory debate — take the senior side: store `By`.
- RetryAnalyzer on stale — hides a POM caching bug; fix the cache.

**Senior/lead angle** — This is a framework law: `By` fields, waits that re-find, no `WebElement` instance fields, loops that re-query. Code review automated check (ArchUnit / grep `private WebElement`) is reasonable on a large suite. ThreadLocal driver plus By-based POM is the Selenium parallel architecture in one sentence.

**One-liner** — Stale means the DOM replaced the node behind your handle — re-find from `By` every time, and never cache `WebElement` in page objects.
