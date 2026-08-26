# System coding — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md) · **Track:** [README.md](README.md)

Between LLD and platform: implement collaborating objects for test systems and AI-eval skeletons.

---

## 1. Test domain model

```text
TestCase — id, name, run() → TestResult
TestStep — optional finer grain
TestSuite — ordered/grouped cases
TestResult — status, duration, error, artifacts[]
RetryPolicy — shouldRetry(result, attempt)
ExecutionStrategy — serial / parallel(n)
Reporter — publish(results)
TestExecutor / TestRunner — orchestrates
```

### Status enum
PASSED | FAILED | SKIPPED | FLAKY (failed then passed on retry)

---

## 2. BrowserFactory / DriverManager

- Create browser/context/page with capabilities
- Thread-safe acquisition for parallel tests
- Always quit/close in finally
- Capability matrix: browser, headless, viewport

Prefer composition over static singletons when designing fresh.

---

## 3. DeviceLeaseManager

```text
acquire(requirements) → Lease(deviceId, deadline)
heartbeat(lease)
release(lease)
```

On timeout, reclamation. Tracks busy/quarantined devices.

---

## 4. TestDataProvider

- Create isolated users/data per test
- Cleanup TTL
- No shared mutable fixtures across parallel workers
- Factories over hard-coded IDs

---

## 5. ArtifactUploader

Upload with retry, checksum, content-type; return URL; fail soft or hard based on policy.

---

## 6. FlakeClassifier (conceptual)

Input: failure message, stack, history → output: category + confidence.  
Start rule-based; ML later.

---

## 7. AI evaluation skeletons

| Class | Role |
| --- | --- |
| Chunker | split documents |
| EmbeddingClient | vectorize |
| Retriever | top-k fetch |
| PromptTemplate | render prompts |
| LLMClient | complete() |
| GoldenDataset | cases + expected |
| LLMJudge | score outputs |
| EvaluationRunner | batch eval + report |
| ToolRegistry / AgentExecutor | agent tool calls |

Mock LLM clients in unit tests; focus on orchestration correctness.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
