# Lead SDET — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Lead ≠ senior who knows more Selenium. Lead = quality outcomes across teams.

---

## 1. Ownership surfaces

- Quality strategy and roadmap
- Platform / framework direction
- Metrics and release confidence language
- Hiring, mentoring, standards
- Cross-functional influence (dev, PM, design, SRE, security)

---

## 2. Quantify impact (always)

```text
Regression: 6h → 45m
Flake: 12% → 1.5%
Manual hours: 200 → 60 / release
Release: weekly → daily
Escaped P0: N → N-k
```

Stories without numbers are weak at Lead level.

---

## 3. 12-month roadmap sketch

| Quarter | Theme | KPI |
| --- | --- | --- |
| Q1 | Flake + reporting baseline | flake %, trusted smoke |
| Q2 | Parallel scale + env self-service | CI p95 |
| Q3 | Contract tests + device/API lab | E2E count ↓, escapes ↓ |
| Q4 | Observability + optional AI assist | MTTR, cost |

---

## 4. Build vs buy

Grid, devices, reporting, observability — document criteria: cost, compliance, ops load, flexibility. Pilot; decide; commit.

---

## 5. People systems

Hiring bar (coding + debugging + design + communication), leveling, feedback, weak-performer plans, grow seniors via subsystem ownership.

Pair with [../behavioral/LEADERSHIP-QA.md](../behavioral/LEADERSHIP-QA.md).

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
