# Selenium Scenarios, Failures & Troubleshooting

This file is the machine-coding and debugging layer: diagnosis playbooks and worked Java 17 solutions for the problems interviewers actually put on a laptop — not-interactable clicks, Grid-only failures, MakeMyTrip-style fare calendars, tables, pagination, infinite scroll, typeahead, dynamic locators, custom waits, captcha boundaries, bug-vs-flake, Selenium-to-Playwright migration, and the exception catalog. Code assumes Selenium 4.x, explicit waits, `By` stored in pages, no DesiredCapabilities.

- Q1. Element not interactable — diagnosis playbook + code.
- Q2. Flaky click on SPA — waits + JS fallback debate.
- Q3. Test passes locally, fails on Grid/CI.
- Q4. MakeMyTrip-style cheapest calendar date (Java).
- Q5. Dynamic table: find row by cell values, extract, sort-verify.
- Q6. Pagination loop with guard.
- Q7. Infinite scroll.
- Q8. Autocomplete.
- Q9. Locator changes every page load.
- Q10. TimeoutException on slow app — custom ExpectedCondition, FluentWait.
- Q11. Third-party widget / captcha / OTP — automate vs mock vs manual.
- Q12. Product bug vs automation bug in Selenium.
- Q13. Migration path Selenium → Playwright for a Java shop.
- Q14. Common Selenium exceptions catalog — cause + fix.

### Q1. Element not interactable — diagnosis playbook + code.

**Interview answer** — I treat "not interactable" as a diagnosis, not a JS-click trigger. I read the exception type, dump URL/handles/iframes, then walk: present? this frame? displayed? enabled? uncovered? stable? In code that means overlay wait, `elementToBeClickable`, `scrollIntoView({block:'center'})`, retry once after dismissing a cookie banner, and only then a named `forceClick` if we have a ticket.

**Deep dive** — Worked playbook for Place Order on checkout:

1. Screenshot + browser console (CDP/logs).
2. `findElements(By.tagName("iframe")).size()` and current `getWindowHandles()`.
3. If `NoSuchElementException`, it was never interactable — locator/wait/frame.
4. If `ElementClickInterceptedException`, the message often cites the overlay CSS class — wait `invisibilityOf` that, or click the banner Accept.
5. If `ElementNotInteractableException` and `isDisplayed()` false, you hit a hidden duplicate (mobile+desktop). Narrow with `[data-testid=place-order]:not([hidden])`.
6. If `isEnabled()` false, assert the missing checkbox (terms) — maybe product.
7. Sticky header covering 8px of the button — center scroll.

**Code**

```java
public final class CheckoutPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    private static final By PLACE_ORDER = By.cssSelector("[data-testid=place-order]:not([hidden])");
    private static final By OVERLAY = By.cssSelector("[data-testid=page-overlay], .cookie-banner");

    public CheckoutPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public void placeOrder() {
        wait.until(ExpectedConditions.invisibilityOfElementLocated(OVERLAY));
        WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(PLACE_ORDER));
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", btn);
        try {
            btn.click();
        } catch (ElementClickInterceptedException first) {
            driver.findElements(By.cssSelector("[data-testid=cookie-accept]"))
                    .stream().filter(WebElement::isDisplayed).findFirst().ifPresent(WebElement::click);
            wait.until(ExpectedConditions.elementToBeClickable(PLACE_ORDER)).click();
        }
    }
}
```

**Follow-ups & traps**
- Trap: global JS click helper as step 1.
- Intercepted in production by a promo modal — product P1.
- Iframe card button — switch, then this playbook.

**One-liner** — Exception type → frame/window → displayed/enabled → overlay/scroll; JS click is a named last resort.

### Q2. Flaky click on SPA — waits + JS fallback debate.

**Interview answer** — SPA clicks flake because the node was replaced, animating, or covered by a route-transition overlay. The fix is re-find + wait for `aria-busy=false` / spinner gone / `elementToBeClickable`, not a random sleep. JS `arguments[0].click()` will "fix" the flake by skipping hit-testing — I reject it as the default. I allow it only for a documented overlay we cannot dismiss (and then we should still file the overlay).

**Deep dive** — Pattern: click filter, wait `stalenessOf` old tbody *or* `attributeToBe(table, "data-loading", "false")`, then click the row. Double-click issues: first click focuses, second navigates — wait for the row to be the selected state (`aria-selected=true`) before asserting the URL.

Debounce: search input — wait for suggestions for *this* query (`aria-label` contains the term).

JS fallback debate to say aloud: "If JS click is the only way the test passes, either the user cannot click either (product) or we are not waiting for the same condition the user waits for (animation). I will not paper over that in the core click method."

When JS click is defensible: a known Chromium bug on a 1×1 SVG; a canvas hotspot; a vendor widget with no pointer events on the visible layer. Method name `forceClickBecauseVendorOverlay()` plus a ticket, never `click(By)` secretly using JS.

Race after click: the next assertion must wait for the *outcome* (URL, toast, row gone), not assume the click's HTTP round-trip means the SPA finished. That is still a wait bug, not a click bug.

**Code**

```java
public void openOrder(String orderId) {
    By row = By.cssSelector("[data-testid=order-row][data-order-id='%s']".formatted(orderId));
    wait.until(ExpectedConditions.attributeToBe(By.cssSelector("[data-testid=orders-table]"), "aria-busy", "false"));
    wait.until(ExpectedConditions.elementToBeClickable(row)).click();
    wait.until(ExpectedConditions.urlContains("/orders/" + orderId));
}
```

**Follow-ups & traps**
- Trap: `Thread.sleep(1000)` before every click in BasePage.
- RetryAnalyzer on click intercept — hides the overlay.

**One-liner** — SPA click flakes are stale/overlay/animation — wait on busy/spinner and re-find; do not default to JS click.

### Q3. Test passes locally, fails on Grid/CI.

**Interview answer** — I bisect environment: same headless flag and 1920×1080 locally, then one-thread Grid, then parallel. Typical deltas: viewport, RTT (timeouts too tight), app URL not reachable from the Node (`localhost` is the Node), missing `LocalFileDetector`, download dir on the Node, timezone/locale, cookie banners in a geo the laptop is not in, and resource contention. I collect screenshot, browser log, session id, and Grid video if we have it.

**Deep dive** — Reproduction matrix:

| Step | What it isolates |
| --- | --- |
| Local headed 1920×1080 | Your laptop vs assumed size |
| Local `--headless=new` | Headless rendering |
| Grid `thread-count=1` | Remote + Node image |
| Grid parallel | Data clash / leaks |

`localhost:8080` from CI: the browser runs elsewhere. Use staging URL or `host.docker.internal`.

Timezone: `America/Los_Angeles` laptop vs `UTC` Node — "delivery today" calendar tests fail. Set `-Duser.timezone` *and* Chrome `--lang` / CDP timezone override consistently.

Fonts: PDF snapshot / visual tests.

**Code**

```java
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new", "--window-size=1920,1080", "--lang=en-US");
options.setAcceptInsecureCerts(true);
if (driver instanceof RemoteWebDriver remote) {
    remote.setFileDetector(new LocalFileDetector());
    System.out.println("session=" + remote.getSessionId());
}
```

**Follow-ups & traps**
- Trap: `if (isCi) Thread.sleep(5000)`.
- "Works on my machine" without matching Options.

**One-liner** — Match Options and URL reachability from the Node, then bisect local headed → local headless → Grid serial → Grid parallel.

### Q4. MakeMyTrip-style cheapest calendar date (Java).

**Interview answer** — The fare calendar paints a price in each enabled day cell. I wait until prices are non-empty, iterate visible enabled cells, parse money (`₹4,599` → 4599), track the minimum (ties keep the earlier date), click that cell. For multiple months I loop Next with a hop cap, remembering the best `(monthHop, index or data-date)`, then navigate back (or re-open) and click. I never hardcode `20-09-2026`.

**Deep dive** — Skip `aria-disabled=true` and empty fare nodes (still loading). Parse with a regex `[^\d]` strip; handle `—` as no fare. Two months visible: scope `findElements` per month panel so "15" does not collide.

**Code**

```java
public LocalDate clickCheapestFare(WebDriver driver, int monthsToScan) {
    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    driver.findElement(By.cssSelector("[data-testid=departure-date]")).click();
    int bestPrice = Integer.MAX_VALUE;
    String bestIso = null;

    for (int hop = 0; hop < monthsToScan; hop++) {
        wait.until(d -> !d.findElements(By.cssSelector("[data-testid=cal-day] .fare")).isEmpty());
        for (WebElement cell : driver.findElements(By.cssSelector("[data-testid=cal-day]:not([aria-disabled='true'])"))) {
            List<WebElement> fares = cell.findElements(By.cssSelector(".fare"));
            if (fares.isEmpty()) continue;
            String raw = fares.get(0).getText();
            if (raw == null || raw.isBlank() || raw.contains("—")) continue;
            int price = Integer.parseInt(raw.replaceAll("[^\\d]", ""));
            String iso = cell.getAttribute("data-date");
            if (price < bestPrice) {
                bestPrice = price;
                bestIso = iso;
            }
        }
        if (hop < monthsToScan - 1) {
            driver.findElement(By.cssSelector("[data-testid=cal-next]")).click();
        }
    }
    if (bestIso == null) {
        throw new IllegalStateException("no priced dates in " + monthsToScan + " months");
    }
    // re-open and walk to the winning month (simple: re-open calendar)
    driver.findElement(By.cssSelector("[data-testid=departure-date]")).click();
    for (int hop = 0; hop < monthsToScan; hop++) {
        List<WebElement> match = driver.findElements(
                By.cssSelector("[data-testid=cal-day][data-date='%s']".formatted(bestIso)));
        if (!match.isEmpty()) {
            match.get(0).click();
            return LocalDate.parse(bestIso);
        }
        driver.findElement(By.cssSelector("[data-testid=cal-next]")).click();
    }
    throw new IllegalStateException("lost date " + bestIso);
}
```

**Follow-ups & traps**
- Trap: parsing the whole cell text (`15₹4599`).
- Tie-breaking: `<` keeps the first (earliest) date.
- Prices load on hover — wait for `.fare` not empty, or use the fare API (stronger).

**One-liner** — Scan enabled day cells, parse fare sub-elements, reduce to min price, click `data-date` — never hardcode the day.

### Q5. Dynamic table: find row by cell values, extract, sort-verify.

**Interview answer** — I identify a row by SKU + status (or any business key), not `tr[i]`. I extract a map of column → text, and for sort-verify I collect a column's values, click the header, collect again, and compare to a Java sort with the same rule (numeric money vs string).

**Deep dive** — Header map: read `th[data-col]` once. Money: strip `$` and commas, compare `BigDecimal`. Stale: do not keep row elements across a sort click — re-find the list.

**Code**

```java
public Map<String, String> rowWhere(WebDriver driver, String sku, String status) {
    for (WebElement row : driver.findElements(By.cssSelector("[data-testid=order-row]"))) {
        String rowSku = row.findElement(By.cssSelector("[data-col=sku]")).getText().trim();
        String rowStatus = row.findElement(By.cssSelector("[data-col=status]")).getText().trim();
        if (sku.equals(rowSku) && status.equals(rowStatus)) {
            Map<String, String> data = new LinkedHashMap<>();
            for (WebElement cell : row.findElements(By.cssSelector("[data-col]"))) {
                data.put(cell.getAttribute("data-col"), cell.getText().trim());
            }
            return data;
        }
    }
    throw new NoSuchElementException("No row SKU=" + sku + " status=" + status);
}

public void verifyTotalSortAscending(WebDriver driver) {
    List<BigDecimal> before = totals(driver);
    driver.findElement(By.cssSelector("[data-testid=th-total]")).click();
    new WebDriverWait(driver, Duration.ofSeconds(10))
            .until(ExpectedConditions.attributeToBe(
                    By.cssSelector("[data-testid=orders-table]"), "data-sort", "total-asc"));
    List<BigDecimal> after = totals(driver);
    List<BigDecimal> expected = new ArrayList<>(before);
    Collections.sort(expected);
    Assertions.assertEquals(expected, after);
}

private List<BigDecimal> totals(WebDriver driver) {
    List<BigDecimal> out = new ArrayList<>();
    for (WebElement cell : driver.findElements(By.cssSelector("[data-testid=order-row] [data-col=total]"))) {
        out.add(new BigDecimal(cell.getText().replaceAll("[^\\d.]", "")));
    }
    return out;
}
```

**Follow-ups & traps**
- Trap: string sort on `$9` vs `$12`.
- Sort that only sorts the current page — say so; full-sort is an API test.

**One-liner** — Find rows by cell predicates, extract via `data-col`, and verify sort with a typed comparator after re-querying.

### Q6. Pagination loop with guard.

**Interview answer** — Process rows on the page, if the target is found return, if Next is disabled stop, else click Next and wait for a page token (`data-page` or first-row SKU change). Cap at N pages. Detect a broken Next that reloads page 1 by comparing a fingerprint.

**Deep dive** — `isEnabled()` vs `aria-disabled="true"` vs missing Next on the last page — handle all three. Empty table: one iteration, then stop.

**Code**

```java
public Optional<WebElement> findSkuAcrossPages(WebDriver driver, String sku) {
    By next = By.cssSelector("[data-testid=pager-next]");
    String lastFingerprint = "";
    for (int page = 1; page <= 50; page++) {
        Optional<WebElement> hit = driver.findElements(By.cssSelector("[data-testid=order-row]"))
                .stream()
                .filter(r -> sku.equals(r.findElement(By.cssSelector("[data-col=sku]")).getText().trim()))
                .findFirst();
        if (hit.isPresent()) {
            return hit;
        }
        List<WebElement> nexts = driver.findElements(next);
        if (nexts.isEmpty() || !nexts.get(0).isEnabled()
                || "true".equals(nexts.get(0).getAttribute("aria-disabled"))) {
            return Optional.empty();
        }
        String fingerprint = driver.findElements(By.cssSelector("[data-col=sku]")).stream()
                .map(WebElement::getText).collect(Collectors.joining("|"));
        if (fingerprint.equals(lastFingerprint) && page > 1) {
            throw new IllegalStateException("pagination stalled on page " + page);
        }
        lastFingerprint = fingerprint;
        nexts.get(0).click();
        new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.attributeToBe(
                        By.cssSelector("[data-testid=orders-table]"), "data-page", String.valueOf(page + 1)));
    }
    throw new IllegalStateException("gave up after 50 pages looking for " + sku);
}
```

**Follow-ups & traps**
- Trap: unbounded `while (true)`.
- Stale rows after Next — always `findElements` again (this loop does).

**One-liner** — Page loop: search, guarded Next, wait for page token, fingerprint stall detection, max pages.

### Q7. Infinite scroll.

**Interview answer** — Scroll the *list container* (not always `window`), wait for row count to grow or a target order id to appear, stop when a footer is visible or count is stable, with a hop cap. Virtualized lists: wait for text, not total count.

**Code**

```java
public boolean scrollUntilOrderVisible(WebDriver driver, String orderId) {
    By rows = By.cssSelector("[data-testid=order-row]");
    By target = By.cssSelector("[data-testid=order-row][data-order-id='%s']".formatted(orderId));
    WebElement scroller = driver.findElement(By.cssSelector("[data-testid=orders-scroll]"));
    JavascriptExecutor js = (JavascriptExecutor) driver;
    int stable = 0;
    int last = 0;
    for (int hop = 0; hop < 30; hop++) {
        if (!driver.findElements(target).isEmpty()) {
            return true;
        }
        int now = driver.findElements(rows).size();
        js.executeScript("arguments[0].scrollTop = arguments[0].scrollHeight;", scroller);
        try {
            new WebDriverWait(driver, Duration.ofSeconds(5))
                    .until(d -> d.findElements(rows).size() > now || !d.findElements(target).isEmpty()
                            || !d.findElements(By.cssSelector("[data-testid=end-of-orders]")).isEmpty());
        } catch (TimeoutException ignored) {
            // count may be virtualized and stay flat
        }
        if (now == last) {
            stable++;
        } else {
            stable = 0;
        }
        last = now;
        if (stable >= 3 || !driver.findElements(By.cssSelector("[data-testid=end-of-orders]")).isEmpty()) {
            break;
        }
    }
    return !driver.findElements(target).isEmpty();
}
```

**Follow-ups & traps**
- Trap: scrolling `window` when the table has its own overflow.
- Asserting `size()==10000` on a virtual list.

**One-liner** — JS-scroll the real scroller, wait for growth or the target id, cap hops, treat stable count as end or virtualization.

### Q8. Autocomplete.

**Interview answer** — Type the query, wait for a listbox option that matches the SKU or accessible name (not index 0), click it, wait for the input or chip to commit. If a single `sendKeys` does not fire debounce, then character-level Actions with a small pause — still no `Thread.sleep(2000)`.

**Code**

```java
public void pickProductSuggestion(WebDriver driver, String query, String sku) {
    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    WebElement box = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("product-search")));
    box.clear();
    box.sendKeys(query);
    By option = By.cssSelector("[data-testid=suggestion][data-sku='%s']".formatted(sku));
    wait.until(ExpectedConditions.elementToBeClickable(option)).click();
    wait.until(ExpectedConditions.attributeContains(box, "value", "WH-1000"));
}

/** Fallback only if a single sendKeys does not fire the debounce. */
public void typeSlowly(WebDriver driver, WebElement box, String query) {
    Actions actions = new Actions(driver);
    for (char c : query.toCharArray()) {
        actions.sendKeys(box, String.valueOf(c)).pause(Duration.ofMillis(60));
    }
    actions.perform();
}
```

Prefer the blob `sendKeys` path first. Slow typing is still not `Thread.sleep(2000)` after the last character — wait for the option.

**Follow-ups & traps**
- Trap: clicking suggestion 0 (sponsored).
- Stale option: By-based wait re-finds.

**One-liner** — Type, wait for the specific SKU suggestion, click, wait for the committed value.

### Q9. Locator changes every page load.

**Interview answer** — If the *id* is generated (`email_a91f`, React `:r0:`), I stop using id and switch to a stable contract: `data-testid`, name, label text via XPath, or role+accessible name. If the *whole tree* changes because of A/B experiments, I pin the experiment. Self-healing locator tools are a last resort and hide missing testids. I file a testability story rather than writing `contains(@id,'email')` that matches three fields.

**Deep dive** — Patterns:

- Dynamic id, stable name: `By.name("email")`.
- Dynamic id, stable label: `//label[normalize-space()='Email']/following-sibling::input`.
- CSS modules hashed class: do not XPath the hash; testid.
- List indices shifting: key by SKU.
- Shadow + random part ids: testid inside shadow.

Healenium-style: demo in interviews as a risk (false heal to the wrong "submit"). A healed locator that passes is worse than a red test — you now assert the wrong field.

A/B: if 50% of loads get `#email` and 50% get `[data-new-login=email]`, no XPath `contains` saves you. Pin `X-Experiment-Override: login-legacy` via CDP headers or a test user bucket.

Partnership: a PR template checkbox "added data-testid for new interactive elements" plus a lint in the frontend repo beats any Selenium cleverness.

**Code**

```java
By email = By.cssSelector("[data-testid=login-email]");
// fallback if the app only has a label
By emailByLabel = By.xpath("//label[normalize-space()='Email']/following::input[1]");
```

**Follow-ups & traps**
- Trap: `contains(@id,'0')`.
- "AI will fix locators" — not a strategy for checkout.

**One-liner** — Dynamic ids mean testids or label-based locators, not smarter contains-XPath or self-healing.

### Q10. TimeoutException on slow app — fix without arbitrary sleep (custom ExpectedCondition, FluentWait).

**Interview answer** — `TimeoutException` means the condition never became true in the allotted time. I first check whether the condition is wrong (waiting for visibility of a hidden spinner). If the app is genuinely slow (orders report), I wait for a *meaningful* signal: `aria-busy`, network via CDP, text "10 orders", custom lambda that parses a progress label. I may raise *that* wait's timeout, not sprinkle sleeps. FluentWait lets me poll slower (less load) and ignore stale.

**Deep dive** — Custom condition: the report page shows `Loading 40%` then the table. Waiting for visibility of the table skeleton is wrong because the skeleton is already visible.

**Code**

```java
Wait<WebDriver> wait = new FluentWait<>(driver)
        .withTimeout(Duration.ofSeconds(45))
        .pollingEvery(Duration.ofMillis(400))
        .ignoring(NoSuchElementException.class)
        .ignoring(StaleElementReferenceException.class)
        .withMessage("orders report did not finish loading");

wait.until(d -> {
    String busy = d.findElement(By.cssSelector("[data-testid=report]")).getAttribute("aria-busy");
    return "false".equals(busy);
});
wait.until(d -> d.findElements(By.cssSelector("[data-testid=order-row]")).size() >= 1);

// custom: wait until total text is parseable money
wait.until(d -> {
    String text = d.findElement(By.cssSelector("[data-testid=cart-total]")).getText();
    return text != null && text.matches("\\$[0-9]+\\.[0-9]{2}");
});
```

**Follow-ups & traps**
- Trap: timeout 45s on every wait because one report is slow — scope the long wait to that page.
- Implicit+explicit stacking making TimeoutException appear at 90s.

**One-liner** — Replace sleep with a FluentWait on a real ready-signal (`aria-busy`, parseable total, row count); lengthen only that wait.

### Q11. Third-party widget / captcha / OTP — what you automate vs mock vs manual.

**Interview answer** — I do not automate real CAPTCHA or smash production OTP. Captcha: disable in test env, a vendor test key, or mock the verification API. OTP: test harness that seeds a fixed code, read from a test mailbox API, or stub the auth service. Third-party payments: Stripe test mode + iframe POM, or tokenize via API and skip the widget in most tests, keeping one smoke through the iframe. Manual: real bank 3DS devices, real captcha as a release checklist item.

**Deep dive** — ROI: 200 tests through Stripe iframe will dominate flake. One UI smoke + API for payment states (`requires_action`, `succeeded`). Stripe test PANs (`4242…`) in a dedicated iframe POM; never live cards.

Captcha: reCAPTCHA has a test site key that always passes; staging must use it. Solving captcha via a paid farm in CI is usually a policy violation and trains you to test Google, not your app. If product insists captcha is on in staging, most UI tests should authenticate via a backdoor header (`X-Test-Bypass-Captcha`) that does not exist in prod.

OTP: `UserFactory.createVerified()` with a well-known code (`000000`) on staging; or poll a test-inbox API for the message; or stub `POST /auth/verify` at a gateway. Reading a real SMS is not an SDET strategy.

OAuth Google popup: use a test IdP or seeded session cookie. Automating Google login violates their terms and flakes.

Bot detection: do not sell `excludeSwitches` as a captcha bypass. If Akamai blocks Grid IPs, allowlist the Node egress CIDR — that is infra, not a locator problem.

**Follow-ups & traps**
- Trap: "we use 2Captcha in CI." Against most companies' security policy and against the idea of *your* app's test env.
- OTP from a real SMS — slow, flaky, PII.

**Senior/lead angle** — Write the boundary in the test strategy: "UI does not assert Google's pixel-perfect captcha; staging has captcha off."

**One-liner** — Captcha/OTP/3DS: test-env bypass, vendor test keys, or API stubs — one smoke through the real widget, never farm captchas in CI.

### Q12. How do you determine product bug vs automation bug in Selenium?

**Interview answer** — I reproduce without automation (same browser, size, account, URL). If a human cannot click Place Order either, it is product (or env). If a human can and Selenium cannot, it is automation (locator, wait, frame, overlay the human dismissed, JS click hiding a real intercept). I also compare Network: 500 on `/api/orders` is product even if the test saw `NoSuchElementException` on a row.

**Deep dive** — Decision table:

| Observation | Lean |
| --- | --- |
| Same fail in headed manual | Product/env |
| Pass manual, fail automation, intercept by cookie banner | Product (banner) *and* missing banner killer — both |
| Stale after we cached WebElement | Automation |
| Wrong total in UI and API | Product |
| Wrong total in UI, API right | Product UI |
| Timeout, server 200, spinner forever | Product |
| Timeout, element there in screenshot | Automation wait/locator |
| Fail only parallel, unique data fixes it | Automation isolation |

Screenshot at failure is the court of record. If the button is clearly enabled and uncovered, look at iframe/shadow. If the screenshot shows a 500 error page, do not "fix the locator."

Process: file against the product if manual reproduces; against the automation repo if not. If both (cookie banner covering Place Order in a geo CI runs in), file two tickets: product to not block checkout, automation to dismiss the banner in `BeforeMethod`. Do not JS-click through a banner and close the product bug — that is how production users stay blocked.

"Flaky" is not a category in this decision. Flaky means you have not classified it yet. After you know whether a human can do it, the flake is either env (Grid) or a race (automation wait) or an intermittent product defect (500s at 2%).

**Follow-ups & traps**
- Trap: filing every TimeoutException on the app team.
- Trap: SDET silently JS-clicks a disabled button and closes the product bug.

**One-liner** — Reproduce manually at the same size/account; screenshot + network tell you whether the user could have succeeded.

### Q13. Migration path Selenium → Playwright for a Java shop (honest: stay on Java with playwright-java OR rewrite TS; hybrid period).

**Interview answer** — There is no drop-in. Two honest paths: (1) **playwright-java** + TestNG — keep Java, gain auto-wait/tracing, lose Node runner/UI mode/fixtures, still manage ThreadLocal, still no Grid requirement; (2) **TypeScript `@playwright/test`** — maximum product, language switch, retrain. A hybrid period is mandatory: freeze Selenium except critical fixes, write *new* checkout flows in Playwright, do not dual-write every test. Success is a shrinking Selenium nightly, not a flag day.

**Deep dive** — Cost: POM locators (`By` vs Locator) must be rewritten; waits deleted; ThreadLocal replaced by worker isolation in Node, or kept in Java; Grid contracts can retire for the Playwright shard. Shared API clients (Rest Assured from Java, or Playwright `APIRequestContext` in TS) can stay as the setup layer.

playwright-java traps: people copy `playwright.config.ts` mental model. There is none. Parallel = TestNG + one Playwright/Browser per thread (same ThreadLocal lesson). Tracing exists (`page.context().tracing()`) but you wire it in a listener yourself. Auto-wait still kills most Selenium explicit waits — that is the win.

TS path traps: SDETs undercount training; CI images switch to Playwright's browsers; reporting (Allure) is rewired; CODEOWNERS and review culture change.

Hybrid rules that prevent a mess:
- New journeys (especially checkout) go to Playwright.
- Selenium gets fixes only, no new page objects unless a P0 hole.
- Shared test data API so both suites do not invent users differently.
- One smoke gate in CI (do not require both suites green for the same path).

When not to migrate: 3,000 stable tests, Safari-as-Safari mandate already on Grid, no flake pain. When to: flake budget blown, new greenfield app, Grid ops more expensive than rewrite.

**Follow-ups & traps**
- Trap: "Selenium 4 BiDi means we already have Playwright."
- Dual CI forever without a kill date for Selenium jobs.

**Senior/lead angle** — ADR with: language, time-box for hybrid (e.g. two quarters), coverage map (which journeys move first — checkout), Grid sunset criteria.

**One-liner** — Java shop: playwright-java+TestNG or a TS rewrite; run hybrid with new tests on Playwright and a kill date — not a silent dual suite forever.

### Q14. Common Selenium exceptions catalog (NoSuchElement, Stale, Timeout, ElementClickIntercepted, UnhandledAlert, NoSuchWindow, NoSuchFrame, SessionNotCreated, InvalidSelector, WebDriverException) — cause + fix for each.

**Interview answer** — I map each exception to a cause class and a first fix. `NoSuchElementException` is locator/context/wait; `StaleElementReferenceException` is a dead handle; `TimeoutException` is a failed explicit wait; `ElementClickInterceptedException` is a covering node; `UnhandledAlertException`/`UnexpectedAlertPresentException` is a JS dialog; `NoSuchWindowException` is a closed handle; `NoSuchFrameException` is a missing iframe; `SessionNotCreatedException` is driver/browser/Grid matching; `InvalidSelectorException` is a bad CSS/XPath; `WebDriverException` is the grab-bag (died session, disconnected Node). I do not retry them all the same way.

**Deep dive**

| Exception | Typical cause | First fix |
| --- | --- | --- |
| **NoSuchElementException** | Wrong By; still loading; other iframe/window; closed shadow | Wait + correct context; inventory frames; testid |
| **StaleElementReferenceException** | SPA replaced the node; cached WebElement/PageFactory | Store `By`, re-find; `stalenessOf` then find |
| **TimeoutException** | Explicit wait condition never true (or stacking with implicit) | Right condition (`aria-busy`); implicit 0; custom FluentWait |
| **ElementNotInteractableException** | Hidden, off-screen, not enabled, zero size | Visible clone locator; scroll; enabled wait |
| **ElementClickInterceptedException** | Overlay, sticky header, cookie banner | Dismiss overlay; center scroll; *not* JS click first |
| **UnexpectedAlertPresentException** / UnhandledAlert | JS alert/confirm open | `alertIsPresent`, accept/dismiss; fix leftover alert in teardown |
| **NoAlertPresentException** | `switchTo().alert()` too early or not a JS alert | Wait; do not use Alert API for cookies/basic auth |
| **NoSuchWindowException** | `close()` without switch back; popup closed | Wait for handles; switch to stored parent |
| **NoSuchFrameException** | Frame not mounted, wrong index/name | `frameToBeAvailableAndSwitchToIt(By)` |
| **SessionNotCreatedException** | Chrome vs chromedriver mismatch; Grid no slot/stereotype; Options rejected | Selenium Manager/pin versions; GraphQL slots; valid ChromeOptions |
| **InvalidSelectorException** | Malformed XPath/CSS; `By.className("a b")` | Validate selector; one class for className |
| **InvalidCookieDomainException** | `addCookie` on about:blank or other host | `get(origin)` first |
| **MoveTargetOutOfBoundsException** | Actions move to coordinates outside viewport | scrollIntoView first |
| **JavascriptException** | executeScript error / detached node | Fix script; re-find element argument |
| **WebDriverException** | Session dead, Node crash, connection reset | Check Grid idle timeout, Node logs, `quit` leaks; recreate session |

Selenium 3 vs 4: names aligned to W3C (`element click intercepted` became a first-class type). Catch the specific type in retries, not `WebDriverException` for everything.

**Code**

```java
public static void clickOrder(WebDriver driver, By locator) {
    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15))
            .ignoring(StaleElementReferenceException.class);
    try {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    } catch (ElementClickInterceptedException e) {
        throw new AssertionError("click intercepted — overlay? " + e.getMessage(), e);
    } catch (TimeoutException e) {
        throw new AssertionError("not clickable: " + locator + " url=" + driver.getCurrentUrl(), e);
    }
}
```

**Follow-ups & traps**
- Trap: `catch (Exception e) { jsClick(); }`.
- `SessionNotCreated` on Monday — Chrome auto-update vs pinned Grid image.
- `InvalidSelector` from string-concat XPath with an SKU containing `'`.

**Senior/lead angle** — A small `ExceptionClassifier` in the listener tags Allure: `INFRA`, `LOCATOR`, `APP`. That is how you stop arguing in Slack.

**One-liner** — Each WebDriver exception has a cause class — context, stale handle, failed wait, overlay, dialog, dead session, bad selector — fix that class; do not JS-click and retry the world.
