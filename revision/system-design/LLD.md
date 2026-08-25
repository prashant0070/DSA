# Low-level design (LLD) — FAANG format

**Browser:** [LLD.html](LLD.html)  
**HLD:** [NOTES.md](NOTES.md) · **Automation LLD/HLD:** [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md)

LLD = **classes, interfaces, sequences, invariants** for one problem. Amazon/Google often do “design Parking Lot / LRU / Rate limiter” in 35–45 min. SDET variant: “design a thread-safe Driver factory + retry.”

---

## 1. LLD clock (35–45 min)

| Min | Do |
| --- | --- |
| 0–4 | Requirements, actors, use cases, out of scope |
| 4–8 | Core entities + relationships (UML in words) |
| 8–15 | Class diagram: interfaces first (ISP, DIP) |
| 15–28 | Sequence for the **hottest** flow |
| 28–35 | Concurrency, edge cases, complexity |
| 35–40 | How you’d test this design |

**Opening:** “I’ll list use cases, identify types, define interfaces, walk one sequence, then thread-safety and tests.”

---

## 2. What interviewers want in LLD

1. **Correct abstractions** — not 40 classes, not 1 god class.  
2. **SOLID** — especially S, O, D. Strategy/Factory where they earn it.  
3. **Invariants** — “capacity never exceeds N.”  
4. **Concurrency** — locks, concurrent maps, or “single-threaded event loop.”  
5. **Extensibility** — add motorcycle without rewriting ParkingLot.

Tie to [design-patterns](../design-patterns/NOTES.md) and [00-oop ADVANCED](../../00-oop-foundations/ADVANCED.md).

---

## 3. Recipe: from prompt to classes

1. Nouns → candidate types (`Ticket`, `Slot`, `Vehicle`).  
2. Verbs → methods (`park`, `unpark`, `calculateFee`).  
3. Varying behavior → **Strategy** (fee policy, wait policy).  
4. Construction → **Factory** (vehicle from type string).  
5. Cross-cutting → **Decorator** (logging).  
6. Shared read-only config → careful Singleton.  
7. Collections: HashMap for id lookup, TreeMap if ordered, Queue for FIFO.

---

## 4. Worked example — LRU Cache (LLD + DSA)

**Requirement:** `get(key)`, `put(key, value)`, capacity N, evict least recently used. O(1) both ops.

**Types:** `LruCache<K,V>`, private `Node` (doubly linked), `HashMap<K, Node>`.

**Invariant:** map size ≤ N; list head = most recent; tail = LRU.

**Sequence put:**
1. If key exists, update value, move node to head.  
2. Else create node, add to head and map.  
3. If size > N, remove tail, delete from map.

**SDET analog:** cache of compiled locators or auth tokens with TTL — same structure, plus expiry.

This is also Phase 9 DSA. In LLD you **name types and concurrency** (`ConcurrentHashMap` vs synchronized).

---

## 5. Worked example — Rate limiter (token bucket)

**Requirement:** allow N requests per user per window.

**Types:** `RateLimiter`, `TokenBucket` (tokens, refillRate, lastRefill), `Key = userId`.

**Strategy:** token bucket vs sliding window log vs fixed window counter.

**Concurrency:** one bucket per key; lock per key or ConcurrentHashMap.compute.

**HLD link:** limiter sits at API gateway; buckets in Redis for multi-instance.

---

## 6. Worked example — Parking lot (classic LLD)

**Use cases:** park vehicle, leave, fee, multiple floors, spot types (S/M/L).

**Types:** `ParkingLot`, `Floor`, `Spot`, `Vehicle`, `Ticket`, `FeeCalculator` (strategy).

**Factory:** `VehicleFactory.from(type)`.

**Lookup:** `Map<TicketId, Ticket>`, `Map<SpotType, Queue<Spot>>` free spots.

**Sequence park:** find spot → occupy → issue ticket.  
**Unpark:** ticket → fee → free spot.

**Out of scope unless asked:** payments, ANPR cameras.

---

## 7. Worked example — SDET LLD: parallel-safe runner

**Requirement:** N tests, M workers, one browser session per test, artifacts on fail.

**Types:** `TestCase`, `TestWorker`, `DriverFactory`, `BrowserSession`, `ArtifactStore`, `ResultCollector`.

**Invariants:** session not shared across tests; factory.create() isolated; collector thread-safe.

**Sequence:** worker claims TestCase → factory.create(config) → run → on fail upload trace → collector.record → session.close().

**Patterns:** Factory (driver), Strategy (retry), Decorator (screenshot), Observer (report).

Full platform HLD is in [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md).

---

## 8. Sequence diagram habit

Always walk **one** happy path and **one** failure:

```text
Client → Service.park(car)
Service → SpotFinder.find(size)
SpotFinder → Floor
Service → TicketRepo.save
Service → Client (ticketId)
```

Failure: no spots → typed exception, no partial occupy.

---

## 9. Concurrency checklist (LLD)

| Risk | Mitigation |
| --- | --- |
| Two threads park same spot | Lock floor or atomic claim |
| HashMap resize | ConcurrentHashMap or sync |
| Double-checked Singleton | Prefer enum / DI instead |
| Test parallel static driver | No static mutable driver |

---

## 10. LLD prompts to practice (speak out loud)

**Core:** LRU, rate limiter, parking lot, elevator, chess/snake, bookstore inventory, splitwise-lite.  
**SDET:** Driver factory, retry+timeout policy, test result aggregator, locator repository, Appium session pool.

For each: requirements → types → one sequence → threads → how you’d unit-test.

Java coding of LRU/rate limiter can live later in `10-lld-with-dsa`. Here you **design on a whiteboard**.

Next: [AUTOMATION-DESIGN.md](AUTOMATION-DESIGN.md).
