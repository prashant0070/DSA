# Environments & Secrets Management

Environment and secrets questions test operational maturity: can your suite run anywhere without code changes, and can it do so without ever leaking a credential into a repo, a log, or a trace file? This file covers typed config, Playwright-specific environment wiring, secret hygiene, parity, drift, ephemeral environments, and the ownership question underneath most "flaky env" pain.

- Q1. Same framework runs on QA, staging, and prod-like — how do you manage env-specific config?
- Q2. How would you manage different environments in Playwright specifically?
- Q3. Where do you store passwords, API keys, and tokens?
- Q4. How do you prevent secrets from leaking into CI logs?
- Q5. How do you manage config parity between local and CI?
- Q6. How do you handle secret rotation and test accounts?
- Q7. How do you handle third-party sandbox credentials and rate limits per environment?
- Q8. Tests pass in QA but fail in staging — how do you manage environment drift systematically?
- Q9. Ephemeral environments per PR — how and when?
- Q10. Who owns test environments?

### Q1. Same framework runs on QA, staging, and prod-like — how do you manage env-specific config?

**Interview answer** — One config schema, many value sets: a single typed config module defines every setting the framework needs, values come from environment variables with per-env dotenv files for local development, and the module validates everything at startup so a missing or malformed variable fails within seconds with a named error — not twenty minutes in as a mysterious timeout. Code never branches on environment name; it reads config values and capability flags.

**Deep dive** — The failure this design prevents is config sprawl: `if (env === 'staging')` scattered through page objects, three different places URLs are defined, and new environments requiring a code audit. Schema-first inverts it — adding an environment is writing one values file, and the schema is executable documentation of every knob the framework has. Startup validation is the underrated half: unvalidated config fails at the point of use with misleading symptoms (a `undefined/api/orders` 404 that looks like an app bug), while validation fails at load with "STAGING_API_URL is required". Capability flags (Q8) belong in the same schema so "this env has no payment sandbox" is config, not tribal knowledge.

**Code / structure**

```ts
// config/env.ts — schema, validation, single export
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.TEST_ENV ?? 'qa'}` }); // local convenience; CI injects real env vars

const schema = z.object({
  TEST_ENV: z.enum(['qa', 'staging', 'prodlike']).default('qa'),
  BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  TEST_USER_EMAIL: z.string().email(),
  TEST_USER_PASSWORD: z.string().min(1),          // value from secret store, never a file
  CAPABILITIES: z.string().transform(s => s.split(',')).default('payments-mock'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid test config:\n${parsed.error.issues.map(i => `  ${i.path}: ${i.message}`).join('\n')}`);
}
export const env = Object.freeze(parsed.data);
```

```text
config/
├── env.ts            # schema + validation (above)
├── .env.qa           # local values, gitignored except .env.example
├── .env.staging
└── .env.example      # every key, dummy values — the onboarding contract
```

**Follow-ups & traps**
- "Why env vars over a JSON config file per env?" — env vars are the CI-native injection mechanism and the only sane channel for secrets; JSON files invite secrets into git.
- "Where does the schema fail short?" — cross-field rules (sandbox URL required only when capability present) — zod refinements handle it; mention it to show you've hit it.
- Weak answer: "we have a config file per environment" with no validation or typing — the mysterious-timeout failure mode is exactly what interviewers want to hear you prevent.

**Senior/lead angle** — Ship the schema in the shared core so every team's suite speaks the same config vocabulary — platform dashboards and env tooling can then target all suites uniformly.

**One-liner** — One typed schema, values from the environment, validated at startup — config errors should have names, not symptoms.

### Q2. How would you manage different environments in Playwright specifically?

**Interview answer** — Base URL flows from config into `use.baseURL`, so tests navigate with relative paths and never know which environment they're on. For selecting environments I prefer the env-var approach — `TEST_ENV=staging npx playwright test` — over defining a project per environment, because projects multiply against browsers and roles and you end up with a matrix explosion; projects encode what runs, env vars encode where. Auth storage state is captured per environment, since a QA session cookie is useless against staging.

**Deep dive** — Projects-per-env looks appealing (visible in reports, one-flag switching) but couples two orthogonal dimensions: with 3 browsers × 3 envs × 2 roles you're maintaining 18 project entries, and CI almost always runs one env per pipeline anyway — the env is pipeline context, not suite structure. The env-var approach keeps `playwright.config.ts` reading from the validated config module (Q1), so Playwright config is a thin consumer, not a second source of truth. StorageState needs env-scoping people forget: cache auth files keyed by environment (`.auth/staging-user.json`), and include the env in the cache key if you persist auth between CI runs — a stale cross-env session produces baffling redirect loops. Legitimate uses of projects remain: browsers, setup dependencies, and genuinely different test sets (smoke vs full), and saying that distinction cleanly is the senior marker.

**Code / structure**

```ts
// playwright.config.ts — thin consumer of the validated config
import { defineConfig } from '@playwright/test';
import { env } from './config/env';

export default defineConfig({
  use: {
    baseURL: env.BASE_URL,                       // tests use page.goto('/checkout')
    extraHTTPHeaders: { 'x-test-run': process.env.CI_PIPELINE_ID ?? 'local' },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { storageState: `.auth/${env.TEST_ENV}-user.json` },  // env-scoped session
    },
  ],
});
```

```bash
# selection is pipeline context, not suite structure
TEST_ENV=qa       npx playwright test --grep @smoke     # PR gate
TEST_ENV=staging  npx playwright test                   # nightly full run
```

**Follow-ups & traps**
- "When would projects-per-env be right?" — genuinely rare: e.g. one pipeline that must compare two envs in a single run; acknowledge it exists, explain why it's the exception.
- "What breaks first when someone hardcodes URLs in tests?" — the second environment; grep for `https://` in the tests folder during review — a surprisingly effective lint.
- Weak answer: describing only `baseURL` — the env-var-vs-projects reasoning and env-scoped storageState are what distinguish someone who has run multi-env suites.

**Senior/lead angle** — Codify it as the golden path: the shared config module plus a documented `TEST_ENV` contract means every team's suite is env-portable the same way, and platform CI can retarget any suite at any env without reading its code.

**One-liner** — Projects encode what runs, env vars encode where — baseURL from validated config, storage state scoped per environment.

### Q3. Where do you store passwords, API keys, and tokens?

**Interview answer** — Secrets live in the CI platform's secret store or a vault, injected as environment variables at runtime; locally they live in a gitignored `.env` file with a committed `.env.example` documenting the keys with dummy values. Nothing secret is ever committed — the principle is config in code, secrets in the environment. Where possible I avoid long-lived stored passwords entirely and mint short-lived tokens at runtime instead.

**Deep dive** — The reasoning behind the split: config benefits from versioning and review; secrets are harmed by both — a secret in git history is compromised forever (history rewrites are damage control, not undo), and repo access becomes credential access for everyone including forks and laptops. Vault-backed injection (Vault, cloud secret managers, or the CI store for smaller setups) adds rotation without pipeline edits, audit of access, and scoping so the e2e job gets only e2e secrets. The runtime-token upgrade matters: a client-credentials flow that mints a 15-minute token per run means there's no long-lived password to store, leak, or rotate — the stored secret reduces to one client credential with a tight scope. Also worth naming: pre-commit scanning (gitleaks/trufflehog) as the safety net for the day someone pastes a key into a fixture file.

**Code / structure**

```text
Where each thing lives:
  URLs, timeouts, capability flags   → config module, committed
  passwords, API keys, tokens        → CI secret store / vault → env vars at runtime
  local development secrets          → .env.<env> (gitignored)
  documentation of required keys     → .env.example (committed, dummy values)

Defense in depth:
  gitleaks in pre-commit + CI        → catches the accidental paste
  secret scoping per pipeline job    → e2e job cannot read deploy keys
  short-lived tokens via API         → nothing long-lived to leak (Q6)
```

```yaml
# GitHub Actions — injection at the job boundary, nowhere else
jobs:
  e2e:
    steps:
      - run: npx playwright test
        env:
          TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
          API_CLIENT_SECRET:  ${{ secrets.E2E_API_CLIENT_SECRET }}
```

**Follow-ups & traps**
- "A secret was committed last sprint — what now?" — rotate first (the secret is burned regardless), then rewrite history, then add the scanner that would have caught it; rotation before cleanup is the order people get wrong.
- "Why not encrypt secrets in the repo (SOPS-style)?" — workable for GitOps teams, but the decryption key becomes the secret and CI stores already solve injection; know it exists, justify the simpler default.
- Weak answer: ".env file" with no gitignore/example/scanning story — the interviewer hears "one `git add .` from an incident."

**Senior/lead angle** — Make it policy plus tooling, not vigilance: mandatory scanning in the org's shared CI templates, scoped secret access per team, and a documented rotation runbook — hygiene that survives team turnover.

**One-liner** — Config in code, secrets in the environment — vault-injected, gitignored locally, scanned in CI, and ideally short-lived enough that leaking one barely matters.

### Q4. How do you prevent secrets from leaking into CI logs?

**Interview answer** — Three rings of defense: rely on CI masking for registered secrets but never depend on it alone; keep secrets out of anything that prints — no echoing env, no logging request headers at debug level, no secrets in URLs since URLs appear in every log line; and — the one almost everyone misses — scrub artifacts: Playwright traces and HAR files record network traffic including Authorization headers and set-cookie values, so artifacts need the same protection as logs.

**Deep dive** — CI masking works by string-matching registered secret values, so it fails on transformed secrets: base64-encoded basic-auth headers, tokens derived at runtime (minted JWTs the CI never registered), and secrets inside structured output where partial matches miss. That's why ring two is behavioral: the debug-logging trap is real — an API client with `logRequests: true` happily prints bearer tokens the day someone debugs a 401 in CI. Ring three is the differentiator: a Playwright trace attached to a public-ish CI run contains the full network tab; anyone who downloads it has the session cookie and any API tokens the app used. Mitigations: short-lived tokens so captured credentials expire before they matter (the strongest fix), restricted artifact retention and access, and scrubbing HARs/logs of known header names before upload. Saying "the trace file is a leak vector" is the moment the interviewer knows you've operated this for real.

**Code / structure**

```ts
// API client logging: redact by default, allowlist what prints
const REDACT = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
function loggableHeaders(h: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(h).map(([k, v]) => [k, REDACT.has(k.toLowerCase()) ? '<redacted>' : v]),
  );
}
```

```yaml
# artifact discipline in CI
- uses: actions/upload-artifact@v4
  if: failure()                      # traces only on failure, not every run
  with:
    name: playwright-traces
    path: test-results/
    retention-days: 7                # short retention; access limited to the team
```

**Follow-ups & traps**
- "Masking is on — are we safe?" — no: encoded/derived secrets bypass string masking, and artifacts bypass logs entirely; masking is ring one of three.
- "How would you verify nothing leaks today?" — run a canary: put a known marker value in a secret, grep logs and unzipped artifacts for it and its base64 form in a scheduled job.
- Weak answer: "the CI masks secrets automatically" — outsourcing the whole problem to string matching is precisely the weak answer this question exists to catch.
- Trap: secrets in URLs (`?api_key=`) — they evade header-based scrubbing and appear in proxies, HARs, and error messages alike.

**Senior/lead angle** — Push the systemic fix: org-wide short-lived credentials make leaked artifacts time-bombed junk instead of incidents — cheaper than perfecting scrubbing everywhere, and the kind of leverage argument staff engineers are hired to make.

**One-liner** — Masking, redaction discipline, and scrubbed artifacts — and remember the trace file is a full network recording, so treat it like the credential it contains.

### Q5. How do you manage config parity between local and CI?

**Interview answer** — Same entry points, same config path: the command a developer runs locally is the command CI runs, both feeding the same validated config module — CI injects env vars from secrets, local reads a gitignored `.env` seeded from a committed `.env.example`. For the stubborn cases — browser versions, OS-level rendering, system deps — the answer is containers: run the suite in the same image locally and in CI, and "works on my machine" loses its last hiding places.

**Deep dive** — Parity breaks through divergence of entry points: a `Makefile` target locally, a hand-maintained YAML sequence in CI, and six months later the two set different flags and debugging CI failures means archaeology. One script (`npm run test:e2e`) called by both, with all variation flowing through documented env vars, keeps the pipeline a thin caller. The `.env.example` is the onboarding contract — new joiners copy it, fill in from the team vault, and validation (Q1) tells them exactly what's missing. Containers close the environmental gap: Playwright's official image pins browsers and OS libs, so a font-rendering diff or a glibc-dependent crash reproduces locally in the same image instead of being "CI weirdness". Honest residual differences worth naming: CI hardware is slower and parallelism differs — which is why timeouts and worker counts belong in config, explicitly set per context rather than silently defaulted.

**Code / structure**

```text
one entry point, two callers:
  package.json:  "test:e2e": "playwright test"
  local:         cp .env.example .env.qa && npm run test:e2e
  CI:            npm run test:e2e   (env vars from secret store)

container parity for the stubborn cases:
  docker run --rm -v $PWD:/work -w /work \
    mcr.microsoft.com/playwright:v1.46.0-jammy npm run test:e2e

explicit context differences (config, not accident):
  WORKERS=4 locally / WORKERS=2 per CI shard
  retries: CI ? 2 : 0
```

**Follow-ups & traps**
- "A test passes locally, fails in CI — parity checklist?" — env vars diff (print validated config at startup), image/browser version, worker count and timing, then data/env state — in that order, cheapest first.
- "Why not develop inside the container always?" — trace viewers and headed debugging are nicer on the host; container is the arbiter when results diverge, not necessarily the daily loop.
- Weak answer: "we try to keep them in sync" — parity by discipline decays; parity by shared entry point and shared image doesn't.

**Senior/lead angle** — Bake parity into the platform: the shared CI template calls the same npm scripts every repo defines, and the pinned Playwright image version is managed centrally — one upgrade PR per org instead of ten drifting pipelines.

**One-liner** — One entry point, one config path, one container image — parity by construction, with the remaining differences named explicitly in config.

### Q6. How do you handle secret rotation and test accounts?

**Interview answer** — Design so rotation is a non-event: suites read credentials from the secret store at runtime, so rotating means updating the store — no code change, no redeploy of test infra. Test identities are dedicated, clearly named, least-privilege accounts — never a person's account, never a shared "qa@company" that fifty tests and three humans contend over. And wherever the auth system allows it, I replace stored passwords with short-lived tokens minted at run start, which makes most of the rotation problem disappear.

**Deep dive** — Rotation breaks suites when credentials are cached in too many places: hardcoded fallbacks, storageState files with long-lived sessions, per-developer .env files nobody updates. The fixes: no fallbacks (fail loudly on missing creds), auth state regenerated per run or cache-keyed so rotation invalidates it naturally, and rotation executed as store-update-then-verify with a smoke login check — not "rotate and wait for the nightly to explode." Dedicated identities matter beyond hygiene: a personal account in tests means the suite dies when that person leaves, and an over-privileged test account is a real attack surface sitting in every CI run. The short-lived-token upgrade is the structural answer: a client-credentials grant minting 15-minute tokens per run means there is no password to rotate for most flows — the one remaining long-lived secret is a tightly-scoped client credential, rotated on its own calendar without touching test code.

**Code / structure**

```ts
// auth.setup.ts — mint short-lived, log in fresh, never rely on stale sessions
setup('authenticate', async ({ request }) => {
  const token = await request.post(`${env.AUTH_URL}/oauth/token`, {
    data: { grant_type: 'client_credentials',
            client_id: env.E2E_CLIENT_ID, client_secret: env.E2E_CLIENT_SECRET,
            scope: 'e2e:standard' },                    // least privilege
  }).then(r => r.json());
  // token lives ~15 min: long enough for a run, worthless if leaked (see Q4)
  await seedStorageStateFromToken(token.access_token, `.auth/${env.TEST_ENV}-user.json`);
});
```

```text
test account conventions:
  naming        e2e-checkout-standard@example.test  (purpose visible in audit logs)
  privilege     minimum role for the flows tested; separate admin identity, used sparingly
  ownership     registered to the team, documented in the framework README
  rotation      store-update → smoke login check → done; suites read at runtime, never cache
```

**Follow-ups & traps**
- "Rotation broke the nightly anyway — what happened?" — usually a cached storageState or a hardcoded fallback; both are design bugs the rotation exposed, not rotation problems.
- "Why not one shared test user to keep things simple?" — parallel session contention and useless audit trails; per-purpose (and per-worker, file 02 Q5) identities are the scalable shape.
- Weak answer: "we update the password in CI when it rotates" — manual coupling between rotation and test infra is exactly the fragility the question probes.

**Senior/lead angle** — Negotiate testability with the identity team: a non-prod client-credentials flow and self-service test-identity provisioning are platform asks that eliminate an entire category of suite outages — knowing to ask is the staff-level move.

**One-liner** — Runtime-read credentials, dedicated least-privilege identities, and short-lived tokens — the best rotation strategy is having almost nothing long-lived to rotate.

### Q7. How do you handle third-party sandbox credentials and rate limits per environment?

**Interview answer** — Third-party sandboxes get the same config treatment as everything else — per-environment credentials in the secret store, capability flags declaring which env has which integration — plus two disciplines of their own: rate-limit budgeting, because sandbox quotas are shared across every consumer of that env, and a deliberate decision per third party about where we test the real integration versus where we mock it. Most suites should hit the real sandbox in exactly one place and mock it everywhere else.

**Deep dive** — The naive failure: every e2e test exercises the real payment sandbox, parallelism multiplies calls, and the suite starts failing with 429s that look like flake — worse, it exhausts the quota for the manual testers sharing the sandbox. The design answer is narrowing the real-integration surface: a small tagged suite (`@integration-stripe`) exercises the genuine sandbox serially or with low concurrency, while the broad e2e suite runs against a mock or recorded contract — you keep the confidence that the integration works without paying sandbox tax on every checkout test. Credential hygiene per third party: sandbox keys are still secrets (some sandboxes hold quasi-real data, and leaked keys let others burn your quota), per-env key pairs prevent QA runs from consuming staging's budget, and expiry calendars matter because sandbox keys expire on the vendor's schedule, not yours — an expiry-driven outage of the nightly is embarrassingly common. Rate limits belong in config: the API client reads a per-env budget and throttles, so a vendor quota change is a config edit.

**Code / structure**

```text
per third party, decide once and document:
  real sandbox     → @integration-<vendor> suite: few tests, low concurrency,
                     own schedule (nightly), own credentials per env
  everywhere else  → mock/route-interception or contract stub

config shape:
  vendors:
    stripe:   { mode: sandbox, keyRef: E2E_STRIPE_KEY_QA,  rpsBudget: 5 }
    shipping: { mode: mock }          # no sandbox in this env → capability flag

operational guards:
  - client-side throttle reads rpsBudget; 429s page the suite owner, not "flake"
  - key expiry dates tracked with reminders (vendor keys expire on their calendar)
  - webhook testing: sandbox → tunnel/relay to the env under test, or replayed
    recorded payloads for the broad suite
```

**Follow-ups & traps**
- "The sandbox is down — does your release block?" — only the `@integration` suite blocks on it, and even that has a documented override with risk sign-off; the broad suite is insulated by design.
- "Mocks drift from the real vendor — how do you know?" — the small real-sandbox suite is the drift detector; contract tests against vendor OpenAPI specs where available add a cheaper layer.
- Weak answer: "we use the sandbox for everything" — ignores shared quotas, vendor downtime, and cost; the narrowing move is the point of the question.

**Senior/lead angle** — At org scale, centralize vendor test access: one team owns sandbox relationships, quota allocation across teams, and the mock/contract packages others consume — five teams independently rate-limiting themselves against one Stripe sandbox is a coordination failure.

**One-liner** — Real sandbox in one narrow, budgeted suite; mocks everywhere else; per-env keys with tracked expiry — shared quotas are part of your architecture whether you plan them or not.

### Q8. Tests pass in QA but fail in staging — how do you manage environment drift systematically?

**Interview answer** — First triage the instance, but the question asks for the system: make environment differences explicit and machine-checked instead of tribal. Concretely — capability flags in config so known differences are declared and tests skip cleanly rather than fail confusingly; version and health checks in global setup so a suite aimed at a stale environment says so in line one; and a contract with environment owners defining what each env guarantees, verified by a scheduled conformance check.

**Deep dive** — Drift has recurring species: deployment lag (staging runs last week's build — the most common), config divergence (feature flags on in QA, off in staging), data shape differences, integration mode differences (mocked in QA, sandbox in staging), and infra differences (auth providers, CDN behavior). Unmanaged, each produces the same useless symptom — red tests and a shrug — and teams respond by trusting only QA, at which point staging failures get ignored and staging stops being a gate at all. The systematic fixes map to the species: global setup queries the app's version endpoint and fails fast with "staging is on 2.13.0, tests expect >=2.14.0" — turning twenty mysterious failures into one named cause; capability flags turn known divergence into visible skips with reasons, and the skip report becomes a drift dashboard; the env contract makes the remaining differences someone's accountability rather than ambient weirdness. The strategic observation to land: every managed difference is still cost — the roadmap answer is fewer, more identical environments, with ephemerals (Q9) built from the same recipe as staging.

**Code / structure**

```ts
// global-setup.ts — fail fast with a named cause, not twenty timeouts
export default async function globalSetup() {
  const health = await fetch(`${env.API_BASE_URL}/health`).then(r => r.json());
  if (semver.lt(health.version, env.MIN_APP_VERSION)) {
    throw new Error(
      `Env ${env.TEST_ENV} runs app ${health.version}, tests require >=${env.MIN_APP_VERSION}. ` +
      `Check the deploy pipeline before blaming tests.`);
  }
  for (const dep of ['db', 'payments', 'search']) {
    if (health.dependencies?.[dep] !== 'ok') throw new Error(`Env dependency down: ${dep}`);
  }
}
```

```text
drift management stack:
  declared    capability flags per env (config)  → tests skip with reasons
  detected    version/health gate in global setup → one named failure, not noise
  verified    nightly conformance run per env against the env contract
  owned       contract signed by env owner; breaches are their ticket (Q10)
```

**Follow-ups & traps**
- "Isn't skipping tests hiding problems?" — a skip with a reason on a declared difference is information; a failure on an undeclared difference is noise — the skip report is reviewed, not ignored.
- "What if the difference is the finding — staging config is just wrong?" — then the conformance check caught real drift; file it against the env owner, which is the system working.
- Weak answer: pure triage narrative ("I'd check logs, compare configs...") — fine for the instance, but the question says systematically; the interviewer wants the machinery.

**Senior/lead angle** — Drive the environment count down: every difference you're managing is standing cost, and the staff-level play is env-as-code from one recipe so QA, staging, and ephemerals differ only in declared parameters.

**One-liner** — Declare differences as capability flags, detect drift with version gates in setup, verify with conformance runs — and keep shrinking the list of differences to manage.

### Q9. Ephemeral environments per PR — how and when?

**Interview answer** — Per PR, CI spins up a full stack — app plus database seeded from a snapshot — runs the e2e suite against it, and tears it down on merge or close. It's the strongest isolation available: no shared-state contention, no drift accumulation, no cleanup problem, and full-stack feedback lands on the PR that caused the change. The honest caveat is cost and fit: it's superb for containerized stacks with fast startup, and overkill or infeasible for heavy monoliths, licensed dependencies, or stacks with slow provisioning.

**Deep dive** — The economics decide it. Costs: infra spend per PR (mitigated by TTLs, auto-teardown on close, and scale-to-zero previews), startup latency added to every PR cycle (a 10-minute env boot on a 5-minute suite doubles feedback time — snapshot restores and prebuilt images are the levers), and the build-out itself, which is real platform work: env-as-code, seeded DB snapshots, DNS/TLS per preview, and secrets injection per instance. Benefits beyond isolation: environment recipes stop drifting because they're exercised dozens of times daily; "works in QA" disputes end because the env is born from a versioned recipe; and destructive tests become safe since nobody else shares the blast radius. The boundary conditions to name: third-party sandboxes don't multiply with your envs (per-PR envs share vendor quotas — Q7 budgeting still applies), and long-lived staging survives for performance testing, integration soak, and anything needing realistic data volume — ephemerals replace the contended functional env, not every environment.

**Code / structure**

```yaml
# PR pipeline sketch
jobs:
  preview:
    steps:
      - run: preview-env create --name pr-${{ github.event.number }} \
               --image app:${{ github.sha }} \
               --db-snapshot nightly-seeded          # restore beats reseeding (file 02, Q4)
      - run: TEST_ENV=preview BASE_URL=https://pr-${{ github.event.number }}.preview.example.dev \
               npx playwright test --grep @smoke     # tag-sliced: full suite stays nightly
      - if: always()
        run: preview-env destroy --name pr-${{ github.event.number }}
# plus a scheduled reaper for previews whose teardown step never ran
```

**Follow-ups & traps**
- "Your microservice needs 30 sibling services — ephemeral how?" — ephemeral core plus shared stable dependencies, or service virtualization for the periphery; full-stack-per-PR isn't dogma.
- "How do you keep the seeded snapshot fresh?" — rebuilt nightly from versioned seed recipes; a stale snapshot quietly reintroduces the drift problem ephemerals were meant to kill.
- Weak answer: unqualified enthusiasm — recommending per-PR stacks without asking about stack weight, startup time, or vendor quotas ignores exactly the constraints the interviewer is probing.
- Trap: running the entire regression suite per preview — cost explodes; slice by tags and keep breadth on the nightly.

**Senior/lead angle** — Sequence it as a platform investment: prove it on one containerized service, publish the recipe and cost-per-PR numbers, then scale adoption — and present the trade honestly as buying isolation and drift-elimination with infra spend and platform engineering time.

**One-liner** — A fresh stack per PR from a versioned recipe and seeded snapshot — the ultimate isolation and cleanup story, worth it exactly when your stack boots fast and your suite suffers from sharing.

### Q10. Who owns test environments?

**Interview answer** — Someone must, explicitly — and in my experience most chronic "flaky environment" pain is an ownership vacuum, not a technical problem. The model I advocate: a platform or DevOps team owns environment infrastructure and tooling — provisioning, deploys to envs, health monitoring; service teams own their service's behavior and data in every environment; and QA owns the requirements — declaring what test environments must guarantee — without becoming the janitor who restarts staging every morning.

**Deep dive** — The failure modes of each naive model explain the split. QA owns everything: environments become a side duty of the people least empowered to fix infra, QA capacity drains into janitorial work, and dev teams break envs without consequence because someone else mops up. Devs own it diffusely ("everyone's responsible"): nobody is — env work is never sprint work, staging decays, and the loudest complainer becomes the accidental owner. Central platform owns everything including content: the platform team can't know whether the search service's staging config is right — they own pipes, not what flows through them. The three-way split assigns each concern to whoever can actually fix it, and the connective tissue is the environment contract (Q8): QA writes requirements, platform operates against them, service teams keep their piece conformant, and the conformance check plus an env health dashboard make breaches visible with a name attached. The political reality worth voicing: env ownership is unglamorous and chronically underfunded, so a lead's job includes making the cost of non-ownership legible — engineer-hours lost to env-caused red builds is the number that unlocks the staffing conversation.

**Code / structure**

```text
ownership matrix:
  concern                          owner            escalation artifact
  provisioning, env-as-code        platform team    env recipe repo, PRs
  deploys to envs, versions        platform + CD    deploy dashboard
  service config/data per env      service teams    conformance check failures
  env requirements ("must have")   QA/quality lead  environment contract
  env health visibility            platform         health dashboard, alerts

anti-patterns to name in the room:
  "QA owns staging"          → janitors without authority
  "everyone owns it"         → no one owns it
  "file a ticket to infra"   → ownership without responsiveness = same vacuum
```

**Follow-ups & traps**
- "Your org has no platform team — now what?" — a named env owner per environment (a person, rotating if needed) beats a diffuse ideal; the principle is a name, not a specific org chart.
- "Tests are red because staging is down — whose problem?" — the env owner's, and the suite should say so itself: the health gate (Q8) converts env outages into a named env failure, not a wall of red tests QA gets blamed for.
- Weak answer: answering only technically — this question is explicitly organizational; a candidate who can't discuss ownership models hasn't led through env pain.

**Senior/lead angle** — This is the org-design question in the file: the staff move is quantifying the vacuum (env-caused failure hours per month), proposing the ownership matrix, and getting the contract signed — turning ambient suffering into a staffed, measured responsibility.

**One-liner** — Platform owns the pipes, service teams own their contents, QA owns the requirements — and most "flaky env" pain is just ownership nobody assigned.
