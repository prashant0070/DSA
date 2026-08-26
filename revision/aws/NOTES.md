# AWS for SDET — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## Priority services

| Service | SDET use |
| --- | --- |
| S3 | Artifacts, reports, traces |
| EC2 | VMs / custom runners |
| ECR | Container images |
| ECS/EKS | Runner fleets |
| Lambda | Lightweight triggers, glue |
| CloudWatch | Logs/metrics/alarms |
| IAM | Least-privilege access |
| VPC | Network isolation basics |
| SQS | Work queues for orchestration |
| SNS | Notifications/fan-out |
| DynamoDB | Results metadata at scale |
| RDS | Relational app/DB testing |
| Secrets Manager | Creds at runtime |
| Device Farm | Managed device cloud awareness |

---

## Interview themes

- Artifact lifecycle + retention cost on S3
- Queue-based test orchestration (SQS)
- IAM mistakes in CI roles
- EKS/ECS for browser workers
- Observability via CloudWatch

You do **not** need Solutions Architect depth — know *what you’d pick and why*.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
