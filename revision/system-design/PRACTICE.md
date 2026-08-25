# System design — practice (FAANG + SDET)

**Use with:** [NOTES.md](NOTES.md) · [LLD.md](LLD.md) · [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md)  
**Browser:** [PRACTICE.html](PRACTICE.html)

For each prompt: **45 min timer**, paper or whiteboard, then check yourself against the rubric. Do **not** open solutions first. Speak out loud.

---

## Rubric (self-score /10)

| Score | Meaning |
| --- | --- |
| Requirements | Clarified scale, NFRs, non-goals (0–2) |
| Estimates | Order-of-magnitude QPS/storage (0–2) |
| Diagram | Clear boxes + data flow (0–2) |
| Depth | One hot path detailed (0–2) |
| Failures / trade-offs | Concrete, not buzzwords (0–2) |

Target **≥ 7** before moving on. Redo weekly.

---

## A. Classic HLD (product companies)

### A1. URL shortener
Functional: create, redirect, optional expiry.  
Ask: read:write ratio, custom aliases, analytics.  
Must hit: code generation, DB vs cache, 301/302, rate limit.

### A2. Rate limiter
Per user / IP, distributed.  
Must hit: token bucket vs sliding window, Redis, gateway placement.

### A3. Pastebin / file share
Upload text/file, TTL, viral spike.  
Must hit: object store, CDN, virus scan async.

### A4. Notification system
Email/SMS/push, templates, preferences.  
Must hit: queue, fan-out, idempotent send, provider failover.

### A5. News feed
Follow graph, ranked feed.  
Must hit: push vs pull, fan-out on write, cache timeline.

### A6. Chat (1:1 then group)
Must hit: websocket/gateway, message store, online presence, ordering.

### A7. Ride matching (Uber-lite)
Must hit: geo index, matching service, ETA, trip state machine.

### A8. Video streaming (YouTube-lite)
Must hit: upload → transcode pipeline, CDN, adaptive bitrate.

---

## B. Classic LLD

For each: use cases → classes → one sequence → concurrency → unit-test plan.

| # | Prompt | Patterns to consider |
| --- | --- | --- |
| B1 | LRU cache | HashMap + doubly linked list |
| B2 | Parking lot | Strategy fee, Factory vehicle |
| B3 | Elevator system | State, scheduler strategy |
| B4 | Chess / snakes & ladders | Board, Piece strategy |
| B5 | Bookstore inventory | Reservation, concurrency |
| B6 | Splitwise-lite | Expense, balances |
| B7 | Thread-safe logger | Singleton careful / better: DI |
| B8 | Pub-sub in-process | Observer |

---

## C. Automation HLD (your interview edge)

### C1. Distributed UI test runner (10k / 30 min)
See [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md) §2.  
Must hit: concurrency math, queue, isolation, artifacts, retry.

### C2. Device farm
§3. Must hit: locks, health, iOS signing, cloud vs lab.

### C3. Flake analytics platform
§4. Must hit: event ingest, flake score, quarantine workflow.

### C4. Multi-repo CI quality orchestrator
§5. Must hit: DAG, smoke vs full, secrets, fail-fast.

### C5. AI-assisted test generation platform
§6. Must hit: sandbox, eval, cost, human review, audit.

### C6. Cross-team test data service
Disposable users, seeded catalogs, GDPR.  
Must hit: APIs, cleanup TTL, isolation per parallel worker.

### C7. Selenium Grid / Playwright worker mesh on K8s
Autoscaling, browser images, resource requests, node affinity.

### C8. Load-test platform (Locust-as-a-service)
Scenarios as code, workers, threshold gates, compare runs.

---

## D. Automation LLD

| # | Prompt | Focus |
| --- | --- | --- |
| D1 | Driver / Browser factory | Thread safety, capabilities |
| D2 | Retry + timeout policy | Strategy, budget |
| D3 | Artifact uploader | Failures, retries, checksum |
| D4 | Result aggregator | Concurrent writes |
| D5 | Locator repository | Versioning, deprecation |
| D6 | Appium session pool | Lease, heartbeat |
| D7 | TestNG/JUnit parallel listener | Observer |
| D8 | Page component model for checkout | Composition |

---

## E. Mixed round (realistic Senior SDET)

**45 min:** “We have 3 web teams, 1 mobile, flaky nightly. Design a platform for the next 12 months.”  
Cover: current pain → target architecture → migration phases → metrics → build vs buy → staffing.

**30 min LLD follow-up:** “Zoom into the worker claiming a test and uploading a trace.”

---

## Weekly drill plan

| Week | Focus |
| --- | --- |
| 1 | A1, A2, B1, B2 — learn the clock |
| 2 | A4, A5, B3, B8 |
| 3 | **C1, C2, D1, D2** — automation core |
| 4 | C3, C4, D3, D4 |
| 5 | C5 (AI), A7 or A8, mixed E |
| 6 | Redo C1 + A1 under timer; record yourself |

---

## After each attempt (write in a notebook)

1. What did I clarify?  
2. What numbers did I use?  
3. Where did I go too shallow?  
4. One trade-off I should have said?  

Peer/mock: use [INTERVIEW-QA.md](INTERVIEW-QA.md) as the interviewer script.
