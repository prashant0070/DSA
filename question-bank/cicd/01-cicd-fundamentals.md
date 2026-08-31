# CI/CD Fundamentals for Test Automation

This file covers the CI/CD questions every SDET gets before an interviewer goes tool-specific: the vocabulary, where tests live in a pipeline, and the operational decisions (gating, parallelism, artifacts, environments) that separate someone who has run tests in CI from someone who has designed the pipeline. Answers assume a web app with a Playwright/API automation suite, since that is the context these questions are almost always asked in.

- Q1. What is CI vs Continuous Delivery vs Continuous Deployment?
- Q2. Which CI/CD tools have you used?
- Q3. How did you integrate your automation framework with CI/CD?
- Q4. Describe a typical pipeline for a web app including test stages
- Q5. When should which tests run?
- Q6. What is a quality gate?
- Q7. How do you configure a pipeline to run tests after every commit?
- Q8. How do you handle test artifacts (reports, screenshots, videos, traces) in CI?
- Q9. How do you run tests in parallel in CI/CD?
- Q10. How do you manage dependencies and speed up pipeline setup?
- Q11. How should the pipeline behave when tests fail?
- Q12. Exit codes and how CI knows tests failed
- Q13. How do you run the same suite against QA/staging/prod-like from one pipeline?
- Q14. Trunk-based vs GitFlow from a test-automation perspective

### Q1. What is CI vs Continuous Delivery vs Continuous Deployment?

**Interview answer** — Continuous Integration means every developer merges small changes frequently, and each merge triggers an automated build and test run so integration problems surface within minutes, not weeks. Continuous Delivery extends that: every change that passes the pipeline produces a deployable artifact, and releasing to production is a one-click business decision. Continuous Deployment removes the click — every green pipeline run goes straight to production automatically. As an SDET, my tests are the mechanism that makes each step trustworthy: fast tests gate CI, deeper suites gate delivery, and post-deploy smoke tests protect deployment.

**Deep dive** — The distinction interviewers probe is delivery vs deployment: delivery means "always releasable," deployment means "always released." The maturity jump between them is not tooling, it is confidence — and confidence comes almost entirely from automated test coverage plus observability. Where tests sit:

- CI: static analysis, unit tests, fast component/API tests on every push. Feedback target under 10 minutes.
- Continuous Delivery: full integration and e2e regression against a staging environment before the artifact is stamped releasable; manual approval is allowed at the release step.
- Continuous Deployment: no human gate, so you need e2e smoke in the pipeline, canary or progressive rollout, post-deploy smoke in production, and automated rollback triggers. Test flakiness is fatal here — a flaky suite either blocks all deploys or gets ignored.

A useful nuance: an artifact should be built once and promoted through environments, not rebuilt per environment, otherwise you tested a different binary than you shipped.

**Follow-ups & traps**
- "Can you do Continuous Deployment without e2e tests?" — Yes, with feature flags, canaries, and strong monitoring, but you are shifting detection to production; say that explicitly rather than "no."
- Trap: saying CD "means Jenkins/GitHub Actions." Those are tools; CI/CD is a practice. Weak candidates conflate them.
- Trap: claiming your company did Continuous Deployment when you had a manual QA sign-off — that is Continuous Delivery, and interviewers catch the mismatch.
- "Where would you put manual exploratory testing?" — Outside the gate, in parallel, on the staging environment; it informs quality but does not block the pipeline.

**Senior/lead angle** — Leads get asked how to move an org from delivery to deployment. The answer is incremental: stabilize the suite (kill flakes), shrink the e2e gate to true smoke, invest in canary + rollback automation, and move depth to nightly. The blocker is almost never technology; it is trust in the tests, which is the SDET lead's core deliverable.

**One-liner** — CI integrates and tests every change; Delivery keeps every change releasable behind a button; Deployment removes the button — and automated tests are what make each level safe.

### Q2. Which CI/CD tools have you used?

**Interview answer** — I've worked primarily with Jenkins and GitHub Actions, plus some GitLab CI. In Jenkins I owned a declarative multibranch pipeline for our Playwright suite: PR-triggered smoke runs, a nightly full regression on a cron trigger, parallel cross-browser stages, JUnit and HTML report publishing, and Slack notifications on state change. In GitHub Actions I built the PR-check workflow with sharded Playwright jobs, browser caching, and a merge-reports job, and a scheduled nightly with `workflow_dispatch` inputs for environment selection. I don't just run jobs in these tools — I've written and maintained the pipeline code itself.

**Deep dive** — The structure of a strong answer is: name the tool, then immediately name what *you built* in it, because "used Jenkins" can mean "clicked Build Now." Concrete things worth claiming (only if true) and being ready to defend:

- Trigger design: PR webhooks, cron for nightly, manual parameterized runs for on-demand env testing.
- Pipeline authoring: Jenkinsfile / workflow YAML in the repo, code-reviewed like any other code.
- Speed work: dependency caching, browser caching, sharding, cancel-in-progress on stale PR pushes.
- Reporting: JUnit for trends, HTML report artifacts, links posted to Slack/PR.
- Gating: which checks were required to merge and why.

Interviewers follow the thread you open — if you mention sharding, expect "how does report merging work?"; if you mention Jenkins, expect agents and credentials. Only open threads you can go deep on.

**Follow-ups & traps**
- "Show me the pipeline structure you wrote" — be able to sketch stages from memory; candidates who "used" a tool but can't outline a pipeline fail here.
- Trap: listing six tools superficially. Two tools with ownership beats six with exposure.
- "What did you change/improve in the pipeline?" — have one concrete before/after, ideally with a number ("regression went from 90 to 25 minutes after sharding").
- Trap: describing what the DevOps team built. Say "I" only for what you did; interviewers cross-examine.

**One-liner** — Name the tools, then prove ownership: the triggers, stages, caching, reporting, and gates you personally built.

### Q3. How did you integrate your automation framework with CI/CD?

**Interview answer** — I made the pipeline treat the test suite as a first-class build step. Triggers first: every PR runs a tagged smoke subset, merges to main run the broader suite, and a nightly cron runs full regression. The job checks out the repo, restores cached dependencies, installs with a lockfile (`npm ci`), and runs tests with environment-specific config injected via environment variables — base URL, credentials from the secret store, worker count. Results go out as JUnit XML for the CI's test UI plus the Playwright HTML report and traces as artifacts, and the PR check is a required status, so red tests actually block the merge.

**Deep dive** — The integration has five layers, and naming them shows you designed it rather than copy-pasted it:

1. **Trigger types** — webhook on PR/push, cron for nightly, manual dispatch with parameters (env, tag, browser) for on-demand runs. Each maps to a different test scope.
2. **Install & cache** — lockfile-based install for reproducibility; cache `node_modules`/npm cache and Playwright browsers keyed on lockfile + Playwright version, cutting minutes per run.
3. **Execution config** — no hardcoded URLs or secrets in test code; a config layer reads `ENV`/`BASE_URL`/credentials from CI variables and the secret store, so the same code runs anywhere.
4. **Publishing** — JUnit XML → CI test tab and trend graphs; HTML report + failure traces/screenshots → artifacts with sensible retention; Slack message on failure with a direct report link.
5. **Gating** — the PR smoke job is a required check; the deep suites are informational or gate the deploy stage instead, so slow tests don't block developer flow.

```bash
# The core of the CI test step, env-driven and CI-agnostic
export TEST_ENV="${TEST_ENV:-qa}"
npm ci
npx playwright install --with-deps chromium
npx playwright test --grep @smoke --reporter=junit,html
```

**Follow-ups & traps**
- "How do tests know which environment to hit?" — config module keyed by an env var; never a code edit or a branch per environment.
- "Where do credentials live?" — the CI secret store, injected at runtime, masked in logs. Saying ".env committed to the repo" ends the interview thread badly.
- Trap: "we run all tests on every PR" — signals no scope design; expect "so PRs wait 45 minutes?"
- "What happens on failure?" — artifacts uploaded, merge blocked, notification with links; if you can't answer, the integration is theoretical.

**One-liner** — Trigger by event, install from lockfile with caching, configure via env vars and secrets, publish JUnit + HTML + traces, and wire the result into the merge gate.

### Q4. Describe a typical pipeline for a web app including test stages

**Interview answer** — Lint and unit tests run first on every push because they're the cheapest signal. Then the app builds once into a versioned artifact — a Docker image — and that same artifact is deployed to an ephemeral or QA environment. Against that deployment we run API tests, then a Playwright e2e smoke pack of the critical journeys. If that's green the change can merge and promote toward production; the full e2e regression and visual tests run nightly rather than per-commit. After any production deploy, a small post-deploy smoke suite verifies the release, ready to trigger rollback.

**Deep dive** — The ordering principle is cost vs confidence: fail on the cheapest sufficient signal.

```text
lint → unit → build image → deploy to ephemeral/QA
     → API tests → e2e smoke (PR gate ends here)
     → merge → promote to staging → broader e2e
     → nightly: full regression + visual + cross-browser
     → prod deploy → post-deploy smoke → monitor/rollback
```

Points that earn credit:
- **Build once, promote** — the artifact tested in QA is byte-identical to what ships; per-environment rebuilds invalidate your testing.
- **Ephemeral environments** — per-PR namespaces (Docker Compose or a K8s namespace) eliminate the shared-QA "who broke the env" problem and enable parallel PR testing; the trade-off is infra cost and data seeding complexity.
- **API tests before e2e** — they cover business logic faster and localize failures below the UI; a failing API test saves you debugging a cryptic UI timeout.
- **Regression is nightly, not per-PR** — per-PR full regression makes the pipeline the bottleneck; the smoke pack is chosen to make that trade safe.
- **Post-deploy smoke** — a handful of read-mostly, production-safe checks (login, key page loads, one synthetic transaction) run minutes after deploy.

**Follow-ups & traps**
- "Why not run full regression on every PR?" — feedback time and compute cost; risk is covered by smoke selection + nightly + post-deploy checks. "Because it's slow" alone is a weak answer — explain the risk mitigation.
- "How do you pick what's in the smoke pack?" — critical user journeys, revenue paths, auth; reviewed periodically, kept under ~10 minutes.
- Trap: pipelines with no post-deploy verification — interviewers ask "how do you know prod is fine after deploy?"
- "Where do database migrations get tested?" — in the ephemeral/QA deploy step, before tests run against it.

**Senior/lead angle** — Leads should mention pipeline SLAs (PR feedback < 15 min), environment strategy cost (ephemeral vs shared), and that test placement is a negotiation with dev teams — the SDET lead owns the quality stages' speed and signal quality, or devs will bypass them.

**One-liner** — Cheapest checks first, build once and promote, smoke gates the PR, regression runs nightly, and a post-deploy smoke verifies production.

### Q5. When should which tests run?

**Interview answer** — I map the test pyramid onto pipeline stages. On every PR: lint, unit, and a fast e2e smoke subset — the gate must stay under roughly 10–15 minutes or developers route around it. On merge to main: a broader integration and e2e pack, since main must stay releasable. Nightly: the full regression, cross-browser matrix, and visual tests — everything too slow or too broad to gate a merge. Post-deploy: a small production-safe smoke suite. The principle is that scope grows as frequency drops.

**Deep dive** — This is the test pyramid expressed in time rather than layers:

| Stage | Scope | Budget | Purpose |
| --- | --- | --- | --- |
| PR gate | lint, unit, `@smoke` e2e subset | ~10–15 min | block bad merges fast |
| Merge to main | + integration/API, wider e2e | ~30 min | keep main releasable |
| Nightly | full regression, visual, cross-browser | hours OK | breadth, drift detection |
| Post-deploy | prod-safe smoke | ~5 min | verify the release |

Mechanics worth naming: tag-based selection (`@smoke`, `@regression`) or separate Playwright projects; nightly failures triaged every morning with the same seriousness as PR failures, or the nightly becomes noise; visual tests live in nightly because they're environment-sensitive and review-heavy. The dominant failure mode in real teams is scope creep — the PR gate accretes tests until it takes 40 minutes; someone (the SDET lead) must own the budget and periodically evict tests to nightly.

**Follow-ups & traps**
- "A critical bug slipped through because the covering test was nightly-only. Now what?" — promote that scenario to the smoke pack, and treat it as smoke-selection feedback, not proof the gate must run everything.
- Trap: "run everything on every commit" — sounds rigorous, fails on cost, feedback time, and flake exposure at scale.
- "How do you keep the smoke pack honest?" — time budget enforced in CI, periodic review against production incidents and traffic data.
- "Who fixes nightly failures?" — a named rotation with a morning triage; unowned nightlies rot within weeks.

**Senior/lead angle** — The lead framing: define feedback-time SLAs per stage, publish them, and treat gate duration as a metric you defend. Also own the promotion/demotion policy between smoke and regression — that policy is where quality strategy actually lives.

**One-liner** — Frequency and scope trade off: PRs get fast smoke, merges get breadth, nightly gets everything, and production gets a post-deploy sanity check.

### Q6. What is a quality gate?

**Interview answer** — A quality gate is an automated pass/fail checkpoint in the pipeline: defined criteria the build must meet to proceed — tests green, coverage threshold met, no critical static-analysis or security findings. The key design decision is which checks are blocking versus informational. Blocking gates must be fast and trustworthy, because a flaky blocking gate teaches the team to override it; informational checks surface trends without stopping delivery.

**Deep dive** — Typical gate criteria: unit/smoke test results, code coverage delta, linting, SAST/dependency-scan severity thresholds, sometimes performance budgets. Enforcement is via required status checks (GitHub branch protection) or a failing pipeline stage.

The coverage-gate debate is a deliberate probe. The case for: a hard floor (e.g., 80%) prevents silent erosion. The case against: coverage measures execution, not assertion quality — teams hit the number with assertion-free tests, and a global threshold punishes legacy-code touches. The defensible position: gate on *diff coverage* (new/changed lines) rather than global percentage, treat the number as a conversation trigger, and never let the gate replace review judgment. Saying "80% coverage guarantees quality" is a known wrong answer.

Also worth naming: gates need an override path (explicit, logged, approval-required) for genuine emergencies — a gate with no escape hatch gets disabled the first time it blocks a critical hotfix, and then it's gone forever.

**Follow-ups & traps**
- "Should code coverage block a merge?" — nuanced answer above; a flat "yes" or "no" both lose points.
- Trap: making the full e2e regression a blocking PR gate — conflates confidence with gating; the gate must match the stage's time budget.
- "What happens when a gate is flaky?" — fix or remove it fast; a gate that cries wolf destroys the credibility of every other gate.
- "Who can override a gate?" — defined roles, logged overrides, reviewed in retro; "nobody" and "anybody" are both wrong.

**Senior/lead angle** — Gate governance is a lead responsibility: keep the blocking set minimal and fast, audit override frequency (frequent overrides mean the gate is miscalibrated), and evolve gates with data — e.g., add a security gate after an incident, demote a check that hasn't caught anything in a year.

**One-liner** — A quality gate is automated pass/fail criteria for pipeline progression — keep blocking gates fast and trustworthy, make the rest informational.

### Q7. How do you configure a pipeline to run tests after every commit?

**Interview answer** — With a webhook: the SCM (GitHub/GitLab/Bitbucket) calls the CI server the instant a push or PR event happens, and the pipeline starts within seconds. The alternative, SCM polling, has the CI server ask "anything new?" on a schedule — it wastes resources and adds up to a full polling interval of latency, so it's a last resort for when inbound webhooks can't reach the CI server. On top of the trigger I add branch filters so only relevant branches run, path filters to skip doc-only changes, and concurrency control so a new push to the same PR cancels the now-stale run.

**Deep dive** — Webhook flow: push → SCM fires an HTTP POST to the CI endpoint → CI matches it to a job/workflow → run starts. Polling flow: CI runs `git ls-remote`-style checks every N minutes — with hundreds of jobs this hammers both the SCM and CI, and interviewers specifically want to hear "webhooks, and here's why polling is worse."

Refinements that mark a practitioner:
- **Branch/path filters** — run on `main` and PRs; skip `**.md`-only changes; the savings compound at scale.
- **Concurrency / cancel-in-progress** — pushing five commits to a PR in ten minutes shouldn't run five full suites; group by ref and cancel stale runs (GitHub Actions `concurrency`, Jenkins `disableConcurrentBuilds(abortPrevious: true)`).
- **Per-commit vs per-push** — CI triggers per push event; a push of five commits is one run against the head, which is what you want.

```yaml
on:
  pull_request:
    paths-ignore: ["**.md", "docs/**"]
  push:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Follow-ups & traps**
- "When is polling actually justified?" — CI behind a firewall that can't accept inbound hooks and no relay available; even then, poll infrequently.
- Trap: "set up a cron every 5 minutes" for per-commit builds — that's polling with extra steps.
- "What if the webhook delivery fails?" — SCMs retry and log deliveries; some teams keep a slow fallback poll as a safety net.
- "Should doc-only changes run e2e?" — no; path filters — but be careful the filter can't skip tests for files that *do* affect behavior.

**One-liner** — Use webhooks for instant event-driven triggers, keep polling as a firewall-only fallback, and add branch filters plus cancel-in-progress so you only run what matters.

### Q8. How do you handle test artifacts (reports, screenshots, videos, traces) in CI?

**Interview answer** — I configure Playwright to capture screenshots and videos only on failure and traces on first retry, so passing runs stay cheap, then upload the HTML report and the failure evidence as CI artifacts. Retention is tiered — PR artifacts a week or two, nightly and release-run artifacts longer — because videos and traces get expensive at scale. Critically, the failure notification and the build page link directly to the report, so an engineer goes from red build to root cause without rerunning anything locally.

**Deep dive** — The Playwright config that implements the policy:

```yaml
# playwright.config.ts (excerpt, shown as values)
use:
  screenshot: only-on-failure
  video: retain-on-failure
  trace: on-first-retry
```

- **Why on-failure/on-retry** — recording everything roughly doubles run time overhead and multiplies storage; failures are the only runs anyone inspects. `on-first-retry` captures a trace exactly when a test looks flaky, which is when you need it most.
- **Storage cost** — a video is 1–10 MB, a trace similar; 500 tests × 20 runs/day adds up fast. Mitigations: retention policies (GitHub Actions `retention-days`, Jenkins `buildDiscarder`), uploading `test-results/` only on failure, and pushing long-lived reports to S3 with lifecycle rules instead of CI-native storage.
- **Linking** — an artifact nobody can find is waste: Jenkins `publishHTML` puts the report on the build page; GitHub Actions links artifacts on the run summary (or deploy the report to Pages/S3 for one-click viewing); Slack failure messages carry the direct URL.
- **Sharded runs** — each shard uploads a blob report; a final job merges them into one HTML report (covered in the GitHub Actions file).

**Follow-ups & traps**
- "Why not record video for every test?" — cost and runtime with no consumer; evidence matters only on failure.
- "A test only fails in CI — how do you debug without artifacts?" — you don't, which is precisely why traces-on-retry exist; `npx playwright show-trace` on the downloaded trace replays the run.
- Trap: infinite retention — interviewers probing cost expect you to know artifacts are often the biggest CI storage line item.
- "Where do artifacts for compliance/release evidence go?" — long-term object storage with lifecycle rules, not the CI server.

**Senior/lead angle** — At scale, set an artifact size budget per run, monitor storage spend, and standardize the capture policy in a shared config so forty repos don't each invent their own (usually worse) policy.

**One-liner** — Capture evidence only on failure, trace on first retry, upload with tiered retention, and make the report one click from the failure notification.

### Q9. How do you run tests in parallel in CI/CD?

**Interview answer** — There are three layers and they multiply. Framework-level: Playwright runs test files in parallel with workers on a single machine — that's free and the first thing to tune. Runner-level: the CI spins up multiple jobs, either a matrix over browsers/environments or sharding, where the suite is split across N identical jobs with `--shard=i/N`. In practice I combine them: four shard jobs, each running six workers, gives ~24-way parallelism, and a final job merges the shard reports into one. The prerequisite for all of it is test independence — no shared state, no ordering assumptions.

**Deep dive** — The three layers, precisely:

1. **Framework workers** — `workers: N` in Playwright config; each worker is a process with its own browser. Bounded by the machine's CPU/RAM — on a typical CI runner 2–4 workers before resource starvation causes flaky timeouts.
2. **Sharding** — horizontal scaling across machines: `npx playwright test --shard=2/4` runs the second quarter of the suite. Playwright shards deterministically; the shards each produce a blob report and a merge step produces the unified report.
3. **Matrix** — different *dimensions* rather than splitting one suite: browser × OS × environment. A matrix of 3 browsers, each sharded 4 ways, each with 4 workers = 48-way effective parallelism.

Preconditions that interviewers dig into: unique test data per worker (fixtures generating per-run users, not a shared `testuser@`), no dependence on execution order, and idempotent setup. The wrong answer is "just increase workers" — a single machine saturates and tests start timing out, which reads as flakiness.

```bash
# Shard 2 of 4, 4 workers inside the shard
npx playwright test --shard=2/4 --workers=4 --reporter=blob
```

**Follow-ups & traps**
- "Doubling workers made tests flaky — why?" — resource starvation on the runner (CPU/memory), the classic; the fix is sharding across machines, not more workers.
- "How do you merge results from shards?" — blob reports + `merge-reports`; JUnit files can be aggregated too but lose trace/attachment richness.
- Trap: parallelizing tests that share accounts/data and then blaming the framework for flakiness.
- "How do you keep shards balanced?" — Playwright distributes by file; split giant spec files, or use duration-based balancing tooling if skew is severe.

**Senior/lead angle** — Parallelism is a cost lever: the goal is wall-clock feedback time within a compute budget. A lead can state the equation — shards × workers vs runner size vs CI minutes — and knows the diminishing-returns point where fixing slow tests beats adding shards.

**One-liner** — Parallelism stacks three ways — workers within a machine, shards across machines, matrix across dimensions — and all of it rests on test independence.

### Q10. How do you manage dependencies and speed up pipeline setup?

**Interview answer** — Three tactics in order of impact. First, cache the package installation — the npm cache keyed on the lockfile hash, so `npm ci` doesn't re-download hundreds of packages every run. Second, cache Playwright browsers keyed on the Playwright version, because `playwright install` downloads several hundred megabytes of browser binaries otherwise. Third, for the biggest win, skip installation entirely by running the job in a prebuilt Docker image — the official Playwright image or an internal image with browsers and dependencies baked in. That typically takes setup from four or five minutes to seconds.

**Deep dive** —
- **npm caching** — cache key = hash of `package-lock.json`; on hit, `npm ci` installs from the local cache. `actions/setup-node` with `cache: npm` does this in one line; Jenkins agents use a persistent workspace or a cache plugin. Always `npm ci`, never `npm install`, in CI — lockfile-exact and faster.
- **Browser caching** — Playwright installs browsers to `~/.cache/ms-playwright`; cache that path keyed on the Playwright version from the lockfile. Trap: keying on the lockfile alone means a Playwright bump invalidates correctly, but a stale cache with a new Playwright version means missing browsers — hence `npx playwright install` still runs and becomes a no-op on cache hit.
- **Prebuilt images** — `mcr.microsoft.com/playwright:v1.46.0-jammy` ships browsers + OS deps; an internal derived image can add your node_modules layer too. Rebuild on dependency changes via Docker layer caching. This also fixes the "works locally, missing libgbm in CI" class of failures.
- **What not to cache** — `node_modules` directly across OS/node-version changes (npm cache is safer), test results, anything derived from code under test.

```yaml
- uses: actions/setup-node@v4
  with: { node-version: 20, cache: npm }
- run: npm ci
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
- run: npx playwright install --with-deps
```

**Follow-ups & traps**
- "Why `npm ci` over `npm install`?" — reproducible lockfile-exact install, fails on lockfile drift, deletes node_modules first; `npm install` can mutate the lockfile.
- "Your cache restored but tests fail with 'browser not found'" — cache/version mismatch; keep the install step in place as a no-op safety.
- Trap: caching aggressively without a correct key, then debugging stale-dependency ghosts for a day.
- "When does a prebuilt image beat caching?" — large dependency sets, many jobs per day, or when OS-level deps (not just npm packages) dominate setup time.

**One-liner** — Cache npm by lockfile hash and browsers by Playwright version, or skip setup entirely with a prebuilt Playwright Docker image.

### Q11. How should the pipeline behave when tests fail?

**Interview answer** — The build goes red and blocks the merge or the deploy — a pipeline that stays green on failing tests is worse than no pipeline, because it manufactures false confidence. I allow a small, deliberate retry policy — Playwright `retries: 1` or `2` in CI only — so known-flaky infrastructure doesn't block everyone, but retried-then-passed tests are flagged as flaky and tracked, not forgotten. Notification goes to the owning team's channel with a direct link to the report and trace, and it fires on state change — first failure and recovery — rather than every red run, to avoid alert fatigue.

**Deep dive** — The design decisions inside "it fails":
- **Fail fast vs run all** — within a PR gate, let the suite finish (a full failure list beats one failure per iteration), but fail the *pipeline* stage; for multi-stage pipelines, don't deploy on red tests, obviously — yet "tests failed but we deployed anyway" is a real anti-pattern interviewers fish for.
- **Retry policy** — retries are a containment measure, not a fix. The discipline: retried-pass = flaky flag in the report, flaky tests get tickets and a quarantine path, and the retry count never exceeds 2 — beyond that you're hiding real defects and doubling runtime on genuinely broken tests.
- **Ownership & notification** — route by team (test tags or directory ownership), include report/trace links so triage starts immediately, escalate if red persists (e.g., nightly red two days running pages the QA lead).
- **Auto-created tickets debate** — auto-filing a ticket per failure floods the tracker with duplicates during an environment outage; better: auto-file for *new* nightly failures with dedupe on test ID, or file flaky-test tickets from retry data. A blanket "yes, auto-create tickets" is the naive answer; "no automation at all" loses the tracking benefit.

**Follow-ups & traps**
- "Retries hide bugs — defend them." — retries with flaky-tracking convert hidden flakiness into a measured backlog; retries without tracking do hide bugs, concede that.
- "A test fails only in CI. Walk me through triage." — pull the trace/video artifact, compare env config, check resource contention; not "rerun until green."
- Trap: `|| true` or "mark unstable and continue" around the test command to keep pipelines green — instant credibility loss.
- "Who gets notified?" — the owning team, on transition; "everyone, every time" is how notifications get muted.

**Senior/lead angle** — A lead sets the failure policy in writing: retry budget, quarantine criteria and SLA, escalation path, and a weekly flakiness report. The metric to run the loop on is "time from red to triaged," not just pass rate.

**One-liner** — Red blocks, retries are contained and tracked as flakiness, and notifications hit the owning team on state change with the evidence attached.

### Q12. Exit codes and how CI knows tests failed

**Interview answer** — CI decides pass or fail from the process exit code: every step runs a command, and exit code 0 means success while any non-zero code fails the step and, by default, the build. Playwright exits non-zero when any test fails, so `npx playwright test` failing is what turns the build red — no plugin magic required. On top of that binary signal, the runner emits JUnit XML so the CI can show *which* tests failed, with per-test timing and history, instead of just "step failed."

**Deep dive** — Two layers, and interviewers check you know both:
1. **Exit code = control flow.** The shell convention: 0 success, non-zero failure. CI steps are shell commands, so pipelines compose through exit codes. Gotchas that eat the signal: piping the test command into another tool (`npx playwright test | tee log.txt` returns tee's exit code — needs `set -o pipefail`), appending `|| true`, or swallowing the code inside a script that continues afterward (`set -e` or explicit checks).
2. **JUnit XML = granular reporting.** A structured file listing every test with status, duration, and failure message. The CI parses it into a test tab, trend graphs, and "which test broke first on which commit." Jenkins: `junit 'results/*.xml'`; GitHub Actions: publish via a reporter action or rely on annotations. Nuance: a `junit` publish step can itself mark a build failed/unstable based on parsed results even if you deliberately let the test command's code pass — Jenkins' "unstable" (yellow) state is exactly "build ran, tests failed."

```bash
set -euo pipefail
npx playwright test --reporter=junit --output=test-results
# PLAYWRIGHT_JUNIT_OUTPUT_NAME=results/junit.xml controls the path
```

**Follow-ups & traps**
- "Tests failed but the build was green — likely causes?" — swallowed exit code: a pipe without pipefail, `|| true`, a wrapper script without `set -e`, or reporting-only steps that ignore results.
- "What's the difference between a failed and unstable build in Jenkins?" — failed = a step returned non-zero; unstable = build completed but the junit step recorded test failures.
- Trap: believing CI "reads the report" to decide pass/fail — the exit code decides; the report explains.
- "How does CI count skipped vs failed?" — from the JUnit XML statuses, which is why you emit it even though the exit code already gates.

**One-liner** — The exit code decides pass/fail; JUnit XML explains which tests, how long, and since when — you need both, and you must not swallow the first.

### Q13. How do you run the same suite against QA/staging/prod-like from one pipeline?

**Interview answer** — One codebase, one pipeline, parameterized by environment. The pipeline exposes an environment parameter — a choice in a Jenkins parameterized build or a `workflow_dispatch` input in GitHub Actions — and the framework has a config layer that maps that value to base URL, credentials pulled from the secret store, timeouts, and feature flags. The test code itself never references an environment; it reads config. Scheduled runs pin their env (nightly against staging), manual runs choose, and post-deploy hooks pass the env they just deployed.

**Deep dive** — The config layering that makes this clean:
1. **Defaults** in a base config (timeouts, retries, reporters).
2. **Per-env overlay** — `config/qa.ts`, `config/staging.ts` — base URL, seeded test accounts identifiers, env-specific toggles (e.g., skip payment tests where no sandbox exists).
3. **Runtime env vars win** — `TEST_ENV` selects the overlay; secrets (passwords, API keys) come only from the CI secret store per environment, never from the overlay files.

```groovy
parameters {
  choice(name: 'TEST_ENV', choices: ['qa', 'staging', 'prod-like'])
}
// ...
sh "TEST_ENV=${params.TEST_ENV} npx playwright test --grep @smoke"
```

Design points: prod-like/prod runs get a restricted, read-mostly tag (`@prod-safe`) — never the full destructive suite; environment-specific *skips* are declared in config, not sprinkled as `if (env === 'qa')` through test bodies; and the report is labeled with the environment so a red staging run isn't mistaken for QA.

**Follow-ups & traps**
- "How do you avoid `if (env === ...)` scattered through tests?" — capability flags in config ("paymentsSandbox: true") that tests consult, or tag-based inclusion per env.
- Trap: a branch per environment or copy-pasted jobs per env — divergence is guaranteed; parameterize instead.
- "Where do per-env credentials live?" — per-env entries in the CI secret store (or environment-scoped secrets in GitHub), injected at runtime.
- "Would you run the full suite against production?" — no; a curated safe smoke subset, with test-data isolation and cleanup guarantees.

**One-liner** — Parameterize the pipeline, layer the config, inject secrets per environment at runtime — the suite never knows an environment by name, only by config.

### Q14. Trunk-based vs GitFlow from a test-automation perspective

**Interview answer** — Trunk-based development means short-lived branches merging into main daily, so CI runs constantly against one integration point — it demands a fast, reliable PR gate and pairs with feature flags to keep unfinished work dark. GitFlow adds long-lived develop and release branches, which means testing happens at multiple integration points and big-bang merges surface integration bugs late. From a test-automation seat, trunk-based raises the bar on suite speed and flake-freedom because the gate runs dozens of times a day, while GitFlow multiplies *where* you must run suites and adds release-branch regression cycles.

**Deep dive** — What changes for the SDET:
- **Trunk-based** — the PR gate is the whole game: it must be minutes-fast and trustworthy, because it's the only thing between a commit and main. Feature flags mean tests must cover flag-on and flag-off states for critical paths. Release = tag from main, so post-deploy smoke matters more than a release-branch soak.
- **GitFlow** — suites run per feature branch, on develop, and again on release branches; the release branch gets a stabilization regression pass, which institutionalizes a slower rhythm. Merge conflicts and integration drift between develop and release branches generate a class of bugs trunk-based avoids by construction.
- Modern default is trunk-based (it's a DORA high-performer correlate); GitFlow persists where releases are versioned and shipped discretely (mobile apps, on-prem software) and a release branch genuinely maps to a supported version.

**Follow-ups & traps**
- "Which needs better automation?" — trunk-based, strictly: without a fast trustworthy gate it collapses; GitFlow tolerates weaker automation by spending calendar time on stabilization.
- Trap: religious answers either way — the mobile/on-prem versioned-release case for GitFlow-like models is legitimate.
- "How do feature flags change your testing?" — test both flag states for critical flows, and have a flag-cleanup discipline so the matrix doesn't explode.

**One-liner** — Trunk-based bets everything on a fast reliable PR gate plus feature flags; GitFlow trades that for multiple integration points and late-merge risk.
