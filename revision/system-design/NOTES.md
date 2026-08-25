# System design — HLD (FAANG format)

**Browser:** [NOTES.html](NOTES.html)  
**Also:** [LLD.md](LLD.md) · [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md) · [PRACTICE.md](PRACTICE.md) · [INTERVIEW-QA.md](INTERVIEW-QA.md)

This is **high-level design (HLD)**: boxes, APIs, data, scale, failure.  
**LLD** is classes and sequences inside one service. Both appear at FAANG / product companies. For **SDET / SET / SDE II**, you get a mix: generic systems (URL shortener) **and** test platforms (device farm, 10k parallel tests).

---

## 1. LLD vs HLD vs “system design”

| | LLD | HLD / system design |
| --- | --- | --- |
| Scope | One feature or service | Whole product or platform |
| Output | Classes, interfaces, sequence, DB tables for that service | APIs, services, storage, cache, queue, CDN |
| Time | 35–45 min | 45–55 min |
| SDET example | Design Page Object + Driver factory (thread-safe) | Design distributed test runner for 10k tests |

**System design** in FAANG usually means HLD. Amazon SDE II / Senior SDET still expect you to drop to LLD for a hot path (e.g. “how does the worker claim a test?”).

---

## 2. FAANG interview clock (45–55 minutes)

Do not jump to Kafka in minute 2.

| Min | What you do | Why they grade this |
| --- | --- | --- |
| 0–3 | Repeat the prompt. Clarify **users, scale, constraints, non-goals**. | Communication |
| 3–8 | Functional + non-functional requirements. SLA: latency, availability. | Scope control |
| 8–12 | **Back-of-envelope**: QPS, storage, bandwidth. | Numeracy |
| 12–18 | API sketch + high-level boxes (clients, LB, app, DB). | Structure |
| 18–35 | Deep dive 1–2 components (data model, cache, queue). | Depth |
| 35–45 | Bottlenecks, failure, consistency, security, observability. | Senior signal |
| 45–50 | Trade-offs, what you’d do next. | Judgment |

**Script opening:**  
“I’ll clarify requirements, estimate scale, propose APIs and a block diagram, then deep-dive storage and the hottest path, then failures.”

---

## 3. Requirements (always write them)

### Functional
What the system **does**. Example URL shortener: create short URL, redirect, optional expiry, analytics.

### Non-functional (the FAANG meat)

| Attribute | Question to ask |
| --- | --- |
| Latency | p99 redirect &lt; 50 ms? |
| Throughput | Writes 1k/s, reads 100k/s? |
| Availability | 99.9% or 99.99%? |
| Consistency | Must every read see the latest write? |
| Durability | Can we lose a click count? |
| Scale | 5 years of URLs? |

**SDET translation:** test-result ingest p99, 10k concurrent workers, never lose a failure artifact.

---

## 4. Capacity estimation (practice until automatic)

Assumptions are fine if you **state them**.

**Example: 100 million short URLs / month, 100:1 read:write**

- Writes ≈ 100e6 / (30×86400) ≈ **40 QPS** write  
- Reads ≈ **4k QPS** average, **peak 4×** → 16k QPS  
- If each URL row is 500 bytes → 50 GB/month → ~600 GB/year  

**Memory:** cache 20% hot keys × 500 B.

You do not need exact numbers. You need the **method**: QPS, storage, cache size, machines ≈ QPS / QPS-per-box.

---

## 5. Building blocks (definitions)

| Block | Definition | When |
| --- | --- | --- |
| **Load balancer** | Spreads traffic; health checks | All public APIs |
| **Stateless app** | No session in process; scale horizontally | Web/API tier |
| **SQL** | Relational, joins, transactions | Strong consistency, money |
| **NoSQL** | Document / KV / wide-column | High write, flexible schema |
| **Cache** | Fast copy (Redis). Hit/miss, TTL, eviction | Hot reads |
| **CDN** | Edge cache for static / some APIs | Global latency |
| **Queue / stream** | Async: Kafka, SQS | Decouple, absorb spikes |
| **Object storage** | S3 blobs | Videos, traces, Allure zips |
| **Shard / partition** | Split data by key | Scale writes |
| **Replica** | Copy for reads / HA | Read scale, failover |

### CAP (interview one-liner)

You cannot have perfect **C**onsistency, **A**vailability, and **P**artition tolerance together. Under a network split you pick **CP** (refuse some writes) or **AP** (serve possibly stale). Most product systems are **AP with tunable consistency** (cache + DB).

### Consistency models

- **Strong:** read sees latest write (SQL primary, linearizable).  
- **Eventual:** replicas catch up (DNS, some NoSQL, caches).  
- **Read-your-writes:** after I write, I see it (sticky session or user-id routing).

---

## 6. Cache patterns

| Pattern | Behavior |
| --- | --- |
| **Cache-aside** | App reads cache; miss → DB → fill cache |
| **Write-through** | Write cache and DB together |
| **Write-back** | Write cache, DB later (fast, risk of loss) |
| **TTL** | Expire after time |
| **LRU** | Evict least recently used |

**Stampede:** many misses at once → singleflight / lock around fill.

---

## 7. Messaging

```text
Producer → Broker (topic/queue) → Consumer group
```

- **Queue (SQS):** each message one consumer. Work distribution.  
- **Pub/sub / Kafka:** many consumer groups can each read the stream.  
- **At-least-once** delivery is default → consumers must be **idempotent**.  
- **Offset / ack** so you do not lose work on crash.

SDET: “test finished” events → analytics, Slack, flake detector.

---

## 8. Data modeling (HLD level)

- Identify **entities** and **access patterns** (not every column).  
- Pick **primary key** that matches queries.  
- Separate **OLTP** (live) vs **OLAP** (analytics warehouse).  
- **Indexes** for read paths; **TTL** for logs.

URL shortener: `short_code → long_url, owner, expires`. Click events in a stream, not on the hot redirect path.

---

## 9. API sketch (always)

```text
POST /urls          { longUrl } → { shortCode }
GET  /{code}        302 Location: longUrl
GET  /urls/{code}/stats
```

Mention auth, rate limit, idempotency key on POST.

---

## 10. High-level template diagram (memorize)

```text
Client → DNS → CDN → LB → App (stateless)
                              ├→ Cache
                              ├→ Primary DB (+ replicas)
                              ├→ Queue → Workers
                              └→ Object store
                     Observability: logs, metrics, traces
```

Then **zoom in** on the bottleneck.

---

## 11. Failure and scale (senior checklist)

- App crash → LB removes instance  
- DB primary down → failover replica (RPO/RTO)  
- Cache down → hit DB (degrade, circuit breaker)  
- Queue lag → add consumers, DLQ  
- Hot shard → split key, or cache that key  
- Rate limit / WAF  
- Multi-AZ; later multi-region (harder consistency)

---

## 12. Classic HLD prompts (practice these)

**Beginner:** URL shortener, rate limiter, pastebin, notification service.  
**Intermediate:** news feed, chat, Uber-lite, YouTube-lite, e-commerce checkout.  
**SDET (see AUTOMATION-DESIGN.md):** distributed test execution, device farm, CI orchestrator, result analytics, AI test-gen platform.

For each, use the clock in §2. Write estimates. Draw 8–12 boxes. Deep-dive one path.

---

## 13. How FAANG grades you

| Signal | Strong | Weak |
| --- | --- | --- |
| Clarifying | Constraints and non-goals | Jump to Redis |
| Estimates | Order-of-magnitude | Skip numbers |
| Trade-offs | “SQL here, Kafka there, because…” | Buzzword salad |
| Depth | Schema or sequence for hot path | Only logos |
| Operations | Metrics, alerts, rollback | Happy path only |

SDET bonus: **isolation, flake, artifacts, cost per run, blast radius of a bad worker.**

Next: [LLD.md](LLD.md) then [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md). Drill [PRACTICE.md](PRACTICE.md).
