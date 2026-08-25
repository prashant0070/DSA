# AI / GenAI testing for SDET

**Browser version (diagrams + definitions):** [NOTES.html](NOTES.html)

**Deep Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)  
**Your differentiator:** tie answers to your AI automation tool project.

---

## LLM basics (interview level)

| Term | Meaning |
| --- | --- |
| **Token** | Subword unit; context window limit |
| **Prompt** | Input instructions + context |
| **Temperature** | Randomness (0 = deterministic) |
| **Hallucination** | Confident wrong output |
| **Embedding** | Vector representation of text |
| **Fine-tuning** | Adapt model weights on domain data |

---

## RAG pipeline

```text
Documents → chunk → embed → vector DB
User query → embed → retrieve top-k → prompt LLM → answer
```

**Test focus:** retrieval quality, grounding, citation accuracy, latency, cost.

---

## What to test in LLM apps

| Area | Examples |
| --- | --- |
| **Retrieval** | Right chunks retrieved? k too small? |
| **Generation** | Faithful to context? Toxicity? |
| **Safety** | Prompt injection, jailbreak, PII leak |
| **Regression** | Golden Q&A set; score drop on model change |
| **Latency/cost** | p95 tokens, $ per 1k requests |

---

## Agentic AI

**Agent** = LLM + tools + planning loop (ReAct, etc.)

| Failure mode | Test |
| --- | --- |
| Wrong tool selected | Assert tool call args |
| Infinite loop | Max steps guard |
| Unauthorized action | Permission boundary tests |
| Stale context | Multi-turn contamination |

---

## Evaluation approaches

- **Golden dataset** — expected answers or rubric  
- **LLM-as-judge** — second model scores (bias risk)  
- **Human eval** — sample review  
- **Metrics** — BLEU/ROUGE (limited); semantic similarity; exact match for structured output  

---

## AI automation tool (your project — fill in)

Document in interview:

1. **Problem** — what manual QA pain it solves  
2. **Architecture** — AST parser, adapters, LLM step, human review?  
3. **Quality gates** — how you validate generated tests  
4. **Failure handling** — bad codegen, flaky suggestions  

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
