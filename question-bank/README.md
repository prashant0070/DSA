# SDET Interview Question Bank

Answer-first interview bank: **941 questions across 66 files**. Built from a consolidated master list plus the gap topics interviewers actually probe.

Every technical question follows the same template:

- **Interview answer** — what you say aloud, 2–5 sentences
- **Deep dive** — internals, why it works that way, trade-offs
- **Code** — modern Java / Playwright TypeScript (no deprecated APIs)
- **Follow-ups & traps** — the cross-questions that come next
- **Senior/lead angle** — how to elevate the answer
- **One-liner** — a single sentence to memorize

Behavioral questions use **STAR** (Situation, Task, Action, Result) plus the follow-ups Amazon/Apple/Google loops actually ask.

**Read it in the browser:** from the repo root run `python3 -m http.server 8080` and open [SDET Academy](../index.html) (`http://localhost:8080`).

## Tracks

| Track | Qs | Folder |
| --- | ---: | --- |
| TypeScript | 50 | [typescript/](typescript/) |
| Playwright | 215 | [playwright/](playwright/) |
| Java | 90 | [java/](java/) |
| Selenium | 94 | [selenium/](selenium/) |
| Appium | 52 | [appium/](appium/) |
| Rest Assured & API | 60 | [rest-assured/](rest-assured/) |
| Design patterns | 42 | [design-patterns/](design-patterns/) |
| CI/CD | 70 | [cicd/](cicd/) |
| Docker · K8s · AWS · Jenkins | 60 | [devops-cloud/](devops-cloud/) |
| Architecture / Lead | 82 | [architecture-lead/](architecture-lead/) |
| AI · LLM · RAG | 60 | [ai-llm/](ai-llm/) |
| Behavioral (STAR) | 66 | [behavioral/](behavioral/) |
| **Total** | **941** | |

### TypeScript — [typescript/](typescript/)

| File | Covers |
| --- | --- |
| [01-typescript-fundamentals.md](typescript/01-typescript-fundamentals.md) | Types, interface vs type, generics, utility types, narrowing |
| [02-async-await-and-promises.md](typescript/02-async-await-and-promises.md) | Event loop, forgotten `await`, Promise.all, forEach trap |
| [03-typescript-coding-questions.md](typescript/03-typescript-coding-questions.md) | 16 coding problems with typed solutions |

### Playwright — [playwright/](playwright/)

16 files: fundamentals through locators, waiting, fixtures, POM, config, parallel/sharding, network, flaky tests, and worked scenarios.

### Java — [java/](java/)

| File | Covers |
| --- | --- |
| [01-oop-and-language-fundamentals.md](java/01-oop-and-language-fundamentals.md) | Interface vs abstract, OOP, equals/hashCode, records |
| [02-collections-and-generics.md](java/02-collections-and-generics.md) | HashMap internals, TreeMap, ConcurrentHashMap, PECS |
| [03-exceptions-strings-and-memory.md](java/03-exceptions-strings-and-memory.md) | NPE, JVM memory, String vs StringBuilder |
| [04-concurrency-and-threadlocal.md](java/04-concurrency-and-threadlocal.md) | ThreadLocal WebDriver, visibility, virtual threads |
| [05-streams-lambdas-and-modern-java.md](java/05-streams-lambdas-and-modern-java.md) | Streams, collectors, Java 17/21 |
| [06-coding-questions.md](java/06-coding-questions.md) | 16 SDET coding-round problems |

### Selenium — [selenium/](selenium/)

| File | Covers |
| --- | --- |
| [01-fundamentals-and-architecture.md](selenium/01-fundamentals-and-architecture.md) | W3C protocol, Selenium 4, vs Playwright |
| [02-waits-locators-and-actions.md](selenium/02-waits-locators-and-actions.md) | Implicit/explicit/fluent, stale elements, Actions |
| [03-windows-frames-alerts-and-advanced.md](selenium/03-windows-frames-alerts-and-advanced.md) | Tabs, frames, shadow DOM, downloads |
| [04-grid-parallel-and-threadlocal.md](selenium/04-grid-parallel-and-threadlocal.md) | Grid 4, ThreadLocal DriverFactory |
| [05-framework-testng-and-design.md](selenium/05-framework-testng-and-design.md) | TestNG, listeners, POM, hybrid framework |
| [06-scenarios-and-troubleshooting.md](selenium/06-scenarios-and-troubleshooting.md) | Worked failures and exception catalog |

### Appium — [appium/](appium/)

Appium 2.x (drivers as plugins), locators/gestures, Android/iOS/hybrid, device farms and CI.

### Rest Assured & API — [rest-assured/](rest-assured/)

HTTP/REST fundamentals, Rest Assured 5.x, auth/contract/negatives, API+UI architecture.

### Design patterns — [design-patterns/](design-patterns/)

SOLID, GoF creational/structural/behavioral — every pattern has a Java automation example.

### CI/CD — [cicd/](cicd/)

Pipeline design, Jenkins, GitHub Actions, Docker for tests, reporting.

### Docker · K8s · AWS · Jenkins — [devops-cloud/](devops-cloud/)

Platform-level: Docker internals, K8s Jobs for tests, AWS (IAM/S3/ECR/ECS/EKS), Jenkins-as-a-platform.

### Architecture / Lead — [architecture-lead/](architecture-lead/)

Framework architecture, test data, environments/secrets, strategy, scaling, AI in QA.

### AI · LLM · RAG — [ai-llm/](ai-llm/)

How LLMs work, RAG architecture and eval, agents/MCP/safety, eval harnesses and AI-SDET practice.

### Behavioral (STAR) — [behavioral/](behavioral/)

| File | Covers |
| --- | --- |
| [01-star-method-and-core-stories.md](behavioral/01-star-method-and-core-stories.md) | Career pitch, project, bugs, framework, CI time, flakes |
| [02-collaboration-conflict-and-pressure.md](behavioral/02-collaboration-conflict-and-pressure.md) | Dev disagreements, crunch, incomplete requirements |
| [03-amazon-leadership-principles.md](behavioral/03-amazon-leadership-principles.md) | One full story per LP + bar-raiser follow-ups |
| [04-company-loops-and-jd-questions.md](behavioral/04-company-loops-and-jd-questions.md) | Apple/Google/Microsoft/Meta + JD-derived stories |
| [05-lead-staff-and-strategy-stories.md](behavioral/05-lead-staff-and-strategy-stories.md) | Roadmap, hiring, red main, build-vs-buy, VP script |

## Recommended study order

1. Java (or TypeScript if your target is Playwright-TS)
2. Selenium or Playwright core (whichever is on the JD)
3. Rest Assured / API
4. Design patterns + framework architecture
5. CI/CD + Docker/Jenkins
6. Appium if the role is mobile
7. Lead/architecture + devops-cloud
8. AI/LLM/RAG (2025–2026 differentiator)
9. Behavioral STAR — keep 8–10 stories warm the whole time

## How to drill

- Read the **Interview answer**, close the file, say it aloud, then check yourself.
- Answer the **Follow-ups & traps** — that is where loops are won.
- Before an interview, re-read only the **One-liner** (or STAR cue) sections.
- Practice coding in the academy (`#/practice`) with the compiler and visualizers.
