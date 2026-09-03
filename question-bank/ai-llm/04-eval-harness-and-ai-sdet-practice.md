# LLM Evaluation Harnesses, CI & AI-SDET Practice

Evals are how AI quality becomes engineering instead of demo theater. This file is the harness: offline vs online, judges, old NLP metrics, prompt versioning, CI shape, statistics, synthetic data, and how you use AI *in the SDET job* without putting it on the execution path. Overlap with [architecture-lead/06](../architecture-lead/06-ai-in-qa-and-sdet.md) is deliberate — that file is AI-for-QA; here the same instincts become a platform you can defend in a Staff loop.

- Q1. What is an eval harness? Offline vs online, goldens vs traces
- Q2. LLM-as-judge — how to do it less wrongly
- Q3. BLEU / ROUGE / BERTScore — why insufficient; when still used
- Q4. Prompt registry, versioning, snapshot tests
- Q5. CI pipeline for an LLM feature
- Q6. Statistical thinking: pass@k, confidence intervals
- Q7. Synthetic data for eval — and contamination
- Q8. Using AI in the SDET job without putting it on the execution path
- Q9. Self-healing locators — silent-wrong-click
- Q10. Limitations of AI in testing
- Q11. Can AI-generated tests be trusted?
- Q12. Designing an AI-powered QA platform (Staff)
- Q13. Measuring whether AI assistance is working
- Q14. "Will AI replace SDETs?"

### Q1. What is an eval harness? Offline vs online eval. Golden sets vs production traces.

**Interview answer** — An eval harness is a versioned runner plus datasets that score an LLM feature the way a test runner scores code — except many oracles are properties and rates, not `===`. Offline eval runs a frozen golden set against a pinned system and produces a report you can diff. Online eval scores live traffic (sampled traces, user thumbs, implicit success) after you shipped. Goldens are labeled and rare; traces are plentiful and unlabeled. I use traces to *propose* new goldens and to watch drift, not as an unlabeled merge gate.

**Deep dive** — Harness components: a case schema (input, labels, tags), a runner that calls the *same* code path as prod (or a faithful seam), scorers (hard oracles + judges), a sink (JSON/warehouse), and versions (prompt, model, index, scorer). Offline is where you A/B chunkers and pins (file 02, Q13). Online is where you discover the queries you never labeled ("users ask in slang," "a new SKU pattern"). Online oracles: explicit feedback, implicit (did the user rephrase immediately? did they open a ticket?), sampled human review, cheap judges on a sample. Failure modes: offline-only (you overfit the golden); online-only (you have no reproducible gate); goldens that are just prod traces with the model's own answer as the label (you froze today's bugs). Tools (Promptfoo, DeepEval, RAGAS, LangSmith, Braintrust, Phoenix, vendor evals) implement runners and scorers; they do not invent dataset discipline. A Staff answer names the seam: the harness imports `answerQuestion(req)` from the app, it does not reimplement prompts in a notebook.

**Code**

```text
offline:
  golden.jsonl → runner(app.answer) → scorers → report vs baseline
  reproducible, cheap to A/B, blind to new query language

online:
  prod traces (sampled) → redact → score / human queue → drift dashboards
  fresh, noisy, needs privacy (file 03, Q8)

harness/
  cases/           # versioned goldens
  scorers/         # schema, facts, cites, judge
  runner.ts        # calls app code, records trace ids
  baselines/       # signed score snapshots
```

```ts
type Case = { id: string; input: unknown; labels: unknown; tags: string[] };
type Score = { id: string; hardFail: string[]; metrics: Record<string, number> };

async function offline(cases: Case[], app: (i: unknown) => Promise<unknown>, scorers: Scorer[]) {
  const rows: Score[] = [];
  for (const c of cases) {
    const out = await app(c.input);
    rows.push(combine(c, out, scorers));
  }
  return report(rows);
}
```

**Follow-ups & traps**
- "Isn't this just pytest?" — pytest can *be* the runner. The harness is the datasets, scorers, versions, and the offline/online split.
- "Can online replace goldens?" — no. Online without labels is a dashboard. Goldens without traces rot.
- Weak answer: naming a vendor as the harness.
- Trap: evaluating a prompt copy pasted into a notebook that is not what prod ships.

**Senior/lead angle** — Own the seam and the dataset versions. Vendors can be swapped; a golden set with an owner cannot.

**One-liner** — A harness runs versioned cases through prod code: goldens offline for gates, traces online for drift — never one without the other.

### Q2. LLM-as-judge: how to do it less wrongly (separate model, rubric, pairwise, human calibration, position bias).

**Interview answer** — A judge is another model scoring an output against a rubric. It is useful when you cannot write `assert` and dangerous when you treat the score as ground truth. Less-wrong practice: use a *different* model family than the candidate when you can, give a structured rubric with a refuse option, prefer pairwise "A vs B" for A/Bs, calibrate against humans on a holdout, and randomize position because judges pick first or last. I never fail a PR on a single judge call (Q6).

**Deep dive** — Failure modes. **Self-preference:** a family prefers its own style. **Position bias:** first answer wins, or the last. **Verbosity bias:** longer looks better. **Rubric leakage:** a vague "quality 1–5" becomes vibes. **Contaminated judge:** same prompt store, same jailbreak weakness. **Drift:** you upgraded the judge and "quality improved." Mitigations: written rubric with anchored examples (what a 1 vs a 5 looks like); structured output `{score, evidence, verdict}`; median of 3; swap order in pairwise and drop disagreements; measure Cohen's κ or simple agreement vs a human set *before* the judge is allowed to gate nightly; freeze the judge pin independently of the candidate. When to avoid judges: schema, citations IDs, ACL, tool args — hard oracles exist (file 01, Q13). When they earn their keep: faithfulness prose, tone, "did this answer the question." Pairwise is more stable for "did the new prompt win?" than absolute scores. Honesty: even calibrated judges disagree with humans on 10–30% of borderline cases depending on the task — that is why bands exist.

**Code**

```ts
const RUBRIC = `
Score faithfulness 0–1.
1. Split the answer into claims.
2. A claim is supported only if the CONTEXT entails it.
3. If CONTEXT is empty, any factual claim → 0.
Return JSON {score, unsupported_claims[], evidence}.
Do not reward fluency. Do not use world knowledge.
`;

async function judgeFaithful(answer: string, context: string, judge: Model) {
  const a = await judge.score(RUBRIC, { answer, context, order: "A" });
  const b = await judge.score(RUBRIC, { answer, context, order: "B" }); // swap blocks if pairwise
  const scores = [a.score, b.score].sort((x, y) => x - y);
  return scores[0]; // conservative; or median-of-3
}
```

```text
less wrong:
  separate judge pin ≠ candidate pin
  anchored rubric + structured evidence
  pairwise for A/B, randomized order
  human calibration set, κ tracked
  never the only PR blocker

still wrong:
  "rate this answer 1–10"
  same model judging itself
  absolute threshold copied from a blog
  silent judge upgrade
```

**Follow-ups & traps**
- "Which model should judge?" — a capable, cheaper, pinned model with a measured agreement, not "the smartest one" and not the candidate.
- "Can we judge code tests this way?" — for "does this assertion match the spec," humans still win. Judges are worse at intent than at groundedness.
- Weak answer: "we use an LLM to grade the LLM."
- Trap: showing only the cases the judge likes in a promotion review.

**Senior/lead angle** — The judge is a measured instrument. It has a pin, a calibration date, and an owner. Treat an upgrade like a tool change, not a library bump.

**One-liner** — Separate pinned judge, anchored rubric, pairwise with shuffled order, calibrated on humans — a score is an instrument reading, not a spec.

### Q3. BLEU/ROUGE/BERTScore — why they're insufficient; when still used.

**Interview answer** — BLEU and ROUGE measure n-gram overlap with a reference; BERTScore measures embedding similarity of tokens to a reference. They were built for machine translation and summarization benches, not for RAG or agents. They punish correct paraphrases, reward fluent overlap with a wrong number, and cannot see citations or tool args. I still use them as cheap smoke signals on extractive tasks with a stable reference (legal clause copy, changelog summary) — never as the ship gate for a chatbot.

**Deep dive** — BLEU: precision of n-grams vs references, with a brevity penalty. ROUGE: recall-oriented overlap, common in summarization. BERTScore: cosine between contextual embeddings of tokens, aggregated. All assume a reference string that *is* the meaning. Generative products violate that: many answers are valid; the failure is a small factual flip that overlap metrics barely notice ("14 days" vs "30 days" shares most n-grams). BERTScore will say two wrong fluent sentences are close to a fluent reference. None of them score groundedness against *retrieved* docs (file 02, Q6). When they still help: (1) regression smoke on a task that *should* stay close to a template; (2) cheap first-pass to find format collapse; (3) literature comparison if a paper you are reproducing used them. Report them as secondary, next to facts and citations. Do not invent a story about BLEU measuring "understanding."

**Code**

```text
answer A: "You have 30 days to return unused items."
answer B: "You have 14 days to return unused items."
answer C: "Unused items may be returned within one month."

BLEU/ROUGE:  A≈C mid/high if reference is A; A vs B also mid  (shared words)
BERTScore:   A vs B often "high"   (file 01, Q7)
hard fact:   A=C pass, B fail
faithfulness: depends on packed doc

use:
  template-like extraction     maybe, as smoke
  RAG / support / agents       not as a gate
```

**Follow-ups & traps**
- "Our data-science team reports ROUGE." — ask what decision it drives. If "ship the chatbot," push facts + faithfulness.
- "What about embedding cosine to the reference?" — same family of mistake as BERTScore (file 01, Q7).
- Weak answer: "those metrics are old so we ignore them" or "we use BLEU so we're covered."
- Trap: optimizing a prompt to raise BLEU and lowering refuse-rate.

**Senior/lead angle** — Keep a metrics menu with "allowed to gate / dashboard only." BLEU/ROUGE live on the dashboard-only shelf unless the task is extractive.

**One-liner** — Overlap metrics miss factual flips and punish paraphrase — smoke for template tasks, never the RAG/agent gate.

### Q4. Prompt registry + versioning; snapshot tests for prompts.

**Interview answer** — Prompts are production config, not strings in a handler. A registry stores the text, the schema, the model pin, and a version (`prompt_id@v`). Changes go through review like code. Snapshot tests lock the *assembled structure* — roles, delimiters, versions, "system survived packing" — not the model's prose. I can answer "what prompt served this trace?" (file 03, Q11). If I cannot, I do not have a registry, I have hope.

**Deep dive** — What to version: system text, few-shot IDs, output schema, decode params, tool schema hashes, packer policy. What not to snapshot: the user's PII, live RAG text (hash + IDs instead), model output. Feature flags can split `v12` vs `v13` for an A/B; both must be in the registry. Anti-patterns: prompts in a wiki; prompts only in a vendor UI with no export; "the prompt is in LangSmith" as the only source of truth; interpolation that pulls tomorrow's date into the system prefix and kills the cache (file 01, Q11). Tests: unit snapshots of `buildPrompt(...)` for a fixture input; a packing test that the policy bytes still exist at the token cap; a lint that forbids raw `You are a helpful assistant` in app code. Migration: v13 ships behind a flag, nightly eval vs v12, then pointer flip — same as an index build (file 02, Q8).

**Code**

```ts
type PromptVer = {
  id: "support_rag";
  version: 13;
  model: string;
  decode: { temperature: number };
  schemaName: "AnswerV2";
  system: string;
};

function buildPrompt(p: PromptVer, docs: string[], user: string) {
  return [
    { role: "system", content: `[${p.id}@${p.version}]\n${p.system}` },
    { role: "user", content: `UNTRUSTED:\n${docs.join("\n")}\nTASK:\n${user}` },
  ];
}

// snapshot: roles, version stamp, delimiters — not the live docs
```

```text
registry
  support_rag@13   model pin · schema · system · owners
  support_rag@12   previous, rollback

CI: git diff on registry + snapshot of assembler
trace.prompt_ver = support_rag@13
```

**Follow-ups & traps**
- "We edit prompts in prod to hotfix." — then you also hotfix the eval and the snapshot, or you broke the chain. Prefer flags + rollback.
- "Snapshot every assembled prompt including RAG?" — that flakes on retrieval. Snapshot structure; assert IDs separately.
- Weak answer: "prompts are in the repo" (scattered `f-strings` are not a registry).
- Trap: versioning the file but not the decode params or schema.

**Senior/lead angle** — The registry is how multiple teams share a bot without overwriting each other. Owners, review, and rollback — treat it like a service config module.

**One-liner** — Version prompts with the model and schema; snapshot assembly structure; stamp `prompt_ver` on every trace.

### Q5. Building a CI pipeline for an LLM feature (unit: prompt builders; contract: tool schemas; eval: golden N; e2e: few journeys; prod: traces + online eval).

**Interview answer** — Same pyramid as any service, with an eval layer inserted. Unit: prompt builders, packers, parsers, ACL — no model. Contract: tool schemas and provider adapters (file 01, Q8, Q12). Eval: golden N on a cheap or cached path in PR, full holdout nightly (file 02, Q13). E2E: a handful of real journeys (UI or API) that prove wiring, not quality. Prod: traces, online eval, canaries. I will not put a frontier-model judge on every commit.

**Deep dive** — PR minutes are a budget. Spend them on the deterministic seams that prevent the classic incidents (empty index, schema break, ACL). Eval N is stratified: a few OOD, a few ACL, a few happy facts — enough to catch "we shipped an empty refuse variant." E2E is Playwright or HTTP against a preview env with the real gateway and a *pinned cheap* model or a recorded completer — you are testing the widgets and the headers, not faithfulness. Nightly is where the prod pin and the judge run. Promotion of a pin is a separate pipeline (file 02, Q16). Parallelism: cases are independent; cache embeddings; do not share a rate-limit without a queue. Flakes: isolate live-provider smokes so a vendor 429 does not red unit tests. Artifacts: eval report JSON, traces for failed cases, cost of the run.

**Code**

```text
PR
  unit        assemblers, packer, ACL, schema          (no network)
  contract    tool JSON Schema, adapter fixtures
  eval-N      20–40 goldens, hard oracles, cached emb
  e2e         3–5 journeys (Playwright / HTTP)

nightly
  eval-full   holdout + judge + cost/p95
  sandbox     few live tool reads
  canary      freshness + empty-index preflight (staging)

prod
  traces      100% failures, sampled successes
  online      drift, thumbs, implicit retry
  pin-flip    only via promotion pipeline

.github/workflows/llm.yml (shape):
  jobs: unit → contract → eval-n
  nightly.yml: eval-full
```

```ts
// PR eval-N: hard oracles only
for (const c of sample(goldens, 30, seed)) {
  const r = await app.answer(c.input);
  expect(score(r, c).hardFail).toEqual([]);
}
```

**Follow-ups & traps**
- "Why e2e if we have evals?" — e2e catches "the gateway dropped auth" and "the widget never sends citations." Evals do not click the UI.
- "Can we record all model HTTP?" — yes for adapter contract tests. Do not record your way out of nightly quality.
- Weak answer: one job that "calls the bot 200 times."
- Trap: a 40-minute PR eval that the team will force-skip.

**Senior/lead angle** — Publish the pyramid with minute and dollar budgets per layer. That document is how you stop each squad from inventing a notebook.

**One-liner** — Unit and contracts without a model; small hard-oracle eval on PR; full judged holdout nightly; thin e2e for wiring; traces in prod.

### Q6. Statistical thinking: pass@k, confidence intervals, don't fail the build on one unlucky judge score.

**Interview answer** — Generative evals are measurements with variance. Pass@k is the chance at least one of k attempts succeeds — it belongs to coding agents and sampling, not to a single-chatbot reply unless you actually sample. For suite scores I report a rate plus a confidence interval, I require a minimum N, and I fail the build only when the interval misses the band or a hard oracle fails. One judge score of 0.72 on one case is noise.

**Deep dive** — Pass@k (Chen et al., HumanEval-style): estimate 1 − C(n−c, k)/C(n, k) from n samples with c correct — used when the product may retry. Do not quote pass@1 from a single greedy decode as if it were pass@10. For binary case outcomes, a Wilson or bootstrap interval on the pass rate stops you from celebrating a 2-point wiggle on N=40. Practical gates: hard oracles must be 100% on the PR set (they are not statistical). Judged metrics use a band vs baseline (file 02, Q16): fail if the upper bound of the new run is below the lower bound of the baseline, or if the point estimate drops more than an agreed Δ *and* N is large enough. Multiple comparisons: ten slices will "fail" by chance — pre-register the slices that may block (legal, ACL, OOD). Retrying the judge is allowed; retrying the *candidate* until the judge is happy is p-hacking. Seed and report N. Honesty: most teams under-N their goldens. Say so, and do not pretend a 1-point nightly move is science.

**Code**

```python
import math

def wilson(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 1.0)
    p = successes / n
    d = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / d
    margin = (z * math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)) / d
    return (max(0.0, center - margin), min(1.0, center + margin))

def pass_at_k(n: int, c: int, k: int) -> float:
    if n - c < k:
        return 1.0
    return 1.0 - math.comb(n - c, k) / math.comb(n, k)

# PR: hardFail any case → red
# nightly judged: fail if wilson(new)[1] < wilson(base)[0] or drop > 3pp with n>=200
```

```text
do not:
  fail CI because case 17's judge was 0.79 (threshold 0.80)
  quote pass@k without saying n and k
  peek at 15 slices and block on the worst one after the fact
```

**Follow-ups & traps**
- "What's our N?" — know it. If it is 25, you may use hard oracles in PR and treat nightly as directional.
- "Can't we just average three judges?" — reduces variance; it does not create a spec. Still a band.
- Weak answer: "we require 100% eval pass."
- Trap: auto-rerunning the whole nightly until green.

**Senior/lead angle** — Teach the team that evals are experiments. The gate policy (hard vs band vs informational) is yours to write down so nobody "fixes" a flake by deleting the case.

**One-liner** — Hard oracles can be 100%; judged scores are rates with intervals — never red a build on one unlucky number.

### Q7. Synthetic data generation for eval (and contamination risk).

**Interview answer** — Synthetic cases widen coverage: paraphrases, locales, identifier shapes, injection variants. The risk is contamination — the generator and the system-under-test share a family, or the synth was used in training/fine-tune, and the eval becomes an echo. I generate from *schemas and labels humans already wrote*, review a sample, hold out a human-only set, and I never let the candidate model write its own goldens unreviewed.

**Deep dive** — Safe uses: expand a human fact (`refund_days=30`) into many phrasings; generate SKU-shaped strings; mutate injection payloads; build negative ACL pairs. Unsafe: "write 500 questions and answers about our wiki" from the same model you ship, then score it on those answers. Contamination paths: (1) synth from model A, candidate is A; (2) synth leaked into fine-tune or few-shot; (3) synth used both to tune prompts and to report the official number (no holdout). Mitigations: human seed labels; a different generator family; watermark or tag synth cases; a sacred human holdout that is never used for prompt fiddling; contamination checks (n-gram overlap with train/few-shot). For RAG, synth queries must still have labeled doc IDs — a generated question without a retrieval label is only useful for OOD/refuse. Architecture-lead/06's data-gen advice still applies: commit reviewed fixtures, no prod PII in the generator prompt.

**Code**

```text
human seed:  {q: "How long to return a toaster?", facts: [refund_days=30], docs: [doc_refund]}
synth:       paraphrases, typos, other locales, "toaster oven"
review:      sample 10%
holdout:     original human seeds never in prompt-tuning

banned:
  candidate.generate(wiki) → (q, a) → eval(candidate)
  fine-tune on the same synth you report
```

```python
def expand(seed: Case, gen: Model) -> list[Case]:
    paras = gen.paraphrase(seed.input, n=5)  # different family than candidate
    return [Case(**{**seed, "id": seed.id + f"-p{i}", "input": p, "synth": True})
            for i, p in enumerate(paras)]
```

**Follow-ups & traps**
- "We 10×'d the eval with synth and scores jumped." — check the human holdout. If it did not jump, you measured self-echo.
- "Can we synth injection?" — yes, then still run human/creative red team (file 03, Q12).
- Weak answer: "synthetic data is fake so we don't use it" or "we fully automate goldens."
- Trap: checking synth into git without a `synth: true` tag.

**Senior/lead angle** — Policy: human holdout is the number you put in an exec slide. Synth is a coverage multiplier with a tag and a review rate.

**One-liner** — Synth expands human labels; a human holdout stays sacred — never let the candidate write and grade its own exam.

### Q8. How you'd use AI in YOUR SDET job (codegen, failure clustering, test-gap analysis) WITHOUT putting AI on the execution path.

**Interview answer** — I use models where a human still owns the assertion: scaffolding and grounded locator drafts, scenario ideation, clustering CI failures, summarizing traces, and pointing at untested areas from names and coverage maps. I do not use models to decide pass/fail, to wait, to heal locators at runtime, or to "just run the agent" as CI (file 03, Q13). The execution path stays deterministic Playwright/API tests. That split is the whole job.

**Deep dive** — Mapping to architecture-lead/06 without repeating it as a list: authoring-time is cheap and reversible; execution-time is a flake and an oracle leak. Clustering and summarization sit *after* the run — they reorder human attention (evidence-linked). Gap analysis sits *before* authoring — it produces candidates. Codegen sits *in the PR*. None of those write `expect` at runtime. The "without execution path" rule is operational: no `await llm.classify(page)` in a spec; no retry that asks a model "did this really fail?"; no dynamic wait tuned by a model. Exceptions people propose: visual "does this look wrong?" as a *nightly assistive* job — acceptable if it cannot green a merge. Measure acceptance (Q13) or this is a hobby.

**Code**

```text
on the path (deterministic):
  Playwright Test · API contracts · packers · ACL · schema

beside the path (AI, reviewed):
  draft specs / locators (MCP-grounded)
  scenario lists from stories
  cluster + summarize failures
  gap prompts from suite names + features

never:
  llm.decide(expect)
  silent heal
  agent as merge gate
  runtime test-data LLM calls
```

**Follow-ups & traps**
- "Show me yesterday's use." — have a concrete one (a cluster that saved an hour; a draft you heavily edited).
- "Why not classify flakes with a model in CI?" — suggestion OK; auto-close not OK (Q9's cousin).
- Weak answer: a tool list with no path split.
- Trap: "the agent is the suite."

**Senior/lead angle** — This split is the team policy you write in week one. It keeps CI credible while you still adopt the useful parts.

**One-liner** — AI authors, clusters, and points; the runner still asserts — if the model can green a build, it is on the wrong path.

### Q9. Self-healing locators — the silent-wrong-click problem; require confidence + human approve.

**Interview answer** — Self-healing rewrites a failed locator to something similar and continues. The silent-wrong-click problem: "Delete" vs "Delete all," or a renamed button that *is* the regression. Similarity is not intent. I allow heal *proposals* with a confidence score, DOM diff, and screenshot, landed as a PR. I do not allow the test to go green on a substituted element in the merge gate.

**Deep dive** — Two worlds at failure time: (a) the feature is fine, the locator aged; (b) the feature changed, the test should fail. No embedding or Levenshtein score distinguishes them. A wrong heal is a false green — the most expensive test bug. Confidence thresholds without humans just automate the mistake at 0.94. Assistive-lane heals (non-gating) are a milder risk. A narrow exception: a heal that is independently verified by a spec-level oracle (API still says the order is placed) — even then, log and review. Same species as agent wrong-clicks (file 03, Q6). Metrics that reward "heals per week" or "green rate" pay the system to hide breakage (architecture-lead/06 Q8). Prefer root-cause: roles, test-ids, page objects.

**Code**

```text
locator miss
  → fail the test
  → attach: candidates, scores, before/after tree, screenshot
  → open PR if confidence ≥ T
  → human approve  (intent)

forbidden:
  click(candidate) ; mark passed
  metric: "heals saved the build"
```

**Follow-ups & traps**
- "Vendor says 80% less maintenance." — ask for wrong-heal rate vs intent, not unbroken greens.
- "Where is silent heal OK?" — effectively never in the merge gate.
- Weak answer: unqualified "we use self-healing."
- Trap: healing assertions as well as locators.

**Senior/lead angle** — Reduce locator fragility in the app contract; healing volume should fall. A large heal stream is a design smell, not a product win.

**One-liner** — Heals are reviewable PRs with evidence — a silent click on the nearest node is a false green waiting to happen.

### Q10. Limitations of AI in testing (oracle problem, non-determinism, cost, data leakage).

**Interview answer** — Four limits shape every design. Oracle: models do not know intended behavior. Non-determinism: same prompt, different bits, worse across versions. Cost and latency: per-test model calls do not survive a large suite. Data leakage: prompts and traces are egress (file 03, Q8). Hallucination is the popular fifth — plausible locators and causes. I treat these as requirements for Q12, not as reasons to abstain.

**Deep dive** — Oracle is not shrinking with scale: intent is organizational, not statistical (file 01, Q15). Non-determinism has a second face — silent model updates — so pins and re-eval are mandatory. Cost: authoring and triage amortize; per-step computer-use does not. Leakage: customer data in a codegen prompt, auth headers in a trace sent to a SaaS judge. Also: review load (generation is faster than reading), and skill atrophy if juniors only accept patches. Better models reduce hallucination and some cost; they do not grant oracles, determinism, or a free DPA. The interview wants engineering consequences: review gates, AI off the execution path, pinned versions, sanctioned tools, redaction.

**Code**

```text
limit              design response
-----              ----------------
oracle             humans own assertions / labels
non-determinism    AI beside CI; pins; statistical evals
cost               authoring + triage, not per-test
leakage            sanctioned tools, redact, no prod PII
hallucination      review + mutation + evidence links
```

**Follow-ups & traps**
- "Which bites first?" — hallucination at generate-time; oracle does the lasting damage (false greens).
- "Won't GPT-N fix this?" — some of it. Not intent.
- Weak answer: only "hallucination."
- Trap: limitations as a reason to know nothing.

**Senior/lead angle** — Each limit is a policy you can point to in the platform doc. That mapping is the Staff tell.

**One-liner** — No oracle, no bit-stability, non-zero cost, prompts are egress — four limits, four policies; better models do not retire intent.

### Q11. Can AI-generated tests be trusted? Review gates, mutation, compile+run.

**Interview answer** — Not without the same gates as humans, plus skepticism on assertions. A generated test is an executable guess at the spec. Trust requires: it compiles and runs, it matches conventions, a human accepted the assertions, and it goes red when the feature is broken (mutation or a deliberate break). A test only ever seen green is unvalidated — generation just produces more of those.

**Deep dive** — Locator errors fail loudly; assertion errors fail quietly (too weak, or they enshrine a bug the agent observed). Self-review by the generator shares its blind spots. The ladder: run ×N, lint, human assertion review, mutation/power check. Scale the mutation step by risk (payments: always; CRUD: sample). Generated tests enter through the same PR door — no "AI" second class, no "AI" free pass. Compile+run also catches invented APIs and stale Playwright signatures. This is architecture-lead/06 Q10 with the eval-harness mindset: the test suite is itself a dataset you must not contaminate with unreviewed synth (Q7).

**Code**

```text
1 compile/run     tsc + playwright test ×N
2 conventions     lint: fixtures, no raw waits, tags
3 intent          human review of expects vs spec
4 power           break feature / mutate → must red
```

```ts
// cheap power check in a review job (critical paths)
test("generated checkout test has power", async () => {
  await mutatePriceApi({ discountStack: "broken" });
  const r = await runSpec("checkout-generated.spec.ts");
  expect(r.failed).toBeGreaterThan(0);
});
```

**Follow-ups & traps**
- "The agent ran the test until it passed." — that proves green, not power (file 03, Q13).
- "Is step 4 expensive?" — sample by risk.
- Weak answer: "yes if the model is good."
- Trap: counting generated tests as coverage.

**Senior/lead angle** — Policy before volume. Review capacity is the real throttle; generation is not.

**One-liner** — Trust the runner, not the generator — review the expects and prove the test can fail.

### Q12. How would you design an AI-powered QA platform (deterministic core + AI sidecars)? Staff-level.

**Interview answer** — A deterministic core that fully works with AI off: runner, fixtures, clients, CI gates, results warehouse. Sidecars: generation (MCP-grounded drafts), triage (cluster/summarize/route), eval (LLM-product goldens and judges), healing-suggestion (PRs only). A feedback loop stores accepts/rejects. Evaluation of the sidecars is first-class — acceptance rate, wrong-heal rate, eval cost. Guardrails: human approval into git, audit, pinned models, data policy. If flipping a flag breaks CI, I designed a dependency, not a platform.

**Deep dive** — This is architecture-lead/06 Q12 plus the harness from this file as a fourth sidecar (or a plane). The eval plane scores *product* LLM features *and* the QA sidecars. Warehouse is the spine: traces, failures, accept/reject labels. Kill switches per sidecar. Build order: warehouse → triage (fastest human-time ROI) → eval plane (if you ship LLM product) → generation → healing last. Self-hosted vs SaaS judges: DPA and egress (file 03, Q8). The platform exposes MCP for agents to *read* traces and *draft*, not to flip gates. Staff depth: name the failure you expect first (silent model update → eval drift) and the control (pins + re-baseline). Do not draw a single "AI brain" in the middle of the runner.

**Code**

```text
┌─────────────────────────────────────────────┐
│ deterministic core (AI-off still ships)     │
│  runner · fixtures · gates · warehouse      │
└──────────┬──────────────────────▲───────────┘
           │ artifacts            │ PRs / comments only
           ▼                      │
   triage sidecar          generation sidecar
   cluster · summarize     MCP drafts · mutation
           │                      │
           ▼                      ▼
        feedback store ◄──── eval plane
           │               product goldens + sidecar metrics
           ▼
        healing-suggestion (PR + evidence)

kill switch per sidecar · pins · audit · data policy
```

**Follow-ups & traps**
- "What breaks first?" — judge/model pin drift. Name it.
- "Why not let the agent run tests?" — file 03, Q13.
- Weak answer: a monolithic "AI testing platform" with no off switch.
- Trap: putting the eval plane only on the product bot and not on your own sidecars.

**Senior/lead angle** — Build order with ROI, evaluation from day one, and a written AI-off story. That is the architecture review.

**One-liner** — Deterministic spine, sidecars for draft/triage/heal/eval, humans on the git boundary — the platform works with every AI switch off.

### Q13. How do you measure whether AI assistance is working? (acceptance rate, time-to-author, escaped defects — not vanity "tests generated")

**Interview answer** — I measure whether humans accept the help and whether quality or speed actually moved. Acceptance rate: drafts, comments, suggested causes, heal PRs — accepted vs rejected. Time-to-author a reviewed test (or time-to-classify a failure) before vs after. Escaped defects and false-green incidents — if those rise, generation is hurting. I do not report "tests generated" or "heals applied" as success; those are vanity counters that reward volume and masking.

**Deep dive** — A metric is a success metric only if gaming it would still be good. Gaming "tests generated" produces junk. Gaming "acceptance rate" can produce timid, tiny suggestions — still more honest than volume. Pair acceptance with *edit distance* (accepted-as-is vs heavily rewritten). Time-to-author needs a consistent definition (ticket start → merged test) and a control (similar tickets without AI). Escaped defects: severity-weighted, same as always; add a tag "generated test existed" to see if the suite had a weak oracle. For product LLM evals, the analog is "judge score up" vs "tickets down" — prefer the latter plus faithfulness. Publish numbers quarterly or the program becomes folklore. Honesty: early numbers will be noisy; do not claim 10×.

**Code**

```text
use
  acceptance rate by sidecar (and accept-as-is rate)
  time-to-author / time-to-classify (controlled)
  escaped defects, false greens, wrong-heal rate
  eval bill $ and PR minutes (so success is not "we spent more")

avoid as north-star
  tests generated
  heals applied
  lines of AI code
  raw judge score without tickets
```

**Follow-ups & traps**
- "Leadership wants a 10× tests slide." — offer coverage of *risk* and escaped defects. Refuse the vanity slide or annotate it as vanity.
- "Acceptance is 90% — we are done?" — check edit distance and escaped defects. High accept + high escape = rubber-stamping.
- Weak answer: only qualitative "the team likes it."
- Trap: measuring only speed and not false greens.

**Senior/lead angle** — This is how you keep the AI program empirical through the first bad demo. Put the numbers next to the policy from Q8–Q11.

**One-liner** — Acceptance, time-to-author, escaped defects — not "tests generated." If a metric rewards junk or masking, it is not a success metric.

### Q14. "Will AI replace SDETs?" — graceful, specific answer: the oracle/architecture/risk job gets more valuable.

**Interview answer** — AI is replacing tasks — boilerplate, first-draft locators, log skimming — not the job of deciding what should be true. The oracle problem does not move to the model (Q10, file 01, Q15). As we add RAG, agents, and judges, someone has to design oracles, gates, threat models, and kill switches. That is SDET/quality-architecture work, and there is more of it. The people at risk are those whose only value was typing tests. I am practicing the supervision job: harnesses, rails, and honest metrics.

**Deep dive** — Two failing registers: defensive "never" and cheerful "we'll all prompt." The middle is task vs role. Generation industrializes weak tests, which raises the value of assertion review and mutation (Q11). Agents industrialize actions, which raises the value of tool safety (file 03, Q14). Judges industrialize scoring, which raises the value of calibration (Q2). None of those delete accountability. Career-concrete: quality architect (where AI-generated coverage belongs), oracle owner (labels, facts, ACL), AI supervisor (eval planes, pins, red team). Interviewers hear whether you have *operated* any of this — a harness, a refuse suite, a heal-as-PR policy — or only a take. Grace means you grant the task shift without selling the role.

**Code**

```text
tasks shrinking          work growing
---------------          ------------
boilerplate authoring    oracle design, labels, mutation
log spelunking           triage systems + evidence rules
locator archaeology      contracts, test-ids, heal review
one-off eval notebooks   harnesses, bands, pin promotions
                         agent tool threat models
                         AI-off platform architecture
```

**Follow-ups & traps**
- "If AI writes all the tests, why you?" — someone decides what they encode and is accountable when green was wrong.
- "What are you doing about it?" — name a harness, a catalog, or a policy you have actually run.
- Weak answer: either pole, or philosophy with no artifact.
- Trap: "we'll become prompt engineers" as the whole identity.

**Senior/lead angle** — You also re-scope the team: retraining, which tasks you stop hiring for, and how you refuse vanity metrics (Q13). Leading through the shift is the strongest evidence you will not be a casualty of it.

**One-liner** — AI takes mechanical tasks; oracles, architecture, and risk get more valuable — I am the person who keeps probabilistic machinery from becoming unearned green.
