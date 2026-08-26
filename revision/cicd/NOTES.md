# CI/CD architecture — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## 1. Pipeline stages

```text
PR → Build → Unit → Contract → Integration → Smoke → Regression → Performance → Release
```

Not every stage on every PR. **Fail fast** on PR; deeper coverage nightly/pre-release.

---

## 2. Design concerns

| Concern | Practice |
| --- | --- |
| Sharding | Split tests by timing/history |
| Matrix | OS × browser × version |
| Artifacts | Logs always on fail |
| Secrets | Injected, masked |
| Caching | Dependencies |
| Parallelism | Bounded by cost/flakes |
| Environments | ephemeral vs shared |

---

## 3. Deployment strategies (awareness)

- Rolling
- Blue/green
- Canary
- Feature flags (decouple deploy from release)
- Rollback playbooks

---

## 4. Quality gates

- What blocks merge?
- What blocks release?
- Who can override and with what audit?

Flaky tests destroying trust is a CI architecture problem, not only a test problem.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
