# Other interview areas — quick Q&A (gaps fill)

Topics **not** given a full track elsewhere — CI/CD depth, performance, security, accessibility, test data, observability.  
Use for **follow-ups** and **Lead** loops.

---

## CI/CD & DevOps (SDET-facing)

**Q: Explain your ideal PR pipeline for a web product.**  
A: Lint → unit (dev) → compile tests → **smoke parallel** (&lt;15 min) → artifact (trace on fail) → block merge. Nightly: full regression sharded. Weekly: dependency scan.

**Q: Jenkins vs GitHub Actions vs CircleCI — how choose?**  
A: Org standard, secret management, matrix parallel, artifact storage, cost, self-hosted vs cloud agents.

**Q: How shard tests across workers?**  
A: By **duration balance** (historical timing), not count alone; isolate flaky to quarantine shard; avoid shared DB.

**Q: What artifacts do you keep on failure?**  
A: Screenshot, trace/HAR, video, console log, network log, test data snapshot (no PII), build/version.

**Q: How handle secrets in CI?**  
A: Vault / GitHub secrets; never in repo; rotate; separate env scopes; scan for leaks.

**Q: Blue/green or canary — SDET role?**  
A: Smoke on canary; synthetic monitoring; compare error rates; automated rollback criteria.

---

## Performance & load testing

**Q: When involve performance testing?**  
A: SLA defined (p95 latency, TPS); before peak events; after major arch change; not every UI test.

**Q: Locust vs JMeter vs k6?**  
A: Locust — Python, code-first, good for SDET who code. JMeter — GUI, enterprise. k6 — JS, cloud native.

**Q: What metrics from load test?**  
A: RPS, p50/p95/p99 latency, error rate, CPU/DB connections; **breaking point**; compare baseline.

**Q: Performance test in CI?**  
A: Smoke load on staging nightly; full load pre-release; threshold gates; not blocking every PR (too slow).

**Q: Found bottleneck — SDET role after?**  
A: Reproduce with minimal scenario; share profile with dev; re-run after fix; add **regression perf test** if critical.

---

## Security testing (SDET level)

**Q: OWASP Top 10 — what SDETs actually test?**  
A: AuthZ bypass (API), injection via API params, XSS in reflected fields (with approval), sensitive data in logs/reports, broken access control on IDs.

**Q: How test auth flows?**  
A: Token expiry, refresh, role matrix, negative cases (403), no credential in URLs/logs.

**Q: Dependency scanning?**  
A: Snyk/Dependabot in CI; block critical CVEs; SDET verifies upgrade smoke.

**Q: Pen test vs SDET automation?**  
A: Pen test — specialists, periodic. SDET — continuous regression on auth, input validation, security headers.

---

## Accessibility (a11y)

**Q: How automate accessibility checks?**  
A: axe-core / Playwright accessibility scan; critical pages in CI; manual VoiceOver/NVDA for flows automation misses.

**Q: What a11y bugs automation catches?**  
A: Missing labels, color contrast (some), ARIA roles; not full UX of screen reader journey.

**Q: Apple interview angle?**  
A: VoiceOver paths on key flows; Dynamic Type; accessibility as **quality bar**, not checkbox.

---

## Test data management

**Q: Strategies for parallel safe data?**  
A: UUID users, API factories, reset hooks, dedicated tenant, containerized DB per job.

**Q: Refresh test data nightly?**  
A: Seed scripts, anonymized prod subset (legal approval), versioned fixtures.

**Q: Data-driven tests — where store data?**  
A: JSON/YAML/CSV in repo vs factory-generated; avoid prod copies.

---

## Observability & production feedback

**Q: How connect tests to prod monitoring?**  
A: Synthetic checks (canary URLs); compare prod error budget to test gaps; post-incident test additions.

**Q: What learn from production incident for test strategy?**  
A: Missing layer (unit vs contract vs E2E); wrong env; data edge case; add **regression + guard** in CI.

---

## Contract & microservices testing

**Q: Pact / contract testing — why?**  
A: Consumer-driven contracts catch breaking API changes without full integration env.

**Q: Test Kafka/event-driven flows?**  
A: Publish test event, assert consumer side effect, idempotency, ordering, dead-letter queue.

**Q: Service virtualization / WireMock?**  
A: When dependency unstable or unavailable; stub with recorded contracts; refresh stubs when API versions.

---

## Mobile-specific (beyond Appium Q&A)

**Q: Real device vs emulator in CI?**  
A: Emulator/simulator for PR speed; real device farm nightly; flake higher on real — budget time.

**Q: Mobile release checklist?**  
A: OS matrix, app permissions, offline mode, push notifications, app store build vs debug.

---

## Where to go deeper

| Topic | File |
| --- | --- |
| Automation tools | [automation/](../automation/) |
| API/HTTP | [api-http/INTERVIEW-QA.md](../api-http/INTERVIEW-QA.md) |
| SQL/data | [sql/INTERVIEW-QA.md](../sql/INTERVIEW-QA.md) |
| Docker/K8s/AWS | [docker-k8s-aws/INTERVIEW-QA.md](../docker-k8s-aws/INTERVIEW-QA.md) |
| Framework | [framework-design/INTERVIEW-QA.md](../framework-design/INTERVIEW-QA.md) |
| AI | [ai-sdet/INTERVIEW-QA.md](../ai-sdet/INTERVIEW-QA.md) |

Index: [behavioral/README.md](README.md)
