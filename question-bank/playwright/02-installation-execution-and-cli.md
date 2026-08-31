# Installation, Execution & CLI

This file covers the operational layer: installing Playwright, running and filtering tests from the CLI, debugging entry points, and the artifacts — screenshots, videos, traces, reports — that come out of a run. These questions are usually rapid-fire in interviews; crisp, command-accurate answers earn easy points, and knowing the newer flags like `--last-failed` signals you actually work with the tool.

- Q1. How do you install Playwright?
- Q2. How do you run Playwright tests?
- Q3. How do you run a specific test file or a specific test by title?
- Q4. What is headed mode, and what is headless mode?
- Q5. What is debug mode?
- Q6. What is UI mode and when would you use it?
- Q7. What is codegen and what are its limits?
- Q8. How do you tag tests and run subsets?
- Q9. How do you run only tests for one project?
- Q10. How do screenshots work in Playwright?
- Q11. How do videos work in Playwright?
- Q12. How do retries work, and what does "flaky" mean in the report?
- Q13. What reporters are built in, and how do you view the HTML report?
- Q14. What are browser channels, and how do you keep browsers updated?
- Q15. What are --last-failed, --only-changed, and --repeat-each for?

### Q1. How do you install Playwright?

**Interview answer** — For a new project, `npm init playwright@latest` — it scaffolds everything: installs `@playwright/test`, creates `playwright.config.ts`, a `tests` folder with an example spec, an optional GitHub Actions workflow, and downloads the browser binaries. In an existing project it's `npm i -D @playwright/test` followed by `npx playwright install` to fetch the browsers. On CI, especially Linux, you run `npx playwright install --with-deps` so the OS-level libraries the browsers need are installed too.

**Deep dive** — Browsers are not npm dependencies; they're downloaded to a shared cache (`~/.cache/ms-playwright` on Linux, `~/Library/Caches/ms-playwright` on macOS) keyed by browser build version, so multiple projects share them. Each Playwright version pins specific browser builds — upgrading the package requires re-running `install`, which is the #1 cause of "Executable doesn't exist" errors after an upgrade. You can install selectively (`npx playwright install chromium`) to slim CI images, or skip downloads entirely with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` when using the official Docker image (`mcr.microsoft.com/playwright`), which ships browsers and deps pre-baked.

**Follow-ups & traps**
- "Why `--with-deps` on CI?" — It apt-installs shared libraries (fonts, codecs, graphics libs) that headless browsers need on bare Linux images; without it WebKit especially fails to launch.
- "Tests fail after upgrading Playwright with a browser executable error — why?" — New version pins new browser builds; run `npx playwright install` again. Very common screening question.
- Trap: saying browsers come "with npm install" — the postinstall of `@playwright/test` does not fetch browsers; the explicit `install` step (or init scaffold) does.

**One-liner** — `npm init playwright@latest` scaffolds config, tests, and browsers; on CI use `npx playwright install --with-deps`, and re-install browsers after every version bump.

### Q2. How do you run Playwright tests?

**Interview answer** — `npx playwright test` runs the whole suite: the runner reads `playwright.config.ts`, discovers every file matching the `testMatch` pattern — by default `*.spec.ts`/`*.test.ts` style files under the configured `testDir` — and executes them across parallel worker processes for every configured project. Results stream to the configured reporters, with the HTML report available afterward.

**Deep dive** — Discovery is config-driven: `testDir` scopes the search, `testMatch`/`testIgnore` filter files, and each project can override these — which is how you split e2e and API suites in one repo. Execution defaults: files run in parallel across workers (workers default to half the CPU cores locally, 1 on some CI presets unless set), tests within a file run in order in one worker unless `fullyParallel` is on. Everything on the CLI overrides config: `--workers`, `--retries`, `--project`, `--reporter`, `--timeout` — useful for one-off local runs without touching the config.

**Follow-ups & traps**
- "How does Playwright find your tests?" — testDir + testMatch pattern; interviewers check you know it's configurable, not magic.
- "Do tests in one file run in parallel?" — Not by default; that's `fullyParallel: true` or `test.describe.configure({ mode: 'parallel' })`.
- Trap: `npx playwright test login` filters by file path fragment — not by test title; title filtering is `-g`.

**One-liner** — `npx playwright test` discovers specs via testDir/testMatch and runs them in parallel workers per project, with CLI flags overriding anything in the config.

### Q3. How do you run a specific test file or a specific test by title?

**Interview answer** — For a file, pass the path or any fragment of it: `npx playwright test tests/checkout.spec.ts`, or `npx playwright test checkout` which matches any file whose path contains "checkout". You can also target a line: `npx playwright test checkout.spec.ts:42`. For a title, use `-g` / `--grep`: `npx playwright test -g "applies discount code"` runs every test whose full title matches that pattern, across all files.

**Deep dive** — `-g` matches against the full title chain — describe titles plus test title concatenated — and accepts regex, so `-g "@smoke"` and `-g "checkout|payment"` both work; `--grep-invert` excludes. During development, `test.only()` in code narrows execution too — handy in UI mode, dangerous if committed, which is why `forbidOnly: !!process.env.CI` in config makes CI fail if `.only` slips into a PR. Line-number targeting is what editor integrations (VS Code extension) use under the hood for "run this test."

**Follow-ups & traps**
- "How do you stop a committed `.only` from silently shrinking CI?" — `forbidOnly` in config; a favorite process-awareness follow-up.
- Trap: quoting issues — `-g` takes a regex, so titles with parentheses or `$` need escaping; mention it and you sound like you've been bitten.

**One-liner** — File by path fragment or `file.spec.ts:line`, title by regex with `-g`, and `forbidOnly` on CI so a stray `.only` can't silently skip the suite.

### Q4. What is headed mode, and what is headless mode?

**Interview answer** — Headless means the browser runs without any visible window — the default, faster, and required on display-less CI machines. Headed mode, enabled with `--headed` or `headless: false`, opens a real browser window so you can watch the test execute; I use it locally when I want to see what the test sees. Functionally they run the same engine, and with Chromium's new headless mode it's literally the same browser binary, so behavioral differences between the two are mostly gone.

**Deep dive** — Historically headless Chromium was a separate implementation with real behavioral gaps (fonts, viewport, some APIs), which caused "passes headed, fails headless" bugs. Chromium's new headless mode — the one modern Playwright versions use for the `chromium` channel — is the full browser running unpainted, closing most of that gap; the old implementation survives as a separate `chromium-headless-shell` optimized for speed. Residual differences to name if probed: no GPU rendering path in some environments (screenshot anti-aliasing diffs), viewport defaults, and window-focus-dependent behavior. On CI you can still run headed inside `xvfb-run` when a stubborn discrepancy needs reproducing.

**Follow-ups & traps**
- "A test passes headed but fails headless — first suspects?" — Viewport/responsive breakpoints, focus/hover-dependent UI, animations/timing, missing fonts on CI. Then trace it rather than guess.
- Trap: "headless is a different, lighter browser" — outdated for Chromium; it's the same binary without a window in new headless.

**One-liner** — Headless is the same engine without a window — default and CI-friendly; `--headed` shows the window locally, and new headless Chromium erased most old behavioral gaps.

### Q5. What is debug mode?

**Interview answer** — `npx playwright test --debug` runs headed with the Playwright Inspector attached: execution pauses before each action, you can step through, and the Inspector shows the actionability log and lets you live-edit locators against the page. It's equivalent to setting `PWDEBUG=1`, which also disables timeouts so a paused test doesn't die under you. For a targeted breakpoint I drop `await page.pause()` in the test and run headed.

**Deep dive** — `PWDEBUG=1` sets headed mode, workers to 1, timeout to 0, and opens the Inspector; `PWDEBUG=console` instead exposes a `playwright` object in the browser DevTools console for probing locators. `page.pause()` is the surgical version — full speed until the pause point. Debug mode's role has narrowed since UI mode and trace viewer arrived: stepping forward through a live run is Inspector territory, while "why did it fail" is usually answered faster by a trace, which can inspect the past. Deeper debugging workflows (traces, verbose logs) are covered in the debugging file.

**Follow-ups & traps**
- "Difference between `--debug` and `page.pause()`?" — Global step-through from the start vs breakpoint at a chosen line.
- Trap: not knowing that debug mode forces a single worker and zeroes timeouts — behavior differences with parallel runs can hide race bugs while debugging.

**One-liner** — `--debug`/`PWDEBUG=1` pauses before every action with the Inspector attached; `page.pause()` is the precision breakpoint version.

### Q6. What is UI mode and when would you use it?

**Interview answer** — `npx playwright test --ui` opens an interactive app that lists all tests, runs them on demand, and shows a full trace-style timeline for each run — DOM snapshots per action, network, console, and a locator picker — plus watch mode that reruns tests on file save. It's my default development loop: write a test, watch it rerun on save, and time-travel through any failure without adding a single console.log.

**Deep dive** — UI mode is essentially the trace viewer wrapped around a live runner: every action records before/after DOM snapshots you can hover and inspect with real DevTools, because snapshots are rendered HTML, not screenshots. The locator picker lets you click an element in a snapshot and get the recommended locator — faster than codegen for fixing selectors. Caveats worth knowing: it runs tests through the same runner (so fixtures and projects apply), you can filter by project/tag/file, and it's a local development tool — on CI the equivalent artifact is a recorded trace viewed after the fact.

**Follow-ups & traps**
- "UI mode vs debug mode?" — UI mode is retrospective time-travel plus watch loop; debug mode is live step-through. Senior answer: UI mode for building tests, traces for CI failures, Inspector rarely.
- Trap: calling it "the HTML report" — the HTML report is a static artifact; UI mode is interactive and runs tests.

**One-liner** — `--ui` is the interactive dev loop: run, watch, time-travel through DOM snapshots, and pick locators — the fastest way to author and fix tests locally.

### Q7. What is codegen and what are its limits?

**Interview answer** — `npx playwright codegen <url>` opens a browser and records your interactions as Playwright code, generating modern locators — it prefers `getByRole`, `getByLabel`, `getByText` — and can also emulate devices or save authenticated `storageState`. I treat it as a starting point and a locator discovery tool, not a way to produce final tests: the output is a linear script with no assertions beyond what you explicitly record, no page objects, no fixtures, and no design.

**Deep dive** — The recorder instruments the page and applies the same locator-priority heuristics as the locator picker, so its selector choices are genuinely good — often better than what a beginner writes by hand. What it cannot produce: abstraction (POM/fixtures), data-driven structure, network mocking, or intelligent waits beyond auto-waiting — and recorded flows encode incidental details (exact clicks on decorative elements) that make tests brittle. Practical uses that make you sound experienced: recording against an authenticated session via `--load-storage`, quickly answering "what locator would Playwright recommend for this element," and onboarding manual testers to locator syntax.

**Follow-ups & traps**
- "Would you commit codegen output as-is?" — No: extract locators into page objects, add web-first assertions, remove incidental steps. Interviewers ask this to detect record-and-playback habits.
- "Does codegen add assertions?" — Only if you use its assertion toolbar (visibility/text/value); it doesn't infer them.
- Trap: dismissing codegen entirely — the locator-suggestion aspect is genuinely useful; blanket disdain sounds like inexperience too.

**One-liner** — Codegen records flows into role-based-locator code — excellent for locator discovery and scaffolding, never a substitute for designed tests with assertions and structure.

### Q8. How do you tag tests and run subsets?

**Interview answer** — Two supported styles: put `@smoke`-style tags in the test title, or — the modern way — pass a details object: `test('checkout works', { tag: '@smoke' }, async ({ page }) => {...})`. Then filter at the CLI with `--grep @smoke` to run the subset, or `--grep-invert @slow` to exclude one. Tags can also go on `test.describe` blocks to cover a group, and the HTML report lets you filter by tag.

**Deep dive** — Tags must start with `@` when using the `tag` property, and both styles are matched by `--grep` against the full title (the tag property is appended to the effective title for matching). Multiple tags compose: `{ tag: ['@smoke', '@checkout'] }`; grep with regex alternation `--grep "@smoke|@critical"` for OR, and `--grep "(?=.*@smoke)(?=.*@checkout)"` for AND. Adjacent feature interviewers accept in the same answer: `annotations` (`{ type: 'issue', description: 'JIRA-123' }`) for report metadata that isn't a filter. Tag taxonomies pay off in CI: a fast `@smoke` gate on PRs, full regression nightly — driven purely by grep, no separate suites to maintain.

**Code**

```ts
test('guest checkout with saved card', { tag: ['@smoke', '@checkout'] }, async ({ page }) => {
  // ...
});

// CI: npx playwright test --grep @smoke
// Exclude quarantined tests: npx playwright test --grep-invert @quarantine
```

**Follow-ups & traps**
- "Tags vs projects for suites?" — Tags slice by test identity (smoke/regression); projects slice by configuration (browser, env). Mixing them up is common.
- Trap: inventing `test.tag()` or a config-level tag registry — the mechanism is title/`tag` property + grep, nothing more.

**One-liner** — Tag via title or the `{ tag: '@smoke' }` property, filter with `--grep`/`--grep-invert` — tags select what runs, projects select how it runs.

### Q9. How do you run only tests for one project?

**Interview answer** — `npx playwright test --project=chromium` runs only that project from the config, and the flag repeats for several: `--project=chromium --project=webkit`. Without the flag, every project runs — so a 100-test suite with three browser projects executes 300 tests. Locally I usually develop against one project and let CI run the full matrix.

**Deep dive** — Projects are named config bundles — browser/device via `use`, but also different `testDir`s, timeouts, or base URLs — so `--project` is also how you select "api" vs "e2e" suites in a monorepo config. One nuance: project `dependencies` (like a `setup` project that logs in and saves storage state) still run when you select a dependent project, which is desirable; use `--no-deps` to skip them deliberately.

**Follow-ups & traps**
- "How does the same test run on three browsers?" — Projects × tests is the execution matrix; the runner instantiates the test once per project with that project's fixtures.
- Trap: forgetting that no `--project` flag means all projects — the classic "why did my run take 3× as long" moment.

**One-liner** — `--project=chromium` selects one named config bundle from the matrix; omit it and every project runs, dependencies included.

### Q10. How do screenshots work in Playwright?

**Interview answer** — Two layers. On demand: `page.screenshot({ path })` for the viewport or `{ fullPage: true }` for the whole page, and `locator.screenshot()` for a single element. Automatically: the `screenshot` option in config — I set `'only-on-failure'` — makes the runner capture a final-state screenshot for every failed test and attach it to the report, with zero test code.

**Deep dive** — Config values are `'off'`, `'on'`, and `'only-on-failure'` (plus `'on-first-failure'` to skip retries' duplicates); artifacts land in each test's output directory under `test-results/` and attach to the HTML report. Manual screenshots support `clip` regions, `mask: [locator]` to black out dynamic content, `omitBackground`, and quality/type options — masking matters when screenshots feed visual comparison via `expect(page).toHaveScreenshot()`, which is a separate snapshot-testing feature with its own baseline files and diffing. In practice failure screenshots are the entry-level artifact; traces supersede them for actual debugging since a screenshot shows one final frame while a trace shows the whole timeline.

**Code**

```ts
// config: use: { screenshot: 'only-on-failure' }
await page.getByTestId('order-summary').screenshot({ path: 'summary.png' });
await expect(page).toHaveScreenshot('checkout.png', { mask: [page.getByTestId('cart-total')] });
```

**Follow-ups & traps**
- "Screenshot on failure without config?" — In `afterEach` via `testInfo.status`, but the config option exists precisely so you don't hand-roll this; saying "I write an afterEach hook" first signals not knowing the platform.
- "Screenshot vs visual testing?" — `page.screenshot` captures; `toHaveScreenshot` compares against a committed baseline with thresholds. Different features.

**One-liner** — `page`/`locator.screenshot()` on demand, `screenshot: 'only-on-failure'` in config for automatic failure evidence, and `toHaveScreenshot()` when you want actual visual regression.

### Q11. How do videos work in Playwright?

**Interview answer** — Set the `video` option in config — `'retain-on-failure'` is the sensible default: every test records, but videos of passing tests are deleted, so you keep evidence only where it matters. Recording is per browser context, files are WebM in the test's `test-results/` folder, and they're attached to the HTML report automatically.

**Deep dive** — Values: `'off'`, `'on'`, `'retain-on-failure'`, `'on-first-retry'` (record only the first retry — cheapest useful setting when retries are enabled). Because recording hooks the context, custom-created contexts need `recordVideo: { dir, size }` passed explicitly — a real gotcha in multi-context tests. Videos cost noticeable CPU and disk on CI, and they show what happened without the why; a trace includes screencast frames plus DOM snapshots, network, and the action log, so most teams that adopt tracing keep video off or on-first-retry only.

**Follow-ups & traps**
- "Video vs trace — which do you keep on CI?" — Trace on-first-retry as primary; video optional. Interviewers use this to gauge whether you actually debug CI failures.
- Trap: expecting video for a `browser.newContext()` you created manually without `recordVideo` — the config option applies to the fixture-provided context.
- "Where's the video for a passing test with retain-on-failure?" — Deleted by design; recorded, then discarded on pass.

**One-liner** — `video: 'retain-on-failure'` records every test and keeps only failures — but traces usually beat videos for debugging, so many teams run video off or on-first-retry.

### Q12. How do retries work, and what does "flaky" mean in the report?

**Interview answer** — `retries: 2` in config or `--retries=2` on the CLI makes the runner re-execute a failed test up to that many extra times, each retry in a completely fresh worker process and context. A test that fails first and passes on a retry is reported as "flaky" — the run stays green, but the report flags it. I enable retries on CI only (`process.env.CI ? 2 : 0`) and pair them with `trace: 'on-first-retry'` so every retry produces a debugging artifact.

**Deep dive** — Statuses in the report: passed, failed (all attempts failed), flaky (eventually passed), skipped — and "flaky" is the signal to mine, not to ignore: a rising flaky count with a green pipeline is silent debt. Retries interact with hooks and state: each attempt gets fresh fixtures and context, and `testInfo.retry` exposes the attempt number for conditional logic (e.g., extra logging on retries). Serial-mode describes retry as a unit — a failure retries the whole group. `test.fail()`-marked tests don't retry the way you might guess since failing is their expected outcome.

**Follow-ups & traps**
- "Are retries a fix for flakiness?" — No — a containment mechanism plus detection signal; fixes are synchronization and isolation improvements. This is the follow-up that matters; "just add retries" is the wrong-answer trap.
- "Do retries share state with the failed attempt?" — No; fresh worker/context per attempt — which is why order-dependent tests can pass on retry and mask real bugs.
- "How do you find flaky tests proactively?" — Report tracking over time plus `--repeat-each` hunting (Q15).

**Senior/lead angle** — Treat flaky-rate as a suite KPI: report it per test over time (JSON reporter into a dashboard), quarantine via tag, fix or delete. Retries keep the pipeline usable while the real work happens.

**One-liner** — Retries rerun failures in fresh workers; "flaky" means passed-on-retry — a green build with a warning label that should feed a fix queue, not be the fix.

### Q13. What reporters are built in, and how do you view the HTML report?

**Interview answer** — Built-in: `list` (default locally — one line per test), `line` (compact single updating line), `dot` (minimal dots), `html` (rich interactive report), `junit` (XML for CI systems), `json` (machine-readable results), `blob` (raw payload for merging sharded runs), plus `github` annotations on GitHub Actions. They stack: I typically run `[['list'], ['html'], ['junit', {...}]]`. `npx playwright show-report` serves the last HTML report; on failure locally it usually auto-opens.

**Deep dive** — The HTML report is the daily driver: filterable by status/project/tag, with attachments (screenshots, videos, traces) inline — clicking a trace opens the trace viewer in the browser. `junit` exists for CI dashboards (Jenkins, Azure DevOps) that ingest XML; `json` feeds custom analytics like flaky-rate tracking. `blob` is the one that shows operational maturity: when you shard across N machines (`--shard=1/4`), each shard emits a blob, and `npx playwright merge-reports` combines them into one HTML report — without blob you get four disconnected reports. Custom reporters implement the `Reporter` interface (`onTestEnd`, `onEnd`) for Slack notifications or database sinks.

**Follow-ups & traps**
- "How do you get ONE report from a sharded CI run?" — blob reporter per shard + `merge-reports`. This exact question filters people who've run Playwright at scale.
- "Where do third-party reports like Allure fit?" — Community reporters plug into the same interface; fine, but know the built-ins first.
- Trap: thinking `show-report` reruns tests — it just serves the static artifact from `playwright-report/`.

**One-liner** — list/line/dot for terminals, html for humans, junit/json for machines, blob + merge-reports for sharded CI — reporters stack, and `show-report` serves the last HTML report.

### Q14. What are browser channels, and how do you keep browsers updated?

**Interview answer** — By default Playwright runs its own bundled builds — Chromium, Firefox, WebKit — pinned to the Playwright version. Channels let a Chromium project run a branded, OS-installed browser instead: `channel: 'chrome'` or `'msedge'` (plus beta/dev variants) in the project's `use`. Updating is coupled to the package: bump `@playwright/test`, run `npx playwright install`, and you're on the new pinned builds; branded channels update via the OS/browser's own updater.

**Deep dive** — When branded channels earn their place: media playback needing licensed codecs missing from open-source Chromium, enterprise policies that mandate testing "real Chrome/Edge," and reproducing user-reported browser-specific bugs. The trade-off is determinism — bundled builds are identical for every developer and CI run; a branded channel is whatever version that machine has, so CI and laptops can diverge. There's no `channel` for Firefox/WebKit — those are only available as Playwright's patched builds, since branded Firefox/Safari don't expose the needed protocol. Keeping current matters more than in Selenium: each Playwright release pins browser versions, so a stale Playwright means testing stale browsers.

**Follow-ups & traps**
- "Is Playwright's Chromium the same as Chrome?" — Same engine, but open-source Chromium: no proprietary codecs, no Google services. Knowing why that matters for media tests is a differentiator.
- Trap: `channel: 'safari'` — doesn't exist; WebKit coverage is always the patched build.
- "How often do you upgrade?" — Reasonable answer: track minor releases (~monthly), upgrade promptly with a pinned version and a full CI pass, since browser builds move with it.

**One-liner** — Bundled pinned browsers by default; `channel: 'chrome' | 'msedge'` runs branded builds when codecs or policy demand it — and upgrading Playwright is how browsers stay current.

### Q15. What are --last-failed, --only-changed, and --repeat-each for?

**Interview answer** — Three loop-tighteners. `--last-failed` reruns only the tests that failed in the previous run — my first command after a fix. `--only-changed` runs only test files affected by uncommitted git changes (or changes against a ref like `--only-changed=main`), for a fast pre-push check. `--repeat-each=20` runs every selected test that many times — the flakiness hunt tool: a test that passes 1× but fails 3-of-20 has a race, and repeating locally reproduces it deterministically enough to trace.

**Deep dive** — `--last-failed` reads the previous run's results from `test-results/.last-run.json`, so it needs a prior run in the same directory and reflects that run only. `--only-changed` uses git to map changed files to test files — it catches edited specs and their transitive local imports, but it cannot know that an application-code change affects a test if there's no import relationship (typical for e2e hitting a deployed app), so it's a local convenience, not a CI safety mechanism. Flake hunting combos worth naming: `--repeat-each=20 --workers=4` to add parallel-pressure realism, `--retries=0` so every failure is visible, and pairing with `trace: 'on'` to capture each failure.

**Follow-ups & traps**
- "Would you use --only-changed as your CI test-selection strategy?" — No for e2e — no import graph from app code to tests; PR gate should be tag-based smoke plus full runs on merge/nightly.
- "How do you prove a flake fix worked?" — `--repeat-each` before and after; "it passed once" proves nothing. Interviewers reward this instinct.
- Trap: not knowing these exist — they're the flags that distinguish daily users from tutorial-level candidates.

**One-liner** — `--last-failed` reruns yesterday's failures, `--only-changed` runs tests touched by your diff, `--repeat-each` beats on a test until a race reveals itself.
