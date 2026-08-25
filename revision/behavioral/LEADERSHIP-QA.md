# Leadership interview Q&A — Lead SDET / QA Lead

**Audience:** Lead SDET, QA Lead, SET Lead, Engineering Manager (quality) loops at Amazon, Apple, Google, Microsoft, Meta.

**Pair with:** [STAR-GUIDE.md](STAR-GUIDE.md) · [BEHAVIORAL-QA.md](../framework-design/BEHAVIORAL-QA.md) · [COMPANY-BEHAVIORAL-QA.md](COMPANY-BEHAVIORAL-QA.md)

Answer with **STAR + strategy + metric**. Lead loops test **org impact**, not only personal heroics.

---

## 1. Quality strategy & roadmap

**Q: How would you define quality strategy for a product org?**  
A: Align on **risk model** (what can hurt customers/revenue). Test pyramid by layer. **Ownership** (dev owns unit, SDET owns framework + critical E2E, shared contract tests). **CI gates** (PR smoke, nightly full, release criteria). **Metrics**: escaped defects, flake, MTTR, time-to-feedback. 12-month roadmap: platform, not only test count.

**Q: 12-month test platform roadmap — what goes on it?**  
A: Q1: flake/quarantine + reporting baseline. Q2: parallel scale + self-service env. Q3: device/API lab + contract test adoption. Q4: eval/AI assist (optional), mobile parity. Each quarter has **measurable KPI** and **one dev-facing win**.

**Q: How do you balance speed vs quality in continuous delivery?**  
A: Tiered gates — **P0 smoke blocks merge**; broader regression nightly; exploratory for risk. **Feature flags** to decouple deploy from release. Explicit **accepted risk** document when deferring coverage (time-boxed).

**Q: When would you **not** automate?**  
A: Unstable UI, one-off admin tools, cheaper manual exploratory, legal/compliance review flows. Show **judgment** — automation has maintenance cost.

---

## 2. Org design & influence

**Q: Centralized QA vs embedded SDET — pros/cons?**  
A: Embedded: domain knowledge, fast feedback. Central: standards, platform, career ladder. Hybrid common: **platform team** (framework, CI, labs) + **embedded SDETs** in squads. Lead picks based on scale and Conway’s law.

**Q: Two teams, two frameworks — your call?**  
A: Assess overlap, migration cost, bus factor. Options: shared core lib, gradual convergence, or federated with **governance** (lint, reporting schema, PR standards). Avoid mandate without pilot data.

**Q: How do you influence without authority?**  
A: Data (flake, escapes, CI time), pilot on willing squad, **make dev life easier** (fast feedback, good traces), executive sponsor for gates, celebrate wins publicly.

**Q: Dev team wants to delete all E2E tests — response?**  
A: Understand pain (slow, flaky). Propose **API + contract** replacement for setup-heavy UI; keep **thin critical path E2E**. Show cost of last prod escape. Co-create pyramid target.

---

## 3. Hiring & team building

**Q: What do you look for when hiring SDET III / Senior?**  
A: **Coding** (medium comfort), **debugging**, **system design** for testability, **communication**, ownership. Not “Selenium API trivia.” Live exercise: read a failure trace + propose fix.

**Q: How do you interview for Lead SDET?**  
A: Framework whiteboard, system design (test runner), behavioral on **multi-team conflict**, roadmap exercise, **metrics they’ve moved**.

**Q: Weak performer on team — steps?**  
A: Clear expectations, specific feedback, 30/60/90 plan, pair with strong IC, document, involve HR if no progress. Balance **empathy + standards**.

**Q: How do you grow ICs toward senior?**  
A: Ownership of subsystem (reporting, parallel infra), **design docs**, mentee, present to eng org, lead flake initiative with metric.

---

## 4. Metrics & executive communication

**Q: What quality metrics do you report to leadership?**  
A: **Escaped defect rate** (by severity), **customer-impacting incidents** tied to test gaps, **CI time / cost**, **flake %**, **coverage of critical journeys** (not line % alone), **release frequency** vs rollback rate.

**Q: How explain quality to a non-technical VP in 2 minutes?**  
A: “We prevent revenue-impacting bugs before customers see them. Last quarter: **X% fewer P0 escapes**, **Y min faster** feedback on PRs, **$Z saved** in manual regression. Top risk now: mobile payment — here’s the plan.”

**Q: Quality is blocking releases — turnaround plan?**  
A: Week 1: triage + quarantine + stop bleed. Week 2–4: top flake root causes, smoke gate, parallel investment. Communicate **weekly** to execs with trend chart. Postmortem culture, not blame.

---

## 5. CI/CD & platform leadership

**Q: Main branch red 3 days — leader’s playbook?**  
A: Incident commander, categorize (product vs infra vs flake), **stop merges or revert**, daily standup, P0 tests first, comms to stakeholders, postmortem with **preventive action owners**.

**Q: How decide build vs buy (BrowserStack vs own grid)?**  
A: TCO: licenses, ops headcount, compliance, device matrix needs. Pilot both, measure **$/test minute** and **queue wait**. Lead documents decision matrix.

**Q: Security says no prod-like data in tests — org-wide policy?**  
A: Synthetic factories, anonymized subsets, secrets in vault, scan reports for PII, training for SDETs + devs, CI check for forbidden patterns.

---

## 6. Conflict & backbone

**Q: Disagreed with engineering director — example structure?**  
A: STAR with **data**, alternatives, recommendation, eventual **commit** after decision even if not your first choice.

**Q: PM wants to ship with known test gaps.**  
A: Document risk, severity, customer segment, **mitigation** (monitoring, feature flag, hotfix plan), get explicit sign-off, schedule sprint+1 coverage.

**Q: Two senior ICs disagree on framework direction.**  
A: Facilitate RFC, time-boxed POC, decision criteria upfront, pick and **commit** — no endless debate.

---

## 7. Innovation & AI (Lead angle)

**Q: Should the org adopt AI for test generation?**  
A: Pilot with **guardrails**: human review, compile/run gate, no prod secrets, eval set for regression on prompts. Measure **acceptance rate** and **time saved** — not hype. See [ai-sdet INTERVIEW-QA](../ai-sdet/INTERVIEW-QA.md).

**Q: How prevent AI automation from creating tech debt?**  
A: Same standards as human code — review, lint, ownership, delete bad tests, don’t merge unreviewed bulk codegen.

---

## 8. Apple-specific leadership angles

**Q: How do you uphold craft at scale?**  
A: Definition of Done includes testability; design review participation; **attention to edge cases** (accessibility, localization); quality as product feature.

**Q: Influence across functions (design, PM, eng)?**  
A: Shared quality goals in planning, **risk-based test plans** visible to PM, demo failures in terms of **user impact**.

---

## 9. Questions you should ask (Lead)

- How is quality measured today? Escaped defect rate?  
- Ratio of SDET to dev? Embedded or central?  
- Biggest pain: flake, CI time, mobile, microservices?  
- Lead expectation: people management vs technical lead?  
- Budget for grid/devices/cloud testing?  
- AI/automation investment appetite?

---

## 10. Self-check (Lead loop)

- [ ] 3 stories with **org-wide** impact (not single test fix)  
- [ ] 1 hiring or mentoring story  
- [ ] 1 hard trade-off (speed vs quality) with exec visibility  
- [ ] 1 roadmap you can whiteboard in 5 min  
- [ ] Metrics vocabulary ready for VP conversation  

Technical: [system-design INTERVIEW-QA](../system-design/INTERVIEW-QA.md) · [framework INTERVIEW-QA](../framework-design/INTERVIEW-QA.md)
