# Playwright — interview Q&A

**Q: Browser vs Context vs Page?** — Process; isolated session; tab. Parallel = separate contexts.

**Q: Why Locator not ElementHandle?** — Auto re-resolve; less stale.

**Q: Debug flaky CI test?** — Trace viewer, video, compare env, network idle, stabilize locators.

**Q: Mock API in UI test?** — `page.route()` fulfill JSON; or test API separately.

**Q: Auth without login every test?** — `storageState` from setup project.

**Q: Playwright vs Selenium?** — Auto-wait, trace, speed, modern API vs legacy grid investment.

**Q: Shard 2000 tests?** — Multiple CI jobs `--shard=1/4`; merge reports.

**Q: Fixture design?** — `page` fixture yields fresh context; extend for logged-in `adminPage`.

**Q: Network interception limits?** — CORS, websockets — know when to use APIRequestContext instead.

Framework whiteboard: [framework-design](../../framework-design/INTERVIEW-QA.md)
