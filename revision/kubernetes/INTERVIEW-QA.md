# Kubernetes — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Pod vs Deployment?
Pod is an instance. Deployment keeps desired replica count and manages rollouts of pod templates.

### Q2. Readiness vs liveness?
Readiness controls traffic; liveness controls restart. Confusing them causes outages.

### Q3. Why OOMKilled?
Container exceeded memory limit. Fix limits, leaks, or heap settings.

### Q4. How run tests on K8s?
Job/CronJob or worker Deployment pulling from queue; isolate with namespaces; mount configs; ship logs/artifacts out.

### Q5. HPA for test workers?
Scale on CPU or custom metric (queue depth). Scale to zero when idle to save cost.
