# Quality engineering strategy — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Lead SDET = organizational quality strategy, not more Selenium.

---

## 1. Models

### Test pyramid
Many unit → fewer integration → few E2E. E2E is expensive/brittle; keep to critical journeys.

### Testing trophies / quadrants (awareness)
Different orgs draw shapes differently; principle matters: **right test at right layer**.

### Shift-left
Catch issues earlier: unit, contract, static analysis, PR checks, design reviews for testability.

### Shift-right
Prod monitoring, canaries, feature flags, synthetic checks, observability-driven detection.

---

## 2. Risk-based testing

Prioritize by:
- user/revenue impact
- change frequency
- historical defect density
- compliance needs

Not all features deserve equal E2E depth.

---

## 3. Release gates

| Gate | Example |
| --- | --- |
| PR | lint, unit, fast contract/smoke |
| Merge | critical path green |
| Release | broader regression, perf budget, security scans |
| Hotfix | minimal smoke + targeted tests |

Document **accepted risk** when shipping with known gaps (time-boxed).

---

## 4. Metrics that matter

| Metric | Why |
| --- | --- |
| Escaped defects (by severity) | Customer impact |
| Flaky rate | Trust in CI |
| MTTR | Recovery speed |
| Regression duration | Feedback latency |
| Critical-path coverage | Real confidence |
| Release frequency / rollback rate | Delivery health |
| Defect detection efficiency | Are tests earning their keep? |

Avoid vanity: raw test count, line % alone.

---

## 5. Portfolio thinking

Ask quarterly:
- What E2E can move down to API/contract?
- What is manual exploratory still best for?
- What platform investment unlocks many teams?

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
