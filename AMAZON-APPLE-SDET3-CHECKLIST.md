# Amazon & Apple — SDET III / Lead prep checklist

**Goal:** Close every gap between *this repo* and a competitive loop at **Amazon SDET III+** or **Apple SDET III / Lead SDET**.  
**Time:** 8–12 weeks focused (more if part-time).  
**Rule:** Reading notes ≠ ready. You pass when you **implement**, **mock**, and **tell stories**.

**Quick links:** [Coding Q&A](practice/CODING-INTERVIEW-QA.md) · [Easy](practice/easy/README.md) · [Medium](practice/medium/README.md) · [Advanced](practice/advanced/README.md) · [System design](revision/system-design/) · [Behavioral index](revision/behavioral/) · [AI automation Q&A](revision/ai-sdet/INTERVIEW-QA.md)

---

## Honest bar (what “enough” means)

| Level | Coding | Automation / design | Behavioral |
| --- | --- | --- | --- |
| **SDET II** | All easy + ~15 medium under time | Framework layers + 1 whiteboard | 5 STAR stories |
| **SDET III (Amazon)** | ~60 medium + ~10 advanced timed | 3 system designs + CI/parallel depth | 8 stories + LP map |
| **Lead SDET** | Medium fluency; advanced for signal | Test platform HLD + roadmap + metrics | Org-level LP / leadership stories |
| **Apple SDET III+** | Medium (sometimes lighter than Amazon) | Quality strategy + release risk | Influence + cross-functional STAR |

This repo gives you the **map**. You still need **execution** below.

---

## Phase 0 — Baseline (Week 0, 3–5 hours)

Do once before the 12-week plan.

- [ ] JDK 17+ installed; compile one easy + one medium stub
- [ ] Read [CURRICULUM.md](CURRICULUM.md) and this checklist
- [ ] Skim [practice/CODING-INTERVIEW-QA.md](practice/CODING-INTERVIEW-QA.md) § Amazon vs Apple
- [ ] List **your** 3 strongest automation projects (company, scale, tools)
- [ ] Pick primary stack for mocks: **Playwright** or **Selenium** + **Rest Assured**

**Exit:** You know your weak axis (coding vs design vs behavioral).

---

## Weeks 1–4 — Foundations + easy completion

| Week | Coding | Theory | Automation / design | Behavioral |
| --- | --- | --- | --- | --- |
| **1** | Easy #1–25 (arrays, hash, strings) | [01-java-fundamentals](01-java-fundamentals/NOTES.md) + [STRINGS](01-java-fundamentals/STRINGS.md) | [framework-design NOTES](revision/framework-design/NOTES.md) §1–3 | Draft 2 STAR stories (conflict, ownership) |
| **2** | Easy #26–50 (two ptr, stack, LL) | [COLLECTIONS](01-java-fundamentals/COLLECTIONS.md) + [02-complexity](02-complexity/NOTES.md) | [design-patterns](revision/design-patterns/NOTES.md) | Draft 2 more (flake fix, CI improvement) |
| **3** | Easy #51–75 (trees, graph easy, DP easy) | [03-dsa-patterns](03-dsa-patterns/NOTES.md) | [api-http](revision/api-http/NOTES.md) + [sql](revision/sql/NOTES.md) | [STAR-GUIDE](revision/behavioral/STAR-GUIDE.md) + map LPs in [COMPANY-BEHAVIORAL](revision/behavioral/COMPANY-BEHAVIORAL-QA.md) |
| **4** | Medium #1–8 (Kadane, window, 3Sum…) | [01-linear-structures](01-linear-structures/NOTES.md) problems | [automation/Playwright](revision/automation/) | 1 behavioral mock (30 min) |

**Weekly minimum:** 5 coding days × 1–2 problems; 1 revision day; 1 mock or review day.

**Exit Week 4:** All easy done or ≥90%; 8 medium done; can explain Big-O on any easy solution.

---

## Weeks 5–8 — Medium core (Amazon coding bar)

| Week | Coding | Theory | Automation / design | Behavioral |
| --- | --- | --- | --- | --- |
| **5** | Medium #9–16 (BS, intervals, islands, trees) | [03-dsa-patterns](03-dsa-patterns/NOTES.md) graphs/heaps | [system-design PRACTICE](revision/system-design/PRACTICE.md) **A1–A2** | LP: Customer Obsession + Dive Deep |
| **6** | Medium #17–25 (DP, trie, topo, matrix) | [INTERVIEW-QA java](01-java-fundamentals/INTERVIEW-QA.md) aloud | **B1 B2** device farm / runner | LP: Ownership + Invent and Simplify |
| **7** | Re-do 5 weakest medium **timed 35 min** | [OOP INTERVIEW-QA](00-oop-foundations/INTERVIEW-QA.md) | **C1 C2** flake / reporting platform | LP: Bias for Action + Deliver Results |
| **8** | Advanced #1–10 (see [advanced README](practice/advanced/README.md)) | Phase 1 stack/queue problems | Full **45 min** framework whiteboard | Full behavioral mock 45 min |

**Exit Week 8:** 25 medium complete; 10 advanced started; 2 system designs done aloud with timer.

---

## Weeks 9–12 — Advanced + company mocks

| Week | Coding | Automation / design | Behavioral / Lead |
| --- | --- | --- | --- |
| **9** | Advanced #11–20 | [AUTOMATION-DESIGN](revision/system-design/AUTOMATION-DESIGN.md) + **D1 D2** | Lead story: roadmap / multi-team standard |
| **10** | 2× **full coding mocks** (45 min, medium + follow-up) | [LLD](revision/system-design/LLD.md) thread-safe driver factory | Amazon Bar Raiser style deep dive |
| **11** | [CODING-INTERVIEW-QA](practice/CODING-INTERVIEW-QA.md) — answer all § pattern drills | [ai-sdet INTERVIEW-QA](revision/ai-sdet/INTERVIEW-QA.md) + [LEADERSHIP-QA](revision/behavioral/LEADERSHIP-QA.md) | Apple: [COMPANY-BEHAVIORAL](revision/behavioral/COMPANY-BEHAVIORAL-QA.md) § Apple |
| **12** | Mixed review: 1 easy + 1 medium + 1 advanced per day × 3 | Mock: “12-month test platform roadmap” (Lead) | Mock: questions **you** ask interviewer |

**Exit Week 12:** Ready to schedule loops (not “perfect” — **consistent** under time).

---

## Amazon-specific checklist

### Coding (often SDE II–like)

- [ ] Arrays / strings / hash — fluent without hints
- [ ] Trees BFS/DFS + BST validation
- [ ] Graphs: islands, BFS shortest path, topo sort
- [ ] Heap: top-K, merge k lists
- [ ] DP: 1D (coin change, decode ways), 2D (unique paths)
- [ ] Sliding window variable (min window substring)
- [ ] Design: LRU, min stack (medium/advanced in repo)
- [ ] Always state **time, space, edge cases** before coding
- [ ] Practice on **paper or whiteboard** (not only IDE)

### Automation / technical

- [ ] Draw 6-layer framework from memory ([framework-design](revision/framework-design/NOTES.md))
- [ ] Parallel execution: ThreadLocal vs instance driver — trade-offs
- [ ] Flake handling: quarantine, retry policy, root-cause taxonomy
- [ ] CI: PR gate vs nightly; shard strategy; artifact retention
- [ ] API + UI + mobile in one architecture diagram

### System design (SDET III / Lead)

- [ ] Distributed test runner (10k tests, 15 min SLA)
- [ ] Device / browser grid + queue + worker claim
- [ ] Test result store + flake analytics + dashboard
- [ ] Back-of-envelope: workers, queue depth, storage per run

### Behavioral (Leadership Principles)

- [ ] 8–10 STAR stories ([BEHAVIORAL-QA](revision/framework-design/BEHAVIORAL-QA.md))
- [ ] Each story: **Situation → Task → Action → Result → metric**
- [ ] 2 stories with **failure + learning**
- [ ] 1 story: **disagreed with manager/PM, data-driven outcome**
- [ ] 1 story: ** mentored / raised bar on another team**

---

## Apple-specific checklist

### Coding

- [ ] Same medium core as above (Apple sometimes 1 round lighter)
- [ ] Clean Java; talk through trade-offs calmly
- [ ] Less emphasis on hardest DP; still know trees/graphs/window

### Quality & strategy (Apple signal)

- [ ] Release quality: risk-based testing, what ships vs what blocks
- [ ] Automation ROI: what you **stopped** automating and why
- [ ] Flaky tests impact on release velocity — your metric
- [ ] Cross-functional: dev / PM / design quality partnership

### Apple platform gap (if targeting iOS/macOS teams)

- [ ] XCTest / XCUITest basics (not fully in repo — study separately)
- [ ] Simulator vs device CI; TestFlight pipeline awareness
- [ ] One sentence on how your web/API automation **transfers** to Apple quality mindset

### Behavioral

- [ ] Influence without authority
- [ ] Deep ownership of quality in a large org
- [ ] Craft / attention to detail (specific bug or UX quality catch)

---

## Mock interview schedule (repeat every week from Week 5)

| Day | Activity | Duration |
| --- | --- | --- |
| Mon–Thu | Implement 1–2 problems + explain aloud | 60–90 min |
| Fri | Re-read one INTERVIEW-QA section + flashcards | 45 min |
| Sat | **One timed mock** (rotate: coding / design / behavioral) | 45–60 min |
| Sun | Review failures; update “weak patterns” list | 30 min |

### Mock rotation

| Week mod 3 | Saturday mock |
| --- | --- |
| 0 | Coding: random medium, 35 min, no autocomplete |
| 1 | Design: pick from [PRACTICE.md](revision/system-design/PRACTICE.md) |
| 2 | Behavioral: 3 LPs with follow-ups |

---

## Problem counts (targets)

| Track | In repo | Your target before loop |
| --- | --- | --- |
| Easy | 75 | **75 done** |
| Medium | 25 | **25 done** + **35 more** (LeetCode/neetcode) |
| Advanced | 20 | **15 done** |
| **Total unique** | 120 | **~150+** with extras outside repo |

Extra problems outside repo (company tagged): focus **Amazon** arrays, trees, graphs, heap, window, DP. Apple: overlap + quality of explanation.

---

## Portfolio (not in repo — you build)

Lead loops expect **evidence**, not only notes.

- [ ] One **public or interview-ready** framework repo (layers, CI, parallel, reporting)
- [ ] README with: stack, scale (# tests, runtime, flake rate before/after)
- [ ] 2-minute verbal pitch: problem → architecture → outcome

---

## Weak-pattern tracker (fill as you go)

| Pattern | Confidence 1–5 | Repo problems | Extra needed |
| --- | --- | --- | --- |
| Sliding window variable | | LongestSubstring, MinWindow | |
| Graph BFS/DFS | | NumberOfIslands, WordLadder | |
| DP 1D | | CoinChange, WordBreak | |
| DP 2D | | UniquePaths | |
| Heap / top-K | | TopKFrequent, MergeKLists | |
| Backtracking | | Subsets, Permutations, WordSearch | |
| Tree advanced | | LCA, MaxPathSum | |
| Design | | LRUCache, SerializeBT | |

---

## Day-before loop

- [ ] Sleep; no new hard topics
- [ ] Review your **2-minute** framework pitch + **1** system design outline
- [ ] Re-read LP story titles only (not memorize scripts)
- [ ] One easy warm-up (TwoSum-level) for confidence

---

## Related files in this repo

| File | Purpose |
| --- | --- |
| [revision/behavioral/](revision/behavioral/) | STAR, Leadership, Company LPs, CI/perf/security gaps |
| [practice/CODING-INTERVIEW-QA.md](practice/CODING-INTERVIEW-QA.md) | FAANG coding questions + how to answer |
| [practice/advanced/README.md](practice/advanced/README.md) | SDET III / Amazon-level hard stubs |
| [revision/framework-design/BEHAVIORAL-QA.md](revision/framework-design/BEHAVIORAL-QA.md) | STAR + Amazon LPs |
| [revision/system-design/PRACTICE.md](revision/system-design/PRACTICE.md) | Timed design prompts |

**Start today:** [START.md](START.md) if still in Phase 1; otherwise Week 1 row above.
