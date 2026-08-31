# Test Data Management

Test data is where most automation programs quietly fail: shared accounts, ordering dependencies, and leaked records surface as "flaky tests" long before anyone names the real cause. This file covers layered data strategy, factories and builders, parallel-safe generation, cleanup, PII, and the staff-level design of data management across teams.

- Q1. How do you handle test data in your framework?
- Q2. How do you create effective test data?
- Q3. One test creates data another test depends on — how do you break the dependency?
- Q4. The suite needs thousands of records — how do you generate and manage them efficiently?
- Q5. How do you generate unique data for parallel execution?
- Q6. How do you clean up test data?
- Q7. How do you manage environment-specific test data?
- Q8. Show a test-data factory/builder pattern in TypeScript
- Q9. Static fixtures (JSON files) vs runtime generation — when do you use each?
- Q10. How do you handle PII and production-data-like needs?
- Q11. Database seeding vs API seeding vs UI seeding?
- Q12. How would you design test-data management for thousands of parallel tests across teams?

### Q1. How do you handle test data in your framework?

**Interview answer** — I treat data as four distinct layers with different lifecycles. Static reference data — countries, currencies, plan tiers — lives in code or JSON because it rarely changes. Dynamic entity data — users, orders, carts — is generated per test via factories and faker so tests never share state. Entities that must exist in the system are seeded through the API in the arrange phase, not through the UI. Environment configuration — URLs, credentials, feature availability — is kept out of the data layer entirely and lives in typed config.

**Deep dive** — The layering matters because each layer fails differently. Reference data drifts silently when the product adds a currency, so it needs a periodic validation check against the API. Generated data fails when tests accidentally assert on random values, so factories default to deterministic values and randomize only fields that need uniqueness. API-seeded data fails through leakage and contention, so seeding is paired with teardown and per-run namespacing. The most common anti-pattern is a single "testdata.json" mixing all four layers — a hardcoded user ID (entity data) next to a base URL (config) next to a country list (reference), which is why the file breaks every time anything changes anywhere.

**Code / structure**

```text
data/
├── reference/            # layer 1: static facts, versioned in git
│   ├── countries.json
│   └── plans.ts
├── builders/             # layer 2: dynamic generation with defaults
│   ├── user.builder.ts
│   └── order.builder.ts
└── seeds/                # layer 3: API seeding recipes for suite-level state
    └── catalog.seed.ts

config/env.ts             # layer 4: env facts — NOT test data
fixtures/data.fixture.ts  # wires builders + seeding + teardown into tests
```

**Follow-ups & traps**
- "Where do test user credentials live?" — they're config/secrets, not test data; per-worker accounts are created at runtime or injected via CI secrets.
- "What about data another team's service owns?" — through their API or a documented seeding contract, never by writing into their database.
- Weak answer: "we have a JSON file with test data" — a single undifferentiated file is the disease, not the strategy.

**Senior/lead angle** — At org scale the four layers get owners: reference data is validated against the product nightly, builders live in the shared core, and seeding recipes are owned by the team that owns the entity.

**One-liner** — Four layers, four lifecycles: reference data in git, dynamic data from factories, entity state via API, and config kept out of all of them.

### Q2. How do you create effective test data?

**Interview answer** — Effective data is minimal, realistic, boundary-aware, and reproducible. Minimal: each test creates only the state it asserts on. Realistic: shaped like production data — real name formats, plausible addresses — because sanitized toy data misses encoding and length bugs. Boundary-aware: deliberately include edge values where the test targets them. And reproducible: deterministic values wherever an assertion depends on them, randomness only for uniqueness, and seeded faker so a failure can be replayed.

**Deep dive** — The determinism/randomness split is the part interviewers probe. If a test asserts a rendered name, that name should be fixed or derived, not random — random assertion inputs make failures unreproducible and diffs meaningless. If a field just needs to not collide (email, SKU), randomize it with a seed logged per run, so "worked yesterday" is a replayable claim. Realism has a concrete payoff: names with apostrophes and diacritics (O'Brien, Müller), 254-character emails, and addresses without postal codes find real bugs that "test1@test.com" never will — that's why faker beats hand-rolled strings. Minimality is a speed and diagnosis feature: a test that seeds 40 fields to assert on 2 is slower and, when it fails, nobody knows which of the 40 mattered.

**Code / structure**

```ts
// Seeded faker: unique across runs, replayable within one
import { faker } from '@faker-js/faker';
const seed = Number(process.env.FAKER_SEED ?? Date.now());
faker.seed(seed);
console.log(`[data] faker seed: ${seed}`);   // printed in CI logs for replay

export function defaultUser(): UserInput {
  return {
    name: faker.person.fullName(),               // realistic incl. O'Brien-style
    email: faker.internet.email().toLowerCase(), // unique — never asserted on
    country: 'DE',                               // deterministic — asserted on
  };
}
```

**Follow-ups & traps**
- "A test fails only sometimes with generated data — what do you do?" — replay with the logged seed; if the failure is data-shape-dependent, you found a product bug, not flake.
- "Why not hardcode everything for determinism?" — hardcoded values collide in parallel runs and go stale; the split rule gives you both properties.
- Weak answer: "we use faker" with no seeding or determinism story — unseeded randomness in assertions is a flake generator.

**Senior/lead angle** — Publish the split rule ("deterministic where asserted, random where unique, always seeded") as a one-line standard in the shared core docs — it's the cheapest flake-prevention policy you can buy.

**One-liner** — Minimal, realistic, boundary-aware, and seeded — deterministic where you assert, random where you must be unique.

### Q3. One test creates data another test depends on — how do you break the dependency?

**Interview answer** — Each test must arrange its own state, so I'd move the shared setup into the arrange phase of both tests — via an API factory, not the UI — and delete the ordering assumption. Test ordering is a trap: it serializes execution, makes the second test fail mysteriously when the first is skipped or retried, and breaks the moment you enable parallelism or sharding.

**Deep dive** — Ordered tests fail in ways that look like flake: retries re-run test B without test A's side effects, sharding puts A and B on different machines, `--grep` runs B alone, and parallel workers race on the shared record. The cost of independence — an extra API call per test — is trivial compared to the debugging cost of hidden coupling. If arranging the state is genuinely expensive (a heavyweight tenant, a processed order), that's an argument for a suite-level seed or a worker-scoped fixture, not for test ordering: the state is created once per worker, and each test still owns anything it mutates. The litmus test I apply in review: can every test in the file pass when run alone with `--grep`? If not, it has a hidden dependency.

**Code / structure**

```ts
// BEFORE — hidden coupling: 'create' must run first, serially
test('create order', async ({ page }) => { /* creates ORD-123 via UI */ });
test('cancel order', async ({ page }) => {
  await page.goto('/orders/ORD-123');   // depends on the previous test
});

// AFTER — each test arranges its own state via API
test('user can create an order', async ({ page, orderFactory }) => {
  await page.goto('/orders/new');
  // ... UI creation is the behavior under test here
});

test('user can cancel an order', async ({ page, orderFactory }) => {
  const order = await orderFactory.create({ status: 'open' }); // arrange via API
  await page.goto(`/orders/${order.id}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('Order cancelled')).toBeVisible();
});
```

**Follow-ups & traps**
- "What if the app has no API to create the state?" — DB seeding as fallback, or ask for a test-support endpoint; the absence of a seeding path is a testability gap worth escalating.
- "Isn't a multi-step journey test legitimate?" — yes, as one test with multiple steps — the anti-pattern is dependency across test boundaries, not long scenarios.
- Weak answer: "use dependsOnMethods / serial mode" — that encodes the coupling instead of removing it, and forfeits parallelism.

**Senior/lead angle** — Make independence a gate: CI runs the suite fully parallel with random-adjacent scheduling, so ordering dependencies fail loudly in the PR that introduces them rather than in next month's shard reshuffle.

**One-liner** — Every test arranges its own state via API; if a test can't pass alone under --grep, it's broken even while it's green.

### Q4. The suite needs thousands of records — how do you generate and manage them efficiently?

**Interview answer** — Bulk-seed through the fastest safe channel: batch API endpoints if they exist, direct DB seeding with production-shaped SQL or ORM scripts if not — never record-by-record through the UI or even one-at-a-time API calls. I namespace everything with a per-run prefix so parallel runs don't collide and cleanup is a single filtered delete, and for ephemeral environments I prefer restoring a prepared snapshot over regenerating from scratch.

**Deep dive** — The arithmetic drives the design: 5,000 records at 200 ms per API call is nearly 17 minutes of setup — a batch endpoint or a `COPY`/bulk-insert does it in seconds. Seeding is data-as-code: scripts live in the repo, are versioned with the schema, and run in CI, so "the QA env has weird data" stops being an untracked mystery. Snapshot/restore changes the economics for big datasets — build the dataset once, snapshot the database, and each ephemeral environment restores in seconds; the snapshot is rebuilt when the schema or reference data changes, not per run. The management half people forget: thousands of records need lifecycle metadata — a run ID column or naming prefix — because without it you can't tell leaked test data from real data, and the QA database grows until queries slow down and tests flake on pagination.

**Code / structure**

```ts
// Per-run namespace: collision-free and cleanup-friendly
export const RUN_ID = `e2e-${process.env.CI_PIPELINE_ID ?? Date.now()}`;

export async function seedProducts(db: DbClient, count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    sku: `${RUN_ID}-SKU-${i}`,
    name: faker.commerce.productName(),
    price_cents: faker.number.int({ min: 100, max: 99900 }),
  }));
  await db.bulkInsert('products', rows);          // one round trip, not 5,000
}

// Cleanup is one statement because of the namespace:
// DELETE FROM products WHERE sku LIKE 'e2e-<runId>-%';
```

**Follow-ups & traps**
- "Why not seed via the API for realism?" — for the entities under test, yes; for 5,000 background records that just need to exist, realism at the row level is enough and speed wins.
- "How do you keep DB seeds valid as the schema evolves?" — seeds live next to migrations and run in CI on every schema change; a broken seed fails the pipeline, not the test run.
- Weak answer: a loop of UI or single API calls — correct-but-unusable at this scale; the interviewer is checking whether you do the arithmetic.

**Senior/lead angle** — At platform level, offer seeding as a service: teams declare dataset recipes, the platform builds snapshots nightly, and ephemeral environments restore them — dataset build time stops being every team's problem.

**One-liner** — Bulk-insert or restore a snapshot, namespace every record by run ID, and version the seeds with the schema — never seed thousands of rows one call at a time.

### Q5. How do you generate unique data for parallel execution?

**Interview answer** — Two mechanisms layered: identity-level isolation via worker-scoped fixtures — each Playwright worker gets its own account created once and reused across that worker's tests — and record-level uniqueness via run-and-worker-prefixed values or UUIDs on any field with a uniqueness constraint. With those two in place, workers can't contend on logins or collide on emails, and cleanup can target exactly what a run created.

**Deep dive** — Parallel collisions come in two flavors and each mechanism addresses one. Session collisions: two workers logging into the same account can invalidate each other's sessions or interleave state (one worker's test empties the cart the other just filled) — per-worker accounts remove the shared identity entirely, and `workerIndex` makes them cheap to mint. Constraint collisions: two workers creating `test@example.com` simultaneously — one gets a 409 that looks like flake; UUID or timestamp-plus-worker affixes make collisions impossible rather than unlikely. The subtle trap is uniqueness that leaks into assertions: if a test asserts a rendered email, derive the expectation from the generated value, never from a constant. Timestamps alone are insufficient at high parallelism — two workers can hit the same millisecond — so always include the worker index or use UUIDs.

**Code / structure**

```ts
// fixtures/worker-user.fixture.ts — one account per worker, created once
export const test = base.extend<{}, { workerUser: User }>({
  workerUser: [async ({}, use, workerInfo) => {
    const api = await standaloneApiClient();
    const user = await api.createUser({
      email: `e2e-w${workerInfo.workerIndex}-${randomUUID()}@example.test`,
      name: `E2E Worker ${workerInfo.workerIndex}`,
    });
    await use(user);
    await api.deleteUser(user.id);
  }, { scope: 'worker' }],       // created once per worker, not per test
});

// Record-level uniqueness for anything with a unique constraint
export const uniqueSku = () => `SKU-${RUN_ID}-w${process.env.TEST_WORKER_INDEX}-${randomUUID().slice(0, 8)}`;
```

**Follow-ups & traps**
- "Why worker scope instead of per-test accounts?" — account creation is often the slowest arrange step; per-worker amortizes it while keeping isolation — per-test is the fallback when tests mutate the account itself.
- "What about the shared admin user?" — either mint per-worker admins or serialize the genuinely-singleton admin flows into their own non-parallel project; never let 8 workers share one admin session silently.
- Weak answer: "timestamps make it unique" — collides at parallelism, and reads as never having debugged a 409 in CI.

**Senior/lead angle** — Bake both mechanisms into the shared core so isolation is the default: teams that opt out of worker fixtures should have to write a comment explaining why, not the reverse.

**One-liner** — Per-worker identities plus UUID-affixed records: make collisions structurally impossible, not statistically unlikely.

### Q6. How do you clean up test data?

**Interview answer** — Cleanup is owned by the same code that creates data — factories track what they created and fixtures tear it down automatically, so no test contains delete calls. On top of that, because leaks are inevitable — killed CI jobs, crashed workers — every record carries a run-ID tag and a scheduled reaper job deletes tagged data older than a retention window. And where we run ephemeral environments, teardown of the environment is the cleanup.

**Deep dive** — The layering exists because fixture teardown alone cannot be airtight: a cancelled pipeline never runs teardown, and over months those leaks compound into a bloated QA database that slows queries and flakes pagination tests. The reaper is the safety net that makes leakage boring instead of a quarterly cleanup crisis. A deliberate policy choice worth stating: keep data on failure — a conditional teardown that skips deletion when the test failed (and logs the record IDs into the test attachments) preserves the crime scene for debugging, and the reaper collects it later anyway. The anti-patterns: cleanup via UI (slow, and fails exactly when the UI broke), truncating shared tables (destroys other teams' parallel runs), and "cleanup suites" that run after everything (single point of failure, ordering dependency by another name).

**Code / structure**

```ts
// Factory teardown with keep-on-failure for debuggability
export const test = base.extend<{ orderFactory: OrderFactory }>({
  orderFactory: async ({ api }, use, testInfo) => {
    const factory = new OrderFactory(api);
    await use(factory);
    if (testInfo.status === testInfo.expectedStatus) {
      await factory.deleteAll();                    // clean on pass
    } else {
      testInfo.attach('leaked-data', {              // keep + record on fail
        body: JSON.stringify(factory.createdIds()), contentType: 'application/json',
      });
    }
  },
});
```

```sql
-- Reaper job (scheduled nightly): collects everything the fixtures missed
DELETE FROM orders
WHERE created_by_tag LIKE 'e2e-%'
  AND created_at < now() - interval '48 hours';
```

**Follow-ups & traps**
- "Why not clean before the test instead of after?" — do both cheaply: arrange with fresh namespaced data (so pre-existing junk can't interfere) and still tear down; "clean-before-only" leaves the database growing.
- "Who owns the reaper?" — the platform/QA infra owner, with the tagging convention documented in the core; an unowned reaper stops running and nobody notices for months.
- Weak answer: "afterEach deletes what the test made" written by hand per test — untracked, copy-pasted, and skipped the day someone forgets.

**Senior/lead angle** — Ephemeral environments are the strategic answer: when every PR gets its own database, cleanup becomes `environment destroy` — present the reaper as the tactic for shared envs and ephemerals as the direction.

**One-liner** — Factories remember, fixtures tear down, a tagged reaper catches the leaks, and ephemeral environments make the whole problem disappear.

### Q7. How do you manage environment-specific test data?

**Interview answer** — I separate what varies by environment from what the test needs to be true. Environment facts — URLs, credentials, which payment sandbox — live in typed, env-keyed config. Entity data is discovered or created at runtime rather than hardcoded: instead of baking in "product 4711 exists in staging", the test asks the API for a product matching its criteria, or creates one. Hardcoded IDs are the number-one cause of "passes in QA, fails in staging."

**Deep dive** — Baked-in IDs fail because environments drift: someone refreshes staging, the ID vanishes, and forty tests fail with misleading errors. Discover-don't-hardcode inverts the dependency — the test declares requirements ("an active product under €50") and a resolver finds or creates a match, making the suite portable across environments by construction. Where environments legitimately differ in capability — no payment sandbox in QA, SSO only in staging — that's not data, that's a capability flag in config, and tests declare required capabilities so they skip cleanly instead of failing confusingly. The residual hardcoding that's acceptable: stable reference data (currency codes, country lists) that is identical everywhere by definition.

**Code / structure**

```ts
// config/env.ts — env-keyed facts, validated at startup
const envs = {
  qa:      { apiBaseUrl: 'https://api.qa.example.com',      capabilities: ['payments-mock'] },
  staging: { apiBaseUrl: 'https://api.staging.example.com', capabilities: ['payments-sandbox', 'sso'] },
} as const;
export const env = envs[requireEnvVar('TEST_ENV') as keyof typeof envs];

// Discover, don't hardcode: declare what the test needs
export async function anyActiveProduct(api: ApiClient, criteria: { maxPriceCents: number }) {
  const found = await api.get(`/products?status=active&maxPrice=${criteria.maxPriceCents}&limit=1`);
  return found.items[0] ?? api.post('/products', productBuilder().cheap().build());
}

// Capability-gated test
test('checkout with sandbox card', async ({ page }) => {
  test.skip(!env.capabilities.includes('payments-sandbox'), 'no payment sandbox here');
  // ...
});
```

**Follow-ups & traps**
- "What if discovery itself is slow?" — cache resolved entities per run (not per test), and fall back to creation; discovery cost is paid once.
- "Environment-specific expected values — tax rates, currencies?" — those belong in the config layer per env, referenced by tests, never duplicated inside test bodies.
- Weak answer: separate test files or branches per environment — duplicating tests per env doubles maintenance and guarantees drift.

**Senior/lead angle** — Push for an environment contract: env owners publish what data and capabilities each env guarantees, and a nightly conformance check verifies it — turning "staging is weird again" from a Slack complaint into a failing check with an owner.

**One-liner** — Config holds what differs, tests declare what they need, and runtime discovery or creation replaces every hardcoded ID.

### Q8. Show a test-data factory/builder pattern in TypeScript

**Interview answer** — The builder shapes the input object — sensible defaults, fluent overrides, intent-revealing presets like `.asGuest()` — and the factory performs the side effect: it creates the entity via API and remembers the ID for teardown. Wired into a fixture, tests get one-line arrange steps with automatic cleanup and no knowledge of HTTP.

**Deep dive** — The separation matters: builders are pure and unit-testable, factories carry I/O and lifecycle. Defaults encode "a valid, boring entity" so each test only states what it cares about — which makes tests self-documenting: `.withDiscount('BROKEN-10')` tells the reader exactly which dimension is under test. Presets beat boolean flags (`asGuest()` reads; `build(true, false)` doesn't). The builder also becomes the single point of schema adaptation: when the API adds a required field, one default fixes every test.

**Code / structure**

```ts
// data/builders/order.builder.ts
export class OrderBuilder {
  private order: OrderInput = {
    customer: { type: 'registered', email: `e2e-${randomUUID().slice(0, 8)}@example.test` },
    items: [{ sku: 'SKU-DEFAULT', qty: 1 }],
    shipping: { method: 'standard', country: 'DE' },
    discountCode: null,
  };

  withItems(items: OrderItem[]) { this.order.items = items; return this; }
  withDiscount(code: string)    { this.order.discountCode = code; return this; }
  asGuest() { this.order.customer = { type: 'guest', email: this.order.customer.email }; return this; }
  expressTo(country: string)    { this.order.shipping = { method: 'express', country }; return this; }
  build(): OrderInput { return structuredClone(this.order); }
}

// data/factories/order.factory.ts — creation + teardown tracking
export class OrderFactory {
  private ids: string[] = [];
  constructor(private api: ApiClient) {}
  async create(customize?: (b: OrderBuilder) => OrderBuilder): Promise<Order> {
    const input = (customize?.(new OrderBuilder()) ?? new OrderBuilder()).build();
    const order = await this.api.post<Order>('/orders', input);
    this.ids.push(order.id);
    return order;
  }
  async deleteAll() { await Promise.all(this.ids.map(id => this.api.delete(`/orders/${id}`))); }
}

// usage in a test — one-line arrange, zero cleanup code
test('guest order shows guest banner', async ({ page, orderFactory }) => {
  const order = await orderFactory.create(b => b.asGuest().expressTo('FR'));
  await page.goto(`/orders/${order.id}`);
  await expect(page.getByText('Guest checkout')).toBeVisible();
});
```

**Follow-ups & traps**
- "Why `structuredClone` in build?" — builder reuse must not share mutable state between two built objects; a shared nested `items` array is a classic cross-test contamination bug.
- "When is this over-engineering?" — for an entity used in three tests with two fields, a plain function returning an object literal is fine; builders earn their keep at many fields or many variants.
- Weak answer: a builder with twenty `withX` methods and no presets — you've rebuilt the constructor-with-twelve-args problem with more typing.

**Senior/lead angle** — Ship builders for shared entities in the core package and let feature teams extend them; the builder API becomes the org's shared vocabulary for "a valid order."

**One-liner** — Builders shape valid-by-default inputs, factories create and remember for teardown, and fixtures hand tests a one-line arrange step.

### Q9. Static fixtures (JSON files) vs runtime generation — when do you use each?

**Interview answer** — Static JSON for data that is genuinely constant and shared: reference lists, complex payload shapes captured from real traffic, golden files for contract-style assertions. Runtime generation for anything with identity or uniqueness — users, orders, emails — because static entity data can't survive parallel runs or repeated execution. The heuristic: if two tests running simultaneously could both want it, it must be generated.

**Deep dive** — Static fixtures fail through staleness and contention: a checked-in user JSON drifts from the real schema, and two parallel tests "logging in as fixture-user-1" contend on session state. But generation isn't free either — a 200-line deeply nested payload rebuilt field-by-field in a builder is unreadable, and there the right pattern is hybrid: a static file provides the realistic skeleton, generation overrides the identity fields. Golden files (expected API response snapshots) are a legitimate static use with their own discipline — a deliberate update process, so a product change produces a reviewed diff rather than a silently regenerated expectation.

**Code / structure**

```ts
// Hybrid: static skeleton + generated identity — the practical middle
import complexClaim from '../reference/insurance-claim.skeleton.json';

export function buildClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    ...structuredClone(complexClaim),   // realistic 80-field shape, versioned in git
    claimId: `CLM-${randomUUID()}`,     // identity always generated
    claimant: { ...complexClaim.claimant, email: uniqueEmail() },
    ...overrides,
  };
}
```

```text
Decision rule:
  reference/constant, no identity        → static JSON in git
  complex realistic shape, needs identity → hybrid: static skeleton + generated IDs
  anything unique/parallel-sensitive      → runtime generation
  expected-output comparisons             → golden files with reviewed updates
```

**Follow-ups & traps**
- "How do you keep static fixtures from going stale?" — validate them against the current API schema (zod/OpenAPI) in CI; a schema change fails the build, not next week's test run.
- "Aren't golden files brittle?" — they're deliberately sensitive; the discipline is a reviewed regeneration command, and normalizing volatile fields (timestamps, IDs) before comparison.
- Weak answer: an absolute position either way — "everything generated" makes complex payloads unreadable, "everything static" dies at the first parallel run.

**Senior/lead angle** — Watch the ratio as a health metric: a growing pile of static entity fixtures usually means the API lacks good creation endpoints — a testability gap to raise with the platform, not a data-management preference.

**One-liner** — Static for facts and shapes, generated for identities, hybrid for both — if two parallel tests could want it, generate it.

### Q10. How do you handle PII and production-data-like needs?

**Interview answer** — Raw production data never enters test environments — that's a compliance boundary, not a convenience trade-off. When we need production-shaped data, we either synthesize it with generators tuned to production's statistical shape, or run an anonymization pipeline that irreversibly transforms prod extracts — and the anonymized output is treated as still-sensitive until proven otherwise, because naive masking is reversible more often than people think.

**Deep dive** — The GDPR framing matters in interviews: production personal data has a lawful purpose, and "QA convenience" is not it — copying prod to a lower environment with weaker access controls multiplies breach surface and can itself be a reportable issue. Anonymization is harder than masking: swapping names but keeping real addresses, order histories, and timestamps leaves re-identification trivially possible, so a serious pipeline replaces identifiers, generalizes quasi-identifiers, and preserves only the statistical properties tests need (volume distribution, category mix, edge shapes). Synthesis is usually the better default: cheaper to govern, no pipeline to audit, and generators can be tuned using aggregate stats (field length distributions, null rates) that are themselves non-personal. The honest limitation: some bug classes only reproduce with real-data weirdness — for those, debug in production-adjacent environments under production access controls rather than dragging the data down to QA.

**Code / structure**

```text
Decision ladder for "we need realistic data":
1. synthesize        → faker/generators tuned with aggregate prod stats (default)
2. anonymize extract → irreversible pipeline, DPO-reviewed, treated as sensitive,
                       refreshed via automated job (never ad-hoc dumps)
3. neither works     → debug in prod-adjacent env under prod access controls;
                       the data does not move down

Non-negotiables:
- no prod credentials or PII in test repos, fixtures, or CI logs
- test-generated "fake PII" uses reserved domains (example.test) so a leak
  of test data is provably synthetic
```

**Follow-ups & traps**
- "The team says anonymized data is fine — is it?" — ask who verified irreversibility and whether the DPO signed off; "we replaced the names" is not anonymization.
- "What about prod data in AI tools for test generation?" — same boundary: prompts are an egress channel; synthesize before anything leaves the controlled environment.
- Weak answer: "we mask sensitive columns" with no re-identification analysis — quasi-identifier combinations (zip + birthdate + gender) undo naive masking.

**Senior/lead angle** — Own the policy, not just the practice: a written test-data-handling standard, an approved synthesis toolkit, and a periodic audit — being the person who prevented the prod-dump habit is a staff-level contribution compliance teams remember.

**One-liner** — Synthesize by default, anonymize irreversibly when you must, and never let raw production PII flow downhill into test environments.

### Q11. Database seeding vs API seeding vs UI seeding?

**Interview answer** — API seeding is my default: fast, respects business rules, and decoupled from both the UI and the schema. Direct DB seeding is the fallback when no API exists or when bulk volume makes API calls too slow — accepting the coupling to schema internals and the risk of bypassing validation. UI seeding is never a setup strategy: it's the slowest and flakiest channel, and the UI's job in a test is to be the thing under test, not the loading dock.

**Deep dive** — The trade-off has three axes. Speed: DB bulk operations win by orders of magnitude at volume; API is fast enough per-entity; UI is seconds per record. Realism: API-created data passed through the same validation and side effects (events, downstream syncs) as real data — DB-inserted rows may silently skip an outbox event or cache update, producing states production can never reach, which then "pass" tests against impossible fixtures. Coupling: DB seeds break on every migration and require schema knowledge that test code shouldn't have; API seeds break only on contract changes, which are visible and versioned. That's why the ladder is API → DB (with eyes open) → UI (never for setup). Worth naming the hybrid: seed the bulk background via DB snapshot, create the specific entities under test via API — volume from the cheap channel, correctness from the realistic one.

**Code / structure**

```text
                 speed        realism/side-effects     coupling
API seeding      good         full validation + events  contract only (stable)
DB seeding       best (bulk)  may skip events/caches    schema (fragile)
UI seeding       terrible     full, incl. UI bugs       markup (worst)

Default ladder:
  entity under test        → API
  bulk background volume   → DB bulk-insert / snapshot restore
  no API and no DB access  → escalate as a testability gap
  UI                       → only when UI creation IS the behavior under test
```

**Follow-ups & traps**
- "We seeded via DB and the test passed but prod broke — why?" — the insert skipped the domain event the feature depended on; DB-seeded state must be verified reachable via real flows at least once.
- "The devs won't build seeding endpoints — now what?" — quantify the cost (setup minutes per run × runs per day) and propose test-support endpoints gated to non-prod; this is a negotiation leads are expected to win.
- Weak answer: "UI seeding is more end-to-end so it's more realistic" — realism in the arrange phase is waste; the arrange phase is scaffolding, not coverage.

**Senior/lead angle** — Treat missing seeding APIs as platform debt with a number attached: total CI minutes spent on UI-based setup per month is a figure that gets a test-support endpoint funded.

**One-liner** — API by default, DB for bulk with eyes open about skipped side effects, UI never — the UI is the subject of the test, not its supply chain.

### Q12. How would you design test-data management for thousands of parallel tests across teams?

**Interview answer** — Three pillars. First, a self-service data service: an internal API where any team's tests request entities declaratively — "an approved seller with 3 listings" — and the service resolves creation across the owning systems. Second, entity ownership: the team that owns an entity owns its creation recipe, so the data service composes recipes rather than centralizing domain knowledge. Third, contention removal via ephemeral environments per PR, so most parallel-data pain disappears because suites stop sharing a database at all.

**Deep dive** — At org scale the failure isn't technical first — it's Conway's law: each team builds private seeding helpers against other teams' internals, which break silently when those teams refactor. The data service fixes the coupling by making recipes owned contracts: the payments team maintains "a settled payment," and everyone else consumes it through a stable interface. Namespacing and quotas become platform features — every entity tagged with run and team, reaper jobs and per-team quotas preventing one team's runaway suite from drowning a shared environment. Ephemeral environments are the strategic simplification: per-PR app+DB from a seeded snapshot means isolation by construction, and the shared-env machinery (quotas, reapers, contention) remains only for the staging-like envs that must stay long-lived. The pragmatic rollout matters in the answer: start with the two entities every team re-creates (user, tenant), prove the latency is acceptable, and grow recipe-by-recipe — a big-bang data platform is how this initiative dies.

**Code / structure**

```ts
// The consumer experience the platform is buying:
test('seller sees payout summary', async ({ dataService, page }) => {
  const seller = await dataService.provision('seller', {
    state: 'approved',
    listings: 3,
    payouts: [{ status: 'settled', amountCents: 12_000 }],
  });   // resolved by recipes owned by the seller & payments teams

  await page.goto(`/sellers/${seller.id}/payouts`);
  await expect(page.getByTestId('payout-total')).toHaveText('€120.00');
});
```

```text
Platform responsibilities            Team responsibilities
- data service API + SDK             - recipes for entities they own
- run/team tagging, reaper, quotas   - recipe correctness + versioning
- ephemeral env snapshots            - their tests' declared data needs
- latency + leak dashboards
```

**Follow-ups & traps**
- "Isn't the data service a single point of failure?" — it's a thin orchestrator over the owning systems' APIs; degrade to direct factory calls per team if it's down, and monitor it like any prod-adjacent service.
- "Why not just mandate ephemeral envs and skip the service?" — long-lived staging still exists for integration and performance work, and cross-team entity recipes are valuable in ephemerals too (they seed the snapshot).
- Weak answer: scaling up single-team practices ("everyone uses faker and cleans up") — the cross-team coupling problem is the actual question.

**Senior/lead angle** — Measure the platform like a product: p95 provisioning latency, recipe coverage (top-requested entities), leaked-record trend, and "setup code deleted in consuming repos" — adoption you can defend in a budget review.

**One-liner** — Declarative data service, recipes owned by entity owners, and ephemeral environments to delete the contention problem — platform thinking applied to test data.
