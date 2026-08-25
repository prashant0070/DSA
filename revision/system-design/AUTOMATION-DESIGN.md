# Automation system design (SDET / SET / Lead)

**Browser:** [AUTOMATION-DESIGN.html](AUTOMATION-DESIGN.html)  
**HLD basics:** [NOTES.md](NOTES.md) · **LLD:** [LLD.md](LLD.md) · **Practice:** [PRACTICE.md](PRACTICE.md)

This is where FAANG-style system design meets **your** job. Interviewers at Amazon, Google, Microsoft, Meta, Flipkart, Uber ask:

> “Design a system to run 10,000 UI tests in 30 minutes.”  
> “Design a device farm.”  
> “How would you store and query flaky-test history?”

Use the same **FAANG clock** as [NOTES.md](NOTES.md) §2. Replace “URL shortener” with **test platform** language: workers, shards, artifacts, isolation, cost.

---

## 1. Map HLD blocks → automation

| Classic HLD | Automation equivalent |
| --- | --- |
| Client | Developer / CI job / “Run tests” UI |
| API / app | Orchestrator (schedule suite, claim work) |
| Queue | Pending test cases / shards |
| Workers | Containers with Playwright / Selenium / Appium |
| DB | Suite metadata, run history, flake scores |
| Object store | Traces, videos, screenshots, Allure |
| Cache | Auth storageState, device availability |
| CDN | Rarely — static report UI |
| Observability | Pass rate, duration, flake %, queue lag |

**Interview sentence:**  
“A distributed test platform is a **job queue + ephemeral workers + artifact store + result DB**, with **hard isolation** so parallel runs do not share browser state.”

---

## 2. Design 1 — Distributed test execution platform (must master)

### Clarify (0–5 min)

- UI only or UI+API+mobile?  
- Target: 10k tests / 30 min?  
- Browsers: Chromium only or matrix?  
- Who triggers: PR, nightly, on-demand?  
- Artifacts retention: 7 / 30 days?  
- Multi-tenant (many teams) or one org?

### Requirements

**Functional:** submit suite, shard, run, retry once, collect results, download artifacts, cancel run.  
**Non-functional:** finish PR smoke &lt; 15 min; nightly full &lt; 45 min; never lose failure artifacts; workers auto-scale; cost capped.

### Estimates (example)

- 10,000 tests × 20 s average = 200,000 test-seconds.  
- 30 min = 1,800 s → need ≈ **111 concurrent test slots**.  
- Plan **120–150 workers** (headroom for flake retry).  
- Artifact ≈ 5 MB on fail, 10% fail → 5 GB per full run.

### High-level architecture

```text
CI / UI
   ↓
Orchestrator API
   ↓
Queue (shards or individual tests)
   ↓
Worker pool (K8s Jobs / ECS)
   ├─ Playwright / Selenium node
   ├─ upload artifacts → S3
   └─ post results → Result service
Result DB + Report UI
Metrics: Grafana (pass%, duration, queue lag)
```

### Deep dives (pick 2)

**A. Sharding:** balance by **historical duration**, not test count. Sticky “slow tests” flagged.  
**B. Isolation:** one Browser Context (or WebDriver) per test; unique test users; no static driver.  
**C. Retry:** max 1; always attach trace on retry; quarantine if flake rate &gt; threshold.  
**D. Idempotency:** worker crash → message returns to queue; result write upsert by `(runId, testId)`.

### Failure modes

| Failure | Handling |
| --- | --- |
| Worker OOM | Kill pod, requeue test, alert |
| Staging down | Circuit break; fail fast smoke |
| S3 full | Alert; keep local until upload |
| Poison test (hangs) | Hard timeout; mark error |

### LLD zoom — claim work

`Worker.loop`: `lease = queue.claim(ttl)` → run → `results.complete(lease.id)` → heartbeat extends lease. If heartbeat dies, another worker may reclaim.

### Patterns used

Factory (browser), Strategy (retry / shard), Observer (reporting), Queue consumers, DI for config.

---

## 3. Design 2 — Device farm / mobile lab

### Clarify

Real devices vs emulators? iOS signing? Private devices? Cloud fallback (BrowserStack)?

### Architecture

```text
Scheduler API
   ↓
Device registry (UDID, OS, busy/free, health)
   ↓
Queue per device class (iPhone-15, Pixel-8)
   ↓
Host agents (USB / wireless) running Appium
   ↓
Session → artifacts (video) → S3
```

### Hard problems (show senior depth)

- **Provisioning / signing** for iOS WDA  
- **Device health:** reboot when Appium hangs  
- **Exclusive lock** on device for session  
- **Cleanup:** uninstall app, clear keychain/storage  
- **Utilization metrics** and queue wait SLA  

### Trade-off

Build lab vs buy cloud: compliance, cost at scale, maintenance, exotic devices.

---

## 4. Design 3 — Test result & flake analytics

### Why

Nightly red for 3 days is a **data** problem: which tests flake, which commit broke what.

### Architecture

```text
Workers → Result API → append-only events
                    → OLTP (runs, tests)
                    → stream → warehouse / ClickHouse
Dashboard: pass rate, top flaky, duration regression
Alert: main branch fail, flake budget exceeded
```

### Schema sketch

- `run(run_id, commit, branch, started, finished)`  
- `test_result(run_id, test_id, status, duration_ms, attempt)`  
- `artifact(result_id, type, s3_key)`  
- Flake score = intermittent fail rate over last N runs on same commit lineage.

### API

`POST /runs`, `POST /runs/{id}/results`, `GET /flaky?window=7d`

---

## 5. Design 4 — CI quality gate orchestrator

### Flow

```text
PR opened
 → lint + unit (dev)
 → API contract tests (fast)
 → UI smoke shard (critical paths only)
 → merge
Nightly → full matrix + mobile + load smoke
Release → P0 pack + perf gate (p95)
```

### Design points

- **DAG** of jobs (Playwright project dependencies).  
- **Fail fast** on smoke.  
- **Cache** deps and browsers.  
- **Secrets** from vault; never in logs.  
- **Quarantine lane** for known flaky (does not block PR; still tracked).

---

## 6. Design 5 — AI test generation / eval platform (your differentiator)

Align with [ai-sdet](../ai-sdet/NOTES.md) and your AI automation tool.

```text
Repo / Figma / OpenAPI
   ↓
Ingest + chunk (AST, specs)
   ↓
LLM generate candidates
   ↓
Static validate (compile, no prod URL)
   ↓
Execute in sandbox workers
   ↓
Human review queue
   ↓
Promote to suite + regression eval set
```

**HLD concerns:** cost caps, prompt versioning, golden eval, jailbreak on tools, audit log.  
**LLD:** `Generator`, `Validator`, `SandboxRunner`, `ReviewItem`.

---

## 7. Design 6 — Unified multi-channel framework (service view)

Not only “packages in a repo” — as a **platform**:

```text
Config service
Test data service (factories, disposable users)
Auth token service
Web workers | Mobile workers | API runners | Locust
Shared reporting bus
```

Teams write tests against **SDKs**; platform owns runners. Lead SDET interview gold.

---

## 8. Cross-cutting for every automation design

| Topic | What to say |
| --- | --- |
| Isolation | Context/driver per test; unique data |
| Scale | Queue + horizontal workers; shard by time |
| Cost | Spot instances; scale to zero; retain artifacts selectively |
| Security | Secrets manager; no PII in reports; network policy to staging |
| Observability | Queue lag, worker CPU, pass%, flake%, p95 duration |
| Consistency | Upsert results; at-least-once queue + idempotent writes |
| Multi-tenancy | Namespace per team; quotas |

---

## 9. How this differs from “framework architecture” notes

| [framework-design](../framework-design/NOTES.md) | This doc |
| --- | --- |
| Layers inside one test repo (POM, waits) | **Platform** across CI, workers, storage |
| How to write tests | How to **run thousands** safely |
| Tool APIs | **Capacity, queues, failure domains** |

You need **both**. Whiteboard day: start with platform HLD, zoom to LLD of worker + factory.

---

## 10. One-page answer template (memorize)

1. Clarify scale and channels (web/mobile/API).  
2. Estimate concurrency = total_test_seconds / deadline.  
3. Draw: API → queue → workers → S3 + results DB.  
4. Deep-dive isolation + sharding + retry.  
5. Failures: hang timeout, requeue, DLQ.  
6. Metrics and flake budget.  
7. Build vs buy (grid/cloud devices).  

Practice prompts in [PRACTICE.md](PRACTICE.md).
