# Locators, Gestures & Waits

This file is the hands-on core of a mobile SDET interview: how you find views on Android and iOS, why XPath is worse on a phone than on the web, how you wait for screens that animate, and how you gesture without the deprecated `TouchAction` API. Examples assume a shop app — login, product lists, checkout, payments — and the Appium 2 Java client (`AppiumBy`, W3C actions, `mobile:*` gestures).

- Q1. Locator strategies on mobile
- Q2. Why XPath is especially painful on mobile
- Q3. accessibility id / content-desc / accessibilityIdentifier — working with developers
- Q4. Waits on mobile: implicit vs explicit, FluentWait, wait for activity/screen
- Q5. Gestures: W3C Actions vs deprecated TouchAction vs `mobile:*` / gestures plugin
- Q6. Scroll to element: UiScrollable, iOS predicate, loop-swipe with a guard
- Q7. Hide keyboard, orientation, background / foreground
- Q8. Deep links and launch arguments for skipping UI setup
- Q9. Notifications shade and permission dialogs
- Q10. Biometric mocks — emulator vs real
- Q11. OTP / SMS / email verification on mobile
- Q12. Alerts and native system dialogs (iOS SpringBoard)
- Q13. Finding elements in lists / RecyclerView / UITableView
- Q14. Page objects for mobile: screen objects and widget objects

### Q1. Locator strategies on mobile

**Interview answer** — I rank locators by stability and cost. First: accessibility id — `content-desc` on Android, `accessibilityIdentifier` / `name` on iOS — because it is cross-platform, fast, and the testability hook I ask developers for. Second: Android `resource-id` and iOS predicate or class chain, which query the native engines directly. Third: class name only when the screen has exactly one of that type. Last: XPath, which serializes and walks a large tree and breaks when marketing inserts a banner. Image locators exist via the images plugin; they are a last resort for a canvas or a third-party SDK with no tree node. I never start a new screen object with XPath.

**Deep dive** — Each strategy is implemented by a different vendor query. `AppiumBy.accessibilityId` becomes `description` in UiAutomator and `name`/`identifier` in XCUITest — one Java call, two native lookups. `AppiumBy.id` on Android is `package:id/name`; on iOS it is often the same as accessibility id, which surprises people coming from web `id`. `AppiumBy.androidUIAutomator` sends a `UiSelector` / `UiScrollable` string to the UiAutomator2 server — fast, Android-only, and the only honest way to "scroll into view" without writing a swipe loop. `AppiumBy.iOSNsPredicateString` and `AppiumBy.iOSClassChain` are compiled XCTest queries; they are the iOS equivalent of a good CSS selector. Class name (`android.widget.Button`, `XCUIElementTypeButton`) is a type filter, not an identity. Image locators screenshot the screen and template-match; they are resolution-, theme-, and animation-sensitive.

A shop login screen should be: `email`, `password`, `login` accessibility ids. A product list should be: `sku-{id}` on each row, not "the third `android.view.ViewGroup`." If the tree cannot say that, the locator strategy conversation is actually a testability conversation (Q3).

**Code**

```java
// Preferred — same call on both platforms when the team set the hook
driver.findElement(AppiumBy.accessibilityId("login"));
driver.findElement(AppiumBy.accessibilityId("sku-SKU-99"));

// Android resource-id and UiSelector
driver.findElement(AppiumBy.id("com.shop.android:id/email"));
driver.findElement(AppiumBy.androidUIAutomator(
    "new UiSelector().resourceId(\"com.shop.android:id/pay_now\").enabled(true)"));

// iOS predicate and class chain — native XCTest, not XPath
driver.findElement(AppiumBy.iOSNsPredicateString(
    "type == 'XCUIElementTypeButton' AND (name == 'Pay now' OR label == 'Pay now')"));
driver.findElement(AppiumBy.iOSClassChain(
    "**/XCUIElementTypeCell[`name == 'sku-SKU-99'`]"));

// Last resorts
driver.findElement(AppiumBy.xpath("//android.widget.Button[@text='Place order']"));
driver.findElement(AppiumBy.image(Base64.getEncoder().encodeToString(Files.readAllBytes(payPng))));
```

**Follow-ups & traps**
- "Which locator is fastest?" — Vendor queries (accessibility id, UiSelector, predicate/class chain). XPath is slowest. Image is slowest and flakiest.
- "Why not `By.id` from Selenium?" — It works for some ids but `AppiumBy` is the client API that includes mobile strategies. Use `AppiumBy` everywhere in mobile code so the next reader does not think they are in a browser.
- Trap: `findElements(AppiumBy.className("android.widget.TextView")).get(7)` as a list row. Index locators die on A/B banners and font-scale.
- Trap: copying Inspector's absolute XPath into a page object and calling it "done."

**Senior/lead angle** — Publish a locator standard in the framework README and enforce it in review: no new XPath without a comment linking a testability ticket. The standard is what keeps a 20-person mobile guild from inventing 20 styles.

**One-liner** — Accessibility id first, native UiSelector/predicate/class-chain second, class name rarely, XPath and image last — pick the query the vendor engine can run cheaply.

### Q2. Why XPath is especially painful on mobile

**Interview answer** — On the web, XPath walks a DOM that the browser already keeps. On mobile, a find often forces the driver to snapshot the entire accessibility tree into XML and then evaluate the XPath against that snapshot. iOS XCUITest snapshots are expensive — they walk UIKit/SwiftUI accessibility — so a single deep XPath can take seconds and can time out WDA under load. The trees are also wide and shallow-ugly: React Native and Flutter emit stacks of `XCUIElementTypeOther` / `android.view.View` with no text, so an XPath like `//android.view.View[3]/android.view.View[1]/...` is both slow and one-banner-away from breaking. I treat XPath as a temporary probe, not a strategy.

**Deep dive** — Two costs stack. *Serialization cost*: UiAutomator2 and WDA must freeze a hierarchy that includes every visible node (and on iOS, sometimes more). A shop home with a carousel, a tab bar, and a 20-row feed is a large XML document; you pay that on every XPath find, and you pay it again if the client retries. *Evaluation cost*: XPath engines on the driver are generic. A predicate `name == 'Pay now'` is an indexed XCTest query; `//XCUIElementTypeButton[@name='Pay now']` may still snapshot-and-scan. iOS is worse than Android here — Apple's snapshotter is a known XCUITest bottleneck, which is why Appium exposes `snapshotMaxDepth`, `customSnapshotTimeout`, and "use class chain / predicate instead of XPath" in every serious iOS postmortem.

Fragility is the other half. Mobile teams ship A/B layouts, insert promo strips, and wrap buttons in extra containers for analytics. XPath that encodes hierarchy encodes those experiments. Text-based XPath (`@text='Place order'`) is slightly better but dies on localization (Q9 in file 03) and on `Place order` vs `PLACE ORDER` vs a trailing space from a11y. If you must XPath, constrain it: `//*[@content-desc='pay-now']` is just a slow accessibility-id lookup — so use the accessibility id.

**Code**

```java
// Painful: hierarchy XPath from Inspector, iOS will snapshot the world
driver.findElement(AppiumBy.xpath(
    "//XCUIElementTypeWindow/XCUIElementTypeOther[2]/XCUIElementTypeOther[1]"
        + "/XCUIElementTypeButton[3]"));

// Acceptable stopgap: attribute XPath with no axis walk — still slower than AppiumBy
driver.findElement(AppiumBy.xpath("//*[@content-desc='pay-now']"));

// What you actually ship
driver.findElement(AppiumBy.accessibilityId("pay-now"));
driver.findElement(AppiumBy.iOSClassChain("**/XCUIElementTypeButton[`name == 'pay-now'`]"));
```

**Follow-ups & traps**
- "It is flaky only on iOS, Android is fine." — Classic XPath+XCUITest signature. Move iOS to predicate/class chain first; do not raise `newCommandTimeout` and call it a fix.
- "Can I XPath on `page_source` locally and cache?" — You can parse source in Java, but you still need a vendor find to click, and the tree may have changed. Do not build a shadow XPath engine.
- Trap: `//*[contains(@text,'Pay')]` matching "Pay later", "Payment methods", and "Pay now."
- Trap: blaming the app for "slow finds" when every find is an unbounded XPath.

**One-liner** — Mobile XPath snapshots a huge accessibility tree and walks it — especially expensive under XCUITest — so it is both slow and brittle; use native queries instead.

### Q3. accessibility id / content-desc / accessibilityIdentifier — working with developers

**Interview answer** — Accessibility id is the cross-platform contract: Android `contentDescription` / `content-desc`, iOS `accessibilityIdentifier` (and sometimes `accessibilityLabel`). I treat it as a testability API that also helps real VoiceOver/TalkBack users, and I negotiate it the same way web teams negotiate `data-testid`. For a checkout I want stable, *semantic* ids — `email`, `pay-now`, `sku-SKU-99` — not the visible label, because labels localize and marketing copy changes. If a screen has no ids, the defect is in the app, not in Appium.

**Deep dive** — The mapping is imperfect and you should say so. On Android, `contentDescription` is what TalkBack reads; stuffing `sku-SKU-99` there can make a screen noisier for users unless the team also sets a proper visible text and uses `IMPORTANT_FOR_ACCESSIBILITY` carefully. A better Android pattern is a dedicated `resource-id` plus a concise content-desc for the action. On iOS, `accessibilityIdentifier` is *not* read by VoiceOver — it is a test/debug hook — while `accessibilityLabel` is what is spoken. That makes `accessibilityIdentifier` the correct test hook on iOS and the one I ask SwiftUI/UIKit developers to set (`accessibilityIdentifier("pay-now")`). React Native `testID` maps to `resource-id` on Android and `accessibilityIdentifier` on iOS — that is the one-prop cross-platform win. Flutter needs `Semantics(identifier: ...)` / `Key` plus a driver that can see it.

Process: I file tickets with a table of screens and required ids, I add a CI assertion that `page_source` contains the id on critical screens (file 01 Q14), and I reject screen-object PRs that XPath around a missing id. For lists, the id must include the business key (`sku-SKU-99`, `order-2024-1102`), not `product-row-3`.

**Code**

```java
// Screen object depends on a contract the app team owns
public final class CheckoutScreen {
    private static final By PAY_NOW = AppiumBy.accessibilityId("pay-now");
    private static final By CARD_WEBVIEW_HOST = AppiumBy.accessibilityId("card-form");
    private final AppiumDriver driver;

    public OrderConfirmationScreen pay() {
        driver.findElement(PAY_NOW).click();
        return new OrderConfirmationScreen(driver);
    }
}

// What I send developers (Kotlin / Swift sketches)
// Android: payNow.contentDescription = "pay-now"  — or androidx testTag / resource-id
// iOS:     payNow.accessibilityIdentifier = "pay-now"   // not the VoiceOver label
// RN:      <Button testID="pay-now" />
```

**Follow-ups & traps**
- "content-desc vs resource-id on Android?" — `resource-id` is usually more stable and does not affect TalkBack. Use id for identity, content-desc for "what TalkBack says" and as a cross-platform accessibility id when the team agrees.
- "Our designers own the labels, we cannot freeze them." — That is why you use identifiers, not labels. Visible text is for assertions on copy tests, not for finds.
- Trap: setting iOS `accessibilityLabel` to `pay-now` so VoiceOver reads "pay dash now" to users. Identifier ≠ label.
- Trap: unique ids on the login button but not on list rows — lists are where you need them most (Q13).

**Senior/lead angle** — Put testability in the definition of done for mobile stories that SDET will cover. A story that ships a payment sheet with no identifiers has not shipped for automation, and the lead should say that in planning, not after the sprint demo.

**One-liner** — Accessibility id is a negotiated API: iOS `accessibilityIdentifier`, Android id/content-desc, RN `testID` — semantic and stable, never the localized label.

### Q4. Waits on mobile: implicit vs explicit, FluentWait, wait for activity/screen

**Interview answer** — Mobile is slower than web: session chatter, animations, activity/fragment transitions, network on a radio, and vendor snapshot cost. I set implicit wait to zero and use explicit `WebDriverWait` / `FluentWait` on a *screen condition* — an accessibility id that means "checkout is ready," Android `currentActivity()`, or an iOS predicate for the nav bar title — not on every random `TextView`. Implicit waits plus explicit waits stack and make "not present" checks painfully slow. I never `Thread.sleep` except as a last-ditch against a known animation with no hook, and I treat that as debt.

**Deep dive** — Implicit wait is a driver-wide poll on `findElement`. Combined with a 20s `WebDriverWait` you can wait 20s × (inner implicit) on a missing element. The Java client's default is often 0 already in recent versions; I still set it explicitly. Explicit waits should poll a condition that is cheap and semantically tied to readiness: `presence` of `pay-now` after `checkout` click; `AndroidDriver.currentActivity()` containing `.CheckoutActivity`; `mobile: getContexts` containing a WEBVIEW after `pay-now`. Polling `page_source.contains` works but is expensive on iOS — prefer a single native find.

FluentWait is the same loop with a configurable poll interval, ignored exceptions, and a message. On mobile I use a longer timeout (15–30s for a payment authorization) and a 200–400ms poll — faster polls just hammer XCUITest snapshots. "Wait for activity" is Android-specific and excellent when the app is activity-based; single-activity Compose apps will not change `currentActivity()`, so you wait for a compose testTag instead. Disable animations on test builds / `disableWindowAnimation` capability — a 300ms shared-element transition is the number-one "needed a sleep" source.

**Code**

```java
public final class Waits {
    public static WebElement visible(AppiumDriver driver, By by, Duration timeout) {
        return new FluentWait<AppiumDriver>(driver)
            .withTimeout(timeout)
            .pollingEvery(Duration.ofMillis(300))
            .ignoring(NoSuchElementException.class)
            .ignoring(StaleElementReferenceException.class)
            .withMessage(() -> "not visible: " + by + " source-head=" + head(driver))
            .until(d -> {
                WebElement el = d.findElement(by);
                return el.isDisplayed() ? el : null;
            });
    }

    public static void androidActivity(AndroidDriver driver, String suffix) {
        new WebDriverWait(driver, Duration.ofSeconds(15))
            .until(d -> driver.currentActivity().endsWith(suffix));
    }
}

// after login
Waits.visible(driver, AppiumBy.accessibilityId("home-cart"), Duration.ofSeconds(20));
Waits.androidActivity((AndroidDriver) driver, ".ui.HomeActivity");
```

**Follow-ups & traps**
- "Why not implicit 10s everywhere?" — Negative checks (`assert missing 'error-banner'`) become 10s each. Mix implicit+explicit and timeouts become non-deterministic.
- "How do you wait for a spinner to die?" — Wait for the *next* screen's hook, or wait for the spinner locator to be invisible. Do not sleep 5s "because checkout is slow."
- Trap: `WebDriverWait` on a locator that is already in the tree but covered by a permission dialog. You need a system-dialog strategy (Q9, Q12), not a longer wait.
- Trap: polling XPath every 100ms on iOS. You will crash WDA and call it flaky.

**Senior/lead angle** — A `ScreenReady` interface on every screen object (`waitUntilLoaded`) is the entire wait policy. Tests call `new CheckoutScreen(driver).waitUntilLoaded().pay()`. Random waits in tests are how suites age.

**One-liner** — Implicit wait off; explicit/FluentWait on a screen-level hook (id, activity, context); mobile is slower because of animation and snapshots, not because you need `sleep`.

### Q5. Gestures: W3C Actions vs deprecated TouchAction vs `mobile:*` / gestures plugin

**Interview answer** — `TouchAction` / `MultiTouchAction` are deprecated in the Java client and I do not use them. The replacement is W3C pointer actions (`PointerInput` + `Sequence` + `driver.perform`) for arbitrary multi-touch, and the driver's `mobile:*Gesture` commands — `mobile: clickGesture`, `mobile: swipeGesture`, `mobile: pinchOpenGesture` — for the common cases because they run on the device with fewer round-trips. Appium 2 also has a gestures plugin; I treat it as optional sugar on top of those two. A checkout "swipe to confirm," a gallery pinch, and a product-image carousel are all gestures, not `click`.

**Deep dive** — `TouchAction` was an Appium extension from the JSONWP era. W3C WebDriver standardized pointer actions: you describe a finger as a `PointerInput(Kind.TOUCH)`, then a sequence of move/down/pause/move/up with durations. That is portable and works through Selenium Grid. The downside is coordinates: you compute start/end from `getRect()` or viewport size, and you own direction, duration, and the fact that a 50ms swipe is a fling while a 800ms swipe is a drag. `mobile: swipeGesture` on UiAutomator2 takes a direction and a percent inside an element or region and executes on-device — less math, still needs a visible scroll container.

Pinch/zoom is two pointers in one `perform` (W3C) or `mobile: pinchOpenGesture` / `pinchCloseGesture`. Long press is a pointer-down + pause + pointer-up, or `mobile: longClickGesture` with a duration. Tap vs click: `element.click()` uses the vendor "click" which may not hit a canvas; a gesture tap at coordinates does. Prefer element click on real widgets; use gestures on carousels, maps, and custom Compose/UIView canvases.

**Code**

```java
// W3C swipe — TouchAction equivalent, not deprecated
public static void swipe(AppiumDriver driver, Point start, Point end, Duration take) {
    PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
    Sequence swipe = new Sequence(finger, 1);
    swipe.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), start.x, start.y));
    swipe.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
    swipe.addAction(finger.createPointerMove(take, PointerInput.Origin.viewport(), end.x, end.y));
    swipe.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
    driver.perform(List.of(swipe));
}

// On-device UiAutomator2 / XCUITest helper — prefer this for "swipe up on the product list"
driver.executeScript("mobile: swipeGesture", Map.of(
    "left", 100, "top", 400, "width", 800, "height", 1200,
    "direction", "up",
    "percent", 0.75));

// Long press on a saved card to reveal "Delete"
driver.executeScript("mobile: longClickGesture", Map.of(
    "elementId", ((RemoteWebElement) card).getId(),
    "duration", 800));
```

**Follow-ups & traps**
- "Is `TouchAction` broken?" — It still works on some stacks and will get you a "deprecated API" follow-up. Say the replacement, do not defend it.
- "W3C vs `mobile: swipeGesture`?" — W3C is standard and multi-touch flexible; `mobile:*` is less code and usually more reliable on that driver. I use `mobile:*` for swipe/scroll/long-press and W3C for custom two-finger cases.
- Trap: swiping by hardcoded `800, 1600 → 800, 400` on a tablet and a phone. Use `getWindowSize()` or the list element's rect.
- Trap: a 50ms swipe that the app interprets as a tap. Duration is part of the gesture contract.

**One-liner** — `TouchAction` is deprecated; use W3C `PointerInput` sequences or on-device `mobile:*Gesture` commands, and compute coordinates from window or element rects.

### Q6. Scroll to element: UiScrollable, iOS predicate, loop-swipe with a guard

**Interview answer** — I never "hope the row is on screen." On Android I use `UiScrollable.scrollIntoView` with a `UiSelector` for the target — the engine scrolls the scrollable container until the node exists. On iOS I prefer `mobile: scroll` with a predicate, or a class-chain find after a direction scroll on the table. If neither vendor helper can see the container (custom Compose pager, WebView), I loop a bounded swipe — max N times — and fail with a source dump when the element still is not there. Unbounded swipe loops are infinite tests.

**Deep dive** — Virtualization (Q13) is why this question exists: the node is not in the tree, so `findElement` cannot succeed until a scroll binds the view. `UiScrollable` only works on `scrollable=true` nodes (RecyclerView, ScrollView, NestedScrollView usually). Compose and some custom lists are not scrollable to UiAutomator; then you swipe. iOS `mobile: scroll` with `{predicateString, direction}` or `{element, toVisible: true}` uses XCUITest scrolling, which knows UITableView/UICollectionView. A predicate `name == 'sku-SKU-99'` plus scroll is the iOS happy path.

The loop-swipe pattern must have: a max iteration count, a stable swipe region (the list, not the header), a short wait for bind after each swipe, and a failure artifact. Direction matters: "Terms of service" on a checkout form is down; a horizontal carousel is left/right and `UiScrollable` must be constructed as horizontal. Nested scrollables (list inside a pager) steal the swipe — target the inner element's rect.

**Code**

```java
// Android happy path
WebElement terms = driver.findElement(AppiumBy.androidUIAutomator(
    "new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView("
        + "new UiSelector().resourceId(\"com.shop.android:id/terms\"))"));

// iOS happy path
driver.executeScript("mobile: scroll", Map.of(
    "direction", "down",
    "predicateString", "name == 'terms' OR label == 'Terms of service'"));
WebElement iosTerms = driver.findElement(AppiumBy.accessibilityId("terms"));

// Guarded loop — last resort
public static WebElement swipeTo(AppiumDriver driver, By by, int max) {
    for (int i = 0; i < max; i++) {
        List<WebElement> found = driver.findElements(by);
        if (!found.isEmpty() && found.get(0).isDisplayed()) return found.get(0);
        Dimension w = driver.manage().window().getSize();
        swipe(driver, new Point(w.width / 2, (int) (w.height * 0.7)),
            new Point(w.width / 2, (int) (w.height * 0.3)), Duration.ofMillis(400));
    }
    throw new NoSuchElementException("not found after " + max + " swipes: " + by);
}
```

**Follow-ups & traps**
- "UiScrollable failed with 'not scrollable'." — The list is not exposing `scrollable=true` (Compose, WebView, custom). Switch to loop-swipe or ask for a test hook / `NestedScrollView` semantics.
- "Why not XPath `scroll`?" — XPath cannot scroll. People confuse "the node is in a ScrollView in source" with "Appium will scroll to it."
- Trap: no max on the loop plus a wrong direction = 30-minute CI job.
- Trap: swiping on the whole screen and hitting the bottom tab bar, which switches to "Account" mid-scroll.

**One-liner** — `UiScrollable.scrollIntoView` on Android, `mobile: scroll` + predicate on iOS, bounded swipe loop only when the vendor cannot see a scrollable — never an infinite swipe.

### Q7. Hide keyboard, orientation, background / foreground

**Interview answer** — These are session-level device commands, not locators. I hide the keyboard after typing an email/card field when it covers `login` or `pay-now` — `driver.hideKeyboard()`, with an iOS strategy (`"pressed"` / tapping a known toolbar button) because iOS hide is flaky. Orientation is `driver.rotate(ScreenOrientation.LANDSCAPE)` for the few screens we claim to support (video, tablet checkout). Background/foreground is `driver.runAppInBackground(Duration.ofSeconds(5))` or `mobile: backgroundApp` / `activateApp`, and I use it to test "resume checkout after a payment-app hop" and "session still valid after background."

**Deep dive** — Keyboard: Android `hideKeyboard` sends a back/hide IME; it fails harmlessly if the IME is already down, and it can eat a Back that also pops a fragment if you call it blindly. iOS often needs tapping `Done` on the input accessory or `driver.findElement(AppiumBy.accessibilityId("done")).click()` because `hideKeyboard()` does not always dismiss a number pad. A more reliable pattern is: type, then tap a locator that is *outside* the field (the screen title), which resigns first responder.

Orientation changes recreate Android activities unless `configChanges` handles them — your driver can hit a stale element and a new activity. Wait for the screen hook after rotate. Background: Android may kill the process under memory pressure (especially on real farm devices); iOS may snapshot and restore. `runAppInBackground` is not a guarantee the process lived. For payment apps that switch to a bank app, you background *your* app as a side effect of an intent; coming back is `activateApp(bundleId)` and a wait for the confirmation screen, not a fixed sleep.

**Code**

```java
driver.findElement(AppiumBy.accessibilityId("email")).sendKeys("buyer@shop.test");
try {
    driver.hideKeyboard();
} catch (WebDriverException ignored) {
    // already hidden
}
driver.findElement(AppiumBy.accessibilityId("login")).click();

((Rotatable) driver).rotate(ScreenOrientation.LANDSCAPE);
Waits.visible(driver, AppiumBy.accessibilityId("pay-now"), Duration.ofSeconds(15));

((InteractsWithApps) driver).runAppInBackground(Duration.ofSeconds(3));
((InteractsWithApps) driver).activateApp("com.shop.android");
```

**Follow-ups & traps**
- "hideKeyboard clicked Back and left the screen." — Android. Tap a non-input instead, or use `adb shell input keyevent 111` (KEYCODE_ESCAPE) only if you know the IME.
- "Does background test 'kill'?" — No. Use `terminateApp` + `activateApp` for a cold start; `runAppInBackground` is warm resume.
- Trap: rotating in every test "for coverage." Most apps do not support landscape; you will spend a week on activity-recreate flakes.
- Trap: asserting cart state immediately after `activateApp` without waiting for the activity/screen hook.

**One-liner** — Keyboard, rotation, and background are device commands: hide or tap away after type, wait after rotate, and distinguish warm `runAppInBackground` from cold `terminateApp`.

### Q8. Deep links and launch arguments for skipping UI setup

**Interview answer** — I treat deep links and iOS launch arguments the way I treat API seeding on the web: they skip UI that is not under test. A payment test should not click through onboarding, login, search, and PDP if the question is "does 3DS succeed." I open `theshop://checkout?sku=SKU-99` (or `startActivity` with extras on Android, `mobile: launchApp` with args on iOS) after creating a cart via API, then I automate only the payment sheet. The architecture rule is: UI is for the assertion; everything before is a hook.

**Deep dive** — Deep links are an app-owned contract (`intent-filter` / Universal Links / custom scheme). Automation can invoke them without going through the OS share sheet: Android `adb shell am start -a android.intent.action.VIEW -d "theshop://checkout?sku=SKU-99"` or `driver.get("theshop://...")` / `mobile: deepLink`; iOS `mobile: deepLink` or Safari open + handoff, with associated-domains caveats on real devices. Launch arguments (`-UITesting -user buyer@shop.test`) and environment variables on iOS, or intent extras on Android, can put the app in a fixture state: skip onboarding, point at mock payments, enable debug locators. Those flags must be stripped from store builds or gated on a debug entitlement — never ship a "skip payment" extra in production.

This is the highest-leverage mobile architecture decision. Teams that login via UI 500 times a night own a slow suite and a 2FA nightmare (Q11). Teams that deep-link + token in have a 30-second payment spec. The risk is coverage gaps: if nobody ever runs the real login UI, you will not catch a broken password-manager field. So you keep a small authentic UI login suite and deep-link everything else.

**Code**

```java
// API arrange + deep link act — do not UI-login
api.createSession("buyer@shop.test");
api.addToCart("buyer@shop.test", "SKU-99", 1);

((AndroidDriver) driver).executeScript("mobile: deepLink", Map.of(
    "url", "theshop://checkout",
    "package", "com.shop.android"));

// iOS
driver.executeScript("mobile: deepLink", Map.of(
    "url", "theshop://checkout",
    "bundleId", "com.shop.ios"));

Waits.visible(driver, AppiumBy.accessibilityId("pay-now"), Duration.ofSeconds(20));

// iOS launch args for a debug build — skip onboarding
XCUITestOptions opts = new XCUITestOptions()
    .setBundleId("com.shop.ios")
    .setProcessArguments(Map.of(
        "args", List.of("-skipOnboarding", "1"),
        "env", Map.of("PAYMENTS_STUB", "true")));
```

**Follow-ups & traps**
- "Is `driver.get(url)` enough?" — On many Android sessions yes; on iOS Universal Links you may need `mobile: deepLink` or a Safari hop. Prove it per app.
- "What if product will not add a scheme?" — Then `startActivity` to the checkout activity with extras, or a debug-only hidden gesture. The negotiation is the work.
- Trap: deep-linking into checkout without a server-side cart — the screen is empty and you "fixed" it by adding UI setup back.
- Trap: leaving `-skipPayment` in the release intent-filter.

**Senior/lead angle** — Deep links are a platform feature, not a test hack. I put "automation routes" next to Universal Links in the app spec: `theshop://login?token=`, `theshop://order/{id}`, `theshop://checkout`. That list is owned with the mobile architects.

**One-liner** — Deep link and launch args are mobile's API seeding: arrange state without the UI, automate only the screen under test, and keep a thin real-login suite so the login UI still has coverage.

### Q9. Notifications shade and permission dialogs

**Interview answer** — Permission dialogs and the notification shade are OS chrome, not app views. On Android I set `autoGrantPermissions=true` for CI so the runtime camera/location/notifications prompt never appears, and I still keep one test that *does not* auto-grant to prove the in-app rationale + dialog path. On iOS `autoGrantPermissions` is not the same lever — I pass the `permissions` capability (or pre-authorize via WDA) for photos, location, notifications, and camera. Notification shade: Android `driver.openNotifications()`, read the order-shipped row, tap it; iOS is `mobile: swipe` from the status bar or a springboard query, and it is flakier.

**Deep dive** — Android 13+ notification permission is a runtime grant like camera. `autoGrantPermissions` uses `pm grant` for requested dangerous permissions at session start; it will not grant things not in the manifest, and it will not tap "While using the app" vs "Only this time" if you *do* show the dialog. For the explicit-dialog test, locators are OS-version- and OEM-specific (`com.android.permissioncontroller:id/permission_allow_button` vs Samsung ids). I isolate those in an `OsDialogs` helper keyed by API level, not in the checkout screen object.

iOS permissions are a capabilities map: `{"com.shop.ios":{"photos":"yes","notifications":"YES","location":"inuse"}}`. Unset means the next photo-picker test hits SpringBoard. There is no reliable "tap Allow" that survives iOS versions if you can pre-grant. Notification testing is covered more in file 03 Q8; the locator point here is: shade content is another app (`com.android.systemui`, SpringBoard). You may need to switch to that package's views, tap, and wait for *your* app to foreground via the deep link inside the notification.

**Code**

```java
UiAutomator2Options android = new UiAutomator2Options()
    .setAutoGrantPermissions(true); // CI default

XCUITestOptions ios = new XCUITestOptions()
    .setBundleId("com.shop.ios")
    .setPermissions(Map.of(
        "com.shop.ios", Map.of(
            "photos", "yes",
            "camera", "yes",
            "notifications", "YES",
            "location", "inuse")));

// Explicit Android permission (autoGrant off)
By allow = AppiumBy.id("com.android.permissioncontroller:id/permission_allow_foreground_only_button");
Waits.visible(driver, allow, Duration.ofSeconds(5)).click();

((AndroidDriver) driver).openNotifications();
driver.findElement(AppiumBy.androidUIAutomator(
    "new UiSelector().textContains(\"Your order\")")).click();
```

**Follow-ups & traps**
- "Why did CI pass and a real iPhone fail on camera?" — Simulator/`permissions` pre-grant vs a real device with a leftover "Don't Allow." Reset policy (file 04 Q5) and explicit `permissions` on every session.
- "Can I auto-grant on iOS the Android way?" — No. Use the iOS permissions capability / WDA. Saying `autoGrantPermissions` fixes iOS is a common wrong answer.
- Trap: interacting with the shade and not closing it on failure — the next test taps a notification instead of `login`.
- Trap: OEM permission ids hardcoded for Pixel only, then the farm gives you a Galaxy.

**One-liner** — Pre-grant in capabilities (`autoGrantPermissions` on Android, `permissions` on iOS) for CI; isolate real dialog and shade locators in an OS helper because they are not your app.

### Q10. Biometric mocks — emulator vs real

**Interview answer** — Biometric login (fingerprint / Face ID / device credential) is mockable on Android emulators and iOS simulators and is not honestly automatable on a locked real device without a vendor lab feature. On the emulator I enroll a fingerprint and send `mobile: fingerprint` with an id, or I use `mobile: sendBiometricMatch` on the iOS simulator. On real devices I skip the biometric UI via a debug launch argument or a test-account fallback PIN, and I keep one manual or lab-assisted check. I never claim "we automate Face ID on every farm iPhone."

**Deep dive** — Android: AVD has `adb emu finger touch <id>` and Appium wraps it as `mobile: fingerprint`. The app must have prompted `BiometricPrompt` and the emulator must have an enrolled print (`adb emu finger touch` fails otherwise). Real devices need a physical finger or a vendor (BrowserStack etc.) biometric injection API that is device-family specific and often extra-cost. iOS Simulator: `mobile: enrollBiometric` and `mobile: sendBiometricMatch` with `match: true|false` to hit both success and the "Try again" path. Real iPhones do not expose Face ID to WDA. Some teams stub `LAContext` in debug builds — that tests your stub, not LocalAuthentication.

Design the suite around the seam: production code calls a `BiometricPort`; debug builds can short-circuit; E2E on emulator hits the real prompt; real-device CI uses PIN/password fallback which is still a user path. Payment-authorization biometrics (bank app, Apple Pay) are even less automatable — treat them as a stubbed gateway plus one exploratory pass.

**Code**

```java
// Android emulator — after the app shows BiometricPrompt
((AndroidDriver) driver).executeScript("mobile: fingerprint", Map.of("fingerprintId", 1));

// iOS Simulator
driver.executeScript("mobile: enrollBiometric", Map.of("isEnabled", true));
driver.findElement(AppiumBy.accessibilityId("login-with-faceid")).click();
driver.executeScript("mobile: sendBiometricMatch", Map.of("type", "faceId", "match", true));
Waits.visible(driver, AppiumBy.accessibilityId("home-cart"), Duration.ofSeconds(15));

// Negative path
driver.executeScript("mobile: sendBiometricMatch", Map.of("type", "faceId", "match", false));
Waits.visible(driver, AppiumBy.accessibilityId("biometric-failed"), Duration.ofSeconds(10));
```

**Follow-ups & traps**
- "Does BrowserStack support fingerprint?" — Some Android real devices, via their API, not via `mobile: fingerprint` blindly. Read the vendor doc for that device; do not generalize.
- "Can we use a taped finger in the lab?" — People have. It is not a CI strategy.
- Trap: running biometric tests on a farm device that has a real fingerprint enrolled for a previous tenant's wallet.
- Trap: asserting "Face ID works" because the debug build skipped the prompt.

**One-liner** — Mock biometrics on emulator/simulator (`mobile: fingerprint` / `sendBiometricMatch`); on real devices use a fallback or a vendor injection API — do not pretend WDA can press a real face.

### Q11. OTP / SMS / email verification on mobile

**Interview answer** — I never read real SMS in CI. The strategies, in order of preference: a test environment that returns a fixed OTP or exposes it on a test API; a deep link in the email/SMS (`theshop://verify?code=123456`) that the test opens directly; a backend seed that marks the user verified so checkout does not need OTP; reading the in-app or notification-shade OTP only as a last, flaky option. Real Twilio/SMS to a physical SIM is slow, non-deterministic, and a privacy problem on shared devices.

**Deep dive** — Login and payment step-up are the two OTP sources. For login, the web pattern applies: create the user via API already-verified, or fetch the OTP from a test mailbox API (Mailosaur, a dedicated `/qa/otp?user=` endpoint). For SMS, Android can read `SmsRetriever` / notification shade on an emulator with a fake incoming SMS (`adb emu sms send`), which is acceptable for proving the *parser*. iOS cannot read SMS on a simulator in a useful way; real-device SMS needs a dedicated number and will flake on delivery. Email magic links are deep links — skip the inbox and `mobile: deepLink` the URL the API generated.

If product insists on "true" SMS, isolate one nightly test against a known device with a known SIM and a generous timeout, and keep it out of the PR gate. Shared farm devices that receive OTP for the last tenant's account are a security incident, not a clever reuse.

**Code**

```java
// Preferred: API returns the OTP the app also received
String otp = qaApi.latestOtp("buyer@shop.test");
driver.findElement(AppiumBy.accessibilityId("otp-digit-1")).sendKeys(otp);

// Better for magic-link login — no typing
String link = qaApi.latestMagicLink("buyer@shop.test");
driver.executeScript("mobile: deepLink", Map.of("url", link, "package", "com.shop.android"));

// Emulator-only SMS injection to test the parser
// adb emu sms send 1234 Your Shop code is 847291
```

**Follow-ups & traps**
- "We poll Gmail." — Fragile, against TOS-ish automation, 2FA on the mailbox, and PII on the CI worker. A test OTP API is the grown-up answer.
- "Can Appium read SMS on iOS?" — Not in a CI-reliable way. Do not build the suite on it.
- Trap: a hardcoded `123456` in production because the test env leaked into the release flavor.
- Trap: using one phone number for parallel tests — OTPs overwrite and cross-authenticate.

**Senior/lead angle** — OTP is a platform design issue. I ask for a QA verification endpoint at architecture review, the same time I ask for deep links. If the only interface is a carrier, the automation strategy already failed.

**One-liner** — Fixed OTP or a QA API or a magic-link deep link; emulator SMS only to test parsing; never real carrier SMS in CI and never on a shared farm SIM.

### Q12. Alerts and native system dialogs (iOS SpringBoard)

**Interview answer** — In-app alerts (`UIAlertController`, Android `AlertDialog`) often appear as Appium alerts or as ordinary views with buttons — I try `driver.switchTo().alert()` and fall back to `accessibility id` on `ok` / `cancel`. System dialogs are different: they belong to SystemUI or SpringBoard (permissions, "Sign in with Apple," "Untrusted Developer," Low Power Mode, "Allow paste," App Tracking Transparency). Those are not your app's hierarchy. I dismiss them with OS-specific locators or `mobile: alert` on iOS, and I prevent most of them with capabilities and a clean device image so tests do not become dialog janitors.

**Deep dive** — `switchTo().alert()` maps to WebDriver's alert API. On Android it works when UiAutomator2 surfaces a modal as an alert; many Material dialogs are just windows and need `AppiumBy.id("android:id/button1")`. On iOS, XCUITest can see SpringBoard if WDA is configured to (`defaultActiveApplication`, or switching to `com.apple.springboard`). `mobile: alert` with `action=accept|dismiss` and optional `buttonLabel` is the iOS-native path for system alerts. ATT (`App Tracking Transparency`) will break the first launch of any app that calls it — grant via `permissions` or a launch arg that skips ATT in debug, or tap `Allow` on SpringBoard once per reset.

The lead-level point: every unsolicited system dialog is a flake class (file 04 Q6). OS updates add new ones ("iOS wants to share analytics"). A lab image that is already past first-boot wizards, plus permission caps, plus a `SystemDialogWatcher` that screenshots and dismisses known boxes in a `@Before` hook, is the defense. Do not sprinkle `if (exists(allow)) click` inside checkout.

**Code**

```java
public final class SystemDialogs {
    public static void acceptIfPresent(AppiumDriver driver) {
        try {
            driver.switchTo().alert().accept();
            return;
        } catch (NoAlertPresentException ignored) { }
        for (By by : List.of(
            AppiumBy.id("android:id/button1"),
            AppiumBy.accessibilityId("Allow"),
            AppiumBy.accessibilityId("OK"),
            AppiumBy.iOSNsPredicateString("label IN {'Allow','Allow Once','OK','Don’t Allow'}"))) {
            List<WebElement> hits = driver.findElements(by);
            if (!hits.isEmpty()) {
                hits.get(0).click();
                return;
            }
        }
    }
}

// iOS system alert via WDA
driver.executeScript("mobile: alert", Map.of("action", "accept", "buttonLabel", "Allow"));
```

**Follow-ups & traps**
- "Why did the test tap Allow on a dialog I never saw locally?" — ATT or pasteboard permission on a fresh simulator. Your laptop simulator is not factory-reset every run; CI often is.
- "Is SpringBoard a context?" — It is another application. You may need `mobile: activateApp` / active application settings, not a WEBVIEW switch.
- Trap: accepting every alert blindly and dismissing a real payment error ("Card declined") as if it were ATT.
- Trap: XPath on `Allow` matching an in-app "Allow location for delivery estimates" button you meant to test.

**One-liner** — App alerts may be WebDriver alerts or ordinary buttons; SpringBoard/SystemUI dialogs are OS apps — pre-grant what you can, and centralize a watcher for the rest.

### Q13. Finding elements in lists / RecyclerView / UITableView

**Interview answer** — Virtualized lists only put on-screen (plus a small buffer) rows in the accessibility tree. `findElement(accessibilityId("sku-SKU-99"))` fails if that SKU has not been bound, even when the data is in the adapter. The procedure is: scroll into view (Q6), then find by a *business-key* id on the row, then click. I do not collect `findElements(className(row))` and index. For assertions like "cart shows 3 lines," I scroll the list and count unique sku ids, or I assert via API and only spot-check the UI.

**Deep dive** — RecyclerView recycles view holders: the same `android.view.ViewGroup` instance is rebound to different SKUs as you scroll. StaleElementReference is therefore normal if you hold a `WebElement` across a scroll. Re-find after every scroll. iOS `UITableView` / `UICollectionView` / SwiftUI `List` have the same behavior: off-screen cells are not in the XCUITest snapshot (and `snapshotMaxDepth` will not invent them). Some apps implement a11y "fetch more" poorly, so even scrolling does not expose a name — that is a product bug.

Horizontal product carousels are lists too. So are payment-method pickers and address books. The screen object should expose `row(String sku)` that encapsulates scroll+find, and widget objects (Q14) for the row's add-to-cart button vs its price label. Infinite-scroll feeds need a stop condition (footer id, max swipes, "no more items") or you will scroll until the test times out.

**Code**

```java
public final class ProductListScreen {
    private final AppiumDriver driver;

    public ProductListScreen openSku(String sku) {
        By row = AppiumBy.accessibilityId("sku-" + sku);
        if (driver instanceof AndroidDriver) {
            driver.findElement(AppiumBy.androidUIAutomator(
                "new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView("
                    + "new UiSelector().description(\"sku-" + sku + "\"))"));
        } else {
            driver.executeScript("mobile: scroll", Map.of(
                "direction", "down", "predicateString", "name == 'sku-" + sku + "'"));
        }
        driver.findElement(row).click();
        return this;
    }
}

// Do not:
// List<WebElement> rows = driver.findElements(AppiumBy.className("android.view.ViewGroup"));
// rows.get(2).click();
```

**Follow-ups & traps**
- "It is in Charles / the API but Appium cannot see it." — Correct. The tree is not the data model. Scroll or use a search field / deep link to the PDP.
- "StaleElement on the third scroll." — You held a recycled holder. Re-find by sku.
- Trap: asserting `findElements(row).size() == 50` on a 50-item list. You will get ~6–12. Assert the sku you care about, or API-assert the count.
- Trap: search-as-scroll ("type the product name in the list's filter") is often a better user path than a 40-swipe loop — use it when the app has search.

**Senior/lead angle** — If a test must find an arbitrary SKU in a 10k catalog, the design is wrong. Deep-link the PDP (`theshop://product/SKU-99`) and keep one scroll test that proves the list binds and opens a visible row.

**One-liner** — Virtualized rows are absent from the tree until scrolled; find by business-key accessibility id after a vendor scroll, never by index, and do not count off-screen items.

### Q14. Page objects for mobile: screen objects, widget objects, don't share web POM blindly

**Interview answer** — I use screen objects (one class per app screen: `LoginScreen`, `CartScreen`, `CheckoutScreen`) and widget objects for repeated chrome (tab bar, product row, card form). Each screen owns locators, gestures, and a `waitUntilLoaded` that defines readiness. Tests orchestrate screens and assert outcomes. I do not reuse a web Selenium POM: there is no `By.cssSelector`, lists virtualize, navigation is deep links and back-button, and a "page" on mobile is often an activity plus a bottom sheet plus a system dialog. Sharing the web `CheckoutPage` is how you get XPath soup.

**Deep dive** — Mobile-specific POM rules. (1) A screen may have platform branches (`if (isIos) predicate else uiAutomator`) hidden behind one method — tests stay platform-agnostic when the ids match. (2) Widgets (`ProductRow`, `TabBar`, `PermissionDialog`) are composition, not inheritance; a `BaseScreen` with 40 helpers is a junk drawer. (3) Assertions stay in tests or in a small `CheckoutAssertions` helper — a screen that "verifies order" hides the spec. (4) Navigation methods return the next screen (`login()` → `HomeScreen`) so impossible transitions do not compile. (5) Driver is injected; screens never start sessions. (6) Gestures and scroll-to live on the widget that owns the list, not in the test.

The anti-pattern I call out: a single `MobilePage` copied from `WebPage` with `click(By)` and `type(By, String)` wrapping implicit waits. That erases screen language and pushes locator choice into every test. Another: generating screens from Inspector recordings. The senior design is boring: one file per screen, ids at the top, actions that read like user intent (`applyPromo("SAVE10").pay()`).

**Code**

```java
public final class LoginScreen {
    private static final By EMAIL = AppiumBy.accessibilityId("email");
    private static final By PASSWORD = AppiumBy.accessibilityId("password");
    private static final By LOGIN = AppiumBy.accessibilityId("login");
    private final AppiumDriver driver;

    public LoginScreen(AppiumDriver driver) {
        this.driver = driver;
        Waits.visible(driver, EMAIL, Duration.ofSeconds(20));
    }

    public HomeScreen login(String email, String password) {
        driver.findElement(EMAIL).sendKeys(email);
        driver.findElement(PASSWORD).sendKeys(password);
        driver.hideKeyboard();
        driver.findElement(LOGIN).click();
        return new HomeScreen(driver);
    }
}

public final class ProductRow {
    private final AppiumDriver driver;
    private final String sku;
    public ProductRow(AppiumDriver driver, String sku) { this.driver = driver; this.sku = sku; }
    public void addToCart() {
        driver.findElement(AppiumBy.accessibilityId("add-" + sku)).click();
    }
}

@Test
void checkoutKnownSku() {
    api.addToCart(user, "SKU-99", 1);
    deepLink.checkout();
    OrderConfirmationScreen done = new CheckoutScreen(driver).applyPromo("SAVE10").pay();
    assertTrue(done.orderId().matches("ORD-\\d+"));
}
```

**Follow-ups & traps**
- "Where do Android vs iOS locators live?" — Same method, `AppiumBy.accessibilityId` when ids match; otherwise a small `By` factory per platform, not two entire POM trees, unless the UIs truly diverged.
- "Can I share the web cart assertions?" — Business assertions (totals, tax) can live in a platform-agnostic helper fed by API or by screen getters. Locators cannot be shared.
- Trap: screen objects that call `Thread.sleep(2000)` because "this screen is slow." That belongs in `waitUntilLoaded` with a real hook.
- Trap: a widget for every button. Widgets are *repeated structure* (rows, tab bars), not every control.

**Senior/lead angle** — The mobile POM is also a device-dialog and deep-link facade. A `Navigation` type that can `toCheckout(sku)` via deep link or via UI is how you keep 200 tests from encoding the setup path. That is framework work, not a page-object tutorial.

**One-liner** — Screen objects plus list/tab widgets, `waitUntilLoaded`, driver injected, no web POM reuse — mobile pages virtualize, gesture, and deep-link in ways a Selenium `By` class cannot express.
