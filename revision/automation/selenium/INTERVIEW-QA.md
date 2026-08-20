# Selenium — interview Q&A

See also [framework-design INTERVIEW-QA](../../framework-design/INTERVIEW-QA.md).

**Q: WebDriver architecture?** — Test → bindings → protocol → driver → browser.

**Q: Explicit vs implicit wait?** — Explicit per condition; implicit global; don’t mix blindly.

**Q: StaleElementReferenceException?** — Re-find; wait for stability; don’t cache WebElement long.

**Q: Handle iframe?** — `switchTo().frame()` → interact → `defaultContent()`.

**Q: Parallel 500 tests?** — RemoteWebDriver grid; isolated data; no static driver; cap sessions.

**Q: Page Factory vs explicit POM?** — Factory `@FindBy` lazy init; explicit locators clearer for maintenance.

**Q: Headless failures not in headed?** — Viewport, GPU, timing — run both in CI.

**Q: When Playwright instead?** — Greenfield, auto-wait, trace; Selenium when existing grid/investment.
