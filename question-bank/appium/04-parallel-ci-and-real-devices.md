# Parallel Execution, Device Farms & CI

This file is the production-operations layer of a mobile SDET interview: how you run more than one Appium session without port collisions, how you pick a device farm, how you wire Jenkins or GitHub Actions, and how you keep shared hardware from leaking yesterday's buyer account into today's checkout. Leads are hired on these answers as much as on locators.

- Q1. Parallel Appium: servers, unique ports, ThreadLocal driver
- Q2. Device farms: BrowserStack, Sauce, AWS Device Farm, Firebase Test Lab, in-house
- Q3. Appium in Jenkins / GitHub Actions
- Q4. Emulators in Docker / GCE — limits
- Q5. Test data and accounts on shared devices
- Q6. Flaky mobile tests — taxonomy
- Q7. Capturing artifacts: screenshot, page_source, logs, video
- Q8. Real-device lab operations (lead)
- Q9. Designing a mobile test platform for multiple teams
- Q10. App install strategy in CI
- Q11. Combining API setup + Appium UI
- Q12. Appium + Selenium Grid 4

### Q1. Parallel Appium: one server vs multiple, unique ports, ThreadLocal driver

**Interview answer** — One Appium 2 server can host many sessions; each session still needs exclusive on-device ports so the drivers do not collide. On Android I unique `systemPort` (UiAutomator2 server, default 8200) and `chromedriverPort` per device; on iOS I unique `wdaLocalPort` (default 8100) and usually `mjpegServerPort` if I record. The Java client is not thread-safe: each TestNG/JUnit thread owns a `ThreadLocal<AppiumDriver>` created in `@BeforeMethod` and quit in `@AfterMethod`. I allocate devices from a pool (local UDIDs or farm capabilities) so two threads never share a phone.

**Deep dive** — "One server vs many" is a process question, not a protocol question. A single Node Appium process is simpler to log and upgrade; it can bottleneck under many simultaneous session creates (WDA compile, APK install). Multiple Appium processes (one per host, or one per device on different `--port`) isolate crashes: a WDA-spawn runaway kills one process. In a lab I prefer one Appium per machine and N sessions; in Docker I prefer one Appium + one emulator per container so the blast radius is the container.

Ports that actually collide: `systemPort` (Android, driver ↔ uiautomator2-server), `chromedriverPort` (hybrid), `mjpegServerPort` (screenshot stream), `wdaLocalPort` (iOS WDA HTTP), `wdaLocalPort` vs `webkitDebugProxyPort` on older stacks. Appium server `--port` (4723) is the client entry; two servers on one host need 4723, 4724, … The Java `ThreadLocal` is mandatory once TestNG `parallel="methods"` is on; a static `driver` is the classic "I clicked login on the other device" bug. Pass the allocated ports into `UiAutomator2Options.setSystemPort` / `XCUITestOptions.setWdaLocalPort` from the device lock you already hold.

**Code**

```java
public final class Drivers {
    private static final ThreadLocal<AppiumDriver> TL = new ThreadLocal<>();

    public static AppiumDriver get() { return TL.get(); }

    public static void start(DeviceLease device) throws Exception {
        URL url = URI.create(device.appiumUrl()).toURL();
        AppiumDriver driver;
        if (device.isAndroid()) {
            UiAutomator2Options opts = new UiAutomator2Options()
                .setUdid(device.udid())
                .setApp(device.app())
                .setSystemPort(device.systemPort())
                .amend("appium:chromedriverPort", device.chromePort());
            driver = new AndroidDriver(url, opts);
        } else {
            XCUITestOptions opts = new XCUITestOptions()
                .setUdid(device.udid())
                .setBundleId(device.bundleId())
                .setWdaLocalPort(device.wdaPort());
            driver = new IOSDriver(url, opts);
        }
        TL.set(driver);
    }

    public static void stop() {
        AppiumDriver d = TL.get();
        if (d != null) d.quit();
        TL.remove();
    }
}
```

**Follow-ups & traps**
- "Can two sessions share `systemPort` if they are on different devices?" — No. The port is on the *host* (ADB forward). Two forwards to 8200 collide even if UDIDs differ.
- "One Appium server or one per test?" — One per host (or container), many sessions, unique driver ports. One server per test is process-thrash.
- Trap: `ThreadLocal` but a singleton `Wait` or screen object that cached the first thread's driver.
- Trap: hardcoding `wdaLocalPort=8100` in the options class and then setting `parallel=4` on a Mac.

**Senior/lead angle** — Port and device allocation is a platform service (`DeviceLease`), not something each test file computes. The lease records UDID, ports, and Appium URL into the report so a parallel failure is diagnosable.

**One-liner** — One Appium per host can run many sessions if `systemPort` / `chromedriverPort` / `wdaLocalPort` are unique per device, and every thread has its own `ThreadLocal` driver.

### Q2. Device farms: BrowserStack, Sauce, AWS Device Farm, Firebase Test Lab, in-house

**Interview answer** — I pick a farm by protocol support, device catalog, data residency, and ops cost — not by logo. BrowserStack and Sauce Labs are first-class Appium SaaS: you point the Java client at their hub, upload an app (`bs://`, `sauce-storage:`), and get real devices plus artifacts. AWS Device Farm runs Appium with their test spec and is attractive if the company is already an AWS shop. Firebase Test Lab is excellent for Espresso/XCTest (robo, instrumentation) and only a second-class Appium citizen — I do not pick FTL when Appium is the strategy. In-house is for regulated data, custom accessories, or a cost curve that beat SaaS at steady high utilization — and it is a hardware ops job.

**Deep dive** — Decision matrix I actually use:

- *Appium fidelity*: BrowserStack / Sauce win. They speak W3C, expose logs/video, and document capabilities. Device Farm is fine but more YAML/upload ceremony. FTL wants you to move to instrumentation.
- *Catalog*: need last-2 iOS + Samsung/Xiaomi/Pixel? Check the live list, not the marketing page. iOS real devices are the scarce SKU.
- *Network*: can the device reach our VPN-only QA? SaaS needs allowlists or a private tunnel (`browserstack-local`, Sauce Connect). In-house sits on the VPC. Tunnels are a flake class.
- *Data*: payment-card test PANs, real PII, and customer photos cannot sit on a shared cloud device without a wipe SLO and a legal review. That single constraint has forced in-house labs.
- *Cost*: SaaS is per-minute (parallel minutes add). In-house is capex + people + iOS signing + dead devices. At low utilization SaaS wins; at 20 always-on phones and a full-time lab owner, model it.
- *Lock-in*: wrap the hub URL and app-upload behind a `FarmClient` so tests do not import `bstack:options` everywhere.

**Code**

```java
// Farm switch belongs in the factory, not in tests
URL hub = URI.create(System.getenv("APPIUM_URL")).toURL(); // local or https://hub.browserstack.com/wd/hub
UiAutomator2Options opts = new UiAutomator2Options()
    .setApp(System.getenv("APP_ID")) // /apps/shop.apk or bs://<hash>
    .amend("bstack:options", Map.of(
        "userName", System.getenv("BS_USER"),
        "accessKey", System.getenv("BS_KEY"),
        "deviceName", "Samsung Galaxy S23",
        "osVersion", "13.0",
        "projectName", "shop-android",
        "sessionName", testName,
        "appiumVersion", "2.4.1"));
```

**Follow-ups & traps**
- "FTL vs BrowserStack?" — FTL if the suite is Espresso/robo; BrowserStack/Sauce if the suite is Appium Java. Mixing them without that distinction is a muddled strategy.
- "Is in-house cheaper?" — Only with utilization and a named owner. A closet of iPhones with no wipe policy is more expensive than it looks (Q8).
- Trap: writing tests against one farm's custom capability (`autoAcceptAlerts` flavors) so moving vendors is a rewrite.
- Trap: calling a farm "real devices" and then selecting their iOS Simulator plan to save money without saying so.

**Senior/lead angle** — I run a yearly bake-off on session-create success, queue time, and artifact quality, and I keep the factory farm-agnostic so the bake-off is a config change. Legal and security sign the data flow before I put checkout on the cloud.

**One-liner** — BrowserStack/Sauce for Appium SaaS, Device Farm if you are all-in on AWS, FTL for instrumentation not Appium, in-house when data or accessories demand it — wrap the hub so the suite does not care.

### Q3. How do you run Appium in Jenkins / GitHub Actions?

**Interview answer** — CI is a pipeline that provisions a target, installs a pinned Appium + drivers, installs the AUT, runs JUnit/TestNG, and uploads artifacts. Android can run on a Linux runner with KVM and an AVD, or on a farm (no emulator on the runner). iOS requires a macOS runner or a Mac mini agent with Xcode, signing secrets, and a prebuilt WDA — GitHub's `macos-14` image works for simulators and cannot see a USB iPhone in your office. I keep timeouts honest (session create 3–5 minutes), I fail the job on the test exit code, and I always publish video, page source, logcat/syslog, and the Appium server log.

**Deep dive** — GitHub Actions sketch: Android job on `ubuntu-latest` with KVM enabled (or skip KVM and use a farm), cache AVD snapshots, `npm i -g appium@2.x && appium driver install uiautomator2`, start Appium in the background, boot emulator, `./gradlew test` or `mvn test`. iOS job on `macos-14`: install the same Appium + `xcuitest` driver, import the signing cert into a keychain, boot a simulator, run tests. Jenkins: a Linux agent with Docker/KVM for Android, a labeled `macos` node for iOS, credentials in the store, and a declarative pipeline that stashes Allure + artifacts.

Timeouts: the job timeout must exceed (emulator boot or farm queue) + (session create) + (suite). A 20-minute job timeout on a cold AVD + 40 Appium tests is why nightly is "always cancelled." Artifacts: `actions/upload-artifact` / `archiveArtifacts` on `if: always()`. Do not rely on farm retention as your only copy. Pin everything: Appium, drivers, Xcode, platform image, Java, the APK/IPA hash (Q10).

**Code**

```yaml
# GitHub Actions — Android emulator smoke (KVM) + iOS simulator
jobs:
  android:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "17" }
      - name: Appium 2 + UiAutomator2
        run: |
          npm i -g appium@2.11.0
          appium driver install uiautomator2
          appium --log appium.log &
      - name: AVD
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: mvn -q -Dtest=SmokeIT test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: android-artifacts, path: artifacts/** }

  ios:
    runs-on: macos-14
    timeout-minutes: 75
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: "17" }
      - run: |
          npm i -g appium@2.11.0
          appium driver install xcuitest
          appium --log appium.log &
          xcrun simctl boot "iPhone 15" || true
          mvn -q -Dtest=SmokeIT test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: ios-artifacts, path: artifacts/** }
```

**Follow-ups & traps**
- "Why is iOS on ubuntu?" — It is not. Name macOS or a farm. This is a common take-home trap.
- "Where do signing certs live?" — CI secret store / keychain unlock on the Mac agent, never in the repo. Fastlane `match` is a valid answer if you have used it.
- Trap: starting Appium without `&` / a service wrapper and blocking the job before tests run.
- Trap: no `if: always()` on artifact upload — the run you needed logs from is the one that failed.

**Senior/lead angle** — I treat the workflow file as a product: pinned versions, a smoke job as a required check, a nightly workflow with the farm matrix, and a slack notification that links artifacts. The SDET owns this YAML, not "DevOps will add it later."

**One-liner** — Linux+KVM or a farm for Android, macOS agents for iOS simulators, pinned Appium/drivers, honest job timeouts, and artifacts on `always()` — iOS does not run on ubuntu.

### Q4. Emulators in Docker / GCE — limits

**Interview answer** — Android emulators can run in Docker or on GCE, but they need hardware virtualization (KVM / nested virt), they boot slowly without snapshots, they have weak GPU, and they are still not OEM devices. iOS Simulators cannot run in Linux Docker at all — they need macOS and CoreSimulator. I use Android emulator containers for cheap parallel PR smoke when KVM is available, and I do not promise "Dockerized iOS" or "a Galaxy in a container."

**Deep dive** — Limits that bite: (1) Nested virtualization — many CI VMs (including default GCE and some GitHub runners) do not expose KVM; the emulator falls back to software and a 30-minute boot. (2) GPU / WebGL — WebViews and maps crawl; hybrid checkout flakes on timeouts. (3) Snapshot vs cold boot — snapshots save minutes and go stale after an image bump. (4) Resource — one emulator wants 2–4 vCPU and 4–8 GB; packing four on a 4-core host creates timeout flakes that look like the app. (5) Telephony / camera / GPS are stubs. (6) Licensing / images — you must accept Android SDK licenses in the image build. GCE can offer nested KVM on specific machine families; measure before you bet the pipeline.

iOS: there is no supported "iOS simulator Dockerfile" on Linux. Mac VMs (Anka, AWS EC2 Mac, GitHub macos) are the virtualization story, and they are expensive and scarce. Do not confuse `docker run appium` (just the server) with "the device is in Docker."

**Code**

```bash
# Honest Android-in-Docker: needs --device /dev/kvm
docker run --rm --device /dev/kvm --privileged \
  -e EMULATOR_DEVICE="Samsung Galaxy S10" \
  -p 4723:4723 \
  budtmo/docker-android:emulator_11.0
# This is still an AVD, not a Samsung SoC.
```

**Follow-ups & traps**
- "Can we put iOS in Kubernetes?" — Not as a Linux pod. Mac hardware (or a SaaS farm) is the answer. Candidates who say "yes, Docker" fail this.
- "Why is the emulator 10× slower in GCE than my laptop?" — No KVM / no GPU. Check `/dev/kvm` and the machine family.
- Trap: one container, four emulators, one `systemPort`. Same collision as Q1.
- Trap: treating docker-android as "real device coverage" in a compliance report.

**One-liner** — Android emulators in Docker/GCE need KVM and still lack OEM fidelity; iOS simulators are macOS-only — Dockerize the Appium server if you want, not the iPhone.

### Q5. Test data and accounts on shared devices

**Interview answer** — Shared devices keep everything `noReset` leaves behind: tokens in Keychain/SharedPreferences, carts, WebView cookies, granted/denied permissions, photos in the gallery, notification permission, leftover OTP SMS, and autofilled cards. My default CI profile is "keep the binary, clear app data" (file 01 Q6). Accounts are unique per test (or at least per worker) and created via API; I never hardcode `buyer@shop.test` on a farm. Lab policy is a wipe between tenants — uninstall AUT + Appium helpers, clear photos, revoke permissions — and a factory reset on a schedule or after any payment-prod accident.

**Deep dive** — Failure modes: test A logs in as a seller, test B asserts a buyer empty cart and sees seller SKUs; a denied camera permission from a negative test blinds the returns-upload suite; iOS Keychain items survive a data-clear and auto-login a "logged out" case; a farm device still has yesterday's sandbox Visa in autofill and submits it to a live gateway. Parallelism on one device is impossible to isolate if you also `noReset` for speed — pick one.

Account strategy: API-created users with a unique suffix (`buyer+${thread}+${nonce}@qa.shop.test`), a pool of pre-provisioned users keyed by `parallelIndex` if creation is slow, and teardown that deactivates the user so the next wipe does not matter. Do not reuse a single "automation" account across jobs. Payment instruments are gateway test PANs, never a real card stored on a shared phone.

**Code**

```java
String email = "buyer+" + threadId + "+" + UUID.randomUUID() + "@qa.shop.test";
User user = qaApi.createUser(email);
qaApi.addToCart(user, "SKU-99", 1);
// session options: noReset=false, fullReset=false
// lab wipe script between tenants:
//   adb uninstall com.shop.android
//   adb shell pm clear com.shop.android   # if kept
//   xcrun simctl uninstall booted com.shop.ios
```

**Follow-ups & traps**
- "We use noReset because install is slow." — Then you must unique users *and* accept permission/cart leakage, or you preinstall (Q10) and still data-clear. Speed is not a reason to share `buyer@shop.test`.
- "Factory reset every test?" — Too slow. Reset the *app*; factory-reset the *device* on a cadence or on contamination.
- Trap: a shared loyalty account whose points are the assertion (`points == 100`).
- Trap: leaving customer PII (a real receipt photo) on a cloud device.

**Senior/lead angle** — Write a device hygiene SLO: max minutes since last AUT uninstall, no prod accounts ever, wipe checklist in the farm adapter. Hygiene is part of the platform, not a courtesy script a junior runs on Friday.

**One-liner** — Unique API users, default data-clear (not `noReset`), and a wipe policy for Keychain, photos, and permissions — shared devices remember everything you do not explicitly destroy.

### Q6. Flaky mobile tests — taxonomy

**Interview answer** — I classify mobile flakes before I retry them. The buckets I use: animation / transition (click while the pay button is moving); network (radio, tunnel, 3DS); device heat and resource (farm phone throttling, oversubscribed emulator host); OS dialogs (ATT, permission, update, low power); vendor automation death (WDA crash, UiAutomator2 instrumentation timeout); virtualization (row not bound); context (still in WEBVIEW); and data leaks from shared devices. Retries without a bucket hide the tax. I fix the bucket: disable animations, stub 3DS, pin resources, pre-grant, restart WDA, scroll-to, switch context, isolate data.

**Deep dive** — Animation: `disableWindowAnimation`, test builds with animator duration 0, wait for `pay-now` *stable* (poll `getRect()` twice) not just present. Network: tunnels drop; I fail with the tunnel log, not "element not found." Heat: a real device in a rack after two hours of video playback will skip frames and exceed 30s waits — rotate devices, cap suite length, cool-down. OS dialogs: file 02 Q12, a watcher plus image hygiene. WDA crash: session is dead; retry the *session*, not the click, and capture the crash log. UiAutomator2 "cannot communicate with server" is the Android twin — usually the app crashed or the host killed ADB.

CI-only flakes: slower hosts, empty galleries, first-boot wizards, locale of the farm image, Chrome auto-update. I reproduce with `--workers`/parallel on, farm video, and the source dump. Quarantine is a dated ticket, not a permanent `@Disabled`.

**Code**

```java
// Stability wait — animation bucket
public static void clickStable(AppiumDriver driver, By by) {
    WebElement el = Waits.visible(driver, by, Duration.ofSeconds(20));
    Rectangle a = el.getRect();
    try { Thread.sleep(200); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
    Rectangle b = driver.findElement(by).getRect();
    if (!a.equals(b)) {
        Waits.visible(driver, by, Duration.ofSeconds(5));
    }
    driver.findElement(by).click();
}
```

**Follow-ups & traps**
- "Just set retries=3." — Farm minutes × 3, and you still ship the flake. Retries are for WDA death and farm blips, not for XPath.
- "How do you know it was WDA?" — Session died, syslog shows `WebDriverAgent` crash, next find is invalid session. Different ticket than a missed locator.
- Trap: fixing a data-leak flake by adding `noReset=false` in one test and leaving the class-level `noReset=true`.
- Trap: calling every iOS failure "WDA" so you never look at the assertion.

**One-liner** — Name the bucket — animation, network, heat, OS dialog, WDA/UiAutomator2 death, virtualization, context, data — then fix that layer; retries are not a taxonomy.

### Q7. Capturing artifacts: screenshot, page_source, device logs, video

**Interview answer** — On failure I capture four things before `quit`: a screenshot, `page_source` XML, device logs (logcat or iOS syslog), and the Appium server log; video is recorded for the whole session and kept on failure. Together they answer "what did it look like, was the node in the tree, did the app crash, and what did the driver say." A screenshot alone is how you guess. I hook this in a JUnit extension / TestNG listener so screen objects do not each implement dumps.

**Deep dive** — Screenshot: `driver.getScreenshotAs(OutputType.FILE)` — pixels, including a permission dialog. Source: the tree (file 01 Q14) — proves virtualization and wrong context (a HTML dump means you were in WEBVIEW). Logcat: `adb logcat -d` filtered, or farm APIs; look for `FATAL EXCEPTION` before you debug the locator. iOS: `mobile: getPasteboard` is unrelated; use `idevicesyslog` / farm syslog / `xcrun simctl spawn booted log`. Video: Appium `appium:recordVideo` / farm session video / Android `screenrecord` — keep on fail, discard on pass to save cost. Upload in CI `if: always()` (Q3). Redact: screenshots of payment WebViews can contain PANs; mask or skip video on those tests in prod-like envs.

**Code**

```java
public final class Artifacts implements TestWatcher {
    @Override
    public void testFailed(ExtensionContext ctx, Throwable cause) {
        AppiumDriver driver = Drivers.get();
        if (driver == null) return;
        Path dir = Path.of("artifacts", ctx.getDisplayName());
        try {
            Files.createDirectories(dir);
            Files.write(dir.resolve("screen.png"),
                driver.getScreenshotAs(OutputType.BYTES));
            Files.writeString(dir.resolve("source.xml"), driver.getPageSource());
            Files.writeString(dir.resolve("contexts.txt"),
                String.valueOf(driver.getContextHandles()));
        } catch (Exception e) {
            ctx.publishReportEntry("artifact-error", e.toString());
        }
    }
}
```

**Follow-ups & traps**
- "Farm already has video — why dump source?" — Video is pixels. Source is whether `pay-now` existed. You want both.
- "When do you take the screenshot?" — Before `quit`, in the failure hook. After quit the session is gone.
- Trap: 200MB unfiltered logcat per test. Filter tags and use `-d`.
- Trap: PII in artifacts on a public CI.

**Senior/lead angle** — Artifact schema is part of the platform: every team gets the same `artifacts/<test>/` layout, and the Slack failure bot links those four files. That is how a 15-team org debugs without sitting together.

**One-liner** — Failure hook: screenshot + page_source + device logs + Appium log, video kept on fail — screenshot-only is not a postmortem.

### Q8. Real-device lab operations (lead)

**Interview answer** — A lab is a fleet with an SLO, not a drawer of phones. I own provisioning (UDID registry, iOS profiles, MDM or supervised mode), OS-update policy (staged, not "everyone on iOS night-one"), connectivity (USB hubs with powered lines, Wi-Fi as backup, cable replacement as a weekly chore), hygiene (Q5), and a device-farm SLO: session-create success, queue wait, % devices healthy. Dead devices are a pager, not a Slack shrug. I would rather have 12 healthy phones than 40 that flake.

**Deep dive** — Provisioning: every device has an owner record (model, OS, UDID, cable port, last wipe, last OS). iOS devices must be trusted on the Mac that runs WDA; a reboot loses trust until someone taps. Android wireless debugging drops. USB hubs starve power — symptoms look like disconnect flakes. OS updates: I pin a "current" and a "N-1" image, I update a canary device first, and I block major iOS the week it ships because WDA/Xcode lag. Accessories (readers, BLE scales) live on dedicated devices that never go into the general pool.

SLO examples I would put on a dashboard: 99% session create over 7 days, p95 queue < 2 minutes, < 5% devices marked unhealthy, certificate expiry > 30 days. On-call: a weekly rotation that physically reseats cables. Cloud farms outsource this; you still need an owner for *your* account limits and tunnel. In-house without SLO is how leads get fired after a release week of red nightlies.

**Follow-ups & traps**
- "How many devices?" — Enough for the published matrix at the target parallelism, plus 20% spare. Count is derived, not a wish.
- "MDM vs unsupervised?" — MDM helps wipe and inventory; some MDM profiles break WDA or WebView debug. Prove WDA on a supervised device before you MDM the fleet.
- Trap: letting developers "borrow" a lab iPhone. Inventory dies.
- Trap: one Mac mini USB-chaining 15 iPhones. USB topology is a reliability design.

**Senior/lead angle** — I present the lab as a product with users (SDET teams), SLOs, and a budget line for replacement devices every two OS generations. That framing gets funding; "we need more iPhones" does not.

**One-liner** — Lab ops is inventory, signing, staged OS updates, powered USB, hygiene, and a published SLO — hardware without an owner is just a flake generator.

### Q9. How would you design a mobile test platform for multiple teams?

**Interview answer** — A platform is the shared path to a device: auth to the farm, `DriverFactory` + `DeviceLease`, artifact schema, Appium/driver versions, and CI templates. Product teams own screen objects and domain fixtures. I would ship a Java library (`shop-mobile-test`) and a golden pipeline (`mobile-smoke.yml`) that a team clones, plus a device catalog UI or API that says what is free. Self-serve is the goal: a team can add a checkout spec without opening a ticket for WDA ports.

**Deep dive** — Components: (1) version-pinned Appium runtime (container or Mac image); (2) factory that reads `PLATFORM`, `FARM`, `APP_ID` and returns a ready driver; (3) lease/lock so two repos do not grab one lab UDID; (4) artifact + reporter contract; (5) API client starter for seeding; (6) lint rules (no `DesiredCapabilities`, no `TouchAction`, no `/wd/hub` unless configured); (7) docs: locator standard, reset profiles, "when not to Appium." Multi-tenancy: namespaces on the farm (project names), cost allocation per team, quotas so one nightly cannot starve PR smoke.

What I would not centralize: 200 screen objects for every app. That becomes a bottleneck. The shared library stays boring and stable; product code moves fast. Versioning: semver the library, changelog driver bumps, and do not force every team to the new iOS the day Xcode ships.

**Code**

```text
platform/                    # owned by mobile platform SDET
  driver-factory/            # options, ThreadLocal, farm adapters
  device-lease/              # UDID + ports + lock TTL
  artifacts/                 # TestWatcher
  ci-templates/              # GHA reusable workflow + Jenkins shared lib
  images/                    # Appium 2 + drivers + prebuilt WDA
product-shop-android-tests/  # screens, fixtures, specs
product-shop-ios-tests/      # or the same Java module with flavors
```

**Follow-ups & traps**
- "Monorepo or many repos?" — Platform as a published jar/workflow; product suites in product repos so they release with the app. A monorepo is fine if the org already lives there.
- "How do you prevent forks of the factory?" — Make the official path the easiest path (templates + docs + office hours). Ban farm keys in product repos via secret scanning.
- Trap: a platform team that must review every screen-object PR. That does not scale.
- Trap: each team on a different Appium major. You will not be able to upgrade WDA.

**One-liner** — Shared runtime, factory, lease, artifacts, and CI templates; product teams own screens and data — a platform is the paved road to a device, not a monolith of page objects.

### Q10. App install strategy in CI

**Interview answer** — I pin a build (commit SHA / `bs://` hash / artifact URL) and I distinguish "install once per device lease" from "install every test." Installing the same APK/IPA on every `@BeforeMethod` is the correct isolation for `fullReset` tests and is too slow as a default. The usual CI pattern: preinstall (or farm-upload once) at the start of the job, then per-test data-clear without uninstall. I reinstall when the test is "upgrade from vN" or when the binary changed. I never let the farm reuse "whatever app was last uploaded" without checking the hash.

**Deep dive** — Cost: Android install is seconds to a minute; iOS real-device install plus WDA is worse. Farm upload is once per hash, then devices pull. Preinstall + `noReset=false` (clear data, keep binary) is the default profile. `fullReset` / uninstall is reserved for first-run and upgrade tests. Version pinning: the pipeline that built the app publishes the artifact; the test job consumes that exact artifact. Testing "latest QA" from a moving bucket is how you cannot reproduce a failure.

Sideload vs store: CI uses sideload/QA enterprise/TestFlight-like builds. Store-signed behavior (Play integrity, ATS, inspectable WebView off) may differ — keep one nightly on a build that matches production signing as closely as policy allows. Android `adb install -r` fails on signature mismatch (debug vs release) — that is a pin error, not flaky Appium.

**Code**

```bash
# Job start — once
adb -s "$UDID" install -r -d "$APP_SHA_APK"
# Each test: driver options fullReset=false, noReset=false  → data clear, same binary

# Upgrade test only
adb -s "$UDID" install -r "$APP_OLD"
# ... seed user state ...
adb -s "$UDID" install -r "$APP_NEW"
```

```java
opts.setApp(System.getenv("APP_PINNED_URL")); // not "latest"
opts.setFullReset(false);
opts.setNoReset(false);
opts.setEnforceAppInstall(false); // already installed this job
```

**Follow-ups & traps**
- "Why did Android refuse the install?" — Signature mismatch or downgrade without `-d`. You pointed at a different flavor than last install.
- "Should every test install?" — Only if you need a true first-install or you cannot trust data-clear (iOS Keychain cases → uninstall).
- Trap: two teams uploading different apps to the same farm project name and racing.
- Trap: caching the APK on the runner and forgetting to invalidate on version bump.

**One-liner** — Pin the binary by hash, install once per job, data-clear per test; reinstall only for first-run/upgrade — "latest" is not a version.

### Q11. Combining API setup + Appium UI

**Interview answer** — I do not log in through the UI 500 times. I create the user and cart through the QA API (or issue a deep-link token), I open the app on the screen under test (`theshop://checkout`), and I use Appium for the interaction only a user/OS can break — the pay button, the WebView card form, the confirmation accessibility tree. Login UI has its own thin suite. This is the same arrange/act split as Playwright `storageState`, and it is the difference between a 20-minute nightly and a 3-hour nightly.

**Deep dive** — The stack: a test-support API that is not the public API (it can mint tokens, mark users verified, attach a test PAN, skip 3DS). The app accepts a token via deep link or a debug extra and writes the session the same way a real login would. Appium then never sees the email field. Risks: the debug extra diverges from real login (missed a Keychain write) — mitigated by the thin real-login suite. Parallel safety: each test's API user is unique (Q5). Environment: the device must reach the API; farm tunnels must allow both Appium and the arrange client.

I also assert via API when the UI is a poor oracle (order existed, inventory decremented) and keep one UI assert (`order-confirmation` visible with the id). That catches "API succeeded, UI died."

**Code**

```java
@Test
void paySeededCart() {
    User user = qaApi.createUser();
    qaApi.verifyEmail(user);                 // no OTP UI
    String token = qaApi.sessionToken(user);
    qaApi.addToCart(user, "SKU-99", 1);

    driver.executeScript("mobile: deepLink", Map.of(
        "url", "theshop://auth?token=" + token + "&next=checkout",
        "package", "com.shop.android"));

    String orderId = new CheckoutScreen(driver).payWithTestCard();
    Assertions.assertEquals("PAID", qaApi.order(orderId).status());
    Assertions.assertEquals(orderId, new OrderConfirmationScreen(driver).orderId());
}
```

**Follow-ups & traps**
- "Are you skipping the product?" — I am skipping *setup*, not the risk under test. I can name the suite that still covers login UI.
- "What if deep link auth is disabled in release?" — QA builds keep it; production-like nightly uses a real login once per job to mint a token, then deep-links the rest.
- Trap: API setup against prod and UI against QA — the cart will be empty.
- Trap: putting the token in `page_source` artifacts (it will be, if the URL bar is visible). Prefer extras, not query params, on real devices.

**Senior/lead angle** — This is the first platform investment I make, before a second farm. API + deep link multiplies every subsequent test; more devices without seeding just multiply UI-login flakes.

**One-liner** — Arrange users and carts via API, open the target screen with a tokenized deep link, and spend Appium only on the user-visible risk — do not UI-login hundreds of times.

### Q12. Appium + Selenium Grid 4 (Appium as a node)

**Interview answer** — Grid 4 can route WebDriver sessions to an Appium node the same way it routes Chrome: the node registers a stereotype (`platformName=Android`, `appium:automationName=UiAutomator2`, device UDID) and the client points at the Grid hub. It is useful when you already operate Grid for web and want one entry URL for web + mobile. The operational cost is real: you still manage Appium, drivers, WDA signing, unique ports, and device health — Grid does not replace a farm. I only add Grid when the org already has it and a single hub is a hard requirement; otherwise I use the farm's hub or a thin `DeviceLease` and skip a hop.

**Deep dive** — Mechanics: Appium 2 can register with `--plugin` options or you run `java -jar selenium.jar node` with a config that execs Appium. Stereotypes must include the vendor caps the matcher will see; `relaxed-caps` is often required because Grid is stricter about unknown capabilities than Appium 1 was. Sticky sessions, timeouts, and `newCommandTimeout` need to be aligned or Grid kills a WDA session that is still booting. Video and logcat are not Grid-native — you still implement Q7 on the node.

Cost: a new failure domain (hub lost, matcher rejected caps, node heartbeat), extra latency, and two version matrices (Grid + Appium). Cloud farms *are* grids; building an internal Grid in front of four USB phones is usually worse than those phones plus a lease service. Grid shines when you have many Mac minis already in a Selenium shop and you want central queueing — and you staff it.

**Code**

```text
Client  →  Grid 4 hub :4444
             matcher on platformName + appium:udid + automationName
          → Node (Mac mini)
               Appium 2 :4723
               wdaLocalPort unique per simulator
               XCUITest driver + prebuilt WDA

# Stereotype sketch (node toml / json)
# [node]
# detect-drivers = false
# [[node.driver-configuration]]
# display-name = "pixel-7"
# stereotype = { platformName = "Android", "appium:automationName" = "UiAutomator2", "appium:udid" = "emulator-5554" }
```

**Follow-ups & traps**
- "Does Grid start the emulator?" — No. You provision the device, then register the node. Grid routes; it does not replace AVD/WDA ops.
- "Why did Grid say no slot?" — Stereotype mismatch (missing `appium:` prefix, wrong `platformVersion`). Dump the registered capabilities.
- Trap: putting Grid in front of BrowserStack. You chained two queues. Point the client at one hub.
- Trap: one Grid node advertising four iOS devices with the same `wdaLocalPort`.

**Senior/lead angle** — I would ask "what problem does Grid solve that the farm URL or a lease API does not?" If the answer is "we already have Grid for web and leadership wants one diagram," I will do it with stereotypes and relaxed-caps, and I will budget an owner. If the answer is "so we don't need a farm," Grid will not save them.

**One-liner** — Appium can be a Grid 4 node via capability stereotypes, but Grid only routes — you still own WDA, ports, and devices, so do not add it unless a single hub is worth the extra hop.
