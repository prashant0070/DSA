# Company Loops (Apple, Google, Microsoft, Meta) & JD-Derived Questions

Amazon already has a full LP bank in `03-amazon-leadership-principles.md`. This file is the **other four** company styles plus the “tell me about a time you…” questions that **job descriptions imply but never write as interview prompts**. Use the mapping table to prep from a pasted JD in an hour: highlight their bullets, jump to the Q numbers, speak the STARs, then swap every metric for yours. Never invent numbers in a live interview.

Company loops share bones (conflict, impact, learning) but **score different nouns**. Apple: craft, user, collaboration with design. Google: ambiguity, data, scale, RFC. Microsoft: growth mindset, inclusion, customer-support escalations, enterprise. Meta: speed, flags, week-one impact. Speak ninety seconds. They will interrupt.

## JD bullet → questions to prep

| JD phrase (paste from the posting) | Prep these Qs first |
| --- | --- |
| Build / design test automation frameworks from scratch | Q8, also file 01 Q6, file 03 Q3 |
| Integrate tests with CI/CD; reduce execution / feedback time | Q9, file 01 Q8 |
| API + UI + mobile + database validation | Q10 |
| Agile / scrum; planning and refinement | Q11 |
| Mentor engineers; quality culture | Q12, file 02 Q10 |
| Cloud, Docker, Kubernetes, device farm | Q13, file 03 Q10 |
| AI / LLM / GenAI in QA | Q14 |
| Cross-functional; PM, design, developers | Q3, Q6, file 02 |
| Fast-paced; ambiguous requirements | Q4, Q7, file 02 Q6 |
| Production quality; customer impact; observability | Q2, Q6, file 01 Q12 |

### Q1. Why this company? (templates for Apple / Google / Microsoft / Meta / product startup)

**Maps to** — Motivation; bar-raiser “why us”; JD: “passion for X’s products.” Not STAR. Forty-five seconds, then a pointer to one story they can pull.

**Interview answer (spoken templates — pick one, fill the blanks with inspectable facts)**

**Apple:** “I want to work where quality is the product, not a phase. Apple’s hardware-software loop means a checkout or wallet defect is a **craft** defect — receipt, VoiceOver, Dynamic Type — not only an HTTP 500. I have blocked launches on receipt/tax mismatches and on VoiceOver skipping amount due when axe was green. I want a team that treats that as the job. I am not here because I like phones; I am here because I want my quality bar judged by **user-perceived integrity**.”

**Google:** “I want SET work where tests are software at codebase scale: hermetic tests, impact analysis, data in the argument. I have used SEV tables to kill a 200-UI-test plan and RFCs to land a shard library. I want to be in a culture that expects that document. The team’s problem space in the JD — [ads/search/cloud/youtube] — is a scale and ambiguity problem, not a Selenium problem.”

**Microsoft:** “I want to work on quality that survives **enterprise and inclusion** constraints: regions, accessibility, support escalations, growth mindset when the stack changes. I have sat with support on refund-mismatch macros and ramped a junior without lowering the linter. Azure-style release trains match how I already think about gates: P0 vs nightly vs residual risk.”

**Meta:** “I want to move fast on a money or integrity path without pretending flags are a substitute for invariants. I shipped BNPL in ten days with four invariants and a 5 percent flag, then filled gaps. Week one I would map kill switches and experiment metrics, not rewrite your framework. The JD’s [ads/integrity/checkout] surface is where speed without a bar becomes a headline.”

**Product startup:** “I want a thinner org where an SDET still owns CI, data, and the customer invariant. I have claimed unowned pipelines and hybrid-farm cost. I am not looking for a 12-layer QA department. I want the trade-off of wearing more hats for faster learning, and I will say no to 100 percent UI automation when the oracle is an API.”

**Deep follow-through**

- Why this works: each template names **their scoring noun** and points at a story you can actually tell. Generic “innovation and customers” fails all five.
- Alternate framing: “Why leave your company?” — pull toward their noun, never dump on your employer.
- SDET II vs Lead: II’s why is craft/scale learning. Lead’s why is org-level quality strategy and hiring bar.

**Cross-questions they will ask**

- **What would you do differently?** Name a **specific** team artifact (talk, paper, product behavior you tested as a user) the night before.
- **What was your mistake in past answers?** “I love the brand.” It invites “so does everyone.”
- **How do you know this is not just prestige?** I can map two stories onto their nouns without renaming LPs on the fly.
- **What did your manager think of you targeting X?** Be honest: they know you want platform or craft scope.
- **What if you do not get this team?** Adjacent problem space, same company bar. Not “any team.”
- **Amazon poke (if they ask why not Amazon):** Do not trash. “LP loops are a fit; this team’s [craft/scale/speed] is the closer.”

**Anti-patterns**

- Reciting values from the careers page.
- Why-startup: “I want equity” as the whole answer.
- Why-Apple: secrecy jokes or fanboy hardware lists.

**One-liner cue** — Match their noun: craft, RFC, inclusion, flags, hats.

### Q2. Apple: craft / detail — a subtle quality issue you caught

**Maps to** — Apple craft; Customer Obsession; JD: “high quality bar,” “attention to detail.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Wallet iOS was “axe clean” in CI. Manual had signed happy-path capture. In a freeze week I ran VoiceOver on a physical device and the **amount due was skipped**; the Pay button announced as “button.” A buyer with VoiceOver would confirm a payment without hearing the amount. That is an Apple-shaped bug: the API was correct, the **experience** was not.
- **Task:** I was responsible for treating this as launch-blocking craft, not as “a11y follow-up,” and for leaving a regression that CI could hold without pretending axe equals VoiceOver.
- **Action:**
  - I recorded the VoiceOver pass on a real iPhone, with the exact utterance missing, and I reproduced on a second device.
  - I wrote the bug as a user story: “I cannot independently confirm how much I am about to pay.” I did not write “accessibility non-compliance.”
  - I blocked the freeze for wallet iOS until the `accessibilityLabel` on amount due and Pay included the formatted total.
  - I added a snapshot/unit check on the label string in the iOS target plus one device-farm smoke that asserts the accessibility identifier tree — still not VoiceOver, which I said out loud in go/no-go.
  - I scheduled a recurring VoiceOver charter each release so craft did not depend on me remembering.
- **Result:** The label shipped before the event; we did not call axe-green “done.” I learned Apple-style quality is **the announcement matching the receipt**, and that automation must be honest about what it cannot hear.

**Deep follow-through**

- Why this story works: Apple interviewers listen for user language, hardware, and humility about tools.
- Alternate framing: one-cent refund display vs ledger (file 02 Q2); RTL copy; Dynamic Type truncation on Pay.
- SDET II vs Lead: II files a11y. Senior blocks a freeze. Lead funds charters and platform a11y smokes.

**Cross-questions they will ask**

- **What would you do differently?** VoiceOver in the test plan before freeze, not during.
- **What was your mistake?** Telling a PM “axe in CI covers a11y.” I walked that back publicly.
- **How do you know the metric is real?** Recording, two devices, ticket, after-fix utterance. Not an axe score.
- **How did others react?** iOS engineer was grateful for the recording; PM was not, until I played it.
- **What if it had failed — they shipped anyway?** Document residual and a Day-0 charter. I would still dissent in the notes.
- **Apple poke: user impact?** A person using VoiceOver authorizes money without hearing the amount. That is trust, not a checkbox.

**Anti-patterns**

- Color-contrast-only as your craft story.
- “I ran axe” as the whole Action.
- Mocking designers.

**One-liner cue** — VoiceOver skipped amount due; axe was green.

### Q3. Apple: collaboration with design/PM under a tight launch

**Maps to** — Apple collaboration; Earn Trust; JD: “work with design and PM,” “tight launches.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Design wanted a new Pay animation and microcopy the week of freeze. PM wanted marketing screenshots. Engineering wanted no pixel tests. I needed a launch that did not red-build on every copy tweak and did not ship an animation that hid the error state on capture failure.
- **Task:** I was responsible for a **shared definition of done** among design, PM, and eng that protected the failure state and kept tests stable.
- **Action:**
  - I sat in a 20-minute three-way: I asked design to show the **error** animation, not only the success one.
  - We found the spinner could overlay the error text for ~2 seconds — a craft bug and a flaky-test factory.
  - I proposed: UI tests wait on `data-testid=capture-error` (role/text), not on animation end; visual review is a design checklist on two devices, not 40 Percy snapshots in v1.
  - I asked PM to take screenshots from a **staging storybook-like** build, not from mutating the test environment.
  - I documented the DoD in the launch doc so it was the project’s, not QA’s.
- **Result:** Freeze held; error text was visible immediately; tests did not flap on animation easing. Design started inviting me to motion reviews. I learned Apple collaboration is **respecting craft while putting an oracle on the failure path**.

**Deep follow-through**

- Why this story works: you did not fight animation; you protected users and CI. Cross-functional without a villain.
- Alternate framing: BNPL legal copy — same pattern, do not assert paragraphs.
- SDET II vs Lead: II waits for final PSD. Senior facilitates DoD. Lead makes motion+error a platform checklist.

**Cross-questions they will ask**

- **What would you do differently?** Motion reviews on the calendar from sprint start.
- **What was your mistake?** Almost adding pixel diffs that would have failed on easing tweaks and poisoned the relationship.
- **How do you know the metric is real?** Before: tests timed out waiting for animation. After: stable assertion on error testid. User: error visible in recording.
- **What did your manager think?** They liked that PM screenshots left staging alone.
- **What if design had refused?** Escalate the overlay as user impact, offer a flag on animation, do not secretly pixel-test.
- **Apple poke: craft vs speed?** We kept the animation; we fixed the overlay. And, not or.

**Anti-patterns**

- “Designers are unrealistic.”
- Pixel testing as a personality.
- Excluding design from DoD.

**One-liner cue** — Pay motion hid the error; testid on failure, not pixels.

### Q4. Google: ambiguity + data-driven debate / RFC-style influence

**Maps to** — Googliness; Are Right, A Lot; JD: “influence without authority,” “written culture.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** A staff engineer wanted 200 UI tests for an orchestrator rewrite. A PM wanted 100 percent automation. Data from two years of SEVs said most payment failures were contracts and FSMs. There was no decision owner, only Slack heat.
- **Task:** I was responsible for an RFC that a busy reader could decide from: table, proposal, kill switch, dissent.
- **Action:**
  - I wrote a short RFC: problem, SEV-by-layer table, options (200 UI / hybrid / contracts-first), recommendation, kill switch if UI-only SEV escapes.
  - I asked a payments EM to tag SEVs independently to reduce my bias.
  - I circulated for comment for three days; I incorporated the receipt-UI exception (tax split) instead of defending a pure pyramid.
  - I presented for fifteen minutes, then asked for a documented decision, not a vibe.
  - When we chose contracts-first, I committed and added the two receipt UI tests the table justified.
- **Result:** We did not build 200 UI tests; the idempotency bug was caught by contracts; the RFC was reused by another squad. I learned Google-shaped influence is **a document with a kill switch**, not being the loudest in the meeting.

**Deep follow-through**

- Why this story works: written debate, bias control, updating. Googliness is collaborative truth-seeking.
- Alternate framing: shard-library RFC (Think Big).
- SDET II vs Lead: II comments on RFCs. Senior authors them. Lead sets RFC as the path for framework decisions.

**Cross-questions they will ask**

- **What would you do differently?** Continuous SEV classification.
- **What was your mistake?** Sounding anti-UI; I repaired that in the revision.
- **How do you know the metric is real?** Ticket ids in the table; PR duration SLO held; catch of the key bug.
- **How did others react?** Staff engineer still wanted more UI; they signed the kill switch. That is enough.
- **What if the RFC had lost?** Commit, instrument the kill switch, do not leak dissent into test sabotage.
- **Google poke: incomplete data?** Kill switch is how you decide anyway. I said what would change my mind.

**Anti-patterns**

- Winning Slack.
- RFC as a manifesto.
- Never updating the rec.

**One-liner cue** — RFC with SEV table; kill switch; receipts as the exception.

### Q5. Google: testing at scale / prioritization when cases are infinite

**Maps to** — Google scale; Are Right, A Lot; JD: “prioritize test coverage,” “large codebases.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Checkout combinations are infinite: tenders × locales × ship modes × promotions × clients. A PM asked for “full coverage” before peak. CI could not hold a cartesian product; humans could not either.
- **Task:** I was responsible for a prioritization scheme the org could repeat: what we automate, what we sample, what we never try to enumerate.
- **Action:**
  - I built a risk matrix: loss × likelihood × detectability (will synthetics or users see it?).
  - I used equivalence classes on tenders and **pairwise** on locale × ship mode for non-money UX; money invariants stayed exhaustive on a small set (capture, tax sum, idempotency).
  - I put property-based tests on parsers (tax, amounts) instead of listing strings.
  - I published a “will not test” list (admin theme colors, expired marketing banners) so infinite did not mean guilty.
  - I tied CI budget to the matrix: PR = P0 money, nightly = pairwise + contracts, weekly = device matrix.
- **Result:** Peak froze with a known, written surface; we still caught split-tax and idempotency; we did not drown in locale × banner tests. I learned scale testing is **a budgeted matrix**, not courage.

**Deep follow-through**

- Why this story works: Google wants to hear pairwise, properties, and explicit non-goals — software-engineering testing, not case-count vanity.
- Alternate framing: “How do you know you have enough tests?”
- SDET II vs Lead: II picks happy path. Senior publishes a matrix. Lead sets org CI budgets by risk.

**Cross-questions they will ask**

- **What would you do differently?** Pairwise tool in CI to generate the nightly set, not a spreadsheet.
- **What was your mistake?** Trying to list locales exhaustively in UI the first year.
- **How do you know the metric is real?** Matrix in the wiki; CI minutes by project; escaped defects mapped back to “will not test” (should be near zero on money).
- **What did your manager think?** They used the will-not-test list in QBR to defend the bar.
- **What if it had failed — escape on a pairwise hole?** Add that pair; do not explode to cartesian.
- **Google poke: hermetic?** Unique wallets, Testcontainers, no shared `testuser1` — otherwise scale is flake.

**Anti-patterns**

- “We automate everything important” without a matrix.
- Case-count as coverage.
- Ignoring combinatorial explosion.

**One-liner cue** — Infinite checkout; pairwise UX; exhaustive money invariants.

### Q6. Microsoft: growth mindset / inclusive collaboration / customer-support-escalation quality

**Maps to** — Microsoft culture; Earn Trust; Hire and Develop; JD: “growth mindset,” “inclusive,” “customer obsessed.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Support escalated a spike of `refund_mismatch` from sellers whose bookkeeping required cent-level match. A developer called it WAD (display rounding). A junior SDET from a services background was afraid to speak in triage. I was ramping on ledger language myself.
- **Task:** I was responsible for treating support as a customer, including the quiet junior in the RCA, and learning the ledger instead of defending UI tests I already knew.
- **Action:**
  - I sat with a support agent on a live macro and quoted seller language in triage — growth mindset: I did not already “know payments.”
  - I invited the junior to own the SQL sample (ledger cents vs receipt cents) while I paired; their name was on the finding.
  - I framed the defect as a missing spec, not as a developer failure, so inclusion was psychological safety in the room.
  - I changed my own skill gap in public: I asked the ledger owner to teach rounding, and I wrote it into the SDET one-pager.
  - We aligned P1 for the wallet event, wrote the spec, and automated the invariant.
- **Result:** Mismatch macros fell; the junior’s demo later used this invariant; the developer reviewed the spec with us. I learned Microsoft-shaped loops reward **learning in public, support as a customer, and not dominating the room**.

**Deep follow-through**

- Why this story works: three Microsoft nouns in one story without a values poster. Growth = you learned ledger. Inclusion = junior’s name on the finding. Customer = support/seller.
- Alternate framing: vendor time zones (inclusion of remote partners).
- SDET II vs Lead: II listens. Senior shares credit and writes the spec. Lead changes triage norms.

**Cross-questions they will ask**

- **What would you do differently?** Support in refinement before the spike.
- **What was your mistake?** Saying “wrong” in standup (identity). Now I say “invariant fails.”
- **How do you know the metric is real?** Macro volume, SQL sample, ticket.
- **How did others react?** Junior spoke more in the next triage. That is the inclusion metric I watch.
- **What if WAD had stood?** Commit, document support playbook, schedule finance follow-up.
- **Microsoft poke: growth mindset?** I published what I did not know. I did not perform expertise I lacked.

**Anti-patterns**

- Inclusion as a slogan with no named person.
- Mocking support.
- Fake “I love to learn.”

**One-liner cue** — Support macros; junior owned the SQL; rounding spec.

### Q7. Meta: move fast without breaking critical flows / “what would you do in week 1”

**Maps to** — Meta speed; Bias for Action; JD: “move fast,” “impact in the first month.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** BNPL had a partner date in ten days, three AC bullets, rotating sandbox. The critical flow was **capture correctness**, not marketing tiles. Separately, interviewers will ask what I would do in week one on **their** team — I keep a playbook that matches how I actually start.
- **Task:** I was responsible for shipping a flagged bar without breaking capture, and for describing a week-one plan that is diagnostic, not a rewrite.
- **Action (the story):**
  - I shipped four invariants in a week: flag off hides tile; session API; decline does not capture; timeout does not leave AUTHORIZING.
  - I used a stubbed sandbox; I refused copy assertions; I listed residual risk with owners.
  - We launched at 5 percent with experiment metrics on capture errors.
  - Sprint+1 filled a11y and locales.
- **Action (week 1 playbook, spoken as a second beat if they ask):**
  - I would map kill switches, experiment dashboards, and P0 user journeys on day 1–2.
  - I would run the CI suite, classify flake vs product, and find CODEOWNERS for the pipeline.
  - I would sit with one on-call and one PM on “what broke last quarter.”
  - I would not rewrite the framework in week 1. I would land one invariant test on the money path they fear.
- **Result:** Partner date held; no capture-on-decline; week-one story matches how I ramped payments (incidents before locators). I learned Meta-speed is **flags + invariants + explicit residuals**, and week one is reconnaissance.

**Deep follow-through**

- Why this story works: they want speed **and** a grown-up week-one. Rewriting Playwright on day three fails.
- Alternate framing: peak T-minus 48 pin (file 02 Q4).
- SDET II vs Lead: II learns the repo. Senior lands an invariant. Lead also maps org SLOs and stakeholders.

**Cross-questions they will ask**

- **What would you do differently?** Invariants-before-code as a working agreement.
- **What was your mistake?** Almost automating legal copy.
- **How do you know the metric is real?** Flag %, soak, SEVs.
- **What did your manager think?** Date plus no money bug is the review language.
- **What if week 1 CI is on fire?** Monday-red playbook: cluster, P0 gate, no rewrite.
- **Meta poke: what would you break if you move too fast?** Capture, authz, delete-user. I name the sacred flows in **their** JD.

**Anti-patterns**

- Week 1: “I would 100 percent automate.”
- Speed as skipped gates with no flag.
- Framework rewrite as first commit.

**One-liner cue** — Four invariants, 5 percent flag; week one is kill switches, not a rewrite.

### Q8. JD: “Experience building frameworks from scratch” — story

**Maps to** — Invent and Simplify; JD verbatim; system design follow-up likely.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Checkout had recorded Selenium, no factories, no env layer, reports that leaked PAN-like dumps. “From scratch” was not a greenfield hobby — it was replacing something dangerous and slow while the product kept shipping.
- **Task:** I was responsible for a v1 framework: runner, fixtures, API arrange, config, artifacts, CI — the seven components — in a pilot squad, with DoD that banned sleeps and UI setup.
- **Action:**
  - I listed non-goals: no visual AI, no plugin ecosystem, no custom runner.
  - I implemented Playwright + TypeScript: tests by feature, pages, fixtures for auth/data, API client, typed env, traces on fail, GitHub Actions shards.
  - I migrated smoke first; I kept Selenium nightly until the smoke SLO held.
  - I versioned the core as a package so “from scratch” would not become “from scratch eight times.”
  - I added PCI-aware artifact rules in week one (no PAN in traces).
- **Result:** Pilot squad authored faster and debugged with traces; other squads adopted the package over subsequent quarters. I learned from-scratch is **a sequenced replacement with non-goals**, not a weekend repo.

**Deep follow-through**

- Why this story works: JD screeners listen for layers and non-goals. Folder recitation fails.
- Alternate framing: whiteboard “design a framework” — same seven components.
- SDET II vs Lead: II built pages. Senior built the core package. Lead built adoption.

**Cross-questions they will ask**

- **What would you do differently?** Package distribution from day one, not copy-paste v0.
- **What was your mistake?** Plugin system in v1; deleted.
- **How do you know the metric is real?** Pilot stopwatch, dependents, flake vs old stack.
- **What did your manager think?** Capacity for migration was negotiated, not stolen.
- **What if from-scratch was not allowed?** Wrap the old runner with the same fixtures/API and strangler-fig. Honesty beats a fake rewrite.
- **Amazon poke: simplify?** One reporter schema, fewer languages.

**Anti-patterns**

- BaseTest as the framework.
- Greenfield that never replaced prod tests.
- Tool name-drop without DoD.

**One-liner cue** — Seven components; smoke first; package, not a fork farm.

### Q9. JD: “Integrated tests with CI/CD and improved feedback time” — story

**Maps to** — Deliver Results, Frugality; JD verbatim.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Jenkins fat job ~4h10m nightly; PR “smoke” 28 minutes of UI setup. Developers bypassed. Feedback time was a fiction.
- **Task:** I was responsible for PR p95 under fifteen minutes and nightly under an hour, with money-path coverage retained.
- **Action:**
  - I profiled: majority wall clock was UI arrange.
  - I moved arrange to API factories; Playwright only on pay path.
  - I sharded by historical duration; split a 40-minute spec.
  - I split projects: PR P0 vs nightly full; traces on fail; cache browsers.
  - I wired the required check to P0 only until flake was honest, then expanded.
- **Result:** Nightly p50 ~52 minutes; PR smoke ~11 minutes; bypasses fell when the gate was fast enough to respect. I learned CI integration is **pyramid + shard math + a gate people will wait for**.

**Deep follow-through**

- Why this story works: JD almost quotes the result. Have the job names ready.
- Alternate framing: “Tell me about GitHub Actions vs Jenkins” — principles travel.
- SDET II vs Lead: II parallelizes. Senior profiles and splits gates. Lead reports cost per green.

**Cross-questions they will ask**

- **What would you do differently?** Kill the monster spec first.
- **What was your mistake?** Shard by count.
- **How do you know the metric is real?** Actions/Jenkins API p50 over weeks, not one run.
- **What did your manager think?** Eleven minutes entered the working agreement.
- **What if speed created escapes?** Kill switch to restore UI on that path.
- **Amazon poke: data?** Duration JSON, minutes billing, bypass audit.

**Anti-patterns**

- “We added more agents.”
- Deleting tests as integration.
- Quoting a best-day number.

**One-liner cue** — 4h to 52m; 28m to 11m; API arrange, duration shards.

### Q10. JD: “API + UI + mobile + DB validation” — story

**Maps to** — Dive Deep, pyramid; JD verbatim.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** A wallet capture had to be correct on web, iOS, and in the ledger. UI-only tests missed double-credit races. DB-only tests missed VoiceOver. Mobile-only tests missed the BFF idempotency key. The JD’s stack is not a list of tools — it is **one invariant asserted at the right layers**.
- **Task:** I was responsible for a vertical slice: grant credit → capture → ledger row → receipt UI → iOS label, without duplicating the same clicks four times.
- **Action:**
  - I put the oracle in the ledger: SQL/API assert one grant id, cents match, capture_count = 1.
  - I used API to arrange the buyer and grant; UI Playwright for one web receipt path.
  - I used Appium/XCUITest smoke on iOS for the same capture, asserting accessibility label contains the total.
  - I used contract tests on the BFF idempotency header.
  - I forbade UI from being the only proof of money.
- **Result:** Double-credit was caught at API/ledger; iOS craft bug at VoiceOver; web receipt at UI. I learned the JD wants **layered oracles on one journey**, not four disconnected suites.

**Deep follow-through**

- Why this story works: you prove you did not just tick boxes on a resume.
- Alternate framing: split-shipment tax (API + receipt UI).
- SDET II vs Lead: II has an API test and a UI test. Senior designs the slice. Lead sets org rules: money never UI-only.

**Cross-questions they will ask**

- **What would you do differently?** Generate the slice from a single spec object so layers cannot drift.
- **What was your mistake?** Early in my career, Selenium plus a SELECT I did not understand. I now own the cents invariant.
- **How do you know the metric is real?** Staging soak duplicate grants; VoiceOver recording; contract failure on bad retry.
- **What did your manager think?** Vertical slice became the template for BNPL.
- **What if no DB access?** Ledger API as oracle; never skip the money assert.
- **Apple poke: mobile?** Real device for VoiceOver; farm for version matrix.

**Anti-patterns**

- Listing Rest Assured, Selenium, Appium, SQL as the answer.
- UI asserting DB as an afterthought SELECT in a teardown.
- Mobile as “we run the same clicks.”

**One-liner cue** — One wallet journey; ledger oracle; thin UI; iOS label.

### Q11. JD: “Worked in Agile/scrum; participated in planning and refinement” — story (not a process lecture)

**Maps to** — Ambiguity, Backbone; JD verbatim. **Do not define Scrum.**

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Mid-sprint, BNPL entered planning as a tile with three bullets and a partner date. Refinement had rubber-stamped “QA will automate.” That was the conflict: process language hiding an untestable tender.
- **Task:** I was responsible for changing **that** refinement, not for explaining standups, so the sprint had a testable slice and a residual-risk list.
- **Action:**
  - I stopped the “QA will automate” line and ran a 30-minute invariant workshop in refinement: flag, decline, timeout, out-of-scope copy.
  - I pulled the story back from “40 UI cases” to “contracts + one smoke behind a flag.”
  - I put residual a11y/locale/fraud on the backlog with owners **in the same refinement**, so they were not “QA later.”
  - When legal copy changed, tests did not burn the sprint because we had fought that in the ceremony.
  - I asked that money tenders cannot enter a sprint without a flag and four invariants — a working agreement born from the conflict.
- **Result:** Sprint delivered a flagged tender without a flake storm; the working agreement outlived the sprint. I learned Agile on a JD means **you changed a ceremony when it was producing theater**.

**Deep follow-through**

- Why this story works: interviewers who write “Agile” on JDs still hate Scrum lectures. They want conflict and change.
- Alternate framing: freeze-week tax checkbox — refinement failure.
- SDET II vs Lead: II attends standup. Senior changes AC. Lead changes the working agreement.

**Cross-questions they will ask**

- **What would you do differently?** Invariants-before-code as default, not a one-off workshop.
- **What was your mistake?** Letting “QA will automate” exist for two sprints before I challenged it.
- **How do you know the metric is real?** Sprint goal met; SEVs; test stability vs copy commits.
- **How did others react?** PM annoyed, then grateful when copy swaps did not red CI.
- **What if the SM said “we don’t have time for this”?** Ten minutes or we pull the story. Untestable money is not a sprint item.
- **Google poke: process vs data?** The ceremony changed because the SEV class (stuck AUTHORIZING) is expensive.

**Anti-patterns**

- “We do two-week sprints and a retro.”
- Blaming Scrum.
- QA as a sprint-end phase in your telling.

**One-liner cue** — Refinement killed “QA will automate”; four invariants entered the sprint.

### Q12. JD: “Mentored engineers and improved quality culture” — story

**Maps to** — Hire and Develop, Highest Standards; JD verbatim.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Culture was “QA owns green.” Developers skipped testids; a junior SDET lived in a lower-bar folder; sleeps were a joke in reviews. The JD’s “quality culture” is that system, not pizza.
- **Task:** I was responsible for changing defaults: lint, DoD, a junior on the same bar, and developers who add testids because it saves them minutes.
- **Action:**
  - I added semgrep for waitForTimeout and a PR template that asks for the invariant.
  - I paired with frontend on checkout testids using their flake volume, not a policy memo.
  - I ran the junior 30/60/90 at the **same** lint; they demoed factories in guild.
  - I stopped rewriting their PRs; the squad had to review to the template.
  - I showed bypass-count and flake on a public dashboard so culture had a scoreboard.
- **Result:** Sleeps collapsed; testids landed; junior caught a flake; developers asked for testids in design. I learned culture is **mechanisms plus one converted skeptic plus unchanged standards for new hires**.

**Deep follow-through**

- Why this story works: JD keyword “culture” is vague; you made it inspectable.
- Alternate framing: CODEOWNERS ownership of CI.
- SDET II vs Lead: II nags. Senior lints and demos. Lead calibrates hiring and SLOs.

**Cross-questions they will ask**

- **What would you do differently?** Testid partnership before lint shaming.
- **What was your mistake?** “This is junior” in a review. Identity attack.
- **How do you know the metric is real?** Semgrep counts, flake, bypass, frontend PRs with testids.
- **What did your manager think?** Guild demo was cited in the junior’s review.
- **What if culture did not move?** Escalate with the dashboard, not with more memos.
- **Amazon poke: Highest Standards?** Linter hit my PRs.

**Anti-patterns**

- Culture as “we communicate well.”
- Mentoring as doing their work.
- Policy without pairing.

**One-liner cue** — Lint, testids, same-bar 30/60/90, public flake board.

### Q13. JD: “Experience with cloud/Docker/device farm” — story

**Maps to** — Frugality, Deliver Results; JD verbatim.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Desktop tests ran on an expensive farm; Dockerized Playwright on CI was mis-versioned (image vs local browsers); device jobs were vendor PDFs. The JD’s cloud/Docker/farm line is usually **three different failure modes**.
- **Task:** I was responsible for a coherent topology: Docker for hermetic desktop PR, farm for real mobile matrix, traces in object storage, cost and wait measured.
- **Action:**
  - I pinned Playwright Docker image to the same browser revision as local, with `--ipc=host` and resource limits documented.
  - I moved desktop PR smoke to GitHub Actions + container grid; kept BrowserStack for iOS/Android wallet.
  - I shipped traces to S3/blob on fail so Docker and farm failures debugged the same way.
  - I fixed vendor PDF culture with shared artifacts and overlap SLA.
  - I published $/green and queue wait so Docker “savings” would not hide a 40-minute queue.
- **Result:** Farm bill down on the order of thirty percent; PR desktop stable; iOS P0 diagnose time down; version-mismatch “works on my machine” died. I learned cloud/Docker/farm is **topology + version pinning + artifacts**, not three logos on a resume.

**Deep follow-through**

- Why this story works: you show you have been burned by image skew and farm waste.
- Alternate framing: Testcontainers for Kafka/Postgres in API tests.
- SDET II vs Lead: II writes a Dockerfile. Senior designs topology. Lead does TCO (file 05).

**Cross-questions they will ask**

- **What would you do differently?** Version pin in a renovate bot from day one.
- **What was your mistake?** Cutting an iOS version too aggressively; restored.
- **How do you know the metric is real?** Invoice, wait SLO, MTTR on device fails, image digest in the log.
- **What did your manager think?** Hybrid model used in budget.
- **What if Docker was banned?** Ephemeral VMs with the same pin discipline; do not fake containers.
- **Amazon poke: frugality?** Hybrid, not no-devices on money paths.

**Anti-patterns**

- “We use AWS” with no topology.
- Docker as a black box.
- Farm as the only environment.

**One-liner cue** — Pin Playwright image; Docker desktop; farm for real iOS.

### Q14. JD: “Used AI/LLM tools in QA” — story (honest, review-gated; maps to Invent)

**Maps to** — Invent and Simplify, Learn and Be Curious; JD: AI/LLM/GenAI; Apple/Amazon will poke safety.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Payments microservices churned OpenAPI faster than we could write boilerplate Rest Assured. People wanted “ChatGPT writes all tests.” I had seen generated tests hit prod URLs and hardcode tokens in a playground. The honest story is **accelerator with gates**, not magic.
- **Task:** I was responsible for a pilot: LLM + OpenAPI → test stubs, with compile, lint, human diff, and a ban on merge without review — and for measuring acceptance rate, not hype.
- **Action:**
  - I built a pipeline: spec → structured prompt → generated tests → compile → secret/prod-URL lint → human review in the PR.
  - I added golden-file regression on generator output when prompt or model changed.
  - I documented **when not to use it**: complex auth, idempotent DELETE edges, anything with PII fixtures.
  - I ran a two-sprint pilot on one service; I tracked percent accepted vs rewritten vs rejected.
  - I refused self-healing locators that silently change oracles.
- **Result:** On the order of forty-five percent of new API tests in the pilot were accepted with minor edits; authoring time down about thirty percent on that squad; zero incidents from generated code reaching prod unsafely. I learned AI in QA is **Invent with a review gate**, and I will not claim we generate E2E journeys unattended.

**Deep follow-through**

- Why this story works: JDs now ask this. Bar raisers want guardrails. Honesty about limits is the Senior signal.
- Alternate framing: AI for **failure clustering** (signatures on Monday red) if you have not generated tests — tell the truth.
- SDET II vs Lead: II used Copilot. Senior built a gated pipeline and eval. Lead sets org policy (no unreviewed bulk).

**Cross-questions they will ask**

- **What would you do differently?** Eval set of canonical APIs before expanding squads.
- **What was your mistake?** An early prompt that omitted “never use production hosts.” Lint caught it; I still treat that as a miss.
- **How do you know the metric is real?** Acceptance rate spreadsheet, time-to-author sample, lint hits, incident count (zero). Customize — do not invent 45 percent.
- **What did your manager think?** Security review before expansion to two more services.
- **What if it had failed?** Shut the generator; keep lint. I pre-committed abort like the Playwright pilot.
- **Amazon poke: Invent?** Yes, with simplify (less boilerplate) not complexity (a new religion). Customer impact is faster correct contracts, not “AI.”

**Anti-patterns**

- “We use ChatGPT” with no gate.
- Self-healing as a brag.
- Claiming 90 percent generation.

**One-liner cue** — LLM stubs from OpenAPI; lint, compile, human diff; no self-heal.

## How to prep a company loop from this file

Highlight the company’s nouns in your stories the night before (craft, RFC, support, flags). For JD screens, speak Q8–Q14 in order once; they map to the most copied bullets in SDET postings. If the posting mentions Amazon LPs, use file 03 instead of renaming them here. Replace every number. If you have not used AI in QA, say so and tell how you would gate a pilot — do not invent a pipeline.
