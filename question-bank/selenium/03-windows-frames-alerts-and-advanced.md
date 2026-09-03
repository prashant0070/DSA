# Windows, Frames, Alerts & Advanced Interactions

This file is the "hard UI" layer: extra tabs, nested payment iframes, native alerts, shadow DOM, basic auth, permissions, infinite scroll, calendars, tables, typeahead, cookie reuse, SSL, and browser logs. Interviewers use these to see whether you treat WebDriver as a browsing-context API or just `findElement` on the default page. Selenium 4.x APIs (`newWindow`, `getShadowRoot`, `HasAuthentication`, CDP) are called out against the Selenium 3 workarounds.

- Q1. Multiple windows/tabs: getWindowHandles, switchTo().window, new Window API.
- Q2. Button that opens a new tab — store parent, wait, switch, close, switch back.
- Q3. Frames/iframes: index/name/WebElement; defaultContent vs parentFrame; nested frames.
- Q4. Alerts: alert/confirm/prompt; UnexpectedAlertPresentException.
- Q5. Shadow DOM: getShadowRoot, open vs closed, why XPath fails inside shadow.
- Q6. Authentication popups — URL embedding vs CDP vs AutoIT vs HasAuthentication.
- Q7. Browser notifications / geolocation / camera via ChromeOptions prefs.
- Q8. Infinite scroll / virtualized lists.
- Q9. Calendar / dynamic date picker patterns.
- Q10. Dynamic tables and pagination.
- Q11. Autocomplete / typeahead.
- Q12. Cookies and session reuse across tests.
- Q13. How do you handle SSL certificate errors?
- Q14. Browser logs and performance logs (loggingPrefs / CDP).

### Q1. Multiple windows/tabs: getWindowHandles, switchTo().window, new Window API (Selenium 4 newWindow).

**Interview answer** — Each tab or window is a browsing context with a handle string. `getWindowHandle()` is the current one; `getWindowHandles()` is the set. WebDriver commands go only to the current context, so after a click opens "View invoice," I switch with `switchTo().window(handle)` (or iterate the set). Selenium 4 added `switchTo().newWindow(WindowType.TAB|WINDOW)`, which *creates* a context and focuses it — that is for tests that open a URL themselves, not for app-spawned popups.

**Deep dive** — Handles are opaque IDs, not titles. Never `handles.get(1)` after converting the set to a list without a story: set iteration order is not "parent then child" in a spec sense. Always store the parent handle *before* the action, then identify the new one as `handles minus {parent}` (and wait until the set size grows — Q2).

`switchTo().window` does not wait for the new page to hydrate. After switch: wait on URL, title, or a landmark (`[data-testid=invoice-pdf]`). `close()` closes the *current* context; the driver is then on a dead context — you must switch back to the parent or the next command throws `NoSuchWindowException`. `quit()` closes all.

Selenium 3 vs 4: 3.x opened a tab with JS `window.open` and then switched by set difference. 4.x `newWindow` is a W3C new browsing context. Use `newWindow` for "open `/orders` in a second tab to compare." Use handle math for "the Print invoice button targeted `_blank`."

Titles vs handles: `switchTo().window` has no title overload in the Java API — you loop handles, switch, check `getTitle()`/`getCurrentUrl()`. That loop is racy if you do not wait for the title to settle.

**Code**

```java
WebDriver driver = new ChromeDriver(new ChromeOptions().addArguments("--window-size=1920,1080"));
driver.get("https://shop.example.com/orders");
String parent = driver.getWindowHandle();

driver.switchTo().newWindow(WindowType.TAB);
driver.get("https://shop.example.com/orders/1842/invoice");
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid=invoice]")));
driver.close();
driver.switchTo().window(parent);
```

**Follow-ups & traps**
- "`close` vs `quit` after a popup?" — `close` the child, switch to parent; `quit` ends the session.
- Trap: assuming handle order is stable.
- "Does newWindow share cookies?" — Same WebDriver session / same browser profile: yes, cookies are shared across tabs. `sessionStorage` is per tab.
- Mobile web: "windows" may be the same tab; do not assume `_blank` always adds a handle.

**One-liner** — Commands hit one handle at a time; store the parent, switch by handle (or Selenium 4 `newWindow` to create a tab), close child, switch back.

### Q2. How do you handle a button that opens a new tab? Store parent handle first; wait for handle count; switch; validate; close; switch back. Race if you don't wait.

**Interview answer** — The race is: click "Track shipment" (`target=_blank`) and immediately read `getWindowHandles()` — the set may still be size 1. I store the parent handle, click, `WebDriverWait` until `getWindowHandles().size() > 1` (or `> known`), compute the child as the handle not in the parent set, switch, wait for a landmark, assert, `close()`, switch back to parent.

**Deep dive** — `_blank` vs JS `window.open` vs `rel=noopener` all still add a browsing context, but timing differs. A slow tracker domain makes the handle appear before `document.title` is useful — wait on handle count *and* on URL/title/landmark after switch.

Multiple popups: size > 1 is not enough if an earlier chat widget already opened a tab. Store `Set<String> before` and wait until `after` contains an extra handle.

`ExpectedConditions.numberOfWindowsToBe(2)` exists and is the readable form of the wait.

After switch, the child's implicit/explicit waits still use the same driver clocks. Page objects: pass the driver after switch, or a `InvoicePage` that assumes it is already focused. Do not keep a `WebElement` from the parent and use it on the child.

If the app opens a *window* the OS might place off-screen; Grid/headless still has a handle. Native OS popups that are not browsing contexts (OS print dialog) will never appear in `getWindowHandles` — that is not this API.

**Code**

```java
public void openShipmentTracker(WebDriver driver) {
    String parent = driver.getWindowHandle();
    Set<String> before = driver.getWindowHandles();
    driver.findElement(By.cssSelector("[data-testid=track-shipment]")).click();

    new WebDriverWait(driver, Duration.ofSeconds(10))
            .until(ExpectedConditions.numberOfWindowsToBe(before.size() + 1));

    String child = driver.getWindowHandles().stream()
            .filter(h -> !before.contains(h))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("no new tab after Track shipment"));

    driver.switchTo().window(child);
    new WebDriverWait(driver, Duration.ofSeconds(15))
            .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid=tracking-map]")));
    Assertions.assertTrue(driver.getCurrentUrl().contains("/track/"));
    driver.close();
    driver.switchTo().window(parent);
}
```

**Follow-ups & traps**
- Trap: `for (String h : handles) switch` without identifying parent — you may close the parent first.
- "Popup blocker?" — ChromeOptions / prefs; automated Chrome often allows `window.open` from a user gesture (the click). Headless can still differ; assert handle count and fail clearly.
- `newWindow` is the wrong API here — the *app* opened the tab.
- Forgot switch-back: the next CartPage click throws `NoSuchWindowException`.

**Senior/lead angle** — If "Track shipment" is a third-party domain, consider asserting `href` + `target` and skipping the third-party page in CI (contract/API). One smoke test can still open the tab.

**One-liner** — Save parent handles, click, wait for handle count to grow, switch to the new handle, assert, close, switch back — never read handles immediately after click.

### Q3. Frames/iframes: switchTo().frame by index/name/WebElement; defaultContent vs parentFrame; nested frames. Page objects per frame.

**Interview answer** — WebDriver does not see nodes inside an iframe from the parent document. I switch with `switchTo().frame(index | nameOrId | WebElement)`, interact, then `defaultContent()` back to the top or `parentFrame()` one level. Nested payment widgets are switch-into-outer, wait, switch-into-inner. I give each frame its own page object constructed after the switch (or a method that switches, does work, and switches back) so locators are not used in the wrong context.

**Deep dive** — `By` queries are scoped to the current browsing context. `#card-number` in a Stripe iframe is `NoSuchElementException` from the checkout page — the most common "the element is on the screen but Selenium cannot see it" interview answer.

**Index** (`frame(0)`) is last resort: order changes when marketing adds a GTM iframe. **name/id** is better if stable. **WebElement** (`findElement(By.cssSelector("iframe[title='Secure card']"))`) plus `frameToBeAvailableAndSwitchToIt` is the production pattern — wait for mount, then switch.

`defaultContent()` goes to the top-level document, not "the previous frame." After two nested switches, `parentFrame()` is the outer iframe; `defaultContent()` is the shop page. Mixing them up leaves you in the outer payments frame looking for "Place order" on the shop.

Inventory: `driver.findElements(By.cssSelector("iframe"))` from the current context only — nested iframes are invisible until you switch.

Page objects: `StripeCardFrame` methods start with a switch-from-parent contract, or `CheckoutPage.enterCard()` encapsulates switch/type/defaultContent. Do not leak a `WebElement` from the frame to the caller.

Selenium 4: frame switching is still W3C switch-to-frame. Shadow DOM is a different boundary (Q5); do not confuse them.

**Code**

```java
public final class CheckoutPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    private static final By CARD_FRAME = By.cssSelector("iframe[title='Secure card payment']");

    public CheckoutPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public void enterCard(String pan) {
        wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(CARD_FRAME));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.name("cardnumber"))).sendKeys(pan);
        driver.switchTo().defaultContent();
    }
}

// Nested: shop -> payments outer -> card inner
wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(By.id("payments-outer")));
wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(By.id("card-inner")));
driver.findElement(By.name("cardnumber")).sendKeys("4242424242424242");
driver.switchTo().parentFrame(); // still in payments-outer
driver.switchTo().defaultContent(); // shop checkout
```

**Follow-ups & traps**
- Trap: `frame(0)` in a page that grew a chat iframe.
- "Why defaultContent after each field?" — Safer than remembering depth; slightly more chatter. Encapsulate.
- Frame + stale: the iframe node itself can go stale if the SPA remounts it; re-find the iframe WebElement.
- Cross-origin iframe: you can still switch; you cannot read `pageSource` of the parent and see inside. Cookies are origin-scoped.

**One-liner** — Iframes are separate contexts: switch by waited WebElement, use `parentFrame` vs `defaultContent` correctly, and keep a page object per frame.

### Q4. Alerts: alert/confirm/prompt — switchTo().alert, accept/dismiss/sendKeys/getText. UnexpectedAlertPresentException.

**Interview answer** — JS `alert`/`confirm`/`prompt` are *native* dialogs, not DOM. WebDriver must `switchTo().alert()` (wait with `alertIsPresent()`), then `getText()`, `accept()`, `dismiss()`, or `sendKeys()` (prompt only). If an alert is open, most other commands throw `UnexpectedAlertPresentException`. I never "click the OK button" with a locator — there is no DOM node.

**Deep dive** — `Alert` is a thin W3C dialog API. `accept` is OK / yes; `dismiss` is cancel / the escape path. A `confirm` you meant to cancel but `accept`ed is a logic bug, not a wait bug. `sendKeys` on a non-prompt alert is invalid.

Timing: `alert()` in an `onload` or after a slow validation — `switchTo().alert()` immediately throws `NoAlertPresentException`. Always `wait.until(ExpectedConditions.alertIsPresent())`.

`UnexpectedAlertPresentException`: a test clicks Place Order, an alert "Are you sure?" appears, the next `findElement` fails. Fix the product path (don't use JS alerts in modern SPAs) or handle the alert in the page object. Selenium 3 vs 4: the exception still exists; W3C error is `unexpected alert open`. Some drivers include the alert text in the exception — log it.

Not this API: cookie banners, Bootstrap modals, `role=dialog` — those are DOM. OS-level auth dialogs are not JS alerts (Q6). `beforeunload` prompts are driver- and option-sensitive (`--disable-popup-blocking` does not save you); Chrome often auto-accepts `beforeunload` under automation.

**Code**

```java
driver.findElement(By.cssSelector("[data-testid=cancel-order]")).click();
Alert confirm = new WebDriverWait(driver, Duration.ofSeconds(5))
        .until(ExpectedConditions.alertIsPresent());
Assertions.assertTrue(confirm.getText().contains("Cancel order #1842"));
confirm.accept();

// prompt
Alert note = new WebDriverWait(driver, Duration.ofSeconds(5))
        .until(ExpectedConditions.alertIsPresent());
note.sendKeys("Customer requested cancellation");
note.accept();
```

**Follow-ups & traps**
- Trap: `By.id("ok")` on a JS alert.
- Unhandled alert in `@AfterMethod` `quit()` — session can hang; a defensive `try switchTo alert dismiss` in teardown is reasonable.
- Headless: JS alerts still exist in the protocol; you will not "see" them.
- `UnexpectedAlertPresentException` vs `NoAlertPresentException` — one means an alert blocked you; the other means you looked too early or it never appeared.

**One-liner** — Native JS dialogs require `switchTo().alert()` after `alertIsPresent()`; leaving one open makes the next command `UnexpectedAlertPresentException`.

### Q5. Shadow DOM: Selenium 4 getShadowRoot() / SearchContext; open vs closed; why XPath fails inside shadow.

**Interview answer** — Shadow DOM is a sealed subtree under a host (`<checkout-pay>`). Document-level `findElement` / XPath / CSS cannot cross that boundary. Selenium 4 exposes `host.getShadowRoot()` for **open** roots, returning a `SearchContext` you query with `By.cssSelector` (or `By.id`). Closed roots return no root to automation or page JS. XPath from the document cannot see shadow insides; XPath from the `SearchContext` is not the supported path — use CSS inside the root.

**Deep dive** — Why XPath fails: XPath engines start from a document or element in the light DOM. The shadow tree is not a descendant in that document tree (`/html//button` will not match a button inside `#shadow-root`). This is by design, not a Selenium bug.

Open vs closed: `attachShadow({mode:'open'})` sets `element.shadowRoot` in JS and allows `getShadowRoot()`. `mode:'closed'` hides it — payment vendors sometimes close on purpose. Then your options are: ask for open mode or a test hook, use a vendor test key, or do not UI-automate the inner fields (tokenize via their test API).

Nested shadows: get root, find inner host, get root again. Each hop is a `SearchContext`.

Slots / light-DOM children projected in: the slotted node may be queryable from the light DOM even though it *renders* inside the shadow. Know whether the node you want is slotted or truly inside.

Selenium 3: only JS `return arguments[0].shadowRoot` and then sometimes broken conversions. 4.x `getShadowRoot()` is the interview answer.

Playwright pierces open shadow by default on locators. Do not imply Selenium CSS from the document does the same.

**Code**

```java
WebElement host = new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("checkout-pay")));
SearchContext shadow = host.getShadowRoot();
WebElement pan = shadow.findElement(By.cssSelector("[data-testid=card-number]"));
pan.sendKeys("4242424242424242");

// Nested
SearchContext inner = shadow.findElement(By.cssSelector("secure-cvv")).getShadowRoot();
inner.findElement(By.cssSelector("input[name=cvv]")).sendKeys("123");
```

**Follow-ups & traps**
- Trap: `By.xpath(".//input")` from the host "because relative." It still will not enter the shadow.
- Closed shadow + JS `shadowRoot` is null. CDP piercing is a last resort and Chromium-only.
- `NoSuchShadowRootException` — closed or not yet attached; wait for presence of host then retry getShadowRoot.
- Styling/testids inside shadow are still needed; getShadowRoot does not invent stability.

**One-liner** — Open shadow: Selenium 4 `getShadowRoot()` + CSS on the `SearchContext`; closed shadow is opaque; document XPath never crosses the boundary.

### Q6. Authentication popups (basic auth URL embedding vs CDP Network headers vs AutoIT — Grid reality).

**Interview answer** — HTTP basic auth dialogs are browser chrome, not DOM and not `Alert`. Three real approaches: embed credentials in the URL (`https://user:pass@shop.example.com`) — still works in some engines, increasingly stripped or blocked; set an `Authorization` header via CDP `Network.setExtraHTTPHeaders` or Selenium 4 `HasAuthentication.register`; or OS automation (AutoIT/Robot) which fails on Grid/headless. On Grid I use `HasAuthentication` / CDP / a test-only bypass header, never AutoIT.

**Deep dive** — URL embedding: `https://qa-user:s3cret@staging.shop.example.com/orders`. Chrome has been tightening this (phishing). It also puts secrets in logs, Allure URLs, and `getCurrentUrl()`. Do not do this in shared reports.

Selenium 4 `HasAuthentication` (Chromium):

```java
((HasAuthentication) driver).register(() -> new UsernameAndPassword("qa-user", "s3cret"));
```

This registers a callback for auth challenges in that session. It is the cleanest Java 4.x answer. Remote: the driver must implement it (Chrome on Grid 4 often works; confirm the vendor).

CDP: `Network.setExtraHTTPHeaders` with `Authorization: Basic base64(user:pass)`. Applies to requests the page makes after enable — you must `createSession` before `get()`. Does not help if the *browser* shows a dialog before any CDP hook; register auth first, then navigate.

AutoIT/Robot: types into the Windows dialog. Fails on Linux Jenkins, Docker, headless, macOS Safari. Mention only to retire it.

App-level login (HTML form) is not this question — that is POM. NTLM/Kerberos enterprise SSO is worse; often you bypass via a test IdP cookie (Q12) rather than automating the OS dialog.

**Code**

```java
ChromeOptions options = new ChromeOptions();
ChromeDriver driver = new ChromeDriver(options);
driver.register(() -> new UsernameAndPassword("qa-user", "s3cret"));
driver.get("https://staging.shop.example.com/orders");

// CDP fallback
DevTools devTools = driver.getDevTools();
devTools.createSession();
String basic = "Basic " + Base64.getEncoder().encodeToString("qa-user:s3cret".getBytes(UTF_8));
devTools.send(Network.enable(Optional.empty(), Optional.empty(), Optional.empty()));
devTools.send(Network.setExtraHTTPHeaders(new Headers(Map.of("Authorization", basic))));
```

**Follow-ups & traps**
- Trap: `switchTo().alert()` on a basic-auth dialog. Wrong dialog type.
- Secrets in Git — use CI credentials, not hardcoded URL users.
- Firefox: `HasAuthentication` / CDP story is weaker; prefer a staging bypass.
- Grid: AutoIT is the wrong answer even if the candidate's laptop is Windows.

**One-liner** — Basic auth is not a JS alert: use Selenium 4 `HasAuthentication` or CDP headers; URL userinfo is leaky; AutoIT fails on Grid.

### Q7. Browser notifications / geolocation / camera permissions via ChromeOptions prefs.

**Interview answer** — I do not click "Allow" on the native permission prompt — that is browser chrome. I pre-grant or pre-block via Chrome prefs / `LocalState` content settings, or via CDP `Browser.grantPermissions` / `Emulation.setGeolocationOverride`. Notifications: `profile.default_content_setting_values.notifications = 1` (allow) or `2` (block). Geolocation: content setting + optional fake coordinates. Camera/mic: content settings `1/2` or `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream` for CI.

**Deep dive** — Content setting values (Chrome): `0` default, `1` allow, `2` block. Prefs keys: `profile.default_content_setting_values.notifications`, `.geolocation`, `.media_stream_camera`, `.media_stream_mic`. These apply at launch; they do not click an already-shown prompt in a reused profile.

Store locator tests: block notifications so a "Save 10%" push does not intercept Place Order. Store-finder tests: allow geolocation and set CDP lat/long to the Seattle store, not the Grid node's Iowa coordinates.

`--use-fake-ui-for-media-stream` auto-accepts getUserMedia without a dialog — required for a "scan barcode with camera" feature in headless. Pair with a fake video file (`--use-file-for-fake-video-capture=`) when you need a deterministic QR code.

Firefox: `options.addPreference("permissions.default.geo", 1)` etc. Safari: much less controllable; cloud vendors expose capability flags.

Selenium 3 vs 4: prefs were always ChromeOptions; 4 adds easier CDP grant APIs. Still not DesiredCapabilities.

**Code**

```java
ChromeOptions options = new ChromeOptions();
options.addArguments("--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream");
options.setExperimentalOption("prefs", Map.of(
        "profile.default_content_setting_values.notifications", 2,
        "profile.default_content_setting_values.geolocation", 1,
        "profile.default_content_setting_values.media_stream_camera", 1
));
ChromeDriver driver = new ChromeDriver(options);
DevTools devTools = driver.getDevTools();
devTools.createSession();
devTools.send(Emulation.setGeolocationOverride(
        Optional.of(47.6097), Optional.of(-122.3331), Optional.of(1.0)));
driver.get("https://shop.example.com/stores");
```

**Follow-ups & traps**
- Trap: treating the permission bar as a JS alert.
- Grid geolocation is the *node's* unless you override — store-finder tests "fail" by showing the wrong city.
- Allowing notifications in every test is how intercept flakes are born; default block.

**One-liner** — Pre-set Chrome content-settings prefs (and fake media flags) so native permission prompts never appear; override geolocation with CDP when the test depends on a city.

### Q8. Infinite scroll / virtualized lists in Selenium (JS scroll, wait for count increase).

**Interview answer** — Infinite scroll does not paginate with a Next button; it appends (or recycles) items when the sentinel enters the viewport. I scroll the window or the inner container with JS, wait until `findElements(row).size()` increases (or a target SKU appears), and stop on a max-iteration guard or a "no more orders" footer. For virtualized lists the DOM count may *stay flat* — then I wait for text change or a specific order id, not for size == total.

**Deep dive** — Two implementations:

1. **Append:** each scroll adds nodes. Condition: `numberOfElementsToBeMoreThan(rows, lastCount)`.
2. **Virtualize:** ~20 nodes reused. Condition: `textToBePresentInElementLocated` for order `#100`, or the first row's SKU changes.

Scroll target: `window.scrollTo(0, document.body.scrollHeight)` vs `arguments[0].scrollTop = arguments[0].scrollHeight` on `[data-testid=orders-scroll]`. The wrong target is a common "I scrolled but nothing loaded" bug (the window does not move the inner div).

Guard: 20 hops max, fail with the last count. Unbounded `while(true)` is how CI jobs hang.

Debounce: wait after scroll for a spinner `invisibilityOf` or count change; do not sleep 2s as the primary sync.

**Code**

```java
By rows = By.cssSelector("[data-testid=order-row]");
WebElement scroller = driver.findElement(By.cssSelector("[data-testid=orders-scroll]"));
int last = 0;
for (int hop = 0; hop < 20; hop++) {
    int now = driver.findElements(rows).size();
    if (now == last && hop > 0) {
        break; // no growth — end or virtualized
    }
    last = now;
    ((JavascriptExecutor) driver).executeScript(
            "arguments[0].scrollTop = arguments[0].scrollHeight;", scroller);
    new WebDriverWait(driver, Duration.ofSeconds(8))
            .until(d -> d.findElements(rows).size() > now
                    || !d.findElements(By.cssSelector("[data-testid=end-of-orders]")).isEmpty());
}
```

**Follow-ups & traps**
- Trap: asserting 5,000 rows in a virtual list.
- Footer "end of orders" vs stalled network — distinguish with a timeout exception message.
- IntersectionObserver sentinels: scroll the sentinel into view, not just the container height.

**One-liner** — JS-scroll the real container, wait for count (append) or content (virtualized) to change, and cap the loop.

### Q9. Calendar / dynamic date picker patterns (don't hardcode; compute date; next-month loop).

**Interview answer** — I never type `15-09-2026` into a test that will be wrong next quarter. I compute the target `LocalDate` in Java (`plusDays(14)`), read the picker's month header, click Next month until it matches (max 24 hops), then click the day cell by a stable attribute (`data-date="2026-09-17"` or `aria-label`). Disabled past dates are skipped by locator, not by hope.

**Deep dive** — Hardcoded dates fail on (1) the date passing, (2) business rules (no Sunday delivery), (3) locales (`September` vs `septembre`). `LocalDate` + `DateTimeFormatter` with an explicit `Locale` is the model.

Navigation: some widgets render two months; scope day cells to the month panel whose header matches. Some lazy-load fares — wait for price text before clicking a "cheapest" cell (scenarios file).

Do not `sendKeys` into a readonly input that opens the picker — you will fight validation. If the input *is* editable and the product supports ISO typing, that is a cheaper test than the picker; still keep one picker path.

**Code**

```java
public void pickDeliveryDate(LocalDate target) {
    driver.findElement(By.cssSelector("[data-testid=delivery-date]")).click();
    DateTimeFormatter headerFmt = DateTimeFormatter.ofPattern("MMMM uuuu", Locale.ENGLISH);
    String want = target.format(headerFmt);
    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    for (int hop = 0; hop < 24; hop++) {
        String header = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid=cal-month]"))).getText().trim();
        if (header.equals(want)) {
            break;
        }
        driver.findElement(By.cssSelector("[data-testid=cal-next]")).click();
        if (hop == 23) {
            throw new IllegalStateException("Cannot reach month " + want);
        }
    }
    String iso = target.toString(); // 2026-09-17
    wait.until(ExpectedConditions.elementToBeClickable(
            By.cssSelector("[data-testid=cal-day][data-date='%s']".formatted(iso))))
            .click();
}
```

**Follow-ups & traps**
- Trap: `By.linkText("15")` matching 15 in both visible months.
- Disabled dates: `aria-disabled=true` — assert you cannot pick yesterday for delivery.
- Locale of Grid node vs `MMMM` formatter — pin `Locale.ENGLISH` or use `data-date`.

**One-liner** — Compute `LocalDate`, loop Next month with a hop guard, click a `data-date` cell — never hardcode a calendar day.

### Q10. Dynamic tables and pagination.

**Interview answer** — I treat a table as a list of rows I query by cell predicates, not as `tr[3]/td[4]`. Find the row with `XPath` or a loop over `findElements` where SKU and status match, then click that row's action. Pagination is a `do/while` that processes the page, clicks Next if enabled, and guards on max pages and a stalled-page token so a broken Next cannot loop forever.

**Deep dive** — Column indices shift when a "Tax" column ships. Prefer `data-col='sku'` or `<th>`-aligned maps. Extract headers once, build `Map<String,Integer>`, then `td.get(index)`.

Sorting tests: capture a column's texts, sort in Java with the same comparator the product claims, compare. Do not assume string sort equals numeric price sort (`$9` vs `$12`).

Pagination vs infinite scroll: Next is a button with `aria-disabled`. Empty last page is a valid stop. Changing page size (50/100) is a separate test.

Stale: clicking Next replaces `tbody`; do not keep row handles across pages.

**Code**

```java
public Optional<Map<String, String>> findOrder(String sku, String status) {
    By next = By.cssSelector("[data-testid=pager-next]");
    for (int page = 0; page < 50; page++) {
        for (WebElement row : driver.findElements(By.cssSelector("[data-testid=order-row]"))) {
            String rowSku = row.findElement(By.cssSelector("[data-col=sku]")).getText().trim();
            String rowStatus = row.findElement(By.cssSelector("[data-col=status]")).getText().trim();
            if (sku.equals(rowSku) && status.equals(rowStatus)) {
                return Optional.of(Map.of("sku", rowSku, "status", rowStatus,
                        "total", row.findElement(By.cssSelector("[data-col=total]")).getText().trim()));
            }
        }
        WebElement nextBtn = driver.findElement(next);
        if (!nextBtn.isEnabled() || "true".equals(nextBtn.getAttribute("aria-disabled"))) {
            return Optional.empty();
        }
        nextBtn.click();
        new WebDriverWait(driver, Duration.ofSeconds(10))
                .until(ExpectedConditions.attributeToBe(
                        By.cssSelector("[data-testid=orders-table]"), "data-page", String.valueOf(page + 2)));
    }
    throw new IllegalStateException("pagination exceeded 50 pages looking for " + sku);
}
```

**Follow-ups & traps**
- Trap: `tr[2]` as "the second order."
- Next enabled on the last page — detect duplicate first-row SKU as a stall.
- Combined filters + page: reset page to 1 when the filter changes (product bug if not).

**One-liner** — Identify rows by cell values, never by index; paginate with Next + enabled check + max-page guard and re-find rows after each page.

### Q11. Autocomplete/typeahead (slow typing, wait for list, select).

**Interview answer** — Typeahead is a race between keystrokes, debounce, and an async suggest API. I `sendKeys` the query (sometimes character-by-character with a short Actions pause if a single blob does not fire debounce), wait for the listbox to be visible and to contain a known option, then click that option (or ArrowDown+Enter). I do not `sleep(2000)` after typing.

**Deep dive** — Failure modes: suggestions from the *previous* query (`"hea"` still showing while you wanted `"headphones"`), clicking an option that unmounts before click (stale), and selecting by index 0 (sponsored row). Prefer `data-sku` or role+name.

Slow typing: `new Actions(driver).sendKeys(field, "h").pause(Duration.ofMillis(80))...` only if the app's debounce *requires* it. Try a full `sendKeys("headphones")` first; many React typeaheads listen to `input` on the whole string.

Keyboard vs click: keyboard is closer to power users and avoids overlay intercept on a floating list (`ARROW_DOWN` then `ENTER`). After selection, wait for the input value or a chip — the list disappearing is necessary but not sufficient (it also disappears on empty results).

Iframe vendor search (Algolia, etc.): switch frame first. Implicit wait 0 so an empty list does not pay 10s per keystroke.

**Code**

```java
WebElement q = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("product-search")));
q.clear();
q.sendKeys("noise-cancelling headphones");
By option = By.cssSelector("[data-testid=suggestion][data-sku=SKU-88]");
wait.until(ExpectedConditions.visibilityOfElementLocated(option)).click();
wait.until(ExpectedConditions.attributeToBe(q, "value", "Sony WH-1000XM5"));
```

**Follow-ups & traps**
- Trap: `findElements(suggestions).get(0).click()` — ads, "recent searches."
- Implicit wait + empty suggestions list — pays the full implicit timeout (keep implicit 0).
- Iframe search widgets (site search vendors) — switch first.

**One-liner** — Type, wait for the *specific* suggestion, click or key-select, then wait for the input/chip to commit — never sleep and never pick index 0 blindly.

### Q12. Cookies and session reuse across tests (save cookies, inject — limits vs Playwright storageState).

**Interview answer** — I can serialize `manage().getCookies()` plus `localStorage` via JS after a login, write a JSON file, and in the next test `get(origin)`, `addCookie` each cookie, restore storage, then `navigate` to `/orders`. That is a hand-rolled, weaker Playwright `storageState`. Limits: `addCookie` requires the origin first, httpOnly/SameSite/Secure may not round-trip perfectly, tokens expire, and there is no first-class Selenium API. I use it to skip UI login on a long regression; I still keep a real UI login smoke.

**Deep dive** — Playwright `storageState` dumps cookies + localStorage (and origins) as a supported artifact and loads it into a fresh context. Selenium's session is the browser profile of that WebDriver; `quit()` destroys it. Reuse therefore means *re-inject into a new session*.

Parallel: one cookie jar per user. Sharing `sid` across 20 threads on the same buyer account causes cart races. Unique users or unique carts.

Domain: `.example.com` vs `shop.example.com`. Injecting on the wrong host silently drops the cookie.

Grid: the JSON lives on the test JVM; that is fine — cookies are data, not Node files.

When not to: SSO refresh tokens bound to a UA fingerprint; cookies that include a `Secure` flag injected onto `http://localhost`.

**Code**

```java
public record SessionDump(Set<Cookie> cookies, Map<String, String> localStorage) {}

public SessionDump exportSession(WebDriver driver) {
    Map<String, String> ls = (Map<String, String>) ((JavascriptExecutor) driver)
            .executeScript("return Object.fromEntries(Object.entries(localStorage));");
    return new SessionDump(driver.manage().getCookies(), ls);
}

public void importSession(WebDriver driver, String origin, SessionDump dump) {
    driver.get(origin);
    dump.cookies().forEach(c -> driver.manage().addCookie(c));
    dump.localStorage().forEach((k, v) ->
            ((JavascriptExecutor) driver).executeScript(
                    "localStorage.setItem(arguments[0], arguments[1]);", k, v));
    driver.get(origin + "/orders");
}
```

**Follow-ups & traps**
- Trap: `addCookie` on `about:blank`.
- `deleteAllCookies` does not clear localStorage — "logout" is incomplete.
- Playwright comparison: say storageState is the productized form of this dump.

**Senior/lead angle** — Prefer API login that returns a session cookie, then inject. One UI login per worker per day is a luxury; 3,000 UI logins is a suite smell.

**One-liner** — Save cookies + localStorage and inject after `get(origin)` — it works, it is not Playwright storageState, and tokens/users must stay parallel-safe.

### Q13. How do you handle SSL certificate errors?

**Interview answer** — For a staging cert that is self-signed or missing a SAN, I set the W3C capability `acceptInsecureCerts` via `options.setAcceptInsecureCerts(true)` on Chrome/Firefox/Edge Options — not DesiredCapabilities. That tells the driver to proceed past certificate errors. I do not click through the interstitial with locators (`advanced` → `proceed`) as the default strategy; that UI changes and is language-dependent. Production suites should not disable cert checks against production URLs.

**Deep dive** — `acceptInsecureCerts: true` is a standard W3C capability. It covers expired, self-signed, and name-mismatch in most automation browsers. It does *not* fix mixed-content blocking, HSTS preload pinning on a public domain, or corporate MITM with a CA that is not in the browser trust store.

Corporate proxy MITM: install the corp root in the browser/container image, or import a Firefox profile that already trusts it. `acceptInsecureCerts` is a blunt instrument that also hides real misissuance if pointed at prod.

Chrome flags people cargo-cult (`--ignore-certificate-errors`, `--allow-insecure-localhost`) overlap with the capability; prefer the Options API so Grid/cloud receives a real W3C capability. `--ignore-certificate-errors` also changes Chrome's security UI in ways that surprise visual tests.

Selenium 3: people stuffed this into DesiredCapabilities. Selenium 4: Options only.

HSTS: if `shop.example.com` is on the HSTS preload list, a hosts-file override to a box with a bad cert may still fail even with `acceptInsecureCerts` depending on the engine. Use a dedicated `staging.shop.example.com` with its own cert (even if self-signed) rather than fighting HSTS on the production hostname.

**Code**

```java
ChromeOptions chrome = new ChromeOptions();
chrome.setAcceptInsecureCerts(true);
FirefoxOptions firefox = new FirefoxOptions();
firefox.setAcceptInsecureCerts(true);
WebDriver driver = new RemoteWebDriver(URI.create(gridUrl).toURL(), chrome);
driver.get("https://staging.shop.example.com");
```

**Follow-ups & traps**
- Trap: clicking the Chrome interstitial in every test.
- "Will this work on Safari?" — SafariDriver is stricter; cloud vendors have a capability. Do not assume.
- HSTS on the real domain with a hosts-file override — capability may not be enough; use a non-HSTS staging hostname.

**One-liner** — `options.setAcceptInsecureCerts(true)` is the W3C fix for staging certs; do not scrape the interstitial, and do not disable checks against production.

### Q14. Browser logs and performance logs (loggingPrefs / CDP) for debugging.

**Interview answer** — Console and performance data are not in the W3C command set the way screenshots are. On Chromium I enable logs with `goog:loggingPrefs` on ChromeOptions and read `driver.manage().logs().get(LogType.BROWSER)`, or I subscribe via CDP `Log.entryAdded` / `Performance` / `Network`. I dump browser logs in `onTestFailure` next to the screenshot when a checkout fails with a white screen. Firefox/Safari logging is thinner; do not promise a single API across engines.

**Deep dive** — Selenium 3 had `LoggingPreferences` as a well-known desired capability. Selenium 4 still accepts `options.setCapability("goog:loggingPrefs", prefs)` for Chrome. `LogType.BROWSER` is console; `PERFORMANCE` is a CDP performance/network event stream that can be huge. `DRIVER` is chromedriver's own log.

CDP is more reliable long-term as Chrome changes log endpoints: `devTools.addListener(Log.entryAdded(), ...)`. Store entries in a ThreadLocal `List<String>` and attach on failure.

Use cases: JS `TypeError` after Place Order (product bug vs locator bug), 500s on `/api/orders` (pair with HAR/CDP network), long `LargestContentfulPaint` if you are in a performance argument (but a real perf program uses Lighthouse/WebPageTest, not this).

Grid: logs must be collected in the test JVM from the WebDriver session. Node container stdout is a different channel (ops).

**Code**

```java
LoggingPreferences logs = new LoggingPreferences();
logs.enable(LogType.BROWSER, Level.ALL);
ChromeOptions options = new ChromeOptions();
options.setCapability("goog:loggingPrefs", logs);
WebDriver driver = new ChromeDriver(options);
// ... checkout fails ...
for (LogEntry entry : driver.manage().logs().get(LogType.BROWSER)) {
    if (entry.getLevel().intValue() >= Level.SEVERE.intValue()) {
        System.out.println(entry.getTimestamp() + " " + entry.getMessage());
    }
}
```

**Follow-ups & traps**
- Trap: enabling PERFORMANCE logs on every test and OOMing the agent.
- "Is this BiDi?" — Overlapping goal; BiDi log inspector is the portable future (fundamentals Q16). Today CDP/`goog:loggingPrefs` is the Chromium answer.
- Empty logs: capability not set, or Firefox.

**Senior/lead angle** — On-failure browser console + screenshot + URL is the minimum debug pack. Add CDP network only for the checkout project, not the whole monorepo.

**One-liner** — Chromium: `goog:loggingPrefs` or CDP `Log`/`Network` collected on failure; it is not portable to Firefox/Safari and PERFORMANCE logs are too noisy for every test.
