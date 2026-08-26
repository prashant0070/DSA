# System coding — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Design TestRunner classes on a whiteboard.
Suite holds cases; runner applies execution strategy; each case returns result; retry policy wraps failures; reporter aggregates. Mention parallel safety.

### Q2. How BrowserFactory avoid leaks?
try/finally or try-with-resources pattern; pool with max size; kill orphaned sessions on heartbeat loss.

### Q3. Why TestDataProvider matters in parallel CI?
Shared users cause collisions and flakes. Per-test isolation + cleanup is a platform concern.

### Q4. What is a good flake signature?
Normalized error message + stack top frames + maybe locator — used to cluster duplicates.

### Q5. How test an AgentExecutor without real LLM?
Fake LLM returning scripted tool calls; assert tool selection, args validation, loop limits, permission denials.

### Q6. Difference from production-java track?
Production-java = general utilities. System-coding = SDET/platform/AI domain objects composing into a system.
