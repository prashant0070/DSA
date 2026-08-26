# Debugging engineering — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Senior interviews reward structured debugging more than trivia.

---

## 1. Universal method

1. **Reproduce** reliably (or characterize flakiness)
2. **Minimize** steps / data
3. **Locate layer** (client, network, API, DB, infra, test itself)
4. **Gather evidence** (logs, traces, metrics, dumps)
5. **Hypothesize** → test one change
6. **Fix** + **guardrail** (test, metric, lint)
7. **Write** short RCA

Say this structure aloud in interviews.

---

## 2. Java scenarios

| Symptom | Leads |
| --- | --- |
| NPE | Missing null checks; Optional misuse; bad fixture data |
| ConcurrentModificationException | Mutate collection while iterating; shared list in parallel tests |
| Deadlock | Thread dump; lock order |
| OOM | Heap dump; unbounded growth |
| Race | Timing-dependent shared state |

Tools: logs, debugger, jstack, jmap, GC logs.

---

## 3. Selenium / Playwright

| Issue | Typical cause |
| --- | --- |
| Stale element | DOM re-render after locate |
| Timeout | Wrong wait; slow env; overlay |
| Intercepted click | Overlay/animation |
| Context leak | Shared page/context across tests |
| Passes alone, fails parallel | Shared state / isolation |

Prefer evidence: trace, screenshot, DOM dump, network — not blind sleep increases.

---

## 4. API / network

- 500: server logs + trace
- Timeout: dependency? DNS? pool exhausted?
- TLS/cert errors: clock, CA, MITM proxy in corp CI
- Connection refused: wrong host/port, service down

---

## 5. Distributed / CI only failures

| Pattern | Hypothesis |
| --- | --- |
| Only Linux CI | path/case/locale/docker |
| Only parallel | shared mutable state |
| Only nightly | data growth, order dependency, schedule race |
| Kafka lag | consumer stuck/poison |
| Flaky eventual assert | need wait-for helper |

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
