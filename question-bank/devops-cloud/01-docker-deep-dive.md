# Docker Deep Dive for Test Platforms

This track goes past the Playwright-oriented Docker file in `question-bank/cicd/04-docker-for-test-automation.md`. That file covers why containers, the official Playwright image, a first Dockerfile, `--ipc=host`, a compose sketch, volumes, layer cache in CI, resource limits, a Kubernetes teaser, and a command crib. Assume those answers. Here the bar is operating a test *platform*: overlayfs and cache keys, production images for both Selenium/Java and Playwright, PID 1, networking modes, Grid 4 Dynamic Grid as an ops product, supply-chain hygiene, golden-image contracts, and the failure modes that look like flakes. For pipeline YAML and Jenkinsfile syntax see `question-bank/cicd`.

- Q1. Image vs container vs Dockerfile vs registry vs layer — precise definitions and what is cached
- Q2. Production Dockerfiles for a Selenium/Java suite and for Playwright
- Q3. Why Chromium crashes in Docker (shm, `--disable-dev-shm-usage`, `--shm-size`, `--ipc=host`)
- Q4. PID 1, signal handling, and why the suite ignores SIGTERM in CI
- Q5. docker-compose for app + DB + tests
- Q6. Volumes vs bind mounts for reports, Allure, downloads; UID permission issues
- Q7. Networking: bridge vs host vs none; resolving `app`; `host.docker.internal`
- Q8. Resource limits and starvation that looks like flaky timeouts
- Q9. Selenium Grid 4 in Docker / Dynamic Grid — enough vs cloud
- Q10. Docker layer caching in CI (Actions, Jenkins, BuildKit)
- Q11. Security: root, secrets in images, scanning, distroless, read-only FS
- Q12. Debugging a failing containerized test
- Q13. Image tagging strategy for test images
- Q14. docker vs podman awareness
- Q15. Designing a golden test image used by 10 teams
- Q16. Common commands rapid-fire — why an SDET uses them

### Q1. Image vs container vs Dockerfile vs registry vs layer — precise definitions and what is cached.

**Interview answer** — A Dockerfile is a build recipe. An image is an immutable, content-addressed stack of read-only filesystem layers plus config (entrypoint, env, user). A layer is one diff in that stack, usually one instruction (`RUN`, `COPY`, `ADD`); layers are hashed and shared across images. A container is a writable overlay plus namespaces and cgroups sitting on an image — many containers can share one image's layers. A registry (GHCR, ECR, MCR, Harbor) stores image manifests and blobs and is how CI distributes the environment as an artifact. Cache is per-instruction: Docker reuses a layer when the instruction text, the parent layer, and (for `COPY`/`ADD`) the checksums of the copied files are unchanged.

**Deep dive** — OverlayFS union-mounts the layers. Reads walk the stack top-down; writes go to the container's thin writable layer (copy-on-write). That is why twenty Chrome node containers from `selenium/node-chrome:4.27.0` cost almost no extra disk for the browser bits, and why `docker rm` without a volume loses reports. Layer identity is a content hash, not a line number: reorder two `RUN apt-get` lines and you bust cache even if the packages are identical. `ENV`/`ARG` that change invalidate every subsequent layer — baking `BUILD_DATE` or `CI_COMMIT_SHA` high in the file is a classic self-own. What is *not* a layer: `CMD`, `ENTRYPOINT`, `EXPOSE`, `LABEL` still create cache keys via the image config, but they do not add filesystem diffs. Multi-stage builds throw away earlier stages unless you `--cache-to mode=max` or copy artifacts out; the final image only contains the last `FROM` plus what you `COPY --from`. Registries store a manifest list (multi-arch) pointing at per-arch manifests pointing at blobs; a tag is a mutable pointer at a manifest, a digest (`@sha256:…`) is immutable. `latest` is not special except by convention — it moves. Cache locality: BuildKit's local cache lives on the daemon disk; ephemeral CI runners have an empty daemon, so without `cache-from` you rebuild the world. BuildKit cache *mounts* (`RUN --mount=type=cache,target=/root/.m2`) are a different cache: they persist package managers across builds without baking `~/.m2` into the image.

**Code**

```dockerfile
# Each instruction → a layer. Only filesystem-changing ones add blobs.
FROM eclipse-temurin:17-jdk-jammy          # base layers from the parent image
ARG MAVEN_VERSION=3.9.9                    # ARG before COPY: changing it busts everything below
WORKDIR /src
COPY pom.xml .                             # cache key = checksum(pom.xml) + parent
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -DskipTests dependency:go-offline
COPY src ./src                             # test edits only invalidate from here down
```

```bash
# Inspect what is actually cached / shared
docker history --no-trunc my-e2e:sha
docker image inspect my-e2e:sha --format '{{json .RootFS.Layers}}'
docker system df -v                        # which layers are dangling vs shared
```

**Follow-ups & traps**
- "Is a container a lightweight VM?" — No. It shares the host kernel; isolation is namespaces (pid, net, mnt, uts, ipc, user) plus cgroups. A VM has its own kernel. The VM confusion is the most common fundamentals fail.
- "What invalidates `COPY tests/`?" — Content checksum of those files, not mtime. A `.dockerignore` miss that copies `node_modules` or `.git` busts cache every commit.
- Trap: treating tags as versions. `playwright:latest` on Monday is not Tuesday's image. Pin tag + digest in production pipelines.
- "Why does changing `ENV CI=true` at the top rebuild `npm ci`?" — `ENV`/`ARG` changes the cache key of every following instruction.

**Senior/lead angle** — Platform leads specify cache *policy*: which layers are allowed to be late (app code), which must be stable (OS, browsers, Maven/npm), and how CI persists BuildKit cache so ten teams do not each pay a 8-minute cold build. Measure cache hit rate as a platform SLO.

**One-liner** — Dockerfile builds a stack of content-addressed read-only layers; a container adds a writable overlay; a registry distributes manifests; cache hits when instruction + parent + copied checksums match.

### Q2. Write a production Dockerfile for a Selenium/Java suite AND one for Playwright (multi-stage, non-root user, layer cache order). Contrast with the Playwright official image.

**Interview answer** — Two different bases, same discipline. For Java/Selenium I multi-stage: a JDK+Maven builder that produces a test classpath or a shaded test JAR, then a JRE (or Temurin JRE) runtime that already has Chrome/ChromeDriver *or* I stay on `selenium/standalone-chrome` only if the suite is thin and I accept their user/layout. Dependencies (`pom.xml`) copy first, sources last; the process runs as a non-root UID with a writable home for Chrome. For Playwright I `FROM` the official `mcr.microsoft.com/playwright:vX.Y.Z-jammy` so browsers and OS libs stay Microsoft-pinned, copy lockfile then `npm ci`, then tests, then `USER pwuser`. I do **not** `playwright install` at runtime. The official image is the browser substrate; my image is the suite + pinned npm graph on top of it.

**Deep dive** — Contrast with `question-bank/cicd/04-docker-for-test-automation.md` Q3–Q4: that file's Playwright Dockerfile is a single-stage teaching example. Production adds: multi-stage so build tools (Maven, compilers, git) never ship; explicit `USER`; a numeric UID that matches CI volume ownership; `dumb-init`/`tini` as PID 1 (Q4); no secrets; `.dockerignore`; health-irrelevant `CMD` that is overridable. The official Playwright image already contains Ubuntu, Node, and the exact Chromium/Firefox/WebKit builds for that Playwright version plus `--with-deps` libraries. Deriving from it is correct because matching `package.json` to the image tag is the reproducibility contract. Rolling your own `FROM node:20` + `npx playwright install --with-deps` duplicates Microsoft's work, produces larger colder layers, and drifts. Exception: distroless or scratch is the wrong target for browser tests — browsers need a full glibc userspace, fonts, and `/dev/shm`. For Selenium/Java the trap is `FROM selenium/standalone-chrome` plus copying a Maven project into a image designed as a Grid node — you fight their entrypoint, their `seluser`, and you still need a JDK. Split concerns: **test runner image** (JDK + Chrome + suite) versus **Grid node image** (Selenium's). Chrome in Debian/Ubuntu needs the same shm treatment as Playwright. Layer order: `pom.xml` / `package-lock.json` before sources; browsers in the *base*, never a late `RUN wget google-chrome`. Pin apt with a snapshot or accept that `apt-get update && apt-get install google-chrome-stable` is a moving tag — many teams pin Chrome via the Playwright/Selenium image instead of apt.

**Code**

```dockerfile
# --- Selenium / Java suite: builder + runtime, non-root, cache-friendly ---
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /src
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -DskipTests dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy
# Chrome + matching chromedriver. Prefer pinning a known version over "stable".
RUN apt-get update && apt-get install -y --no-install-recommends \
      wget gnupg ca-certificates fonts-liberation \
      tini \
    && wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor \
         > /usr/share/keyrings/google.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
         > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 10001 -s /usr/sbin/nologin sdet \
    && mkdir -p /suite /tmp/chrome && chown -R 10001:10001 /suite /tmp/chrome
WORKDIR /suite
COPY --from=builder --chown=10001:10001 /src/target/ /suite/target/
USER 10001
ENV CHROME_BIN=/usr/bin/google-chrome \
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["java", "-jar", "target/e2e-tests.jar"]
```

```dockerfile
# --- Playwright: official image is the browser substrate; we add the suite ---
# Tag MUST equal @playwright/test in package.json. Contrast: we do not install browsers.
FROM mcr.microsoft.com/playwright:v1.46.0-jammy AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM mcr.microsoft.com/playwright:v1.46.0-jammy
WORKDIR /app
# pwuser (uid 1000) already exists in the official image — reuse it
COPY --from=deps --chown=pwuser:pwuser /app/node_modules ./node_modules
COPY --chown=pwuser:pwuser package.json package-lock.json playwright.config.ts ./
COPY --chown=pwuser:pwuser tests ./tests
USER pwuser
ENV CI=true
# Official image may already wrap tini; still be explicit in derived images if not
CMD ["npx", "playwright", "test"]
```

```dockerignore
node_modules
test-results
playwright-report
allure-results
target
.git
*.md
.env
.env.*
```

**Follow-ups & traps**
- "Why not `FROM node:20` and `playwright install --with-deps`?" — You duplicate OS library work, miss Microsoft's version pin, and download browsers on every cold build. The official image exists so you do not.
- "Why multi-stage if the Playwright image already has Node?" — To keep `npm ci` cacheable and to copy `node_modules` without leaking npm's build-time junk; for Java, to drop the JDK and Maven from the runtime.
- Trap: `USER root` leftover "so Chrome can write `/dev/shm`" — Chrome does not need root; it needs shm and a writable crash-dump dir.
- Trap: `COPY . .` before `npm ci` — every test edit rebuilds dependencies.
- "Selenium standalone image as the test runner?" — Wrong abstraction: that image's entrypoint starts Grid/node processes. Use it as a *browser node*, not as your Maven host.

**Senior/lead angle** — One org, two golden bases (Playwright official tagged; Java/Chrome pinned), derived per-team images that only add the suite. Ban `apt-get install google-chrome-stable` in team Dockerfiles — that is how ten teams get ten Chrome versions. The contract is in Q15.

**One-liner** — Java: multi-stage Maven → JRE+pinned Chrome as non-root with tini. Playwright: derive from the version-matched official image, lockfile first, never `playwright install` at runtime.

### Q3. Why Chromium crashes in Docker (`/dev/shm`, `--disable-dev-shm-usage` vs `--shm-size`, `--ipc=host`). THE classic.

**Interview answer** — Docker's default `/dev/shm` is a 64 MiB tmpfs. Chromium's multi-process model (browser, renderer, GPU, utility) puts IPC and backing stores in POSIX shared memory on `/dev/shm`. A real page — large DOM, images, multiple tabs, several Playwright workers — exhausts 64 MiB; the renderer dies; you see `Page crashed`, `Target closed`, `session deleted because of page crash`, or Chrome's "Aw, Snap". It is load-dependent, so it looks flaky. Three fixes: `--shm-size=2g` grows the container tmpfs; `--ipc=host` shares the host IPC namespace (Playwright's documented default for Docker); `--disable-dev-shm-usage` makes Chromium fall back to `/tmp`. Prefer size or ipc-host in CI; treat disable-dev-shm as the legacy Selenium-era workaround.

**Deep dive** — Mechanism, not folklore. Chromium uses `shm_open` / `mmap` on `/dev/shm` for renderer command buffers. Docker inherited a small default from early lxc. Symptoms cluster on heavy pages and high worker counts because allocation is shared across processes in the container. **`--shm-size`**: sets the size of the container's dedicated tmpfs at `/dev/shm`. Isolation stays. Cost: tmpfs counts against the container **memory cgroup**. `--shm-size=2g` plus Chrome plus Node on a 2g `--memory` limit OOMs — the "we fixed shm and now we OOM" trap. **`--ipc=host`**: the container joins the host's IPC namespace, so `/dev/shm` is the host's (usually gigabytes). Simplest, Playwright-recommended. Trade-off: weaker isolation — SysV/POSIX shm is visible on the host; on a multi-tenant shared runner that is a real concern; on a dedicated CI VM it is fine. **`--disable-dev-shm-usage`**: Chromium writes those buffers under `/tmp` (overlayfs). It avoids the 64 MiB cliff but is slower, fills the writable layer, and can still crash the disk. Selenium Java people learned this flag a decade ago; saying it as your *only* answer dates you. Compose: `shm_size: "2gb"` or `ipc: host`. GitHub Actions container job: `options: --ipc=host` (see `question-bank/cicd/03-github-actions-and-modern-ci.md` for job syntax). Jenkins Docker agent: `args '--ipc=host --memory=4g'`. Kubernetes has no `--ipc=host` analogue you should use casually (`hostIPC: true` is a security smell); mount:

```yaml
volumes:
  - name: dshm
    emptyDir:
      medium: Memory
      sizeLimit: 2Gi
volumeMounts:
  - { name: dshm, mountPath: /dev/shm }
```

`sizeLimit` on a memory emptyDir also counts toward the pod memory limit — same OOM math. Diagnosis: `df -h /dev/shm` inside the container; Chrome fatal logs mentioning `shared_memory`; crashes that vanish with workers=1.

**Code**

```bash
# Reproduce vs fix
docker run --rm mcr.microsoft.com/playwright:v1.46.0-jammy df -h /dev/shm
# tmpfs 64M — the smoking gun

docker run --rm --ipc=host --memory=4g \
  -v "$PWD:/app" -w /app \
  mcr.microsoft.com/playwright:v1.46.0-jammy \
  npx playwright test
```

```yaml
# compose: prefer explicit shm so memory accounting is visible
services:
  tests:
    image: org/e2e:${TAG}
    shm_size: "2gb"
    mem_limit: 4g
    # ipc: host   # alternative; don't combine thoughtlessly
```

**Follow-ups & traps**
- "Tests pass locally, CI says page crashed — first question?" — What is `/dev/shm` in the CI container, and how many workers. This mapping *is* the question.
- "`--ipc=host` vs `--shm-size`?" — ipc-host for dedicated CI VMs (Playwright default); shm-size when you must keep IPC isolation or are in K8s (emptyDir). Name the memory-accounting trap.
- Trap: retries "fix" shm crashes statistically. Infra bug, one flag.
- Trap: `--disable-dev-shm-usage` as the 2026 recommendation for Playwright. Legacy; mention it, do not lead with it.
- "We set shm to 2g and now exit 137" — shm tmpfs is inside the memory limit.

**Senior/lead angle** — Encode shm in the *platform default* (Jenkins agent args, Actions container options, K8s pod template, compose fragment in the golden repo). Teams should not discover 64 MiB in production. Track "page crashed" as an infra SLO, not a flake SLO.

**One-liner** — Docker's 64 MiB `/dev/shm` starves Chromium IPC — grow shm or share host IPC, remember tmpfs counts as memory, and stop calling renderer deaths flaky tests.

### Q4. PID 1, signal handling, why your suite ignores SIGTERM in CI (tini/dumb-init).

**Interview answer** — Linux treats PID 1 specially: it does not get the default signal dispositions other processes do, and it is responsible for reaping zombies. If your test process (Node, Java, a shell wrapper) is PID 1 inside the container, `docker stop`, Kubernetes `terminationGracePeriodSeconds`, and Jenkins "Abort" send SIGTERM that the process never handles — the suite keeps running until the daemon SIGKILLs after the grace period (Docker default 10s). Reports are truncated, browsers are orphaned, Allure results are half-flushed. The fix is a tiny init — `tini`, `dumb-init`, or `docker run --init` — as PID 1 that forwards signals and reaps children.

**Deep dive** — `docker stop` → SIGTERM to PID 1 → wait `stop-timeout` → SIGKILL. Kubernetes: kubelet SIGTERM then SIGKILL after `terminationGracePeriodSeconds` (default 30s). Jenkins Docker agent abort is the same path. Node's default: PID 1 Node *can* receive SIGTERM if you register a handler, but `npm`/`npx`/`sh -c "npx playwright test"` often is PID 1 and does not forward. `sh -c` is a frequent culprit: the shell is PID 1, the JVM is a child, SIGTERM hits the shell, the JVM keeps going. Exec-form `CMD ["npx","playwright","test"]` still leaves Node as PID 1 without a reaper. Zombies: Chrome spawn-and-die renderer processes; without a reaping init they stay as `<defunct>` and eventually exhaust PIDs (`Cannot fork`). tini (`-g` kills the process group) is what Selenium images and many k8s sidecars use; Docker's `--init` injects tini; Kubernetes: use the image's ENTRYPOINT or a distro `tini` package — there is no `--init` flag. Playwright's official image has used tini in some tags; **do not assume** — `docker inspect` the `Env`/`Entrypoint` or `ps` inside. Application-level: register shutdown hooks (Playwright's interrupt, TestNG/JUnit JVM shutdown) so SIGTERM flushes reporters. Grace period must exceed "close browsers + write blob report"; 10s is often too short for a 4-worker Playwright run — 30–60s is the platform default I set. Cost of getting it wrong: occupied agents until kill, missing traces on aborted PR builds, "pipeline cancelled but browsers still on the Grid."

**Code**

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["npx", "playwright", "test"]
```

```bash
# Prove PID 1
docker run --rm --entrypoint ps org/e2e:sha -o pid,ppid,comm
# Without tini: PID 1 is node or sh. With tini: PID 1 is tini, tests are children.

docker run --init --rm org/e2e:sha   # Docker-injected tini if the image forgot
```

```yaml
# K8s Job: give the suite time to flush reports on cancel
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 45
```

**Follow-ups & traps**
- "We abort Jenkins jobs and lose Allure — why?" — SIGKILL after unhandled SIGTERM; init + longer grace + reporter flush on shutdown.
- Trap: JSON-array vs shell-form `CMD`. Shell-form always wraps `/bin/sh -c`, which is a signal black hole unless you `exec`.
- "Is Kubernetes `shareProcessNamespace` the fix?" — No. That is for sidecars seeing each other's PIDs. You still want an init in the test container.
- Trap: `kill -9` in a wrapper script as "cleanup" — skips every graceful path.

**Senior/lead angle** — Platform images ENTRYPOINT tini; CI templates set grace 45s; abort/timeout is a first-class path that must still upload artifacts (`if: always()` / `post { always }`). Review Dockerfiles for shell-form CMD in the golden-image PR checklist.

**One-liner** — PID 1 swallows SIGTERM and must reap zombies — put tini/dumb-init in front, use exec form, and size termination grace so reports flush before SIGKILL.

### Q5. docker-compose for app + DB + tests (healthcheck, depends_on condition, networks, volumes for reports).

**Interview answer** — One compose file is the ephemeral test topology: `db`, `app`, `tests` on a user-defined bridge network, so tests use `http://app:8080` not localhost. `depends_on` without a condition only waits for *start*; I put real `healthcheck`s on db and app and `condition: service_healthy` on the dependents. Reports bind-mount to the CI workspace. `docker compose run --rm tests` returns the test exit code for the gate. For pipeline wiring see `question-bank/cicd`; here the depth is networks, healthcheck design, and teardown.

**Deep dive** — Compose v2 (`docker compose`) vs v1 (`docker-compose`) — interviews still say the hyphen; use the plugin. Default network: project-prefixed bridge, embedded DNS, service name = hostname, service aliases. A second network is how you keep tests from talking to a mock you did not intend — or how you attach a sidecar like Mailhog only to `app`. `profiles: [test]` hides the tests service from `up -d` of the app stack. Healthchecks: `pg_isready`, `curl -f http://localhost:8080/health`, not `sleep 30`. Tune `interval`/`timeout`/`retries`/`start_period` so slow migrations do not false-fail; `start_period` is the knob people miss. Failure modes: app healthcheck hits `/` which is 302 to SSO → unhealthy forever; tests healthy-wait the app while the app waits on a migration the healthcheck does not know about. `restart: no` on tests (do not restart a failed suite into a loop). `init: true` for PID 1 (Q4). `extra_hosts: ["host.docker.internal:host-gateway"]` on Linux so tests can reach a service on the host (Q7). Volumes: bind `./playwright-report` and `./allure-results`; named volume for Postgres data so `compose down` without `-v` keeps the DB — for CI always `down -v` or you leak dirty state into the next job on a sticky runner. Project name: `-p pr-${CHANGE_ID}` for concurrent PR stacks on one daemon. Cost: leaving `compose up` stacks on a shared Docker host is the "who filled the disk" incident.

**Code**

```yaml
name: shop-e2e
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: shop
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d shop"]
      interval: 2s
      timeout: 3s
      retries: 20
      start_period: 5s
    volumes: [pgdata:/var/lib/postgresql/data]
    networks: [sot]

  app:
    build: { context: ./app }
    environment:
      DATABASE_URL: postgres://postgres:test@db:5432/shop
    depends_on:
      db: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://127.0.0.1:8080/actuator/health"]
      interval: 3s
      retries: 30
      start_period: 15s
    networks: [sot]

  tests:
    image: org/e2e:${TAG:-local}
    init: true
    shm_size: "2gb"
    environment:
      BASE_URL: http://app:8080
      DATABASE_URL: postgres://postgres:test@db:5432/shop
    depends_on:
      app: { condition: service_healthy }
    volumes:
      - ./playwright-report:/app/playwright-report
      - ./allure-results:/app/allure-results
    networks: [sot]
    profiles: [test]
    command: ["npx", "playwright", "test"]

networks:
  sot:
    driver: bridge
volumes:
  pgdata:
```

```bash
docker compose --profile test run --rm tests
echo $?   # gate
docker compose down -v
```

**Follow-ups & traps**
- "What does `depends_on` guarantee?" — Container start, not readiness — unless `condition: service_healthy`. The most-asked compose question; still asked of leads to see if they designed the healthcheck itself.
- Trap: `localhost` as `BASE_URL` inside `tests` — that is the tests container.
- Trap: `healthcheck` on `tests` — meaningless; tests are a one-shot batch.
- "How do two PRs share a Docker host?" — distinct `-p` project names and published ports as *ranges* or none (tests stay on the network, no bind to host ports).

**Senior/lead angle** — This compose file *is* the local/CI contract for ephemeral envs. Promote it to the golden repo; CI should not invent a different topology. For anything bigger than one daemon, this file becomes the K8s Job + Services in `02-kubernetes-for-test-platforms.md`.

**One-liner** — Compose is DNS + health-gated startup + bind-mounted reports on one bridge — `service_healthy`, not `sleep`, and `compose run` exit code is the quality gate.

### Q6. Volumes vs bind mounts for reports, Allure, downloads; permission issues (UID).

**Interview answer** — Bind mounts map a host path to a container path — that is what CI wants, because the next step archives `playwright-report/` from the workspace. Named volumes are Docker-managed blobs, great for Postgres data, terrible as the only copy of an HTML report (you still have to `docker cp` out). tmpfs mounts are for `/dev/shm` and scratch. The operational bug is UID: the container user writes files the Jenkins/GitHub runner user cannot delete, or Chrome cannot write `allure-results` because the bind mount is root-owned.

**Deep dive** — Bind mount: `type=bind,source=$PWD/playwright-report,target=/app/playwright-report`. SELinux hosts need `:z`/`:Z`. NFS home directories on some corporate agents make bind mounts slow — Allure with tens of thousands of tiny files is the canary. Named volume: lifecycle independent of the container; `docker compose down -v` is required in CI or yesterday's Postgres infects today. `docker cp` is the recovery path when someone forgot the mount — container must still exist (`--rm` races you). Downloads: Chrome's default download dir inside the profile; point it at a mounted path or you lose files. Playwright `outputDir` / Allure `allure-results` must be the mounted path, not a nested dir the config forgot. UID math: official Playwright `pwuser` is 1000:1000, GitHub-hosted runners are also 1000, so you get lucky. Jenkins agents often run as 1007 or as root-then-drop. Selenium `seluser` is 1200. Files created as root in a volume stay 0:0. Fixes, in preference order: (1) image `USER` matches runner UID (`--user $(id -u):$(id -g)` at run, if the image has a passwd entry or you only need numeric UID); (2) entrypoint `chown` the output dirs — requires root then drop, ugly; (3) group-writable dirs with sticky bit. Kubernetes: `fsGroup` on the pod security context so the volume is group-owned; `emptyDir` then sidecar upload avoids host UID entirely (see K8s Q9). Cost: root-owned `test-results` on a sticky Jenkins workspace fills disk because `cleanWs` fails — looks like "agent is haunted."

**Code**

```bash
mkdir -p playwright-report allure-results test-results downloads
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$PWD/playwright-report:/app/playwright-report" \
  -v "$PWD/allure-results:/app/allure-results" \
  -v "$PWD/downloads:/app/downloads" \
  org/e2e:sha
```

```yaml
# K8s: fsGroup so volume writes are group-readable by upload sidecar
securityContext:
  runAsUser: 1000
  runAsNonRoot: true
  fsGroup: 1000
```

**Follow-ups & traps**
- "Build red, no report, container `--rm`" — nothing was mounted; the report died with the writable layer. Classic.
- "Bind or named volume for Allure?" — Bind (or emptyDir + upload). Named volume hides files from the CI workspace.
- Trap: `--user 1000` on an image whose Chrome profile is owned by 1200 — Chrome won't start. Align USER, profile dir, and mount ownership together.
- "CI cannot delete workspace" — root-owned artifacts; check `ls -ln`.

**Senior/lead angle** — Standardize output paths and UID in the golden image (`/out/report`, `/out/allure`, UID 1000) and in the CI template. Do not let ten suites mount ten different directories. Prefer upload-to-S3 over long-lived bind mounts on K8s.

**One-liner** — Bind-mount report dirs into the workspace, never rely on the container layer; match UID/`fsGroup` or the next job cannot read or delete the artifacts.

### Q7. Networking: bridge vs host vs none; how tests resolve `app` hostname; `host.docker.internal`.

**Interview answer** — Default `bridge` gives the container its own net namespace, NAT to the outside, and (on a user-defined bridge, including Compose) embedded DNS so the name `app` resolves to that service's IP. `host` shares the host network — `localhost` is the host, ports collide, isolation is gone; used sparingly for capturing localhost services or avoiding NAT. `none` is air-gapped: no NICs but lo — useful to prove a unit-level container needs no network. Tests resolve `app` because Compose/Swarm/K8s DNS, not because of `/etc/hosts` folklore. `host.docker.internal` is a DNS name Docker Desktop injects to the host; on Linux you add `host-gateway`. Reaching a mapped port via `localhost:3000` from *inside* another container is the classic fail — use the service name and the *container* port.

**Deep dive** — User-defined bridge vs default `docker0`: only user-defined bridges provide automatic DNS between container names. `docker run --link` is obsolete. Published ports (`-p 3000:3000`) are for *host* access; container-to-container traffic uses the internal port and overlay/bridge IP, never the mapped host port (hairpin NAT sometimes works, then breaks). `host` mode: Chromium in host net can hit `localhost:3000` of a server on the host — handy, but `--ipc=host` plus `--network=host` is a large isolation hole; also `shm` is the host's. `none` + a custom net is how some security-sensitive API tests force going through a proxy container. DNS failures: Alpine musl `getaddrinfo` vs glibc; `app.internal` search domains; IPv6 AAAA first then timeout — "works on Docker Desktop, fails in CI" is sometimes AAAA. `extra_hosts`, `network_mode: service:app` (share app's net ns — tests use `localhost:8080` because they *are* in app's namespace; rare but used for sidecar-style test containers). CNI vs Docker: on Kubernetes this entire answer is Services/CoreDNS (file 02). Cost/security: publishing Grid 4444 to `0.0.0.0` on a cloud VM is how the internet becomes your client; bind `127.0.0.1:4444:4444` or do not publish at all.

**Code**

```bash
# Linux: reach processes on the host from a container
docker run --rm --add-host=host.docker.internal:host-gateway \
  org/e2e:sha getent hosts host.docker.internal

# Wrong: from tests container, curl localhost:8080  → tests' own empty 8080
# Right:
docker compose exec tests curl -fsS http://app:8080/health
```

```yaml
services:
  tests:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      # App in compose:
      BASE_URL: http://app:8080
      # App running on the host machine:
      # BASE_URL: http://host.docker.internal:8080
```

**Follow-ups & traps**
- "Why does `http://localhost:3000` work on my laptop browser but not in the test container?" — Different net namespaces; the browser is on the host.
- Trap: `-p 8080:8080` then `BASE_URL=http://app:8080` is correct; `BASE_URL=http://app:80` because "HTTP is 80" is not.
- "`host` network to fix Chromium shm?" — Orthogonal (IPC vs net). Do not use host net as an shm workaround.
- "How do tests reach an app on the Kubernetes node?" — They usually should not; use a Service. `host.docker.internal` is a Docker Desktop-ism.

**Senior/lead angle** — Document the URL matrix: in-cluster service DNS vs public QA vs host.docker.internal for laptop-only. Ban published Grid ports on shared networks. NetworkPolicies belong in the K8s file; the analogue here is "do not attach tests to the production compose network."

**One-liner** — User-defined bridges give you DNS (`http://app:8080`); `localhost` is yourself; `host.docker.internal` is a Desktop/host-gateway convenience, not a CI architecture.

### Q8. Resource limits (`cpus`, `memory`) and how starvation looks like "flaky timeouts".

**Interview answer** — cgroups cap CPU and memory. Browser tests are N workers × (Node + multi-process Chromium), often 1–2 CPU and 1–2 GiB *per worker* under load. Too little CPU: everything stretches, Playwright's 30s action timeout fires, you see flakes only in CI. Too little memory: OOM killer, exit 137, `Page crashed`, or the whole container dies. Nothing in the test report says "cgroup." Diagnosis is `docker stats`, `OOMKilled`, worker-count correlation — then right-size or reduce workers, not bump timeouts.

**Deep dive** — CPU: `--cpus=1.5` is CFS quota (cpu.max in cgroup v2). Throttling does not error; it delays. A click that is 200 ms locally becomes 2s, then 20s under four workers on one CPU — timeout. `throttled_time` in cpu.stat is the smoking gun. Memory: `--memory=2g` is a hard cap; `--memory-swap` equal to memory disables swap (good — swap makes timeouts worse). tmpfs `/dev/shm` counts (Q3). Java: without `-XX:+UseContainerSupport` / `MaxRAMPercentage`, the JVM sees the *host* and heap-overcommits into OOM. Node: V8 heap vs RSS including browsers — limiting Node does not limit Chrome children if they are in the same cgroup (they are). Exit 137 = 128+9 SIGKILL, usually OOM. `docker inspect --format '{{.State.OOMKilled}}'`. Kubernetes: requests vs limits and QoS — file 02 Q3; the Docker-level insight still holds. Compose: `cpus`, `mem_limit`, `mem_reservation`. Failure shape vs shm crashes: shm often "page crashed" on heavy pages; CPU starve is broad timeouts; OOM is 137 or renderer death. Cost: over-requesting CPUs on ECS/Fargate/K8s is the bill; under-requesting is the flake SLO. Tuning protocol: measure RSS and CPU with 1 worker, linear until timeouts appear, leave ~25% headroom, pin worker count in the image/CI template.

**Code**

```bash
docker run --rm --cpus=2 --memory=4g --memory-swap=4g --shm-size=1g \
  --ipc=shareable \
  org/e2e:sha npx playwright test --workers=2

docker stats --no-stream
# inspect a dead container
docker inspect e2e --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
```

```yaml
# Jenkins Docker agent (pipeline syntax: question-bank/cicd/02-jenkins.md)
agent {
  docker {
    image 'org/e2e:1.46.0'
    args '--cpus=2 --memory=4g --shm-size=1g --init'
  }
}
```

**Follow-ups & traps**
- "CI-only timeouts, local green — resource angle?" — First-class hypothesis with shm, not after two weeks of `waitForTimeout`.
- Trap: raising timeout to 120s "to stabilize CI" — hides saturation, slows failure, bills more.
- "Why 4 workers on a 2-CPU container?" — You scheduled 4 Chromiums onto 2 throttled cores. Math, not Playwright.
- Exit 137 vs 143 — 137 SIGKILL/OOM; 143 SIGTERM (often orchestrator shutdown).

**Senior/lead angle** — Publish a capacity card: "Playwright worker = 1 vCPU / 1.5 GiB / 512 MiB shm." Jenkins label and K8s requests are that card. Queue time plus timeout flakes are the same budget conversation.

**One-liner** — cgroup CPU stretches tests into timeouts and cgroup memory SIGKILLs them — size workers to limits, read `OOMKilled`, and do not "fix" starvation with longer timeouts.

### Q9. Selenium Grid 4 in Docker / Dynamic Grid — architecture, when it's enough vs cloud.

**Interview answer** — Grid 4 is Router + Distributor + New Session Queue + Session Map + Event Bus + Nodes (component detail: `question-bank/selenium/04-grid-parallel-and-threadlocal.md`). In Docker you usually run the official `selenium/hub` (or standalone) plus `selenium/node-chrome` scaled, with `shm_size` on nodes. Dynamic Grid starts a fresh browser container per session via a Docker (or K8s) sidecar — isolation and cleanliness at the cost of pull/start latency. That is enough for Linux Chrome/Firefox at moderate concurrency on a daemon you own. It is not enough for Safari/iOS/Android farms, huge bursty parallelism, or when nobody wants to operate nodes. Then you buy BrowserStack/Sauce/LambdaTest, or you move Dynamic Grid onto Kubernetes (file 02 Q6).

**Deep dive** — Static node compose: predictable slots (`SE_NODE_MAX_SESSIONS`), warm browsers, version skew as the main ops pain (client language binding vs Grid vs Chrome vs ChromeDriver — Grid 4 bundles driver in the node image, so pin **image tag**). Dynamic Grid: `selenium/standalone` or the distributed set plus a Docker socket or Kubernetes API; each session = container with a stereotype. Wins: no leftover profiles, easy video-per-session, true isolation. Costs: `docker.sock` mount is root-equivalent on the host (security); cold start 5–15s per session (queue latency); registry rate limits when 80 tests stampede; more shm/memory accounting per ephemeral container. When Docker Grid is enough: one org, Linux browsers, < ~50 concurrent sessions, a platform owner who patches images weekly, tests that tolerate session-queue waits. When it is not: macOS/Safari, real devices, 500-way bursts every PR, multi-tenant untrusted tests, or when video/storage/ops time exceeds cloud invoices. Hybrid is the adult answer: Linux Chrome on internal Grid, Safari on a vendor. Playwright does not belong on Selenium Grid — workers and shards (`question-bank/cicd` + Playwright sharding file). Observability: GraphQL on 4444, session queue depth as a metric, node heartbeats. Failure modes: orphaned sessions when tests skip `quit()` (`question-bank/selenium/04` Q8), Event Bus partition, disk filled by videos. Cost: a 24/7 20-node Chrome farm on a fat VM vs 2 hours/day of vendor minutes — spreadsheet it.

**Code**

```yaml
# Static Grid — enough for many teams
services:
  hub:
    image: selenium/hub:4.27.0
    ports: ["4444:4444", "4442:4442", "4443:4443"]
    environment:
      SE_SESSION_REQUEST_TIMEOUT: "300"
  chrome:
    image: selenium/node-chrome:4.27.0
    shm_size: "2gb"
    depends_on: [hub]
    environment:
      SE_EVENT_BUS_HOST: hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      SE_NODE_MAX_SESSIONS: "4"
      SE_NODE_OVERRIDE_MAX_SESSIONS: "true"
    # docker compose up --scale chrome=5
```

```java
// Client: point at the hub, not a node IP
WebDriver driver = new RemoteWebDriver(
    URI.create("http://selenium-hub:4444/wd/hub").toURL(),
    new ChromeOptions().addArguments("--disable-dev-shm-usage") // last resort; prefer shm_size
);
```

**Follow-ups & traps**
- "Dynamic Grid vs `--scale chrome=N`?" — Dynamic = container per session (isolation, slow start); scale = warm slot pool (latency, leftover state). Pick from those properties.
- Trap: mounting `docker.sock` into Grid on a shared CI host without talking about root. Interviewers wait for it.
- "Playwright on Grid?" — Wrong tool. Shard instead.
- "Why did sessions queue while `docker ps` shows idle Chrome?" — stereotype mismatch (browserVersion, platformName) or Node not registered on the bus.

**Senior/lead angle** — Grid is a product: SLO on queue wait, pinned image channel, on-call for stuck sessions, cost vs BrowserStack reviewed quarterly. Do not let every squad stand up its own hub.

**One-liner** — Docker Grid (static slots or Dynamic per-session containers) is enough for owned Linux browsers at moderate concurrency; cloud for vendor OS/devices and burst, and Playwright should shard, not Grid.

### Q10. Docker layer caching in CI (GitHub Actions cache, Jenkins docker build cache, BuildKit).

**Interview answer** — Locally the daemon already has layers; in CI the daemon is empty every job. BuildKit is the modern builder: `cache-from`/`cache-to` export layers to a registry, the GHA cache backend, or a local tar. GitHub Actions: `docker/build-push-action` with `type=gha` or `type=registry`. Jenkins: persistent builder on a fat agent, or the same registry cache from a Docker pipeline agent — do not assume `/var/lib/docker` survives an ephemeral Kubernetes agent. A well-ordered Dockerfile (Q2) is still worth more than any remote cache. For workflow syntax see `question-bank/cicd/03-github-actions-and-modern-ci.md`.

**Deep dive** — BuildKit graph: each command is a vertex; `--mount=type=cache` is an extra cache namespace (Maven/npm) that is *not* in the image. `mode=min` exports the final image layers; `mode=max` exports intermediates (needed for multi-stage). `type=gha` uses Actions cache (~10 GB repo quota, eviction); `type=registry` is durable across systems (Jenkins and Actions share ECR/GHCR). Inline cache (`BUILDKIT_INLINE_CACHE=1`) embeds cache metadata in the pushed image — simple, weaker for multi-stage. Jenkins gotchas: Docker Cloud / Kubernetes agents start cache-cold; a "docker build is slow in Jenkins" ticket is usually ephemeral agents + no `cache-to`. Dedicated `label: docker-builder` agents with leftover `/var/lib/docker` work until the disk fills (prune policy). `docker build --cache-from org/e2e:latest` without BuildKit only uses that image's layers as suggestions and often misses. Pull-through: also cache the *base* (`playwright:v1.46.0-jammy`) on a registry mirror — rate limits on MCR/Docker Hub stall 40 parallel shards. Rebuild policy: build the test image on Dockerfile/lockfile change (path filters), not on every test-only commit; tests run `docker pull org/e2e:$channel`. Cost: registry cache storage and pull minutes; still cheaper than 8-minute `npm ci` × shards × PRs.

**Code**

```yaml
# GitHub Actions — registry cache shared with Jenkins
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: |
      ghcr.io/org/e2e:${{ github.sha }}
      ghcr.io/org/e2e:playwright-1.46.0
    cache-from: type=registry,ref=ghcr.io/org/e2e:buildcache
    cache-to: type=registry,ref=ghcr.io/org/e2e:buildcache,mode=max
    provenance: false
```

```groovy
// Jenkins: BuildKit on a builder that may be ephemeral — still use registry cache
sh '''
  docker buildx create --use --name e2e || docker buildx use e2e
  docker buildx build --push \
    --cache-from type=registry,ref=$ECR/e2e:buildcache \
    --cache-to type=registry,ref=$ECR/e2e:buildcache,mode=max \
    -t $ECR/e2e:$GIT_COMMIT .
'''
```

**Follow-ups & traps**
- "Fast laptop, slow CI builds?" — Cold daemon. Persist cache off-box.
- Trap: rebuilding the e2e image on every test-only push.
- "`gha` vs registry cache?" — gha is convenient and quota-capped; registry is cross-CI and the platform choice.
- "Cache hit but `npm ci` still runs?" — lockfile changed, or `COPY` of a file that changes every build (build-info.json generated in CI before COPY).

**Senior/lead angle** — One `buildcache` ref per golden image channel; path-filter image builds; mirror bases. Report "image build minutes / week" next to suite minutes — platform waste is often the former.

**One-liner** — Ephemeral CI has no layer cache unless you export BuildKit cache to a registry (or GHA); order the Dockerfile first, then share `cache-to` across Jenkins and Actions.

### Q11. Security: running as root, secrets in images (THE trap), scanning, distroless, read-only FS.

**Interview answer** — Default Docker is root in the container, which is still a user namespace away from the host unless you are careless with `docker.sock` or `--privileged`. Test images should `USER` a numeric non-root UID. Secrets in `ENV`/`ARG`/`COPY .env` become layers forever — `docker history` and `docker save` recover them; this is the trap interviewers bait with "how does the suite get the password?" Scanning (Trivy/Grype/ECR) gates CVEs in browsers and Node, with a waiver process for Chromium's giant attack surface. Distroless is rarely viable for Playwright/Selenium because browsers need a full OS; "thin but not distroless" is the honest target. `read_only: true` plus tmpfs on `/tmp`, `/dev/shm`, and output dirs is the hardening I actually ship.

**Deep dive** — Root: Chrome sandbox + root is a confused deputy; many CI images disable the sandbox (`--no-sandbox`) *because* they ran as root in an unprivileged user namespace — the better fix is non-root *and* keep the sandbox. `--privileged` and `docker.sock` in a test job = the test code owns the host. Secrets: `RUN curl | bash` with a token in the URL; `ARG NPM_TOKEN` then `npm ci` without `--mount=type=secret` — BuildKit secrets (`RUN --mount=type=secret,id=npm`) keep the token out of layers. Runtime secrets: env from the orchestrator, not the image (IAM roles, Jenkins credentials, k8s Secrets). Traces and Playwright screenshots can capture secrets on screen — `question-bank/architecture-lead/03-environments-and-secrets.md`. Scanning: fail on critical in *our* layers; the browser image will always have CVEs — pin, rebuild weekly, track upstream. Distroless/scratch: no shell, which also means no `docker exec bash` debugging; for API-only Java tests, distroless JRE is excellent; for Chromium, no. Read-only root FS: Chrome needs tmp, dumps, crashpad, `/dev/shm`; list those tmpfs mounts explicitly. Drop caps (`cap_drop: [ALL]`), no new privileges. Supply chain: pin images by digest, sign (cosign), generate SBOM. Cost: weekly rebuilds of golden images to absorb patches; not optional after a Chromium CVE.

**Code**

```dockerfile
# Build-time secret: never ARG NPM_TOKEN
RUN --mount=type=secret,id=npm,dst=/run/secrets/npm \
    NPM_CONFIG_TOKEN="$(cat /run/secrets/npm)" npm ci
USER 10001
```

```yaml
services:
  tests:
    read_only: true
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    tmpfs:
      - /tmp:size=1g
      - /dev/shm:size=2g
    user: "10001:10001"
```

```bash
# THE trap — prove a secret is in the image
docker history --no-trunc org/e2e:leaky | grep -i token
trivy image --severity HIGH,CRITICAL org/e2e:sha
```

**Follow-ups & traps**
- "Where do we put `BASE_URL` vs `DB_PASSWORD`?" — URL can be image ENV; password must not. If they put both in Dockerfile, fail the candidate.
- Trap: `COPY .env .` "for convenience."
- "Why not distroless Playwright?" — Browser + fonts + libnss + ffmpeg. Distroless is for the API test JAR.
- `--no-sandbox` as default — usually a root leftover; fix the user, keep the sandbox.

**Senior/lead angle** — Policy: no secrets in layers (CI check on `docker history` / Trivy secrets), non-root mandatory in the golden image, weekly rebuild, sock mounts forbidden except on a dedicated Dynamic Grid node pool. This is governance, not a Dockerfile comment.

**One-liner** — Non-root, secrets only at runtime via mounts/orchestrator (never layers), scan and rebuild, read-only FS with tmpfs for Chrome — distroless if no browser, not if Playwright.

### Q12. Debugging a failing containerized test (`exec`, logs, copy reports out, headed via VNC/noVNC).

**Interview answer** — First reproduce with the same image digest and flags (`--ipc`, memory, env). `docker logs` is stdout/stderr of PID 1 — if the suite wrapped output, that's the JUnit. `docker exec` into a *still running* container (`sleep infinity` or `--entrypoint bash` override) to check DNS, `/dev/shm`, Chrome, UID. If it already exited, drop `--rm`, `docker cp` reports out, `docker inspect` for OOMKilled. For headed: xvfb + VNC/noVNC (Selenium images ship this; Playwright official does not, you add x11vnc) or download the trace and debug locally on the same browser revision — usually faster than VNC.

**Deep dive** — Layer the investigation: (1) orchestration — did the container start, exit code, OOM, healthcheck killing app underneath tests; (2) environment — `BASE_URL` resolving, TLS, time, locale, fonts; (3) browser — shm, sandbox, missing lib; (4) the test. `docker run --rm` fights you; platform debug mode omits `--rm` and keeps the container on failure. `exec` requires a running process — failed `npx playwright test` is gone; override `command: ["sleep","3600"]` then exec. `docker cp ctr:/app/test-results ./`. Playwright: traces > video > VNC for CI. VNC path: `DISPLAY=:99`, xvfb, x11vnc, noVNC on 7900 — Selenium's `SE_VNC_NO_PASSWORD` images are the template; lock that port to VPN. Headed-in-CI as default is cost and noise (`question-bank/cicd/04` Q7). Network debug: `getent hosts app`, `curl -v BASE_URL` from *inside*. Timeouts: `strace`/`perf` only if you already ruled out cgroups. Jenkins: always-on `archiveArtifacts` even on abort. K8s: `kubectl logs` / ephemeral debug container (file 02 Q10).

**Code**

```bash
# Keep the body
docker run --name e2e-debug --shm-size=2g -e BASE_URL=http://app:8080 org/e2e:sha \
  || true
docker logs e2e-debug
docker inspect e2e-debug --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
docker cp e2e-debug:/app/playwright-report ./playwright-report
docker cp e2e-debug:/app/test-results ./test-results

# Interactive: same image, shell, then run one test
docker run --rm -it --entrypoint bash --shm-size=2g --user pwuser org/e2e:sha
# inside: npx playwright test tests/checkout.spec.ts --debug   # needs display or skip
```

```yaml
# Selenium node with noVNC for a live Grid debug session
# (do not publish 7900 on the public internet)
chrome:
  image: selenium/node-chrome:4.27.0
  ports: ["7900:7900"]
  environment:
    SE_VNC_NO_PASSWORD: "1"
```

**Follow-ups & traps**
- "First two commands on a silent failure?" — `ps -a` / inspect exit code, then logs. Not "rerun with retries."
- Trap: `exec` after the container exited.
- "Must we VNC?" — No. Trace viewer locally against the same Playwright version is the default; VNC is for Grid/session issues you cannot reproduce from a trace.
- "Works in exec bash, fails in CI CMD" — different USER, env, or PID 1 / working directory.

**Senior/lead angle** — Debug *mode* as a platform feature: on failure, upload traces, retain container metadata (exit, OOM, inspect JSON), optional break-glass VNC on a private network. Optimize mean-time-to-trace, not SSH-into-the-agent culture.

**One-liner** — Same digest + logs + inspect (OOM/exit) + copy reports out; exec only while it lives; prefer traces over VNC, and keep noVNC off the public internet.

### Q13. Image tagging strategy for test images (pin digest, match Playwright/Selenium versions).

**Interview answer** — Tags are channels, digests are pins. I tag test images with (1) the browser/tool chain version (`playwright-1.46.0`, `selenium-4.27.0-chrome-131`), (2) a git SHA of the Dockerfile/suite for audit, and (3) a moving channel (`stable`, `next`) that teams opt into. CI *runs* by digest (`image@sha256:…`) or by an immutable SHA tag. Playwright image tag equals `@playwright/test`; Selenium node tag equals the client version we support. Never `latest` in pipelines.

**Deep dive** — Mutability: ECR/GHCR can mark tags immutable — do that for SHA tags, not for `stable`. Renovate/Dependabot: one PR bumps Playwright in package.json, the Docker tag, and the CI pin together; a CI check fails on mismatch. Digest pin in Kubernetes manifests and Jenkins `image 'org/e2e@sha256:…'` survives tag overwrite attacks. Multi-arch: `playwright` ships amd64/arm64 — Apple-silicon laptops vs amd64 CI is a "works on my M3, Chrome crashes in GHA" class if you accidentally run qemu. Record `org.opencontainers.image.revision` labels. Retention: keep SHA tags 30–90 days; keep channel tags; GC untagged blobs. Failure: someone retags `stable` during a mid-day suite run — half the shards old Chrome, half new. That's why shards pull by digest resolved at workflow start and passed as an output. Cost: storage of N SHA images; lifecycle policy like S3.

**Code**

```bash
# Promote: build SHA, then point the channel, record digest
digest=$(docker buildx build --push -t ghcr.io/org/e2e:$GIT_SHA \
  --label org.opencontainers.image.revision=$GIT_SHA \
  --metadata-file /tmp/meta.json .)
# manifest digest from metadata; pin this in the Job
docker buildx imagetools create -t ghcr.io/org/e2e:playwright-1.46.0 \
  ghcr.io/org/e2e:$GIT_SHA
```

```yaml
# Resolve once, use everywhere
env:
  E2E_IMAGE: ghcr.io/org/e2e@sha256:4f3c…   # immutable for this workflow
```

**Follow-ups & traps**
- "Why not only `latest`?" — unreproducible failures, impossible rollbacks.
- Trap: Playwright 1.47 code on a 1.46 image — silent `playwright install` in a wrapper, or loud missing browser. Both are bugs.
- "Immutable tags vs digest?" — Immutable tags are enough if the registry enforces them; digests still win for air-gapped promote.
- ARM vs AMD — pin platform `linux/amd64` in CI if that's the Grid.

**Senior/lead angle** — Tagging is the upgrade contract (Q15). Channels (`next` in one squad, `stable` org-wide) plus a digest freeze at pipeline start so a 40-shard run is homogeneous.

**One-liner** — Channel tags for humans, SHA/digest for CI, Playwright/Selenium versions in the tag name, never `latest`, and resolve the digest once per run.

### Q14. docker vs podman awareness.

**Interview answer** — Podman is a daemonless, fork/exec container engine with a Docker-compatible CLI. Rootless is the default posture: no privileged dockerd, no `docker.sock`, user-namespace mapping. Compose works via `podman compose` or podman-compose with gaps. Kubernetes/CRI-O is closer to Podman than to Docker. I mention it in interviews because RHEL-family enterprises and "we banned docker.sock" shops run it; my Dockerfiles stay spec-compliant OCI so they build on both.

**Deep dive** — Architecture: Docker = dockerd + containerd + runc. Podman = conmon + runc/crun, systemd for restarts (`podman generate systemd`, Quadlet). Rootless: ports <1024 need config; cgroup v2 required for full limits; `--ipc=host` and `--network=host` have different security meaning when already user-namespaced. `docker.sock` Dynamic Grid is the pain: Podman has `podman.sock` and API compatibility, but Selenium Dynamic Grid's Docker provider may assume Docker APIs/bugs. Build: `buildah`/`podman build` vs BuildKit — cache-to registry is less turnkey; many teams still build with `docker buildx` in CI and run with podman, or use `podman build` and accept slower CI. SELinux `:Z` on volumes is more often mandatory on Podman/RHEL. Jenkins: there is a Podman agent story; the Kubernetes plugin sidesteps both by using CRI. macOS: Podman machine VM is analogous to Docker Desktop's VM — `host.docker.internal` naming differs (`host.containers.internal`). Honesty: most SDET examples still say Docker; the lead answer is "OCI image, not engine lock-in."

**Code**

```bash
alias docker=podman   # 90% of daily commands work
podman run --rm --userns=keep-id -v "$PWD/playwright-report:/app/playwright-report:Z" \
  --shm-size=2g org/e2e:sha

# Rootless cannot bind 4444 without sysctl/cap; use 4444 on a high port
podman run -p 4444:4444 selenium/hub:4.27.0   # may fail rootless on <1024 — use 4444 inside, 14444:4444
```

**Follow-ups & traps**
- "Is it a drop-in?" — CLI yes for run/build/push; Compose, sock-based Grid, and BuildKit cache need a checklist.
- Trap: mounting `docker.sock` into a Podman world.
- "Why would we switch?" — rootless + no daemon + org standard on RHEL, not speed.
- Jenkins `docker {}` agent block — needs a Docker (or compatible) daemon; Kubernetes agents avoid the question.

**Senior/lead angle** — Standardize on OCI images and Kubernetes runtimes; treat Docker vs Podman as a node-agent implementation detail. If the org is Podman-only, Dynamic Grid on Docker sock is off the table — use K8s Grid (file 02).

**One-liner** — Podman is daemonless, often rootless, OCI-compatible Docker CLI — great for locked-down enterprises; watch compose, BuildKit cache, and docker.sock-dependent Grid.

### Q15. How you'd design a golden test image used by 10 teams (versioning, changelog, upgrade contract).

**Interview answer** — One platform-owned image family per stack (Playwright-Node, Java-Chrome), versioned like a library: semver channels (`v1.46.0`, `v1.47.0-rc`), changelog, and a written upgrade contract. Teams derive `FROM ghcr.io/org/e2e-pw:1.46.0` or consume the image as the CI `container:` directly. I bump browsers on a schedule, publish `next` for volunteers, promote to `stable` after a canary squad and the platform suite go green. Breaking changes (Playwright major, UID change, entrypoint) require a major channel and a migration window, not a surprise retag.

**Deep dive** — What lives in the golden image: OS, browsers, language runtime, tini, fonts, dumb-init, maybe Allure CLI — not team tests, not team secrets, not `BASE_URL`. What lives in the team layer or in the job: suite code, npm/Maven graph (or the golden provides a cache mount convention). Versioning: *the Playwright/Selenium version is the public version* of the image. Changelog: browser revisions, UID, installed apt packages, Chromium flags defaults, `WORKDIR`. Upgrade contract: (1) minor Playwright bumps weekly on `next`, (2) `stable` lags 7 days, (3) majors announced with a dual-run period, (4) digest of `stable` frozen in a central config repo that CI templates read, (5) deprecation of old channels after N days so CVEs do not live forever. Testing the image: a platform canary suite (smoke of launch, screenshot, network, shm stress, signal/TERM flush) on every golden build. Ownership: platform team on-call for "Chrome won't start"; teams on-call for their selectors. Cost: one rebuild vs ten; the political cost is forced upgrades — sell with CVE and flake data. Failure modes: teams pinning a six-month-old digest (CVE), teams `FROM golden` then `USER root` and `playwright install` (undoing the product), silent `latest`.

**Code**

```text
ghcr.io/org/e2e-pw:1.46.0           # immutable channel alias → digest
ghcr.io/org/e2e-pw:1.46.0-20260901  # dated rebuild (CVE patch, same PW)
ghcr.io/org/e2e-pw:sha-abc123
ghcr.io/org/e2e-pw:stable           # pointer, not for production Jobs
```

```markdown
# CHANGELOG excerpt
## 1.47.0 - 2026-09-01
BREAKING: Playwright 1.47 (require @playwright/test 1.47.x)
- Chrome revision 1280
- UID remains 1000
- TERM grace recommendation 45s (unchanged)
```

```dockerfile
# Team image — allowed to add the suite only
FROM ghcr.io/org/e2e-pw:1.46.0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
USER pwuser
```

**Follow-ups & traps**
- "Team refuses to upgrade?" — they can pin a digest inside the support window; after that, platform does not debug old browsers. Contract, not a fight in Slack.
- Trap: golden image that includes one team's `node_modules`.
- "How do you test the image?" — canary suite + one volunteer product suite on `next` before `stable`.
- Dual-running 1.46 and 1.47 — matrix cost; time-box it.

**Senior/lead angle** — This is a paved-road product: adoption metrics, changelog, support window, canary, and a CI template that *defaults* to the golden digest. Success is ten teams not building ten Chrome layers.

**One-liner** — Golden image = browsers + runtime + init, versioned by Playwright/Selenium, changelog'd, promoted `next`→`stable` by digest, with a support window — suites stay out of the base.

### Q16. Common commands rapid-fire with WHY an SDET uses them (`build`, `run`, `exec`, `logs`, `ps`, `prune`, `inspect`, `history`).

**Interview answer** — I do not recite flags; I say what failure each command diagnoses. `build` produces the pinned environment. `run` is the test execution API (`--rm`, `--user`, `--shm-size`/`--ipc`, `-e`, `-v`). `exec` is live surgery. `logs` is the suite stdout. `ps -a` is exit codes. `inspect` is OOMKilled, mounts, PID 1, env. `history` is secrets-in-layers and cache order. `prune` is how CI agents survive.

**Deep dive** —

| Command | Why an SDET uses it |
| --- | --- |
| `docker build -t org/e2e:$SHA .` | Materialize the golden or team image; `--platform linux/amd64` when laptops are ARM |
| `docker buildx build --push --cache-to …` | CI build with shared cache (Q10) |
| `docker run --rm --init --shm-size=2g -e BASE_URL=… -v $PWD/out:/app/out img` | The actual test invocation; flags are the platform contract |
| `docker exec -it ctr bash` | DNS, `df -h /dev/shm`, whoami, one-test repro — only while running |
| `docker logs -f ctr` | First stop when compose "did nothing"; timestamps `-t` for timeout correlation |
| `docker ps -a` | Exited shards; `--filter status=exited` |
| `docker inspect ctr` | `State.OOMKilled`, `State.ExitCode`, `HostConfig.ShmSize`, `Config.User`, mounts |
| `docker history img` | Layer order + leaked `ENV TOKEN=` |
| `docker system df` / `prune` | Agent disk; `--volumes` is destructive of named-volume DBs |
| `docker cp ctr:/app/playwright-report .` | Artifact recovery without a mount |
| `docker stats` | Starvation vs "flaky timeout" (Q8) |
| `docker pull img@sha256:…` | Reproduce CI exactly |
| `docker compose run --rm tests` | Exit-code gate for the stack (Q5) |

`run` = create + start. `-d` hides failures until logs. `prune -af` on a shared builder deletes *other teams'* cache — schedule with care, not as a rage click. `docker top` to see Chrome zombies (Q4).

**Code**

```bash
# 60-second post-mortem pack
docker ps -a --filter name=e2e
docker inspect e2e --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}} shm={{.HostConfig.ShmSize}} user={{.Config.User}}'
docker logs --tail=200 e2e
docker history --no-trunc org/e2e:sha | head
docker system df
```

**Follow-ups & traps**
- "Detached container vanished?" — `--rm` plus exit. Drop `--rm` when debugging.
- Trap: `prune --volumes` on the Grid host that stored videos in a named volume.
- "`run` vs `exec`?" — new container vs enter existing. Live-demo fail.
- "How do you know shm size without exec?" — `inspect HostConfig.ShmSize` (0 = default 64 MiB).

**Senior/lead angle** — Put this post-mortem pack in the on-call runbook and in CI "debug" jobs that print inspect JSON next to the report URL. Commands are cheap; tribal-only debugging is expensive.

**One-liner** — `build`/`run` execute, `logs`/`ps`/`inspect`/`history` explain, `exec`/`cp` recover, `stats`/`prune` keep the farm honest — each maps to a test-platform failure mode, not a man page.
