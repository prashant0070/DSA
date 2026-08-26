# Revision library

Revision tracks for technical depth, interview Q&A, architecture, company-specific behavior, and lead-level ownership.

## Domain index

| Domain | Folder | Why it exists |
| --- | --- | --- |
| Behavioral | [behavioral/](behavioral/) | STAR, level expectations, company interview styles |
| Lead SDET | [lead-sdet/](lead-sdet/README.md) | roadmap, metrics, hiring, org ownership |
| System design | [system-design/](system-design/) | HLD, LLD, automation-platform designs |
| Test platform | [test-platform/](test-platform/README.md) | scheduler, workers, queue, farm, flakes |
| Quality engineering | [quality-engineering/](quality-engineering/README.md) | test strategy, gates, metrics, release confidence |
| Framework design | [framework-design/](framework-design/) | architecture and implementation trade-offs |
| Automation tools | [automation/](automation/) | Selenium, Playwright, Appium, Rest Assured, Locust |
| TypeScript + Playwright | [typescript-playwright/](typescript-playwright/README.md) | modern Playwright support language |
| Java engineering | [java-engineering/](java-engineering/README.md) | JVM, collections, concurrency, memory |
| API + HTTP | [api-http/](api-http/) | protocol and API-test engineering |
| SQL + DB | [sql/](sql/) | SQL plus DB internals |
| Distributed systems | [distributed-systems/](distributed-systems/README.md) | resilience, Kafka, eventual consistency |
| Networking | [networking/](networking/README.md) | TCP, DNS, TLS, troubleshooting |
| Observability | [observability/](observability/README.md) | logs, metrics, traces |
| Security | [security/](security/README.md) | OWASP, auth, secrets, API security |
| Docker | [docker/](docker/README.md) | image/build/runtime depth |
| Kubernetes | [kubernetes/](kubernetes/README.md) | deployment and scaling depth |
| AWS | [aws/](aws/README.md) | cloud services most asked for SDETs |
| CI/CD | [cicd/](cicd/README.md) | pipeline architecture and release models |
| Git | [git/](git/README.md) | version-control debugging and recovery |
| Performance | [performance/](performance/README.md) | latency, throughput, bottlenecks |
| Debugging | [debugging/](debugging/README.md) | interview debugging scenarios |
| Design patterns | [design-patterns/](design-patterns/) | pattern recognition and application |
| AI-SDET | [ai-sdet/](ai-sdet/) | LLM, RAG, agents, evaluation, AI testing |

Each domain folder now includes **NOTES.md** (detailed concepts) and **INTERVIEW-QA.md** (question/answer drill), not only a topic list.

## How to use revision tracks

1. Pick the domain that matches your current gap.
2. Read the README for scope and interview expectations.
3. Link the topic back to a coding, debugging, design, or behavioral exercise.
4. Revisit the domain during mocks until you can explain it without notes.

## Priority if you target SDET III / Lead

Start with these after the coding base:

- Java engineering
- Distributed systems
- Networking
- Observability
- Security
- Quality engineering
- Test platform
- System design
- Leadership / behavioral

## Legacy bundled track

The original `docker-k8s-aws/` track is still useful, but the repo now exposes Docker, Kubernetes, and AWS as separate revision domains so depth is easier to manage.

Master map: [../CURRICULUM.md](../CURRICULUM.md)
