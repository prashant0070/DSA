# Appium Fundamentals & Architecture

This file is the architecture layer of a mobile SDET interview: what Appium is, how Appium 2.x actually talks to Android and iOS, how sessions and capabilities work in the modern Java client, and the mistakes that immediately mark a candidate as Appium-1-era. Almost every mobile loop opens here before locators, gestures, or device farms. Answers assume Appium 2.x (drivers as plugins); Appium 1.x "all-in-one" is called out as legacy.

- Q1. What is Appium?
- Q2. How is Appium 2 architecture different from Appium 1?
- Q3. How does Appium talk to Android and iOS?
- Q4. Appium vs Espresso vs XCUITest native — when do you drop to native frameworks?
- Q5. Desired capabilities vs W3C options (`UiAutomator2Options`, `XCUITestOptions`)
- Q6. Sessions, `noReset` / `fullReset` / `dontStopAppOnReset` — data implications
- Q7. Appium Inspector — uses and limits
- Q8. Native vs hybrid vs mobile-web — context switching
- Q9. Real device vs emulator/simulator — fidelity, CI cost, flake sources
- Q10. Appium Doctor / prerequisite toolchain
- Q11. How do you start a session? Complete Java example for Android and iOS
- Q12. Appium vs Selenium — same protocol family, different locators and gestures
- Q13. Common capability mistakes
- Q14. Appium Inspector vs `page_source` for locator design

### Q1. What is Appium?

**Interview answer** — Appium is an open-source, cross-platform mobile automation server that drives native, hybrid, and mobile-web apps on Android and iOS through the WebDriver protocol. Your test code is a WebDriver client — in Java that is the Appium Java client on top of Selenium — and it talks HTTP to an Appium server, which translates those commands into vendor automation: UiAutomator2 or Espresso on Android, XCUITest via WebDriverAgent on iOS. The point of Appium is a single client API and a black-box E2E layer that does not require app source, which is why SDET teams use it for login, checkout, and payment journeys on real devices.

**Deep dive** — Architecturally Appium is a Node.js HTTP server that implements the W3C WebDriver protocol plus Appium-specific extensions (`mobile:*` execute methods, app-management commands, device settings). The client never talks to UiAutomator or XCTest directly. A session is created with `POST /session` and a capabilities document; the server picks a driver plugin (UiAutomator2, XCUITest, Espresso, …), that driver provisions vendor automation on the device, and every subsequent find/click/swipe is proxied through that stack. This is why Appium feels "like Selenium for mobile": same session model, same HTTP verbs, same idea of a remote end — but the remote end is a phone, not a browser, and the expensive parts are session create, app install, and WebDriverAgent/UiAutomator2-server startup, not `get(url)`.

Appium is deliberately black-box. It does not compile into your app, it does not get Espresso idling resources or XCTest APIs for free, and it cannot see objects that the accessibility tree does not expose. That is the trade-off that makes it valuable for SDET orgs (one suite, two OS, no app-source dependency) and the reason it is the wrong tool for white-box unit/UI tests. Appium 1.x shipped every driver inside one npm package; that model is legacy. Appium 2.x is a slim server plus separately installed drivers and plugins. If you describe Appium as "install one package and you get Android and iOS," you are describing 2019.

**Code**

```java
// The entire client-server contract in four lines:
// Java client  →  HTTP (W3C WebDriver)  →  Appium server :4723  →  driver plugin  →  device
AndroidDriver driver = new AndroidDriver(
    URI.create("http://127.0.0.1:4723").toURL(),
    new UiAutomator2Options().setApp("/apps/shop.apk").setDeviceName("Pixel_7"));
driver.findElement(AppiumBy.accessibilityId("email")).sendKeys("buyer@shop.test");
driver.findElement(AppiumBy.accessibilityId("login")).click();
```

**Follow-ups & traps**
- "Is Appium a test runner?" — No. It is a server. JUnit 5 / TestNG run tests; Appium only automates the device. Saying "Appium runs my tests" is a junior tell.
- "Does Appium use Selenium?" — The Java client depends on Selenium's WebDriver interfaces and W3C types. The server is not Selenium. Same protocol family, different remote end.
- "Can it test desktop?" — Windows/macOS drivers exist as plugins; they are not what mobile interviews are about. Stay on Android/iOS unless asked.
- Trap: "Appium injects into the app like Espresso." It does not. UiAutomator2 is an instrumentation server on the device; XCUITest goes through WebDriverAgent. The app under test is not recompiled for Appium.

**Senior/lead angle** — Position Appium as the black-box E2E layer in a mobile test strategy, not "the mobile framework." Native Espresso/XCTest own PR-speed white-box coverage; Appium owns cross-platform critical paths on real devices. Leads who say "we Appium everything" have a slow, flaky suite.

**One-liner** — Appium is a WebDriver server for mobile: Java client speaks HTTP, Appium 2 dispatches to a driver plugin, and the driver talks to UiAutomator2 or XCUITest on the device.

### Q2. How is Appium 2 architecture different from Appium 1?

**Interview answer** — Appium 2 split the monolith. The server is a slim protocol host; Android and iOS support come from driver plugins you install yourself (`appium driver install uiautomator2`, `appium driver install xcuitest`), and cross-cutting features like image matching or extra gestures come from server plugins (`appium plugin install images`). Appium 1 bundled every driver in one npm package, so `npm i -g appium` gave you UiAutomator2, XCUITest, Espresso, Windows, and a pile of unused code. Appium 2 also dropped the default `/wd/hub` base path — sessions are at `http://127.0.0.1:4723` unless you pass `--base-path=/wd/hub` for old clients.

**Deep dive** — The Appium 2 extension model has two installable types. *Drivers* own a platform automation stack and a session: UiAutomator2, XCUITest, Espresso, Gecko, Safari, Windows, Mac2. *Plugins* sit on the server and intercept or add commands: `images` (template matching / visual locators), `gestures` (or the driver's own `mobile:*Gesture` commands), `execute-driver` (send a script to run inside the driver for fewer round-trips), `relaxed-caps` (tolerate unprefixed capabilities — useful on Grid), `universal-xml`. You list them with `appium driver list` / `appium plugin list` and pin versions in CI the same way you pin the server.

This matters operationally. In Appium 1, upgrading Appium upgraded every driver at once and a XCUITest regression could ship with an Android fix. In Appium 2 you upgrade `appium` and `appium-uiautomator2-driver` independently, which is how you survive "iOS 18 just dropped and WDA needs a driver bump but Android is fine." The server still speaks W3C WebDriver; the change is packaging and the capability that selects a driver (`automationName` / the Java options class). Interviewers use this question to see whether your last production suite was 1.22 or 2.x. If you still start sentences with "DesiredCapabilities and `/wd/hub`," they will assume the latter.

**Code**

```bash
# Appium 2 host + the two drivers a mobile SDET actually needs
npm i -g appium
appium driver install uiautomator2
appium driver install xcuitest
appium plugin install images
appium --use-plugins=images
# Appium 1 clients that POST to /wd/hub need:
# appium --base-path=/wd/hub
```

**Follow-ups & traps**
- "Where did `/wd/hub` go?" — Appium 2 default base path is `/`. Keep `--base-path=/wd/hub` only as a compatibility shim. New Java client 8/9 code should hit `http://127.0.0.1:4723` with no suffix.
- "Do I still need `automationName`?" — Yes, the server uses it (or the options class that sets it) to pick a driver plugin. Omitting it is a classic Appium 2 session-create failure.
- Trap: calling drivers "Appium's built-in Android support." They are separately versioned plugins. `appium driver list --installed` is the source of truth on a CI image.
- Trap: "Appium 2 is a new protocol." It is not. It is a new distribution model on the same W3C + Appium-extension protocol.

**Senior/lead angle** — Pin `appium`, each driver, and each plugin in the CI image and treat `appium driver update` like a production dependency bump: changelog, WDA/UiAutomator2-server compatibility, then roll. Unpinned `npm i -g appium` on every pipeline is how Friday night iOS suites die.

**One-liner** — Appium 2 is a slim server plus installable drivers and plugins; Appium 1's all-in-one package is legacy, and `/wd/hub` is no longer the default.

### Q3. How does Appium talk to Android and iOS?

**Interview answer** — The stack is always client → Appium server → driver plugin → vendor automation on the device. On Android the UiAutomator2 driver installs and starts an instrumentation server APK on the device; that server uses UiAutomator / AccessibilityNodeInfo to find views and inject input, and Appium proxies HTTP to it. On iOS the XCUITest driver builds, signs, and launches WebDriverAgent (WDA), a WebDriver server that sits on XCTest; WDA then drives the app the way XCUITest would. Espresso is an alternate Android driver that instruments *your* app process for white-box access. The vendor layer is what actually taps "Place order"; Appium is the protocol translator.

**Deep dive** — Android UiAutomator2 in detail: session create pushes `appium-uiautomator2-server` (and a test APK) onto the device if needed, forwards a port (`systemPort`, default 8200) via ADB, and starts instrumentation. Finds become UiAutomator queries against the current window hierarchy. Gestures become either UiAutomator clicks or `mobile: clickGesture` / `mobile: swipeGesture` implemented with the Android input APIs. ADB remains a side channel for install, logcat, intents, and file push — the driver uses it heavily during session create. Espresso driver is different: it compiles against the app, runs in-process, and can use Espresso idling, but you lose true black-box and you need a debug/test build.

iOS XCUITest in detail: the driver uses `xcodebuild` to build WebDriverAgentRunner, codesigns it with your team (`xcodeOrgId` / provisioning profile), installs it on the simulator or real device, and talks to WDA's HTTP server (`wdaLocalPort`, default 8100). WDA is XCTest code, so every find is an XCUITest query against the accessibility tree, and iOS predicate / class-chain locators are cheap because they are native XCTest queries. XPath is expensive because WDA must serialize a large tree and walk it. Session create on a real device is dominated by WDA signing + install + XCTest startup, which is why the first test after a clean boot is minutes and why WDA crashes show up as "session died" rather than "element not found."

The mental model to say out loud: Appium does not "control the phone." It controls a vendor automation process that already existed (UiAutomator, XCTest). That is why capability mistakes around `automationName`, ports, and WDA signing fail at session create — the vendor process never came up.

**Code**

```text
Java test  --HTTP W3C-->  Appium 2 (:4723)
                              |  automationName=UiAutomator2
                              +--> uiautomator2-driver
                              |       ADB install + port-forward :systemPort
                              |       uiautomator2-server (instrumentation)
                              |       Accessibility / UiAutomator APIs
                              |  automationName=XCUITest
                              +--> xcuitest-driver
                                    xcodebuild + codesign WebDriverAgent
                                    WDA HTTP :wdaLocalPort
                                    XCTest / XCUIElement queries
```

**Follow-ups & traps**
- "So Appium uses ADB to tap buttons?" — No. ADB is for deploy, ports, and shell. Taps go through UiAutomator2-server or WDA. Candidates who say "Appium is just ADB" fail this question.
- "What is WebDriverAgent?" — A WebDriver HTTP server implemented as an XCTest runner, maintained in the Appium ecosystem, signed and installed on the device. It is the iOS equivalent of the UiAutomator2 server APK.
- "Can I use Espresso through Appium?" — Yes, `appium driver install espresso` and `EspressoOptions`. Faster and more white-box; requires a compatible app build. Most orgs still use UiAutomator2 for black-box E2E.
- Trap: drawing the iOS stack as "Appium → XCUITest" and skipping WDA. Interviewers treat WDA as the pain point they want named.

**Senior/lead angle** — When a suite is "down," classify the failure by layer: client (wrong URL/caps), Appium server (driver not installed), driver (port conflict), vendor (WDA crash, instrumentation timeout), or app (the button really is gone). Leads who only look at test code waste the first hour of an outage.

**One-liner** — Client to Appium to a driver plugin to vendor automation: UiAutomator2-server on Android, WebDriverAgent/XCTest on iOS — Appium never taps the screen itself.

### Q4. Appium vs Espresso vs XCUITest native — when do you drop to native frameworks?

**Interview answer** — I use Appium for black-box, cross-platform E2E on critical user journeys — login, checkout, payment confirmation — especially when the same scenario must run on Android and iOS real devices and the SDET team does not own the app source. I drop to Espresso or XCTest/XCUITest when I need white-box speed, in-process idling, or hooks the accessibility tree cannot see: activity/intent assertions, in-app A/B flags, custom views with no `contentDescription`, or a PR gate that must finish in minutes. Native frameworks live in the app repo and are owned with the developers; Appium lives in the SDET repo and treats the app as a binary.

**Deep dive** — Espresso runs in the app process, synchronizes on the Android message queue and IdlingResources, and is fast because there is no HTTP hop and no hierarchy dump over the wire. XCTest/XCUITest is similarly in-process/on-device with first-class access to XCUIApplication, launch arguments, and springboard. Both can assert on things Appium should not: view-model state, launched intents, debug-only test hooks. The cost is platform split (two suites, two languages if the app teams are Kotlin and Swift), CI that must compile the app, and no single test that proves "the same checkout binary path works on a Pixel and an iPhone."

Appium's cost is the opposite: session create, hierarchy serialization, animation, and OS dialogs. A 40-step checkout that is 15 seconds in Espresso can be 2–4 minutes in Appium on a real device. That is fine for a nightly critical-path suite of 30 tests and fatal if you try to replace the developers' UI tests with 400 Appium cases. The honest split used by orgs that do this well: developers write Espresso/XCTest for components and screen-level UI; SDETs write Appium for the journeys a real user plus a real OS can break (permissions, deep links, payment SDK UI, WebView checkout, store-signed builds).

**Code**

```java
// Appium: black-box checkout on a store-signed build — no app source required
driver.findElement(AppiumBy.accessibilityId("sku-SKU-99")).click();
driver.findElement(AppiumBy.accessibilityId("add-to-cart")).click();
driver.findElement(AppiumBy.accessibilityId("checkout")).click();
driver.findElement(AppiumBy.accessibilityId("pay-now")).click();
driver.findElement(AppiumBy.accessibilityId("order-confirmation"));

// Native Espresso (Kotlin, in the app repo) — white-box, same screen, seconds not minutes
// onView(withId(R.id.pay_now)).perform(click())
// onView(withText("Order confirmed")).check(matches(isDisplayed()))
```

**Follow-ups & traps**
- "Why not only Espresso/XCTest?" — They do not run the other OS, they usually need debug builds, and they miss OS chrome (permissions, 3-D Secure WebViews, share sheets) that production users hit.
- "Why not only Appium?" — Slow feedback, flake tax, and you will reimplement synchronization the native frameworks already have. PR gates die.
- Trap: "Appium is faster now so we deleted XCTest." Session create and WDA still dominate. Measure before you delete.
- Trap: treating Detox / Maestro / XCUITest Cloud as replacements without saying what layer they occupy. Compare on black-box vs white-box and on who owns the suite.

**Senior/lead angle** — The strategy I sell: native UI tests as the wide, fast layer in the app pipelines; Appium as a thin real-device contract on login, cart, pay, and one deep-link smoke per platform. Device-farm minutes are expensive; do not burn them on "is this RecyclerView bound."

**One-liner** — Appium for black-box cross-platform E2E on real devices; Espresso/XCTest for fast white-box UI in the app repo — use both, do not pick a religion.

### Q5. Desired capabilities vs W3C options (`UiAutomator2Options`, `XCUITestOptions`)

**Interview answer** — Desired capabilities are the old JSON Wire Protocol bag of untyped key/value pairs (`DesiredCapabilities`). W3C WebDriver replaced that with a structured capabilities document (`alwaysMatch` / `firstMatch`) and requires vendor extensions to be prefixed (`appium:noReset`, `appium:udid`). The modern Appium Java client (8/9) hides that behind typed options classes: `UiAutomator2Options` and `XCUITestOptions` set `platformName`, `automationName`, and every `appium:` capability with setters, so you do not hand-build JSON or forget prefixes. I do not use `DesiredCapabilities` on new code.

**Deep dive** — A W3C `CreateSession` payload looks like `{"capabilities":{"alwaysMatch":{"platformName":"Android","appium:automationName":"UiAutomator2","appium:appPackage":"com.shop.android",...}}}`. Standard keys (`platformName`, `browserName`, `acceptInsecureCerts`) are unprefixed. Everything Appium-specific must be `appium:` or the server rejects it as an unknown capability — that is the #1 "works on my Appium 1 grid, dies on Appium 2" bug. The Java options classes implement `Capabilities` and emit the prefixed document for you. They also set `automationName` correctly (`UiAutomator2` vs `XCUITest`), which is how Appium 2 selects the driver plugin.

`DesiredCapabilities` still "works" if you remember prefixes or enable the `relaxed-caps` plugin, but you lose type safety, you lose duration-typed timeouts, and you signal that the suite predates the Java client 8 rewrite. Related graveyard: `MobileElement`, `AndroidDriver<MobileElement>`, `MobileBy` — all replaced by `WebElement`, `AndroidDriver`, and `AppiumBy`. Interviews will show you a snippet with `DesiredCapabilities` and `MobileBy.AccessibilityId` and ask what is wrong. The answer is "legacy client 7 API; rewrite on options + `AppiumBy`."

**Code**

```java
// Modern Java client 9 — typed W3C options, prefixes handled for you
UiAutomator2Options android = new UiAutomator2Options()
    .setPlatformName("Android")
    .setAutomationName("UiAutomator2")
    .setUdid("emulator-5554")
    .setApp("/apps/shop-release.apk")
    .setAppPackage("com.shop.android")
    .setAppActivity("com.shop.android.ui.MainActivity")
    .setAutoGrantPermissions(true)
    .setNoReset(false)
    .setNewCommandTimeout(Duration.ofSeconds(180));

XCUITestOptions ios = new XCUITestOptions()
    .setPlatformName("iOS")
    .setAutomationName("XCUITest")
    .setDeviceName("iPhone 15")
    .setPlatformVersion("17.5")
    .setBundleId("com.shop.ios")
    .setWdaLaunchTimeout(Duration.ofSeconds(120))
    .setNoReset(false);

// What you must NOT write on a modern suite
// DesiredCapabilities caps = new DesiredCapabilities();
// caps.setCapability("noReset", true);          // missing appium: prefix under strict W3C
// caps.setCapability("automationName", "UiAutomator2");
```

**Follow-ups & traps**
- "Why did my session fail with 'unknown capability noReset'?" — You sent JSONWP-style unprefixed caps to a W3C-strict Appium 2. Prefix `appium:` or use the options class.
- "Can I still pass a `Map`?" — Yes, `new UiAutomator2Options().amend("appium:optionalIntentArguments", "...")` for caps the class does not yet type.
- Trap: mixing `browserName=Chrome` with a native `app` capability and wondering why you got a mobile-web session.
- Trap: `platformName: android` vs `Android` — `platformName` is W3C-standard and case-insensitive in practice, but `automationName` values are driver-specific; use `UiAutomator2` / `XCUITest` exactly.

**Senior/lead angle** — Ban `DesiredCapabilities` in the framework module. One `DriverFactory` that accepts an env + device descriptor and returns `UiAutomator2Options` / `XCUITestOptions` is the entire capability story; tests never see raw caps.

**One-liner** — W3C sessions need `appium:`-prefixed vendor caps; Java client 8/9 `UiAutomator2Options` and `XCUITestOptions` emit them — `DesiredCapabilities` is legacy.

### Q6. Sessions, `noReset` / `fullReset` / `dontStopAppOnReset` — data implications

**Interview answer** — An Appium session is the lifetime of the vendor automation process plus the connection from the client: create session, run commands, delete session. Reset flags decide what happens to the *app's data* around that lifetime. `fullReset` uninstalls and reinstalls the app — clean storage, slow, closest to a fresh install. `noReset=true` leaves the app and its data on the device, so the last test's cart, token, and onboarding flags are still there. The default (`noReset=false`, `fullReset=false`) stops the app and clears data but does not uninstall. `dontStopAppOnReset` keeps the process alive across session boundaries, which is faster and dangerous because you inherit in-memory state.

**Deep dive** — Think in terms of what a checkout suite stores: EncryptedSharedPreferences / Keychain tokens, Room / UserDefaults carts, "hasSeenOnboarding" flags, permission grants, WebView cookies, payment-SDK device binding. `fullReset` wipes all of that (and on iOS is closer to delete-and-reinstall, which also drops Keychain items that a mere data-clear may not). That is correct for "first-install login" and fatal for "reopen the app and the session is still valid" tests — those need `noReset` and a dedicated device or simulator clone. Default reset is the right CI default for independent tests: you do not pay the APK/IPA reinstall every method, but you do not leak the previous test's `buyer@shop.test` session into a guest-checkout case.

`dontStopAppOnReset` exists because cold-start is expensive and some apps crash if killed mid-WebView. It is not a substitute for test isolation. If test A leaves the payment sheet half-open and test B starts with the app still in that Activity/UIViewController, you will debug "ghost" failures for a week. Deep-link + API seeding is a better speed lever than keeping the process dirty (see file 02 Q8 and file 04 Q11).

Parallelism multiplies this. Two sessions with `noReset` on the same shared device farm instance will see each other's users. Reset policy is a data-isolation policy, not a performance knob you turn globally.

**Code**

```java
// Fresh-install path: first-run permissions + empty cart (slow; use for that one test)
UiAutomator2Options firstInstall = new UiAutomator2Options()
    .setApp("/apps/shop.apk")
    .setFullReset(true)      // uninstall + install
    .setNoReset(false);

// Default CI test: keep the binary, wipe app data, kill the process
UiAutomator2Options isolated = new UiAutomator2Options()
    .setAppPackage("com.shop.android")
    .setFullReset(false)
    .setNoReset(false);

// Stateful journey across methods on a dedicated simulator (document why)
XCUITestOptions keepState = new XCUITestOptions()
    .setBundleId("com.shop.ios")
    .setNoReset(true);       // Keychain token and cart survive
```

**Follow-ups & traps**
- "Why is my login test passing and the next test already logged in?" — `noReset=true` or `dontStopAppOnReset` plus a shared account. Reset flags, not "Appium cached the locator."
- "fullReset vs reinstalling in `@BeforeAll` via ADB?" — Same idea; `fullReset` is the driver doing `pm uninstall` + install for you. Doing it yourself is fine if you need finer control (keep permissions, replace only the APK).
- Trap: `noReset=true` on a device farm without a factory-reset policy. Yesterday's payment sandbox token becomes today's flake.
- Trap: assuming iOS Keychain dies on default reset. Some items survive unless you uninstall. If the test is "logged-out user," assert it or `fullReset`.

**Senior/lead angle** — Encode reset in the driver factory as named profiles (`freshInstall`, `isolated`, `reuseSession`) and make tests declare which profile they need. A global `noReset=true` to "make CI faster" is how login/checkout suites become order-dependent.

**One-liner** — Session = vendor automation lifetime; `fullReset` reinstalls, default reset clears data, `noReset` keeps the last user's cart and token — treat reset as data isolation.

### Q7. Appium Inspector — uses and limits

**Interview answer** — Appium Inspector is a desktop (and now also browser) client that starts or attaches to an Appium session, snapshots the UI hierarchy, and lets you highlight nodes and copy locators. I use it to learn a new screen — login form, payment sheet, permission dialog — and to verify that an `accessibility id` actually exists before I write a screen object. I do not use it as a test recorder for production suites: the generated XPath is brittle, the snapshot is not a live animation-aware view, and Inspector cannot see virtualized list rows that have not been scrolled into the tree.

**Deep dive** — Inspector is another WebDriver client. It sends the same `getPageSource` / `findElement` / `click` commands your tests send. That is why it is honest about what Appium can see (the accessibility tree, not the React Native virtual DOM, not Flutter widgets without a Flutter driver) and why it lies about timing: you click "Refresh source" after the spinner died, then copy a locator that your test will query 300 ms earlier. Hybrid apps only show the native chrome until you switch context; Flutter/React Native screens without testIDs look like a pile of `XCUIElementTypeOther` / `android.view.View`. Image-based highlight depends on the images plugin and is a last resort.

Limits I name in interviews: no reliable record-and-playback for gestures (inspector-generated swipe coordinates are resolution-specific); snapshots omit off-screen RecyclerView/UITableView children; iOS snapshots are expensive (you can stall WDA if you spam refresh); and Inspector sessions on a shared CI device steal the device. The professional workflow is Inspector to *discover* a stable locator, then encode it in a screen object, then prove it in a test — never commit Inspector XPath dumps.

**Code**

```java
// What Inspector is actually doing when you click "Refresh source"
String xml = driver.getPageSource();
// Then it highlights a node you pick, equivalent to:
WebElement pay = driver.findElement(AppiumBy.accessibilityId("pay-now"));
// Prefer the accessibility id it shows in the node details, not the generated XPath:
// //XCUIElementTypeWindow[1]/XCUIElementTypeOther[2]/.../XCUIElementTypeButton[3]
```

**Follow-ups & traps**
- "Can I record a whole checkout in Inspector and export Java?" — You can; you should not ship it. Absolute XPath + hardcoded pauses is how suites rot in a month.
- "Why doesn't Inspector see the cart row?" — Virtualization. Scroll first, then refresh source. Same as the test must do.
- Trap: using Inspector against a cloud device without locking the session — another job steals the device mid-inspect.
- "Inspector vs `adb shell uiautomator dump`?" — Both show the Android tree. Inspector is cross-platform and session-aware (contexts, WDA). `uiautomator dump` is a fast Android-only escape hatch when Appium is down.

**One-liner** — Inspector is a WebDriver client that snapshots the tree so you can pick locators; it is a discovery tool, not a recorder, and it cannot see unscrolled list rows.

### Q8. Native vs hybrid vs mobile-web — context switching

**Interview answer** — Native means OS views (Android widgets, UIKit/SwiftUI) and you stay in the `NATIVE_APP` context. Hybrid means a native shell plus one or more WebViews (checkout, 3-D Secure, help center); you switch into `WEBVIEW_<package>` or `WEBVIEW_<id>` to use Selenium-style CSS/DOM locators, then switch back. Mobile-web means Chrome or Safari on the device with no app binary — `browserName` instead of `app`/`bundleId`. Context switching is `getContextHandles()` + `context(...)`. Most payment flakes in hybrid apps are "I clicked Pay in native and the 3DS WebView was not the current context."

**Deep dive** — Android WebViews need a Chromedriver whose major version matches the device's Chrome/WebView package. Appium can autodownload, or you pin `chromedriverExecutable` / `chromedriverExecutableDir`. If versions drift, session create works and the first `context("WEBVIEW_...")` dies. You also need `setWebContentsDebuggingEnabled(true)` in debug builds; production WebViews that disable debugging are not automatable this way — that is a testability conversation with developers, not an Appium setting. iOS WebViews are inspected through Safari's debug pipeline (`includeSafariInWebviews`, `webviewConnectTimeout`); WKWebView in a release build may not appear until the app is marked inspectable.

Context lists are not instant. After `pay-now`, wait until the WebView handle exists rather than sleeping. Nested WebViews (PayPal / card-network 3DS inside the merchant WebView) produce multiple handles; picking the wrong one is a classic "element not found in WEBVIEW" bug. Native system chrome — iOS SpringBoard permission dialogs, Android runtime permission dialogs — is *not* in the WebView. If a permission lands on top of a hybrid checkout, you must be in `NATIVE_APP` to dismiss it, then return to the WebView. `NATIVE_APP` / `WEBVIEW` is a session-wide mode, not per-element.

Mobile-web is a different product: you are testing the responsive site, not the app. Do not call a Chrome-on-emulator suite "Android app coverage."

**Code**

```java
// Checkout: native cart → hybrid card WebView → native confirmation
driver.findElement(AppiumBy.accessibilityId("pay-now")).click();

new WebDriverWait(driver, Duration.ofSeconds(20)).until(d ->
    driver.getContextHandles().stream().anyMatch(c -> c.toLowerCase().contains("webview")));

String webview = driver.getContextHandles().stream()
    .filter(c -> c.startsWith("WEBVIEW"))
    .findFirst()
    .orElseThrow();
driver.context(webview);                       // now CSS/DOM, like Selenium
driver.findElement(By.id("card-number")).sendKeys("4242424242424242");
driver.findElement(By.id("pay")).click();

driver.context("NATIVE_APP");                  // back to the app chrome
driver.findElement(AppiumBy.accessibilityId("order-confirmation"));
```

**Follow-ups & traps**
- "Why is `getContextHandles()` only `NATIVE_APP`?" — WebView not yet created, debugging not enabled, Chromedriver mismatch, or iOS WebView not inspectable. Do not busy-loop forever; wait with a timeout and dump contexts on failure.
- "Is `WEBVIEW_chrome` the app?" — That is mobile Chrome, not your hybrid WebView. Look for `WEBVIEW_com.shop.android` (Android) or a `WEBVIEW` id tied to your app (iOS).
- Trap: using native `AppiumBy.id` after switching to a WebView. In WEBVIEW you are in a browser; use `By.cssSelector` / `By.id` of the DOM.
- Trap: never switching back, so the next native find fails with a WebView-flavored error.

**Senior/lead angle** — Hybrid payments are where suites go to die. I isolate 3DS/PayPal in a small, heavily-artifacted spec and prefer a test-mode deep link or API stub that skips the live issuer page in CI, with one nightly real-path test on a dedicated device.

**One-liner** — `NATIVE_APP` is OS views; `WEBVIEW_*` is a Chromedriver/Safari DOM — switch explicitly for hybrid checkout, and match Chromedriver to the WebView.

### Q9. Real device vs emulator/simulator — fidelity, CI cost, flake sources

**Interview answer** — Emulators (Android AVD) and simulators (iOS Simulator) are cheap, resettable, and good enough for functional logic: form validation, cart math, navigation, deep links. Real devices are required for fidelity the virtual device lies about: GPU/camera, biometric hardware, push-notification delivery, cellular, performance, OEM skins (Samsung, Xiaomi), and store-signed behavior. CI cost flips: Android emulators can run on Linux with KVM; iOS simulators require macOS runners; real devices are either a cloud farm (per-minute) or an in-house lab (ops). I develop on simulators/emulators and gate releases with a real-device critical path.

**Deep dive** — Fidelity gaps that have burned checkout suites: Android emulator camera is a scene file, not autofocus; iOS Simulator push via APNs is incomplete compared to a device; biometric APIs are mockable on emulator/simulator and not on a locked real phone without a hardware bypass; WebViews on emulators often run a different Chrome/WebView version than the OEM device in a user's pocket; animation timing and thermal throttling on a real phone in a farm rack produce timeouts you will never see on a cold AVD. OEM Android is its own OS family — permission dialog copy, battery savers killing background work, gesture navigation vs three-button nav changing safe swipe regions.

Flake sources by target: emulators — slow host, no KVM, AVD boot races, snapshot corruption; simulators — CoreSimulator service wedged, WDA build storms on a shared Mac; real devices — cable disconnects, iOS trust/pairing, low battery, OS update dialogs, "Unlock iPhone" after reboot, farm contention. Cost: an Android emulator CI job is a larger Linux VM plus boot time (1–3 minutes if not snapshotted). iOS simulator CI is a `macos-14` runner billed at a premium, plus Xcode + signing. Real-device cloud is usually the right default for iOS real hardware because an in-house iPhone lab has a human SLO.

**Code**

```java
// Same test, two targets — pick via env, do not fork the suite
boolean real = Boolean.parseBoolean(System.getenv().getOrDefault("REAL_DEVICE", "false"));
UiAutomator2Options opts = new UiAutomator2Options()
    .setApp(System.getenv("APP_PATH"))
    .setUdid(System.getenv("DEVICE_UDID")); // emulator-5554 or a farm UDID
if (real) {
    opts.setDisableWindowAnimation(true);   // real devices animate more
}
```

**Follow-ups & traps**
- "Is the iOS Simulator a real iPhone?" — No. It is a macOS process. No cellular, limited APNs, different performance, no TrueDepth camera. Never call simulator coverage "real iOS device coverage."
- "Can I skip real devices if I use BrowserStack?" — BrowserStack *is* real devices (plus some simulators if you pick them). The decision is cloud real vs in-house real vs virtual, not "BrowserStack vs real."
- Trap: running the full 400-test suite on cloud real devices. That is a budget problem. Virtual for the wide suite, real for the critical path.
- Trap: one Samsung farm device as "Android." OEM variance is why production-only bugs exist.

**Senior/lead angle** — Publish a coverage matrix: emulator/simulator PR smoke, nightly emulator full, nightly real-device critical path on N Android OEMs + last 2 iOS versions. Anything else is hope, not strategy.

**One-liner** — Virtual devices are cheap and good for logic; real devices catch OEM, camera, push, and performance — develop virtual, release-gate on real, and do not conflate Simulator with iPhone.

### Q10. Appium Doctor / prerequisite toolchain

**Interview answer** — The toolchain is everything the driver needs before `POST /session` can succeed. Android: JDK, Android SDK platform-tools (`adb`), a platform image, and a built app or `appPackage` already installed. iOS: Xcode, command-line tools, a signing identity that can install WebDriverAgent, and Carthage only if your WDA workflow still uses it — modern XCUITest driver builds WDA with `xcodebuild`. Appium 1 had `appium-doctor` as a global binary. Appium 2 moved this to per-driver checks: `appium driver doctor uiautomator2` and `appium driver doctor xcuitest`. I run those on CI images and on new laptops before I debug tests.

**Deep dive** — Android doctor looks for `ANDROID_HOME`/`ANDROID_SDK_ROOT`, `adb` on `PATH`, usable `java`, and sometimes `apkanalyzer` / build-tools. It does not guarantee an AVD exists or that KVM is available — those are CI-host problems. iOS doctor looks for Xcode, `xcodebuild`, simctl, and will warn about WDA dependencies. It cannot see that your provisioning profile expired or that the device is not trusted; those fail at session create with codesign errors. Carthage is a legacy interview landmine: older Appium 1 / early XCUITest docs said "install Carthage to build WDA." Appium 2's XCUITest driver vendors WDA and builds it via xcodebuild; you should mention Carthage as historical, not as a current hard requirement, unless the team's pinned driver is old enough to still need it.

Other prerequisites people skip: matching Xcode ↔ iOS Simulator runtime; `APPLE_ID` / team id for real devices; `adb` authorization (`adb devices` shows `unauthorized` until the phone confirms); Windows hosts cannot run iOS at all; Linux hosts cannot run iOS at all. Appium server being up is necessary and nowhere near sufficient — doctor is the "is this machine allowed to create a session" check.

**Code**

```bash
appium driver doctor uiautomator2
appium driver doctor xcuitest
adb devices                    # unauthorized | offline | emulator-5554
xcodebuild -version
xcrun simctl list devices available
# ANDROID_HOME must point at the SDK, platform-tools on PATH
echo "$ANDROID_HOME" && which adb
```

**Follow-ups & traps**
- "I installed Appium and it still can't start a session." — Doctor the *driver*, not the server. Missing `adb` or unsigned WDA is not an Appium bug.
- "Do we need Carthage?" — Not for a current XCUITest driver. Say "historically yes; today xcodebuild builds WDA." If the interviewer is on a 2020 stack, qualify.
- Trap: running doctor on the CI Linux image and declaring iOS healthy. iOS doctor must run on the Mac that will host simulators/WDA.
- Trap: `appium-doctor` (the Appium 1 global) as your only answer. Name the Appium 2 driver doctor commands.

**One-liner** — Appium 2 doctors the driver (`appium driver doctor uiautomator2|xcuitest`); Android is SDK/`adb`/JDK, iOS is Xcode + WDA signing, and Carthage is mostly a legacy footnote.

### Q11. How do you start a session? Complete Java example for Android and iOS

**Interview answer** — I build a typed options object, point the driver at the Appium 2 server URL with no `/wd/hub`, and construct `AndroidDriver` or `IOSDriver`. Android needs a device (`udid` or `deviceName`), an app (`app` path/URL or `appPackage`+`appActivity`), and `UiAutomator2`. iOS needs a device/simulator, `bundleId` or `app` (`.ipa`/`.app`), and `XCUITest`, plus WDA timeouts that are honest about first-launch cost. I then set an explicit wait, not an implicit one, and I quit the session in teardown so WDA/UiAutomator2-server do not leak across tests.

**Deep dive** — Session create is the most expensive call you will make. On Android it may install the AUT, install the UiAutomator2 server APKs, forward `systemPort`, start instrumentation, and grant permissions. On iOS it may build WDA, codesign, install, wait for the XCTest process, and launch the AUT. That is why `@BeforeAll` session reuse vs `@BeforeEach` new session is a real design choice (see Q6): reuse is faster and leaks state; new session is isolation. Cloud farms return a remote URL and inject `udid`; locally you pick an emulator or a plugged-in device. Java client 9 constructors take `URL` + `Capabilities`; `URI.create(...).toURL()` avoids the deprecated `new URL(String)`.

Do not put session create inside a page object. A `DriverFactory` (or a JUnit extension / TestNG `@BeforeMethod`) owns it, and tests receive a ready `AppiumDriver`. Parallel tests must not share a driver instance — `ThreadLocal<AppiumDriver>` (file 04 Q1).

**Code**

```java
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import io.appium.java_client.ios.IOSDriver;
import io.appium.java_client.ios.options.XCUITestOptions;
import io.appium.java_client.AppiumBy;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.net.URI;
import java.time.Duration;

public class SessionFactory {
    private static final String APPIUM = "http://127.0.0.1:4723";

    public static AndroidDriver android() throws Exception {
        UiAutomator2Options opts = new UiAutomator2Options()
            .setPlatformName("Android")
            .setAutomationName("UiAutomator2")
            .setUdid(System.getenv().getOrDefault("ANDROID_UDID", "emulator-5554"))
            .setApp(System.getenv().getOrDefault("ANDROID_APP", "/apps/shop.apk"))
            .setAppPackage("com.shop.android")
            .setAppActivity("com.shop.android.ui.MainActivity")
            .setAutoGrantPermissions(true)
            .setNewCommandTimeout(Duration.ofSeconds(180));
        AndroidDriver driver = new AndroidDriver(URI.create(APPIUM).toURL(), opts);
        driver.manage().timeouts().implicitlyWait(Duration.ZERO); // explicit waits only
        return driver;
    }

    public static IOSDriver ios() throws Exception {
        XCUITestOptions opts = new XCUITestOptions()
            .setPlatformName("iOS")
            .setAutomationName("XCUITest")
            .setDeviceName(System.getenv().getOrDefault("IOS_DEVICE", "iPhone 15"))
            .setPlatformVersion(System.getenv().getOrDefault("IOS_VERSION", "17.5"))
            .setBundleId("com.shop.ios")
            .setWdaLaunchTimeout(Duration.ofSeconds(180))
            .setNewCommandTimeout(Duration.ofSeconds(180));
        return new IOSDriver(URI.create(APPIUM).toURL(), opts);
    }
}

// JUnit 5
@BeforeEach
void start() throws Exception { driver = SessionFactory.android(); }

@Test
void login() {
    driver.findElement(AppiumBy.accessibilityId("email")).sendKeys("buyer@shop.test");
    driver.findElement(AppiumBy.accessibilityId("password")).sendKeys("hunter2");
    driver.findElement(AppiumBy.accessibilityId("login")).click();
    new WebDriverWait(driver, Duration.ofSeconds(15))
        .until(d -> d.findElement(AppiumBy.accessibilityId("home-cart")).isDisplayed());
}

@AfterEach
void stop() { if (driver != null) driver.quit(); }
```

**Follow-ups & traps**
- "Why `quit` and not `close`?" — `close` is a window concept. `quit` ends the session and tears down WDA/UiAutomator2-server. Leaking sessions is how ports exhaust on a CI Mac.
- "Local vs BrowserStack URL?" — Same constructor; the URL and a block of farm-specific options (`bstack:options`, `app` as `bs://<id>`) change. Keep one factory with an env switch.
- Trap: `new URL("http://127.0.0.1:4723/wd/hub")` against stock Appium 2 — 404 on session create. Drop `/wd/hub` or start the server with `--base-path=/wd/hub`.
- Trap: creating the driver in a singleton static field and then parallelizing. File 04 exists because of this.

**Senior/lead angle** — Session create belongs behind a factory that also records `sessionId`, device UDID, and driver versions into the test report. When a farm test dies, that metadata is the difference between "rerun" and "we can file a vendor ticket."

**One-liner** — Typed options + `AndroidDriver`/`IOSDriver` against `http://host:4723` (no `/wd/hub`), explicit waits, `quit` in teardown — session create is the expensive call, so isolate it in a factory.

### Q12. Appium vs Selenium relationship

**Interview answer** — They are the same protocol family. Appium's Java client implements Selenium's `WebDriver` / `WebElement` interfaces and speaks W3C WebDriver (+ Appium extensions) to a different remote end: a mobile driver instead of ChromeDriver/GeckoDriver. You can share ideas — page objects, explicit waits, factories, reporting — but you cannot share locators or actions. There is no `By.cssSelector` on a native login screen, no `Actions.moveToElement` hover on a phone, and gestures, contexts, and app lifecycle have no Selenium desktop equivalent. I treat Appium as "Selenium-shaped mobile automation," not "Selenium with a smaller window."

**Deep dive** — Historically Appium implemented the JSON Wire Protocol that Selenium 3 used, then both moved to W3C. That is why a lot of mental models transfer: sessions, capabilities, `findElement`, `click`, `sendKeys`, `getPageSource`. It is also why people over-share. A web POM that returns `By` locators and assumes a stable DOM will implode on a RecyclerView whose rows do not exist until scrolled. Selenium Grid 4 can host Appium nodes (file 04 Q12), which is the operational overlap, not the API overlap.

What I reuse from a Selenium Java framework: TestNG/JUnit structure, Allure, configuration layer, API clients for seeding, assertion libraries, CI artifact upload. What I rewrite: locator strategy (accessibility id first), waits (activity/screen + animation), navigation (deep links, not URLs), and any hover/right-click/window code. Sharing a single `BasePage` between web Selenium and Appium is a design error I have had to undo on more than one team.

**Code**

```java
// Same interface, different By strategy — do not reuse the web POM
// Web (Selenium):     By.cssSelector("[data-testid=email]")
// Android native:     AppiumBy.accessibilityId("email")
// iOS native:         AppiumBy.accessibilityId("email")  // if the team set accessibilityIdentifier
// Hybrid WebView:     By.cssSelector("[data-testid=email]") after context switch

WebElement email = driver.findElement(AppiumBy.accessibilityId("email"));
email.sendKeys("buyer@shop.test"); // same WebElement.sendKeys, different input pipeline
```

**Follow-ups & traps**
- "Can I use Selenium 4 ChromeDriver against a phone?" — For *mobile Chrome*, yes (or Appium's `browserName=Chrome` session). That is mobile-web, not the native shop app.
- "Is Appium a Selenium project?" — Appium is OpenJS / Appium project; it *implements* the WebDriver protocol. The Java client depends on `selenium-java`.
- Trap: "We share 90% of page objects between web and Android." If that is true, you are testing a WebView wrapper, not a native app — say so.
- Trap: using Selenium's `Actions` click-and-hold as a long-press without knowing W3C pointer input vs deprecated `TouchAction`.

**Senior/lead angle** — When a web-heavy SDET team is asked to "just add mobile," budget a new screen-object layer and a device pipeline, not a two-sprint port of the Selenium POM.

**One-liner** — Same WebDriver protocol and Java interfaces; different remote end, locators, gestures, and lifecycle — steal framework shape, never the web POM.

### Q13. Common capability mistakes

**Interview answer** — The mistakes I see in interviews and in production are: omitting `automationName` so Appium 2 cannot pick a driver; sending unprefixed `noReset`/`udid`/`app` under strict W3C; still posting to `/wd/hub` on a stock Appium 2 server; pointing `app` at an unsigned debug IPA or a stale `bs://` hash; and, on iOS, never configuring WebDriverAgent signing (`xcodeOrgId`, provisioning, or a prebuilt WDA), which fails session create with a codesign error that looks like "Appium is broken." Android equivalents are a wrong `appActivity` (exported vs not, Android 12+ exported flag) and a Chromedriver that does not match the WebView.

**Deep dive** — Capability errors fail at `POST /session`, so the test never reaches `findElement`. That is good — if you dump the Appium server log you will see the real reason. `automationName` is mandatory in the 2.x world because drivers are plugins; `UiAutomator2Options` sets it, a raw `Map` might not. Prefixes: W3C reserved names pass; `appium:app`, `appium:udid`, `appium:deviceName` must be prefixed unless `relaxed-caps` is on — and relying on that plugin means the suite cannot move to a stricter grid. WDA signing is not a capability you can "set to true." You need a real Apple team, `updatedWDABundleId` if the default bundle collides, and often `usePrebuiltWDA=true` in CI after a once-per-image build. Unsigned or development-team-mismatched WDA is the entire iOS onboarding pain.

Other frequent ones: `deviceName` is not a unique selector on a farm (use `udid`); `platformVersion` that does not match the simulator runtime; mixing `browserName` and `app`; `newCommandTimeout` too low so a long checkout idle kills the session; `autoGrantPermissions` assumed to work on iOS (it is an Android-oriented flag; iOS uses the `permissions` capability / WDA); and Java client 7 caps copied into a client 9 project.

**Code**

```java
// Broken: Appium 2, strict W3C, missing driver + prefixes + legacy path
// caps.setCapability("noReset", true);
// new AndroidDriver(new URL("http://127.0.0.1:4723/wd/hub"), caps);

// Fixed
UiAutomator2Options opts = new UiAutomator2Options()
    .setAutomationName("UiAutomator2")
    .setApp("/apps/shop.apk")
    .setAppPackage("com.shop.android")
    .setAppActivity("com.shop.android.ui.MainActivity") // exported launcher, not a leaked internal activity
    .setNoReset(false)
    .amend("appium:ignoreHiddenApiPolicyError", true); // Android 9+ hidden API, when needed

XCUITestOptions ios = new XCUITestOptions()
    .setBundleId("com.shop.ios")
    .setXcodeOrgId(System.getenv("TEAM_ID"))
    .setXcodeSigningId("iPhone Developer")
    .setUpdatedWdaBundleId("com.shop.WebDriverAgentRunner")
    .setUsePrebuiltWda(true);
```

**Follow-ups & traps**
- "Session create error: 'Could not find a driver'" — Driver plugin not installed, or `automationName` missing/typo (`UIAutomator2` vs `UiAutomator2` is usually tolerated; `uiautomator` is not).
- "error: Failed to create session / WDA" — Read the xcodebuild log. 90% signing, 10% Xcode/runtime mismatch. Do not "increase timeouts" first.
- Trap: `appActivity=.MainActivity` when the launchable activity is `.ui.LauncherActivity` and MainActivity is not exported on Android 12+.
- Trap: `autoWebview=true` on a native app "just in case" — you start in a WebView context that does not exist.

**Senior/lead angle** — Put a capabilities linter in the factory: refuse unprefixed maps, refuse `/wd/hub` unless `APPIUM_BASE_PATH` is set, refuse iOS real-device sessions without org id or prebuilt WDA. This is cheaper than another week of onboarding.

**One-liner** — Appium 2 session failures are almost always `automationName`, missing `appium:` prefixes, wrong server path, bad activity/bundle, or unsigned WDA — not a bad locator.

### Q14. Appium Inspector vs `page_source` for locator design

**Interview answer** — Both show the same accessibility tree; they differ in workflow. Inspector is interactive: highlight, try a locator, tap. `driver.getPageSource()` (or the Inspector "source" pane) is the XML dump I attach to CI failures and grep when I cannot reproduce a farm-only hierarchy. I design locators from the dump's *attributes* (`content-desc` / `name` / `resource-id` / `label`), not from the XML path. If the dump does not contain a stable attribute, I do not write an XPath — I file a testability ticket for an `accessibilityIdentifier` / `contentDescription`.

**Deep dive** — `getPageSource` on Android is an XML serialization of AccessibilityNodeInfo; on iOS it is an XML serialization of the XCUITest snapshot. That is why source is huge on a tabbed shop home screen, why XPath queries against it are slow (the driver often walks that tree), and why virtualized rows are missing: they were never in the snapshot. Inspector is a UI on top of the same snapshot. Using Inspector without ever reading source trains you to click the pretty box; reading source trains you to see that five "Add" buttons share a class and none have an id — which is the actual locator problem.

For locator design I dump source at the moment the test would search (after the checkout spinner, after the list scroll). I look for, in order: accessibility id, resource-id / name, iOS predicate-friendly label+type, Android `UiSelector` text/description, and only then a constrained XPath. I keep a source dump in the failure artifact bundle (file 04 Q7) because a screenshot shows pixels and source shows whether the node existed — the difference between "wrong locator" and "screen never arrived."

**Code**

```java
@Test
void payButtonHasTestabilityHook() {
    driver.findElement(AppiumBy.accessibilityId("checkout")).click();
    String source = driver.getPageSource();
    // Assert the contract the screen object relies on — catches a release that dropped content-desc
    Assertions.assertTrue(
        source.contains("pay-now") || source.contains("content-desc=\"Pay now\""),
        () -> "pay-now missing from hierarchy:\n" + source.substring(0, Math.min(2000, source.length())));
}

// Failure hook
@AfterEach
void dump(TestInfo info) throws Exception {
    if (driver == null) return;
    Files.writeString(Path.of("artifacts", info.getDisplayName() + ".xml"), driver.getPageSource());
}
```

**Follow-ups & traps**
- "Is the Inspector XPath OK if it works today?" — It works until the marketing banner adds a node above the button. Attribute locators survive; absolute paths do not.
- "Source is empty / tiny on iOS." — Snapshot timed out or WDA is wedged. Restart the session; do not design locators from a partial dump.
- Trap: designing locators from a debug build that sets `contentDescription` everywhere, then running against a release build that strips them. Dump source from the same flavor CI uses.
- Trap: treating `page_source` as a live DOM. It is a snapshot; animations and pending RecyclerView binds will disagree with the next find.

**Senior/lead angle** — I make "source dump on failure" a framework default and I review new screen objects against a dump, not a screenshot. If a locator needed XPath, the PR must include the testability ticket or a predicate/UiSelector justification.

**One-liner** — Inspector and `page_source` are the same tree: use Inspector to explore, use dumps to design and to debug CI, and locate by accessibility attributes, not by XML path.
