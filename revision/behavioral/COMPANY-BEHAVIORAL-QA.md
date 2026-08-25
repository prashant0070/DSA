# Company-specific behavioral Q&A

**Amazon · Apple · Google · Microsoft · Meta** — how behavioral loops differ and what to emphasize.

**Prepare with:** [STAR-GUIDE.md](STAR-GUIDE.md) · [BEHAVIORAL-QA.md](../framework-design/BEHAVIORAL-QA.md) · [LEADERSHIP-QA.md](LEADERSHIP-QA.md)

---

## Amazon — Leadership Principles (deep)

Amazon loops are **LP-driven**. Expect **2–3 follow-ups** per story (“What data did you use?” “What if you were wrong?”).

| LP | What they probe | Strong SDET story angle |
| --- | --- | --- |
| **Customer Obsession** | End-user impact | Test design from customer journey; bug that affected buyers/sellers |
| **Ownership** | Beyond your job description | Fixed CI no one owned; on-call for test infra |
| **Invent and Simplify** | Removed complexity | One framework replaced three; API replaced slow UI |
| **Are Right, A Lot** | Judgment with data | Chose contract tests over 200 UI tests — escapes dropped |
| **Learn and Be Curious** | Self-taught tool | Playwright/Kafka/testcontainers adoption |
| **Insist on Highest Standards** | Raised bar | Blocked release; PR quality gate; no sleep policy |
| **Bias for Action** | Speed with risk awareness | Smoke pipeline in 1 week; imperfect but shippable |
| **Dive Deep** | Root cause | Flake RCA to race condition in async API |
| **Deliver Results** | Metrics | CI time, flake %, escape rate |
| **Earn Trust** | Humility + credibility | Admitted miss; fixed process; dev advocates |
| **Have Backbone; Disagree and Commit** | Pushback then support | Disagreed on skipping tests; committed after decision |
| **Think Big** | Scale vision | 10k parallel test platform proposal |

### Amazon follow-up drill (practice aloud)

**Q: Tell me about a time you Dive Deep on a quality issue.**  
→ Flake or prod escape → instrumentation → root cause → systemic fix → metric.

**Q: Ownership when automation was nobody’s job.**  
→ You claimed CI health → dashboard → SLA → trained others.

**Q: Bias for Action under deadline.**  
→ Scoped **minimum quality bar** → shipped → filled gaps sprint+1.

**Q: Customer Obsession in testing.**  
→ Mapped tests to **seller/buyer** flows, not only admin pages.

**Q: Think Big for test infrastructure.**  
→ Sharded runners, device farm, self-service env — tie to [system-design](../system-design/NOTES.md).

---

## Apple — behavioral angles

Apple often uses **less formal LP naming** but probes similar themes: **craft, secrecy discipline, cross-functional influence, quality as product**.

| Theme | Example question | Answer emphasis |
| --- | --- | --- |
| **Craft / detail** | Time you caught subtle UX or quality issue | Precision, user-visible polish, accessibility |
| **Collaboration** | Worked with design / PM under tight launch | Respect for Apple process, quality without blocking craft |
| **Influence** | Changed how team thinks about quality | Data + demo, not policy memo |
| **Failure** | Missed something — what changed | Own it; process fix; no blame |
| **Learning** | New domain (iOS, hardware, services) | XCTest, device matrix, beta feedback loops |

**Q: Why Apple?**  
→ Quality is the product; you want to work where **craft and reliability** are valued; tie to your depth in automation + risk-based testing.

**Q: How test without prod-like data?**  
→ Synthetic data, anonymization, simulator strategy — Apple privacy sensitivity.

**Q: iOS vs web automation experience?**  
→ Honest: Appium/XCUITest learning path; transfer from stable locator strategy and parallel CI mindset.

---

## Google — SET / SDET behavioral

| Theme | Question | Angle |
| --- | --- | --- |
| **Googliness** | Ambiguity, collaboration | RFC culture; data-driven debate |
| **Technical depth** | Hard debugging story | Trace, log, bisect, minimal repro |
| **Scale** | Testing at large codebase | Test impact analysis, hermetic tests, TAP-style CI |
| **Code quality** | You improved dev test culture | Reviewed unit tests; taught devs flake patterns |

**Q: How do you prioritize tests with infinite possible cases?**  
→ Equivalence classes, risk matrix, coverage of **critical surfaces**, property-based for parsers.

---

## Microsoft — quality / Azure angle

| Theme | Question | Angle |
| --- | --- | --- |
| **Growth mindset** | Learned new stack | Azure DevOps, .NET ecosystem if relevant |
| **Enterprise** | Compliance, regions, scale | Multi-tenant test data, geo testing |
| **Partnership** | Dev + PM alignment | Quality bars in Azure-style release trains |

---

## Meta — move fast with quality

| Theme | Question | Angle |
| --- | --- | --- |
| **Speed** | Quality vs ship fast | Tiered gates; experiment monitoring |
| **Scale** | Mobile + web | Device lab; feature flag testing |
| **Impact** | Metric you moved | DAU-impacting bug prevented |

---

## Cross-company scenario questions

**Q: 40% flake rate — fix in 30 days?**  
Week 1: measure, quarantine, stop merge chaos. Week 2: top 10 RCA. Week 3: locator/API policy with dev. Week 4: re-enable; track trend. **Lead owns communication.**

**Q: Zero automation on legacy app?**  
Characterize app → critical path smoke → API where possible → one squad pilot → framework skeleton → expand.

**Q: Security / compliance blocks test data?**  
Synthetic factories, vault secrets, PII scanners in CI artifacts, legal review for datasets.

**Q: Remote / distributed team quality?**  
Async RFCs, recorded demos, shared dashboards, overlap hours for war rooms, clear CI ownership.

---

## Map your 8 stories → companies

| Story # | Amazon LP | Apple | Google | Lead? |
| --- | --- | --- | --- | --- |
| 1 Framework | Invent | Craft | Scale | ✓ |
| 2 Flake fix | Dive Deep | Craft | Debug | |
| 3 CI scale | Deliver | Influence | Scale | ✓ |
| 4 Prod escape | Ownership | Failure | Depth | |
| 5 Disagreement | Backbone | Influence | Data | |
| 6 Mentor | Earn Trust | Collaboration | Googliness | ✓ |
| 7 AI / innovation | Learn | — | Tech | ✓ |
| 8 Customer bug | Customer Obsession | Craft | Impact | |

Fill from [STAR-GUIDE.md](STAR-GUIDE.md) worksheet.

---

## Bar Raiser / senior interviewer signals

They listen for:

- **Scope** — team vs org impact at Lead level  
- **Trade-offs** — what you cut and why  
- **Failure recovery** — not only wins  
- **Data** — not feelings alone  
- **Customer** — who suffered if quality failed  

Red flags: victim narrative, no metrics, “QA vs dev” tribalism.

Next: [GAPS-QA.md](GAPS-QA.md) · [ai-sdet INTERVIEW-QA](../ai-sdet/INTERVIEW-QA.md)
