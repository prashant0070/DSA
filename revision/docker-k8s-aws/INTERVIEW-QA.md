# Docker, K8s, AWS — interview Q&A

**Q: Docker vs VM?**  
A: Containers share host kernel, lighter, faster start; VMs full OS isolation.

**Q: Run Selenium tests in Docker?**  
A: Test container + browser container or standalone Chrome image; network link; mount reports volume; pass env for grid URL.

**Q: Playwright in Docker?**  
A: Use official Playwright image with browsers preinstalled; `--ipc=host` sometimes needed; trace volume mount.

**Q: What is a Kubernetes Pod?**  
A: Smallest deploy unit; shared network; one or more containers.

**Q: Deployment vs Job?**  
A: Deployment long-running replicas; Job runs to completion (good for test batch).

**Q: How secrets in K8s for tests?**  
A: K8s Secret mounted as env or file; CI injects; rotate; never in git.

**Q: Scale test workers on AWS?**  
A: ECS tasks or K8s Jobs per shard; SQS queue of test suites; autoscale on queue depth.

**Q: Store 10GB Allure history?**  
A: S3 lifecycle policy; prefix per branch/build; CloudFront optional.

**Q: Debug failing CI container test?**  
A: Reproduce locally same image; docker run -it shell; compare env; enable trace/video; check network to staging.

**Q: Infrastructure as Code?**  
A: Terraform/CloudFormation for repeatable env — SDET benefits from same staging topology as prod-like.

Framework CI: [framework-design](../framework-design/NOTES.md) §9
