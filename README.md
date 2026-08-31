# Complete SDET interview prep system (Java-first)

A single repository for **coding + SDET engineering + system design + behavioral + lead-level quality ownership**.

This repo is intended to be your **primary interview preparation system** for:

- SDET II
- Senior SDET
- SDET III
- Lead SDET / QA Lead
- SDE-adjacent automation and quality-engineering loops at top product companies

**Language for coding interviews:** Java 17+  
**Automation support languages:** TypeScript, Python  
**Master map:** [CURRICULUM.md](CURRICULUM.md)  
**Roadmap:** [ROADMAP.md](ROADMAP.md)  
**Start here today:** [START.md](START.md)

## What this repo covers

### Coding foundation

- OOP and Java fundamentals
- Big-O and DSA patterns
- Easy, medium, and advanced interview problems
- Build-your-own data structures
- Production Java exercises
- LLD and system coding practice

### SDET engineering

- framework architecture
- Playwright, Selenium, Appium, Rest Assured, Locust
- API, SQL, Docker, Kubernetes, AWS
- distributed systems and Kafka
- networking, observability, security
- debugging and CI/CD
- quality strategy and test-platform architecture
- AI-SDET / RAG / agents / evaluation

### Interview execution

- technical Q&A
- company-specific behavioral prep
- level expectations for SDET II / III / Lead
- HLD / LLD practice prompts
- roadmap for gap closure

## Repo map

### Foundations and coding

| Track | Folder | Purpose |
| --- | --- | --- |
| OOP foundations | [00-oop-foundations/](00-oop-foundations/) | Objects, interfaces, SOLID, composition |
| Java fundamentals | [01-java-fundamentals/](01-java-fundamentals/) | Java syntax, strings, collections, Q&A |
| Complexity | [02-complexity/](02-complexity/) | Big-O and performance reasoning |
| DSA patterns | [03-dsa-patterns/](03-dsa-patterns/) | Pattern recognition before grinding |
| Build your own structures | [01-linear-structures/](01-linear-structures/) | Learn by implementing structures |
| Easy practice | [practice/easy/](practice/easy/README.md) | Warm-up and pattern coverage |
| Medium practice | [practice/medium/](practice/medium/README.md) | Interview core |
| Advanced practice | [practice/advanced/](practice/advanced/README.md) | SDET III / Amazon-style harder set |
| Production Java | [practice/production-java/](practice/production-java/README.md) | Retry, cache, runner, scheduler, client |
| System coding | [practice/system-coding/](practice/system-coding/README.md) | SDET LLD and AI/platform coding |

### Interview question bank (answer-first)

| Track | Folder | Purpose |
| --- | --- | --- |
| Full Q&A bank | [question-bank/](question-bank/README.md) | 417 detailed Q&A: TypeScript, Playwright, CI/CD (Jenkins/GHA/Docker), lead & architecture, AI in QA |
| TypeScript | [question-bank/typescript/](question-bank/typescript/) | TS fundamentals, async/promises, coding rounds |
| Playwright | [question-bank/playwright/](question-bank/playwright/) | 16 files: fundamentals → locators → fixtures → parallel/sharding → flaky tests → worked scenarios |
| CI/CD | [question-bank/cicd/](question-bank/cicd/) | Jenkins deep dive, GitHub Actions, Docker, reporting/artifacts |
| Lead / architecture | [question-bank/architecture-lead/](question-bank/architecture-lead/) | Framework architecture, test data, environments/secrets, strategy, scaling, AI/MCP |

### Revision and interview domains

| Domain | Folder |
| --- | --- |
| Java engineering | [revision/java-engineering/](revision/java-engineering/README.md) |
| Design patterns | [revision/design-patterns/](revision/design-patterns/) |
| Framework design | [revision/framework-design/](revision/framework-design/) |
| Automation tools | [revision/automation/](revision/automation/) |
| TypeScript for Playwright | [revision/typescript-playwright/](revision/typescript-playwright/README.md) |
| API and HTTP | [revision/api-http/](revision/api-http/) |
| SQL and DB | [revision/sql/](revision/sql/) |
| Distributed systems | [revision/distributed-systems/](revision/distributed-systems/README.md) |
| Networking | [revision/networking/](revision/networking/README.md) |
| Observability | [revision/observability/](revision/observability/README.md) |
| Security | [revision/security/](revision/security/README.md) |
| Quality engineering | [revision/quality-engineering/](revision/quality-engineering/README.md) |
| Test platform | [revision/test-platform/](revision/test-platform/README.md) |
| Docker | [revision/docker/](revision/docker/README.md) |
| Kubernetes | [revision/kubernetes/](revision/kubernetes/README.md) |
| AWS | [revision/aws/](revision/aws/README.md) |
| CI/CD | [revision/cicd/](revision/cicd/README.md) |
| Git | [revision/git/](revision/git/README.md) |
| Performance | [revision/performance/](revision/performance/README.md) |
| Debugging | [revision/debugging/](revision/debugging/README.md) |
| AI-SDET | [revision/ai-sdet/](revision/ai-sdet/) |
| System design | [revision/system-design/](revision/system-design/) |
| Behavioral | [revision/behavioral/](revision/behavioral/) |
| Lead SDET | [revision/lead-sdet/](revision/lead-sdet/README.md) |

## How to use this repo

1. Start with [START.md](START.md).
2. Finish Stage 0–3 before chasing every advanced topic.
3. Implement coding stubs yourself.
4. Use revision folders for interview explanation depth.
5. Mock one coding, one system/design, and one behavioral round every week.

## Recommended order

1. OOP + Java + complexity + DSA patterns
2. Easy, then medium DSA in Java
3. Build your own structures
4. Production Java + concurrency + debugging
5. Framework architecture + API + SQL + tooling
6. Distributed systems + test platform + observability + security
7. HLD / LLD + leadership + company-specific behavioral

## Company and level preparation

Start with these files once your coding baseline is moving:

- [AMAZON-APPLE-SDET3-CHECKLIST.md](AMAZON-APPLE-SDET3-CHECKLIST.md)
- [revision/behavioral/LEVEL-EXPECTATIONS.md](revision/behavioral/LEVEL-EXPECTATIONS.md)
- [revision/behavioral/COMPANY-INTERVIEW-MATRIX.md](revision/behavioral/COMPANY-INTERVIEW-MATRIX.md)
- [revision/behavioral/COMPANY-BEHAVIORAL-QA.md](revision/behavioral/COMPANY-BEHAVIORAL-QA.md)

## Important rule

The goal is not to keep adding folders forever.

The goal is to make this repo complete enough that if you study it properly, practice the stubs, and run the mocks, you are ready for most SDET II / III / Lead interview loops without needing a random prep strategy every week.
