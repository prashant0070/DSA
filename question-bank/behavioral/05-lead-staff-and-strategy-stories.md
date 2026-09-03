# Lead / Staff SDET Behavioral & Strategy Stories

This file is the **org-impact** bank. SDET III loops may sample it; Lead, Staff, and “quality EM” loops live here. Interviewers are no longer scoring whether you can fix a flake. They are scoring whether you can **set a scorecard, move multiple teams, hire and fire the bar, spend money, kill work, and talk to a VP without slides of tool logos**.

Stories are written as a Lead SDET on a checkout/payments marketplace plus a shared CI/test platform. Metrics are **examples**. Put your real dashboard queries in the margins. Never invent a number in a live interview — a VP or bar raiser will ask who signed the TCO.

Use **I** for decisions you owned. Use **we** only for outcomes. If you have not been a people manager, say so: influence, hiring panel, and weak-performer **feedback** still count; do not fake PIPs you did not run.

## Story index

| Q | Story | LPs / themes | What “I” means at Lead |
| --- | --- | --- | --- |
| 1 | Quality strategy / 12-month roadmap | Think Big, Deliver Results | Org scorecard, sequenced bets |
| 2 | Centralized QA vs embedded SDET | Org design | You influenced the model |
| 3 | Two teams, two frameworks | Invent, Earn Trust | Convergence without mandate theater |
| 4 | Influence without authority | Earn Trust, RFC | Platform adoption |
| 5 | Hiring bar / miss / strong hire | Hire and Develop | Loop design, calibration |
| 6 | Weak performer (Lead) | Highest Standards, Employer | Fair process, documentation |
| 7 | Main branch red for days | Ownership, Bias | Incident commander |
| 8 | Build vs buy (farm vs grid) | Frugality | TCO document |
| 9 | Quality to a VP in 2 minutes | Deliver Results | Script + time you did it |
| 10 | Kill a project / deprecate framework | Backbone, Simplify | Sunset with dignity |
| 11 | SLOs for a test platform | Dive Deep, Deliver | Flake, duration, TTD |
| 12 | Personal OS when everything is on fire | Ownership | How you prioritize |

### Q1. How you defined quality strategy / a 12-month roadmap

**Maps to** — Think Big, Deliver Results; JD: “quality strategy,” “roadmap,” “platform not scripts.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Eight product squads shipped a marketplace with checkout as the money path. Quality was local heroics: three Selenium stacks, no shared flake SLO, VP questions answered with test counts. Peak season was four months out; finance had noticed farm spend. I had just taken Lead for the test platform.
- **Task:** I was responsible for a twelve-month strategy the EMs would fund: outcomes by quarter, owners, and what we would **not** do.
- **Action:**
  - I started from a risk model: what loses money or trust (capture, tax, wallet, seller cash) vs what is noisy (admin themes).
  - I set a four-quarter sequence: Q1 trust (flake taxonomy, quarantine SLA, reporting schema); Q2 speed (duration shards, API arrange, PR p95); Q3 contracts + self-service env; Q4 device economics + optional AI-gated stubs.
  - I assigned each quarter **one developer-facing win** (traces that work, 11-minute PR, stubbed sandboxes) so the roadmap was not only a QA manifesto.
  - I non-goaled year-one mobile parity and a Cypress rewrite, in writing.
  - I socialized with EMs for capacity (about 20 percent for two quarters on migration squads) before I presented to the VP.
- **Result:** The sequence survived budget; five squads moved cores; scorecard (flake, p95, escapes, $/green) replaced test counts in the QBR. I learned strategy is **ordered bets with non-goals**, not a tool timeline.

**Deep follow-through**

- Why this story works: Lead loops ask you to whiteboard this. They score risk model, sequencing, and political funding.
- Alternate framing: “What would you do in your first 90 days as Lead?” — Q1 of the roadmap plus the week-one recon from file 04 Q7.
- SDET II vs Lead: II has a backlog. Senior has a squad OKR. Lead has a year of org outcomes.

**Cross-questions they will ask**

- **What would you do differently?** Put $/green in Q1, not after finance pinged.
- **What was your mistake?** First draft had too many boxes; EMs bounced it. Three outcomes per quarter max.
- **How do you know the metric is real?** QBR dashboard queries; capacity tracked in EM plans; adoption dependents.
- **What did your manager / VP think?** They funded Q2 shards because Q1 re-enabled a gate — sequencing earned the next bet.
- **What if a quarter slipped?** Slip Q4 toys, not Q1 trust. I said that in the doc.
- **Amazon poke: Think Big vs Deliver?** MVP each quarter. Vision without Q1 flake work is a TED talk.

**Anti-patterns**

- Tool shopping list (Playwright then Appium then AI).
- 100 percent automation as strategy.
- Roadmap you never funded.

**One-liner cue** — Year: trust, speed, contracts, economics; mobile non-goal.

### Q2. Centralized QA vs embedded SDET — a decision you made or influenced

**Maps to** — Org design; Ownership; JD: “embedded vs central,” “platform team.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** After a SEV, a director proposed a **central QA** that would own all testing so product squads could “just code.” Embedded SDETs feared becoming a ticket dump. Platform work (grid, reporting) was already drowning in each squad.
- **Task:** I was responsible for a recommendation: hybrid — **platform central, SDETs embedded** — with explicit boundaries, not a religious war.
- **Action:**
  - I listed failure modes: central QA that does not know checkout FSM; embedded SDETs who each invent reporters.
  - I proposed: central team owns runner, shard library, artifact schema, farm policy, SLO dashboard; embedded SDETs own journey oracles and sit in squad planning.
  - I piloted: checkout stayed embedded; reporting moved central; we measured time-to-first-green and SEV catch.
  - I wrote a RACI so “who owns flake on a squad spec” was not Slack.
  - I disagreed with full centralization, then committed to a six-month review instead of a forever hybrid if data said otherwise.
- **Result:** EMs kept embedded SDETs; they paid a tax to the platform (CODEOWNERS on YAML). SEVs did not get worse; glue work dropped. I learned org design is **Conway plus a RACI**, and hybrid is a reviewable bet.

**Deep follow-through**

- Why this story works: you did not recite a blog. You piloted and scheduled a review.
- Alternate framing: “Should QA be independent?” — independence of **oracles and gates**, not a separate org that ships last.
- SDET II vs Lead: II has a preference. Lead makes a funded model.

**Cross-questions they will ask**

- **What would you do differently?** Put the six-month review date in the original decision, calendar-invited.
- **What was your mistake?** Using the word “tax” in the first meeting. I switched to “platform contract.”
- **How do you know the metric is real?** Glue hours survey, SEV rate, time-to-green, RACI disputes in Slack (should fall).
- **What did the director think?** They wanted control; I offered SLO visibility instead of owning every test. They accepted after the pilot.
- **What if it had failed?** Review might have moved more journeys central. I would have committed.
- **Apple poke: craft?** Embedded SDETs sit with design; central cannot VoiceOver the product weekly. Hybrid protects craft.

**Anti-patterns**

- “Embedded is always right.”
- Central QA as a police force.
- No RACI.

**One-liner cue** — Platform central; SDETs embedded; RACI; six-month review.

### Q3. Two teams, two frameworks — what you did

**Maps to** — Invent and Simplify, Earn Trust; JD: “standardize,” “multiple stacks.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Checkout was on Playwright core; seller admin was on pytest-Selenium with a proud owner. Both were “working.” Execs wanted one dashboard. A mandate would have created a shadow fork. The Python lead believed TypeScript was a demotion.
- **Task:** I was responsible for **convergence without humiliation**, and for a decision criterion written **before** the POC.
- **Action:**
  - I facilitated an RFC: decision criteria = authoring time, TTD (time to diagnose), flake, language skills, dashboard schema — scored in a two-week POC on **their** flakiest flow, not on checkout’s happy path.
  - I offered a compatibility path: same artifact schema and API client bindings in Python for a quarter so they were not blocked.
  - I paired on their worst flow first so the win was theirs.
  - I did not force date-certain migration until the POC numbers existed; I did freeze **new** features on a third C# stack.
  - When they asked to move after seeing traces, I staffed office hours rather than saying “I told you so.”
- **Result:** Seller admin moved in phase 2; C# was sunset; dashboard unified. I learned two-frameworks is a **POC with pre-committed criteria**, not a religion about Playwright.

**Deep follow-through**

- Why this story works: Lead skill is de-escalating identity (“my framework”). Criteria first.
- Alternate framing: Cypress rewrite no (file 02 Q12) — here you **did** converge, differently.
- SDET II vs Lead: II ports tests. Lead sets criteria and freeze on the third stack.

**Cross-questions they will ask**

- **What would you do differently?** Freeze the third stack earlier.
- **What was your mistake?** Comparing Playwright on checkout to Selenium on seller admin — apples/oranges until we POC’d **their** flow.
- **How do you know the metric is real?** POC stopwatch and flake on the same journeys; dependents; maintenance survey.
- **How did others react?** Python lead became a core contributor. That is the tell.
- **What if POC favored staying split?** Federate with schema + lint governance. I had that option in the RFC.
- **Amazon poke: simplify?** One schema even before one language.

**Anti-patterns**

- Mandate from the platform ivory tower.
- Endless coexistence with no freeze.
- Scoring only your favorite tool.

**One-liner cue** — Criteria-first POC on their worst flow; then they asked to move.

### Q4. Influence without authority (platform adoption)

**Maps to** — Earn Trust, Think Big; JD: “influence without authority,” “drive adoption.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** I owned a shard library and artifact schema with **zero** reporting line into growth or seller squads. They could ignore me. A couple of EMs liked “their Jenkins.” Developers did not care about my roadmap.
- **Task:** I was responsible for adoption as a **pull**: make their lives easier, prove it on a willing squad, then use data for the reluctant.
- **Action:**
  - I picked a willing squad (checkout) and made traces-on-fail and 11-minute PR their win, branded as theirs in guild.
  - I built the library so the first PR was a one-line workflow change, not a rewrite.
  - I sat office hours in **their** time zone overlap, not mine only.
  - I used flake and duration dashboards in EM meetings without naming-and-shaming; I offered to pair the first red day.
  - I got an executive sponsor only **after** two squads were in — sponsor without proof feels like a coup.
- **Result:** On the order of eight squads on the schema, five on the Playwright core; I still had one holdout with a written exception. I learned influence is **a one-line first PR and someone else’s demo**.

**Deep follow-through**

- Why this story works: Lead without a large org still must adopt. They score pull vs push.
- Alternate framing: testid policy with frontend.
- SDET II vs Lead: II asks nicely. Lead designs the first PR to be tiny and gets a sponsor after proof.

**Cross-questions they will ask**

- **What would you do differently?** Sponsor conversation in parallel with the second squad, still after proof.
- **What was your mistake?** A first version that required rewriting jobs. Adoption was zero until I cut the API.
- **How do you know the metric is real?** Registry dependents, workflow includes, duration p95 by squad.
- **What did holdouts think?** They had a dated exception. I did not guerrilla-merge their YAML.
- **What if it had failed?** Stay useful to checkout; do not fake org impact.
- **Google poke: RFC?** The library RFC listed the one-line contract. Written influence.

**Anti-patterns**

- “I mandated it.”
- Adoption as email.
- Shame dashboards as the first move.

**One-liner cue** — One-line shard include; their demo; sponsor after two squads.

### Q5. Hiring bar / a hiring miss / a strong hire

**Maps to** — Hire and Develop; JD: “build a team,” “raise the hiring bar.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Early as Lead I overweighted Selenium trivia in a loop and hired someone who could recite waits but could not read a Playwright trace or design isolation. Six weeks in, they were net-negative on CI minutes. Separately, I later hired a Senior who owned sharding. Both are the story: **miss then bar change then hit**.
- **Task:** I was responsible for admitting the miss, running a fair performance path (see Q6 if needed), and **rewriting the loop** so trivia could not pass.
- **Action:**
  - I named the miss in a calibration: we tested recall, not debugging. I did not blame the candidate for our loop.
  - I redesigned SDET III: medium coding, a **failing trace + logs** exercise, a short design of hermetic data, and one behavioral on conflict.
  - I calibrated with another Lead on a shadow session so my bar was not a mood.
  - I used the new loop to hire a Senior who asked about duration-based shards in the design; they later owned that system.
  - I added a 30-day check-in artifact (first independent RCA) so misses surface earlier.
- **Result:** The trivia-heavy hire did not reach the new bar for the role (handled per Q6); the Senior hire moved p95 duration. I learned hiring bar is **the exercise**, and a miss you hide becomes a culture.

**Deep follow-through**

- Why this story works: humility plus a changed loop plus a later hit. Only “I hire the best” fails.
- Alternate framing: if you have not hired, say so and tell panel-as-bar + 30/60/90 develop. Do not fake a miss.
- SDET II vs Lead: II has no hiring story. Lead must have a loop opinion.

**Cross-questions they will ask**

- **What would you do differently?** Shadow calibration **before** the first hire, not after.
- **What was your mistake?** Trivia. And waiting six weeks to name it.
- **How do you know the metric is real?** Time-to-first-independent-RCA; p95 after the Senior; loop scorecards (trace exercise pass/fail).
- **What did your manager think?** They backed rewriting the loop; they owned the headcount outcome with HR.
- **What if the strong hire failed?** Same 30-day artifact. Bar is not a halo.
- **Amazon poke: Develop?** Loop change is how you hire the best **next**.

**Anti-patterns**

- Mocking the missed hire as a person.
- “We have a high bar” with no exercise.
- Claiming you never missed.

**One-liner cue** — Trivia loop miss; trace+isolation exercise; Senior owned shards.

### Q6. A weak performer — how you handled it (Lead)

**Maps to** — Highest Standards, Earth’s Best Employer (fairness); JD: “people management,” “difficult conversations.” If you were not the manager, tell **feedback + EM partnership** and do not invent a PIP.

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** An SDET (the trivia hire / or a tenured person who had not moved with the stack) produced sleeps, reran until green, and missed the Monday cluster habit. Peers were compensating. Dragging it privately was becoming unfair to the junior we were holding to lint.
- **Task:** I was responsible for **clear expectations, documented examples, help, and a timeline** — not for a hallway reputation.
- **Action:**
  - I set written expectations: no waitForTimeout, RCA tickets for quarantines, one independent cluster-and-fix per red week, pairing offered twice a week.
  - I used specific PRs and CI minutes, not adjectives (“lazy”).
  - I ran 30/60/90 with artifacts; I involved HR/EM at the start, not at the explosion.
  - I kept the **same linter** as the rest of the team — the bar did not become personal.
  - If you managed the PIP: I documented, I did not gossip. If they improved, I closed the plan in writing. If not, I followed company process. In the interview, I do not share medical or protected details.
- **Result:** Either they met the artifacts and stayed, or they exited with a process that peers experienced as slow but fair — and the junior saw the bar was real. I learned weak performance is a **system of examples and dates**, and delay is injustice to the people compensating.

**Deep follow-through**

- Why this story works: Lead loops will ask this. They score fairness, documentation, and whether you lowered the bar for tenured people.
- Alternate framing: if IC only — “I gave peer feedback, then asked EM to own the plan.”
- SDET II vs Lead: II should not run PIPs. Lead must know the steps.

**Cross-questions they will ask**

- **What would you do differently?** Start documentation at week two of compensation, not week eight.
- **What was your mistake?** Softening comments in reviews “because they are trying.” The linter did not soften. I created a double standard.
- **How do you know the metric is real?** Semgrep, missed RCA SLAs, peer load (who fixed their shards). No personality scores.
- **How did others react?** Relief when expectations were written. Fear if I had vented in public — I did not.
- **What if it had failed — HR slower than the damage?** I would have redistributed on-call and said so to my manager, not to the team as blame.
- **Amazon poke: Employer?** Fair process is the LP. Mocking the person in the interview fails it.

**Anti-patterns**

- Gossip as the story.
- “I fired them” as a flex.
- No help offered before the hammer.

**One-liner cue** — Written examples, same lint, 30/60/90, HR from the start.

### Q7. Main branch red for days — your playbook as the owner

**Maps to** — Ownership, Bias for Action, Deliver Results; JD: “incident leadership,” “CI reliability.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** `main` for the monolith plus checkout workflows stayed red for three days after a weekend of merges and a runner image bump. Eight squads were blocked or bypassing. Slack was feral. I was the platform Lead — this was my incident, not “QA flaky.”
- **Task:** I was responsible for incident command: merge policy, taxonomy, comms, restore, postmortem with owners.
- **Action:**
  - I declared an incident, named IC (me) and a comms owner, and set a 30-minute update cadence to a single channel.
  - I categorized: product vs infra vs flake. The image bump plus a locator bomb plus inventory 500 were three incidents pretending to be one.
  - I stopped merges except P0 fixes, or I required revert of the image bump — I did not hope.
  - I restored P0 smoke first, then unblocked squads, then nightly. I killed a “rerun all” culture in the first hour.
  - I ran a postmortem: image pin in renovate, signature clustering in the reporter, quarantine needs “could this be product?”
- **Result:** Green P0 in hours, full restore the next day, bypass expiry. Three days should have been one; I own that we had no image pin. I learned red-main is **an incident with a merge policy**, not a test-fixing festival.

**Deep follow-through**

- Why this story works: playbook, comms, postmortem. Lead is the person who stops merges.
- Alternate framing: Monday 70 reds as IC-scale.
- SDET II vs Lead: II fixes a bucket. Lead sets policy and talks to VP if it lasts.

**Cross-questions they will ask**

- **What would you do differently?** Pin + canary runners **before** a three-day outage.
- **What was your mistake?** Letting day one be “everyone fix your tests.” Taxonomy was late.
- **How do you know the metric is real?** Time-to-P0-green, bypass count, postmortem actions closed.
- **What did your VP think?** They wanted hourly updates; the cadence handled it. See Q9.
- **What if it had failed — still red day 4?** Feature-flag paths, revert train, status page. I would have escalated a release freeze on money paths.
- **Amazon poke: data?** Image digest, error signatures, deploy list, runner disk.

**Anti-patterns**

- Rerun until luck.
- Optional check “until we know.”
- No postmortem.

**One-liner cue** — IC, stop merges, P0 first, pin the runner image.

### Q8. Build vs buy (BrowserStack vs grid; vendor vs internal) with TCO

**Maps to** — Frugality, Are Right a Lot; JD: “device farm,” “build vs buy,” “cost.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Finance flagged ~$18k/month farm. A director asked “why don’t we just buy more licenses.” Another engineer wanted a full internal device lab. Vendor diagnose time was slow (PDFs). I needed a **TCO**, not a brand preference.
- **Task:** I was responsible for a decision matrix: $/test-minute, queue wait, ops headcount, compliance, matrix coverage — and a hybrid recommendation.
- **Action:**
  - I built TCO: licenses + idle sessions + engineer wait + an FTE for an internal lab (racks, OS images, theft, CI glue) vs vendor + a small internal desktop grid.
  - I piloted both: desktop PR on internal/container grid; real iOS/Android on vendor; measured wait and fail-diagnose time after we added traces.
  - I included **compliance** (where devices live, what traces contain) with security, not as an afterthought.
  - I recommended hybrid: buy the matrix we cannot staff, build the desktop slice we run a hundred times a day.
  - I put a review date for the contract and a kill switch if wait SLO broke.
- **Result:** Spend down ~30 percent without starving wallet iOS; wait SLO held; vendor relationship improved when we shared traces. I learned build vs buy is **TCO + wait + compliance**, and “more licenses” is not a strategy.

**Deep follow-through**

- Why this story works: Lead is expected to talk money. Fake $ amounts fail — use your invoice.
- Alternate framing: buy Testcontainers Cloud vs self-host Kafka tests.
- SDET II vs Lead: II has a Dockerfile. Lead has a TCO sheet.

**Cross-questions they will ask**

- **What would you do differently?** Security in the first TCO draft.
- **What was your mistake?** Cutting an iOS version to save; restored after a bug escaped the matrix.
- **How do you know the metric is real?** Invoice CSV, wait p95, FTE model, diagnose timestamps.
- **What did finance think?** They funded hybrid because wait was in the model, not only the sticker.
- **What if buy-only won?** Commit, still demand traces and SLA. Disagree and commit.
- **Amazon poke: Frugality?** Two juniors to “run the lab” was a false cheap. Fully loaded FTE dominated.

**Anti-patterns**

- “I like BrowserStack” as TCO.
- Ignoring wait time.
- Internal lab heroics without headcount.

**One-liner cue** — TCO hybrid: containers for desktop, vendor for real iOS.

### Q9. Presenting quality to a VP in 2 minutes (script + a story of doing it)

**Maps to** — Deliver Results; JD: “executive communication,” “metrics.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** After the three-day red main and the farm bill, the VP wanted “where we are on quality” at the start of a QBR. They had twenty minutes for five topics. I had been invited for two.
- **Task:** I was responsible for a **two-minute spoken scorecard** plus one ask, without a tool tour, and for surviving the one question they would ask.
- **Action — the script I used (give this almost verbatim):**
  - “We prevent revenue-impacting bugs before customers see them. Last quarter checkout P0 escapes went from [n] to [m]; PR feedback p95 is [11 min] vs [28]; flake on the active set is [1.6%] vs [18%]. Farm spend is [−30%] with hybrid. Top residual risk is mobile wallet versions — here is the matrix gap and the ask: one more iOS version on the farm, not more desktop licenses.”
  - I showed **one** trend slide (three lines: flake, p95, escapes). I did not show Allure.
  - I pre-briefed my EM on the ask so I was not surprising them in front of the VP.
- **Action — in the room:**
  - I stopped at two minutes. When they asked “are we safe for peak?” I used the freeze bar (P0 money paths, flags, synthetics paging), not a feeling.
- **Result:** They funded the iOS version; they asked for the same three-line slide next QBR. I learned VP quality is **customer risk, three numbers, one ask**.

**Deep follow-through**

- Why this story works: you have a **script**. Lead loops will say “go.”
- Alternate framing: incident update cadence (Q7).
- SDET II vs Lead: II should not freelance VP meetings. Lead must have this muscle.

**Cross-questions they will ask**

- **What would you do differently?** Send the three numbers in email the day before so the two minutes are decisions, not first exposure.
- **What was your mistake?** An earlier draft listed tools. EM cut it.
- **How do you know the metric is real?** Same QBR queries as the dashboard; I can pull them live.
- **What did the VP think?** They repeated “three numbers and the matrix gap” to another director. That’s adoption.
- **What if they wanted 100% automation?** I used the export-oracle story in one sentence and offered a follow-up. I did not debate in the two minutes.
- **Apple poke: user?** Open with receipt/VoiceOver if that VP is product-craft oriented.

**Anti-patterns**

- Tool logos.
- Ten metrics.
- No ask.

**One-liner cue** — Escapes, p95, flake; one risk; one ask.

### Q10. You had to kill a project / deprecate a framework

**Maps to** — Invent and Simplify, Backbone; JD: “technical strategy,” “reduce complexity.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** A visual-AI sidecar and the C# Selenium stack were both consuming capacity. The AI sidecar produced self-healed locators that hid product changes. The C# stack had one expert. I had to **kill work people liked**.
- **Task:** I was responsible for a sunset plan: dates, compatibility, dignity for authors, and a written reason tied to the scorecard.
- **Action:**
  - I wrote kill criteria **before** the debate: if a tool increases TTD or hides oracles, it goes. Visual AI failed TTD; C# failed bus-factor plus dashboard schema.
  - I announced deprecation with a last-accept date for new tests, a port guide, and office hours — not a surprise delete.
  - I credited the C# author in guild and asked them to co-own the Playwright port of their most valuable specs.
  - I turned off the AI sidecar’s write access to locators first (read-only suggestions) so the kill was staged.
  - I deleted the plugin system in the core (my own invention) in the same quarter so it was not only “their” toys.
- **Result:** C# sunset completed; AI locator writes died; TTD improved; the C# expert stayed. I learned killing is **criteria, dates, and killing your own code too**.

**Deep follow-through**

- Why this story works: Lead is the person who stops. Dignity plus staged kill.
- Alternate framing: Cypress rewrite you refused to start — a kill of a **proposed** project.
- SDET II vs Lead: II cannot deprecate org-wide. Lead must.

**Cross-questions they will ask**

- **What would you do differently?** Kill criteria in the original AI pilot RFC so it was not personal later.
- **What was your mistake?** Letting AI write locators at all. Pilot should have been suggestions-only.
- **How do you know the metric is real?** TTD before/after, new-test dates in git, bus-factor (files owned).
- **How did others react?** Anger, then the co-own port. I did not mock the old stack in the interview or in guild.
- **What if it had failed — they escalated?** EM-backed written criteria. I would have committed if overruled, with residual risk documented.
- **Amazon poke: Simplify?** Two fewer ways to hide a broken oracle.

**Anti-patterns**

- Secret deletion.
- Mocking legacy authors.
- Never killing your own invention.

**One-liner cue** — Sunset C# and AI locator writes; kill criteria first; I deleted my plugins.

### Q11. Setting SLOs for a test platform (flake, duration, time-to-diagnose)

**Maps to** — Deliver Results, Dive Deep; JD: “SLOs,” “platform reliability,” “developer experience.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** Teams argued from feelings: “CI is slow,” “CI is flaky,” “I can’t tell why it failed.” Without SLOs, every incident reset the story. I needed **error budgets for the platform** the way product has them for checkout.
- **Task:** I was responsible for three SLOs with sources, dashboards, and what we do when we burn the budget.
- **Action:**
  - I defined: **flake** = fail-then-pass on retry, excluding quarantined, 7-day rolling, target <2% on active tests; **duration** = PR P0 p95 <15 min, nightly p50 <60 min; **TTD** = median minutes from red job to first meaningful RCA comment or signature cluster, target <30 min during business hours.
  - I wired dashboards from Actions API, ReportPortal, and GitHub comments (imperfect but directional).
  - I set budget policy: if flake SLO burns, we freeze new UI tests org-wide except P0 money; if duration burns, we stop adding video-on-pass; if TTD burns, we invest in traces/signatures not more cases.
  - I reviewed SLOs in the same weekly as product error budgets so they felt real.
  - I published owners: platform owns runner TTD, squads own their flake contribution.
- **Result:** Arguments became “we’re burning flake budget” instead of “QA is blocked.” We froze UI twice in a half and recovered. I learned platform SLOs are **budgets with consequences**, or they are posters.

**Deep follow-through**

- Why this story works: Staff-level. You named formulas and freeze policies.
- Alternate framing: synthetic paging SLO (failed canary pages in 5 min).
- SDET II vs Lead: II mentions flake %. Lead operates budgets.

**Cross-questions they will ask**

- **What would you do differently?** TTD instrumentation first — it was the hardest to measure honestly.
- **What was your mistake?** Counting quarantined tests in flake, which made us look better. We stopped.
- **How do you know the metric is real?** Written formulas in the wiki; queries; freeze events in the calendar.
- **What did developers think?** They liked duration SLO; they hated UI freeze. Both mean it was real.
- **What if SLOs were too tight?** We loosened nightly p50 once with a written reason. SLOs are contracts, not commandments.
- **Amazon poke: data?** Definitions, not vibes. Recite the flake formula.

**Anti-patterns**

- SLO without a freeze policy.
- 50 metrics.
- Platform owning squad product flake forever.

**One-liner cue** — Flake <2%, PR p95 <15m, TTD <30m; budgets freeze UI.

### Q12. How you prioritize when everything is on fire (personal operating system)

**Maps to** — Ownership, Deliver Results; JD: “prioritization,” “ambiguity,” “self-directed.”

**Interview answer (STAR, ~90 seconds spoken)**

- **Situation:** In one week I had: red main, VP QBR, a hiring loop, BNPL flag, vendor iOS failures, and a junior’s 60-day review. Everything was “P0.” I was the bottleneck I had named as my weakness.
- **Task:** I was responsible for a **repeatable OS** so money-path production risk always beat theater, and so I could explain the stack to my EM without looking chaotic.
- **Action:**
  - I use a four-bucket stack, in order: (1) **customer money/trust incident** (prod or freeze gate), (2) **developer merge blockage** (red main / SLO burn), (3) **time-boxed people** (hiring loop, 60-day — they have calendars), (4) **leverage work** (RFC, SLO, TCO) only when 1–3 are held.
  - I write the stack at 9 a.m. in the incident or team channel if (1) or (2) is live, so others can start (4) without me.
  - I time-box (3) — I do not cancel a candidate to polish a slide; I do cancel a slide for a capture SEV.
  - I keep a “not doing” list for the week (visual AI, extra locales) so fire does not expand scope.
  - I review the stack with my backup CODEOWNER so the OS is not only in my head.
- **Result:** Capture/freeze always won; QBR still happened because I had the three-number script; I missed a nice-to-have RFC by a week and said so. I learned a Lead OS is **a public stack and a backup**, not inbox heroics.

**Deep follow-through**

- Why this story works: they want to know you will not freeze when the calendar fills. The buckets are the artifact.
- Alternate framing: T-minus 48 crunch — same OS, bucket 1.
- SDET II vs Lead: II prioritizes tickets. Lead prioritizes **classes of work** and makes the stack visible.

**Cross-questions they will ask**

- **What would you do differently?** Backup runs bucket 2 when I am in a hiring loop — I was late to that.
- **What was your mistake?** Once I prepped VP slides while P0 smoke was red. I reversed it; still a miss.
- **How do you know the metric is real?** Incident timestamps vs git on the slide deck; candidate loops that still ran; RFC slip dated.
- **What did your manager think?** They adopted the four buckets in staff meeting.
- **What if everything is bucket 1?** Then you have an org incident — one IC, everyone else stops 3–4. I would say that to the VP, not pretend.
- **Meta poke: week 1?** Same OS: map kill switches (bucket 1 knowledge) before rewriting frameworks (bucket 4).

**Anti-patterns**

- “I just work longer.”
- Secret prioritization.
- Hiring always losing (pipeline dies) or always winning (prod dies).

**One-liner cue** — Money incident, merge blockage, time-boxed people, then leverage.

## Story rotation matrix — 12 stories covering 20 questions

Do not tell the idempotency-key tale six times. Before a loop, pick a **column** and stay in it. Adjacent questions in the same interview get **different rows**.

| Master story (your cue) | Use it for these questions | Do **not** also use it for |
| --- | --- | --- |
| **Idempotency key / double capture** | Dive Deep; difficult bug; API+UI+DB slice (contracts) | Failure; Earn Trust miss; flake taxonomy |
| **Flake 18% → ~1.6% + re-enable gate** | Earn Trust (skeptic); Deliver Results (one of three numbers); CI feedback | Red-main IC; VP two-minutes (too much overlap) |
| **CI 4h → ~52m / PR ~11m** | JD CI/CD; Frugality (minutes); Deliver Results | Framework-from-scratch (different tale) |
| **Split-shipment tax block** | Highest Standards; caught before release; Apple user/receipt | VoiceOver; BNPL speed |
| **VoiceOver amount due** | Apple craft; automation vs manual honesty | Tax; a11y-as-axe |
| **BNPL four invariants + flag** | Bias for Action; Meta speed; Agile refinement; ambiguity | Skip-tests peak (same “date pressure” — pick one) |
| **Skip-tests minimum bar** | Backbone; developer skip tests; crunch (if you need people) | BNPL; T-minus 48 pin |
| **Wrong public RCA / shared SKU** | Earn Trust; you were wrong; (optional) failure | Canary paging failure — **never both as “failure”** |
| **Canary 6 min early, no page** | Failure; incident diagnose; SLO/synthetics | Wrong RCA |
| **Three stacks → Playwright package** | Invent; framework from scratch; two-frameworks (as the **other** side) | Kill C# (can mention as sequel, not the whole STAR) |
| **Hybrid farm TCO** | Frugality; Docker/cloud/farm JD; build vs buy | CI duration story (related — pick one if time is short) |
| **Junior 30/60/90 + lint** | Develop; quality culture; Microsoft inclusion | Weak performer (different person, or you look like you only have one human story) |
| **RFC SEV table vs 200 UI** | Are Right; Google RFC; PM 100% automation (pyramid data) | Think Big platform (different document) |
| **12-month roadmap + VP script** | Strategy; Think Big; VP 2 minutes | Monday-red IC (ops vs strategy — both Lead, different muscle) |
| **Red main IC playbook** | Prioritize many failures; Lead red-main; personal OS bucket 2 | Flake quarter (chronic vs acute) |
| **Hiring miss → trace loop** | Hire; weakness (bus factor) if not using YAML-midnight | Weak performer details (privacy — keep high level) |

**How to use the matrix the night before:** list the likely 8 questions for that company, assign a **unique row** to each, speak each in 90 seconds. If two questions map to one row, split: tell tax for Highest Standards and VoiceOver for Apple craft, not tax twice. Replace every metric. If a row is not your life, delete it — a thin true story beats a rich borrowed one.

## How to practice this file

Whiteboard Q1 and Q11 in five minutes with boxes, not prose. Record Q9 at two minutes and cut until it hurts. If you are not a Lead, still learn Q2, Q4, Q8, Q12 — Senior loops steal them. Then stop. The rotation matrix is the last thing you look at before you walk in.
