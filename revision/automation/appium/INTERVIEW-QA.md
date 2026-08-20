# Appium — interview Q&A

**Q: Appium architecture?** — Client → server → platform driver → device.

**Q: Native vs WebView?** — `getContextHandles()` switch; different locator strategies.

**Q: iOS real device challenges?** — Signing, WDA, trust dialogs, flaky WDA restart.

**Q: Android vs iOS locator strategy?** — accessibility id preferred; platform-specific XML.

**Q: Parallel mobile?** — One session/device; cloud scale; queue management.

**Q: App reset strategies?** — Full reinstall vs clear data vs deep link — trade speed vs isolation.

**Q: Flaky mobile causes?** — Animations, keyboard, permissions, network, toast overlays.

**Q: Appium vs Espresso/XCUITest native?** — Cross-platform vs faster native; who owns tests.

Behavioral: mobile release war room story from [BEHAVIORAL-QA](../../framework-design/BEHAVIORAL-QA.md).
