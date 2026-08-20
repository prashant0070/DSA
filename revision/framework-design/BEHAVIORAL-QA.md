# Framework & quality — behavioral interview Q&A

**Format:** STAR — **S**ituation, **T**ask, **A**ction, **R**esult (quantify when possible).  
**Target:** SDET, Senior SDET, Lead SDET at product companies (Amazon, Google, Microsoft, Flipkart, Uber, etc.).

Prepare **8–10 master stories** and map each to multiple questions below. Do not memorize 40 separate anecdotes.

---

## How to answer (product company bar)

1. **60 seconds max** for the story core — interviewer will drill in.  
2. **You** did the work — use “I,” not “we” for your actions (credit team in Result).  
3. **Trade-offs** — what you chose *not* to do.  
4. **Metrics** — flake % down, runtime down, escaped bugs down, team adoption up.  
5. **Leadership** — even SDET II stories show ownership beyond your ticket.

---

## Master story bank (build these from your resume)

Fill each slot with a **real** project. Examples of themes that fit automation/framework work:

| # | Theme | Example hook |
| --- | --- | --- |
| 1 | **Built or rebuilt framework** | Playwright migration, unified API+UI repo |
| 2 | **Fixed flaky suite / quality crisis** | 15% flake → &lt;2%, restored trust in CI |
| 3 | **Scaled parallel CI** | 6h → 45 min nightly via sharding + grid |
| 4 | **Production incident / escaped defect** | Missed bug → added guardrail tests |
| 5 | **Disagreement / pushback** | Dev wanted sleep; you drove test-id policy |
| 6 | **Mentored / led without authority** | Coached 4 QAs on POM + code review |
| 7 | **Tight deadline / bias for action** | Release in 2 weeks; scoped smoke vs full |
| 8 | **Customer obsession** | Test covered real user payment flow gap |
| 9 | **AI / innovation** | AI-assisted test gen or your automation tool |
| 10 | **Cross-team / stakeholder** | Partnered with DevOps for Docker grid |

---

## Amazon Leadership Principles (map your stories)

| LP | Framework/quality angle | Story # |
| --- | --- | --- |
| Customer Obsession | Tests mirror real user journeys; found checkout bug affecting sellers | |
| Ownership | Owned flake budget end-to-end; no blame to “environment” | |
| Invent and Simplify | Replaced 3 legacy frameworks with one Playwright stack | |
| Are Right, A Lot | Data showed API tests cheaper; shifted pyramid | |
| Learn and Be Curious | Learned Playwright trace/Kafka testing for microservices | |
| Insist on Highest Standards | Blocked release until P0 paths green; raised bar on PR checks | |
| Bias for Action | Shipped smoke pipeline in 1 week before full migration | |
| Dive Deep | RCA’d flaky test to race in async inventory API | |
| Deliver Results | Cut regression time 70%; zero P0 escapes next quarter | |
| Earn Trust | Dev skeptics → advocates after you fixed their flaky area | |
| Have Backbone; Disagree and Commit | Pushed back on skipping automation; committed after decision | |
| Think Big | Proposed distributed test platform for 10k tests | |

---

## SDET level (individual contributor)

**Q: Tell me about a time you improved an automation framework.**  
STAR prompt: What was broken (maintenance, flake, slow)? What layer did you change (POM, waits, CI)? Result metrics?

**Q: Describe a difficult bug you found through automation.**  
Not “I ran tests” — how you **designed** the test to catch it, why manual missed it.

**Q: Tell me about a flaky test you fixed.**  
Root cause (timing, data, locator, env). Fix (not sleep). Prevention (lint rule, docs, pair with dev on test-id).

**Q: Time you had to learn a new tool quickly.**  
Playwright/Appium/Kafka — how you learned, what you shipped in 30 days.

**Q: How do you prioritize what to automate?**  
Risk × frequency × cost. Critical paths, regression-prone areas, manual bottleneck. Say no to low-value UI.

**Q: Conflict with a developer who said “QA can test manually.”**  
Data (escape rate, CI time), propose hybrid, pilot on one squad, results.

**Q: Missed a bug — what happened?**  
Own it. Gap analysis. Test added. Process change (review checklist, contract test).

**Q: Write vs maintain balance?**  
Framework investment vs feature tests; refactor budget; definition of done for test PRs.

---

## Senior SDET level

**Q: Design decision you made that affected multiple teams.**  
Standards (locator policy, folder structure, reporting). Adoption plan. Training. Metrics.

**Q: Led framework migration (e.g. Selenium → Playwright).**  
Phased rollout, compatibility layer, don’t block features, training, measure dev time saved.

**Q: How did you reduce CI time significantly?**  
Sharding, parallel, remove redundant E2E, API instead of UI where possible, test impact analysis.

**Q: Thread-safety / parallel issue you solved.**  
Static driver, shared user, file collision — technical depth + outcome.

**Q: Mentored junior SDETs — example.**  
Code review habits, pairing, doc, raised quality of their PRs (before/after).

**Q: Pushback from management to skip testing for deadline.**  
Risk articulation, minimum bar (smoke + P0), what you deferred vs cut entirely, post-release plan.

**Q: Microservices testing approach you drove.**  
Contract tests, API integration, selective E2E, test containers, Kafka assert pattern.

**Q: Performance testing involvement.**  
Locust/JMeter story; found bottleneck; worked with dev on fix; SLA gate.

**Q: How you measure quality on your team.**  
Flake rate, pass rate trend, coverage of critical paths, escaped defects, MTTR for broken main.

---

## Lead SDET level

**Q: Built quality strategy for a product/org.**  
Test pyramid, ownership model (who writes what), CI gates, release criteria, flake SLA.

**Q: Hiring — what do you look for in an SDET?**  
Coding, debugging, system thinking, collaboration — not “knows Selenium API.”

**Q: Disagreed with engineering director on tooling budget.**  
Build vs buy (grid, cloud, ReportPortal). ROI, TCO, pilot, decision.

**Q: Two teams, two frameworks — what do you do?**  
Conway’s law; converge on shared libs vs mandate one stack; governance without blocking.

**Q: Quality was blocking releases — your turnaround.**  
Assessment week, quarantine flake, smoke gate, parallel investment, communicate to execs.

**Q: How do you handle underperforming team member?**  
Specific feedback, plan, pair, document, escalate if needed — empathy + standards.

**Q: Present quality to executives (non-technical).**  
Escaped defects, customer impact, time to release, cost of downtime — not “we ran 5000 tests.”

**Q: Roadmap for test platform (12 months).**  
Distributed execution, self-service env, reporting portal, AI assist (your tool), mobile lab.

**Q: Diversity of tech stack — web, mobile, API, ML feature.**  
Organize squads vs platform team; shared config/reporting; specialists where needed.

**Q: When would you **not** automate?**  
One-off, unstable UI, cheaper manual exploratory, prototype — show judgment.

---

## Scenario questions (no STAR — think on feet)

**Q: Main branch red for 3 days — your move?**  
Triage owner, stop merges or revert, daily war room, categorize failures (product vs infra vs flake), fix P0 first, postmortem.

**Q: Dev removed all data-testids — response?**  
Partner with EM; quality gate in Definition of Done; show flake/maintenance data; offer pair session.

**Q: 40% flake rate on nightly — fix in 30 days?**  
Week 1 measure/quarantine; week 2 top 10 root cause; policy (no sleep); week 3 dev test-id; week 4 re-enable; track %.

**Q: Zero automation on legacy app — start how?**  
Critical path smoke API+UI, characterize app, don’t boil ocean, framework skeleton first, one squad pilot.

**Q: Security says no prod-like data in tests — adapt?**  
Synthetic data, anonymized subset, factory, no PII in reports, secrets in vault.

---

## Questions **you** should ask (Senior/Lead)

- How is quality org structured (centralized SDET vs embedded)?  
- What is current CI time, flake rate, escaped defect rate?  
- Web vs mobile vs API split? Own services or monolith?  
- Release cadence and quality gates?  
- Build vs buy for device/grid?  
- Role expectation: IC vs lead track in 12 months?

---

## Red flags interviewers hear (avoid)

- “I only execute manual test cases.”  
- “Flaky tests are normal.”  
- “We use sleep everywhere.”  
- “Automation is QA’s job only.”  
- Blame dev/environment with no ownership.  
- No metrics in results.  
- Can’t explain framework layers.

---

## 30-second elevator (framework strength)

> “I design test systems, not just scripts — layered frameworks for web, mobile, and API with parallel CI, isolated test data, and trace-based debugging. I've cut regression time and flake rates by driving stable locators, API-first setup, and shared reporting. At senior level I also mentor and set standards across squads.”

Customize with your numbers and tools (Playwright, Appium, Rest Assured, Locust, Jenkins).

---

## Revision checklist before interview

- [ ] 8–10 STAR stories written (1 page each, bullet form)  
- [ ] Each story has **one metric**  
- [ ] Map stories to Amazon LPs (or company values)  
- [ ] One framework whiteboard from [NOTES.md](NOTES.md)  
- [ ] One flake RCA + one scale story rehearsed aloud  
- [ ] 3 questions prepared for interviewer  

Technical depth: [INTERVIEW-QA.md](INTERVIEW-QA.md) · Patterns: [design-patterns](../design-patterns/INTERVIEW-QA.md)
