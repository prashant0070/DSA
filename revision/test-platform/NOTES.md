# Test platform engineering — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Lead/SDET III territory: move from “framework + CI” to a **platform**.

---

## 1. From framework to platform

```text
                 Test Platform
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
  Scheduler       Workers        Results
       │              │              │
       ▼              ▼              ▼
  Test Queue    Browser/Device   Result Store
                 Pool                 │
                                Artifact Store
```

Framework = how a test is written.  
Platform = how thousands of tests are scheduled, isolated, observed, and reported across teams.

---

## 2. Scheduler & queue

Responsibilities:
- accept run requests (PR, nightly, on-demand)
- expand suite into work items (tests/shards)
- prioritize (PR smoke > nightly full)
- enqueue with metadata (commit, env, browser matrix)

### Work item
`{ runId, testId, shard, retriesLeft, timeout, capabilities }`

---

## 3. Workers

### Claim protocol
Worker pulls/leases item → heartbeat → execute → upload artifacts → ack result.

### Failure modes
- worker dies mid-test → lease expires → requeue (idempotent enough)
- timeout → kill → mark fail/retry
- cancel run → workers abandon leased items

### Isolation
Fresh browser context / container per test or per shard. No global mutable driver across tests.

---

## 4. Browser / device pool

| Concern | Detail |
| --- | --- |
| Allocation | Semaphore/slots; queue when busy |
| Health | readiness probes; quarantine bad nodes |
| Versions | pin browser/driver images |
| Mobile | signing, provisioning, real vs emulator |
| Cost | $/device-minute; autoscale to zero |

Build vs buy: BrowserStack/Sauce vs private grid — decide with TCO + compliance.

---

## 5. Results & artifacts

- Result store: pass/fail, duration, retries, error signature
- Artifacts: logs, screenshots, video, traces, HAR
- Retention policy (cost!)
- Deep links from CI UI

---

## 6. Flaky detection platform

Track per test:
failure rate, signatures, env, browser, commit, owner, retry outcome, duration history.

Classify:
Timing | Locator | Environment | Data | Product | Infra | Unknown

Workflow: detect → quarantine → owner RCA → fix → re-enable.  
Reject endless retries as a strategy.

---

## 7. Capacity & SLOs

Example SLOs:
- PR smoke finishes < 15 min p95
- Queue wait < 2 min
- Flake < 2%
- Artifact upload success > 99%

Math sketch: tests × avg duration / parallelism ≈ wall clock (plus overhead).

---

## 8. Ten SDET system-design prompts

1. Distributed UI runner  
2. Device farm  
3. Flake service  
4. Result analytics  
5. CI orchestrator  
6. Test data service  
7. Contract-test platform  
8. AI test-gen platform  
9. Load-test as a service  
10. Quality dashboard  

See also [../system-design/AUTOMATION-DESIGN.md](../system-design/AUTOMATION-DESIGN.md).

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
