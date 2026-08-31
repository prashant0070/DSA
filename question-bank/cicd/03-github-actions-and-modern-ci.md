# GitHub Actions & Modern CI for Playwright

GitHub Actions is the CI most teams run Playwright on today, and interviews expect you to write the workflow YAML from memory: triggers, caching, sharding with report merging, secrets, and scheduled runs. This file covers the canonical Playwright workflow and the modern-CI concepts — concurrency, reusable workflows, container jobs — plus a survival-level GitLab CI answer.

- Q1. GitHub Actions core concepts
- Q2. Full workflow YAML for Playwright
- Q3. Matrix strategy for browsers/OS
- Q4. Sharding Playwright across jobs
- Q5. Caching in Actions
- Q6. Secrets and environments in Actions
- Q7. Reusable workflows and composite actions
- Q8. Concurrency groups and cancel-in-progress
- Q9. Running Playwright in a container job vs installing deps on the runner
- Q10. Scheduled runs and workflow_dispatch with inputs
- Q11. Publishing the HTML report
- Q12. Self-hosted runners: when and the security risk on public repos
- Q13. GitLab CI equivalent in 60 seconds

### Q1. GitHub Actions core concepts

**Interview answer** — A workflow is a YAML file in `.github/workflows/` that runs in response to events — push, pull_request, schedule, manual dispatch. A workflow contains jobs; each job runs on a fresh runner — a VM, GitHub-hosted or self-hosted — and jobs run in parallel unless you chain them with `needs`. A job is a sequence of steps, and a step either runs a shell command or uses an action — a reusable unit like `actions/checkout` or `actions/cache` from the marketplace. That's the whole model: event triggers workflow, workflow fans out jobs to runners, jobs execute steps.

**Deep dive** — The details interviewers probe under each term:
- **Events** — `push` and `pull_request` with branch/path filters; `schedule` (cron); `workflow_dispatch` (manual, with typed inputs); `workflow_call` (invoked by another workflow — the reuse mechanism); `workflow_run` (chain after another workflow finishes). Knowing `pull_request` runs against the *merge* of the PR into the base by default is a nice detail.
- **Jobs and isolation** — each job gets a clean VM: nothing persists between jobs except explicitly via artifacts (`upload-artifact`/`download-artifact`) or caches. This is why sharded test jobs must upload their reports for a merge job to consume. `needs:` creates the dependency graph; `if:` conditions gate jobs and steps.
- **Runners** — GitHub-hosted (`ubuntu-latest` etc., billed per minute for private repos) or self-hosted (your hardware, your maintenance). Runner choice is a cost/control/security decision (Q12).
- **Actions** — JavaScript actions, Docker actions, or composite actions; pinned by version tag or (stricter) commit SHA — supply-chain hygiene worth mentioning since actions execute with access to your workflow's context.
- **Context and expressions** — `${{ github.ref }}`, `${{ secrets.X }}`, `${{ matrix.shard }}` — the templating that parameterizes everything else.

**Follow-ups & traps**
- "Do jobs share a filesystem?" — no; artifacts or caches only. Candidates who assume shared state design broken sharding.
- "Difference between an action and a step?" — a step is a unit of execution; an action is a reusable implementation a step can `use`.
- Trap: confusing `workflow_dispatch` (manual trigger) with `workflow_call` (reusable workflow invocation).
- "Why pin actions to a SHA?" — a moved tag can inject malicious code into every consumer; SHA-pinning is the supply-chain answer.

**One-liner** — Events trigger workflows, workflows run parallel jobs on fresh runners, jobs run steps, and steps run commands or reusable actions — with artifacts and caches as the only bridges between jobs.

### Q2. Full workflow YAML for Playwright

**Interview answer** — The canonical Playwright workflow: trigger on push to main and on pull requests, run on `ubuntu-latest`, check out, set up Node with npm caching, `npm ci`, install Playwright browsers with OS dependencies, run the suite, and upload the HTML report as an artifact — unconditionally, because the failed run's report is the one you need. It's about twenty-five lines, and being able to write it from memory is table stakes for a Playwright SDET.

**Code**

```yaml
name: e2e
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30                     # never let a hung run bill for 6h
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm                         # caches the npm cache dir, keyed on lockfile
      - run: npm ci                          # lockfile-exact, reproducible install
      - run: npx playwright install --with-deps
        # downloads browsers AND the OS libraries they need on the runner
      - run: npx playwright test
        env:
          TEST_ENV: qa                       # config layer reads this; secrets would
          # come from ${{ secrets.* }}, never literals
      - uses: actions/upload-artifact@v4
        if: always()                         # failed runs need their report most
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

**Deep dive** — The annotations are the interview content: `timeout-minutes` because the default job timeout is 6 hours and a hung browser will happily bill all of it; `cache: npm` on setup-node is the one-line dependency cache (Q5 covers browser caching too); `npm ci` not `npm install` for lockfile fidelity; `--with-deps` because GitHub's runner image doesn't ship every shared library WebKit/Chromium need; `if: always()` on the upload because the default `success()` condition would skip the artifact exactly when a human needs it; and `retention-days` because artifact storage is a real cost line. From here, interviewers extend to sharding (Q4), containers (Q9), or caching browsers (Q5) — this workflow is the trunk everything else branches from.

**Follow-ups & traps**
- "Why `if: always()` on the artifact step?" — the default only runs on success; the report you need is the failure's.
- "What does `--with-deps` add?" — apt-level OS libraries for the browsers; without it, launches fail on the runner with missing-library errors.
- Trap: `npm install` in CI, unpinned action versions, or omitting a job timeout — three small tells reviewers of real workflows look for.
- "How would this change to test only affected code on PRs?" — path filters on the trigger and/or `--grep @smoke` on PRs vs full suite on main — leading into test-scope design.

**One-liner** — Checkout, setup-node with npm cache, `npm ci`, `playwright install --with-deps`, run, and `upload-artifact` with `if: always()` — the twenty-five lines every Playwright SDET should write from memory.

### Q3. Matrix strategy for browsers/OS

**Interview answer** — `strategy: matrix` expands one job definition into a job per combination of the axes you declare — browsers, OS versions, Node versions — running in parallel. The two options that matter: `fail-fast: false`, because the default cancels all remaining combinations the moment one fails, and for a cross-browser suite you want the complete picture, not "Firefox failed so WebKit never ran"; and `include`/`exclude` to prune or extend combinations — for example, only test WebKit on macOS, or add one extra annotated combination.

**Code**

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        os: [ubuntu-latest]
        include:
          - browser: webkit          # WebKit closest to real Safari on macOS
            os: macos-latest
        exclude:
          - browser: webkit          # drop the Linux WebKit cell in favor of macOS
            os: ubuntu-latest
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npx playwright install --with-deps ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: report-${{ matrix.os }}-${{ matrix.browser }}   # unique per cell!
          path: playwright-report/
```

**Deep dive** — Semantics worth stating precisely: `exclude` removes matching combinations before expansion; `include` adds combinations or annotates existing ones with extra keys. Each cell is a full independent job — own runner, own billing — so a 3×3 matrix is nine runners; `max-parallel` caps concurrency if runner quota or a shared test environment can't take the fan-out. Artifact names must embed the matrix values or cells overwrite each other — a real bug people hit. Design judgment the interviewer is fishing for: the matrix belongs in nightly/main builds more than PR gates — running three browsers on every PR triples cost for defects that are rarely browser-specific; a common policy is Chromium-only on PRs, full matrix nightly.

**Follow-ups & traps**
- "Why `fail-fast: false` for tests?" — the default cancellation hides whether a failure is cross-browser or browser-specific — the exact signal a matrix exists to produce.
- "Matrix vs sharding?" — matrix varies *dimensions* (browser/OS); sharding splits *one suite* across identical jobs; they compose (browser axis × shard axis).
- Trap: same artifact name across cells — later uploads collide; embed matrix values in the name.
- "Every PR runs 9 jobs — is that right?" — probably not; scope the matrix to nightly and keep PR gates lean.

**One-liner** — `matrix` fans one job across browser/OS combinations; set `fail-fast: false` to see the whole picture, prune with include/exclude, and keep the big matrix out of the PR gate.

### Q4. Sharding Playwright across jobs

**Interview answer** — This is the modern answer to "our CI takes too long": a matrix over shard numbers, each job running `--shard=N/4` so Playwright deterministically takes a quarter of the suite, each shard emitting a blob report and uploading it, then a final merge job — `needs: test`, runs `if: always()` — downloads all the blobs and runs `npx playwright merge-reports` to produce one unified HTML report, as if the suite had run on one machine. Four shards typically cut wall-clock time to roughly a quarter plus per-job setup overhead.

**Code**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}/4
        env: { PLAYWRIGHT_BLOB_OUTPUT_NAME: report-${{ matrix.shard }}.zip }
        # playwright.config: reporter: [['blob']] when CI sharding
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 1                  # blobs are intermediate, keep short

  merge-report:
    needs: test
    if: always()                             # merge even when a shard failed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          pattern: blob-report-*
          path: all-blob-reports
          merge-multiple: true               # flatten into one directory
      - run: npx playwright merge-reports --reporter=html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

**Deep dive** — Why blob and not just JUnit: the blob report is a complete serialization of the run — attachments, traces, steps — so `merge-reports` reconstructs the full HTML report; merging JUnit XMLs gives you counts but loses the debugging artifacts. `if: always()` on the merge job is essential — the default would skip merging when any shard fails, i.e., exactly when you need the report. Shard balance: Playwright splits by file, so one giant spec file skews shard times; split it or accept the skew. Choosing shard count is a curve of diminishing returns — each shard pays checkout + install (~1–2 min even cached), so shards make sense while per-shard test time comfortably exceeds setup overhead. And each shard still runs multiple workers internally — sharding and workers multiply.

**Follow-ups & traps**
- "Why does the merge job need `if: always()`?" — `needs:` skips dependents when a dependency fails; the failed run's merged report is the whole point.
- "Why blob instead of merging JUnit files?" — full-fidelity reconstruction vs bare counts; traces and attachments survive.
- Trap: 16 shards for a 10-minute suite — setup overhead dominates; the honest math is per-shard runtime vs fixed cost.
- "One shard is much slower than the rest" — file-level distribution skew; split the megafile.

**Senior/lead angle** — Sharding is a spend dial: 4 shards ≈ 4× the billed minutes for ~4× faster feedback. A lead states the policy — shard the PR gate to hit the feedback SLA, run nightly unsharded or lightly sharded where wall-clock doesn't matter — and revisits when the suite grows.

**One-liner** — Matrix over shard numbers with `--shard=N/4` and blob reporters, then a `needs` + `if: always()` merge job that downloads every blob and rebuilds the single HTML report.

### Q5. Caching in Actions

**Interview answer** — Two caches matter for Playwright. The npm cache — one line via `setup-node`'s `cache: npm`, keyed on the lockfile hash — makes `npm ci` fast without the risks of caching `node_modules` itself. And the Playwright browser cache — `actions/cache` on `~/.cache/ms-playwright`, keyed on the Playwright version — because browsers are hundreds of megabytes per run otherwise. The rule for what not to cache: anything derived from the code under test — build output, test results — and don't cache `node_modules` directly across Node-version or OS changes.

**Code**

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm                       # caches the npm cache, keyed on package-lock.json

- run: npm ci

- name: Get Playwright version
  id: pw
  run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"

- uses: actions/cache@v4
  id: pw-cache
  with:
    path: ~/.cache/ms-playwright
    key: pw-browsers-${{ runner.os }}-${{ steps.pw.outputs.version }}

- run: npx playwright install --with-deps
  if: steps.pw-cache.outputs.cache-hit != 'true'
- run: npx playwright install-deps      # OS libs aren't in the cached dir
  if: steps.pw-cache.outputs.cache-hit == 'true'
```

**Deep dive** — Mechanics interviewers check: the cache key must change when the cached content should change — lockfile hash for npm, exact Playwright version for browsers; keying browsers on the lockfile alone works but over-invalidates on unrelated dependency bumps. The subtle trap in browser caching: the cache holds browser binaries but *not* the OS-level shared libraries, so on a cache hit you still run `install-deps` (or use the container image and skip all of this — Q9). Cache scope: caches are branch-scoped with fallback to the default branch, ~10 GB per repo with LRU eviction — a busy repo can evict your browser cache, which looks like random slow runs. What not to cache and why: `node_modules` directly (native modules compiled per Node version/OS — npm cache is the safe layer), build artifacts of the code under test (staleness bugs that cost days), and test results (meaningless across runs).

**Follow-ups & traps**
- "Cache hit but 'browser not found' or launch errors — why?" — missing OS deps (cache holds binaries only) or a Playwright version bump with a stale key; both are classic.
- "Why not cache `node_modules`?" — native-module portability across Node/OS; the npm cache gives most of the win safely.
- Trap: `key: playwright-cache` with no hash — a never-invalidating cache that serves old browsers forever.
- "When does caching stop being worth it?" — when a prebuilt container image makes setup near-zero anyway; caching is the optimization for runner-installed setups.

**One-liner** — Cache npm by lockfile and Playwright browsers by version, remember the OS-deps gap on cache hits, and never cache anything derived from the code you're testing.

### Q6. Secrets and environments in Actions

**Interview answer** — Secrets are stored encrypted at three levels — organization, repository, and environment — and reach the workflow only as `${{ secrets.NAME }}`, masked in logs. Environments add the governance layer: an environment like `production` bundles its own secrets with protection rules — required reviewers, branch restrictions, wait timers — so a job that declares `environment: production` can't touch prod credentials until the protection rules pass. For test automation that's exactly how a post-deploy prod smoke run works: prod test-account credentials live only in the `production` environment, and the smoke job requires an approval or runs only from main.

**Deep dive** —

```yaml
jobs:
  prod-smoke:
    runs-on: ubuntu-latest
    environment: production          # gates the job on protection rules
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npx playwright test --grep @prod-safe
        env:
          BASE_URL: ${{ vars.PROD_URL }}          # non-secret config: variables
          SMOKE_USER: ${{ secrets.PROD_SMOKE_USER }}
          SMOKE_PASS: ${{ secrets.PROD_SMOKE_PASS }}
```

- **Precedence** — environment secrets override repo secrets override org secrets of the same name; `vars` is the parallel store for non-sensitive config (URLs, flags) so secrets stay only for actual secrets.
- **Masking limits** — the runner masks known secret values in logs, but transformations (base64, substrings, interpolation into URLs) defeat it; treat printing paths as leaks, same discipline as Jenkins credentials.
- **Fork PR rule** — `pull_request` workflows from forks don't receive secrets; that's a deliberate defense (a fork could print them). Workflows needing secrets on fork PRs push people toward `pull_request_target`, which is a well-known footgun — it runs with secrets in the base repo's context, and combined with checking out the fork's code it becomes an exfiltration vector.
- **Environment protection** — required reviewers turn a prod-touching job into an approval step; branch restrictions ensure only main can deploy/smoke prod. This is Actions' native manual-gate mechanism.

**Follow-ups & traps**
- "Why don't fork PRs get secrets?" — arbitrary fork code + secrets = exfiltration; knowing this and the `pull_request_target` danger is a strong security signal.
- "Secret vs variable?" — encrypted + masked vs plaintext config; putting a base URL in secrets is harmless but muddies audit; putting a password in vars is an incident.
- Trap: same-named secret at org and repo level and confusion about which wins (most specific wins).
- "How do you gate a prod smoke suite on human approval?" — `environment: production` with required reviewers — not a Slack message and hope.

**Senior/lead angle** — Org-level secrets with repo allowlists centralize rotation; environment protection rules are policy-as-config — a lead maps "who may run what against prod" onto environments rather than tribal knowledge.

**One-liner** — Secrets scope org → repo → environment with masking; environments add approvals and branch rules — which is how prod smoke credentials stay locked behind policy.

### Q7. Reusable workflows and composite actions

**Interview answer** — Both are the DRY mechanism for CI, at different granularity. A composite action bundles *steps* — checkout-node-install-cache as one `uses:` step — good for setup sequences repeated inside jobs. A reusable workflow is a whole workflow with jobs, triggered by `workflow_call` with typed inputs and secrets, that other repos invoke as a job — that's the lead-level answer to "forty repos each maintain their own Playwright workflow": one central `playwright-e2e.yml` in a shared repo, consumers pass base URL, shard count, and tag, and improving CI for the org is one PR.

**Deep dive** —

```yaml
# org/ci-workflows/.github/workflows/playwright-e2e.yml
on:
  workflow_call:
    inputs:
      test-env:  { type: string, default: qa }
      grep:      { type: string, default: '@smoke' }
      shards:    { type: number, default: 2 }
    secrets:
      TEST_USER: { required: true }
      TEST_PASS: { required: true }
jobs:
  test:
    runs-on: ubuntu-latest
    strategy: { fail-fast: false, matrix: { shard: [1, 2] } }  # sized via inputs in real impl
    steps:
      - uses: actions/checkout@v4
      - uses: org/setup-playwright@v1        # composite action: node+cache+browsers
      - run: npx playwright test --grep '${{ inputs.grep }}' --shard=${{ matrix.shard }}/${{ inputs.shards }}
        env:
          TEST_ENV: ${{ inputs.test-env }}
          TEST_USER: ${{ secrets.TEST_USER }}
          TEST_PASS: ${{ secrets.TEST_PASS }}
```

```yaml
# a consuming repo's entire e2e workflow
jobs:
  e2e:
    uses: org/ci-workflows/.github/workflows/playwright-e2e.yml@v3
    with: { test-env: staging, grep: '@regression', shards: 4 }
    secrets: inherit
```

Distinctions to state cleanly: composite action = steps, runs inside the caller's job, no jobs/secrets of its own, lives in a repo with `action.yml`; reusable workflow = jobs (own runners, matrices, environments), called *as* a job, explicit `inputs`/`secrets` contract. Limits worth knowing: nesting depth for reusable workflows is bounded, and a called workflow can't see the caller's secrets unless passed or `secrets: inherit`. Same governance as Jenkins shared libraries: version by tag, changelog, canary consumers — a central workflow is a central point of failure.

**Follow-ups & traps**
- "Composite action vs reusable workflow — pick for X?" — repeated setup steps → composite; a whole pipeline pattern with jobs/matrix → reusable workflow.
- "How do secrets cross the boundary?" — declared in `workflow_call` and passed explicitly, or `secrets: inherit`; they don't flow implicitly.
- Trap: copy-pasting workflow files across repos and calling it reuse — the drift problem this machinery exists to solve.
- "How do you roll out a breaking change to the shared workflow?" — new major tag, consumers migrate on their pin; mutating `@v3` in place breaks the org at once.

**Senior/lead angle** — This is the platform play: paved-road CI as versioned, owned, tested code — the Actions equivalent of a Jenkins shared library, and the interview parallel is worth drawing explicitly.

**One-liner** — Composite actions DRY up steps, reusable workflows DRY up entire pipelines across repos — versioned, with typed inputs and explicit secret contracts.

### Q8. Concurrency groups and cancel-in-progress

**Interview answer** — A `concurrency` block puts runs into a named group where only one run executes at a time, and `cancel-in-progress: true` aborts the running one when a newer run arrives. The canonical use: key the group on the workflow plus the branch or PR ref, so when a developer pushes three fixes in ten minutes, the two stale runs die and only the latest spends runners — nobody needs test results for a commit that's already been superseded.

**Deep dive** —

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Keying on `github.ref` isolates per branch/PR: pushes to PR #12 never cancel PR #14 or main. Keying too broadly (workflow name only) makes unrelated runs cancel each other — a real misconfiguration.
- **Where cancel-in-progress is wrong**: deploy workflows — cancelling a half-finished deploy is worse than queueing; use the same `concurrency` group *without* cancel to serialize deploys instead. Also wrong for runs whose results you keep (nightly regression history). A guarded pattern: `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — cancel stale PR runs, never main's.
- Granularity: `concurrency` works at workflow level and job level — e.g., cancel stale test jobs but let a report-archive job complete.
- The cost math a lead cites: an active PR can get 5–10 pushes; without cancellation a 4-shard suite spends 4 jobs per stale push — cancel-in-progress routinely cuts a team's CI bill double-digit percent for zero signal loss.

**Follow-ups & traps**
- "Why not cancel deploys too?" — a killed deploy leaves half-applied state; serialize with the group, don't cancel.
- Trap: `group: e2e` with no ref — PRs cancel each other across the repo; always scope the group to the ref.
- "What happens to a cancelled run's required check?" — it's superseded by the newer run's check on the newer commit; the merge gate always reflects the head.
- "Same problem in Jenkins?" — `disableConcurrentBuilds(abortPrevious: true)` — showing the mapping across tools reads well.

**One-liner** — Group runs by workflow + ref and cancel-in-progress so stale PR pushes stop billing you — but serialize, never cancel, deploys.

### Q9. Running Playwright in a container job vs installing deps on the runner

**Interview answer** — With `container: image: mcr.microsoft.com/playwright:v1.46.0-jammy`, the job's steps run inside the official Playwright image, where browsers and every OS dependency are preinstalled — so `playwright install --with-deps` disappears, setup gets faster and, more importantly, perfectly reproducible: CI runs the exact browser builds the image pins. Installing on the runner is simpler YAML, follows GitHub's runner image updates automatically, and avoids container quirks. My default: container for stability-critical suites and version pinning; runner-install with caching for simple repos — with the hard rule that the image tag must match the repo's Playwright version.

**Deep dive** —

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.46.0-jammy   # MUST match package.json
      options: --ipc=host                                 # Chromium shm, same as everywhere
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test        # no browser install step at all
```

- **The version-match rule** — the image ships the browser builds for exactly its Playwright version; running Playwright 1.47 code against the 1.46 image means browser/library mismatches with confusing failures. Discipline: bump image tag and `package.json` in the same PR (or generate one from the other).
- **Container trade-offs** — steps run as the container's user (occasional permission friction with checkout/artifacts, sometimes solved by running as root via options or fixing HOME); service containers (`services:`) pair nicely for app+db; the runner-tool cache and some marketplace actions assume the VM environment and need care.
- **Runner-install trade-offs** — needs the caching machinery of Q5 and `--with-deps`, and the browser set follows whatever the current runner image provides at apt level — slightly less pinned, slightly more YAML, zero container quirks.
- Decision heuristic to say out loud: the more you care about "CI is byte-identical to the version we develop against" and the more jobs you run, the more the container wins; one small repo running a smoke pack is fine either way.

**Follow-ups & traps**
- "Image tag vs package.json mismatch — what breaks?" — Playwright can't find the browser revisions it expects, or launches misbehave; the classic trap this question exists for.
- "Why `--ipc=host` here too?" — same Chromium shared-memory issue as any Docker execution; the container context doesn't exempt you.
- Trap: `mcr.microsoft.com/playwright:latest` — unpinned browsers, irreproducible runs.
- "Can you still cache npm inside a container job?" — yes, actions/cache works; only browser installation disappears.

**One-liner** — The container job trades a little YAML friction for preinstalled, version-pinned browsers — and lives or dies by matching the image tag to your Playwright version.

### Q10. Scheduled runs and workflow_dispatch with inputs

**Interview answer** — Nightly regression runs on `schedule:` with a cron expression — say 2 a.m. UTC — and the same workflow also declares `workflow_dispatch` with typed inputs, so anyone can trigger it manually against a chosen environment or tag. That combination is the workhorse: scheduled full regression against staging every night, and on-demand runs for "regression against QA with @payments only, right now" without a YAML edit.

**Deep dive** —

```yaml
on:
  schedule:
    - cron: '0 2 * * 1-5'          # 02:00 UTC weekdays; schedule only runs on default branch
  workflow_dispatch:
    inputs:
      test-env:
        type: choice
        options: [qa, staging, prod-like]
        default: staging
      grep:
        type: string
        default: '@regression'

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      # schedule events carry no inputs — fall back to nightly defaults
      - run: npx playwright test --grep '${{ inputs.grep || '@regression' }}'
        env:
          TEST_ENV: ${{ inputs.test-env || 'staging' }}
```

Facts interviewers check: `schedule` runs against the **default branch only** — you cannot cron a feature branch; cron is **UTC**, so "2 a.m. local" needs converting; scheduled triggers on busy shared infrastructure can start minutes late (GitHub batches them) and are **silently disabled after ~60 days of repo inactivity** — the notorious "our nightly quietly stopped" incident; and `inputs` is empty on schedule events, hence the fallback pattern (`inputs.x || 'default'`). `workflow_dispatch` input types — `choice`, `string`, `boolean`, `environment` — give you a proper form in the UI and are also callable via the REST API/CLI (`gh workflow run`), which is how external systems trigger suites.

**Follow-ups & traps**
- "Your nightly stopped running and nobody noticed — causes?" — inactivity auto-disable, or someone renamed the default branch/file; the meta-fix is monitoring for *absence* of runs, not just failures.
- "Can the nightly run a release branch?" — not via `schedule` directly; dispatch with a ref, or a scheduled job that fans out via API.
- Trap: assuming cron is local time, or expecting `inputs` to exist on scheduled runs.
- "How does an external tool trigger this?" — `workflow_dispatch` via API with inputs; that's the integration surface.

**One-liner** — `schedule` (UTC, default branch, can silently auto-disable) for the nightly plus `workflow_dispatch` with typed inputs for on-demand runs — with input fallbacks because scheduled events carry none.

### Q11. Publishing the HTML report

**Interview answer** — Baseline: upload the Playwright HTML report as an artifact with a retention policy — anyone can download it from the run page, but it's a zip-and-open flow. The upgrade is hosting the report so it's one click from a link: deploy it to GitHub Pages, push it to S3 behind CloudFront, or use a report service. My rule of thumb: artifacts for PR runs — short-lived, viewed rarely — and hosted reports for the nightly and release runs people actually review daily, with the run summary or Slack message carrying the direct URL.

**Deep dive** —
- **Artifact route** — `upload-artifact` with `if: always()` and `retention-days` tuned by tier (PR: 7–14, nightly: 30+). Friction: download, unzip, open — enough that people don't look unless they must. Artifacts also count against storage billing, which is why retention discipline matters (reports with embedded videos get big).
- **GitHub Pages route** — a job deploys `playwright-report/` via `actions/upload-pages-artifact` + `actions/deploy-pages`; each nightly overwrites (or is placed under a per-run path for history). One-click URLs, no CSP problems since it's plain static hosting. Caveats: Pages is public for public repos (access control on private ones requires the right plan), and per-run history needs pathing/index tooling.
- **S3 + CloudFront route** — the scale answer: sync per-run reports to `s3://qa-reports/<repo>/<run-id>/`, lifecycle rules handle retention, access control via the CDN/auth layer, and the URL is stable enough to embed in Slack alerts, PR comments, and dashboards. This is what internal QA portals are usually built on.
- **Closing the loop** — post the report URL where triage happens: a PR comment via a bot/action for PR runs, the failure Slack message for nightlies. An unpublished report is a report nobody reads.

```yaml
- name: Sync report to S3
  if: always()
  run: aws s3 sync playwright-report "s3://qa-reports/${{ github.repository }}/${{ github.run_id }}/"
- name: PR comment with report link
  if: always() && github.event_name == 'pull_request'
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    message: "Playwright report: https://reports.internal/${{ github.repository }}/${{ github.run_id }}/"
```

**Follow-ups & traps**
- "Why host at all if artifacts exist?" — friction: one click vs download-unzip-open determines whether reports get read.
- "Report history over time?" — per-run paths in S3/Pages plus an index; overwriting a single Pages deployment keeps only the latest.
- Trap: publishing reports with real user data/screenshots to public Pages — data-exposure review before hosting is a lead-level reflex.
- "Retention policy?" — tiered by audience: PR short, nightly medium, release evidence long — storage is a budget line, not free.

**One-liner** — Artifacts for short-lived PR reports, hosted (Pages or S3+CloudFront) for the reports people read daily — and always put the direct link where triage happens.

### Q12. Self-hosted runners: when and the security risk on public repos

**Interview answer** — Self-hosted runners are your own machines registered to execute workflows — you choose them when you need what GitHub-hosted runners can't give: access to internal networks and test environments, special hardware, custom images, or better economics at high volume. The security rule every interviewer wants stated: never attach self-hosted runners to a public repository, because anyone can open a PR, and a PR means arbitrary code executing on your infrastructure — inside your network, able to persist malware on a non-ephemeral runner and attack subsequent jobs.

**Deep dive** —
- **Legitimate triggers for self-hosting** — testing apps reachable only on the corporate network/VPN (the common SDET reason), GPU or specific-OS needs, heavy caching on persistent disks, or CI-minute costs at a volume where owned hardware wins. Managed runners' hidden feature is *ephemerality* — every job a clean VM; self-hosting makes state buildup (disk, credentials, zombie browsers) your problem again.
- **The public-repo attack** — fork PR modifies the workflow or test code → workflow runs on your runner → attacker's code runs inside your network with the runner's identity, can read anything on the box, plant persistence, and on a shared runner poison later builds. GitHub's own docs say don't do it; defense-in-depth if you must run OSS infra: require approval for first-time contributors' workflow runs, ephemeral just-in-time runners (one job, then destroyed — e.g., actions-runner-controller on Kubernetes), isolated network segments, minimal runner permissions.
- **Operating them properly (private repos)** — treat runners like any fleet: ephemeral via ARC/autoscaling groups rather than pet VMs, patching pipeline, no broad credentials on the box (jobs bring their own via secrets/OIDC), labels/runner groups to control which repos may target which runners.
- **OIDC aside worth dropping** — for cloud access, workflows should use OIDC federation to assume short-lived roles instead of long-lived secrets on runners; it's a modern-CI signal.

**Follow-ups & traps**
- "Why exactly are public repos + self-hosted runners bad?" — PR = arbitrary code = code execution on your infra; the full chain, not just "insecure."
- "How do you self-host safely at all?" — ephemeral runners, network isolation, runner groups, first-run approval; "we image the VM weekly" is not the answer.
- Trap: self-hosting to save money without pricing the maintenance, patching, and incident risk — TCO again.
- "How do runners get cloud credentials?" — OIDC short-lived tokens over static secrets.

**Senior/lead angle** — The lead decision is fleet architecture: ephemeral autoscaled runners (ARC on K8s) as the default self-hosting pattern, runner groups as the governance boundary, and a written policy for what may run where — the same blast-radius thinking as Jenkins agents.

**One-liner** — Self-host for network access, special hardware, or volume economics — run them ephemeral and isolated, and never on a public repo, where every PR is arbitrary code on your machines.

### Q13. GitLab CI equivalent in 60 seconds

**Interview answer** — GitLab CI reads `.gitlab-ci.yml` from the repo root: you define stages — an ordered list like test, report — and jobs that belong to stages; jobs in the same stage run in parallel, stages run in sequence, and runners execute the jobs, typically in Docker images you name per job. Playwright maps directly: a test job using the Playwright image, `parallel:` with `matrix:` or a numeric `parallel: 4` for sharding via the predefined `CI_NODE_INDEX`/`CI_NODE_TOTAL` variables, artifacts declared with `when: always` and JUnit wired into merge requests via `artifacts:reports:junit`.

**Deep dive** —

```yaml
stages: [test, report]

e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.46.0-jammy
  parallel: 4                       # shards: CI_NODE_INDEX of CI_NODE_TOTAL
  script:
    - npm ci
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths: [blob-report/]
    reports:
      junit: results/junit.xml      # renders in the MR test widget
    expire_in: 14 days
```

Mappings that let you survive follow-ups: job+image ≈ Actions job+container; `rules:` ≈ `if:`/triggers (push, MR, schedules via pipeline schedules in the UI); `parallel: matrix:` ≈ Actions matrix; `needs:` exists too and additionally breaks stage ordering for DAG pipelines; secrets are CI/CD variables (maskable, protected-branch-scoped); runners are shared (SaaS) or self-managed, same trade-offs as Actions self-hosted. Differentiators worth one sentence: `artifacts:reports:junit` renders failed tests directly in the merge request widget, and GitLab bundles registry/environments/review-apps into the same product.

**Follow-ups & traps**
- "How do you shard Playwright in GitLab?" — `parallel: N` + `--shard=$CI_NODE_INDEX/$CI_NODE_TOTAL`; knowing the two predefined variables is the whole answer.
- "Actions `if:` equivalent?" — `rules:` with conditions per job.
- Trap: forgetting `when: always` on artifacts — same failure-report gap as forgetting `if: always()` in Actions.
- "Stages vs needs?" — stages give coarse sequential phases; `needs` builds a finer DAG that can start jobs before the previous stage completes.

**One-liner** — `.gitlab-ci.yml` with stages and jobs on Docker images, `parallel:` plus `CI_NODE_INDEX/TOTAL` for sharding, and `artifacts:reports:junit` for MR-native test results — the concepts map one-to-one from Actions.
