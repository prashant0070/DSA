# Docker — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Legacy bundle also: [../docker-k8s-aws/](../docker-k8s-aws/)

---

## 1. Image vs container

- **Image**: immutable layered filesystem + metadata
- **Container**: running instance of an image

---

## 2. Dockerfile layers & cache

Each instruction ≈ layer. Reorder so dependency install caches; copy source late.  
**Multi-stage builds**: compile in fat image, copy artifact to slim runtime → smaller/safer images.

---

## 3. Day-2 concerns

| Topic | Point |
| --- | --- |
| Volumes | Persist data outside container lifecycle |
| Networks | Bridge/custom; service discovery by name in Compose |
| Resource limits | CPU/memory — prevent noisy neighbors |
| Security | non-root user, minimal base, no secrets in layers, scan images |
| Registries | ECR/Docker Hub; pin digests for reproducibility |

---

## 4. SDET uses

- Reproducible test runners
- Browser images for Grid/Playwright
- Ephemeral dependencies (DB, wiremock) via Compose
- Same artifact in CI and local

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
