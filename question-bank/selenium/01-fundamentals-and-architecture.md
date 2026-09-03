# Selenium Fundamentals & Architecture

This file is the architecture layer every Selenium interview opens with: what the project actually is, how a command reaches a browser, what changed in 4.x, and how Selenium compares to Playwright and Cypress. A Senior/Staff candidate is expected to speak W3C protocol, Selenium Manager, and Grid versus library — not "it clicks buttons." These answers are written for Selenium 4.x as of 2025/2026, Java 17+, with no DesiredCapabilities.

- Q1. What is Selenium? History: IDE, RC, WebDriver, Grid; why RC died.
- Q2. Selenium components today (WebDriver, Grid, IDE) and what is NOT Selenium (Appium, Selenide, etc.).
- Q3. How does WebDriver communicate with the browser? W3C WebDriver vs JSON Wire Protocol.
- Q4. What is the difference between Selenium WebDriver and Selenium Grid?
- Q5. Driver architecture: client libraries, browser driver, browser, and Selenium Manager (4.6+).
- Q6. Selenium 3 vs 4 — what actually changed.
- Q7. ChromeOptions / FirefoxOptions / EdgeOptions — headless, prefs, arguments, excludeSwitches.
- Q8. How do you launch browsers? Local vs remote (RemoteWebDriver).
- Q9. What is a WebElement vs By? Locator evaluation timing vs Playwright laziness.
- Q10. findElement vs findElements — NoSuchElementException vs empty list.
- Q11. get() vs navigate().to() vs back/forward/refresh.
- Q12. getTitle, getCurrentUrl, getPageSource — when useful and when not.
- Q13. Cookies, localStorage, sessionStorage via Selenium.
- Q14. JavascriptExecutor — legitimate uses vs smell.
- Q15. Selenium vs Playwright vs Cypress — architecture a Java-shop interviewer expects.
- Q16. Chrome DevTools Protocol (CDP) in Selenium 4 and WebDriver BiDi — honest maturity.

### Q1. What is Selenium? History: IDE, RC, WebDriver, Grid; why RC died.

**Interview answer** — Selenium is an open-source browser-automation project, not a single product. Today "Selenium" in interviews means the WebDriver client libraries plus the W3C WebDriver protocol, optionally Selenium Grid for remote execution, and a much-smaller Selenium IDE for record/playback. The lineage matters because interviewers use it to test whether you understand *why* the architecture looks the way it does: IDE recorded Selenese, RC injected a JavaScript robot into the page, WebDriver replaced that with a native browser-driver process, and Grid farms those sessions.

**Deep dive** — Four historical pieces, one surviving control plane.

Selenium IDE (2006, Firefox extension; later a browser extension rewrite) recorded clicks into Selenese. Fine for demos, unmaintainable for a checkout suite — locators were whatever the recorder saw, waits were implicit magic, and you could not express a login-via-API-then-assert-orders-grid flow. It still exists; it is not how a Java shop ships regression.

Selenium RC (Remote Control, "Selenium 1") ran a Java server that launched the browser and *injected* `selenium-browserbot.js` into the page. Your test spoke HTTP to the RC server; the server drove the page from inside the same JS origin. That is why RC died. Same-origin policy fought you (the infamous `*chrome` / `*firefox` / proxy-injection modes). Every browser upgrade broke the injected JS. You could not see events the browser did not expose to page JS. The server was a single-process bottleneck. RC's security model — "let a test server inject script into banking pages" — became unacceptable.

WebDriver (merged as Selenium 2, ~2011) inverted the model: a *native* driver process (chromedriver, geckodriver) speaks HTTP to the test and a privileged browser debug protocol to the browser. The test is outside the page. Jason Huggins started Selenium; Simon Stewart started WebDriver at Google; the merge kept the Selenium name and the WebDriver architecture. Selenium 3 deleted RC. Selenium 4 made W3C WebDriver the default dialect and rewrote Grid.

Grid (1/2/3 hub-node, 4 componentized) was always the answer to "I need Chrome on Linux and Safari on macOS from one Java suite." It is an execution fabric, not an assertion library.

The interview-useful moral: RC died because in-page JS automation cannot be a stable, secure, cross-origin control plane. Everything that still hurts in Selenium — per-command HTTP, driver binaries, no automatic actionability — is the cost of the WebDriver bet that replaced it. Playwright later placed a different bet (persistent bidirectional protocol + patched browsers). Both bets are coherent; they are not the same product.

**Follow-ups & traps**
- "Is Selenium a tool or a protocol?" — Both. The W3C WebDriver spec is a protocol; `selenium-java` is a client; Grid is a router for that protocol. Collapsing them into "the tool" is a junior tell.
- "Did WebDriver replace Selenium?" — No. WebDriver *is* Selenium's automation API after the Selenium 2 merge. Saying "we use WebDriver, not Selenium" is historically confused.
- "Why not keep RC for simple pages?" — Same-origin, no headless-at-scale story, no W3C, unmaintained. There is no RC in 4.x.
- Trap: claiming IDE is "deprecated and gone." The extension still exists; it is just not an SDET framework.

**Senior/lead angle** — When a lead asks "should we stay on Selenium," the history answer is the preamble: we already paid the WebDriver cost (language bindings, Grid, cloud vendors). The migration question is whether that cost still buys something Playwright's patched-browser model does not (real Safari, existing BrowserStack sessions, Java-only staff). History without that fork is trivia.

**One-liner** — Selenium is the WebDriver client + W3C protocol + optional Grid; RC died because injecting JS into the page could not beat same-origin, security, or browser-native drivers.

### Q2. Selenium components today (WebDriver, Grid, IDE) and what is NOT Selenium (Appium, Selenide, etc.).

**Interview answer** — The Selenium project ships three things you can name without hedging: language bindings for WebDriver (Java, Python, C#, JS, Ruby), Selenium Grid 4, and Selenium IDE. Appium, Selenide, Healenium, WebDriverIO, and Rest Assured are *not* Selenium — they are consumers, wrappers, or siblings that speak WebDriver or sit next to it. Interviewers ding candidates who say "we use Selenium" when they mean "Selenide on top of ChromeDriver" or "Appium which used to bundle Selenium jars."

**Deep dive** — Draw the box tightly.

Inside the box: `org.seleniumhq.selenium:selenium-java` (the BOM pulls `selenium-chrome-driver`, `selenium-firefox-driver`, `selenium-remote-driver`, `selenium-support` for waits/Select/ExpectedConditions). Selenium Manager (the `selenium-manager` binary since 4.6) lives in that box. Grid 4 is a separate distribution (`selenium-server` / Docker images) that implements the same W3C endpoints. IDE is a Chrome/Firefox extension that can export WebDriver code; it does not run your TestNG suite.

Outside the box, and why interviewers care:

- **Appium** implements the WebDriver protocol (W3C in Appium 2) for iOS/Android/Windows. It is a sister project. Your Java tests may use `io.appium:java-client`, which historically extended Selenium's `RemoteWebDriver`. Mobile context switching, UiAutomator2, and XCUITest are Appium's, not Selenium's. Saying "Selenium for mobile" is wrong; saying "WebDriver protocol for mobile via Appium" is right.
- **Selenide** is a fluent Java wrapper: `$("#email")`, automatic waits, `Selenide.screenshot()`. It *uses* Selenium WebDriver. A Selenide suite is still a Selenium suite underneath, but your waits and locators are Selenide's API. If the job says Selenium and you only know `$()`, say so.
- **WebDriverIO** is a Node test runner that can speak WebDriver or Playwright/puppeteer protocols. Not Selenium-the-project.
- **Healenium / Self-healing locators** sit as a proxy in front of WebDriver. They are productized flake-copers, not core Selenium.
- **Rest Assured / HTTP clients** are API tools. A hybrid framework uses them *beside* Selenium, not as a Selenium component.
- **BrowserStack / Sauce Labs / LambdaTest** are cloud grids that *implement* the WebDriver (and often CDP/Appium) endpoints. They are not Selenium Grid, even when your code is `new RemoteWebDriver(cloudUrl, chromeOptions)`.

The practical interview move: "Our stack is TestNG + selenium-java 4.x + our DriverFactory talking to either local Chrome, our Grid, or BrowserStack. Selenide is optional sugar we did not take because we wanted explicit WebDriverWait in page objects."

**Follow-ups & traps**
- "Is ChromeDriver part of Selenium?" — ChromeDriver is a Chromium project binary. Selenium Manager downloads it. Selenium does not *own* ChromeDriver.
- "Does Selenium test iOS?" — Not by itself. Appium (or a cloud device farm speaking Appium) does.
- Trap: listing TestNG, Maven, ExtentReports as "Selenium components." Those are the Java test platform around Selenium.
- "What is selenium-support for?" — Waits, ExpectedConditions, Select, Color, RelativeLocator, Events. Not a fourth product.

**Senior/lead angle** — Component literacy stops gold-plating. Teams add Selenide *and* a custom wait layer *and* Healenium and then cannot explain which layer timed out. Pick one wait model and one driver lifecycle; treat everything else as a dependency you can draw on a whiteboard.

**One-liner** — Selenium is WebDriver bindings, Grid, and IDE; Appium, Selenide, cloud vendors, and TestNG are neighbors that speak to it or wrap it.

### Q3. How does WebDriver communicate with the browser? W3C WebDriver vs old JSON Wire Protocol. HTTP per command.

**Interview answer** — The Java client serializes each call — `click()`, `sendKeys()`, `getText()` — as an HTTP request to a WebDriver endpoint, either the local driver (chromedriver on `localhost:port`) or a remote Grid/cloud node. Selenium 4 speaks the W3C WebDriver protocol by default (JSON body, standard capability names, standard status/error shapes). Selenium 3 spoke the older OSS JSON Wire Protocol and only later grew a W3C dialect. Every command is a new HTTP round-trip, which is why a 200-step checkout test is chatty compared to Playwright's single persistent WebSocket.

**Deep dive** — A click on the checkout button is not "Java talking to Chrome." It is a chain:

1. `checkoutButton.click()` in the binding builds `POST /session/{id}/element/{el}/click` with an empty W3C body.
2. HTTP goes to chromedriver (or to Grid Router, which looks up the Session Map and forwards to the Node that owns that session).
3. chromedriver translates the W3C command into Chrome DevTools Protocol / Blink automation calls.
4. Chrome performs the action and returns a WebDriver result (success or a standardized error like `element click intercepted`).
5. The Java client throws the matching exception (`ElementClickInterceptedException`).

JSON Wire Protocol (JWP / OSS) used different paths and a `{status, value, sessionId}` envelope with numeric status codes. Capability keys were ad-hoc (`chromeOptions` vs `goog:chromeOptions`). Error handling was inconsistent across drivers. W3C WebDriver (now the living standard) standardized capability matching, element identifiers (`element-6066-11e4-a52e-4f735466cecf`), actions (the pointer/key tick model behind the Actions API), and error codes. Selenium 4 stopped sending JWP first; Selenium 3 often sent both or negotiated.

Why this is slower than Playwright: Playwright opens one bidirectional connection per browser and keeps it for the session. Commands are multiplexed frames; the browser *pushes* events (network, console, dialogs, new pages). Selenium's model is request/response: you cannot natively subscribe to "the orders API returned 500" without polling or attaching CDP on the side. 80 commands × 5–15 ms of HTTP+driver overhead is a second of pure protocol tax before the app does anything. On a remote Grid that tax is multiplied by network RTT — the classic "it is fast on my laptop and glacial on Grid" complaint that is *not* always a wait bug.

W3C also explains `ChromeOptions` as capabilities: you do not send a bag of DesiredCapabilities keys anymore; you send a W3C `alwaysMatch` / `firstMatch` structure that the Java client builds from `ChromeOptions`. The vendor prefix `goog:chromeOptions` is how Chrome-specific args ride inside a standard capabilities document.

**Code**

```java
// What a single "type email on the login page" actually costs over the wire
WebDriver driver = new ChromeDriver(new ChromeOptions());
driver.get("https://shop.example.com/login");          // POST /session/{id}/url
WebElement email = driver.findElement(By.id("email")); // POST /session/{id}/element
email.sendKeys("buyer@example.com");                   // POST /session/{id}/element/{el}/value
email.clear();                                         // POST /session/{id}/element/{el}/clear
driver.quit();                                         // DELETE /session/{id}
```

**Follow-ups & traps**
- "Where does the HTTP server live?" — In the *driver* (chromedriver), not in Chrome and not in your JAR. Grid adds another hop.
- "Is it REST?" — HTTP + JSON, session-scoped resources. People say REST; the spec does not require REST purity.
- Trap: "W3C means we don't need ChromeDriver." You still need a driver process (or Selenium Manager to fetch it). W3C standardized the *dialect*, not the topology.
- "Can I see the traffic?" — `Selenium Logger` / `SELENIUM_LOG_LEVEL`, or a proxy. Interviewers like "I once dumped the /session traffic to prove a click never left the client."

**Senior/lead angle** — Protocol chatiness is why you move login and order-seed to Rest Assured and keep UI for the last-mile assertion. Cutting 40 WebDriver commands from a setup path is a better performance win than buying a bigger Grid node.

**One-liner** — Each Selenium command is an HTTP round-trip over W3C WebDriver to a driver process; that request/response model is why it is chatty next to Playwright's persistent WebSocket.

### Q4. What is the difference between Selenium WebDriver and Selenium Grid?

**Interview answer** — WebDriver is the client API and protocol you use to control *one* browser session: find, click, wait, switch window. Grid is a remote execution service that *hosts* those sessions on other machines. Locally you construct `new ChromeDriver(options)` and the driver child process lives next to the test JVM. On Grid you construct `new RemoteWebDriver(gridUrl, options)` and the browser runs on a Node; the test JVM only holds an HTTP client. You can use WebDriver without Grid; Grid is useless without a WebDriver client.

**Deep dive** — The confusion comes from people saying "we run Selenium" to mean both. Responsibilities split cleanly.

WebDriver (library): locator strategies, Actions, waits, cookie API, JavascriptExecutor, TakesScreenshot, the Java types (`WebDriver`, `WebElement`, `By`, `ChromeOptions`). It knows nothing about your 40-node Kubernetes farm.

Grid (service): capability matching ("give me Chrome 131 on linux"), session queueing, slot accounting, routing subsequent commands to the Node that owns `session-id`, and (in 4.x Dynamic Grid) starting a browser container on demand. Grid does not assert that the order total is `$42.00`.

Topology:

```text
Test JVM  --W3C HTTP-->  chromedriver  -->  Chrome     (local WebDriver)

Test JVM  --W3C HTTP-->  Grid Router --> Session Map --> Node:chromedriver --> Chrome
```

`RemoteWebDriver` is still WebDriver. The interface on the test side does not change, which is the point of a DriverFactory (see the Grid file): tests depend on `WebDriver`, not on `ChromeDriver` versus `RemoteWebDriver`.

What Grid is *not*: a parallel test runner. TestNG/JUnit parallel is what opens N sessions. Grid is what *accepts* N sessions. If you start 50 TestNG threads against a 8-slot Node, 42 sit in the session queue until `session-request-timeout`.

**Follow-ups & traps**
- "Do I need Grid to run Chrome and Firefox?" — Not if you are willing to launch both locally, sequentially or with two local drivers. Grid is for *remote* and *shared* browsers.
- "Is BrowserStack Grid?" — It is a cloud implementation of the same remote WebDriver idea, not the Selenium Grid binary.
- Trap: "Grid runs my TestNG suite." Grid never sees TestNG. Your CI agent runs Maven; Grid only sees `/session` requests.
- "Can Grid run Playwright?" — Not natively. Playwright has its own server/connect model. Do not pitch Grid as a universal browser farm for every tool.

**Senior/lead angle** — Treat Grid as cattle infrastructure with a capacity plan (slots, timeouts, version pins). Treat WebDriver as the application library you version in `pom.xml`. Mixing those conversations — "Grid is flaky" when the client used a static WebDriver — wastes a quarter.

**One-liner** — WebDriver is how a test talks to a browser; Grid is where that browser lives when it is not on the test machine.

### Q5. Driver architecture: client libraries, browser driver (chromedriver), browser. Selenium Manager (4.6+) auto-matching drivers.

**Interview answer** — Three processes sit in a local run: the test JVM (Java bindings), the browser driver binary (chromedriver, geckodriver, msedgedriver), and the browser itself. The bindings send W3C HTTP to the driver; the driver owns the browser process and translates commands. Since Selenium 4.6, Selenium Manager is bundled and, by default, finds or downloads a driver that matches the browser on PATH or the discovered Chrome/Firefox/Edge install. Interviewers still ask about `System.setProperty("webdriver.chrome.driver", ...)` because version mismatch — Chrome 131 with chromedriver 128 — is the historic `SessionNotCreatedException` everyone has hit.

**Deep dive** — Selenium Manager (`selenium-manager` binary inside the JAR, platform-specific) inverted a decade of tribal knowledge. Before 4.6 the ritual was: WebDriverManager (boni García) or a checked-in chromedriver or a Dockerfile `RUN curl`. The failure mode was clockwork: the corp laptop auto-updated Chrome over the weekend, Monday's pipeline died with "This version of ChromeDriver only supports Chrome version X."

Manager's algorithm (simplified): detect the browser version (registry / `google-chrome --version` / macOS app bundle), look in cache (`~/.cache/selenium`), download the matching driver from Chromium/Google/Firefox endpoints if missing, return the path to the Java bindings. You write `new ChromeDriver(options)` and do not set the property.

What still breaks, and what interviewers want named:

- Corporate proxies and locked-down CI images that cannot reach `chromedriver.storage.googleapis.com` / `googlechromelabs.github.io`. Manager fails; you pin a driver in the image or mirror it.
- "Chrome for Testing" vs branded Chrome. Manager can fetch CfT browsers too (`ChromeOptions` browser version pinning in recent 4.x). Pinning in CI is the senior move: do not test against whatever the agent auto-updated to.
- Firefox: geckodriver vs Firefox version matrix is looser than Chrome's but not infinite.
- You can still set `PATH` or `webdriver.chrome.driver` and Manager steps aside. Legacy suites do this; say you know how to *stop* doing it.
- Selenium Manager is not a Grid. It only provisions the driver binary for the process that will launch the browser. On Grid, *the Node* needs the matching driver/browser pair; Manager on the test JVM does not install Chrome on the Node.

**Code**

```java
// Selenium 4.6+ — no System.setProperty, no WebDriverManager boilerplate
ChromeOptions options = new ChromeOptions();
options.addArguments("--window-size=1920,1080");
WebDriver driver = new ChromeDriver(options); // Manager resolves chromedriver

// Explicit pin still valid when CI cannot reach the internet
// System.setProperty("webdriver.chrome.driver", "/opt/drivers/chromedriver");
```

**Follow-ups & traps**
- "We still use WebDriverManager.io — is that wrong?" — Not wrong; it is redundant on 4.6+ unless you rely on its extra features (repo mirroring). Know *why* it is there.
- Trap: putting chromedriver in the repo and never updating it. That is how Monday failures are scheduled.
- "Where does Manager cache?" — `~/.cache/selenium` (overridable). Cache it in CI to avoid download storms.
- "What if two Chrome versions are installed?" — Detection order is platform-specific; pin `browserVersion` on `ChromeOptions` when it matters.

**Senior/lead angle** — Driver provisioning is an infra contract: local laptops may use Manager; CI images pin browser + driver; Grid nodes pin both and advertise versions to the Distributor. Do not let three different matching strategies coexist undocumented.

**One-liner** — Test JVM → driver binary → browser; Selenium Manager (4.6+) auto-matches the driver, but PATH/version mismatch is still a live `SessionNotCreated` in any environment Manager cannot reach.

### Q6. Selenium 3 vs 4 — what actually changed.

**Interview answer** — Selenium 4 is not a new locator API with a coat of paint. The default protocol became W3C WebDriver (JSON Wire is gone as the primary dialect), Grid was rewritten into Router/Distributor/Session Queue/Session Map/Event Bus/Nodes, DesiredCapabilities stopped being the way you launch browsers, and the user-facing API gained relative locators, a real Window API (`newWindow`), authenticated CDP access on Chromium, and the start of WebDriver BiDi. Selenium Manager arrived in 4.6. If you only say "relative locators" you sound like a blog title; if you say W3C + Grid rewrite + no DesiredCapabilities you sound like you migrated a suite.

**Deep dive** — What interviewers actually probe, item by item.

**Protocol.** Selenium 3 drivers often dual-spoke JWP and W3C. Capability names drifted (`chromeOptions` vs `goog:chromeOptions`). Selenium 4 clients send W3C. Errors you see (`invalid selector`, `stale element reference`, `element click intercepted`) are spec names. OSS-only endpoints disappeared.

**Capabilities.** `DesiredCapabilities.chrome()` is deprecated and must not appear in new code. `ChromeOptions`, `FirefoxOptions`, `EdgeOptions`, `SafariOptions` implement `Capabilities` and serialize to W3C. `setCapability` still exists on those option classes for vendor keys; the *bag type* you pass to `RemoteWebDriver` should be an Options instance.

**Locators.** `By.id` / `By.cssSelector` / `By.xpath` unchanged. New: `RelativeLocator.with(By.tagName("input")).above(password)`. Useful for "the label to the left of this field"; fragile for responsive grids.

**Windows.** Selenium 3: `JavascriptExecutor` `window.open` then switch by handle diff. Selenium 4: `driver.switchTo().newWindow(WindowType.TAB)` returns a driver focused on the new browsing context.

**Frames / shadow.** `getShadowRoot()` returns a `SearchContext` so you `findElement` inside an open shadow tree. This is a 4.x API; 3.x was JS-only.

**CDP / BiDi.** `HasDevTools` / `DevTools` on Chromium drivers: Network, Log, Performance, emulation. BiDi (`HasBiDi`) is the W3C long-term replacement; maturity is uneven (see Q16).

**Grid.** Grid 3: one Hub process, Nodes register, XML config, a well-known set of Hub flags. Grid 4: componentized, HTTP + GraphQL (`/graphql`), Docker Dynamic Grid, Observability. Hub/Node language still works as a *mental model*; the processes are not named that in fully distributed mode.

**Timeouts API.** `implicitlyWait(10, TimeUnit.SECONDS)` → `implicitlyWait(Duration.ofSeconds(10))`. `WebDriverWait(driver, 10)` → `WebDriverWait(driver, Duration.ofSeconds(10))`. Java 17 code should look like Duration.

**IDE / RC.** RC stayed dead. IDE was rewritten as a browser extension. Not a reason to upgrade a Java suite.

**What did *not* change.** You still HTTP-per-command. You still get `StaleElementReferenceException`. There is still no Playwright-style auto-wait. `findElement` is still eager. Implicit+explicit can still stack. POM still should store `By`, not `WebElement`. Anyone who says "Selenium 4 fixed flakiness" oversold a release.

**Code**

```java
// Selenium 3 style (do not write this)
// DesiredCapabilities caps = DesiredCapabilities.chrome();
// WebDriverWait wait = new WebDriverWait(driver, 15);

// Selenium 4 / Java 17
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new", "--window-size=1920,1080");
WebDriver driver = new ChromeDriver(options);
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
driver.switchTo().newWindow(WindowType.TAB);
driver.get("https://shop.example.com/orders");
```

**Follow-ups & traps**
- "Can I pass DesiredCapabilities to RemoteWebDriver in 4?" — The constructor may still accept `Capabilities`, but building them via DesiredCapabilities is deprecated and W3C-hostile. Use Options.
- Trap: "Grid 4 is just Docker." Docker is a distribution; the rewrite is the component architecture.
- "Do relative locators replace XPath?" — No. They are a convenience, not a strategy.

**Senior/lead angle** — A migration from 3 → 4 is mostly capabilities + Duration + Grid ops + killing WebDriverManager if Manager suffices. It is not a rewrite of page objects. Budget the Grid cutover separately from the client bump.

**One-liner** — Selenium 4 defaulted to W3C, rewrote Grid, replaced DesiredCapabilities with Options, and added relative locators, newWindow, CDP, BiDi, and Manager — it did not add auto-waiting.

### Q7. ChromeOptions / FirefoxOptions / EdgeOptions — headless, download prefs, arguments, excludeSwitches, setExperimentalOption.

**Interview answer** — Options classes are the W3C-capable way to configure a browser before launch: arguments, prefs, binary path, headless, insecure certs, and vendor experimental options. You never build a parallel DesiredCapabilities object. For Chrome/Edge, download directories and "disable the infobar" go through `setExperimentalOption("prefs", ...)` and `excludeSwitches`. For Firefox, the equivalent is `FirefoxProfile` / `firefoxOptions.addPreference`. The same Options instance is what you pass to `ChromeDriver` locally and to `RemoteWebDriver` for Grid/cloud.

**Deep dive** — Chrome-specific keys ride as `goog:chromeOptions` inside the W3C capabilities document. That is why `setExperimentalOption` exists: prefs and excludeSwitches are *not* W3C, they are Chrome.

Headless in 2025/2026: use `--headless=new` (Chrome's new headless, a real Chrome minus UI). Old `--headless` was a separate implementation that missed features (extensions, some downloads, different rendering). `options.setHeadless(true)` was deprecated; do not use it. Also set `--window-size=1920,1080` because headless defaults are not your laptop.

CI-hardened Chrome arguments you should be able to recite: `--no-sandbox` (containers), `--disable-dev-shm-usage` (small `/dev/shm` in Docker), `--disable-gpu` (legacy, mostly harmless), `--window-size`. Do not cargo-cult `--disable-extensions` unless you mean it.

`excludeSwitches: ["enable-automation"]` plus `useAutomationExtension: false` hide the "Chrome is being controlled by automated software" infobar and some `navigator.webdriver` tells. This is *not* an anti-bot strategy you should sell as security testing; it just reduces UI noise and a few naive bot checks.

Prefs that come up in checkout suites: `download.default_directory`, `download.prompt_for_download=false`, `profile.default_content_setting_values.notifications=2` (block), geolocation/camera similarly. Paths must exist on the *machine that runs the browser* — on Grid that is the Node filesystem, not the test JVM. That single sentence is a common Grid-download failure.

Firefox: `options.addArguments("-headless")`, `options.addPreference("browser.download.dir", dir)`, `browser.download.folderList=2`, `browser.helperApps.neverAsk.saveToDisk`. Firefox headless downloads have historically been fussier than Chrome's; mention that in a cross-browser answer.

Edge: `EdgeOptions` is Chromium-based and almost the same as ChromeOptions, including `goog:` vs `ms:` prefixes depending on version — prefer the EdgeOptions methods over raw keys.

**Code**

```java
Path downloads = Path.of("/tmp/orders-downloads");
Files.createDirectories(downloads);

ChromeOptions chrome = new ChromeOptions();
chrome.addArguments(
        "--headless=new",
        "--window-size=1920,1080",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage");
chrome.setAcceptInsecureCerts(true);
chrome.setExperimentalOption("excludeSwitches", List.of("enable-automation"));
chrome.setExperimentalOption("useAutomationExtension", false);
chrome.setExperimentalOption("prefs", Map.of(
        "download.default_directory", downloads.toAbsolutePath().toString(),
        "download.prompt_for_download", false,
        "download.directory_upgrade", true,
        "safebrowsing.enabled", true,
        "profile.default_content_setting_values.notifications", 2,
        "profile.default_content_setting_values.geolocation", 2
));

FirefoxOptions firefox = new FirefoxOptions();
firefox.addArguments("-headless");
firefox.addPreference("browser.download.folderList", 2);
firefox.addPreference("browser.download.dir", downloads.toAbsolutePath().toString());
firefox.addPreference("browser.helperApps.neverAsk.saveToDisk", "application/pdf,text/csv");
firefox.setAcceptInsecureCerts(true);

WebDriver driver = new ChromeDriver(chrome);
```

**Follow-ups & traps**
- "Why did downloads work locally but not on Grid?" — Pref path is on the Node; the test then tries to `Files.read` on the CI agent. Read from a shared volume or use Grid/cloud download APIs.
- Trap: `DesiredCapabilities caps = new DesiredCapabilities(); caps.merge(chrome);` as a habit. Merge is for composing Options, not resurrecting DesiredCapabilities.
- "How do I set the Chrome binary?" — `chrome.setBinary("/opt/google/chrome/google-chrome")` or `browserVersion` + Manager/CfT.
- "SafariOptions?" — Much thinner; SafariDriver does not take Chrome-style prefs. File upload and headless are the usual Safari pain.

**Senior/lead angle** — Options belong in a typed `BrowserOptionsFactory` per environment (local/headed, CI/headless, Grid), not copy-pasted in every `@BeforeMethod`. Headless flags and download dirs are environment policy, not test logic.

**One-liner** — Configure launch with ChromeOptions/FirefoxOptions/EdgeOptions — arguments, prefs, excludeSwitches — and pass that same object locally or to RemoteWebDriver; never DesiredCapabilities.

### Q8. How do you launch browsers? Local vs remote (RemoteWebDriver URL + options).

**Interview answer** — Locally I instantiate the browser-specific driver with Options: `new ChromeDriver(chromeOptions)`. Remotely I instantiate `new RemoteWebDriver(gridUrl, chromeOptions)` — same Options, different transport. The test code after that is identical (`WebDriver` interface). A DriverFactory (or Strategy) picks local versus remote from config so page objects never see the URL.

**Deep dive** — `ChromeDriver` extends `ChromiumDriver` and starts a service (`ChromeDriverService`) that binds a local port; Selenium Manager supplies the executable. `RemoteWebDriver` does not start a browser; it `POST /session` to the URL you give it (`http://localhost:4444`, `https://hub.browserstack.com/wd/hub`, a cloud vendor's current endpoint). Grid 4's welcome port is `4444` and the W3C path is `/session` on the Router; the old `/wd/hub` prefix still works for compatibility — know both so you do not fight a 404 for an hour.

Java 17 URL construction: `URI.create("http://grid.internal:4444").toURL()` avoids the deprecated `new URL(String)` if your JDK flags it.

Matching: the Options you send are the *requested* capabilities. Grid's Distributor matches them against Node slots. If you request `browserVersion=131` and no slot has 131, the request waits in the Session Queue. Locally there is no matcher — you get whatever Chrome is on the machine.

Cloud vendors require extra Options capabilities (`bstack:options`, `sauce:options`) for project name, build, video. Those are still set on `ChromeOptions.setCapability`, not on a DesiredCapabilities object.

Lifecycle: every launch must have a matching `quit()` (not just `close()`). `close()` closes the current window; `quit()` ends the session and the driver process. On Grid, forgetting `quit()` leaks a slot (flagship topic in the Grid file).

**Code**

```java
public final class DriverFactory {
    private DriverFactory() {}

    public static WebDriver create(AppConfig config) throws Exception {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--window-size=1920,1080");
        if (config.headless()) {
            options.addArguments("--headless=new");
        }
        return switch (config.launchMode()) {
            case LOCAL -> new ChromeDriver(options);
            case GRID, CLOUD -> new RemoteWebDriver(URI.create(config.remoteUrl()).toURL(), options);
        };
    }
}

// login test does not care where Chrome lives
WebDriver driver = DriverFactory.create(AppConfig.fromEnv());
driver.get(config.baseUrl() + "/login");
```

**Follow-ups & traps**
- "`close()` vs `quit()`?" — `close` one window; `quit` the session. After `close` of the last window, behavior is driver-specific; always `quit` in teardown.
- Trap: hardcoding `http://localhost:4444/wd/hub` in page objects.
- "Can I attach to an already-open Chrome?" — `ChromeDriver` + `debuggerAddress` / CDP attach. Useful for debugging, not for CI.
- "Safari locally on Linux?" — No. SafariDriver is macOS (and cloud). This is why Grid or a cloud exists for a "real Safari" checkbox.

**Senior/lead angle** — One factory, three strategies (local/grid/cloud), Options built once. Tests never import `ChromeDriver` or `RemoteWebDriver`. That is the launch question at Staff level.

**One-liner** — `new ChromeDriver(options)` locally, `new RemoteWebDriver(gridUrl, options)` remotely; same Options, always `quit()`, never DesiredCapabilities.

### Q9. What is a WebElement vs By? Locator evaluation timing (findElement is eager — contrast Playwright Locator laziness).

**Interview answer** — `By` is a locator strategy — a query you *can* run (`By.id("email")`, `By.cssSelector("[data-testid=cart-line]")`). `WebElement` is the result of running that query *now*: a remote reference (`element-6066-...`) to a specific DOM node in that session. `findElement` is eager: it talks to the driver immediately and throws or returns. Playwright's `Locator` is lazy: the query is stored and re-run on every action. That is the deepest Selenium-versus-Playwright sentence you can say in a Java interview.

**Deep dive** — When `findElement` succeeds, the Java object holds an ID the driver maps to a node. If React unmounts the login form and remounts it, the node is gone; the ID is stale; the next `click()` is `StaleElementReferenceException`. The `By` is still valid — you just need to query again.

This is why page objects should store `private final By emailField = By.id("email");` and expose `driver.findElement(emailField)` (or a wait that finds it) at use time. Storing `private WebElement emailField` assigned in the constructor is a stale factory. PageFactory `@FindBy` is a lazy *proxy*, but the proxy still caches after first resolution and goes stale — it is not a Playwright Locator.

Evaluation timing also affects waits. `ExpectedConditions.visibilityOf(alreadyFoundElement)` cannot survive a re-render; `visibilityOfElementLocated(By)` re-finds each poll. Prefer By-based conditions.

Playwright contrast (say it cleanly, then return to Selenium): `page.getByTestId('email').fill(email)` re-queries, waits for actionability, and retries. There is no `WebElement` equivalent unless you opt into `ElementHandle`. Selenium makes the eager handle the default and the cheap thing to pass around — which is why stale is *the* Selenium exception.

Chaining: `driver.findElement(By.id("cart")).findElement(By.cssSelector("[data-sku]"))` is two eager hops. If the cart re-renders between them, the second hop stales on the parent. One CSS/XPath from the document root, or a wait for the child By, is more stable.

**Code**

```java
public final class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;
    // Store By — not WebElement
    private static final By EMAIL = By.id("email");
    private static final By PASSWORD = By.id("password");
    private static final By SUBMIT = By.cssSelector("[data-testid=login-submit]");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public void login(String email, String password) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(EMAIL)).sendKeys(email);
        driver.findElement(PASSWORD).sendKeys(password);
        wait.until(ExpectedConditions.elementToBeClickable(SUBMIT)).click();
    }
}
```

**Follow-ups & traps**
- "Is WebElement a DOM node in the JVM?" — No. It is a handle. `getText()` is another HTTP call.
- Trap: collecting `List<WebElement> rows` and iterating after a sort/filter re-render. Re-query the list each iteration or work from locators/indices carefully.
- "Why doesn't Selenium make Locator the default?" — History + spec: WebDriver's element identity is a remote ID. Playwright designed Locator first.
- PageFactory follow-up — see the framework file. Have an opinion: many seniors avoid it.

**Senior/lead angle** — This is an architecture rule, not a style preference: `By` in POM fields, find at use, never cache elements across navigations or AJAX replacements. Code review should reject `private WebElement checkoutBtn` as a defect, not a nit.

**One-liner** — `By` is a query, `WebElement` is an eager remote handle; `findElement` resolves now (and can go stale), unlike Playwright's lazy Locator.

### Q10. findElement vs findElements — NoSuchElementException vs empty list.

**Interview answer** — `findElement` returns the first match or throws `NoSuchElementException` immediately (subject to implicit wait). `findElements` returns a `List<WebElement>` that is empty if nothing matches — it does not throw. Use `findElement` when the email field must exist; use `findElements` when you are asserting absence, counting cart lines, or branching on an optional promo banner.

**Deep dive** — Both are eager. Both honor implicit wait: with an implicit wait of 10 seconds, a missing `#email` makes `findElement` poll up to 10 seconds then throw, and `findElements` poll up to 10 seconds then return `[]`. That makes `findElements` a terrible "is it here?" inside a tight loop if implicit wait is non-zero — you pay the full implicit timeout on every miss.

Absence assertion done wrong: `assertTrue(driver.findElements(By.id("cart-error")).isEmpty())` with implicit wait 10s adds 10s to every successful checkout. Absence done right: explicit wait for invisibility, or implicit wait 0 and a short FluentWait, or `ExpectedConditions.invisibilityOfElementLocated`.

Presence of many: `findElements(By.cssSelector("[data-testid=order-row]"))` then assert size. For "at least one," prefer `wait.until(numberOfElementsToBeMoreThan(rows, 0))` so you do not race the orders API.

`findElement` "first match" means DOM order. If two `#email` exist (a hidden mobile form and a desktop form — invalid HTML but common), you get the first in the document, which may be the hidden one, and then `ElementNotInteractableException`. Unique locators, not "whichever findElement found."

**Code**

```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// Must exist: login email
WebElement email = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("email")));

// Optional promo — do not use findElement
List<WebElement> promo = driver.findElements(By.cssSelector("[data-testid=promo-banner]"));
if (!promo.isEmpty() && promo.get(0).isDisplayed()) {
    promo.get(0).findElement(By.cssSelector("[data-testid=promo-dismiss]")).click();
}

// Empty cart is a valid state — wait for the list to be present, then count
wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("[data-testid=cart-lines]")));
List<WebElement> lines = driver.findElements(By.cssSelector("[data-testid=cart-line]"));
Assertions.assertEquals(0, lines.size(), "cart should be empty after removing the last SKU");
```

**Follow-ups & traps**
- "Does findElements throw after implicit wait?" — No. Empty list.
- Trap: `driver.findElement(By.id("x")) != null` as a presence check. It never returns null; it throws.
- "findElement with a list locator?" — First only. If you meant all order rows, you meant `findElements`.
- Implicit wait + `findElements.isEmpty()` as a fast-negative is a hidden sleep.

**One-liner** — `findElement` throws `NoSuchElementException`; `findElements` returns an empty list — and both will sit on implicit wait before they do.

### Q11. get() vs navigate().to() vs navigate back/forward/refresh.

**Interview answer** — `driver.get(url)` and `driver.navigate().to(url)` both perform a WebDriver navigate to that URL and block until the browser's page-load signal (subject to `pageLoadTimeout`). They are equivalent for going to `/login` or `/checkout`. `navigate().back()`, `forward()`, and `refresh()` drive the session history. I use `get()` for primary entry, `navigate()` when the test is explicitly about history (back from checkout to cart), and I never treat `refresh()` as a wait strategy.

**Deep dive** — Historically some bindings implemented `get` and `navigate().to` as the same `POST /session/{id}/url`. In Java they remain two entry points to one navigation. Interviewers still ask; the precise answer is "functionally equivalent for absolute navigation; navigate() also exposes history."

Page load strategy (`normal`, `eager`, `none` on Options) changes what "blocking" means. `normal` (default) waits for `document.readyState=complete`. SPAs often fire `complete` before the orders table hydrates — so `get` returning does **not** mean the grid is visible. That is an explicit-wait problem, not a `get` vs `to` problem.

`refresh()` re-requests the current URL. It is valid to test "draft order survives refresh." It is invalid to `refresh()` because a spinner was stale. You lose in-memory SPA state you may have wanted; you also race the same hydration again.

`back()` / `forward()`: checkout → cart via back is a real user path (paywall, accidental navigation). After `back()`, elements from the checkout page are stale; you must re-find cart locators. Some apps disable cache and re-fetch; some restore from `history.state`. Assert URL *and* a cart-specific landmark.

`pageLoadTimeout`: if `get` exceeds it, `TimeoutException`. For apps that never reach `complete` (long-polling, broken onload), teams set `eager` or `none` and wait on a landmark. That is a strategy change, not a bigger timeout.

**Code**

```java
driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
driver.get("https://shop.example.com/login");
// ... login ...
driver.navigate().to("https://shop.example.com/cart");
driver.navigate().refresh(); // legitimate: cart persists after reload
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid=cart-line]")));
driver.navigate().back();
new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.urlContains("/login"));
```

**Follow-ups & traps**
- "Which is faster?" — Neither. Same command.
- Trap: `get("javascript:...")` or using `get` as a JS executor.
- "Does get() clear cookies?" — No. Cookies are session-scoped. You are still logged in after `get("/orders")`.
- Hash routes: `get("/app#/orders")` vs client-side `back()` — know whether the app uses History API.

**One-liner** — `get` and `navigate().to` are the same navigation; `back`/`forward`/`refresh` are history — and none of them wait for your SPA to hydrate.

### Q12. getTitle, getCurrentUrl, getPageSource — when useful and when not.

**Interview answer** — `getTitle()` is the document title — useful as a cheap landing-page assertion (`Orders — Example Shop`) and as an `ExpectedConditions.titleContains` wait after login. `getCurrentUrl()` is the real URL including query and hash (driver-dependent on hash); use it to assert redirects (`/login` → `/account`) and to wait with `urlContains`. `getPageSource()` is the raw HTML string at that moment — useful for rare debugging or asserting a meta tag you cannot locate, and a poor substitute for locators on a checkout form.

**Deep dive** — Title: SPAs often set `document.title` late. `getTitle()` right after `get()` can still be the shell title (`Example Shop`) before the orders route sets `Orders`. Wait on title or, better, wait on a heading role/testid. Title is also what accessibility trees and browser tabs show — a product assertion, not just a debug crumb.

URL: after login, asserting `urlContains("/account")` catches a failed redirect that still rendered a 200 shell. Do not parse query strings with regex in every test; if the order ID is in the URL, extract it once and use it. Note: some drivers normalize trailing slashes; be flexible (`/cart` vs `/cart/`).

Page source: this is `document.documentElement` serialization, not a screenshot and not the accessibility tree. Shadow DOM internals, canvas, and many SPA virtual lists will *not* show the pixels you think. Source is huge; asserting `pageSource.contains("Order #1842")` is brittle (whitespace, encoding, i18n) and slow to dump in reports. Legitimate uses: confirming a `meta[name=robots]`, a server-rendered error page with no convenient testid, or writing a failure artifact next to a screenshot.

None of these three waits for a specific element. Pair them with explicit waits.

**Code**

```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(15));
wait.until(ExpectedConditions.urlContains("/orders"));
wait.until(ExpectedConditions.titleContains("Orders"));
Assertions.assertTrue(driver.getCurrentUrl().contains("status=open"),
        "orders view should keep the open-status filter in the URL");
// pageSource as a last-resort artifact, not a primary assert
if (debug) {
    Files.writeString(Path.of("target", "orders.html"), driver.getPageSource());
}
```

**Follow-ups & traps**
- "Is getPageSource the same as View Source?" — Approximately the current DOM HTML, not the original HTTP body. JS-mutated DOM is included; some dynamic bits are not what you saw in DevTools Elements.
- Trap: asserting logged-in state only via title. A white-label title may not change.
- "Can I use URL instead of cookies to know I'm logged in?" — URL is a hint; an auth cookie or a visible avatar is the assertion.

**One-liner** — Title and URL are good wait/assert signals after navigation; pageSource is a debug dump, not a locator strategy.

### Q13. How do cookies, localStorage, sessionStorage work via Selenium?

**Interview answer** — Cookies have a first-class WebDriver API: `manage().getCookies()`, `getCookieNamed`, `addCookie`, `deleteCookieNamed`, `deleteAllCookies`. You can only add a cookie for the current origin, so you must `get()` the domain first. `localStorage` and `sessionStorage` have no WebDriver REST commands — you read and write them through `JavascriptExecutor`. That is enough to seed a cart token or assert a feature flag; it is not Playwright `storageState`.

**Deep dive** — Cookie object fields: name, value, domain, path, expiry, secure, httpOnly, sameSite (Selenium 4). `addCookie` cannot set httpOnly cookies in all browsers the way a server `Set-Cookie` can — do not use UI cookie injection as a perfect clone of a production session. `deleteAllCookies` does not clear localStorage or sessionStorage; people "log out" in `@AfterMethod` and wonder why the SPA still has a JWT in localStorage.

Order of operations for cookie inject login (the classic shortcut):

1. `get("https://shop.example.com")` — establish origin (a 404 page is enough).
2. `addCookie(new Cookie.Builder("sid", token).domain(".example.com").path("/").isHttpOnly(true).isSecure(true).build())` — may drop httpOnly depending on browser.
3. `get("https://shop.example.com/orders")` — reload so the app reads the cookie.

If the app stores the session in `localStorage.setItem("accessToken", ...)`, cookie inject does nothing. Mirror what the app actually uses (DevTools Application tab). For SPA tokens:

```text
localStorage  — origin-scoped, persists across tabs and restarts (until cleared)
sessionStorage — per tab/window; newWindow TAB may or may not share depending on how it was opened
```

Selenium 4 does not give you a portable "save storageState.json / load next test" the way Playwright does. Teams that want this build it: dump cookies + localStorage JSON in a setup test, inject in others. It is fragile across domains, `Secure`/`SameSite`, and token expiry. Prefer API login + inject, or accept UI login for a dedicated smoke path.

**Code**

```java
driver.get("https://shop.example.com");
driver.manage().addCookie(new Cookie.Builder("sid", apiLoginSid)
        .domain("shop.example.com")
        .path("/")
        .isSecure(true)
        .sameSite("Lax")
        .build());
driver.navigate().refresh();

Set<Cookie> cookies = driver.manage().getCookies();
Cookie sid = driver.manage().getCookieNamed("sid");

JavascriptExecutor js = (JavascriptExecutor) driver;
js.executeScript("localStorage.setItem('accessToken', arguments[0]);", jwt);
String token = (String) js.executeScript("return localStorage.getItem('accessToken');");
js.executeScript("sessionStorage.setItem('checkoutDraftId', arguments[0]);", draftId);
js.executeScript("localStorage.clear(); sessionStorage.clear();");
```

**Follow-ups & traps**
- "Why addCookie threw InvalidCookieDomainException?" — You were on `about:blank` or a different host. Navigate first.
- Trap: `deleteAllCookies()` as logout. Clear storage too, or call the app's logout.
- "HttpOnly token visible in getCookies?" — `getCookies()` returns httpOnly cookies to the WebDriver client even though page JS cannot see them. That is a privileged automation channel.
- Playwright `storageState` comparison — say you have to hand-roll it.

**Senior/lead angle** — Session reuse is a suite-speed feature with a security footnote: fixture files with real JWTs do not belong in git. Generate tokens via a test-only auth API in CI.

**One-liner** — Cookies are `manage()`; localStorage/sessionStorage are `JavascriptExecutor`; you must be on the origin, and this is still weaker than Playwright storageState.

### Q14. JavascriptExecutor — when legitimate (scroll, shadow pierce fallback, SPA state) vs smell.

**Interview answer** — `JavascriptExecutor` runs script in the page context and returns a value. It is legitimate when WebDriver cannot express the operation: scrolling a virtualized orders list, reading `localStorage`, poking an open shadow root on an older path, or forcing `window.scrollTo` for an infinite-scroll trigger. It is a smell when you `arguments[0].click()` because a real click failed, or `element.value = ...` to skip `sendKeys` — those bypass actionability and miss the bugs users hit.

**Deep dive** — The API: `executeScript` (sync) and `executeAsyncScript` (callback as last arg, honors `scriptTimeout`). Arguments can be `WebElement`, primitives, lists, maps. Return values are converted back (DOM nodes become WebElements — useful and surprising).

Legitimate checkout-suite examples:

- Scroll the sticky footer out of the way *after* you have diagnosed a click intercept, or scroll a container (`cart-scrollable.scrollTop = ...`) that `Actions.moveToElement` does not reach.
- Read SPA state the UI does not expose: `return window.__PRELOADED_STATE__.cart.id`.
- Trigger infinite scroll: `window.scrollTo(0, document.body.scrollHeight)`.
- Open-shadow fallback if `getShadowRoot()` is insufficient for a nested tree.
- Date/time: not really — compute in Java; do not set input values via JS unless the picker has no accessible API *and* you document the hole.

Smell examples interviewers will push on:

- JS click on a disabled Place Order button — you just placed an order a user cannot place.
- Setting `#card-number` via JS — you skipped input masking, iframe tokenization (Stripe), and `input` events the app listens for. The test passes; production checkout fails.
- `document.querySelector(...).click()` as a default click implementation in a BasePage. You have invented a second driver.

Selenium 3 vs 4: the interface is the same. What changed is you need JS *less* for new windows and open shadow. Using JS for those in a 4.x suite needs a reason.

**Code**

```java
JavascriptExecutor js = (JavascriptExecutor) driver;

WebElement ordersTable = driver.findElement(By.cssSelector("[data-testid=orders-table]"));
js.executeScript("arguments[0].scrollIntoView({block:'center'});", ordersTable);

String cartId = (String) js.executeScript("return localStorage.getItem('cartId');");

js.executeAsyncScript(
        "const cb = arguments[arguments.length - 1];" +
        "fetch('/api/orders/latest').then(r => r.json()).then(cb);");
```

**Follow-ups & traps**
- "JS click vs WebElement.click?" — WebElement.click uses the WebDriver click (actionability-ish: must be visible; intercept still throws). JS click fires a DOM click without the hit-test. Know which you used when a flake "only fails in UI."
- Trap: `executeScript` returning `Long` for numbers — cast carefully (`((Number) value).intValue()`).
- `executeAsyncScript` without calling the callback → `scriptTimeout` / `TimeoutException`.
- "Can JS pierce closed shadow?" — No. Closed shadow is closed to page JS too.

**Senior/lead angle** — Ban JS click in the core click helper; allow it behind an explicit method name (`forceClickForOverlayWorkaround`) with a ticket. Metrics on how often that helper fires are a quality signal.

**One-liner** — JS executor is for scroll, storage, and SPA state the protocol cannot see — not for fake clicks and fake typing that skip the UI.

### Q15. Selenium vs Playwright vs Cypress — architecture comparison a Java-shop interviewer expects.

**Interview answer** — Selenium is a W3C WebDriver client: HTTP per command, a driver binary, any compliant browser including branded Safari, a huge Java/Grid/cloud ecosystem, and *you* supply waits, runner, and isolation (TestNG + ThreadLocal). Playwright drives patched browsers over a persistent bidirectional channel, auto-waits, and — in Node — ships a runner; `playwright-java` is a sync library without that runner, still stronger on auto-wait and tracing than Selenium. Cypress runs *inside* the browser (JS-only), which is excellent DX and a hard ceiling on multi-tab, multi-origin, and free parallelism. A Java shop comparing them is really comparing ecosystem fit, not blog feature lists.

**Deep dive** — Draw three columns and fill protocol, isolation, waits, languages, runner, browsers, infra.

| Axis | Selenium 4 | Playwright | Cypress |
| --- | --- | --- | --- |
| Protocol | W3C HTTP request/response (+ optional CDP/BiDi) | Persistent bidirectional (CDP-like / patched) | In-browser command queue + Node bridge |
| Isolation | Your problem: one WebDriver per thread | BrowserContext (cheap) | One browser, one origin mindset |
| Waits | Implicit/explicit/fluent you write | Auto-wait + web-first expect | Retry-able commands |
| Java | First-class `selenium-java` | `playwright-java` sync, no runner | Not a Java story |
| Runner | TestNG/JUnit/Maven | `@playwright/test` (Node) or TestNG+PW-Java | Cypress app |
| Browsers | Branded Chrome/Firefox/Edge/Safari via drivers | Patched Chromium/Firefox/WebKit; Chrome channel optional | Chromium-family + Firefox; WebKit experimental |
| Infra | Grid / BrowserStack / Sauce | Workers + shards; no Grid | Cypress Cloud for parallel machines |
| Stale | Yes, eager WebElement | Locators re-query | Different model (commands re-query) |

What a Java interviewer wants to hear next: "If we stay Java-only, Playwright-Java is the honest alternative — we keep TestNG and lose UI mode / fixtures / `playwright.config.ts`. Cypress is off the table unless we grow a JS test tribe. Selenium stays if we have Grid contracts, Safari-as-Safari, or 3,000 page objects we will not rewrite this year."

Fairness: Selenium 4 CDP/BiDi narrows the protocol gap on Chromium but does not give you Locator auto-wait. Playwright's patched WebKit is not branded Safari — a compliance checkbox may still require SafariDriver on macOS or a cloud vendor.

Java-shop isolation contrast to memorize: Selenium = one `WebDriver` per TestNG thread (ThreadLocal, you built it); Playwright Node = one `BrowserContext` per test (the runner built it); playwright-java = you build ThreadLocal `<Playwright, Browser, BrowserContext>` because the library is not thread-safe. Cypress = do not expect Java. That sentence is what the interviewer is fishing for after the table.

**Follow-ups & traps**
- "Which is faster?" — Protocol + auto-wait + less Grid RTT. Do not say "Playwright is newer."
- Trap: "Selenium 4 is the same as Playwright because CDP." CDP is an escape hatch in Selenium; it is the spine of Playwright-on-Chromium.
- "Can Cypress do tabs?" — Historically no; still not first-class. Playwright `context.waitForEvent('page')`. Selenium: window handles (Q in the windows file).
- "We have 200 Selenide tests — is that a Selenium or Playwright comparison?" — It is a wrapper-on-WebDriver comparison; migration cost includes unlearning `$()`.

**Senior/lead angle** — Pick with constraints: staff language, existing Grid spend, Safari requirement, flake budget, time-to-green on CI. Publish a one-page ADR. Hybrid periods are normal (Selenium regression + Playwright for new checkout). Dual-running forever without an exit criterion is not a strategy.

**One-liner** — Selenium: standard HTTP WebDriver + Java/Grid gravity; Playwright: bidirectional auto-wait and a Node-first runner; Cypress: in-browser JS DX with architectural ceilings — Java shops choose between selenium-java and playwright-java, not Cypress.

### Q16. What is Chrome DevTools Protocol (CDP) access in Selenium 4 and what is WebDriver BiDi? Honest maturity.

**Interview answer** — CDP is Chrome/Chromium's native debugging protocol. Selenium 4 exposes it on Chromium drivers via `HasDevTools` / `DevTools.send(...)` so you can do things W3C WebDriver never could: extra HTTP headers (basic auth, stubs), network throttling, console/performance logs, geolocation override, ignored certificate errors at a finer grain. WebDriver BiDi is the W3C *bidirectional* standard meant to replace both "HTTP-only WebDriver" and vendor CDP for automation. In 2025/2026 Selenium's BiDi API is real but still thinner and more moving than Playwright's event model; CDP remains the practical Chromium hammer, and BiDi is what you name as the future — especially if Firefox is in scope.

**Deep dive** — Why CDP exists in a W3C client: the working group was slower than Chrome. Playwright bet on CDP (and patches) as the primary channel. Selenium added `DevTools` so Java shops could intercept checkout traffic without leaving the project. You create a session (`devTools.createSession()`), then send domains: `Network.enable`, `Network.setExtraHTTPHeaders`, `Log.enable`, `Performance.enable`, `Emulation.setGeolocationOverride`. Listeners (`devTools.addListener`) give you console errors during a failed Place Order click — gold in a flake investigation.

Limits to say out loud:

- CDP is Chromium-only. `ChromeDriver` / `EdgeDriver` / Chromium `RemoteWebDriver` with a supporting Node. `FirefoxDriver` does not speak CDP. Safari does not speak CDP. A suite that *requires* CDP for login headers is a Chrome-only suite.
- The Java CDP bindings are generated and version-sensitive. A Chrome bump can change types (`Optional` arguments). Pin browser versions in CI.
- Remote Grid: CDP needs a websocket through the Grid. Grid 4 supports this, but cloud vendors differ. Never assume `HasDevTools` works on every `RemoteWebDriver`.
- Using CDP to stub the payments API is powerful and can make your "E2E" test a unit test in a costume. Be honest in the test name.

BiDi (WebDriver BiDi): a standard websocket alongside (or eventually instead of) HTTP commands, with modules for browsing context, log, network, input, script. Selenium exposes `HasBiDi` / `driver.bidi()` and higher-level helpers that have grown through 4.x (log inspector, network interceptor, listening for console). Firefox invested early; Chromium often runs a BiDi-to-CDP mapper. APIs have been annotated experimental and have been renamed across 4.x minors — do not memorize a 2022 snippet as current.

Honest maturity (2025/2026): you can do useful BiDi log/network work in Selenium, and you should prefer BiDi when you need Firefox + Chrome parity. For a deep Chromium-only need (a specific `Fetch.failRequest`, a precise emulation), CDP is still the better-documented path. Playwright still wins on "the protocol *is* the product." Anyone who claims "Selenium 4 BiDi means we have Playwright" has not written a network-mock suite in both.

**Code**

```java
ChromeDriver driver = new ChromeDriver(new ChromeOptions());
DevTools devTools = driver.getDevTools();
devTools.createSession();
devTools.send(Network.enable(Optional.empty(), Optional.empty(), Optional.empty()));
devTools.send(Network.setExtraHTTPHeaders(new Headers(Map.of(
        "X-Test-User", "buyer-42"
))));
devTools.addListener(Log.entryAdded(), entry ->
        System.out.println("browser log: " + entry.getText()));
driver.get("https://shop.example.com/checkout");
```

**Follow-ups & traps**
- "Is BiDi the same as CDP?" — No. CDP is Chrome's protocol. BiDi is a standard. Chromium may implement BiDi by mapping to CDP.
- Trap: calling CDP from a test that must run on Safari.
- "Does Grid 3 support CDP?" — Not in a way you should plan on. Grid 4 is the CDP-through-remote story.
- "Can BiDi auto-wait?" — No. Bidirectional events ≠ Playwright actionability.

**Senior/lead angle** — Policy: CDP/BiDi allowed in a `devtools` package for auth headers, log capture, and explicit network faults. Forbidden as a silent click/type replacement. Review CDP tests when bumping Chrome.

**One-liner** — Selenium 4 CDP is a Chromium escape hatch for network/logs/emulation; WebDriver BiDi is the standard bidirectional future — usable, still maturing, and not Playwright.
