# AWS — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Where store test artifacts?
S3 with lifecycle policies; reference URLs in result DB/CI.

### Q2. SQS in a test platform?
Scheduler enqueues work; workers long-poll; visibility timeout ≈ max test time; dead-letter queue for poison jobs.

### Q3. IAM tip for CI?
Least privilege; short-lived credentials via OIDC/roles; no long-lived access keys in git.

### Q4. ECS vs EKS for runners?
ECS simpler ops; EKS more flexible/portable Kubernetes. Choose based on team skills and existing platform.

### Q5. How debug “works in AWS fail locally” reverse?
Missing VPC endpoints, security groups, IAM, secrets, regional endpoints.
