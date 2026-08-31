# Scaling, API+UI+DB Integration & Observability (Staff-Level)

This file collects the questions that separate staff-level candidates: platform design across teams, CI runtime economics, cross-layer verification, and treating the test system itself as a product with observability and health metrics. Most answers here assume you own automation for an organization, not a suite.

- Q1. How would you architect an automation platform for multiple teams?
- Q2. How would you scale Playwright to thousands of tests?
- Q3. How would you reduce CI execution time from hours to minutes?
- Q4. How would you design test isolation for massive parallel execution?
- Q5. How would you design test-data management for thousands of parallel tests?
- Q6. How would you design environment management for QA/staging/prod-like at org scale?
- Q7. How would you build observability into an automation framework?
- Q8. How would you design failure diagnostics so developers debug CI failures without local repro?
- Q9. How would you architect combined API + UI + DB automation?
- Q10. Create an order via API and verify it in the UI — walk through the design
- Q11. The UI says the order was created — how do you verify it was actually saved correctly?
- Q12. A login button enables only after an API call — automate this
- Q13. How would you verify UI data against backend/API data at scale?
- Q14. How would you decide between mocking, stubbing, contract testing, API testing, and E2E?
- Q15. How would you prevent automation from becoming a maintenance burden?
- Q16. How would you measure the health of an automation framework?
- Q17. SQL for SDETs: three worked queries

### Q1. How would you architect an automation platform for multiple teams?

**Interview answer** — Platform-team model with a paved road, not mandates: a small platform group owns a shared core package — fixtures, API clients, config, lint rules — plus golden-path templates, central CI infrastructure, and org-wide dashboards; feature teams own their own tests entirely. The platform's product is leverage: make the right way the easy way, and teams adopt it because it's faster than rolling their own, not because a policy says so.

**Deep dive** — The two failure modes this design steers between: full centralization — a QA platform team writing everyone's tests becomes a bottleneck, owns failures it can't diagnose, and teams disengage from quality; and full federation — ten teams build ten frameworks, solve auth ten times, and none has dashboards. The paved road splits responsibilities along the leverage line: things that are the same for everyone (auth fixtures, reporting pipeline, CI templates, env config schema) are platform; things requiring domain knowledge (which tests, what they assert, their data recipes) are teams'. Mandates enter only at true org-level interfaces — results must flow to the central warehouse, suites must be tag-addressable — because dashboards and release gates need uniformity there. Adoption is the platform's success metric, and it's earned: onboarding a new repo must take under a day via template, migration guides must exist (file 01, Q13), and the platform team must staff support like a product team — office hours, a triage channel, changelogs. The political honesty that lands well in interviews: a paved road with potholes gets abandoned no matter how official it is, so platform capacity must include maintenance, not just feature work.

**Code / structure**

```text
platform owns                          teams own
  @org/e2e-core (fixtures, clients,      their tests + page objects
    config schema, lint rules)           their data recipes (file 02, Q12)
  repo template ("create-e2e-suite")     their tags, their triage rota
  shared CI workflows (shard, merge,     their suite budgets
    report, warehouse upload)
  results warehouse + dashboards       mandated interfaces (only these):
  env/preview tooling                    results → warehouse schema
  support: office hours, changelog       tags follow org taxonomy
```

**Follow-ups & traps**
- "A team refuses the platform and keeps its Cypress suite — what do you do?" — ask what the paved road is missing; often they're right. Require only the mandated interfaces (results, tags), and let migration happen when the road is genuinely better.
- "How big is the platform team?" — small and leverage-focused: 2–4 engineers for a 10–20-team org; if it needs more, it's probably writing tests it shouldn't own.
- Weak answer: "a central automation team maintains the regression suite for all teams" — the bottleneck model; scale kills it and ownership ambiguity kills triage.

**Senior/lead angle** — Run the platform as a product: adoption rate, onboarding time, support-ticket themes, and "capabilities reinvented outside the core" as the KPI set — and defend its funding with the duplicate-work arithmetic (ten teams × solved-once problems).

**One-liner** — Shared core, golden templates, central dashboards — the platform paves the road, teams drive on it, and only the results pipeline is mandatory.

### Q2. How would you scale Playwright to thousands of tests?

**Interview answer** — Four mechanisms stacked: sharding across machines with blob-report merging, so wall-clock scales with machine count; tag-based slicing so no trigger runs everything — PRs run smoke plus affected areas, nightly runs breadth; test-impact analysis mapping diffs to affected suites; and in a monorepo, task orchestration (Nx/Turborepo) so only changed projects' suites execute at all. Each suite gets a runtime budget with alerts, because at this scale runtime regressions arrive weekly and silently.

**Deep dive** — The scaling math first: 3,000 tests × 30 s average is 25 test-hours; at 10 shards × 4 workers that's ~37 minutes of wall-clock — acceptable for nightly, far too slow per-PR, which is why selection (tags, impact analysis, affected-graph) matters as much as raw parallelism: the per-PR goal is running the right 5% fast, not all 100% at any speed. Sharding mechanics that bite in practice: shard balance is capped by your slowest test (split anything over ~90 s), sharding requires stateless CI runners and merged reporting (`--shard` plus blob reports merged in a fan-in job), and flake multiplies at scale — 0.5% flake across 3,000 tests is 15 false reds per full run, so the flake SLO and quarantine machinery (file 04, Q9) are load-bearing here, not hygiene. Impact analysis has two tiers: cheap path-to-tag mapping (checkout code changed → run @checkout) catches most of it; coverage-based impact tooling is more precise but costs infrastructure — start cheap. Monorepo orchestration is the outermost filter: Nx's affected-graph means an untouched service runs zero tests, which no amount of sharding matches.

**Code / structure**

```yaml
# fan-out / fan-in sharding with report merge
jobs:
  test:
    strategy: { matrix: { shard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } }
    steps:
      - run: npx playwright test --grep "${{ needs.select.outputs.tags }}" \
               --shard=${{ matrix.shard }}/10
      - uses: actions/upload-artifact@v4
        with: { name: blob-${{ matrix.shard }}, path: blob-report }
  merge:
    needs: test
    steps:
      - run: npx playwright merge-reports --reporter html ./all-blobs
      - run: ./scripts/upload-results-to-warehouse.sh   # Q7: every run feeds telemetry
```

**Follow-ups & traps**
- "Shards finish at 12, 14, and 31 minutes — diagnosis?" — imbalance from slow tests or file-level clustering; find the >90 s tests in the warehouse, split them, and let the runner rebalance.
- "Why not one giant machine with 64 workers?" — worker contention on CPU/network and a single point of failure; horizontal shards scale linearly and retry independently.
- Weak answer: "increase workers and use sharding" with no selection story — parallelism without slicing means every PR pays for all 3,000 tests forever.

**Senior/lead angle** — Budget per suite, enforced by trend alerts, and publish the cost line: shards × machine-minutes × runs/day is real money — the staff conversation is runtime *economics*, not just runtime.

**One-liner** — Shard for wall-clock, slice by tags and impact for per-PR speed, orchestrate by affected-graph in monorepos — and give every suite a budget with an alarm on it.

### Q3. How would you reduce CI execution time from hours to minutes?

**Interview answer** — An ordered playbook, measuring after each step: first the parallelism arithmetic — total test-minutes divided by workers × shards sets the floor, and getting from 1 machine to 8 shards is usually a 5–8x wall-clock win; second, kill UI-based setup — API login and API data arrangement typically reclaim 20–40% of all test-minutes; third, delete e2e tests duplicated by cheaper layers; fourth, split suites by trigger so PRs never run what nightly should own; then caching and runner sizing for the last few minutes of overhead.

**Deep dive** — Do the arithmetic aloud — it's what the question tests. Example: 2 hours wall-clock, single machine, 4 workers ⇒ ~480 test-minutes. Target 10 minutes: 480 / 10 = 48 effective workers ⇒ 12 shards × 4 workers. That's rentable today — but shards inherit overhead (checkout, install, browser boot: 1–3 min each), so caching dependencies and prewarming images is what keeps 12 shards from paying 36 minutes of collective startup tax. Then attack test-minutes themselves: if 600 tests each spend 8 s in UI login, that's 80 test-minutes — one storageState setup project deletes almost all of it. Deletion (file 04, Q14) and trigger-splitting change the demand side: the PR gate needs smoke plus affected tags, not breadth — moving breadth to nightly is often the single biggest per-PR win and costs zero engineering. The trap to name: retries — a 5% flake rate with 2 retries silently adds ~10% runtime and masks the rot; flake reduction is speed work. Sequence matters for credibility: measure per-test durations from the warehouse first, because optimizing without the histogram means anecdote-driven engineering.

**Code / structure**

```text
worked example: 2 h wall-clock → ~10 min
  0. telemetry: per-test durations, setup share, flake rate      (know the shape)
  1. 12 shards × 4 workers: 480 test-min / 48 ≈ 10 min + overhead
  2. cache deps + browsers, prewarmed runners: overhead 3 min → 1 min/shard
  3. storageState auth + API arrange: −80 to −150 test-minutes   (fewer shards needed)
  4. delete/demote duplicated e2e: −10–20% test-minutes, forever
  5. trigger split: PR = smoke + affected (≈5 min); nightly = breadth
  guard: flake SLO — retries are hidden runtime and hidden lies
```

**Follow-ups & traps**
- "Budget for 4 shards only — where do the minutes come from?" — demand side: trigger-splitting and API setup are free; the arithmetic shows supply (shards) and demand (test-minutes) are interchangeable levers.
- "Won't deleting tests reduce coverage?" — deleting *duplicated* coverage reduces runtime, not information (file 04, Q14); bring the overlap analysis, not vibes.
- Weak answer: "parallelize and cache" without numbers — the question is arithmetic wearing a process costume; no numbers, no credit.

**Senior/lead angle** — Frame it as capacity planning: cost per green build and developer-minutes waiting per day are the numbers that justify the shard bill — a 90-minute pipeline across 40 engineers × 6 runs/day is a salary's worth of waiting every month.

**One-liner** — Divide test-minutes by workers-times-shards, then shrink the test-minutes themselves — API setup, deletion, and trigger splits — and remember retries are runtime you're paying to hide problems.

### Q4. How would you design test isolation for massive parallel execution?

**Interview answer** — Isolation by construction, four rules: stateless tests — nothing persists between tests except what fixtures own; per-worker identity — every worker gets its own accounts and sessions, minted at worker start; data namespacing — every created record carries run and worker markers so collisions are impossible and cleanup is targeted; and no shared mutable environment state — global settings, feature flags, and singleton entities are either read-only to tests or serialized into a dedicated non-parallel lane. Idempotent seeding closes the loop: setup that can run twice safely survives retries and crashed workers.

**Deep dive** — At hundreds of concurrent workers, "usually fine" races become daily failures, so the design target is impossibility, not improbability. The hardest category is the shared singleton — org-wide settings, the one admin panel, a global feature flag: two tests toggling it interleave and both fail mysteriously. Three escapes, in preference order: make the setting per-tenant so each worker gets its own (best — push testability into the app); route all flag/settings mutation through a fixture that scopes it per-test-tenant; or quarantine the truly-global mutations into a serial project that runs alone — a small, explicit slow lane beats implicit races everywhere. Idempotent seeding is under-appreciated: retried tests and requeued shards re-run arrange steps, so "create user X" must be "ensure user X" or uniqueness must make re-creation harmless — non-idempotent setup turns every infra hiccup into a data-collision mystery. The verification practice that keeps you honest: CI runs with worker counts higher than production settings occasionally (stress the races out), and any test that requires serial mode must carry a comment saying which shared state forces it — undocumented serialization is where isolation debt hides.

**Code / structure**

```ts
// per-worker tenant: the strongest isolation primitive available
export const test = base.extend<{}, { tenant: Tenant }>({
  tenant: [async ({}, use, workerInfo) => {
    const api = await platformApi();
    const tenant = await api.ensureTenant(`e2e-${RUN_ID}-w${workerInfo.workerIndex}`); // idempotent
    await use(tenant);            // every test in this worker operates inside it
    await api.archiveTenant(tenant.id);
  }, { scope: 'worker' }],
});
```

```text
shared-state decision ladder:
  can it be per-tenant/per-worker?  → make it so (app testability ask)
  can mutation be fixture-scoped?   → scope + restore in teardown
  truly global (billing mode, etc.) → serial project, documented reason
```

**Follow-ups & traps**
- "Isolation makes each test slower (own data, own login) — worth it?" — per-worker scoping amortizes the cost, and the alternative is flake that costs triage time on every run; isolation is the precondition for the parallelism that pays for it.
- "How do you find existing isolation violations?" — run the suite with shuffled ordering and elevated workers; failures that appear are your violation list.
- Weak answer: "each test cleans up after itself" — cleanup is not isolation; a test that shares an account mid-flight collides long before teardown runs.

**Senior/lead angle** — Push isolation into the product: multi-tenancy hooks, per-tenant flags, and test-support APIs are application features — the staff move is getting "testability" onto the app teams' roadmap instead of compensating in the framework forever.

**One-liner** — Stateless tests, per-worker identity, namespaced data, and no shared mutable state — design collisions to be impossible, and give the truly-global bits an explicit slow lane.

### Q5. How would you design test-data management for thousands of parallel tests?

**Interview answer** — The staff summary of what file 02 details: a self-service data service where tests declare needs ("an approved seller with three listings") and recipes owned by each entity's team fulfill them; platform-level namespacing, quotas, and reaper jobs on shared environments; and ephemeral per-PR environments to delete contention outright for the majority of runs. Ownership is the load-bearing choice: recipes live with the teams that own the entities, so the data layer doesn't fossilize other teams' internals.

**Deep dive** — What changes at org scale is the coupling topology, not the techniques: builders and factories still do the work, but who owns them decides whether the system survives refactors. A central data team hardcoding every domain's creation logic becomes a change-review bottleneck and a knowledge museum; recipe ownership distributes the maintenance to where the knowledge lives, and the platform's job shrinks to the orchestration layer — API, tagging, quotas, latency dashboards. The two capacity problems worth naming: provisioning latency (a data service adding 2 s to every test's arrange step at thousands of tests is hours of compute — so recipes cache, pool pre-provisioned entities, and expose bulk endpoints) and shared-env crowding (quotas per team plus the reaper keep one runaway suite from degrading everyone's runs). Ephemeral environments change the demand curve: most data isolation happens by not sharing a database at all, and the shared-env machinery remains only for long-lived integration environments.

**Code / structure**

```text
architecture (summary of file 02, Q12):
  data service API   declare needs → recipes resolve; SDK in the shared core
  recipe registry    owned per entity team; versioned; latency SLO per recipe
  platform layer     run/team tagging · quotas · reaper · p95 dashboards
  ephemeral envs     per-PR DB from seeded snapshot → contention removed
  pooling            pre-provisioned common entities (users, tenants) leased per run
```

**Follow-ups & traps**
- "Where does this design fail first?" — recipe latency under load; that's why pooling and bulk endpoints are in the design from day one, not bolted on after the first 40-minute arrange-phase incident.
- "Why should the payments team maintain a test-data recipe?" — because the alternative is every other team coupling to payments internals and breaking on their refactors; the recipe is a published contract, cheaper than the support burden it replaces.
- Weak answer: repeating single-suite practices (faker, cleanup hooks) — correct locally, unresponsive to the cross-team coupling and capacity questions actually being asked.

**Senior/lead angle** — The rollout is the skill: start with the two entities everyone re-creates, prove p95 latency, expand recipe-by-recipe — and report "arrange-phase minutes saved per week" to keep the funding attached.

**One-liner** — Declarative data service, recipes owned by entity owners, quotas and reapers on shared envs — and ephemeral environments so most runs never share a database to fight over.

### Q6. How would you design environment management for QA/staging/prod-like at org scale?

**Interview answer** — Four pieces: an environment registry — a machine-readable catalog of every env, its owner, its app versions, and its declared capabilities, so tooling and humans stop relying on tribal knowledge; capability flags consumed by test suites so env differences are declared, not discovered; ephemeral per-PR environments to absorb the functional-testing load that causes most contention; and for the long-lived envs that remain, an explicit booking or partitioning scheme so "who broke staging" has an answer.

**Deep dive** — The registry is the keystone because everything else consults it: suites read capabilities from it (skip-with-reason instead of fail-with-mystery — file 03, Q8), CI pipelines resolve "run against staging" through it, drift detection diffs its declared state against reality on a schedule, and the ownership column makes every env failure routable (file 03, Q10). Contention on shared envs has two workable answers and one failed one: the failed one is politeness ("check Slack before deploying to staging"); the workable ones are time-partitioning (booking windows for disruptive work, enforced by the deploy pipeline consulting the registry) and space-partitioning (namespace/tenant isolation within one env, which multi-tenant architectures get cheaply). Ephemerals shift the whole demand curve — when functional e2e runs on per-PR stacks, long-lived staging serves only integration soak, performance, and release rehearsal, and its contention drops accordingly. The version dimension needs stating: at org scale, envs run different service versions by design (staging ahead, prod-like at release candidate), so the registry tracks versions and suites gate on minimums — a suite silently testing last week's build is worse than a red one.

**Code / structure**

```yaml
# environment registry entry (consumed by suites, CI, drift checks)
staging:
  owner: platform-team          # pager target for env-classified failures
  purpose: [integration, release-rehearsal]
  capabilities: [payments-sandbox, sso, search-real]
  versions: { app: 2.14.x, api: 2.14.x }        # drift check diffs vs live
  booking: required-for-disruptive              # deploy pipeline enforces
  data-policy: reaper-48h, seeded-nightly
preview-*:
  owner: ephemeral (creator)
  purpose: [pr-functional]
  ttl: close-of-pr
```

**Follow-ups & traps**
- "Registry sounds like process overhead — is it?" — it's ~30 lines of YAML per env replacing the Slack archaeology every incident currently requires; the overhead argument inverts at the second env-caused outage.
- "How many long-lived envs should an org have?" — as few as purposes demand: one integration, one release-rehearsal/prod-like is often enough once ephemerals exist; every additional env is standing drift-management cost (file 03, Q8).
- Weak answer: describing env *configuration* (dotenv files) when asked about env *management* — the question is fleet-level: ownership, contention, drift, and versions.

**Senior/lead angle** — Treat the environment fleet as a product with a budget: cost per env per month, utilization, and env-caused red-build hours — the registry gives you the inventory, and the metrics tell you which envs to kill.

**One-liner** — A registry that makes envs machine-knowable, capabilities that make differences declared, ephemerals that absorb contention — and every env has an owner and a purpose or it gets deleted.

### Q7. How would you build observability into an automation framework?

**Interview answer** — Two directions of visibility. Into the system under test: every test run carries a correlation ID sent to the app via headers, so a test failure links directly to the app-side logs and traces it caused. Into the test system itself: every run ships structured metadata — test, duration, outcome, retries, env, commit — to a results warehouse, powering dashboards for pass rate, duration trends, and flake, with alerting on suite health trends rather than individual failures.

**Deep dive** — The correlation ID is the highest-leverage integration nobody builds: a header like `x-test-run-id` propagated by the app into its logging/tracing means "why did this test fail" becomes a query — the app's distributed trace for exactly the requests the test made — instead of a recreation exercise. It also works in reverse: app-side errors tagged with test IDs let platform teams see which tests exercise which services. The warehouse side turns anecdotes into instruments: per-test duration histories (feeds Q2's shard balancing and file 04's deletion reviews), flake detection by pass-on-retry pattern rather than human complaint, and failure clustering by error signature across the org — thirty tests failing tonight with the same connection-refused signature is one env incident, not thirty investigations. The alerting philosophy matters: individual test failures are the job of the CI gate; observability alerts on distribution shifts — pass-rate drop across suites, duration trend inflection, flake-inflow spike — the signals that mean the *system* is sick rather than a test is red. Practically the whole pipeline is a custom reporter plus a warehouse table plus one dashboard — a week of platform work that upgrades every argument about the suite into a query.

**Code / structure**

```ts
// correlation: every request the test makes is traceable app-side
export const test = base.extend<{ runContext: RunContext }>({
  context: async ({ context }, use, testInfo) => {
    const testRunId = `${process.env.CI_PIPELINE_ID}-${testInfo.testId}`;
    await context.setExtraHTTPHeaders({ 'x-test-run-id': testRunId });
    await use(context);
  },
});
```

```text
warehouse row (per test, per run — the custom reporter emits this):
  run_id · test_id · file · tags · outcome · retries · duration_ms
  env · shard · commit_sha · error_signature · trace_url
dashboards: pass-rate by suite/day · duration p95 trend · flake inflow
alerts:     pass-rate delta >5% day-over-day · suite duration trend +20%
            · error-signature cluster spanning >N tests (env incident)
```

**Follow-ups & traps**
- "What's the first dashboard you'd build?" — flake inflow and pass-on-retry, because trust in the gate decays fastest and invisibly; duration trends second.
- "The app team won't propagate your header — worth pushing?" — yes, quantified: minutes-per-triage with and without correlated app logs; it's usually a one-middleware change on their side.
- Weak answer: "good HTML reports and screenshots" — reporting is per-run archaeology; observability is cross-run instrumentation — the question asks for the second.

**Senior/lead angle** — The warehouse is the platform's memory: it powers prioritization (file 04, Q7), deletion reviews (Q14), shard balancing, and the health scorecard (Q16) — one investment, five instruments, which is exactly the leverage argument that funds it.

**One-liner** — Correlate every test request into the app's telemetry, ship every result into a warehouse, and alert on distribution shifts — observability is what turns suite arguments into queries.

### Q8. How would you design failure diagnostics so developers debug CI failures without local repro?

**Interview answer** — The design goal is a complete crime scene per failure: trace, video, console, and network from the test side; correlated application logs via the run ID; and the relevant API and DB state attached at failure time. Delivery matters as much as capture: a PR comment with a direct link to the hosted trace — one click from red check to stepping through the failure — because a diagnostic bundle nobody can reach in one click doesn't exist.

**Deep dive** — Playwright's trace is the foundation — DOM snapshots per action, network, console, all replayable in a browser — configured `on-first-retry` for cost balance, `on` for nightlies where triage is batch. The gaps a trace doesn't cover are where design earns its keep: server-side state (the trace shows a 500, not why — the correlation ID from Q7 links to app logs and distributed traces), and data state (what the order actually looked like in the API and DB at failure — captured by an on-failure fixture that snapshots relevant entities into `testInfo` attachments). Hosting is the unglamorous half: traces as raw CI artifacts require download-unzip-open, which kills adoption — serve them from a trace viewer URL (static hosting suffices) and post that link, plus the failure step and error, as the PR comment. The payoff is measurable: mean-time-to-diagnose drops from "clone, rebuild, guess" to minutes, and — the second-order effect that matters organizationally — developers stop reflexively reassigning failures to QA, because the evidence arrives pre-assembled (file 04, Q16's classification protocol becomes cheap enough to actually happen).

**Code / structure**

```ts
// on-failure state capture: the crime scene beyond the browser
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [async ({ api, db }, use, testInfo) => {
    await use();
    if (testInfo.status !== testInfo.expectedStatus) {
      const orderIds = testInfo.annotations.filter(a => a.type === 'order').map(a => a.description!);
      for (const id of orderIds) {
        await testInfo.attach(`api-order-${id}`, {
          body: JSON.stringify(await api.get(`/orders/${id}`), null, 2), contentType: 'application/json' });
        await testInfo.attach(`db-order-${id}`, {
          body: JSON.stringify(await db.query('SELECT * FROM orders WHERE id = $1', [id])), contentType: 'application/json' });
      }
    }
  }, { auto: true }],
});
```

```text
delivery pipeline:
  trace/video on-first-retry → upload → hosted trace-viewer URL
  PR comment per failure: test name · failing step · error ·
    [view trace] · [app logs (run-id query)] · attached API/DB state
  MTTD tracked in the warehouse: time from red check to classification
```

**Follow-ups & traps**
- "Isn't capturing all this expensive?" — capture on failure/retry only; passing tests cost nothing extra, and one avoided local-repro cycle repays a month of artifact storage.
- "What about the auth headers inside those traces?" — file 03 Q4's answer applies: scrubbing, restricted retention, and short-lived tokens — the crime scene must not itself be a leak.
- Weak answer: "screenshots and videos on failure" — 2015's answer; without network, app logs, and data state, the developer still has to reproduce to learn anything.

**Senior/lead angle** — Measure mean-time-to-diagnose per failure and treat it as a platform KPI — it's the number that converts "nice tooling" into "each developer saves N hours a month," which is the language that funds diagnostics work.

**One-liner** — A failure should arrive as a complete crime scene — trace, correlated app logs, and captured data state — one click from the PR, or developers will keep reproducing locally forever.

### Q9. How would you architect combined API + UI + DB automation?

**Interview answer** — Layered clients injected as fixtures: an `ApiClient` and a `DbClient` alongside the page, so every test can arrange, act, and assert through whichever layer fits. The pattern is arrange via API — fast, reliable state creation; act via UI — the behavior under test; assert via API and DB — verifying what the system actually persisted, not just what it rendered. Each client is typed, environment-aware from shared config, and the DB client is read-mostly by convention.

**Deep dive** — The architecture prevents two degenerate forms: UI-only suites (slow arrange, shallow asserts — the rendered page is a projection, not the truth) and grab-bag suites where tests open ad-hoc DB connections with hardcoded strings. Fixture injection solves lifecycle and discipline together: connections pool per worker and close in teardown, credentials flow from config, and the client surface defines what tests may do — the DbClient exposing `query` but not raw connection handles keeps convention enforceable. The DB-assert judgment call matters: asserting through the API is preferred where an endpoint exists (contract-stable, survives schema refactors); direct DB assertions are for what no API exposes — audit rows, denormalized projections, soft-delete flags — and they knowingly couple the test to schema, a cost you accept explicitly, not accidentally. Async consistency is the recurring integration bug: writes propagate through queues and projections, so cross-layer assertions poll with timeout (`expect.poll`) rather than assuming read-your-write.

**Code / structure**

```ts
// fixtures: three layers, one injection point
export const test = base.extend<{ api: ApiClient; db: DbClient }>({
  api: async ({ request }, use) => use(new ApiClient(request, env.API_BASE_URL)),
  db: [async ({}, use) => {
    const db = await DbClient.connect(env.DB_READ_URL);   // read-replica creds
    await use(db);
    await db.close();
  }, { scope: 'worker' }],
});

// the full pattern: arrange API → act UI → assert API + DB
test('checkout persists a correct order', async ({ page, api, db, cartFactory }) => {
  const cart = await cartFactory.create({ items: [{ sku: 'SKU-1', qty: 2 }] }); // arrange: API

  await page.goto(`/checkout?cart=${cart.id}`);                                  // act: UI
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  const orderId = await page.getByTestId('order-number').innerText();

  const apiOrder = await api.get(`/orders/${orderId}`);                          // assert: API
  expect(apiOrder.totalCents).toBe(2990);

  await expect.poll(async () =>                                                  // assert: DB (async-safe)
    (await db.query('SELECT status, total_cents FROM orders WHERE external_id = $1', [orderId])).rows[0],
  ).toEqual({ status: 'CONFIRMED', total_cents: 2990 });
});
```

**Follow-ups & traps**
- "Why not assert everything in the DB — it's the source of truth?" — schema coupling: every migration breaks tests that an API assert would survive; DB asserts are scoped to what APIs don't expose.
- "Where do DB credentials for tests come from?" — read-replica or scoped read-only user via the secret store (file 03, Q3); test suites with write access to shared DBs are an incident pending.
- Weak answer: "I use the API for speed" without the assert-side story — the architecture's point is verification depth, not just fast setup.

**Senior/lead angle** — Ship both clients in the shared core with the conventions baked in (read-only DB surface, config-driven, worker-scoped pooling) — cross-layer testing becomes the org default instead of each team's ad-hoc invention.

**One-liner** — Arrange via API, act via UI, assert via API and DB — three typed clients in fixtures, with polling for async truth and schema coupling only where no API exists.

### Q10. Create an order via API and verify it in the UI — walk through the design

**Interview answer** — The API call lives in a factory fixture that tracks the order for teardown; the test creates the order, opens the UI at the order's page, and asserts the rendered details match what the API returned — using web-first assertions, plus polling if order visibility is eventually consistent. Design details that matter: an idempotency key on creation so retries can't double-create, and assertions that compare against the API response rather than re-hardcoding expected values.

**Deep dive** — The consistency question is the heart of the walk-through: between the API write and UI visibility there may be a queue, a projection, a search index, or a cache — so the design assumes asynchrony by default. First preference is an event-based UI wait (`toBeVisible` already retries); when the entity might not be listed yet at page load, `expect.poll` against the API's read endpoint before navigating — or reloading within a poll — handles propagation without a single hard sleep. Idempotency matters because Playwright retries and CI requeues re-run the arrange step: an `Idempotency-Key` header (or unique client reference) means a retried test can't create a second order that then breaks a count assertion elsewhere. Asserting against the API response, not constants, keeps one source of truth: the test verifies the UI *faithfully renders the system state*, which is this test's actual job — total formatting, status label mapping, item rows — while correctness of the total itself belongs to an API-layer test (file 04, Q12's division of labor).

**Code / structure**

```ts
test('API-created order renders correctly in UI', async ({ page, api, orderFactory }) => {
  const order = await orderFactory.create(b => b
    .withItems([{ sku: 'SKU-COFFEE', qty: 3 }])
    .withIdempotencyKey(`e2e-${RUN_ID}-${randomUUID()}`));       // retries can't double-create

  // handle async propagation: wait until the read model has it
  await expect.poll(() => api.get(`/orders/${order.id}`).then(o => o.status),
    { timeout: 15_000 }).toBe('CONFIRMED');

  await page.goto(`/account/orders/${order.id}`);
  await expect(page.getByRole('heading', { name: `Order ${order.number}` })).toBeVisible();
  await expect(page.getByTestId('order-total')).toHaveText(formatMoney(order.totalCents)); // API is the oracle
  for (const item of order.items) {
    await expect(page.getByRole('row', { name: new RegExp(item.sku) })).toContainText(String(item.qty));
  }
});
```

**Follow-ups & traps**
- "Why poll the API instead of reloading the UI page in a loop?" — poll the layer where the delay lives: if the read model lags, UI reloads just burn time rendering; poll cheap (API), then load UI once.
- "What if order creation has no API?" — that's a testability gap to escalate (file 02, Q11); the fallback ladder is DB seeding with eyes open, never UI-driven arrange for a UI-verification test.
- Weak answer: create, `waitForTimeout(5000)`, assert — the hard sleep is the classic tell; asked precisely to see if the candidate reaches for event-based waiting and polling.

**Senior/lead angle** — Generalize the pattern into the core: a `pollUntilVisible(api, entity)` helper plus the idempotent factory convention makes "API-arrange, UI-verify" the paved road for every team's integration tests.

**One-liner** — Factory-created with an idempotency key, API-polled until consistent, UI-asserted against the API response as oracle — and not a hard sleep in sight.

### Q11. The UI says the order was created — how do you verify it was actually saved correctly?

**Interview answer** — Never trust the confirmation screen alone: it proves the frontend reached its success state, not that the system persisted anything. I verify behind the UI — an API GET for the order asserting the fields that matter, and where the API doesn't expose everything, a DB query for the row itself: status, totals, foreign keys, audit entries. With eventual consistency in between, the backend assertions poll rather than assume read-your-write.

**Deep dive** — The failure modes UI-only assertions miss are all real production incidents: the optimistic UI that renders success before the write commits; the write that lands but with wrong values (rounding on totals, dropped line items, wrong currency); the write that lands in the primary but never propagates to the projection every other system reads; and the fire-and-forget event that was supposed to create downstream records (invoice, inventory reservation) and silently didn't. API-level verification catches value correctness through the contract; DB-level verification catches what no endpoint exposes — soft-delete flags, audit rows, denormalized copies — and is the only way to check the write's *shape* (correct FKs, no orphaned children). The polling discipline applies to both: a queue-backed order pipeline means the DB row may be milliseconds-to-seconds behind the UI's confirmation, and asserting too early produces a flake that's actually a correct test of an asynchronous system asked a synchronous question.

**Code / structure**

```ts
// UI said "confirmed" — now verify the system agrees
const orderId = await page.getByTestId('order-number').innerText();

const apiOrder = await api.get(`/orders/${orderId}`);            // contract-level truth
expect(apiOrder).toMatchObject({
  status: 'CONFIRMED',
  totalCents: 2990,
  items: [{ sku: 'SKU-1', qty: 2 }],
});

await expect.poll(async () => {                                   // persistence-level truth
  const rows = await db.query(
    `SELECT o.status, o.total_cents, count(i.id)::int AS item_count
     FROM orders o JOIN order_items i ON i.order_id = o.id
     WHERE o.external_id = $1 GROUP BY o.id`, [orderId]);
  return rows.rows[0];
}).toEqual({ status: 'CONFIRMED', total_cents: 2990, item_count: 1 });
```

**Follow-ups & traps**
- "Isn't API + DB double-checking redundant?" — they answer different questions: API = does the contract report it correctly; DB = was it persisted correctly, including what the API doesn't expose; drop the DB check only where the API is provably complete.
- "The DB row appears 3 seconds later — is the app broken?" — maybe by SLA, not by architecture; asynchrony is a product decision — the test polls within the SLA, and exceeding the SLA is the actual bug to file.
- Weak answer: "assert the success message and the order appears in the order list" — the list is the same read model as the confirmation; you've checked the UI against the UI.

**Senior/lead angle** — Institutionalize the principle in review guidance: every test of a state-changing journey must assert at least one layer below the UI — it's a one-line rule that eliminates an entire class of false-green tests across the org.

**One-liner** — The confirmation screen is a claim, not a fact — verify the claim at the API, verify the persistence in the DB, and poll because the truth may be seconds behind the pixels.

### Q12. A login button enables only after an API call — automate this

**Interview answer** — This is Playwright working as designed: `await expect(loginButton).toBeEnabled()` is a web-first assertion that retries until the button enables or times out — no explicit wait, no sleep, nothing to synchronize by hand. If I want the test to *document* the dependency or diagnose its latency, I can additionally `waitForResponse` on the API call — but the elegant answer is that the assertion alone is sufficient and correct.

**Deep dive** — The question is a filter: candidates from the hard-wait era reach for `waitForTimeout` (flaky and slow: too short on slow envs, wasted seconds on fast ones) or for manually intercepting the API before asserting (redundant synchronization — the button's enabled state already *is* the observable outcome of the API completing). Web-first assertions invert the model: instead of the test predicting when the app is ready, the assertion polls the condition the user actually cares about. When `waitForResponse` genuinely earns its place: asserting on the API's payload as well as the UI reaction (did the config call return the flag that should enable the button), diagnosing which side is slow when the test times out, or when the UI has no observable change until much later in the flow. The senior framing to say aloud: modern automation treats waiting as a property of assertions, not as statements sprinkled between actions — a test containing explicit waits before every assertion is porting Selenium habits into a tool that made them obsolete.

**Code / structure**

```ts
test('login button enables once session-config loads', async ({ page }) => {
  await page.goto('/login');
  const loginButton = page.getByRole('button', { name: 'Log in' });

  await expect(loginButton).toBeDisabled();       // initial state — worth pinning
  await expect(loginButton).toBeEnabled();        // retries until the API-driven enable
  await loginButton.click();
});

// only when you need the payload or diagnostics:
const respPromise = page.waitForResponse(r => r.url().includes('/api/session-config') && r.ok());
await page.goto('/login');
const config = await (await respPromise).json();
expect(config.loginEnabled).toBe(true);           // asserting the cause, not just the effect
```

**Follow-ups & traps**
- "What if the button enables but the handler isn't attached yet?" — real hydration-era issue: Playwright's actionability checks cover visibility/enabled, not handler presence; if the app has this bug, the click test exposes it — which is the test doing its job against an app defect.
- "Timeout — how do you tell slow API from broken UI?" — the trace's network tab answers it in one look (Q8); or the `waitForResponse` variant splits the timeout into named halves.
- Weak answer: `waitForTimeout(3000)` before the click — the exact anti-pattern the question is designed to surface.

**Senior/lead angle** — This tiny question is your convention in miniature: "no waits, only web-first assertions" as a lint-enforced rule (ban `waitForTimeout` outside annotated exceptions) removes the largest single source of both flake and wasted runtime across an org's suites.

**One-liner** — `expect(button).toBeEnabled()` already waits — the modern answer is that synchronization lives inside assertions, and every explicit wait is a smell needing a justification.

### Q13. How would you verify UI data against backend/API data at scale?

**Interview answer** — Through a normalization layer: the UI renders formatted, localized, truncated projections of API data, so naive string comparison fails on correct behavior. I normalize both sides to a canonical form — parse money and dates from the UI, select and map the comparable fields from the API — and compare structured objects. At scale that means shared serializers per entity type in the core, explicit tolerance rules for formatting, and pagination/sorting alignment so both sides enumerate the same window of data.

**Deep dive** — The failure modes of naive comparison teach the design: `€1,299.00` vs `129900` (format vs minor units), `2 hours ago` vs an ISO timestamp (relative rendering — normalize with a tolerance window or pin the clock), truncated descriptions with ellipses, locale-dependent number and date forms, and HTML entities. The normalization layer owns these translations once — `uiMoney(text): Cents`, `uiDate(text): ISO` — instead of every test hand-rolling regex. The comparison itself should be field-mapped, not blanket: an explicit `comparable(entity)` serializer picks the fields the UI actually renders, which doubles as documentation of the UI's data contract and stops tests failing on API fields the page never shows. List verification adds the alignment problem: the API must be queried with the same sort, filters, and page size the UI used, or you're diffing different windows — and for large tables the sane scale strategy is verifying the window plus the aggregates (row count, totals) rather than paging through everything in a UI test; full-dataset reconciliation belongs in an API-vs-DB check (Q17) where it's a thousand times cheaper.

**Code / structure**

```ts
// shared normalizers — in the core, not per test
export const uiMoney = (s: string): number =>
  Math.round(parseFloat(s.replace(/[^\d.,-]/g, '').replace(',', '')) * 100);

// entity serializer: the UI's data contract, explicit
const comparableOrderRow = (o: ApiOrder) => ({
  number: o.number,
  totalCents: o.totalCents,
  status: STATUS_LABELS[o.status],        // API enum → UI label mapping lives here
});

test('orders table matches API page 1', async ({ page, api }) => {
  const apiPage = await api.get('/orders?sort=-createdAt&limit=20');   // same window as UI
  await page.goto('/account/orders');
  const uiRows = await page.getByTestId('order-row').all();

  const uiData = await Promise.all(uiRows.map(async r => ({
    number: await r.getByTestId('number').innerText(),
    totalCents: uiMoney(await r.getByTestId('total').innerText()),
    status: await r.getByTestId('status').innerText(),
  })));
  expect(uiData).toEqual(apiPage.items.map(comparableOrderRow));
});
```

**Follow-ups & traps**
- "The comparison flakes on a row created mid-test by another worker — fix?" — scope the window: filter both sides to this test's namespaced data (file 02, Q5), or run against a per-worker tenant; shared-list assertions in parallel suites need ownership boundaries.
- "Why not screenshot/visual comparison instead?" — visual testing checks rendering, not data correctness; a wrong total renders pixel-perfectly.
- Weak answer: `expect(pageText).toContain(apiValue)` — passes when the value appears anywhere (wrong row, wrong column) and fails on every formatting difference; the worst of both directions.

**Senior/lead angle** — The serializers and normalizers are cross-team infrastructure: shipped in the core, versioned with the design system's formatting rules, so when the org changes date formatting, one normalizer PR fixes every team's comparisons.

**One-liner** — Normalize both sides to canonical values, compare explicit field mappings over the same data window — string-contains against rendered text is how data bugs hide behind formatting.

### Q14. How would you decide between mocking, stubbing, contract testing, API testing, and E2E?

**Interview answer** — By the question each technique answers. Does *my code* handle X correctly — mock or stub the collaborator and test my logic against controlled responses. Do *two parties agree* on the interface — contract tests, Pact-style, verifying both sides against a shared contract without integration. Does *the service* actually work — API tests against the running service. Does *the journey* work for a user — a few E2E tests across the integrated stack. Cost and confidence rise together up that ladder, so the strategy is answering each question at the cheapest layer that can answer it.

**Deep dive** — The axes make the framework: speed and determinism fall as you go up (mocks are microseconds and perfectly repeatable; E2E is minutes and owns a flake budget), while integration confidence rises — mocks prove nothing about the real collaborator, which is precisely the gap contract testing fills: it's the technique that lets you delete most integrated tests between services by making "we agree on the interface" independently verifiable on both sides at unit-test cost. The distinctions worth being crisp on: a stub returns canned data (state verification), a mock additionally asserts on the interaction (was it called, with what) — over-mocking interaction detail couples tests to implementation and is the most common mock abuse; API tests differ from contract tests in that they verify behavior (business rules, persistence, errors) of a deployed service, not just interface shape. The decision failure modes: all-E2E strategies (every permutation at the most expensive layer — file 04, Q12), and all-mock strategies (thousands of green unit tests over services that can't talk to each other — the "works in isolation, broken in integration" trap that contract testing was invented for). In Playwright terms, mocking is `page.route()` for frontend-logic tests — useful for error-state UI you can't trigger on demand — and deliberately absent from journey tests, whose entire value is realness.

**Code / structure**

```text
technique      question answered                    cost/speed   confidence scope
mock/stub      does MY code handle X?               ~ms, exact   my unit only
contract       do we AGREE on the interface?        ~s, exact    interface both sides
API test       does the SERVICE work?               ~100ms–s     one service's behavior
E2E            does the JOURNEY work?               ~min, flaky  whole integrated stack

allocation rule: push each question to the cheapest layer that answers it;
E2E count stays near-constant as the product grows (journeys, not permutations)
```

```ts
// Playwright route-mock: testing MY frontend's handling of a 503 — not the journey
await page.route('**/api/recommendations', r =>
  r.fulfill({ status: 503, body: JSON.stringify({ error: 'unavailable' }) }));
await page.goto('/product/42');
await expect(page.getByTestId('recs-fallback')).toBeVisible();  // graceful degradation
```

**Follow-ups & traps**
- "Where does contract testing not work?" — third parties who won't run your verifications (fall back to a thin sandbox suite — file 03, Q7) and interfaces changing faster than teams maintain pacts; it's a discipline investment, not free.
- "Your mocked service changed its response shape — what catches it?" — nothing in the mocked tests: exactly why every mock should have a contract test behind it; a mock without a contract is a guess with version control.
- Weak answer: defining the five terms without an allocation rule — the question says *decide between*; definitions are the entry fee, the decision framework is the answer.

**Senior/lead angle** — This framework is your test-strategy budget in disguise: publish the per-question layer allocation as org guidance, and audit the expensive layers — every E2E permutation and every integrated env test should name the question it answers that a cheaper layer couldn't.

**One-liner** — Mock for my logic, contract for our agreement, API for the service, E2E for the journey — answer every question at the cheapest layer that can, and back every mock with a contract.

### Q15. How would you prevent automation from becoming a maintenance burden?

**Interview answer** — Treat maintenance as a budgeted, measured cost rather than ambient suffering: a target share of QA capacity for upkeep with alarms on the trend; a deletion policy so the suite sheds low-value tests as routinely as it gains new ones; a flake SLO with automatic quarantine and fix-or-delete deadlines; design review for tests so maintainability problems are caught at PR time, not discovered at refactor time; and cost-per-green-build tracked so the economics stay visible to the people funding them.

**Deep dive** — Maintenance burden is compound interest on small design debts, so prevention front-loads: the review checklist targets the known interest generators — raw locators (blast radius, file 01 Q14), UI-based setup (runtime and flake), permutations at the E2E layer (file 04, Q12), hard waits (Q12 here), unowned shared helpers. The budget makes trade-offs explicit: when maintenance share crosses the line (say 25% of QA capacity), the response is a prioritized paydown — usually deletion and layer-pushing, the two levers that reduce burden permanently rather than heroically. Flake discipline protects the scarcest resource, trust: an unmanaged 5% flake rate means every engineer pays a triage tax per PR, and the compounding cost is that people stop reading failures — at which point the suite's marginal value is zero regardless of coverage. The deletion policy needs institutional protection because it fights instinct: nobody's performance review celebrates removed tests, so the quarterly review (file 04, Q14) has to be calendared, data-fed from the warehouse, and framed as capacity recovery. The observation that lands at staff level: suites don't become burdens through one bad decision but through the absence of any pruning mechanism — entropy is the default, and the design above is just entropy management with numbers.

**Code / structure**

```text
the anti-burden stack:
  budget      maintenance ≤25% of QA capacity; trend alarmed monthly
  deletion    quarterly review from warehouse data (zero-signal + overlap query)
  flake SLO   <1% pass-on-retry; auto-quarantine at 2/wk; fix-or-delete in 14d
  design gate PR checklist: no raw locators · no UI arrange · no hard waits ·
              permutations pushed down · owner tag present
  economics   cost per green build + MTTD on dashboards (Q7/Q16)
```

**Follow-ups & traps**
- "Your maintenance share hit 40% — first move?" — diagnose from the warehouse: which suites and failure classes consume the hours; the answer is usually concentrated (one legacy suite, one flaky integration), so paydown is targeted, not general.
- "Doesn't design review slow test delivery?" — minutes per PR against the hours per month that unreviewed debt costs; and the checklist automates progressively into lint rules, shrinking the human review to judgment calls.
- Weak answer: "write good stable tests from the start" — a virtue, not a mechanism; the question asks what *system* keeps ten teams' output from decaying, and virtues don't survive turnover.

**Senior/lead angle** — Report the economics upward on a cadence: maintenance share, cost per green build, and capacity recovered by deletion — automation stays funded when its costs are managed visibly, and gets axed in the first budget crunch when they aren't.

**One-liner** — Budget the upkeep, delete on a calendar, quarantine flake with deadlines, and gate design at PR time — burden is entropy, and entropy needs a system, not intentions.

### Q16. How would you measure the health of an automation framework?

**Interview answer** — A balanced KPI set, each catching a different decay mode: flake rate — is the signal trustworthy; mean time to diagnose — how expensive is each red; suite duration trend — is feedback speed decaying; escaped defects — is the suite actually protecting releases; onboarding time — can new engineers contribute; and maintenance share of QA capacity — is the framework consuming its own budget. Reviewed together monthly, because any one of them optimized alone deforms the others.

**Deep dive** — The set is designed around the ways frameworks die. Trust death: flake climbs, engineers stop reading failures, and coverage becomes decorative — flake rate plus pass-on-retry catches it while it's still cheap. Feedback death: duration creeps 2% a week until the suite moves to nightly and stops gating — the *trend*, not the absolute, is the alarm. Relevance death: the suite is green while bugs ship — escape rate with layer attribution (file 04, Q8) is the only metric that measures the mission rather than the machinery. Accessibility death: three people can extend the framework, they leave, the framework fossilizes — onboarding time (time-to-first-merged-test) is the leading indicator, and it resists gaming because improving the number requires actually simplifying the framework. Economic death: maintenance quietly eats the capacity that was supposed to produce new coverage — the share metric keeps the trade visible. MTTD ties to diagnostics investment (Q8): it's the per-failure price everyone pays, and it responds directly to artifact quality. What keeps this honest is warehouse automation (Q7): hand-compiled scorecards die in month three; generated ones survive leadership changes.

**Code / structure**

```text
framework health scorecard (generated monthly from the warehouse):
  metric              target/watch        decay mode it catches
  flake rate          <1%, alarmed        trust death
  pass-on-retry       trend ↓             hidden flake / retry masking
  MTTD per failure    <15 min median      diagnosis tax (Q8 investment)
  suite duration      trend, budget/suite feedback death (Q2/Q3)
  escaped sev1-2      per release, layered relevance death (the mission)
  onboarding time     <1 wk to merged test accessibility death
  maintenance share   ≤25%, trend         economic death
```

**Follow-ups & traps**
- "Which single metric would you keep?" — escaped defects, because it's the purpose; but immediately note it's a lagging indicator — the others exist to predict it while there's still time to act.
- "How is this different from Q13 in the strategy file?" — that measures the *automation program's* effectiveness; this measures the *framework as a product* — overlapping instruments, different objects; being crisp about the distinction is the senior tell.
- Weak answer: test counts, coverage percentages, or "everything is green" — inventory and mood, measuring neither trust, speed, protection, nor cost.

**Senior/lead angle** — The scorecard is your management interface: it's how you justify platform headcount, choose between diagnostics vs speed vs stability investment, and prove the framework improved under your ownership — run it like an SRE runs SLOs, including the part where breaches trigger prioritized work.

**One-liner** — Flake, diagnosis time, duration trend, escapes, onboarding, and maintenance share — six gauges for six ways frameworks die, generated from the warehouse and reviewed like SLOs.

### Q17. SQL for SDETs: three worked queries

**Interview answer** — Three staples: second-highest salary without LIMIT/TOP — I'd give the correlated-subquery version and the `DENSE_RANK` version, explaining the tie-handling difference; verifying an API-created record persisted correctly — a parameterized SELECT asserting the exact fields, joined to children where the write spans tables; and validating an API list against a DB aggregate — comparing the API's claimed totals with GROUP BY results, which catches pagination and filter bugs that per-record checks miss.

**Deep dive** — Query one is a fundamentals filter: the correlated/self-exclusion form (`MAX` below the `MAX`) is the classic; `DENSE_RANK` is the modern form and generalizes to N-th — and the point interviewers actually probe is ties and NULLs: with salaries {90, 90, 80}, `DENSE_RANK`'s second rank is 80 (distinct-value semantics, matching the MAX-based form), while `ROW_NUMBER` would say 90 — knowing *why* you chose which function is the answer. Query two is the DB half of Q11's verification pattern: parameterized (never string-built, even in test code), asserting field-by-field rather than mere existence, and joining children to catch partial writes — an order row without its items is exactly the bug existence checks bless. Query three is reconciliation thinking: per-record spot checks can all pass while the *list* is wrong — a filter that silently drops a status, a pagination fencepost eating one row per page, a double-counted join — and only aggregate-vs-aggregate comparison catches those; it's also a thousand times cheaper than paging through a UI (Q13's scale note).

**Code / structure**

```sql
-- 1a. second-highest salary — correlated subquery (no LIMIT/TOP)
SELECT MAX(salary) AS second_highest
FROM   employees
WHERE  salary < (SELECT MAX(salary) FROM employees);
-- distinct-value semantics: {90, 90, 80} → 80; returns NULL if no second value

-- 1b. DENSE_RANK version — generalizes to N-th highest
SELECT salary AS second_highest
FROM  (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
       FROM employees) ranked
WHERE  rnk = 2;
-- DENSE_RANK ranks distinct values (matches 1a); ROW_NUMBER would rank the
-- duplicate 90 as "second" — the tie-handling choice IS the interview point

-- 2. verify an API-created order persisted correctly (parameterized: $1 = external id)
SELECT o.status, o.total_cents, o.currency, o.customer_id,
       count(i.id)::int          AS item_count,
       sum(i.qty * i.unit_cents) AS items_total_cents
FROM   orders o
LEFT JOIN order_items i ON i.order_id = o.id
WHERE  o.external_id = $1
GROUP  BY o.id;
-- test asserts: status='CONFIRMED', total_cents matches the API response,
-- item_count matches the payload, and items_total_cents = total_cents
-- (the join catches partial writes an existence check would bless)

-- 3. validate an API list endpoint against a DB aggregate
SELECT status, count(*)::int AS cnt, sum(total_cents) AS sum_cents
FROM   orders
WHERE  created_at >= $1 AND created_at < $2          -- same window the API was queried with
GROUP  BY status
ORDER  BY status;
-- compare against the API's per-status counts/totals: catches dropped statuses,
-- pagination fenceposts, and double-counting joins that per-record checks miss
```

**Follow-ups & traps**
- "N-th highest for arbitrary N?" — the `DENSE_RANK` form with `rnk = N`; the correlated form nests unmanageably past 2 — knowing where each form stops scaling is the follow-up's point.
- "Your aggregate check mismatches by one row — first suspects?" — window-boundary semantics (inclusive/exclusive on timestamps, timezone of `created_at`) and in-flight writes during the check; align the window definition with the API's before suspecting the data.
- Weak answer: `ORDER BY salary DESC LIMIT 1 OFFSET 1` — literally the construct the question forbids, and it mishandles ties anyway.
- Trap: string-concatenated SQL in test helpers — injection habits don't get a pass for being "just test code" that runs with real DB credentials in CI.

**Senior/lead angle** — The pattern behind all three is oracle thinking: query one is fundamentals, but two and three are the DB as an independent oracle against the API's claims — reconciliation queries like #3 scale into nightly data-integrity jobs that catch entire bug classes no UI or API test sees.

**One-liner** — MAX-below-MAX or DENSE_RANK for the classic, field-level joins to verify writes, and aggregate-vs-aggregate to validate lists — SQL is the SDET's independent oracle.
