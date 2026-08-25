# Docker, Kubernetes & AWS — SDET interview notes

**Browser version (diagrams + definitions):** [NOTES.html](NOTES.html)

**Deep Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## Docker

| Concept | Meaning |
| --- | --- |
| **Image** | Immutable template (layers) |
| **Container** | Running instance of image |
| **Dockerfile** | Build recipe |
| **Volume** | Persistent data |
| **Network** | Container communication |
| **Registry** | ECR, Docker Hub |

**SDET use:** Reproducible CI agents, Selenium Grid, Playwright browsers, API test against containerized stack.

```dockerfile
FROM mcr.microsoft.com/playwright/java:v1.40.0-jammy
WORKDIR /app
COPY . .
RUN mvn -q -DskipTests package
CMD ["mvn", "test"]
```

**Docker Compose:** Multi-container local stack (app + db + mock).

---

## Kubernetes (conceptual for SDET)

| Object | Purpose |
| --- | --- |
| **Pod** | One or more containers |
| **Deployment** | Replicated pods, rolling updates |
| **Service** | Stable network endpoint to pods |
| **ConfigMap** | Non-secret config |
| **Secret** | Credentials |
| **Namespace** | Isolation |
| **HPA** | Horizontal Pod Autoscaler |

**SDET angle:** Run test workers as Jobs; parallel test pods; mount secrets for test creds; not expected to admin cluster.

---

## AWS (interview-level for SDET)

| Service | SDET use |
| --- | --- |
| **S3** | Store reports, traces, artifacts |
| **EC2** | Grid nodes, agents |
| **ECS/EKS** | Run containers |
| **Lambda** | Lightweight test triggers, smoke |
| **Secrets Manager** | CI credentials |
| **CloudWatch** | Logs, metrics, alarms on test failures |
| **CodePipeline/CodeBuild** | CI/CD |
| **Device Farm** | Mobile test cloud |

---

## CI + containers pattern

```text
Git push → CodeBuild/Jenkins → build image → run tests in container → upload Allure to S3 → notify
```

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
