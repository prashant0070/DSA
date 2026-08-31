# Flaky Tests: Diagnosis & Prevention

Flakiness is the topic where senior interviews are won or lost: anyone can define a flaky test, but few candidates can diagnose one systematically, tell a test race from a product race, or argue the retry trade-off like a lead. This file covers the taxonomy, investigation playbooks, detection at scale, quarantine policy, and prevention by design.

- Q1. What causes flaky tests?
- Q2. A test passes locally but randomly fails in CI — investigation playbook
- Q3. A test fails once every 50 runs — how do you reproduce and collect evidence?
- Q4. A test fails, then passes on retry — flaky test or product defect? How do you tell?
- Q5. How do you identify flaky tests at scale?
- Q6. What is a quarantine strategy, and why is deleting sometimes right?
- Q7. How do retries work and what do they hide?
- Q8. How do you prevent flakiness by design?
- Q9. How do you distinguish infrastructure failures from application defects?
- Q10. Screenshots vs videos vs traces vs logs vs network data — what is each for?
- Q11. An animation causes intermittent misclicks — what are the fixes?
- Q12. Your team wants auto-retry ×3 to make the dashboard green — argue the trade-off

### Q1. What causes flaky tests?

**Interview answer** — I group causes into a taxonomy: race conditions from bad waits — the test asserting before the app settled, or manual timeouts guessing wrong; test interdependence — order or shared-worker assumptions; shared data — parallel tests mutating each other's records or accounts; environment variance — CI's slower CPU, headless differences, network jitter; timing assumptions baked into the test — hardcoded waits, "animations take 300ms"; animations and transitions moving click targets; third-party services with their own weather; and — the category people forget — genuine races in the application that the test surfaces intermittently. That last one isn't test flakiness at all; it's a bug with a shy reproduction.

**Deep dive** — The taxonomy earns its keep because each class has a distinct signature and fix: bad waits show as assertion-too-early failures fixed by web-first assertions; interdependence shows as order-sensitive failures fixed by isolation; shared data shows as parallel-only failures fixed by unique/per-worker data; environment variance shows as CI-only failures fixed by artifacts and env parity; app races show as inconsistent *data* rather than inconsistent timing, and are fixed in the product. Naming the class before reaching for a fix is what separates diagnosis from `waitForTimeout` whack-a-mole. Playwright removes entire classes when used properly — auto-waiting actions and web-first assertions eliminate most bad-wait flakiness — which is precisely why remaining flakes deserve suspicion of the deeper classes.

**Follow-ups & traps**
- "Most common cause in practice?" — Bad waits historically; in Playwright suites written idiomatically, shared data and test interdependence take over as the top classes.
- Trap: "flaky tests are just a fact of life" — each flake has a specific cause in a specific class; fatalism is how suites rot.
- "Can the app itself be flaky?" — Yes, and that's a defect to file, not a test to pacify (Q4).

**One-liner** — Flakiness always has a class — waits, coupling, shared data, environment, timing assumptions, animations, third parties, or a real app race — and the class determines the fix.

### Q2. A test passes locally but randomly fails in CI — investigation playbook

**Interview answer** — Artifacts first, theories second: pull the CI trace, screenshot, and video before touching anything — the trace usually answers it outright. If more context is needed, diff the environments: CI is slower (CPU throttling changes timing), headless, possibly a different viewport, different network latency to the app, and often different test data. Then reproduce deliberately: run the test locally with `--repeat-each=20` under CPU throttle or in the CI container image, aiming to recreate CI's conditions rather than hoping the failure visits my laptop.

**Deep dive** — The environment diff is a checklist, not vibes: CPU (CI runners are slow and shared — races surface there first), headless vs headed (rendering and timing differences; also default viewport differences if config doesn't pin one), display size (responsive breakpoints — a locator hidden behind a collapsed menu at CI's viewport), network RTT to the app under test, data (does CI hit a shared environment other runs mutate?), and parallelism (workers/shards on CI vs 1 local run). Each mismatch is a testable hypothesis, and the trace usually tells you which one to test first — e.g., the failing snapshot showing a hamburger menu where you expected a nav bar closes the case on viewport in one look.

**Follow-ups & traps**
- "First artifact to open?" — Trace. Screenshot for a fast glance, but the trace contains the screenshot's moment *plus* its history and network.
- Trap: starting with "add waits and re-push" — you're perturbing timing blind; the artifacts already know the answer.
- "Can't reproduce locally at all?" — Move the reproduction to CI: temporary job with `--repeat-each`, tracing on all runs, on the same runner class.

**One-liner** — Read the CI artifacts first, then diff local-vs-CI (CPU, headless, viewport, network, data, workers) and reproduce under CI-like conditions on purpose.

### Q3. A test fails once every 50 runs — how do you reproduce and collect evidence?

**Interview answer** — At 2% you stop chasing single runs and set an evidence trap: temporarily switch that test to trace-on-all-runs (`retain-on-failure` at minimum), then run `--repeat-each=50` or more as a dedicated CI job — ideally at high worker counts, since rare flakes are usually contention-shaped. When a failure lands, I have a failing trace to diff against any passing trace. In parallel I bisect the conditions: does it reproduce at workers=1? With a fixed random seed and order? Only when following certain tests? Each axis eliminated narrows the class.

**Deep dive** — Evidence beats reproduction: a rare flake with a trace, video, and correlated app logs is often solvable from *one* occurrence, whereas an unreproduced flake with no artifacts is unsolvable no matter how many times you stare at the code. So maximize evidence per failure — correlation IDs injected into request headers so the app's server logs can be grepped for the exact failing run's requests, timestamps synced, `testInfo.attach` for the seeded data. The repeat-each job math matters too: at a 2% failure rate, 50 repeats gives roughly a 64% chance of catching one, 150 repeats ~95% — so size the job to the observed rate rather than running 10 and concluding "can't reproduce."

```bash
# Dedicated flake-hunt job
npx playwright test orders.spec.ts --repeat-each=150 --workers=8 --trace retain-on-failure
```

**Follow-ups & traps**
- "Repeat 50 passes — flake gone?" — Statistically weak claim at a 2% rate; either raise the repetition count or keep the evidence trap armed in the main pipeline.
- Trap: turning on trace-always suite-wide permanently — artifact bloat; scope it to the suspect test and time-box it.
- "Order-dependent rare flakes?" — Reproduce with the recorded seed of the failing run; that's what seeded random ordering is for.

**One-liner** — Arm traces, size a repeat-each job to the failure rate, bisect by workers/order/seed — and squeeze every failure for evidence via correlation IDs.

### Q4. A test fails, then passes on retry — flaky test or product defect? How do you tell?

**Interview answer** — Retry-passes tells you the failure is nondeterministic — it does *not* tell you which side the nondeterminism lives on, and that's the whole question. I read the failure itself: if the assertion saw wrong *data* — a stale total, an item missing that the test definitely created, state from another request — that smells like a real race in the application, and I check app logs and APM at the failure timestamp for errors or ordering anomalies. If it's a timeout waiting for something that clearly always happens, the suspicion shifts to the test's synchronization. The discriminator is *where the race lives*: in the app's request handling and state management, or in the test's assumptions about timing and data.

**Deep dive** — This is a senior differentiator because the lazy equilibrium — "it passed on retry, ship it" — systematically launders product bugs into test noise. Concrete tells for a product race: the trace's network tab shows responses arriving in an order the app mishandles (e.g., a slow earlier request overwriting a fast later one — last-write-wins bugs); app logs show a 500 or a lock timeout at that moment; the wrong value the assertion saw is a *plausible other state* of the system rather than an empty/loading state. Tells for a test-side cause: the failure is a wait timeout on an element that the after-snapshot shows appearing moments later; the test asserts on data it never arranged; the failure only occurs under parallel data collisions. The habit that operationalizes this: every retry-pass gets a 10-minute trace read before being dismissed — most are test-side, and the minority that aren't are exactly the bugs users hit at scale.

**Follow-ups & traps**
- "Give an example where the flaky test was a real bug." — Any last-write-wins UI race: two rapid saves, responses return out of order, UI shows stale data. The test caught it 1-in-30; production users hit it constantly at higher traffic.
- Trap: classifying by failure step ("it failed at the assertion, so the assertion is wrong") — the assertion is the *messenger*; read what it saw.
- "Who investigates?" — The test owner does first triage; if evidence points app-side, it becomes a product ticket *with the trace attached* — the trace is the reproduction.

**One-liner** — Retry-pass proves nondeterminism, not innocence: read the trace and app logs to find which side of the wire the race lives on.

### Q5. How do you identify flaky tests at scale?

**Interview answer** — Instrument, don't anecdote. Playwright already labels a test *flaky* when it fails then passes on retry, and that status flows through reporters — so I ship results (JSON/blob or a reporter integration) into a dashboard and track failure-and-flake rate per test over a rolling window. That gives a ranked list of the worst offenders by flake frequency and by blast radius (how many CI runs each disrupted), which turns "our suite feels flaky" into a top-ten list with owners.

**Deep dive** — The metrics that matter: per-test flake rate over time (a step change dates the regression to a commit range), suite-level flake rate as a health KPI, time-lost-to-retries as the cost figure that justifies investment, and cluster analysis — many tests going flaky *simultaneously* indicts environment or app, not tests (Q9). Mechanically: a custom reporter or CI post-step posts `status`/`outcome` per test to a store; a `@quarantine` tag (Q6) feeds grep-able triage. The trend view is what prevents the ratchet — suites don't become 30% flaky overnight; they get there one tolerated flake a week.

**Follow-ups & traps**
- "How does Playwright know a test was flaky?" — Outcome accounting across retries: failed-then-passed = `flaky` in the report, distinct from `passed` and `failed`.
- Trap: measuring only pass/fail of the *run* — with retries on, a run can be green while flake rate doubles; you must count retry events.
- "What threshold triggers action?" — Team-defined, but the pattern is: any test above N% flake rate over a window is auto-quarantined and ticketed.

**One-liner** — Pipe per-test outcomes into a trend dashboard, rank by flake rate, and let thresholds — not annoyance levels — trigger quarantine and fixes.

### Q6. What is a quarantine strategy, and why is deleting sometimes right?

**Interview answer** — Quarantine moves a known-flaky test out of the blocking pipeline — tagged `@quarantine`, excluded via grep from the merge gate but still running in a non-blocking job — so the team keeps trust in red builds while the fix is pending. The critical part is that quarantine is a *loan*, not a landfill: every quarantined test gets a ticket, an owner, and a time limit. And sometimes deletion is the honest move: if a test's coverage is duplicated at a cheaper layer, its scenario is low-value, or its fix cost exceeds its information value, a deleted test is better than a permanently quarantined one — the quarantine folder otherwise becomes a place where tests go to be forgotten while pretending to be coverage.

**Deep dive** — Mechanics: tag in the title, `--grep-invert @quarantine` in the merge-blocking job, a separate scheduled job running quarantined tests with tracing on to gather evidence for the fix. Policy is what makes it work: entry requires a ticket; a cap on quarantine size forces prioritization; exceeding the time limit triggers a fix-or-delete decision — explicitly framed, because "we'll fix it someday" is how you accumulate fifty zombie tests. The deletion argument is information-theoretic: a test that's ignored when red provides zero information while still costing runtime and maintenance — negative value. If the scenario matters, rewrite it properly (often at a different layer); if it doesn't, delete without guilt.

**Follow-ups & traps**
- "Isn't quarantine just hiding failures?" — Unmanaged, yes. With ticket-owner-deadline it's triage: protecting the signal of the gate while the fix is queued.
- Trap: quarantining by skipping (`test.skip`) with no tracking — the test silently exits coverage forever.
- "Who approves deletion?" — Whoever owns the coverage map; the question asked is "what regression would this have caught, and what else catches it?"

**Senior/lead angle** — I report quarantine size and age at the same cadence as flake rate: a shrinking quarantine is a healthy program; a growing one is a slow-motion coverage collapse with good optics.

**One-liner** — Quarantine is a ticketed, time-boxed loan that protects pipeline trust — and deleting a low-value flake is honest engineering, not defeat.

### Q7. How do retries work and what do they hide?

**Interview answer** — With `retries: N`, a failed test re-runs up to N times in a fresh worker; pass-on-retry marks it `flaky`, the run stays green. My framing: retries are a *detection mechanism*, not a fix — the flaky status is the valuable output, feeding the tracking in Q5. What they hide is everything nondeterministic: real app races (Q4) get silently absorbed, data corruption from the failed attempt persists, and the team's incentive to fix root causes evaporates because the dashboard is green.

**Deep dive** — Useful mechanics: retries run in a *new* worker process (clean slate — worker fixtures rebuilt), which itself hides a class of bug: anything caused by accumulated worker state passes on retry by construction. For serial groups, retry restarts the whole chain. The budget framing for the trade-off: retries buy *signal* (flaky-vs-failed classification, fewer false-alarm red builds) and cost *masking* (races absorbed) plus *time* (retry minutes on every flaky run). A defensible budget is `retries: 1` in CI paired with mandatory flake tracking and a flake-rate SLO — one retry captures the classification value; anything higher mostly buys deeper masking. Retries are also per-*test* remedies: they do nothing for infra-wide failures (grid down) that need run-level handling.

**Follow-ups & traps**
- "Retries locally?" — Default 0, and keep it that way: during development you want raw failures, not laundered ones.
- Trap: "we set retries=3 and flakiness went away" — it went *invisible*; the flake rate is unchanged and now unmeasured unless you track flaky statuses.
- "First failed attempt's side effects?" — Persist in the backend (order half-created); tests must tolerate their own retry — another argument for unique per-attempt data.

**One-liner** — Retries classify nondeterminism — that's their value; treat pass-on-retry as a tracked defect signal, not as a pass.

### Q8. How do you prevent flakiness by design?

**Interview answer** — Prevention is a stack of defaults, not heroics: web-first assertions everywhere and zero `waitForTimeout` — enforced in review and lint; isolated test data — unique per test, accounts per worker; mocked unstable third parties at the network boundary; deterministic time via `page.clock` for anything timer- or date-driven; animations disabled or `reducedMotion` set; and a stable, dedicated test environment rather than a shared dev sandbox that other teams mutate mid-run. Each item deletes an entire flake class from Q1's taxonomy rather than patching instances.

**Deep dive** — Mapping defenses to classes: web-first assertions (`await expect(locator).toHaveText(...)` auto-retrying to timeout) kill assert-too-early races; the no-`waitForTimeout` rule prevents timing guesses that break on slow CI — every hard wait is either unnecessary (auto-wait covers it) or a disguised missing condition that should be an assertion or `waitForResponse`; per-worker accounts and unique data kill parallel collisions; boundary mocks (`route`, `routeWebSocket`) kill third-party weather; `page.clock` kills token-expiry and countdown nondeterminism; `reducedMotion: 'reduce'` plus CSS animation-disabling kills moving-target misclicks (Q11); environment stability kills the "someone redeployed mid-run" class. Enforcement is what makes it real: lint rules (no `waitForTimeout`, no hardcoded credentials), fixtures that make isolated data the path of least resistance, and a periodic chaos job (high workers, random order, repeat-each) as a regression test *for isolation itself*.

```ts
// The prevention defaults, in config
export default defineConfig({
  use: { contextOptions: { reducedMotion: 'reduce' } },
  fullyParallel: true,
});

// And in style: condition-based sync, never guesses
await expect(page.getByTestId('cart-total')).toHaveText('$129.98'); // retries until true
// not: await page.waitForTimeout(2000)
```

**Follow-ups & traps**
- "One rule with the highest yield?" — Ban `waitForTimeout` and require a condition instead; it forcibly converts hidden timing assumptions into explicit, auto-retried expectations.
- Trap: "we'll fix flakes as they appear" — reactive-only programs plateau; prevention removes classes so the backlog stops refilling.
- "How is isolation enforced rather than encouraged?" — Fixtures own data creation; tests literally don't have credentials to shared accounts.

**Senior/lead angle** — Prevention is a framework property, not author discipline: if writing a flaky test requires *more* effort than writing a stable one, the suite stays healthy through team churn.

**One-liner** — Delete flake classes by default: auto-retrying assertions, no hard waits, isolated data, mocked edges, controlled clock, no animations, stable env.

### Q9. How do you distinguish infrastructure failures from application defects?

**Interview answer** — By signature and by correlation. Signature: infra failures speak in browser crashes, OOM kills, "target closed," connection-refused to the grid or the app, DNS errors — while app defects speak in HTTP 500s from real endpoints, wrong data in assertions, app-side console exceptions. Correlation: infra failures *cluster* — many unrelated tests failing simultaneously on the same runner or time window is the runner dying, not twelve independent bugs; an app defect concentrates on tests touching one feature and reproduces regardless of runner.

**Deep dive** — Operationally I bucket failure messages: a taxonomy layer over test results tags each failure as infra-shaped (`Target page, context or browser has been closed`, `net::ERR_CONNECTION_REFUSED` to your own baseURL before any test succeeds, worker OOM) vs app-shaped (assertion diffs with plausible-but-wrong data, 5xx in the trace's network tab from a real endpoint). This matters for the response: infra failures should *not* be retried test-by-test into a green run — they should fail fast at run level and page whoever owns runners; app-shaped clusters after a deploy should gate the deploy. The mixed case worth knowing: resource exhaustion *caused by the suite* (too many workers for the runner) looks infra-shaped but is a config defect — the tell is that it correlates with worker count, not with runner instance.

**Follow-ups & traps**
- "Whole run failed with connection refused — what first?" — Check whether the app/environment was even up (deploy overlap, environment TTL) before reading a single test log.
- Trap: treating an infra outage as 200 individual flaky tests — pollutes the flake metrics and hides real flake trends.
- "How do you make this automatic?" — Error-message classifiers in the results pipeline; runs with >N% infra-shaped failures get labeled infra-incident and excluded from per-test flake stats.

**One-liner** — Infra fails in clusters with crash/connection signatures; app defects fail coherently around a feature with data-shaped errors — classify before you triage.

### Q10. Screenshots vs videos vs traces vs logs vs network data — what is each for?

**Interview answer** — One map: the **screenshot** is the cheapest glance — final state at failure, enough to spot "wrong page entirely" in two seconds. The **video** shows motion — animations, layout jank, something flashing and vanishing — things static artifacts can't convey. The **trace** is the primary forensic tool — inspectable DOM at every step plus network plus console, answering "what did the test see and do." **App logs** (server-side) answer what the *backend* did — the half of the story no browser artifact contains. **Network data** (trace network tab or HAR) is the wire between them — payloads and status codes that assign blame to frontend or backend.

**Deep dive** — The skill being probed is investigation economy: glance at the screenshot (2 seconds — is this even the right screen?); open the trace (minutes — usually sufficient); video only if the trace hints at motion; server logs when the trace shows a correct request getting a wrong response — at which point the investigation legitimately crosses the wire and needs a correlation ID to continue efficiently (inject a test-run header via route so server logs are greppable per test). Knowing which artifact *cannot* answer a question is as important: a screenshot can't tell you why, a video can't show a payload, a trace can't see inside the server.

**Follow-ups & traps**
- "One artifact only — which?" — Trace; it embeds screenshots-equivalent snapshots and network, and covers the most question types per megabyte.
- Trap: watching a 90-second video end-to-end as the first move — the trace timeline gets you to the failure moment instantly.
- "When are server logs the decisive artifact?" — Whenever the trace shows request-in-good / response-bad: the bug is behind the API and no browser artifact will name it.

**One-liner** — Screenshot to glance, trace to investigate, video for motion, network data to assign blame across the wire, server logs to continue past it.

### Q11. An animation causes intermittent misclicks — what are the fixes?

**Interview answer** — The failure mode: Playwright computes a click point while the element is mid-transition, and the click lands where the element *was*. Fixes in preference order: set `reducedMotion: 'reduce'` in context options so apps that respect `prefers-reduced-motion` simply don't animate; inject CSS that zeroes animation and transition durations for apps that don't; and lean on Playwright's own stability check — actionability waits for the element's bounding box to hold still across frames — which handles most cases automatically, failing only for oddly-implemented motion (e.g. transforms on a parent, or elements that re-animate on hover).

**Deep dive** — Playwright's stability check compares element position across two animation frames — that's why most animated UI works out of the box, and why the surviving failures are structurally interesting: infinite/looping animations near the target (stability never settles → timeout), parent-level transforms the child's box doesn't reflect, and animations *triggered by the hover* that precedes the click. CSS injection is the universal hammer:

```ts
// Global: contexts prefer reduced motion
export default defineConfig({ use: { contextOptions: { reducedMotion: 'reduce' } } });

// Per-page hammer for apps that ignore prefers-reduced-motion
await page.addStyleTag({
  content: `*, *::before, *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }`,
});
```

For entrance transitions (drawer sliding in), the clean pattern is asserting a *post-animation* condition first — e.g. `await expect(drawer.getByRole('button', { name: 'Confirm' })).toBeVisible()` then click — letting the auto-retry absorb the transition.

**Follow-ups & traps**
- "Doesn't disabling animations reduce realism?" — Slightly and deliberately: you trade motion realism for determinism; if animation behavior itself needs coverage, that's a separate, targeted test.
- Trap: `force: true` to bypass the stability check — it clicks coordinates regardless of state, converting an intermittent failure into an intermittently *wrong* click.
- "Why does it pass locally, fail in CI?" — Slower CI CPU stretches animation frames, widening the mid-transition window.

**One-liner** — Prefer reduced motion, kill animations with injected CSS where needed, and let actionability's stability check do its job — never `force: true`.

### Q12. Your team wants auto-retry ×3 to make the dashboard green — argue the trade-off

**Interview answer** — I'd frame it as buying optics with signal. What retries×3 buys: fewer red builds from transient noise, less time re-running pipelines, an unblocked merge queue — real, legitimate value. What it costs: real intermittent product bugs (Q4) now auto-classify as noise and ship; the flake rate keeps growing unmeasured because the dashboard no longer reflects it; suite time inflates with every retried run; and the team's incentive to fix root causes disappears — green dashboards don't generate tickets. My counter-proposal: `retries: 1`, mandatory — with every flaky outcome tracked on a dashboard (Q5), a flake-rate SLO with an owner, and auto-quarantine above threshold (Q6). That keeps the pipeline usable *and* keeps the problem visible and priced.

**Deep dive** — The lead-level insight is that retry count is a policy about *whose problem flakiness is*. Retries×3 with no tracking makes it nobody's problem — costs are diffused into CI minutes and occasional shipped races. Retries×1 with tracking makes it a measured, owned problem with a budget. There's also a probabilistic honesty point: a test failing 30% of the time passes within three retries ~97% of the time — retries×3 can absorb even *severely* broken tests, so the dashboard's green stops correlating with suite health at all. The negotiation reality: teams reach for retries under delivery pressure, so the counter must acknowledge the pain (red-build fatigue is real and corrosive) while redirecting to the version that doesn't destroy the measurement — you can't fix what you've made invisible.

**Follow-ups & traps**
- "Is retries: 0 in CI the principled choice?" — Principled but usually impractical at scale: one transient blip failing a 40-minute pipeline breeds re-run culture, which is retries with worse ergonomics and no classification.
- Trap: conceding "retries are bad" absolutely — the interviewer wants the *trade-off*, not a slogan; retries-with-tracking is a defensible engineering position.
- "What makes the tracking real rather than theater?" — A threshold that triggers action automatically (quarantine + ticket), reviewed at a fixed cadence with a named owner.

**Senior/lead angle** — The dashboard exists to change decisions — deploy or don't, investigate or don't. Any policy that makes it greener without making the system better is decay of the instrument itself, and instrument decay is a lead's problem to veto.

**One-liner** — Retries buy pipeline usability at the price of masked signal — cap at one, track every flaky outcome, and keep flakiness a measured problem with an owner.
