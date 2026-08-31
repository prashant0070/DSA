# Docker for Test Automation

Docker questions in SDET interviews test whether you can run browsers reliably in containers — which has sharp edges like shared memory, version pinning, and resource starvation — and whether you understand images, layers, and compose well enough to design CI execution. This file covers the fundamentals through the Playwright-specific traps to lead-level Kubernetes fan-out.

- Q1. Why run tests in Docker?
- Q2. Image vs container vs Dockerfile vs registry — 60-second fundamentals
- Q3. The official Playwright Docker image
- Q4. Write a Dockerfile for a Playwright test suite
- Q5. Why --ipc=host / shm-size matters for Chromium in Docker
- Q6. docker-compose for app + tests
- Q7. Running headed browsers in containers
- Q8. Selenium Grid on Docker
- Q9. Volumes for reports/artifacts out of the container
- Q10. Docker layer caching in CI to speed up builds
- Q11. Resource limits
- Q12. Kubernetes for test execution at scale
- Q13. Common Docker interview commands rapid-fire

### Q1. Why run tests in Docker?

**Interview answer** — Four reasons. Environment parity: the container carries the exact Node version, browser builds, and OS libraries, so "works on my machine but not in CI" largely disappears — everyone runs the same image. Disposability: each run starts from a clean container, so no state from a previous run — cookies, downloads, zombie processes — can contaminate results. CI-friendliness: CI systems natively schedule containers, so the test environment becomes an artifact the pipeline pulls rather than something it builds. And version pinning: the image tag pins browsers and dependencies exactly, so upgrading is a deliberate, reviewable change instead of drift.

**Deep dive** — The mechanism behind each claim: an image is an immutable filesystem snapshot, so parity is byte-level, not "roughly the same versions" — the classic failures it kills are missing shared libraries on CI runners and browser builds differing between a dev laptop and CI. Disposability follows from the copy-on-write layer: writes go to a container layer that's discarded on `docker rm`, so cleanliness is guaranteed by construction rather than by cleanup scripts that eventually rot. In CI terms, the image inverts setup: instead of five minutes of install steps, the runner pulls a prebuilt image (cached after first pull) and starts testing in seconds. Version pinning turns "Chrome auto-updated and broke the suite overnight" into "we bump the image tag in a PR and see the diff in CI first."

Honest costs to volunteer: an image to maintain and rebuild on dependency changes, container-specific sharp edges (shared memory for Chromium — Q5, resource limits — Q11), and slightly more indirection when debugging locally. Net strongly positive for browser testing, but the trade-offs answer sounds senior; the pure sales pitch doesn't.

**Follow-ups & traps**
- "Doesn't caching dependencies in CI achieve the same?" — caching speeds installs but doesn't pin OS-level libraries or guarantee parity with laptops; the image does both.
- "What new problems does Docker introduce?" — shm/IPC for Chromium, resource-limit flakiness, image maintenance; a candidate with no answer here hasn't actually run browsers in containers.
- Trap: "Docker makes tests faster" as the headline — the speed is in setup, not execution; parity and disposability are the real wins.

**One-liner** — Docker gives tests byte-identical environments, a guaranteed-clean slate per run, instant CI setup via image pull, and browser versions that change only when you change the tag.

### Q2. Image vs container vs Dockerfile vs registry — 60-second fundamentals

**Interview answer** — A Dockerfile is the recipe — instructions that build an image. An image is the immutable, layered snapshot the build produces: filesystem plus metadata like the default command. A container is a running (or stopped) instance of an image — the image is the class, the container is the object, and you can run many containers from one image. A registry is where images are stored and distributed — Docker Hub, GitHub Container Registry, Microsoft's MCR where the Playwright image lives, or a private registry — addressed as `registry/name:tag`.

**Deep dive** — The depth checks hiding behind the definitions: images are stacks of read-only layers, one per Dockerfile instruction, and layers are content-addressed and shared — which is why ordering Dockerfile instructions matters for caching (Q10) and why twenty containers from one image cost almost no extra disk. A container adds one writable layer on top; that layer dies with the container, which is exactly the disposability property from Q1 — and why persisting reports needs volumes (Q9). Tags are mutable pointers, not versions: `latest` (or any tag) can move underneath you, which is why pinned, specific tags — or digests (`image@sha256:...`) for the strict — are the reproducibility answer. The pull/push flow: CI builds and pushes to the registry; runners pull by tag; the registry is the distribution hub that makes "the environment is an artifact" true.

**Follow-ups & traps**
- "Difference between an image and a container, precisely?" — immutable layered snapshot vs a process running on top of it with a writable layer; the class/object analogy lands well.
- "What's wrong with `latest`?" — it's a moving pointer: pulls at different times get different content; pin tags, or digests when supply-chain matters.
- Trap: "a Dockerfile is an image" or "a container is a VM" — containers share the host kernel and isolate via namespaces/cgroups; VMs virtualize hardware. The VM confusion is the most common fundamentals fail.
- "Where do your CI test images come from?" — built in a pipeline, pushed to the org registry, pulled by tag in test jobs — showing the lifecycle beats reciting definitions.

**One-liner** — Dockerfile builds image, image instantiates containers, registry distributes images — and tags are mutable pointers, so pin them.

### Q3. The official Playwright Docker image

**Interview answer** — `mcr.microsoft.com/playwright` is Microsoft's maintained image containing everything browser tests need: Ubuntu base, Node, and — critically — the exact Chromium, Firefox, and WebKit builds for a specific Playwright version, plus every OS library they require. The critical rule is tag discipline: the image tag must match the Playwright version in your `package.json` — `v1.46.0-jammy` for Playwright 1.46.0 — because each Playwright release pins specific browser revisions, and running your code against a different image's browsers is a version mismatch that produces confusing, sometimes silent, breakage.

**Deep dive** — What's inside: browser binaries preinstalled at the system location with all shared-library dependencies (the stuff `--with-deps` would apt-install), Node.js, and utility users/config for running as non-root. What's *not* inside: your `node_modules` — you still `npm ci` your own dependencies (or bake them into a derived image, Q4).

The mismatch trap, mechanically: Playwright resolves browsers by revision number per release. Suppose the image is `v1.46.0` but `package.json` says `1.47.0` — your Playwright expects different browser revisions than the image ships, so it either fails with "browser not found" (loud, lucky) or someone "fixes" it by running `playwright install` inside the container at runtime, silently downloading hundreds of MB every run and testing against unpinned browsers — defeating the image's entire purpose. Interviewers who've operated this ask precisely because both failure modes are common. Team discipline: single source of truth — a Renovate/Dependabot rule or a CI check that fails when tag and package version diverge, and bump both in one PR. Tag anatomy: `v<playwright-version>-<ubuntu-codename>` (`jammy`/`noble`); there are also `-arm64` variants and language-flavored images (Python, Java, .NET).

**Follow-ups & traps**
- "What happens if image tag and package.json disagree?" — browser-revision mismatch: 'executable not found' or runtime downloads that unpin your browsers; describing both modes signals experience.
- "Why not just `playwright install` inside the container?" — it works, but re-downloads per run and unpins versions; the image exists so browsers are baked and pinned.
- Trap: `mcr.microsoft.com/playwright:latest` in a pipeline — unpinned browsers plus guaranteed eventual mismatch with your lockfile.
- "How do you keep the tag and package version in sync at scale?" — one PR bumps both, enforced by a CI check or dependency bot config.

**One-liner** — The official image bakes the exact browsers and OS libraries for one Playwright version — so the image tag must equal your package.json version, bumped together in the same PR.

### Q4. Write a Dockerfile for a Playwright test suite

**Interview answer** — Start `FROM` the official Playwright image at the tag matching my Playwright version, set a `WORKDIR`, copy `package.json` and the lockfile *first* and run `npm ci` — that ordering is deliberate, because Docker caches layers top-down, so dependency installation only re-runs when the lockfile changes, not on every test edit — then copy the test code and config, and set the default `CMD` to run the suite. Reports come out via a mounted volume rather than living in the container.

**Code**

```dockerfile
# Tag MUST match the @playwright/test version in package.json
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

# Dependency layer first: cache survives test-code changes
COPY package.json package-lock.json ./
RUN npm ci

# Test code last: edits here only invalidate cheap layers
COPY playwright.config.ts ./
COPY tests/ ./tests/

# Fail-safe defaults; override at `docker run` for env/tags
ENV CI=true
CMD ["npx", "playwright", "test"]
```

```bash
# Build once, run with env config and a volume for the report
docker build -t myapp-e2e:$(git rev-parse --short HEAD) .
docker run --rm --ipc=host \
  -e TEST_ENV=qa -e BASE_URL=https://qa.example.com \
  -v "$PWD/playwright-report:/app/playwright-report" \
  myapp-e2e:abc1234 npx playwright test --grep @smoke
```

**Deep dive** — The layer-ordering rationale is the core of the question: each instruction is a cached layer invalidated when its inputs change, and everything after an invalidated layer rebuilds. Test code changes daily; dependencies change weekly — so `COPY package*.json` + `npm ci` above `COPY tests/` means the expensive install layer is almost always a cache hit. Copying everything with one early `COPY . .` is the anti-pattern this question screens for: every commit re-runs `npm ci`. Supporting details: no browser installation appears anywhere — that's the base image's job; `CMD` in exec form is the default but overridable per run (different tags/envs from one image); config enters at runtime via `-e`, never baked in — secrets in image layers are permanent and extractable; a `.dockerignore` excluding `node_modules`, `test-results`, and `playwright-report` keeps the build context small and prevents a local `node_modules` from leaking into the image.

**Follow-ups & traps**
- "Why copy package files before the source?" — layer-cache economics; this is *the* expected answer and interviewers wait for the word "cache."
- "Where do secrets/base URLs go?" — runtime env vars or CI secret injection; `ENV API_KEY=...` in a Dockerfile is an instant red flag.
- "Why is there no `playwright install` step?" — base image ships the browsers; adding it re-downloads and can unpin versions.
- Trap: no `.dockerignore` — slow builds and a host `node_modules` (wrong OS binaries) shadowing the image's.

**One-liner** — FROM the version-matched Playwright image, lockfile and `npm ci` before the test code for layer caching, config via runtime env — and browsers come from the base image, never a RUN step.

### Q5. Why --ipc=host / shm-size matters for Chromium in Docker

**Interview answer** — Docker gives containers a 64 MB `/dev/shm` by default, and Chromium uses shared memory heavily for inter-process communication and rendering buffers. When a real page — big DOM, images, multiple tabs — exhausts those 64 MB, renderer processes crash with "tab crashed" or the browser dies mid-test, and it presents as random flakiness because it depends on which pages the shard happened to load. The fixes: `--ipc=host` so the container shares the host's IPC namespace and full shm — which is what Playwright's own docs recommend — or `--shm-size=1g` to enlarge the container's own shm.

**Deep dive** — Mechanism: Chromium's multi-process architecture passes rendering and compositing data between browser, renderer, and GPU processes through shared memory in `/dev/shm`. 64 MB is a Docker default from an era of tiny containers, and it's the single most common "Playwright/Puppeteer crashes only in CI" root cause. Symptoms to recognize from the description alone: `Page crashed`, `Target closed`, tests failing only on heavy pages, failure rate rising with worker count (workers share the allocation). The options ranked: `--ipc=host` — simplest and Playwright-recommended; trade-off is weaker IPC isolation from the host (fine for CI runners, worth a thought on shared multi-tenant hosts). `--shm-size=1g` — keeps isolation, needs sizing (workers × page weight). Where the flag lives per context: `docker run --ipc=host`; compose `ipc: host` or `shm_size: '1gb'`; GitHub Actions container jobs via `options: --ipc=host`; Jenkins Docker agent `args '--ipc=host'`; Kubernetes has no ipc-host analogue for this — mount an emptyDir with `medium: Memory` at `/dev/shm`. The historic workaround `--disable-dev-shm-usage` (push Chromium to `/tmp` instead) still floats around Selenium-era answers — mention it as legacy, not the recommendation.

**Follow-ups & traps**
- "Tests pass locally, crash randomly in CI containers with 'page crashed' — first suspect?" — shm exhaustion; this exact symptom-to-cause mapping is what's being tested.
- "`--ipc=host` vs `--shm-size` — which and why?" — ipc=host per Playwright's recommendation; shm-size when host IPC sharing is unacceptable; knowing both with the trade-off is full marks.
- Trap: chasing this as test flakiness — retries "fix" it statistically, hiding an infra bug with a one-flag solution.
- "Same problem in Kubernetes?" — yes, and the fix differs: memory-backed emptyDir mounted at `/dev/shm`.

**One-liner** — Docker's 64 MB `/dev/shm` starves Chromium's shared-memory IPC and crashes tabs at random — run with `--ipc=host` (Playwright's recommendation) or a bigger `--shm-size`.

### Q6. docker-compose for app + tests

**Interview answer** — Compose declares the whole test topology in one file: the app service (with its database), and a test service that runs Playwright against it. The critical part is startup ordering done right: plain `depends_on` only waits for the container to *start*, not for the app inside to be ready, so the app service defines a `healthcheck` and the test service uses `depends_on` with `condition: service_healthy`. Services share a network and reach each other by service name — so the tests' base URL is `http://app:3000`, not localhost — and one `docker compose run tests` gives any machine, CI or laptop, the identical stack.

**Code**

```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: test, POSTGRES_DB: app }
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      retries: 15

  app:
    build: .
    environment: { DATABASE_URL: "postgres://postgres:test@db:5432/app" }
    depends_on:
      db: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 3s
      retries: 20

  tests:
    image: mcr.microsoft.com/playwright:v1.46.0-jammy
    ipc: host
    working_dir: /work
    volumes:
      - ./:/work
      - ./playwright-report:/work/playwright-report
    environment: { BASE_URL: "http://app:3000" }
    depends_on:
      app: { condition: service_healthy }
    command: sh -c "npm ci && npx playwright test"
```

```bash
docker compose up -d app
docker compose run --rm tests          # exit code = test result, gates CI
docker compose down -v                 # clean teardown, drop db volume
```

**Deep dive** — The interview substance is the readiness chain: db healthy → app starts and passes its own healthcheck → tests run. Without `condition: service_healthy`, tests race the app boot and fail with connection-refused — the naive fix is a `sleep 30`, which is both slow and still racy; the healthcheck is the correct answer and interviewers listen for it. Networking: compose creates a network where service names resolve via DNS — hence `http://app:3000`; using `localhost` inside the tests container is the classic mistake (localhost is the tests container itself). `docker compose run tests` propagates the test exit code, which is how CI turns this into a gate; `--abort-on-container-exit --exit-code-from tests` with `up` is the alternative. This is also the mechanics behind per-PR ephemeral environments: same file, project name per PR, torn down after.

**Follow-ups & traps**
- "What does `depends_on` actually guarantee?" — start order only, unless you add `condition: service_healthy` — the single most-asked compose question.
- "Why can't tests use localhost?" — each container has its own network namespace; service-name DNS is the compose way.
- Trap: `sleep` before tests instead of healthchecks — works until it doesn't, and pads every run.
- "How does CI know the tests failed?" — `compose run` returns the container's exit code; don't `up -d` the tests and poll logs.

**One-liner** — Compose runs app, db, and tests on one network with service-name URLs — and correctness hinges on healthchecks with `condition: service_healthy`, never `sleep`.

### Q7. Running headed browsers in containers

**Interview answer** — Containers have no display server, so headed browsers can't render — which is fine, because CI should run headless anyway; modern headless Chromium (the "new" headless mode) is the same browser engine as headed, so the old "headed catches rendering bugs headless misses" argument is mostly obsolete. When you genuinely need headed in a container — typically debugging a headless-only failure or driving a video capture of real rendering — you run `xvfb`, a virtual framebuffer X server, and Playwright's image ships `xvfb-run` for exactly that.

**Deep dive** — Mechanics: X11 applications need a `DISPLAY`; xvfb provides one backed by memory instead of a GPU/monitor: `xvfb-run npx playwright test --headed`. When it's worth bothering: reproducing a bug that manifests only headed (rare since headless-new, but real for some GPU/compositing paths and extensions — Chrome extensions historically required headed mode), recording demo videos where you want true rendering, or legacy frameworks predating good headless. Not worth it: routine CI — xvfb adds a process, slight overhead, and another thing to break, for no assertion the DOM-level tests care about. The headless-new nuance that earns points: Chromium's old headless was a separate implementation with genuine behavioral differences (fonts, viewport, some APIs); the new headless (Playwright uses the modern mode; `chromium` channel options expose it explicitly) shares the browser code, shrinking the class of "passes headless, fails headed" bugs dramatically. Playwright-specific extra: for interactive debugging against a remote/containerized browser, headed-in-xvfb plus VNC, or better, run the trace viewer / `--debug` locally against the same version instead — usually the saner workflow.

**Follow-ups & traps**
- "Do you run headed in CI?" — no; headless-new for speed and simplicity, headed reserved for targeted debugging — with the xvfb mechanism named to show you *could*.
- "Is headless behavior really identical now?" — much closer since headless-new shares the engine; residual gaps around GPU/extensions — a calibrated answer beats "yes."
- Trap: cargo-culting xvfb into every CI pipeline "for realism" — cost without measurable benefit.
- "A test passes headless and fails headed — what do you do?" — same version both modes, trace both, diff environment (viewport, fonts, GPU flags); not "mark it flaky."

**One-liner** — Containers run headless by default and headless-new made that nearly equivalent to headed — keep xvfb in your pocket for the rare headed-only debugging or recording case.

### Q8. Selenium Grid on Docker

**Interview answer** — Selenium Grid is hub-and-nodes: the hub receives WebDriver sessions and routes them to browser nodes, and Docker made it practical — a compose file with a hub and chrome/firefox node containers, scaled with `--scale chrome=4`. Playwright deliberately has no grid: each worker launches its own browser in-process, so parallelism is workers and CI shards, not a shared browser farm. When Playwright does need remote execution — tests here, browsers there — the mechanism is a browser server and `connect()` over WebSocket, or a vendor cloud like BrowserStack, but for most teams the grid concept simply dissolves into "run more containers."

**Code**

```yaml
services:
  selenium-hub:
    image: selenium/hub:4.23
    ports: ["4444:4444"]
  chrome:
    image: selenium/node-chrome:4.23
    shm_size: 2gb
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
    # docker compose up --scale chrome=4
```

**Deep dive** — Why Grid exists for Selenium: WebDriver is a remote protocol by design, so centralizing browsers on a farm lets many test clients share capacity and browser/OS variety; the Docker images (and Selenium 4's dynamic-grid/Kubernetes story) made node management tolerable, though session queues, node crashes, and version skew between client, hub, and nodes remain classic operational pain. Why Playwright doesn't need it: architectural — Playwright drives browsers over its own protocol via a process it launches; parallelism scales by adding workers/machines that each own their browsers, removing the shared-hub bottleneck and its failure modes. Remote execution when genuinely needed: `playwright launchServer` / `connect(wsEndpoint)` runs browsers on a beefy host while tests run elsewhere (also `connectOverCDP` for CDP endpoints); third-party services provide hosted Playwright browsers. The comparison sentence that lands: Selenium centralizes browsers and distributes sessions; Playwright distributes everything and centralizes nothing — which is why "how do you grid Playwright?" is usually answered "you shard instead."

**Follow-ups & traps**
- "How do you scale Playwright like a grid?" — you don't build a farm; workers per machine × shards across machines, with `connect()` only for genuine remote-browser needs.
- "What operational problems did your Grid have?" — node/browser version skew, hub as a single point of failure, orphaned sessions — real answers here prove real usage.
- Trap: proposing Selenium Grid infrastructure for a Playwright suite — signals concept-transfer without understanding the architecture.
- "When would you still use `connect()`?" — browsers needing special hardware/network position, or offloading browser compute from small CI runners.

**One-liner** — Grid solves Selenium's remote-session problem with a hub and Docker nodes; Playwright skips the farm — workers and shards own their browsers, with `connect()` for the rare remote case.

### Q9. Volumes for reports/artifacts out of the container

**Interview answer** — A container's writable layer disappears with the container, so reports, traces, and screenshots written inside are lost on exit unless you map them out. The standard pattern is a bind mount: `-v $PWD/playwright-report:/app/playwright-report`, so Playwright writes "inside" but the files land on the host, where CI's artifact steps pick them up. The alternative for a container you didn't mount — `docker cp` after the run — works but is a recovery move, not a design.

**Deep dive** — Bind mounts vs named volumes, and when each: bind mounts (`host/path:container/path`) put artifacts exactly where the CI workspace expects — right for test outputs; named volumes are Docker-managed storage better suited to things like database data in compose stacks — using one for reports just moves the "how do I get files out" problem. Practical edges that separate practitioners: mount the *output directories* (`playwright-report/`, `test-results/`) not the whole workspace when you only need outputs; permissions — the container user's UID may not match the host user, producing root-owned files a later CI cleanup step can't delete (fix with `--user $(id -u):$(id -g)` or aligning the image's user); and in compose, the mount lives in the tests service (see Q6). In Kubernetes the same need is met by emptyDir volumes plus a sidecar/step that ships results to object storage, since pod filesystems are as ephemeral as containers. Wire the whole path: config writes to `playwright-report/` → bind mount surfaces it on the host → `archiveArtifacts`/`upload-artifact` publishes it — any broken link and the red build has no evidence.

**Follow-ups & traps**
- "Tests ran in Docker, build red, no report — what happened?" — nothing was mounted; the report died with the container. The question this section exists for.
- "Bind mount or named volume for reports?" — bind mount: CI needs the files in the workspace; named volumes serve persistent service data instead.
- Trap: root-owned artifact directories breaking subsequent host steps — the UID mismatch is a rite of passage; knowing `--user` is the tell.
- "`docker cp` instead?" — viable post-mortem, fragile as design: requires the container to still exist and adds an extra step that's easy to skip on failure paths.

**One-liner** — Container filesystems die with the container — bind-mount the report and results directories to the host so CI can archive them, and mind the UID on what gets written.

### Q10. Docker layer caching in CI to speed up builds

**Interview answer** — Docker builds reuse cached layers when an instruction and its inputs are unchanged, so a well-ordered Dockerfile — dependencies before source — rebuilds in seconds locally. In CI the catch is that ephemeral runners have no local cache to reuse, so you have to give the cache persistence: pull a previous image and build with `--cache-from`, or better, use BuildKit's registry cache exporters, which push cache metadata alongside the image so any runner can restore it. On GitHub Actions the packaged version of this is `docker/build-push-action` with `cache-from`/`cache-to` (registry or the `gha` cache backend).

**Deep dive** — Cache mechanics precisely: each instruction's cache key includes the parent layer and the instruction; for `COPY`/`ADD`, also the checksums of copied files — so touching one test file invalidates from that `COPY` down, which is why lockfile-then-`npm ci`-then-source ordering (Q4) is where most of the win lives; no CI cache trick rescues a badly ordered Dockerfile. On ephemeral runners the options ranked: `--cache-from=type=registry,ref=org/e2e:buildcache` with BuildKit (`cache-to` pushes it) — durable, shared across all runners; the Actions `gha` cache backend — convenient, subject to the ~10 GB repo cache and eviction; `docker pull last-image && --cache-from last-image` — legacy but workable. Multi-stage note: `--target`-built stages and `mode=max` cache exports matter when your test image builds in stages (e.g., a builder stage compiling TypeScript). ROI framing: for a test image rebuilt on every dependency bump but pulled hundreds of times, optimize pull size and rebuild time both — small final image (no dev leftovers), cached dependency layer, and rebuild only on lockfile/Dockerfile changes, not per pipeline run.

```yaml
- uses: docker/build-push-action@v6
  with:
    tags: ghcr.io/org/e2e:${{ github.sha }}
    cache-from: type=registry,ref=ghcr.io/org/e2e:buildcache
    cache-to: type=registry,ref=ghcr.io/org/e2e:buildcache,mode=max
    push: true
```

**Follow-ups & traps**
- "Builds are fast locally, slow in CI — why?" — ephemeral runners start cache-cold; persist cache via registry/`gha` backends — the core insight this question wants.
- "What invalidates a `COPY` layer?" — content checksum of the copied files, not timestamps; and everything after it rebuilds too.
- Trap: rebuilding the test image on every pipeline run — build on dependency changes, pull by tag otherwise.
- "`mode=max` vs default cache export?" — max exports intermediate layers (multi-stage benefit) at the cost of bigger cache pushes.

**One-liner** — Layer cache is keyed on instruction + input checksums, ephemeral CI runners start cold — so order the Dockerfile for stability and persist the cache to a registry with BuildKit's cache-from/cache-to.

### Q11. Resource limits

**Interview answer** — Containers can be capped with `--cpus` and `--memory`, and browser tests are heavy — each Playwright worker is a Node process plus a multi-process browser, easily a CPU and a gigabyte or more under load. When the limit is too tight for the worker count, tests don't fail cleanly — they *slow down*: CPU throttling stretches page loads and script execution past timeouts, and memory pressure triggers the OOM killer taking out renderers or the whole container. That surfaces as flaky timeouts that "happen only in CI," which is why resource starvation is one of the first hypotheses I check when debugging CI-only flakiness.

**Deep dive** — Mechanism: cgroups enforce the limits — CPU as bandwidth throttling (the process gets time slices, everything stretches proportionally under contention) and memory as a hard ceiling (exceed it and the OOM killer picks a victim; a killed renderer looks like `Page crashed`, a killed Node process kills the run with exit 137). The insidious part is the failure *shape*: nothing says "starved" — you see `Timeout 30000ms exceeded` on a click that took 45 seconds because four workers shared two throttled CPUs. Diagnosis moves: `docker stats` during a run, exit code 137 in logs, dmesg/OOM events on the host, failure rate correlating with worker count or with co-scheduled jobs on the same runner. The sizing conversation: workers × (browser + Node) must fit the limit — rules of thumb like 1–2 vCPU and 1–2 GB per worker, tuned by measurement; the fix hierarchy is fewer workers per container, bigger limits, or more containers/shards — not longer timeouts, which just hides the stretch. Kubernetes wording: requests vs limits — a pod with low *requests* can be scheduled onto a contended node and starve even below its limit; test pods deserve honest requests. This links directly to flaky-test debugging: an SDET who reaches for "increase timeout" instead of "check contention" is treating the symptom.

**Follow-ups & traps**
- "Tests are flaky only in CI, pass locally — resource angle?" — throttled CPU/OOM in containers; check `docker stats`, exit 137, worker-count correlation — the expected first-class hypothesis.
- "What does exit code 137 mean?" — SIGKILL, usually the OOM killer; a Docker-fundamentals check hiding in a testing question.
- Trap: raising Playwright timeouts to "fix" starvation — masks the cause, slows every legitimate failure, and drifts until it breaks again.
- "How many workers per container?" — derived from the limit: measure per-worker footprint, divide, leave headroom; "the default" is not an answer inside a capped container.

**Senior/lead angle** — Fleet-level: right-sizing runner/agent resources against measured per-worker footprints is a cost-vs-flakiness dial a lead should own — oversubscribed shared runners are the org-wide flakiness generator that no amount of test-code fixing cures.

**One-liner** — cgroup limits don't fail browser tests loudly — they stretch them past timeouts or OOM-kill renderers — so CI-only flakiness starts with `docker stats` and worker-count math, not longer timeouts.

### Q12. Kubernetes for test execution at scale

**Interview answer** — Kubernetes enters when test execution outgrows a few static runners: it schedules ephemeral pods — a clean, resource-bounded environment per job — and scales the node pool with demand. The two patterns: ephemeral CI runners (Jenkins Kubernetes plugin, GitHub's actions-runner-controller) where every pipeline job gets a fresh pod, and explicit fan-out, where a pipeline launches N pods each running one shard of the suite for very wide parallelism. The lead-level caveat is that K8s is overkill below real scale — a team running a hundred jobs a day on a couple of runners buys operational complexity and gets little back.

**Deep dive** — What K8s specifically buys for testing: per-pod resource requests/limits (the Q11 starvation control, enforced per shard), bin-packing and autoscaling (cluster scales with the 9 a.m. PR rush, spot/preemptible nodes cut cost for retry-tolerant test workloads), clean-state guarantees (pod dies after the job — no runner rot), and namespace isolation for per-PR ephemeral *environments* (app + db + tests per namespace — the deluxe version of Q6's compose stack). The Playwright-specific detail: no `--ipc=host` equivalent per pod — mount a memory-backed emptyDir at `/dev/shm` for the Chromium shm issue. Fan-out mechanics: a Job with `parallelism: N` (or N indexed pods) each running `--shard=$(JOB_COMPLETION_INDEX+1)/N`, blob reports shipped to object storage, a final job merging — the K8s-native version of the Actions sharding answer. When it's overkill, concretely: below roughly "queue waits are chronic and runners are pets," managed CI runners or a Docker host deliver the same outcomes without cluster upgrades, RBAC, networking, and observability as your new part-time job — and if the org has no platform team running K8s already, the testing team should not be the first adopter.

**Follow-ups & traps**
- "Your CI queue is 40 minutes at peak — is K8s the answer?" — maybe: first check runner sizing/caching/sharding; K8s answers *elastic capacity*, not slow pipelines per se.
- "How does Chromium shm work in pods?" — memory emptyDir at `/dev/shm`; the flag-based habits don't transfer, and knowing that is the depth check.
- Trap: proposing K8s for a 10-person team's nightly suite — the overkill judgment is being tested as much as the mechanism.
- "Spot instances for test pods?" — yes with retry-tolerance and idempotent shards; a cost lever worth naming unprompted.

**Senior/lead angle** — The lead question is build-vs-lease: ephemeral runners on a platform team's existing cluster is a strong play; standing up a cluster *for* testing rarely is. Own the cost model — node pool sizing, spot ratios, per-shard resource requests — and the graceful-degradation story when the cluster misbehaves during a release.

**One-liner** — Kubernetes gives testing ephemeral, resource-bounded pods and elastic fan-out for shards and per-PR environments — a win at real scale and pure overhead below it.

### Q13. Common Docker interview commands rapid-fire

**Interview answer** — The working set: `build` to make an image from a Dockerfile, `run` to start a container with the flags that matter (`--rm`, `-e`, `-v`, `--ipc=host`), `exec` to get a shell inside a running container for debugging, `logs` to read output, `ps` to see what's running, and `prune` to reclaim disk — which matters on CI agents because build layers and dead containers silently fill disks and then everything gets flaky.

**Deep dive** —

| Command | What it does | Test-automation note |
| --- | --- | --- |
| `docker build -t e2e:sha .` | build image from Dockerfile | tag with commit SHA, not `latest` |
| `docker run --rm -e TEST_ENV=qa -v $PWD/playwright-report:/app/playwright-report --ipc=host e2e:sha` | create + start container | `--rm` for cleanup, `-v` for reports, `--ipc=host` for Chromium |
| `docker exec -it <ctr> bash` | shell into a running container | debug env/DNS/deps in-place instead of guessing |
| `docker logs -f <ctr>` | stream container output | first stop when a detached test container "did nothing" |
| `docker ps -a` | list containers (incl. exited) | exited containers' exit codes explain failures (137 = OOM) |
| `docker images` | list local images | spot stale test-image tags on an agent |
| `docker cp <ctr>:/app/test-results ./` | copy files out | artifact recovery when nothing was mounted |
| `docker system prune -af --volumes` | remove unused data | scheduled on CI agents; destructive — know the flags |
| `docker stats` | live CPU/mem per container | the resource-starvation diagnosis tool (Q11) |
| `docker inspect <ctr>` | full JSON state | mounts, env, OOMKilled flag, exit code |

Worth thirty extra seconds in an answer: `docker run` = `create` + `start`; `-it` gives an interactive TTY (exec-debugging), `-d` detaches; `prune` variants (`container`, `image`, `system`) differ in blast radius and `--volumes` deletes data — say it carefully in a rapid-fire round rather than reciting the nuclear flags casually.

**Follow-ups & traps**
- "A detached test container exited instantly — first two commands?" — `docker ps -a` for the exit code, `docker logs` for why.
- "CI agent out of disk — what's eating it?" — dangling images, dead containers, build cache; `docker system df` to see, scheduled prune to fix.
- Trap: `docker run` when you meant `exec` — spawning a fresh container instead of entering the running one is a common live-demo stumble.
- "How do you check if a container was OOM-killed?" — `docker inspect` → `State.OOMKilled`, or exit code 137.

**One-liner** — build, run (with `--rm`, `-e`, `-v`, `--ipc=host`), exec to debug, logs and ps -a to diagnose, stats for starvation, prune to keep agents alive.
