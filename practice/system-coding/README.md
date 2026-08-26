# System coding practice

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

This track is for coding exercises that sit between LLD and platform implementation.

## Focus

- test-runner components
- browser/device manager objects
- scheduler primitives
- result pipelines
- contract-test helpers
- AI-eval and tool-execution skeletons

## High-value exercises

| Exercise | Why it matters |
| --- | --- |
| TestCase / TestSuite / TestRunner | common SDET LLD surface |
| RetryPolicy / TimeoutPolicy | framework behavior under failure |
| BrowserFactory / DriverManager | Selenium/Playwright architecture |
| DeviceLeaseManager | mobile farm thinking |
| TestDataProvider | isolation and repeatability |
| ArtifactUploader | reliability and retries |
| FlakeClassifier | platform-minded design |
| EvaluationRunner | AI-SDET evaluation system |
| ToolRegistry / AgentExecutor | agent-testing and AI platform skills |

## When to start

Start after:

- easy + medium coding is underway
- basic LLD is understandable
- production Java exercises no longer feel alien

Related revision domains:

- [../../revision/test-platform/README.md](../../revision/test-platform/README.md)
- [../../revision/ai-sdet/](../../revision/ai-sdet/)
- [../../revision/system-design/](../../revision/system-design/)
