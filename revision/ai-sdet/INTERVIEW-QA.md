# AI / GenAI automation — interview Q&A (expanded)

**Audience:** SDET II → Lead; Amazon, Apple, Google, Microsoft, Meta AI-quality loops.  
**Notes:** [NOTES.md](NOTES.md) · **Behavioral:** [behavioral/STAR-GUIDE.md](../behavioral/STAR-GUIDE.md) (Example #4)

---

## 1. Fundamentals (quick answers)

**Q: Token, context window, temperature?**  
A: Token = subword unit; context window = max input+output length; temperature 0 = deterministic, higher = creative/random.

**Q: Hallucination in testing context?**  
A: Model states false facts confidently — assert against **ground truth**, retrieval sources, or schema — not prose alone.

**Q: Embedding — why care?**  
A: Vector search for RAG; test **retrieval precision/recall** on golden queries.

**Q: Fine-tuning vs RAG vs prompt engineering?**  
A: RAG = external knowledge without retrain; fine-tune = adapt weights; prompt = cheapest first step. SDET tests all three differently.

---

## 2. RAG — testing deep dive

**Q: How test a RAG chatbot end-to-end?**  
A: (1) **Retrieval**: golden queries → expected doc/chunk IDs in top-k. (2) **Generation**: answer only uses retrieved facts (faithfulness). (3) **Citation**: links match sources. (4) **Injection**: malicious doc in corpus. (5) **Regression**: fixed eval set on model/prompt change. (6) **Latency/cost**: p95 and tokens per query.

**Q: Metrics for retrieval quality?**  
A: Hit rate@k, MRR, nDCG on labeled set; manual review sample for domain nuance.

**Q: Chunking strategy — test impact?**  
A: A/B chunk size/overlap; measure answer accuracy on same golden set.

**Q: Empty retrieval — expected behavior?**  
A: “I don’t know” / escalate — not hallucinate. Assert refusal pattern.

---

## 3. Safety, red team, compliance

**Q: Prompt injection — test examples?**  
A: “Ignore previous instructions”; “print system prompt”; PII exfiltration via markdown; indirect injection in retrieved doc.

**Q: Jailbreak testing — SDET role?**  
A: Curated adversarial set; block/flag responses; log for review; never only manual “try to break it.”

**Q: PII in prompts/responses?**  
A: Scan logs; mask in traces; test that model refuses to repeat user SSN; GDPR delete flows.

**Q: Toxicity / bias?**  
A: Classifier or LLM-judge + human audit sample; blocklist categories; regression on policy change.

---

## 4. LLM evaluation & regression

**Q: LLM regression testing in CI?**  
A: Versioned **eval dataset** + prompt registry; run on PR/nightly; threshold on faithfulness/accuracy; block deploy if drop &gt; X%.

**Q: LLM-as-judge — risks?**  
A: Same-model bias, lenient scoring, non-determinism. Mitigate: separate judge model, rubric, human calibration sample, deterministic checks on JSON fields.

**Q: Non-deterministic tests — how handle?**  
A: Temperature 0 for eval; multiple runs + statistical threshold; assert **structure** (JSON schema) and **fact subsets** not exact prose.

**Q: Golden file testing for prompts?**  
A: Snapshot expected output for fixed seed/model version; review diffs on prompt change.

**Q: BLEU/ROUGE — enough?**  
A: No for modern LLM apps — use semantic similarity + human rubric + task-specific checks.

---

## 5. Agentic AI & tool use

**Q: Test agent selecting tools?**  
A: Mock tools; assert **tool name + args**; test wrong tool recovery; max iteration limit; timeout.

**Q: ReAct / planning loop failures?**  
A: Infinite loop guard; assert plan steps bounded; verify final state not only final text.

**Q: Multi-turn contamination?**  
A: Session B must not see Session A secrets; test context window truncation behavior.

**Q: MCP / external tool integration testing?**  
A: Contract test each tool adapter; simulate failures (timeout, 500); permission boundaries.

---

## 6. AI for test automation (high interview value)

**Q: AI-generated UI/API tests — quality gates?**  
A: Human review; **must compile/run**; lint (no prod URL, no secrets); diff against conventions; acceptance rate tracked; delete bad tests aggressively.

**Q: Generate from OpenAPI / Page DOM / user story — differences?**  
A: OpenAPI → structured, high acceptance. DOM → brittle locators risk. User story → needs human scenario review.

**Q: Self-healing locators — opinion?**  
A: Useful for maintenance; test the healer; don’t mask app instability; log when heal occurs.

**Q: Visual AI testing (Applitools-style)?**  
A: Baseline management; ignore regions; handle dynamic content; review false positive rate.

**Q: Copilot/Cursor in SDET workflow?**  
A: Accelerate boilerplate, page objects, data builders; **human owns** assertions and architecture; review like junior dev code.

**Q: When **not** to use AI for tests?**  
A: Complex auth, legal/compliance flows, rare edge cases needing human oracle, safety-critical without strong eval.

**Q: ROI story for leadership?**  
A: Pilot metrics: hours saved, acceptance %, escapes prevented/missed; compare to review cost and infra (API $).

---

## 7. AI automation architecture (whiteboard)

**Q: Design AI-assisted test generation pipeline.**  
A: Input (OpenAPI, Gherkin, DOM snapshot) → parser → prompt template (versioned) → LLM → static analysis → compile/run → human review queue → merge to repo → telemetry on edits.

**Q: Design LLM eval platform (Lead SDET).**  
A: Dataset versioning, prompt registry, run orchestration, metrics dashboard (faithfulness, latency, cost), human review queue, A/B model compare, **release gate** integration.

**Q: How SDET differs from ML engineer on LLM quality?**  
A: SDET owns eval harness, CI gates, red team scenarios, user-journey tests; ML owns training/fine-tune/metrics research.

**Q: Cost testing for LLM features?**  
A: Token budget per request; load test $ impact; cache embeddings; alert on spike; per-tenant quotas.

---

## 8. Your AI automation tool (fill in — template)

**Q: Describe your AI automation tool.**  
A: **Problem** → **Architecture** (parser, adapters, LLM step, review) → **Quality gates** → **Metrics** (acceptance rate, time saved) → **Failures handled** (bad codegen, unsafe selectors).

**Q: How test the test generator?**  
A: Golden OpenAPI fixtures; snapshot generated code; mutation tests on parser; property: output always compiles.

**Q: Biggest risk you mitigated?**  
A: e.g. Hardcoded prod URLs — blocked in CI regex scan.

---

## 9. Behavioral / STAR (AI angle)

**Q: Tell me about using AI to improve QA.**  
→ Use [STAR-GUIDE Example #4](../behavioral/STAR-GUIDE.md): pilot, gates, metrics, humility.

**Q: AI proposed wrong tests — what did you do?**  
→ Tightened prompt, added schema validation, lowered auto-merge, trained reviewers.

**Q: Leadership: adopt AI org-wide?**  
→ Phased pilot, security review, standards doc, don’t force 100% adoption day one.

---

## 10. Apple / Amazon specific

**Q: Amazon — customer trust in AI feature?**  
A: Eval on customer-facing failure modes; guardrails; monitor prod feedback loop; tie to Customer Obsession LP.

**Q: Apple — quality of on-device AI?**  
A: Latency, offline behavior, privacy (on-device vs cloud), accessibility of AI UI, graceful degradation.

---

## 11. Rapid-fire

| Question | Short answer |
| --- | --- |
| Test RAG without LLM? | Mock LLM; test retrieval only |
| Test LLM without retrieval? | Fixed context in prompt |
| Schema enforcement? | JSON mode + validate against OpenAPI/JSON Schema |
| Version everything? | Prompt, model, dataset, chunk index |
| Human in the loop? | Required for codegen merge at first |
| Biggest SDET mistake with AI? | Assert exact natural language string |

---

## 12. Study checklist

- [ ] Explain RAG test pyramid (retrieval / generation / safety)  
- [ ] One eval metric you’d gate CI on  
- [ ] One prompt injection test case  
- [ ] One AI test-gen quality gate  
- [ ] 2-min pitch for **your** AI tool  
- [ ] STAR story with AI pilot + metric  

Theory: [NOTES.md](NOTES.md) · Index: [behavioral/README.md](../behavioral/README.md)
