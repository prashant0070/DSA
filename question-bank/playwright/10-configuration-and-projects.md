# Configuration & Projects (playwright.config.ts)

The config file is where a Playwright suite's operational behavior lives — parallelism, retries, artifacts, environments — and interviewers use it to gauge whether you've actually run a suite in CI or only locally. This file covers the config surface, the `use` inheritance chain, projects and dependencies, and the timeout hierarchy.

- Q1. What is `playwright.config.ts`?
- Q2. "What configurations have you used?" — model answer
- Q3. The `use` object and its inheritance chain
- Q4. What are Playwright projects?
- Q5. Configuring different browsers and devices via projects
- Q6. Project dependencies (setup/teardown patterns)
- Q7. Configuring different environments (QA/staging/prod-like)
- Q8. Configuring retries and retry semantics
- Q9. Configuring workers
- Q10. Screenshots, videos, and traces — and why those defaults
- Q11. The timeout hierarchy
- Q12. globalSetup/globalTeardown vs setup projects
- Q13. The `webServer` option
- Q14. `baseURL` and relative navigation
- Q15. `testIdAttribute`, `outputDir`, `snapshotPathTemplate`

### Q1. What is playwright.config.ts?

**Interview answer** — It's the single declarative control center for the test runner: where tests live, how parallel they run, what happens on failure, which browsers and options every test gets, and what artifacts are collected. It exports a `defineConfig(...)` object, and almost everything in it can be layered — global defaults, per-project overrides, and per-file `test.use()` on top.

**Deep dive** — The mental split is runner-level options (top level: `testDir`, `workers`, `retries`, `reporter`, `projects`, `webServer`) versus test-facing options (inside `use`: everything that configures the browser context and fixtures — `baseURL`, `trace`, `viewport`, `storageState`). `defineConfig` exists for typing and merge semantics. The config is also environment-aware by design — `process.env.CI` ternaries are idiomatic, not a hack — so one file serves local dev and CI with different behavior.

**Code**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',                          // where specs live
  fullyParallel: true,                         // parallelize within files too
  forbidOnly: !!process.env.CI,                // fail CI if test.only leaks in
  retries: process.env.CI ? 2 : 0,             // retry only in CI
  workers: process.env.CI ? 4 : undefined,     // cap CI; default (cores/2) locally
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',                   // rich debugging, cheap when green
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run start:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Follow-ups & traps**
- "Why `forbidOnly` only in CI?" — `test.only` is a normal local debugging tool; in CI it silently skips the rest of the suite, so it must hard-fail there.
- "What's the difference between top-level options and `use`?" — runner behavior vs context/fixture options; muddling them ("set retries inside use") signals config unfamiliarity.
- Wrong answer: describing the config as "capabilities like Selenium" — it configures the runner and fixtures, not a remote driver session.

**One-liner** — `playwright.config.ts` is the runner's declarative control center: discovery, parallelism, failure policy, artifacts, and layered per-project options.

### Q2. What configurations have you used? (model answer)

**Interview answer** — A production-grade shape: `fullyParallel` with CI-capped workers; CI-only retries of 2; `forbidOnly` in CI; trace on first retry and screenshots on failure; a `setup` project doing API login and saving `storageState`; browser projects for chromium plus one mobile viewport, all depending on setup; `baseURL` from an env var so one config serves QA and staging; `webServer` locally so devs don't hand-start the app; and reporters split — list plus HTML locally, HTML plus JUnit/GitHub annotations in CI.

**Deep dive** — What makes this answer land is the *because* attached to each choice: retries CI-only because local retries hide flakes you should fix at your desk; traces on-first-retry because always-on tracing costs measurable runtime and disk; a mobile project because viewport bugs are cheap to catch this way; JUnit because the CI system ingests it for test-history dashboards. Be ready for "what would you change at 10× scale" — answer: sharding across machines (`--shard`), blob reports merged into one HTML report, and stricter per-project `testMatch` boundaries so teams own their slices.

**Follow-ups & traps**
- "Why not retries locally?" — you want to *see* flakiness while developing, not paper over it; CI retries exist to keep unrelated PRs unblocked.
- "Why cap workers in CI but not locally?" — CI runners are usually smaller than dev machines; the local default (half the cores) is already sensible.
- Trap: reciting options without rationale — this question is entirely about the reasons; the option list is table stakes.

**One-liner** — A production config is a set of justified trade-offs — CI-only retries, failure-only artifacts, setup-project auth, env-var baseURL — not a list of options.

### Q3. Explain the `use` object and its inheritance chain.

**Interview answer** — `use` holds the test-facing options — `baseURL`, `viewport`, `locale`, `trace`, `storageState`, `testIdAttribute`, custom fixture options — and it resolves through a strict override chain: global `use` sets defaults, each project's `use` overrides them for that project, and `test.use()` in a spec file overrides both for that file or describe block. Most specific wins, per option, not per object — a project overriding `viewport` still inherits the global `baseURL`.

**Deep dive** — Under the hood these are option fixtures, which is why the same names work at every level and why custom options you define with `[default, { option: true }]` join the same chain automatically. The per-key merge is the practical detail people miss: overriding is not replacing the whole `use` object. `test.use()` has restrictions worth knowing — it applies at file/describe level statically; changing an option for a single test means a separate describe with its own `use`, and some things (like `browserName` mid-file) have caveats. Debugging tip: when an option "mysteriously" doesn't apply, walk the chain top-down — a forgotten `test.use({ storageState: ... })` in a shared helper file is a classic culprit.

**Code**

```ts
// Global default
use: { baseURL: 'https://qa.shop.example.com', locale: 'en-US', trace: 'on-first-retry' },
projects: [
  // Project override: different locale, everything else inherited
  { name: 'de-desktop', use: { ...devices['Desktop Chrome'], locale: 'de-DE' } },
]
```

```ts
// File-level override: this file runs logged out, still inherits baseURL/locale
test.use({ storageState: { cookies: [], origins: [] } });
```

**Follow-ups & traps**
- "Project sets `viewport`, global sets `baseURL` — what does a test get?" — both; merge is per option key. Answering "the project's whole use object wins" is the common error.
- "Can `test.use()` apply to just one test?" — wrap it in its own `describe`; `test.use` scopes to file or describe, not individual tests.
- Wrong answer: mutating options at runtime inside a test — options configure fixture *creation*; the context already exists.

**One-liner** — `use` options resolve global → project → `test.use()`, merged per key with the most specific winning — because every option is really an option fixture.

### Q4. What are Playwright projects?

**Interview answer** — A project is one named combination of "which tests" and "with what options" — the mechanism for running the same suite across multiple configurations: browsers, device profiles, environments, locales, personas. Projects also express orchestration: setup/teardown projects with `dependencies` sequence work like "log in before everything". Each project × test pair is an independent test instance with its own retries, artifacts, and report entry.

**Deep dive** — The multiplication model is the key intuition: N tests × M projects = N×M executions, each independently parallelizable and reportable — which is both the power (free cross-browser coverage) and the cost (CI minutes multiply; teams often run chromium-only on PRs and the full matrix nightly). Projects can also *partition* rather than multiply, via `testMatch`/`testIgnore` — separating smoke from regression, or API tests from UI tests, each slice with its own options and retry policy. `--project=name` selects at runtime, and dependencies still pull in prerequisite projects automatically.

**Code**

```ts
projects: [
  { name: 'smoke', testMatch: /smoke\/.*\.spec\.ts/, retries: 0 },
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  { name: 'api', testMatch: /api\/.*\.spec\.ts/ },   // no browser options needed
]
```

**Follow-ups & traps**
- "Are projects parallel with each other?" — yes, by default workers pull from all projects unless dependencies impose ordering.
- "Projects vs separate config files?" — projects share one report, one command, and support dependencies; separate configs are for genuinely unrelated suites.
- Wrong answer: "projects = browsers" — browsers are one use case; envs, personas, slices, and setup orchestration are the rest.

**One-liner** — A project is tests × options as a named unit — multiplying for coverage matrices, partitioning for suite slices, and sequencing via dependencies.

### Q5. How do you configure different browsers via projects?

**Interview answer** — One project per engine, spreading a device descriptor into `use`: `devices['Desktop Chrome']`, `devices['Desktop Firefox']`, `devices['Desktop Safari']`, and mobile profiles like `devices['iPhone 15']` for emulated mobile. Every test then runs per configured browser with no test-code changes, and `--project=firefox` selects one at runtime.

**Deep dive** — Playwright tests engines — Chromium, Firefox, WebKit — not retail brands; WebKit coverage approximates Safari, and `devices['iPhone 15']` is emulation (viewport, touch, UA, device scale factor on desktop WebKit), not an iOS simulator — an honesty point that scores well. Device descriptors matter beyond browsers: they set `isMobile`, `hasTouch`, and viewport, which your responsive code paths and the `isMobile` fixture react to. Branded channels exist (`channel: 'chrome'`, `'msedge'`) for the rare bug that reproduces only in retail Chrome. Cost strategy belongs in this answer: full matrix nightly, chromium on every PR is the common compromise.

**Code**

```ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  { name: 'edge-branded', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
]
```

**Follow-ups & traps**
- "Is `iPhone 15` a real device?" — no, emulation; real-device quirks (iOS rendering, gestures) still need device labs. Claiming it's a simulator is the trap.
- "Why spread (`...devices[...]`) instead of assigning?" — descriptors are option bundles; spreading lets you override individual keys after.
- "Do you run all browsers on every commit?" — discuss the cost trade; "always everything" ignores CI economics.

**One-liner** — One project per engine spreading a `devices` descriptor — desktop Chromium/Firefox/WebKit plus emulated mobile profiles — selected with `--project`.

### Q6. How do project dependencies work?

**Interview answer** — `dependencies: ['setup']` makes a project run only after the named project completes successfully — the backbone of the auth pattern: a setup project logs in and saves state, browser projects depend on it. There's a mirror `teardown` option on the setup project pointing at a cleanup project that runs after dependents finish. Crucially, dependencies survive filtering: `--project=chromium` still runs `setup` first, so you can't accidentally skip prerequisites.

**Deep dive** — Dependencies form a DAG the runner schedules: independent branches still parallelize, and a failed dependency skips its dependents (reported as skipped, not failed — worth knowing when reading reports). The `teardown` pairing (`{ name: 'setup', teardown: 'cleanup' }`) gives symmetric resource lifecycle — seed a tenant before everything, delete it after everything — while keeping both phases inside the runner with traces and report entries. Dependencies also gate UI mode and watch behavior sensibly (setup runs when needed). Anti-pattern to name: long dependency chains that serialize the suite — dependencies are for prerequisites, not for ordering tests that should be independent.

**Code**

```ts
projects: [
  { name: 'setup', testMatch: /global\.setup\.ts/, teardown: 'cleanup' },
  { name: 'cleanup', testMatch: /global\.teardown\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    dependencies: ['setup'],
  },
  {
    name: 'mobile-safari',
    use: { ...devices['iPhone 15'], storageState: '.auth/user.json' },
    dependencies: ['setup'],
  },
]
```

**Follow-ups & traps**
- "What happens to chromium tests if setup fails?" — skipped, not failed; a report full of skips means "check the dependency", which surprises people.
- "Does `--project=chromium` skip setup?" — no; dependencies are always honored. This is a deliberate probe.
- Wrong answer: chaining projects to force test ordering — tests should be order-independent; dependencies are for shared prerequisites.

**One-liner** — Dependencies build a project DAG — setup first, dependents after, teardown at the end — and they run even when you filter with `--project`.

### Q7. How do you configure different environments (QA, staging, prod-like)?

**Interview answer** — One config, parameterized by environment variables: `BASE_URL` (plus credentials and API URLs) read via `process.env`, with dotenv loading `.env.qa`/`.env.staging` files locally and the CI pipeline injecting the same variables from its secret store. I avoid a config file per environment — configs drift apart silently, and the env-var approach keeps a single source of truth where only data varies, never runner behavior.

**Deep dive** — The drift argument is the substance: with `playwright.qa.config.ts` and `playwright.staging.config.ts`, someone bumps retries in one and not the other, and now environment comparisons are confounded by runner differences. Env vars confine variation to values. Implementation details that show practice: load dotenv at the top of the config with a file chosen by an `ENV` variable; validate required variables and fail fast with a clear message; keep secrets out of `.env` files that get committed (only `.env.example` is committed). Projects can complement this for *behavioral* env differences — e.g., a prod-like project that ignores destructive test files via `testIgnore` — but the URL/creds axis stays in env vars. `defineConfig` merging or a small config factory covers the rare case where envs genuinely need different runner settings.

**Code**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.ENV ?? 'qa'}`) });

if (!process.env.BASE_URL) throw new Error(`BASE_URL missing — check .env.${process.env.ENV}`);

export default defineConfig({
  use: { baseURL: process.env.BASE_URL },
  projects: [
    // prod-like runs read-only tests only
    ...(process.env.ENV === 'prod-like'
      ? [{ name: 'smoke-readonly', testMatch: /smoke\/.*\.spec\.ts/ }]
      : [{ name: 'full', testMatch: /.*\.spec\.ts/ }]),
  ],
});
```

```bash
ENV=staging npx playwright test          # local
# CI: ENV + secrets injected by the pipeline, same config file
```

**Follow-ups & traps**
- "Why not a config file per env?" — silent drift of runner settings; this "why NOT" is usually the actual question.
- "Where do staging credentials live?" — CI secret store and gitignored `.env` files; committed `.env.example` documents the shape.
- Trap: hardcoding URLs inside tests "just for this one" — breaks the whole parameterization; `baseURL` + relative paths everywhere.

**One-liner** — One config, env-var-parameterized with dotenv locally and CI secrets remotely — separate config files per environment drift apart and confound results.

### Q8. How do you configure retries, and what exactly are the retry semantics?

**Interview answer** — `retries` at top level, per-project overridable, and idiomatically CI-only: `retries: process.env.CI ? 2 : 0`. Semantics: a failed test is re-run from scratch — a fresh worker process, fresh context, all its hooks and fixtures again. A test that fails then passes is reported as *flaky*, not passed — it's visible in the report, which is what makes retries a detection mechanism rather than pure concealment.

**Deep dive** — The fresh-worker detail matters: retries can't be affected by in-process pollution from the failed attempt, but they *can* still fail on persistent external state (a record the failed attempt half-created) — which is why retries fix transient flakes and do nothing for stateful ones. The "flaky" status is the governance hook: a healthy team tracks flaky counts and files fixes; an unhealthy one raises `retries` until green. Per-test control exists (`test.describe.configure({ retries: N })`) for known-turbulent areas, and `serial` mode interacts with retries (the whole serial chain re-runs). Artifacts pair with retries: `trace: 'on-first-retry'` means the retry captures a trace the first attempt didn't — deliberate cost engineering.

**Code**

```ts
retries: process.env.CI ? 2 : 0,
projects: [
  { name: 'smoke', retries: 0 },        // smoke must be deterministic — fail loudly
  { name: 'regression', retries: 2 },
]
```

**Follow-ups & traps**
- "Test fails once, passes on retry — pass or fail?" — reported flaky; the run is green but flagged. Not knowing the flaky status is a real differentiator.
- "Does a retry share state with the failed attempt?" — no; new worker, new fixtures. But external/DB state persists — the trap inside the trap.
- Wrong answer: "set retries to 5 so CI is stable" — concealment; the interviewer wants flake-budget thinking.
- "Why zero retries locally?" — you're at the keyboard to *investigate* flakes, not skip past them.

**One-liner** — Retries re-run failed tests in a fresh worker and mark fail-then-pass as flaky — a visibility mechanism to keep CI moving, never a fix for flakiness.

### Q9. How do you configure workers?

**Interview answer** — `workers` sets the parallel process count: a number (`4`), a percentage of cores (`'50%'` — the local default), and typically a lower fixed cap in CI where runners are small: `workers: process.env.CI ? 2 : undefined`. `workers: 1` serializes everything — the honest setting when tests share mutable state, though it's a symptom to fix, not a destination.

**Deep dive** — Workers are OS processes, each holding a browser — so the constraint is memory as much as CPU; oversubscribed CI workers cause timeout-flavored flakiness that looks like test bugs. Tests within one file run in the same worker sequentially unless `fullyParallel: true` (or per-file `test.describe.configure({ mode: 'parallel' })`) allows file-splitting. The ceiling on useful workers is usually the app under test and its database, not the test machine — 16 workers hammering one small staging DB is a self-DDoS. Escalation path when one machine saturates: `--shard=1/4` across CI machines, merged blob reports. And `workers: 1` deserves nuance: acceptable as a temporary measure or for a genuinely serial slice (via a project), but the real fix is data isolation per test.

**Code**

```ts
workers: process.env.CI ? 2 : undefined,   // undefined → default (50% of cores) locally
fullyParallel: true,
```

```bash
npx playwright test --workers=1        # quick serialization for debugging
npx playwright test --shard=2/4        # this machine runs quarter 2 of the suite
```

**Follow-ups & traps**
- "Tests pass with `--workers=1`, fail parallel — what does that tell you?" — shared state between tests; the fix is isolation, not permanent serialization.
- "More workers = faster?" — until memory, the app, or the DB saturates; blindly raising workers raises flakiness.
- Wrong answer: confusing workers (processes on one machine) with shards (machines); they compose, not compete.

**One-liner** — Workers are parallel browser-holding processes — percentage locally, capped in CI, sharded across machines at scale, and `workers: 1` only as a symptom-flag.

### Q10. How do you configure screenshots, videos, and traces — and why those defaults?

**Interview answer** — In `use`: `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'on-first-retry'`. The rationale is cost versus signal: passing tests produce artifacts nobody reads, so always-on recording buys disk and runtime for nothing; failure-scoped artifacts capture exactly the runs you'll debug. Traces are the most valuable and most expensive, so they're scoped tightest — captured on the retry, which also tells you the failure reproduced.

**Deep dive** — Cost ranking drives the settings: screenshots are cheap (one capture at failure); video records the whole test and encodes continuously — real runtime overhead; traces record DOM snapshots, network, console, and every action — the richest and heaviest. `'on-first-retry'` is clever economics: attempt one runs fast and clean; only if it fails does the retry pay the trace tax — and a trace of a *reproduced* failure is exactly what you want (if the retry passes, it was flaky, also useful to know). Teams without retries use `'retain-on-failure'` for traces instead. The trace viewer (`npx playwright show-trace`) largely obsoletes video for debugging — time-travel DOM snapshots beat pixels — so some teams drop video entirely. Also: artifact hygiene — traces contain network payloads; treat them like logs with secrets (ties back to auth-state handling).

**Code**

```ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
},
```

**Follow-ups & traps**
- "Why not `trace: 'on'` always?" — measurable runtime and large artifacts per test for runs that are 95%+ green; cost/signal reasoning is the expected answer.
- "`retain-on-failure` vs `on-first-retry` for traces?" — no-retries suites need the former; with retries, the latter is cheaper and captures a reproduced failure.
- "Video vs trace?" — trace gives inspectable DOM/network/console with time travel; video shows pixels; knowing the trace viewer wins this exchange.
- Wrong answer: "screenshots on every step for documentation" — that's an artifact firehose, not a debugging strategy.

**One-liner** — Failure-scoped artifacts — screenshot on failure, video retained on failure, trace on first retry — because passing-run artifacts are pure cost with zero signal.

### Q11. Explain the timeout hierarchy — which do you tune and which do you leave alone?

**Interview answer** — Five layers. Test timeout (default 30s) caps a whole test including its fixtures' test-scoped setup. `expect.timeout` (5s) caps each web-first assertion's retry loop. `actionTimeout` (default 0 = none) caps each individual action like `click`; `navigationTimeout` similarly for navigations. `globalTimeout` caps the entire run — a CI circuit breaker, unlimited by default. I tune the test timeout when genuinely long flows need it (preferably per-test with `test.setTimeout` or `test.slow()`), set a `globalTimeout` in CI, and mostly leave action/expect timeouts alone — raising them globally slows every *failure* in the suite to mask a symptom.

**Deep dive** — The layers nest: an action's timeout fires inside a test whose own clock keeps running — so a generous `actionTimeout` with a tight test timeout still fails, just with a worse message; that interaction is the mark of someone who's debugged timeouts. The reason to keep expect/action timeouts tight: timeouts define failure latency — a suite with 60s assertion timeouts takes a minute to report each red assertion, so 20 failures cost 20 minutes of pure waiting. If an element routinely needs >5s, that's a performance signal or a wrong-wait smell (waiting for the wrong condition), not a timeout-tuning task. Local tuning beats global: per-assertion `{ timeout: 15000 }` for one known-slow report widget, `test.slow()` (triples the test timeout) for a heavyweight flow — the config defaults stay honest.

**Code**

```ts
export default defineConfig({
  timeout: 30_000,
  globalTimeout: process.env.CI ? 30 * 60_000 : undefined,  // CI circuit breaker
  expect: { timeout: 5_000 },
  use: { actionTimeout: 10_000, navigationTimeout: 15_000 },
});
```

```ts
test('yearly report renders', async ({ page }) => {
  test.slow();                                        // 3× test timeout for this one
  await page.goto('/reports/yearly');
  await expect(page.getByTestId('chart')).toBeVisible({ timeout: 20_000 }); // local, not global
});
```

**Follow-ups & traps**
- "Tests time out in CI — first move?" — investigate what's slow (trace!), don't raise the global timeout; reflexive timeout-raising is the wrong answer being screened for.
- "Which timeout fires: 10s action inside a test at 29.5s elapsed?" — the test timeout; layers nest and the test clock always runs.
- "Why is actionTimeout 0 by default?" — the test timeout already bounds everything; per-action limits are opt-in granularity.
- Wrong answer: setting `expect.timeout` to 30s globally "for stability" — you've made every failing assertion take 30 seconds to report.

**One-liner** — Timeouts nest — action/expect inside test inside global — tune the test timeout locally and the global breaker in CI, and treat chronic near-timeouts as findings, not tuning tasks.

### Q12. globalSetup/globalTeardown vs setup projects — trade-offs?

**Interview answer** — Both run once before/after the suite, but setup projects run *inside* the runner: they get fixtures, `use` options, traces, retries, and HTML-report visibility — when setup-project login fails you get a trace; when `globalSetup` fails you get a stack trace in the console and zero artifacts. `globalSetup` is a plain exported function outside the runner. Default to setup projects; keep `globalSetup` for things that must precede the runner itself or that projects can't express well.

**Deep dive** — The observability gap is the deciding factor in practice — auth is the highest-flake setup step, and debugging it blind (globalSetup) versus with a trace (setup project) is night and day. Setup projects also parallelize (multiple setup specs), participate in dependency DAGs per browser project, and honor `--project` filtering. globalSetup's remaining niches: work that must happen before any worker exists (starting infrastructure the `webServer` option can't model, mutating env vars that config/projects consume), and truly framework-external concerns. One caveat on the other side: setup projects run per configuration matrix as scheduled by dependencies, and globalSetup runs exactly once no matter what — occasionally that exactly-once guarantee is the requirement. UI mode and `--only-changed` interactions also historically favored setup projects.

**Code**

```ts
// Setup project (preferred): full runner citizenship
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  { name: 'chromium', dependencies: ['setup'], use: { storageState: '.auth/user.json' } },
]

// globalSetup (niche): pre-runner work, no fixtures, no trace
export default defineConfig({ globalSetup: './global-setup.ts' });
// global-setup.ts
export default async function globalSetup() {
  process.env.SEED_RUN_ID = `run-${Date.now()}`;   // visible to all workers
}
```

**Follow-ups & traps**
- "Your login setup fails in CI — which approach tells you why?" — setup project, via trace/screenshot; this scenario *is* the question.
- "Does globalSetup get `baseURL` from config?" — it receives the config object but no fixtures; you wire things manually.
- Wrong answer: treating them as equivalent "old vs new syntax" — the observability and fixture differences are the substance.

**One-liner** — Setup projects are setup with full runner citizenship — fixtures, traces, report entries — while globalSetup is a blind pre-runner hook for the few things projects can't do.

### Q13. What does the `webServer` option do?

**Interview answer** — It has the runner own the app-under-test lifecycle: before tests, Playwright runs the given command, polls the given `url` until it responds, then starts testing; afterwards it shuts the server down. `reuseExistingServer: !process.env.CI` is the standard flag — locally reuse the dev server you already have running; in CI always start fresh for reproducibility.

**Deep dive** — The health-check detail: readiness is the `url` responding (2xx/3xx/400-class — anything but connection failure), and `timeout` bounds the wait — a server that boots slowly needs that raised, and a wrong health URL manifests as "webServer timed out" with a perfectly healthy app. `stdout`/`stderr` options pipe server logs into test output for debugging boot failures. It accepts an *array* for multi-process apps — frontend plus API stub started together. The CI-vs-local asymmetry in `reuseExistingServer` is worth articulating: locally, killing and restarting the dev server on every test run would be hostile; in CI, reusing anything would mean depending on undeclared machine state. For deployed-environment testing (staging), you simply omit `webServer` — it's for locally-served apps.

**Code**

```ts
webServer: [
  {
    command: 'npm run start:api-stub',
    url: 'http://localhost:4010/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  {
    command: 'npm run start:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',                       // surface boot logs on failure
  },
],
use: { baseURL: 'http://localhost:3000' },
```

**Follow-ups & traps**
- "Why `reuseExistingServer` only locally?" — dev convenience vs CI reproducibility; the asymmetry is the point of the flag.
- "webServer says timeout but the app is up — why?" — health `url` wrong or app boots slower than `timeout`; check both.
- Wrong answer: `sleep 30 && npx playwright test` in CI scripts — the option exists precisely to replace timing guesses with a readiness poll.

**One-liner** — `webServer` starts your app, polls a URL until ready, and tears it down — reusing your local dev server but always booting fresh in CI.

### Q14. How do `baseURL` and relative navigation work?

**Interview answer** — `baseURL` in `use` sets the prefix that relative paths resolve against: `page.goto('/checkout')` becomes `${baseURL}/checkout`. Combined with an env-var-driven `baseURL`, every test navigates relatively and the whole suite retargets between local, QA, and staging by changing one variable — no URLs in test code, ever.

**Deep dive** — Resolution follows standard URL semantics, which hides a real gotcha: with `baseURL: 'https://host/app/'`, `goto('/checkout')` (leading slash = origin-absolute) resolves to `https://host/checkout`, escaping the `/app/` path prefix, while `goto('checkout')` resolves relative to `/app/`. Apps served under a subpath make this a genuine bug source, so teams standardize one form. `baseURL` also feeds `toHaveURL` — string arguments resolve against it, so `expect(page).toHaveURL('/orders')` works — and the `request` fixture uses it for relative API paths, keeping UI and API calls consistently retargetable. Absolute `goto` URLs bypass `baseURL` entirely, which is correct for third-party pages and a smell anywhere else.

**Code**

```ts
use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
```

```ts
await page.goto('/checkout');                         // {baseURL}/checkout
await expect(page).toHaveURL('/checkout/confirm');    // resolved against baseURL too
const res = await request.get('/api/cart');           // request fixture uses it as well
```

**Follow-ups & traps**
- "`baseURL` is `https://host/app/` — what does `goto('/login')` hit?" — `https://host/login`, not `/app/login`; leading-slash semantics are the trap.
- "Does `toHaveURL('/orders')` work with baseURL?" — yes, string patterns resolve against it; regex patterns match the full URL.
- Wrong answer: string-concatenating `process.env.BASE_URL + '/checkout'` in tests — reimplementing baseURL badly, and it breaks the moment someone adds a trailing slash.

**One-liner** — Set `baseURL` from an env var and navigate relatively everywhere — one variable retargets navigation, URL assertions, and API requests together.

### Q15. What are `testIdAttribute`, `outputDir`, and `snapshotPathTemplate`?

**Interview answer** — Three depth-signal options. `use.testIdAttribute` changes which HTML attribute `getByTestId` reads — teams with existing `data-test` or `data-qa` attributes point Playwright at them instead of the default `data-testid`. `outputDir` is where per-test artifacts (traces, videos, screenshots) land, default `test-results`. `snapshotPathTemplate` controls where visual-comparison snapshots are stored, with tokens like `{testDir}`, `{testFilePath}`, `{arg}`, `{projectName}`, `{platform}`.

**Deep dive** — `testIdAttribute` is an adoption unlock: a codebase instrumented for another tool (Cypress conventions, `data-cy`/`data-test`) works with `getByTestId` immediately via one config line — no mass renaming. `outputDir` is per-test-scoped internally (each test gets a subdirectory; cleaned between runs) and matters operationally as the thing CI uploads on failure — and therefore the thing to *scrub or scope* if state files or secrets could land there. `snapshotPathTemplate` earns its keep in visual testing across projects and platforms: the default embeds platform suffixes; a custom template like separating snapshots per project prevents chromium and webkit baselines from colliding, and keeps snapshots reviewable next to their tests. Knowing these three signals you've operated a suite, not just written specs.

**Code**

```ts
export default defineConfig({
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    testIdAttribute: 'data-qa',        // getByTestId now reads data-qa
  },
});
```

```ts
// <button data-qa="submit-order">Place order</button>
await page.getByTestId('submit-order').click();
```

**Follow-ups & traps**
- "Your app uses `data-cy` everywhere — rewrite the DOM?" — no; one line of `testIdAttribute` config. The question tests whether you know the knob exists.
- "Why customize `snapshotPathTemplate`?" — per-project/per-platform baseline separation; without it, cross-browser visual tests fight over files.
- Trap: committing `outputDir` contents or uploading it wholesale with auth state files inside — artifact hygiene again.

**One-liner** — `testIdAttribute` adapts `getByTestId` to your existing attributes, `outputDir` is the failure-artifact landing zone, and `snapshotPathTemplate` keeps visual baselines organized per project and platform.
