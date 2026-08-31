# Parallel Execution & Sharding

How Playwright runs tests in parallel is one of the highest-signal interview topics for SDETs: it separates people who have run a real suite at scale from people who have only written single tests. This file covers the worker model, `fullyParallel`, serial mode, data isolation, sharding across machines, and the diagnosis of parallel-only failures.

- Q1. How does parallel execution work in Playwright?
- Q2. What does `fullyParallel` change, and what are the risks?
- Q3. How do you control the number of workers?
- Q4. `test.describe.serial` and `test.describe.configure({ mode })` — when is serial legitimate?
- Q5. Tests pass sequentially but fail with multiple workers — why, and how do you diagnose it?
- Q6. What problems does shared test data cause in parallel runs?
- Q7. How do you make test data isolated per worker?
- Q8. Workers vs sharding — what's the difference?
- Q9. How does `--shard=1/4` work and how do you merge results?
- Q10. How would you design a Playwright framework for highly parallel execution?
- Q11. How do `beforeAll`/`afterAll` behave in parallel mode?
- Q12. How do you find test interdependencies?
- Q13. How do you reduce total suite time beyond adding workers?

### Q1. How does parallel execution work in Playwright?

**Interview answer** — Playwright Test spawns multiple OS worker processes, and by default it distributes test *files* across those workers — tests inside one file run sequentially on the same worker unless you enable `fullyParallel`. Each worker is a fully independent Node process that launches its own browser and creates a fresh browser context per test, so tests are isolated at the process, browser, and context level. The runner reuses a worker for many tests, but if a test fails, the worker is torn down and a new one is started to guarantee a clean slate.

**Deep dive** — The unit of scheduling is the test group (by default, a file; with `fullyParallel`, an individual test). The main runner process parses all test files, builds the list, and hands work to workers over an internal IPC channel. Worker-scoped fixtures (like `browser`) live as long as the worker; test-scoped fixtures (like `page` and `context`) are created and destroyed per test. This is why context creation being cheap (~tens of ms) matters: Playwright gets per-test isolation without paying browser launch cost per test. Restarting a worker after a failure trades a bit of speed for determinism — a crashed or corrupted worker can't poison subsequent tests.

**Follow-ups & traps**
- "Does each test get its own browser?" — No: its own *context*. The browser is per worker and reused. Saying "new browser per test" is a common wrong answer.
- "What happens to worker-scoped fixture state when a test fails?" — The worker restarts, so worker fixtures are re-created. Anything expensive you built there gets rebuilt.
- "Are tests within a file parallel by default?" — No, only across files, unless `fullyParallel: true`.

**Senior/lead angle** — The worker model shapes framework design: anything expensive (auth, seeded users) should live in worker-scoped fixtures so it's paid once per worker, not once per test — but it must then be safe for every test on that worker to share.

**One-liner** — Playwright parallelizes across worker processes, each with its own browser; files go to workers, and every test gets a fresh context.

### Q2. What does `fullyParallel` change, and what are the risks?

**Interview answer** — With `fullyParallel: true`, tests *within* a single file can also run in parallel on different workers, instead of only files being parallelized. It's the right default for a well-isolated suite because it removes the "one giant file becomes the long pole" problem. The risk is that it exposes hidden ordering dependencies: tests in the same file that shared state through module-level variables, a shared account, or implicit sequencing will start failing intermittently.

**Deep dive** — Without `fullyParallel`, a file is a sequential island — people (often unintentionally) rely on that: test 2 assumes test 1 created a record. Turning it on breaks two implicit guarantees at once: order within a file, and same-worker execution within a file (module-level state in a helper is no longer shared between two tests of the same file, since they may run in different processes). You can enable it globally in config, per project, or per file with `test.describe.configure({ mode: 'parallel' })`.

```ts
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
});
```

**Follow-ups & traps**
- "We enabled fullyParallel and tests started failing — is Playwright broken?" — No; it revealed inter-test coupling that was always there. Fix the tests, don't turn it off suite-wide.
- Trap: assuming `fullyParallel` guarantees tests in a file run on *different* workers. It only allows it; scheduling decides.
- "Can I keep one file sequential?" — Yes, `test.describe.configure({ mode: 'default' })` or `'serial'` in that file overrides the global setting.

**One-liner** — `fullyParallel` lets tests inside a file run in parallel too — great for speed, and a truth serum for hidden test coupling.

### Q3. How do you control the number of workers?

**Interview answer** — Via `workers` in `playwright.config.ts`, overridable on the command line with `--workers=4`. Locally, Playwright defaults to half the logical CPU cores; on CI it's common to pin a lower fixed number because CI runners are smaller and shared. You can also give a percentage like `workers: '50%'` to scale with the machine.

**Deep dive** — More workers is not monotonically faster: each worker runs a full browser, so you're bounded by CPU and memory, and past saturation you get slower tests, timeouts, and flakiness from resource contention rather than speed. Typical practice: `workers: process.env.CI ? 2 : undefined` for small hosted runners, or a percentage for heterogeneous fleets. `--workers=1` is the standard debugging lever to check whether a failure is parallelism-related.

```ts
export default defineConfig({
  // Half the cores locally (undefined = default), fixed on CI runners
  workers: process.env.CI ? 2 : undefined,
});
```

**Follow-ups & traps**
- "Why not just set workers to 32?" — Browser processes are heavy; oversubscribed CPU causes timeout flakiness. The right number is found empirically per machine class.
- Trap: setting `workers: 1` permanently to "fix" flakiness — that hides the isolation bug and forfeits parallelism.
- "Does `--workers` override config?" — Yes, CLI wins over config.

**One-liner** — `workers` in config or `--workers` on the CLI; default is half your cores, CI usually gets a smaller pinned value, and 1 worker is your diagnostic mode.

### Q4. `test.describe.serial` and `test.describe.configure({ mode })` — when is serial legitimate?

**Interview answer** — `test.describe.serial` makes tests in a group run in order on the same worker, and if one fails, the rest are skipped. `test.describe.configure({ mode })` sets `'parallel'`, `'serial'`, or `'default'` for a scope. Serial is legitimate for a genuinely sequential multi-stage journey you deliberately model as steps — say a long provisioning flow where re-running earlier stages per test would be prohibitively expensive. But it's usually a design smell: it means tests depend on each other, one failure blanks out the group's signal, and on retry the *entire chain restarts from the first test*, which surprises people.

**Deep dive** — The retry semantics are the key internals point: a serial group is treated as one unit, so `retries: 2` re-runs the whole chain, not the failed test. That makes serial groups expensive to retry and makes their failures harder to localize. The honest alternative is usually one longer test with `test.step()` for structure, or independent tests that each arrange their own state via API. Serial also caps parallelism — the group is pinned to one worker.

```ts
test.describe.serial('order lifecycle', () => {
  let orderId: string;
  test('create order', async ({ page }) => { /* ... sets orderId ... */ });
  test('approve order', async ({ page }) => { /* uses orderId */ });
  test('refund order', async ({ page }) => { /* uses orderId */ });
});
```

**Follow-ups & traps**
- "What happens on retry of a serial group?" — The whole group restarts from the top. Wrong answer: "only the failed test retries."
- "Serial vs one big test with steps?" — One test with `test.step` gives the same ordering with clearer reporting and simpler retry semantics; prefer it unless you need per-stage pass/fail rows.
- Trap: using serial to paper over shared-data collisions instead of isolating data.

**Senior/lead angle** — In review, I treat every new `describe.serial` as a question to answer: "why can't these arrange their own state?" Nine times out of ten the answer is "we didn't build API seeding yet," which is the actual work item.

**One-liner** — Serial mode chains tests on one worker, skips the rest on failure, and retries the whole chain — occasionally right, usually a smell.

### Q5. Tests pass sequentially but fail with multiple workers — why, and how do you diagnose it?

**Interview answer** — That signature almost always means tests are not isolated: they share accounts or records so parallel runs mutate each other's data, the app has server-side state like carts or sessions keyed to a shared user, they trip rate limits when concurrent, the machine is resource-starved with N browsers, or there's an order dependency that sequential execution happened to satisfy. I diagnose by confirming with `--workers=1` vs `--workers=4`, then reading traces of the failures to see *what data* was wrong, which usually names the shared resource directly.

**Deep dive** — Systematic approach: (1) reproduce and bound it — does it fail at 2 workers or only 8? Failing only at high counts points to contention/rate limits; failing at 2 points to data collision. (2) Look at which tests fail together — pairs that fail in tandem usually share a fixture, account, or record. (3) Read the trace: an assertion that saw "3 items in cart" when the test added 1 is a shared-cart smoking gun. (4) Grep the suite for hardcoded emails/IDs. (5) Check server logs for 429s. The fix hierarchy: unique data per test > per-worker accounts > mocking the contended dependency > (last resort) reducing workers.

**Follow-ups & traps**
- "Could it be a Playwright bug?" — Essentially never the first hypothesis; the runner isolates contexts. Parallel failures are data/environment coupling.
- Trap answer: "add retries" — retries mask collisions but the corruption still happens and will bite as the suite grows.
- "How do you prove it's rate limiting?" — 429s in the trace's network tab or server logs, and failures that scale with worker count.

**Senior/lead angle** — I treat parallel-only failures as an isolation debt backlog and burn it down, because the alternative — capping workers — silently taxes every CI run forever.

**One-liner** — Passing serially but failing in parallel means shared state somewhere; find what the failing tests have in common and isolate it.

### Q6. What problems does shared test data cause in parallel runs?

**Interview answer** — Concurrent tests using the same data mutate it under each other. Concretely: two tests log in as the same user and one logs out or changes the password mid-flight; two checkout tests share a cart and each sees the other's items; a test asserts "exactly 5 orders" while another test is creating a sixth; a test deletes the "TEST-001" record another test is about to open. The failures are intermittent, order-dependent, and disappear at `--workers=1`, which is exactly the flaky-suite signature.

**Deep dive** — Shared data breaks tests through three mechanisms: *mutation races* (both write), *read-write races* (one asserts a count/state the other is changing), and *session collisions* (many apps invalidate a user's existing sessions on new login, so parallel logins as the same user actively log each other out — a classic). The insidious part is that failure probability scales with worker count and suite size, so a suite that was "fine" at 4 workers collapses at 12.

**Follow-ups & traps**
- "Why does the same suite pass at night?" — Fewer concurrent runs / less contention. Timing-dependent passes are still failures waiting to happen.
- Trap: "we'll just lock the shared account" — a mutex across workers serializes exactly the tests you tried to parallelize.
- "Counts-based assertions?" — Assert on data the test itself created (filter by its unique ID), never on global totals in a shared environment.

**One-liner** — Shared data plus parallelism equals races: shared logins evict each other, shared records mutate mid-assertion, and global counts are never stable.

### Q7. How do you make test data isolated per worker?

**Interview answer** — Two layers: per-*test* uniqueness for data the test creates — generate unique emails, order references, and names using `testInfo` and a timestamp or UUID — and per-*worker* resources for expensive things like accounts, using a worker-scoped fixture keyed on `testInfo.workerIndex` or `parallelIndex`. Each worker then owns an account no other worker touches, and each test suffixes its records so nothing collides.

**Deep dive** — `workerIndex` is unique across the whole run including replacement workers after failures; `parallelIndex` stays within `0..workers-1` and is reused, which makes it the right key when you have a *pre-provisioned pool* of N accounts. A worker-scoped fixture runs once per worker and is shared by all its tests — perfect for "create user via API, log in once, reuse the session."

```ts
// fixtures.ts
import { test as base } from '@playwright/test';

type WorkerFixtures = { workerUser: { email: string; password: string } };

export const test = base.extend<{}, WorkerFixtures>({
  workerUser: [async ({}, use, workerInfo) => {
    const email = `sdet.worker${workerInfo.parallelIndex}.${Date.now()}@example.com`;
    const user = await createUserViaApi({ email, password: 'Str0ng!Pass' });
    await use(user);
    await deleteUserViaApi(user.email);
  }, { scope: 'worker' }],
});

// in a test: unique per-test data on top of the per-worker user
test('places an order', async ({ page, workerUser }, testInfo) => {
  const orderRef = `ord-${testInfo.workerIndex}-${Date.now()}`;
  // ... create and assert on orderRef only
});
```

**Follow-ups & traps**
- "workerIndex vs parallelIndex?" — `workerIndex` never repeats in a run; `parallelIndex` is the slot number and repeats. Pool lookups want `parallelIndex`.
- Trap: making the user fixture test-scoped "to be safe" — you pay user creation on every test and lose the whole point of worker scope.
- "What about cleanup?" — After `use()` in the fixture teardown; but design tests so leaked data is harmless (unique names) because teardown can be skipped on crashes.

**Senior/lead angle** — I standardize this in a shared fixtures file so no test author hand-rolls accounts; data isolation is a framework guarantee, not a per-test convention.

**One-liner** — Unique data per test, expensive resources per worker via worker-scoped fixtures keyed on `parallelIndex`.

### Q8. Workers vs sharding — what's the difference?

**Interview answer** — Workers are parallel processes on *one* machine; sharding splits the test suite across *multiple* machines, each of which then runs its own workers. Workers are configured with `workers`; shards with `--shard=2/4` per CI job. You reach for shards when one machine is saturated — you've hit the CPU/memory ceiling for browsers and the suite is still too slow — or when you want wall-clock time bounded by fleet size rather than box size.

**Deep dive** — They compose: 4 shards × 4 workers = 16 concurrent browsers across the fleet. Sharding is coordination-free — each job independently computes its slice from the full test list, so shards must all see identical code and config or slices will misalign. Practical trigger points for sharding: suite wall-clock exceeding your CI budget with workers already tuned, or memory-bound runners OOM-killing browsers when you raise workers.

**Follow-ups & traps**
- Trap: calling `--shard` "distributed workers" — shards don't communicate at all; it's static partitioning.
- "Do shards rebalance if one finishes early?" — No; partitioning is up-front. Uneven shards mean idle machines (see Q13 on balancing).
- "Which first?" — Max out workers on one machine first; shards multiply infra cost and add a merge step.

**One-liner** — Workers scale within a machine, shards scale across machines, and they multiply together.

### Q9. How does `--shard=1/4` work and how do you merge results?

**Interview answer** — `npx playwright test --shard=1/4` tells this job "you are shard 1 of 4": the runner takes the full ordered test list and executes only its quarter. In CI you launch four jobs with shard values 1/4 through 4/4, usually via a matrix. Each shard writes a `blob` report, you upload those as artifacts, then a final job downloads all of them and runs `npx playwright merge-reports --reporter html ./all-blobs` to get one unified HTML report as if it were a single run.

**Deep dive** — The blob reporter exists precisely for this: it's a machine-readable capture of everything (results, attachments, trace references) that `merge-reports` can stitch into any terminal reporter — HTML, JUnit, GitHub. Without merging, you have four disconnected reports and your "did the build pass" logic gets messy.

```yaml
# GitHub Actions sketch
strategy:
  matrix: { shard: [1, 2, 3, 4] }
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}/4
    env: { PLAYWRIGHT_BLOB_OUTPUT_DIR: blob-report }
  - uses: actions/upload-artifact@v4
    with: { name: blob-${{ matrix.shard }}, path: blob-report }
# merge job (needs: all shards):
#   download all blob-* artifacts into ./all-blobs, then:
#   npx playwright merge-reports --reporter html ./all-blobs
```

**Follow-ups & traps**
- "What must be identical across shards?" — Code, config, and test list. A shard on a different commit silently runs the wrong slice.
- Trap: using the HTML reporter directly on each shard and trying to combine — HTML reports don't merge; blob is the mergeable format.
- "One shard fails to even start?" — Its tests simply never ran; your pipeline must fail on missing shard artifacts, not just on test failures.

**One-liner** — `--shard=k/n` runs a static slice per CI job; blob reports plus `merge-reports` reassemble one report at the end.

### Q10. How would you design a Playwright framework for highly parallel execution?

**Interview answer** — I design for the invariant that any test can run on any worker, any shard, at any time, concurrently with every other test. That means: fully stateless tests that arrange their own data through API seeding, per-worker accounts via worker fixtures, zero cross-test dependencies and no serial groups, storageState-based auth so nobody logs in through the UI repeatedly, and mocked third parties so external rate limits can't couple tests together. Then parallelism is just a dial: raise workers and shards until infra saturates.

**Deep dive** — The design checklist I actually apply: (1) every test creates or is given unique data — enforced by fixtures, not discipline; (2) auth is a project dependency or worker fixture producing `storageState`, so login cost is O(workers) not O(tests); (3) no test asserts on global aggregates in a shared environment; (4) files are kept reasonably small and even so file-level distribution and shard slices balance — one 40-test monster file caps your speedup; (5) `fullyParallel: true` from day one so coupling never creeps in; (6) cleanup is best-effort and non-load-bearing because unique data makes leaks harmless. Organizationally, I make isolation violations fail fast: a periodic CI job with high worker counts and `--repeat-each` surfaces coupling early.

**Follow-ups & traps**
- "Where does test data seeding live?" — In API/db helper layers invoked by fixtures — never by UI steps, which are slow and themselves flaky.
- Trap: designing cleanup as a global `afterAll` truncating tables — that nukes other workers' in-flight data.
- "How do you keep files balanced?" — Split by feature slice, watch per-file duration in reports, break up outliers.

**Senior/lead angle** — The lead's job is making the isolated path the easy path: fixtures hand you a ready user and seeded data, so writing a coupled test takes *more* effort than writing an isolated one.

**One-liner** — Design so any test can run anywhere, anytime, alongside anything: API-seeded unique data, per-worker auth, no ordering, balanced files.

### Q11. How do `beforeAll`/`afterAll` behave in parallel mode?

**Interview answer** — They are per-*worker*, not per-run. `beforeAll` runs once in each worker process that executes tests from that file, so with tests from a file spread over three workers, your `beforeAll` runs three times — and again in any replacement worker after a failure. Anyone treating `beforeAll` as "global setup that runs once" gets duplicate seed data or port conflicts the moment parallelism kicks in.

**Deep dive** — This falls out of the process model: hooks live inside workers, and workers don't share memory. True run-once setup belongs in `globalSetup` or, better, project dependencies (a setup project that runs before test projects — it participates in reporting and tracing, unlike `globalSetup`). Worker-scoped fixtures are usually a better tool than `beforeAll` anyway: same per-worker cost, but with teardown tied to worker lifetime and composability.

```ts
// A setup project is the modern "run once" mechanism
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
  ],
});
```

**Follow-ups & traps**
- "So how do I seed the database exactly once?" — Setup project or `globalSetup`, or make seeding idempotent so per-worker repetition is harmless.
- Trap: `afterAll` as guaranteed cleanup — a crashed worker may never run it. Unique data > cleanup reliance.
- "beforeAll with fullyParallel?" — Still per worker; more workers touching the file means more executions.

**One-liner** — `beforeAll`/`afterAll` run once per worker, not per run — true one-time setup belongs in a setup project.

### Q12. How do you find test interdependencies?

**Interview answer** — I make ordering and placement random and hostile, then watch what breaks. Concretely: compare `--workers=1` against `--workers=8` — divergence proves coupling; run with a randomized seed so file order shuffles; use `--repeat-each=10` to shake out timing-dependent coupling; and when something fails, use `--last-failed` and run that test *alone* — a test that fails solo depended on a predecessor's side effects.

**Deep dive** — The triage matrix: fails alone → it depends on state another test used to create (missing arrange). Passes alone, fails in company → something else mutates its data (shared resource). Passes at 1 worker, fails at N → concurrency race. Playwright supports random ordering via a seed so failures are reproducible — rerun with the same seed to replay the exact order. For the systematic hunt, I run a nightly "chaos" job: max workers, random seed, `--repeat-each=3`, and treat every failure there as an isolation bug with the seed logged for replay.

```bash
npx playwright test --workers=1          # baseline
npx playwright test --workers=8          # contention run
npx playwright test --repeat-each=10 orders.spec.ts   # stability check
npx playwright test --last-failed        # re-run only failures for triage
```

**Follow-ups & traps**
- "A test only fails after test X — now what?" — Read X's teardown and shared fixtures; the coupling artifact (record, session, feature flag) is almost always in one of them.
- Trap: fixing by reordering tests or renaming files to change execution order — that's scheduling around the bug.
- "Is random order safe to keep on?" — Yes, permanently, with the seed printed; determinism-on-demand plus continuous coupling detection.

**One-liner** — Vary workers, order, and repetition until coupling shows itself; a test that can't pass alone or can't pass in a crowd is telling you where.

### Q13. How do you reduce total suite time beyond adding workers?

**Interview answer** — After workers, the wins are: kill repeated UI login by authenticating once and reusing `storageState`; replace UI-based test setup with API seeding; split monster test files so distribution balances; delete or demote redundant e2e tests whose logic is already covered by API tests; and reuse the dev server with `webServer.reuseExistingServer` locally. Usually the single biggest win is auth: a 15-second UI login in front of 400 tests is 100 minutes of pure waste.

**Deep dive** — Order of operations matters: measure first (the HTML report shows per-test and per-file duration), then attack the top of the distribution. UI-based *arrange* steps are the usual bulk offender — creating an order through six screens to test the refund screen should be one API call. File balancing matters because scheduling is file-granular by default: a suite of 5-minute files caps shard/worker balance at 5-minute granularity. And the strategic lever is test-pyramid discipline: every e2e test that merely re-verifies an API behavior is speed debt. The deep version of this — coverage strategy, what belongs at which layer — lives in the architecture track.

**Follow-ups & traps**
- "Why not just double the workers again?" — Saturation: past the CPU/memory ceiling you buy flakiness, not speed.
- Trap: "reduce timeouts to make tests faster" — timeouts don't add time to passing tests; shrinking them only converts slow passes into failures.
- "Fastest single change for most suites?" — storageState auth reuse, almost always.

**Senior/lead angle** — I track suite wall-clock as a budgeted metric with an owner, because unmanaged it only ever grows — and a 45-minute suite quietly changes how often developers are willing to run it.

**One-liner** — Speed beyond workers comes from removing repeated work: shared auth state, API seeding, balanced files, and fewer redundant e2e tests.
