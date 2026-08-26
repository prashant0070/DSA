# Kubernetes — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## 1. Core objects

| Object | Role |
| --- | --- |
| Pod | Smallest deployable; one or more containers |
| Deployment | Declarative replica management + rollout |
| Service | Stable networking to pods |
| Ingress | HTTP routing from outside |
| ConfigMap / Secret | Config and sensitive config |
| Namespace | Isolation boundary |
| Job / CronJob | Run-to-completion / scheduled |
| HPA | Autoscale replicas on metrics |

---

## 2. Probes & lifecycle

- **Liveness**: restart if dead
- **Readiness**: stop sending traffic if not ready
- Bad probes → flapping / blackhole traffic — common infra flake cause

---

## 3. Resources

Requests (scheduling guarantee) vs Limits (cap).  
Under-request → noisy neighbor; over-limit → throttling/OOMKilled.

---

## 4. Rollout / rollback

Deployments rolling update; pause/undo on bad release.  
SDET angle: smoke against new version during canary.

---

## 5. SDET platform mapping

Playwright/Selenium workers as Deployments; Jobs for one-shot suites; PVC/S3 for artifacts; HPA on queue depth; Secrets for registry creds.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
