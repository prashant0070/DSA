# Authentication & Storage State

Authentication is the highest-leverage optimization in a Playwright suite and one of the most reliable interview differentiators: weak candidates log in through the UI in every test, strong ones log in once and reuse state. This file covers `storageState`, the setup-project pattern, API login, multi-role parallelism, and the operational edges — stale tokens, basic auth, and secret handling.

- Q1. What is `storageState`?
- Q2. How is `storageState` used?
- Q3. End-to-end auth: the setup project pattern (full code)
- Q4. 500 tests requiring auth — UI login every time?
- Q5. API login instead of UI login
- Q6. Multiple roles (admin/user) in parallel
- Q7. Managing cookies directly
- Q8. Sessions and browser storage (localStorage/sessionStorage)
- Q9. When storageState goes stale mid-suite
- Q10. HTTP Basic auth and client certificates
- Q11. Keeping login-UI tests separate from pre-authenticated tests
- Q12. Where do the setup credentials come from?

### Q1. What is storageState in Playwright?

**Interview answer** — `storageState` is a JSON snapshot of a browser context's authenticated state: its cookies plus localStorage entries grouped per origin. You capture it once after logging in with `context.storageState({ path })`, and any new context created with that file starts out already authenticated. The trap to mention: `sessionStorage` is *not* included, because it's deliberately tab-scoped and non-persistent — apps that keep tokens there need a workaround.

**Deep dive** — The file has two top-level keys: `cookies` (full cookie records — name, value, domain, path, expiry, httpOnly, sameSite) and `origins` (an array of `{ origin, localStorage: [{ name, value }] }`). That covers the two places web apps persist sessions: cookie-based sessions and localStorage-held JWTs. Session cookies and sessionStorage are excluded by design — they represent "this browsing session only" semantics. IndexedDB is also not captured by default (a `indexedDB: true` option exists on recent versions for apps like those using Firebase Auth). Because the file is just JSON containing live credentials, it must be gitignored and treated as a secret.

**Code**

```json
{
  "cookies": [
    { "name": "session_id", "value": "9f2c…", "domain": "shop.example.com",
      "path": "/", "expires": 1767225600, "httpOnly": true, "secure": true, "sameSite": "Lax" }
  ],
  "origins": [
    { "origin": "https://shop.example.com",
      "localStorage": [{ "name": "access_token", "value": "eyJhbGciOi…" }] }
  ]
}
```

**Follow-ups & traps**
- "Does storageState include sessionStorage?" — no; this is the intended trap. Wrong answer: "it saves all browser storage."
- "Your app keeps the token in sessionStorage — now what?" — inject it with `addInitScript` at context creation (see Q8).
- "Should the file be committed?" — never; it contains live session credentials.

**One-liner** — `storageState` is a JSON snapshot of cookies plus per-origin localStorage — enough to resurrect a logged-in context, but sessionStorage is excluded.

### Q2. How is storageState used in practice?

**Interview answer** — Two halves: save and load. After logging in once, I call `context.storageState({ path: '.auth/user.json' })` to save. Then in the config I set `use: { storageState: '.auth/user.json' }` so every test's fresh context is created pre-authenticated — tests skip the login screen entirely and `page.goto('/dashboard')` just works. It can also be applied per project, per file with `test.use()`, or per manual context.

**Deep dive** — Loading happens at context creation: Playwright installs the cookies into the network stack and seeds localStorage for each origin before any page script runs, so the app boots exactly as it would for a returning user. Isolation is preserved — each test still gets its own context; they just start from the same snapshot, and mutations in one test never leak to another. The `use` option resolves through the standard chain (global → project → `test.use()`), which is what later enables per-role and unauthenticated overrides.

**Code**

```ts
// Saving (typically inside a setup script)
await page.goto('/login');
await page.getByLabel('Email').fill(process.env.QA_USER!);
await page.getByLabel('Password').fill(process.env.QA_PASSWORD!);
await page.getByRole('button', { name: 'Sign in' }).click();
await expect(page.getByTestId('account-menu')).toBeVisible();
await page.context().storageState({ path: '.auth/user.json' });
```

```ts
// Loading — playwright.config.ts
export default defineConfig({
  use: { baseURL: 'https://shop.example.com', storageState: '.auth/user.json' },
});
```

**Follow-ups & traps**
- "If test A logs out, is test B affected?" — no; B's context is built from the file, not from A's context.
- Wrong answer: saving state in `beforeEach` after a UI login — that's still logging in per test; the point is to log in once.
- "Where do you save it?" — a gitignored `.auth/` directory is the documented convention.

**One-liner** — Save once with `context.storageState({ path })`, then `use: { storageState }` makes every test start logged in.

### Q3. How do you handle authentication end-to-end in Playwright? Show the modern pattern.

**Interview answer** — The modern pattern is a dedicated `setup` project: a small spec that performs the login once and saves `storageState`, plus real test projects that declare `dependencies: ['setup']` and consume the saved file via `use.storageState`. The runner guarantees setup runs first, and every browser project reuses the same state file. It's one login for the entire run, fully visible in reports and traces.

**Deep dive** — Setup projects beat `globalSetup` for auth because they run inside the runner: they get fixtures, retries, HTML-report entries, and trace/screenshot artifacts when login fails — with `globalSetup` a login failure is an opaque process error before any test starts. The `testMatch` on the setup project isolates the auth spec from normal test globs. Dependencies also compose: `--project=chromium` automatically pulls in `setup`, so you can't accidentally run tests without fresh state. Ending the setup with an assertion before saving matters — otherwise you can snapshot a half-completed login and poison every downstream test.

**Code**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: process.env.BASE_URL ?? 'https://staging.shop.example.com' },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
```

```ts
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const userFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.QA_USER!);
  await page.getByLabel('Password').fill(process.env.QA_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Assert login truly completed before snapshotting
  await expect(page.getByTestId('account-menu')).toBeVisible();
  await page.context().storageState({ path: userFile });
});
```

```ts
// tests/orders.spec.ts — starts already authenticated
import { test, expect } from '@playwright/test';

test('shows order history', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Your Orders' })).toBeVisible();
});
```

**Follow-ups & traps**
- "Why a setup project instead of `globalSetup`?" — fixtures, traces, retries, and report visibility on login failure; this comparison is a favorite probe.
- Wrong answer: logging in inside `beforeEach` — negates the entire pattern.
- "What if you run `--project=firefox` only?" — dependencies still trigger `setup` first.
- Trap: saving state without asserting the login landed — flaky poisoned snapshots.

**Senior/lead angle** — This pattern turns auth into infrastructure: one owner, one file, observable failures. On shared staging, pair it with per-worker accounts (Q6/Q9) to avoid cross-run session collisions.

**One-liner** — A `setup` project logs in once and saves state; test projects depend on it and load the file — one login per run, visible in reports.

### Q4. You have 500 tests requiring authentication — would you UI-login before every test?

**Interview answer** — No. A UI login is typically 3–5 seconds; across 500 tests that's 25–40 minutes of pipeline time spent re-testing a login flow that has its own dedicated tests. I'd log in once — via the setup project or, better, an API call — save `storageState`, and have all 500 tests start authenticated. Login correctness stays covered by a handful of tests that target it explicitly.

**Deep dive** — The math is the argument: 500 × 4s = ~33 minutes serialized; even at 8 workers that's ~4 minutes of pure overhead plus 500 extra chances for the login UI to flake — and a login flake fails a test that has nothing to do with login, which erodes trust in the suite. There's also load: 500 UI logins hammer your auth service and can trip rate limiting or lockout policies on shared environments. The counterweight to mention: shared state must be *read-compatible* — tests that mutate the account (change password, log out) need their own state or account, not the communal file.

**Follow-ups & traps**
- "Doesn't reusing state mean login goes untested?" — no; keep a small dedicated login suite (see Q11). Missing this nuance is the common gap.
- "What if a test logs out?" — it mutates only its own context; but tests that *invalidate the server session* need an isolated account.
- Wrong answer: "I'd add retries to absorb login flakes" — treating symptoms, not the design flaw.

**One-liner** — Never pay for 500 logins to test one login — authenticate once, reuse state, and cover the login UI in its own small suite.

### Q5. How would you implement authentication using API login instead of UI login?

**Interview answer** — Instead of driving the login form, I POST the credentials straight to the auth endpoint using Playwright's `request` fixture. For cookie-based sessions, the request context captures the Set-Cookie response, and `request.storageState({ path })` saves it — no browser page involved at all. For localStorage-held JWTs, I take the token from the API response and inject it with `addInitScript` so it's present before the app boots. It's faster than UI login by an order of magnitude and immune to login-form flakiness.

**Deep dive** — `APIRequestContext` maintains its own cookie jar, so a session established over HTTP is fully representable as `storageState` — that's why the cookie path needs zero browser work. The JWT path needs `addInitScript` (not `page.evaluate` after load) because the app reads storage during boot; evaluate-after-load races the app's redirect-to-login logic. Caveats worth volunteering: CSRF-protected login endpoints may need a pre-fetched token; and API login skips whatever the login *page* sets up (analytics state, remember-me cookies), so if a test depends on those, it needs the UI path.

**Code**

```ts
// Cookie session: pure API, no browser
import { test as setup } from '@playwright/test';

setup('authenticate via API', async ({ request }) => {
  const res = await request.post('/api/auth/login', {
    data: { email: process.env.QA_USER!, password: process.env.QA_PASSWORD! },
  });
  expect(res.ok()).toBeTruthy();
  await request.storageState({ path: '.auth/user.json' });
});
```

```ts
// JWT in localStorage: fetch token, inject before app boot
setup('authenticate via token', async ({ request, browser }) => {
  const res = await request.post('/api/auth/token', {
    data: { email: process.env.QA_USER!, password: process.env.QA_PASSWORD! },
  });
  const { accessToken } = await res.json();

  const context = await browser.newContext();
  await context.addInitScript(token => {
    localStorage.setItem('access_token', token);
  }, accessToken);
  const page = await context.newPage();
  await page.goto('/'); // app boots authenticated; localStorage now populated for the origin
  await context.storageState({ path: '.auth/user.json' });
  await context.close();
});
```

**Follow-ups & traps**
- "Why `addInitScript` and not `page.evaluate`?" — init scripts run before the app's own scripts on every navigation; evaluate runs after the app may have already redirected to /login.
- "Does this leave login untested?" — same answer as Q4: dedicated login tests remain.
- Trap: localStorage is per-origin — you must actually visit the origin (or write the origins entry) for the state file to contain it.
- Wrong answer: pasting a hardcoded long-lived token into the repo — expiry and secret-leak problems in one move.

**One-liner** — POST to the auth endpoint with the `request` context and save its storageState — or inject the token via `addInitScript` — skipping the login UI entirely.

### Q6. How do you handle multiple roles (admin and user) running in parallel?

**Interview answer** — One state file per role, produced by the same setup project: `.auth/admin.json` and `.auth/user.json`. Then tests choose their role either through `test.use({ storageState })` at file/describe level, or — my preference — through fixtures like `adminPage` and `userPage`, so a single test can hold both roles at once for cross-role scenarios. Because every test gets its own context, parallel tests with different roles don't interfere.

**Deep dive** — The choice of mechanism is granularity: `test.use` fits "this whole file is admin tests"; fixtures fit "this test needs an admin *and* a buyer simultaneously" (e.g., admin refunds, buyer sees the refund). The scaling caveat is server-side: if all workers share one admin *account* and a test mutates account-level data or invalidates the session, parallel tests collide — the fix is per-worker accounts keyed by `test.info().parallelIndex`, each with its own state file (the pattern the official docs call "one account per parallel worker"). Mention that and you've answered the senior version.

**Code**

```ts
// fixtures.ts
import { test as base, Page } from '@playwright/test';

export const test = base.extend<{ adminPage: Page; userPage: Page }>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: '.auth/admin.json' });
    await use(await ctx.newPage());
    await ctx.close();
  },
  userPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: '.auth/user.json' });
    await use(await ctx.newPage());
    await ctx.close();
  },
});
```

```ts
// refunds.spec.ts — both roles in one test
test('admin refund appears for the buyer', async ({ adminPage, userPage }) => {
  await adminPage.goto('/admin/orders/1042');
  await adminPage.getByRole('button', { name: 'Issue refund' }).click();

  await userPage.goto('/orders/1042');
  await expect(userPage.getByTestId('order-status')).toHaveText('Refunded');
});
```

**Follow-ups & traps**
- "Admin and user test run in parallel — do sessions clash?" — not client-side (separate contexts); server-side only if the app enforces single-session or tests mutate shared account data.
- Wrong answer: logging out and back in as the other role mid-test — slow, serial, and unnecessary.
- "How would you scale to per-worker accounts?" — worker-scoped auth fixture using `parallelIndex` to pick/create the account.

**One-liner** — One state file per role, selected via `test.use` or role fixtures — and per-worker accounts when tests mutate server-side account state.

### Q7. How do you manage cookies directly?

**Interview answer** — `context.addCookies([...])` injects cookies, `context.cookies()` reads them, and `context.clearCookies()` removes them — with filter options for name/domain on recent versions. I use these for surgical cases: seeding a feature flag or consent cookie, asserting a cookie's flags after login, or simulating expiry by clearing the session cookie mid-test. For full auth state I prefer `storageState`, which handles cookies wholesale.

**Deep dive** — Cookies live at the context level, not the page — injected cookies apply to all pages in that context immediately. When adding, you supply either `url` or the `domain`/`path` pair; getting the domain wrong (e.g., missing the leading dot for subdomain-wide cookies) is the usual reason an injected cookie silently fails to apply. `context.cookies()` returns full records, which makes it the right tool for *security assertions*: verifying the session cookie is `httpOnly`, `secure`, and `sameSite` — a test type interviewers like because it shows you think beyond happy paths.

**Code**

```ts
// Seed a consent cookie so the banner never renders
await context.addCookies([{
  name: 'cookie_consent', value: 'accepted',
  domain: '.shop.example.com', path: '/',
}]);

// Assert session cookie security flags after login
const session = (await context.cookies()).find(c => c.name === 'session_id');
expect(session?.httpOnly).toBe(true);
expect(session?.secure).toBe(true);

// Simulate session expiry mid-test
await context.clearCookies({ name: 'session_id' });
await page.reload();
await expect(page).toHaveURL(/\/login/);
```

**Follow-ups & traps**
- "Cookie added but the app doesn't see it" — domain/path mismatch is the first suspect.
- "Can you read an httpOnly cookie from `page.evaluate`?" — no, `document.cookie` can't see it; `context.cookies()` can, because it queries the browser, not the page.
- Wrong answer: managing login by hand-copying cookies from DevTools into code — brittle and expiring; use storageState.

**One-liner** — `addCookies`/`cookies`/`clearCookies` are for surgical seeding and security assertions; wholesale auth state belongs to `storageState`.

### Q8. How do you handle sessions and browser storage — localStorage and sessionStorage?

**Interview answer** — For reads and one-off writes I use `page.evaluate` against the Storage API. For values the app needs *at boot* — tokens, feature flags — I use `context.addInitScript`, which runs before any page script on every navigation. localStorage persists via `storageState`'s `origins` section; sessionStorage doesn't persist at all, so apps that keep sessions there need the init-script injection pattern on every context.

**Deep dive** — The timing distinction is the substance: `evaluate` runs *now*, in a loaded page — too late if the app already read storage during startup and redirected to login. `addInitScript` is installed at the context/page level and executes in every new document before its own scripts, which is exactly the "the value was always there" semantics auth requires. For sessionStorage specifically, the documented workaround is: after UI login, serialize `sessionStorage` to a file via `evaluate`, then in future contexts re-inject it with `addInitScript`. Also remember storage is per-origin — evaluate/inject while on (or scoped to) the right origin.

**Code**

```ts
// Read current storage state
const theme = await page.evaluate(() => localStorage.getItem('theme'));

// Persist sessionStorage once after a real login…
const session = await page.evaluate(() => JSON.stringify(sessionStorage));
fs.writeFileSync('.auth/session.json', session);

// …and re-inject it for future contexts, before the app boots
const saved = JSON.parse(fs.readFileSync('.auth/session.json', 'utf-8'));
await context.addInitScript(data => {
  for (const [key, value] of Object.entries(data)) {
    sessionStorage.setItem(key, value as string);
  }
}, saved);
```

**Follow-ups & traps**
- "Why didn't your injected token work with `page.evaluate` after `goto`?" — the app read storage during boot, before your evaluate ran; use `addInitScript`.
- "Does storageState restore sessionStorage?" — no; that's the whole reason this workaround exists.
- Trap: injecting localStorage for origin A while the test runs on origin B — storage is origin-scoped.

**One-liner** — `evaluate` for reads, `addInitScript` for anything the app needs at boot — and sessionStorage always needs manual re-injection because storageState skips it.

### Q9. What do you do when storageState goes stale (expired token) mid-suite?

**Interview answer** — First line of defense: the setup project re-runs on every invocation, so each run starts with fresh state — staleness within one run only bites when token TTL is shorter than suite duration. For that case I move auth from per-run to per-worker: a worker-scoped fixture logs in via API when the worker starts, so each worker's state is at most worker-lifetime old. The symptom to recognize: a green suite that starts cascading into auth-redirect failures partway through.

**Deep dive** — Diagnose from the failure signature — many unrelated tests failing with `/login` URLs or 401s after minute N is a TTL problem, not a test problem. Escalation ladder: (1) per-run setup project, fine when TTL ≫ suite duration; (2) worker-scoped auth fixture (API login is near-free, so per-worker cost is negligible); (3) for very short TTLs, refresh inside the fixture between tests or intercept 401s and re-authenticate. Prefer fixing the environment when possible: QA configs with 5-minute access tokens are hostile to both testing and development, and extending the test-account TTL is often the correct, boring fix. Retries mask this poorly — the retry re-uses the same stale file and fails again.

**Code**

```ts
// Worker-scoped auth: fresh state per worker, shared by that worker's tests
export const test = base.extend<{}, { workerStorageState: string }>({
  workerStorageState: [async ({}, use) => {
    const id = test.info().parallelIndex;
    const fileName = path.resolve(`.auth/worker-${id}.json`);
    const request = await playwright.request.newContext();
    await request.post(`${process.env.BASE_URL}/api/auth/login`, {
      data: { email: `qa-worker-${id}@example.com`, password: process.env.QA_PASSWORD! },
    });
    await request.storageState({ path: fileName });
    await request.dispose();
    await use(fileName);
  }, { scope: 'worker' }],
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
});
```

**Follow-ups & traps**
- "Why not just add retries?" — the retried test loads the same expired file; retries can't fix stale state.
- "How do you tell stale auth from a real bug?" — time-correlated, cross-cutting login redirects vs a single feature failing.
- Wrong answer: refreshing the token in `beforeEach` via UI — reintroduces per-test login cost.
- Note the override trick: redefining the built-in `storageState` fixture makes every context pick up the worker file with zero test changes.

**Senior/lead angle** — Treat token TTL as a testability requirement: negotiate long-lived test-account tokens in QA, and reserve the worker-fixture machinery for environments you don't control.

**One-liner** — Fresh state per run comes free with setup projects; for short TTLs, move login into a worker-scoped API-auth fixture that overrides `storageState`.

### Q10. How do you handle HTTP Basic auth and client certificates?

**Interview answer** — Both are declarative context options, not UI problems. `httpCredentials: { username, password }` in `use{}` answers the 401 challenge at the network layer, so the native auth dialog never appears — which is essential, because that dialog isn't web content and can't be automated. Client certificates go in `clientCertificates` in `use{}`, pointing at cert and key files (or PFX) per origin, for mTLS-protected environments.

**Deep dive** — Basic auth's dialog is a browser-native window, outside the DOM — the reason the declarative option exists. `httpCredentials` also takes an `origin` field to restrict where credentials are sent, and a `send` mode (`'unauthorized'` — only after a 401 challenge, the default — vs `'always'` for proactive headers). `clientCertificates` (added in the 1.4x line) accepts `{ origin, certPath, keyPath, passphrase }` entries and presents the cert during the TLS handshake for matching origins — this replaced the old workarounds of launching with cert-store flags. Both options can be set per project, which maps cleanly to "staging is behind basic auth, prod-like requires mTLS".

**Code**

```ts
export default defineConfig({
  use: {
    httpCredentials: {
      username: 'staging',
      password: process.env.STAGING_BASIC_AUTH!,
      origin: 'https://staging.shop.example.com',
    },
    clientCertificates: [{
      origin: 'https://partner-api.example.com',
      certPath: './certs/qa-client.crt',
      keyPath: './certs/qa-client.key',
    }],
  },
});
```

**Follow-ups & traps**
- "Can you type into the basic-auth popup?" — no; explaining *why* (native dialog, no DOM) is the point of the question.
- Wrong answer: embedding credentials in the URL (`https://user:pass@host`) — deprecated browser behavior, leaks into logs and traces.
- "Basic auth only on staging, not prod-like?" — set `httpCredentials` on the staging project only, or scope with `origin`.

**One-liner** — `httpCredentials` and `clientCertificates` in `use{}` solve basic auth and mTLS declaratively — the native dialog never opens.

### Q11. How do you keep tests that MUST test the login UI itself separate?

**Interview answer** — Two mechanisms. In-file: `test.use({ storageState: { cookies: [], origins: [] } })` gives that file an explicitly empty, logged-out state, overriding the project default. Structurally — my preference at scale — a dedicated `auth-flows` project whose `use` has no `storageState` and which doesn't depend on the setup project, keeping login tests, and only them, starting from a clean browser.

**Deep dive** — The empty-object literal matters: `storageState: undefined` doesn't reliably override an inherited value through the config chain, whereas `{ cookies: [], origins: [] }` is an affirmative "no state" that wins the override. The project split has operational advantages beyond cleanliness: login tests can't accidentally inherit auth when someone reorganizes config, they're runnable in isolation (`--project=auth-flows`), and they don't force the setup project to run when you're iterating on login itself. Keep this suite small — it's covering the login flow, not re-verifying every authenticated feature.

**Code**

```ts
// login.spec.ts — file-level opt-out
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('rejects wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('qa-buyer@example.com');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
});
```

```ts
// Or in config: a project with no auth dependency
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  { name: 'auth-flows', testMatch: /auth-flows\/.*\.spec\.ts/,
    use: { ...devices['Desktop Chrome'] } },       // no storageState, no dependencies
  { name: 'chromium', testIgnore: /auth-flows/,
    use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
    dependencies: ['setup'] },
]
```

**Follow-ups & traps**
- "Why the empty object instead of `undefined`?" — the explicit empty state overrides inheritance deterministically; `undefined` may fall through to the project value.
- Wrong answer: logging out at the start of login tests — slower and depends on logout working.
- "How many login-UI tests?" — a handful: happy path, invalid credentials, locked account, logout. The other 500 tests reuse state.

**One-liner** — Opt out with `storageState: { cookies: [], origins: [] }` per file, or give login tests their own dependency-free project.

### Q12. Security angle: where do the credentials for the setup login come from?

**Interview answer** — From the environment, never from the repo: locally a gitignored `.env` loaded with dotenv, in CI the platform's secret store — GitHub Actions secrets, Vault, or equivalent — injected as environment variables. The setup script reads `process.env` and fails fast with a clear message if a variable is missing. The generated `.auth/*.json` files are themselves live credentials, so they're gitignored and never uploaded as CI artifacts.

**Deep dive** — The threat model has three surfaces people miss. First, the state files: a leaked `storageState` JSON is a working session — treat it like a password, exclude it from artifact uploads (uploading `test-results/` wholesale can leak it if you've placed state files carelessly). Second, traces and reports: Playwright traces capture network traffic including auth requests; recent versions redact common auth headers in traces, but HTML reports shared publicly still deserve review. Third, the accounts themselves: use dedicated test accounts with minimal privileges in non-prod environments — never a real user's or an engineer's account, and never production credentials in a test pipeline. Rotation should be assumed: since creds arrive via env vars, rotating them is a secret-store change with no code diff.

**Code**

```ts
// auth.setup.ts — fail fast on missing secrets
const user = process.env.QA_USER;
const password = process.env.QA_PASSWORD;
if (!user || !password) {
  throw new Error('QA_USER / QA_PASSWORD must be set (CI secrets or local .env)');
}
```

```yaml
# GitHub Actions
- run: npx playwright test
  env:
    QA_USER: ${{ secrets.QA_USER }}
    QA_PASSWORD: ${{ secrets.QA_PASSWORD }}
```

**Follow-ups & traps**
- "What's sensitive besides the password?" — the saved state files and traces; naming those is what distinguishes a considered answer.
- Wrong answer: "credentials for a test env don't matter" — shared staging often contains production-shaped data.
- "How do you rotate?" — update the secret store; code reads env vars, so no diff, no redeploy of tests.

**Senior/lead angle** — Own the lifecycle: dedicated low-privilege test accounts, secrets in a managed store with rotation, `.auth/` and traces excluded from shared artifacts, and a periodic check that the HTML report isn't leaking headers or tokens to whoever can see CI.

**One-liner** — Credentials come from env vars backed by a secret store, and the saved state files are secrets too — gitignored and kept out of CI artifacts.
