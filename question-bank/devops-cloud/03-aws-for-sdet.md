# AWS for SDET / Test Platform Interviews

SDET job descriptions that mention AWS are not asking you to recite the full catalog. They want a quality-engineering mental model: where tests run, where artifacts live, how CI authenticates, how secrets rotate, how you observe the farm, and how you keep the bill from becoming a Grid-shaped hole. For pipeline syntax see `question-bank/cicd`. For images and Jobs see `question-bank/devops-cloud/01-docker-deep-dive.md` and `02-kubernetes-for-test-platforms.md`. This file stays on services that actually appear in platform design.

- Q1. AWS mental model for quality engineering
- Q2. IAM: users vs roles vs policies; CI assuming a role; least privilege
- Q3. S3 for reports, traces, videos
- Q4. ECR for test images
- Q5. ECS/Fargate vs EKS vs EC2 for running tests
- Q6. AWS Device Farm vs alternatives; when you still buy BrowserStack
- Q7. CodeBuild / CodePipeline vs Jenkins-on-EC2 vs GitHub Actions + OIDC
- Q8. Secrets Manager vs SSM Parameter Store vs hardcoded env
- Q9. CloudWatch for test-platform health
- Q10. CloudFront + S3 for HTML reports (the auth problem)
- Q11. RDS / Aurora as a test DB; snapshots; idle cost
- Q12. Lambda for synthetics and webhook receivers
- Q13. SQS / SNS / EventBridge — asserting eventual consistency
- Q14. VPC basics (private QA, NAT, security groups)
- Q15. Cost attribution: tags, budgets, the $10k Grid
- Q16. Design: 4,000 Playwright tests on AWS in 12 minutes

### Q1. AWS mental model for quality engineering (compute + artifacts + secrets + observability + device/browser).

**Interview answer** — I map quality work onto five planes. **Compute**: where the suite runs — ECS/Fargate tasks, EKS Jobs, EC2/Jenkins agents, Lambda for tiny checks, Device Farm for real devices. **Artifacts**: S3 (reports, traces, videos, blob shards) with lifecycle. **Secrets**: IAM roles plus Secrets Manager/SSM — no keys in images. **Observability**: CloudWatch logs/metrics/alarms, maybe X-Ray on the *app*, Grafana on Prometheus in EKS. **Device/browser**: ECR images with Playwright/Selenium, Device Farm, or a vendor (BrowserStack) for Safari/real devices. Everything else in AWS is either networking that can block tests (VPC) or cost that can surprise you (NAT, idle RDS, public IPv4).

**Deep dive** — Interviewers probe whether you think in *pipelines* or in *platforms*. A pipeline view is "CodeBuild runs pytest." A platform view is identity (who can put objects, who can pull images), blast radius (QA VPC cannot reach prod RDS), and failure domains (Fargate outage vs S3). Cross-account is common: prod account, shared-services/ECR account, QA account — CI assumes a role in QA, never uses a prod user key. Region: keep compute, ECR, and S3 in one region to kill latency and transfer cost. Mental anti-pattern: treating AWS as "the cloud Jenkins is on" without naming S3/IAM. Another: using the same account for ephemeral PR stacks and production. Cost plane is first-class: test platforms die from bills more often than from etcd.

**Code**

```text
CI OIDC ──► IAM role (qa-e2e)
              ├─ ecr:GetDownloadUrlForLayer   (pull golden image)
              ├─ s3:PutObject  qa-e2e-*       (artifacts)
              ├─ secretsmanager:GetSecretValue (test users)
              ├─ ecs:RunTask / eks jobs        (compute)
              └─ logs:PutLogEvents             (suite logs)
S3 lifecycle ── traces 14d, html 90d, junit 400d (release evidence)
VPC qa-private ── no ingress from 0.0.0.0/0; egress via NAT or endpoints
```

**Follow-ups & traps**
- "Which AWS services have you used as an SDET?" — Name the five planes with one concrete each, not a laundry list of 20.
- Trap: "we store reports on the Jenkins master disk" as the AWS answer — you have compute but no artifact plane.
- "Multi-account?" — QA vs prod, CI role scoped to QA. That's the senior sentence.
- Device plane vs browser in ECR — Linux Chrome is an image; iPhone is Device Farm or a vendor.

**Senior/lead angle** — Draw the five boxes, then IAM arrows, then the bill. Staff interviews are architecture on a whiteboard; this model is the whiteboard.

**One-liner** — QE on AWS is compute + S3 artifacts + IAM/secrets + CloudWatch + a browser/device story — wired by least-privilege roles in a QA account, not by a single EC2 named jenkins.

### Q2. IAM: users vs roles vs policies; how CI assumes a role; least privilege for a test pipeline (S3 put, ECR pull, secrets read). THE most-asked AWS SDET question after S3.

**Interview answer** — Users are long-lived principals with passwords/access keys — for humans, and even then SSO is better. Roles are assumable identities with temporary credentials — for CI, EC2, ECS tasks, EKS pods (IRSA). Policies (identity-based or resource-based) are JSON that allow/deny actions on ARNs. GitHub Actions uses OIDC to assume a role (no stored AWS keys). A test pipeline role should `s3:PutObject` (and maybe `GetObject`) on the report prefix, `ecr:BatchGetImage`/`GetDownloadUrlForLayer` on the test repo, `secretsmanager:GetSecretValue` on named QA secrets — not `s3:*` on `*`, not `AdministratorAccess`.

**Deep dive** — AssumeRole vs AssumeRoleWithWebIdentity: OIDC from GitHub/GitLab/K8s. Trust policy must pin `sub` (repo, environment) or any repo in the org can mint your role. Session duration: 1h typical; long suites need refresh or a longer max. Permission boundaries and SCPs in enterprises can deny even if your policy allows — "it works in my sandbox account." Resource-based: S3 bucket policy plus IAM user/role — both must allow. Confused deputy: a role that trusts `*` OIDC. Least privilege traps: `s3:PutObject` without `s3:AbortMultipartUpload` on large videos; `ecr:GetAuthorizationToken` is account-wide (cannot resource-restrict easily) — acceptable; `secretsmanager:GetSecretValue` on `arn:...:secret:qa/e2e/*`. CI should not `iam:PassRole` to arbitrary roles unless it launches ECS tasks — then PassRole only the task role. Jenkins-on-EC2: instance profile is better than keys on disk; still, every job inherits it unless you assume a narrower role per folder. Audit: CloudTrail `AssumeRole` + `GetSecretValue`. Cost: IAM is free; leaked keys are not.

**Code**

```hcl
# terraform: GitHub OIDC role for one repo
data "aws_iam_policy_document" "gha_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:org/shop-e2e:ref:refs/heads/*", "repo:org/shop-e2e:environment:qa"]
    }
  }
}

resource "aws_iam_role" "gha_e2e" {
  name               = "gha-shop-e2e"
  assume_role_policy = data.aws_iam_policy_document.gha_trust.json
}
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Reports",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket", "s3:AbortMultipartUpload"],
      "Resource": [
        "arn:aws:s3:::qa-e2e-artifacts",
        "arn:aws:s3:::qa-e2e-artifacts/shop/*"
      ]
    },
    {
      "Sid": "PullTests",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "QaSecrets",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:qa/e2e/*"
    }
  ]
}
```

```yaml
# GitHub Actions — syntax detail in question-bank/cicd/03
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/gha-shop-e2e
    aws-region: us-east-1
```

**Follow-ups & traps**
- "User or role for Jenkins?" — Instance profile / IRSA / OIDC role. Access keys in Jenkins credentials are the legacy answer; say how you'd migrate.
- Trap: trust policy `sub` = `repo:org/*` on a role that can read prod secrets.
- "Why can I not scope `ecr:GetAuthorizationToken`?" — API is account-level; lock down the image actions by repository ARN on the other ECR calls (split the statement).
- Least privilege vs broken uploads — start narrow, add from CloudTrail Access Denied, don't start at `*`.

**Senior/lead angle** — This is a governance design: one CI role per *product suite* (or per GitHub environment), SCPs denying `s3:PutObject` outside tagged buckets, break-glass role with approval. Review CloudTrail, not just the JSON.

**One-liner** — Users are people; roles are machines with temporary creds; CI uses OIDC/IRSA to assume a role that can put reports, pull ECR, and read named QA secrets — nothing else.

### Q3. S3 for reports/traces/videos: bucket layout, lifecycle (expire traces in 14d), presigned URLs for PR comments, encryption, public-access block.

**Interview answer** — One bucket (or one per account) with a prefix contract: `s3://qa-e2e-artifacts/{repo}/{run_id}/junit/|html/|traces/|videos/|blobs/`. Block all public access. Encrypt with SSE-S3 or SSE-KMS. Lifecycle: traces/videos expire in 14 days, HTML in 30–90, JUnit/release evidence longer. Engineers get objects via **presigned URLs** (minutes to hours) posted on the PR — not by making the bucket website public. Versioning optional; it costs. Same layout every suite so the dashboard can glob.

**Deep dive** — Layout beats many buckets: IAM is prefix-based; lifecycle rules are prefix-based. `run_id` is CI run + shard. Multipart for large videos; abort incomplete uploads (policy + lifecycle abort). Encryption: SSE-S3 is enough for most QA reports; SSE-KMS if compliance wants key rotation and grants — KMS costs per API call, and listing 100k traces is a bill. Object Lock only if legal hold. Presign: `getObject` URL from the CI role; TTL 15 minutes for a human click, or 7 days if Slack permalinks must work (security trade). CloudFront in front is Q10. PII: traces contain screenshots of QA data — treat the bucket as confidential, VPC-only access via endpoint if paranoid. Cross-region replication: usually no. Failure: `if: success()` skipping upload (see cicd reporting file); clock skew on presign; `s3:PutObject` without `kms:GenerateDataKey` when using SSE-KMS. Cost: storage is cheap; *requests* and NAT egress to S3 without a gateway endpoint are not.

**Code**

```hcl
resource "aws_s3_bucket" "e2e" { bucket = "qa-e2e-artifacts" }

resource "aws_s3_bucket_public_access_block" "e2e" {
  bucket                  = aws_s3_bucket.e2e.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "e2e" {
  bucket = aws_s3_bucket.e2e.id
  rule {
    id     = "expire-traces"
    status = "Enabled"
    filter { prefix = "traces/" }
    expiration { days = 14 }
  }
  rule {
    id     = "abort-mpu"
    status = "Enabled"
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}
```

```bash
aws s3 sync playwright-report "s3://qa-e2e-artifacts/${REPO}/${RUN_ID}/html/" --only-show-errors
url=$(aws s3 presign "s3://qa-e2e-artifacts/${REPO}/${RUN_ID}/html/index.html" --expires-in 3600)
# post $url on the PR
```

**Follow-ups & traps**
- "How do developers open the HTML report?" — Presigned URL or authenticated CloudFront (Q10). Not `s3:PutBucketAcl public-read`.
- Trap: lifecycle on the whole bucket deleting JUnit used for flake trends.
- SSE-KMS + presign — the signer needs `kms:Decrypt`; forgotten in least-privilege.
- Path traversal in `run_id` from untrusted PR titles — sanitize prefixes.

**Senior/lead angle** — Artifact policy is org-wide: prefixes, TTLs, encryption, PII classification. Chargeback via prefix tags (`s3:ExistingObjectTag` / inventory). This pairs with `question-bank/cicd/05-reporting-and-artifacts.md` without repeating reporter types.

**One-liner** — Private bucket, prefix-per-run, lifecycle traces at 14d, SSE, public access blocked — humans get presigned URLs, never a public website.

### Q4. ECR for test images; tag mutability; scan on push.

**Interview answer** — ECR is the private registry for golden and team test images. Repositories: `e2e-pw`, `e2e-java`, maybe `shop-preview`. **Tag immutability** on SHA tags so `1.46.0-abc123` cannot be overwritten; leave a mutable `stable` pointer if you must, but CI runs by digest. **Scan on push** (ECR native or Trivy in CI) gates criticals on *our* layers; browser images always have CVEs — rebuild on a cadence, don't block forever. Replication to a second region only if we run tests there.

**Deep dive** — Pull-through cache / ECR cache of MCR and Docker Hub avoids rate limits when 80 nodes start. Lifecycle: expire untagged blobs after 14d; keep last N SHA tags. Encryption: AES-256 default. Permissions: CI push role ≠ runtime pull role (separate). Image signing (Notary/cosign) + Kyverno/OPA on EKS admission. Failure: mutable `latest` retagged mid-matrix (file 01 Q13). Scan: "CRITICAL in Chromium" every week — policy is severity × package origin (our npm vs Chrome). Cost: storage + scan; cheap versus rebuilding on Docker Hub.

**Code**

```hcl
resource "aws_ecr_repository" "e2e_pw" {
  name                 = "e2e-pw"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_lifecycle_policy" "e2e_pw" {
  repository = aws_ecr_repository.e2e_pw.name
  policy     = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "expire untagged"
      selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 14 }
      action       = { type = "expire" }
    }]
  })
}
```

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
docker buildx build --push -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/e2e-pw:$GIT_SHA .
```

**Follow-ups & traps**
- "Immutable repo but we need `stable`?" — Second repo with mutable tags, or a mutable exception tag pattern if the API allows; or store the current digest in SSM.
- Trap: scan-on-push as a merge blocker without a waiver path — Chrome CVEs freeze the org.
- Pull-through vs mirroring Playwright — first pull is slow; a warmup Job on node scale-up helps.
- Cross-account pull — policy on the repo, not just IAM in the consumer account.

**Senior/lead angle** — ECR is part of the golden-image product: immutable SHAs, scan policy written down, pull-through for upstream, separate push/pull roles.

**One-liner** — ECR holds test images with immutable SHA tags, scan-on-push plus a CVE waiver for browsers, and pull-through so 80 shards do not hit Docker Hub limits.

### Q5. ECS/Fargate vs EKS vs EC2 for running tests — decision matrix (ops cost vs control).

**Interview answer** — **Fargate** (ECS or EKS Fargate): least node ops, pay per vCPU-second, fine isolation, slower cold start, less host control (no privileged Grid sock). **EKS on EC2/Karpenter**: maximum control (DaemonSets, spot shapes, NetworkPolicies, Jenkins plugin), highest ops cost. **ECS on EC2**: middle — no kube API, still a cluster. **Pets on EC2**: Jenkins static agents — simple until they rot. I pick Fargate for bursty, low-ops suites under a few hundred concurrent tasks; EKS when we already have a cluster or need Dynamic Grid/KEDA; EC2 pets only as a bootstrap.

**Deep dive** —

| Need | Lean pick |
| --- | --- |
| 20 Playwright shards, no kube skill | ECS Fargate + S3 |
| Org already on EKS | Jobs on a spot node pool |
| Selenium Dynamic Grid / Moon | EKS (or dedicated EC2 + Docker) |
| Windows/macOS browsers | Not Fargate Linux — vendor or dedicated |
| Privileged docker.sock | EC2 or special node pool, never Fargate |
| Strict isolation per test | Fargate task or gVisor — not a stuffed EC2 |
| Cheapest steady 24/7 Grid | EC2 reserved / savings plan, not Fargate |

Fargate limits: 4 vCPU / 30 GiB classic (check current); ephemeral storage 20–200 GiB — traces can fill it. No `hostIPC`; shm via task-level `linuxParameters.sharedMemorySize` (ECS) or emptyDir on EKS. Cold start: image pull from ECR in-region ~seconds to a minute if large. EC2: you patch, you AMIs, you ASG. EKS: control plane cost ~$0.10/h plus nodes — idle cluster tax (K8s Q12). Hybrid: merge/report on Fargate, browsers on EKS spot.

**Code**

```json
{
  "family": "e2e-playwright",
  "networkMode": "awsvpc",
  "cpu": "2048",
  "memory": "8192",
  "containerDefinitions": [{
    "name": "pw",
    "image": "123.dkr.ecr.us-east-1.amazonaws.com/e2e-pw@sha256:4f3c…",
    "linuxParameters": { "sharedMemorySize": 2048, "initProcessEnabled": true },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": { "awslogs-group": "/e2e/playwright", "awslogs-region": "us-east-1", "awslogs-stream-prefix": "pw" }
    }
  }]
}
```

**Follow-ups & traps**
- "Fargate for Selenium Grid hub + nodes?" — Hub yes; Dynamic Grid spawning Docker no. Use ECS replica nodes or EKS.
- Trap: "EKS because Kubernetes is on my resume" for a 10-minute API suite.
- Windows containers — niche, expensive; Device Farm/BrowserStack often cheaper.
- Fargate ephemeral disk full — videos on S3 streaming, not local retain-all.

**Senior/lead angle** — Ops hours × salary versus Fargate premium versus EKS already-paid. Revisit when concurrency 10×s. Do not run three compute planes "for flexibility."

**One-liner** — Fargate for low-ops Linux shards, EKS when you need kube-native Grid/KEDA and already operate a cluster, EC2 pets only as a last resort — pick from ops cost vs control, not fashion.

### Q6. AWS Device Farm vs Device Farm alternative; when you'd still buy BrowserStack.

**Interview answer** — Device Farm is AWS's real-device and desktop-browser farm: upload an app or point WebDriver/Appium at their devices, pay per minute. It sits in AWS billing and IAM, which procurement likes. I still buy BrowserStack (or Sauce, LambdaTest) when we need a larger device matrix, better live debugging UX, Playwright official cloud, tighter Appium stability, or Safari/iOS coverage that Device Farm's queue cannot meet. Self-hosted Grid covers Linux Chrome; it does not replace either for iOS.

**Deep dive** — Device Farm: private device slots (expensive, reserved), public device pool (queue waits — the flake-looking timeout). Desktop browser testing exists but is not the Playwright-native story; Appium/XCUITest/Espresso are the center. Artifacts land in S3. IAM fine-grained vs a vendor SSO. Alternatives: BrowserStack, Sauce Labs, LambdaTest, Firebase Test Lab (Android-centric), in-house labs (openstf, DeviceFarmer) — high ops. Decision: if the suite is Playwright Linux, Device Farm is the wrong layer (use ECR+Fargate). If Appium iOS/Android and the company is AWS-only procurement, Device Farm is a valid RFP answer — then run a spike on queue time at 9 a.m. and on WebDriver protocol quirks. Hybrid: Android on Device Farm or Firebase, iOS on BrowserStack if Device Farm iOS is the bottleneck. Cost: vendor minutes vs engineer maintaining a device lab vs Device Farm private devices idle.

**Code**

```bash
# Device Farm schedule (Appium) — sketch
aws devicefarm schedule-run \
  --project-arn "$DF_PROJECT" \
  --app-arn "$APP" \
  --device-pool-arn "$POOL" \
  --name "nightly-${GIT_SHA}" \
  --test type=APPIUM_JAVA_JUNIT,testPackageArn="$TEST_PKG"
```

**Follow-ups & traps**
- "Replace BrowserStack with Device Farm to save money?" — Only after a matrix and queue-time spike. License cost is often cheaper than SDET time.
- Trap: putting Playwright e2e on Device Farm because "it's AWS."
- Private devices 24/7 — same idle economics as a physical lab.
- Data residency / corporate devices — in-house or Device Farm private in-region.

**Senior/lead angle** — One page decision record: Linux browsers internal, iOS/Android vendor X, review annually. Do not dual-run two paid farms without a migration date.

**One-liner** — Device Farm is AWS-native real devices with IAM/S3; BrowserStack still wins on matrix, Playwright, and UX — use Device Farm when procurement and Appium-on-AWS beat those, not as a Playwright host.

### Q7. CodeBuild / CodePipeline vs Jenkins-on-EC2 vs GitHub Actions + OIDC to AWS.

**Interview answer** — **Actions + OIDC** is the default if the code is on GitHub: no AWS keys, matrix/sharding native, role per environment (`question-bank/cicd/03`). **Jenkins on EC2/EKS** when the org already lives there, needs plugins, or cannot send code to GitHub-hosted runners — then the controller is a pet (file 04) and agents should be cloud. **CodeBuild** is AWS-native containers-as-a-build: fine for compiling and running tests inside AWS VPC without GitHub minutes, awkward for a rich plugin ecosystem. **CodePipeline** is the orchestrator in front of CodeBuild/CodeDeploy — I use it when the CD path is already AWS; I do not introduce it just to run Playwright.

**Deep dive** — TCO: Actions minutes vs CodeBuild compute vs Jenkins people. VPC: CodeBuild and Jenkins-in-VPC reach private QA easily; GitHub-hosted runners need a self-hosted runner in the VPC or public ingress. OIDC: CodeBuild can use a service role (clean); Jenkins needs instance profile + per-job assume role discipline. Caching: CodeBuild cache (S3/local), Actions cache, Jenkins disk — all three work; BuildKit registry cache is shared (file 01 Q10). Compliance: some orgs forbid GitHub-hosted; then CodeBuild or self-hosted Actions/Jenkins in-VPC. Pipeline-as-code: Jenkinsfile / workflow YAML / `buildspec.yml` — spec is YAML steps, not Groovy. Mixing: Actions for PR UI tests, CodeBuild for a heavy in-VPC integration job — two systems is a cost; justify. Failure: CodePipeline artifact size limits; CodeBuild 8-hour cap; Jenkins disk.

**Code**

```yaml
# buildspec.yml — CodeBuild running the golden image
version: 0.2
env:
  variables: { CI: "true" }
phases:
  build:
    commands:
      - npx playwright test --shard=$CODEBUILD_BATCH_BUILD_IDENTIFIER
      - aws s3 sync playwright-report s3://qa-e2e-artifacts/$CODEBUILD_BUILD_ID/html/
```

**Follow-ups & traps**
- "Which is best?" — Constraints first: VCS host, VPC, staff, compliance. Same shape as Jenkins vs Actions in `question-bank/cicd/02`.
- Trap: CodePipeline + six CodeBuild projects as a Jenkins clone — you will miss shared libraries.
- GitHub-hosted vs private QA — security groups (Q14) will fail the suite; name it.
- Jenkins keys in credentials.xml vs OIDC — migration story (file 04 Q7).

**Senior/lead angle** — Pick one *orchestrator* and one *runner farm*. Dual CI is allowed during migration only. OIDC everywhere; long-lived keys are a finding.

**One-liner** — Actions+OIDC if GitHub is home; CodeBuild when the build must live in AWS VPC without GH runners; Jenkins when the org already operates it — don't add CodePipeline just to host Playwright.

### Q8. Secrets Manager vs SSM Parameter Store vs hardcoded env — rotation, cost, how tests fetch at runtime.

**Interview answer** — Hardcoded env in Git or Dockerfile is a failing answer. **SSM Parameter Store** (`SecureString`) is cheap and enough for a handful of QA passwords. **Secrets Manager** adds rotation Lambdas, cross-account sharing, and audit — use it for shared test users, third-party tokens, and anything that must rotate. Tests fetch at **runtime**: SDK, `aws secretsmanager get-secret-value`, External Secrets into k8s, Jenkins plugin — then inject as env for the process. Cache in-memory per Job, not on disk in the image.

**Deep dive** — Cost: Secrets Manager ~$0.40/secret/month + API; SSM Standard parameters are free-ish, Advanced cost money; high `GetSecretValue` rates from 4,000 shards starting at once can throttle and bill — batch a sidecar or bake *non-secret* config. Rotation: Secrets Manager can rotate RDS passwords; test users in IdP need a job that updates the secret then invalidates storageState (`question-bank/architecture-lead/03-environments-and-secrets.md`). Versioning: pin a secret version in prod-like, `AWSCURRENT` in QA. IAM: resource ARNs, not `*`. ECS: secrets injected by the agent from SM/SSM — they never sit in task def JSON as plaintext if you use `secrets:` keys. Failure: 5 rps burst throttle at shard start — exponential backoff. JSON secret blobs vs one param per key — one JSON is fewer API calls.

**Code**

```bash
# Job entrypoint
export TEST_USER_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id qa/e2e/users --query SecretString --output text | jq -r .password)
exec npx playwright test
```

```json
"secrets": [
  { "name": "TEST_USER_PASSWORD", "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:qa/e2e/users:password::" }
]
```

**Follow-ups & traps**
- "SSM or Secrets Manager?" — SSM for cheap static QA flags; SM for rotation and third-party. Both beat `.env` in Git.
- Trap: `echo $PASSWORD` in `set -x` bash — CloudWatch has the secret (Q9).
- Rotation breaking storageState — version the auth files by secret version id.
- 80 shards × GetSecretValue at t=0 — cache on a sidecar or ECS injection.

**Senior/lead angle** — Org secret taxonomy: which store, rotation owner, who can read QA vs staging. CI roles listed. A secrets inventory is a lead deliverable.

**One-liner** — Runtime fetch from SSM (cheap) or Secrets Manager (rotation), inject into the task, never images or Git — and throttle-aware at shard start.

### Q9. CloudWatch logs/metrics/alarms for test platform health (suite duration, flake, job failures).

**Interview answer** — The platform is a product; CloudWatch (or Prometheus+CloudWatch) is its health. Logs: suite stdout in `/e2e/{suite}` with run_id dimensions. Metrics: custom `E2E.Duration`, `E2E.Failed`, `E2E.OOM`, `E2E.QueueWait` from the Job controller or a reporter. Alarms: failure rate, p95 duration SLO, Fargate/EKS Pending time, S3 4xx, Secrets Manager throttle. Flake is not a CloudWatch primitive — export JUnit to a warehouse (`question-bank/cicd/05`) and alarm on a metric you compute.

**Deep dive** — awslogs driver vs FireLens vs Grafana Loki — pick one. Cardinality: do not put test *name* as a metric dimension (explodes). Dimensions: suite, branch_type (pr|main|nightly), cluster. Container Insights on EKS/ECS for CPU throttle (the flake impostor). Grid: poll GraphQL and `PutMetricData` session-queue-depth. Alarms to Slack with the presigned report URL. Cost: CloudWatch logs ingestion is the surprise — sample debug logs, keep error always, expire 14d. X-Ray on tests is usually noise; X-Ray on the *app* during e2e is gold for "is it the suite or the service."

**Code**

```bash
aws cloudwatch put-metric-data --namespace E2E --metric-name DurationSeconds \
  --dimensions Suite=checkout,Trigger=pr --value "$SECONDS"
```

```hcl
resource "aws_cloudwatch_metric_alarm" "e2e_fail" {
  alarm_name          = "e2e-checkout-fail-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Failed"
  namespace           = "E2E"
  period              = 300
  statistic           = "Sum"
  threshold           = 3
  alarm_actions       = [aws_sns_topic.qa_alerts.arn]
}
```

**Follow-ups & traps**
- "How do you alarm on flakes?" — Not on a single red; on retries-that-then-pass extracted from JUnit over a window.
- Trap: logging every Playwright console line at INFO — million-dollar log bill.
- Missing OOM metric — you will treat infra as test flake forever.
- Alarm without report link — unactionable.

**Senior/lead angle** — SLO dashboard: queue wait, duration, flake, cost/run, artifact upload failures. Review weekly with squads. This is how you justify platform headcount.

**One-liner** — Log suites by run_id, emit low-cardinality metrics (duration, fail, OOM, queue), alarm with a report link — flake lives in a warehouse, not in a naive Failed=1 alarm.

### Q10. CloudFront + S3 for HTML report hosting (auth problem — don't make reports public).

**Interview answer** — S3 website + public bucket is the trap: Playwright reports are QA screenshots and sometimes tokens in localStorage dumps. CloudFront in front of the private bucket with **OAC** (origin access control) keeps S3 closed. Auth: CloudFront signed URLs/cookies, or an SSO-aware Lambda@Edge / CloudFront Function, or put the distribution behind your VPN/ALB+OIDC. I default to **presigned S3** (Q3) for PR comments; I add CloudFront when we need a stable hostname, caching, and TLS for a report portal.

**Deep dive** — OAI is legacy; OAC is current. Bucket policy allows only the distribution. Caching: HTML reports have unique prefixes per run — cache long; `index.html` at `/latest/` must not cache. The auth gap: CloudFront does not do Google SSO by itself. Patterns: (1) signed cookies after a small auth app; (2) AWS Verified Access / Cognito; (3) only reachable via client VPN; (4) skip CloudFront and presign. Jenkins `publishHTML` CSP issues (`question-bank/cicd/05`) are why people jump to S3+CF. Failure: `/*` public because "it's QA"; search indexes the bucket. Cost: CF is cheap; invalidations are not if you reuse `/latest/`.

**Code**

```hcl
resource "aws_cloudfront_origin_access_control" "reports" {
  name                              = "e2e-reports"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
# distribution + bucket policy omitted for brevity — S3 remains private
```

```bash
# Still often simpler than CF auth:
aws s3 presign s3://qa-e2e-artifacts/shop/123/html/index.html --expires-in 7200
```

**Follow-ups & traps**
- "Just tick public-read for speed?" — That's the fail. Screenshots of customer-like data.
- Trap: CloudFront without OAC and with a public bucket "because CF is the CDN."
- `/latest` cached 24h — people debug yesterday's run.
- Playwright report JS + CSP — CF doesn't strip JS the way Jenkins does; that's a reason to host here.

**Senior/lead angle** — Report portal as a product: SSO, prefix listing, retention UX. Until then, presign. Security review required before any public distribution.

**One-liner** — CloudFront+OAC serves private S3 reports with TLS; auth is signed URLs/cookies or SSO — never public-read, and presign is enough until you need a portal.

### Q11. RDS / Aurora as a test DB; snapshots to seed ephemeral envs; cost of leaving them up.

**Interview answer** — Shared QA RDS is the warm, drift-prone default. Better for PR isolation: restore a **snapshot** (or Aurora clone) into an ephemeral instance/cluster, run migrations, run tests, snapshot-destroy. Aurora clone is fast and copy-on-write cheap at first; RDS snapshot restore is slower and you pay a full instance while it lives. Leaving `r6g.large` up 24/7 for a suite that runs 2 hours is the classic waste — stop/start, serverless v2 with a floor, or destroy-after-job.

**Deep dive** — Seed strategies: anonymized prod snapshot (legal!), checked-in dump (small), factory data in tests (best isolation). PITR accidentally on in QA = storage bill. Multi-AZ for a test DB is usually waste. Publicly accessible RDS + `0.0.0.0/0` is how the internet becomes a test user. Schema migrate once per ephemeral, not per test. Parallel tests vs one DB: namespacing (`question-bank/architecture-lead/02`). Aurora Serverless v2: scales with connections — Playwright 80 shards opening pools will wake the cluster and the bill. Connection storms: PgBouncer. Failure: snapshot restore 20 minutes kills the 12-minute SLO (Q16) — then use clones or a warmed pool of DBs. Cost: instance hours + storage + IOPS + snapshots kept "just in case."

**Code**

```hcl
resource "aws_db_instance" "qa" {
  identifier          = "shop-qa"
  instance_class      = "db.t4g.medium"
  allocated_storage   = 50
  skip_final_snapshot = true
  publicly_accessible = false
  deletion_protection = false
  tags = { Purpose = "qa", Owner = "quality" }
}
```

```bash
# ephemeral from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "pr-${PR}" \
  --db-snapshot-identifier shop-qa-anon-nightly
# ... migrate, test ...
aws rds delete-db-instance --db-instance-identifier "pr-${PR}" --skip-final-snapshot
```

**Follow-ups & traps**
- "Clone vs snapshot restore?" — Aurora clone is fast COW; snapshot restore is a new volume. Know which engine you have.
- Trap: Multi-AZ + 30-day backup on a throwaway PR database.
- Prod snapshot in QA without masking — compliance fail.
- Tests creating data and never deleting on shared RDS — the flake factory.

**Senior/lead angle** — Env team owns the seed pipeline (mask + snapshot). Platform TTL-deletes instances. Spreadsheet instance-hours vs clone. This is where SDET and SRE contracts meet.

**One-liner** — Prefer Aurora clones or snapshot-restore for ephemeral DBs, never public, destroy or stop when idle — a 24/7 RDS for a 2-hour nightly is a budget bug.

### Q12. Lambda for lightweight API synthetic checks / webhook receivers.

**Interview answer** — Lambda is for **seconds-scale** work: HTTP synthetics against `/health` and a couple of critical APIs, Device Farm/Jenkins webhooks, S3 "report uploaded" merge triggers, Slack slash commands. It is not for Playwright Chromium (cold start, 15-minute cap, no sane `/dev/shm`). Schedule with EventBridge. Package as container if deps are fat, zip if tiny. IAM role least privilege to the target URL/VPC.

**Deep dive** — Synthetics: CloudWatch Synthetics (canaries) is Lambda under the hood with a Chrome (broken for heavy e2e). Use canaries for availability, Playwright farm for journeys. Webhooks: GitHub → API Gateway → Lambda → enqueue SQS for a Job (K8s Q7) so GitHub gets 200 fast. VPC-attached Lambda to hit private QA: ENI cold starts — keep a provisioned concurrency only if SLO requires. Cost: requests are pennies; provisioned concurrency is not. Failure: 3s GitHub webhook timeout vs Lambda in VPC 10s cold start — always enqueue. Observability: structured logs, not `print`.

**Code**

```python
# synthetic API check
import json, os, urllib.request

def handler(event, _ctx):
    url = os.environ["HEALTH_URL"]
    with urllib.request.urlopen(url, timeout=5) as r:
        body = json.loads(r.read().decode())
    if body.get("status") != "UP":
        raise RuntimeError(body)
    return {"ok": True}
```

```hcl
resource "aws_cloudwatch_event_rule" "health" {
  schedule_expression = "rate(1 minute)"
}
```

**Follow-ups & traps**
- "Run the full e2e in Lambda?" — No. Time, browser, shm.
- Trap: webhook Lambda does the 8-minute suite inline.
- Canaries vs Playwright — different layers of the pyramid.
- Secrets in Lambda env console — still visible to anyone with `GetFunction`; use SM.

**Senior/lead angle** — Synthetics are the always-on smoke; the farm is the deep suite. Same dashboard, different SLO (1 min vs 12 min).

**One-liner** — Lambda for health synthetics and fast webhooks (enqueue the heavy work); not for Playwright — EventBridge to schedule, SQS to decouple.

### Q13. SQS/SNS/EventBridge — testing async systems; how SDETs assert eventual consistency.

**Interview answer** — Async products (orders → SQS → worker → SNS → email) cannot be asserted with a single HTTP 200. I test at three layers: (1) **unit/contract** of producer/consumer schemas, (2) **component** tests that put a message on a test queue and assert the worker's side effect (DB row, S3 object) with a poll/`expect.poll`/`Awaitility`, (3) **e2e** that trigger the real EventBridge rule in QA and wait with a timeout budget. I never `sleep(30)` as the design. I isolate with dedicated queues/prefixes per run_id so parallel tests do not steal messages.

**Deep dive** — SQS: visibility timeout vs test timeout — too short, duplicate processing flakes; too long, failed tests hold messages. FIFO vs standard: ordering and dedup. Poison: DLQ depth as a quality metric (Q9). SNS: fan-out — assert each subscriber, or assert an audit table the platform writes. EventBridge: matching rules are the bug farm — archive + replay in QA. Isolation: `MessageGroupId` / attributes `run_id`; consumers filter. Local: LocalStack vs ElasticMQ vs in-memory fakes — contract tests against schemas (EventBridge schema registry). Failure: e2e waits 5s, prod lag 15s under load — SLO of the *async path* must drive the wait, with telemetry. Cost: SQS is cheap; millions of test messages still show up.

**Code**

```java
// Awaitility — Java SDET classic
Awaitility.await()
    .atMost(Duration.ofSeconds(20))
    .pollInterval(Duration.ofMillis(300))
    .until(() -> orderRepo.findByIdempotencyKey(key).isPresent());
```

```ts
await expect.poll(async () => {
  const r = await api.get(`/orders/${id}`);
  return r.status();
}, { timeout: 20_000 }).toBe(200);
```

```bash
aws sqs send-message --queue-url "$QA_ORDER_Q" \
  --message-body '{"orderId":"'"$ID"'","runId":"'"$RUN"'"}' \
  --message-attributes "runId={DataType=String,StringValue=$RUN}"
```

**Follow-ups & traps**
- "How long to wait?" — From the consumer SLO + slack, not a lucky number. Alert if tests need more than the SLO.
- Trap: sharing one QA queue without filters — cross-talk flakes.
- Asserting only "message sent" — you tested the producer, not the business.
- EventBridge rule deployed differently in QA — contract-test the rule.

**Senior/lead angle** — Eventual consistency tests are a first-class suite with a time budget and DLQ monitoring. They sit beside API and UI, not inside a 30s UI sleep.

**One-liner** — Isolate with per-run queues/attributes, poll the *side effect* within the consumer SLO, watch DLQs — sleep is not an assertion.

### Q14. VPC basics an SDET must know (private QA, NAT, security groups blocking tests — the "works locally" AWS edition).

**Interview answer** — A VPC is a private network. QA apps often live in **private subnets**: no public IP, egress through a **NAT Gateway** (or IPv6 egress-only), ingress only from an ALB/VPN/other SG. **Security groups** are stateful firewalls: the test runner's SG must be allowed on the app's SG on the port, and the runner needs egress 443 to ECR/S3/Secrets Manager (or **VPC endpoints** so you skip NAT). "Works on my laptop, times out in CI" on AWS is usually SG, NACL, missing NAT, or DNS to a private hosted zone the runner isn't in.

**Deep dive** — Public vs private subnet: route table to IGW vs to NAT. GitHub-hosted runners live on the public internet — they cannot hit a private ALB. Fixes: self-hosted runner/CodeBuild/Fargate *in* the VPC, or a public auth-protected endpoint. SG: default deny inbound; people open `0.0.0.0/0` on RDS "temporarily." SG referencing SG (`sg-app` allows 8080 from `sg-e2e`) is the correct pattern. NACLs: stateless, rarely needed; a bad NACL is a ghost. Endpoints: S3/ECR/SM gateway/interface endpoints cut NAT cost and avoid the internet. Split-horizon DNS: `qa.internal` only in-VPC. IPv6: dual-stack surprises. Cost: NAT Gateway hourly + per-GB — 80 shards pulling Playwright images through NAT is a horror story; use ECR in-VPC endpoint.

**Code**

```hcl
resource "aws_security_group_rule" "app_from_e2e" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  security_group_id        = aws_security_group.app.id
  source_security_group_id = aws_security_group.e2e.id
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.qa.id
  service_name = "com.amazonaws.us-east-1.s3"
  route_table_ids = [aws_route_table.private.id]
}
```

```bash
# from the test task: am I blocked?
curl -sv --max-time 5 https://shop.qa.internal:8080/health
# vs
curl -sv --max-time 5 https://shop.public.example.com/health
```

**Follow-ups & traps**
- "Timeout from GHA to `http://10.0.x.x`" — that's private IP on the internet. Architecture, not a test bug.
- Trap: opening RDS 5432 to `0.0.0.0/0` so "Jenkins can connect."
- NAT bill — endpoints for S3/ECR.
- `localhost` in Fargate is the task, same as Docker (file 01 Q7).

**Senior/lead angle** — Network design is part of the test platform: in-VPC runners for private QA, endpoints for AWS APIs, SG pairs, no public RDS. Document the URL matrix (in-cluster, private DNS, public edge).

**One-liner** — Private QA needs in-VPC runners, SG-to-SG rules, and NAT or VPC endpoints — timeouts that "work locally" are almost always network, not Playwright.

### Q15. Cost attribution: tagging test resources, budgets, the runaway Grid that cost $10k.

**Interview answer** — Every test resource gets tags: `Purpose=e2e`, `Suite`, `Owner`, `Env=qa`, `KeepAlive=true|false`. Activate cost allocation tags. **Budgets** (and anomaly detection) alarm Slack at 50/80/100% of the monthly QA compute budget. The $10k Grid is always the same story: unbounded autoscaling, on-demand 24/7 node group, public IPs, NAT egress for image pulls, leftover LoadBalancers/`pr-*` RDS, no `maxReplicaCount`. Caps and TTLs are cost controls, not pessimism.

**Deep dive** — Attribution: EKS is hard (shared nodes) — Kubecost/OpenCost or split node pools per `intent=e2e`. Fargate is easy (task tags). S3 inventory by prefix. NAT: one NAT for the VPC hides e2e vs app — separate NAT or endpoints. Reserved Instances on a 24/7 Grid you should have deleted are the worst of both worlds. Showback to squads: dollars per green main build. Incident postmortem template: graph of `RunningTasks`/`pod_count` vs time, the missing max, the weekend it ran. Prevention: KEDA max, Jenkins executor cap, AWS Service Quotas, `aws-nuke` on playground accounts, Lambda janitor for `KeepAlive=false` older than 24h.

**Code**

```hcl
resource "aws_budgets_budget" "qa_e2e" {
  name         = "qa-e2e"
  budget_type  = "COST"
  limit_amount = "1500"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  cost_filter { name = "TagKeyValue" values = ["user:Purpose$e2e"] }
}
```

```text
$10k Grid autopsy (typical)
  - minSize=12 m5.2xlarge on-demand, never scaled in
  - Dynamic Grid no TTL on session pods
  - videos to emptyDir → then EBS snapshots
  - NAT GB for selenium/node-chrome pulls
  - no budget alarm
```

**Follow-ups & traps**
- "Whose budget?" — Platform owns the farm SLO; squads own *their* `Suite` tag overage. Shared node pools need Kubecost.
- Trap: untagged "temporary" stacks. Deny untagged via policy in sandbox.
- Spot saved the day but hid a 500-pod bug — still alarm on *count*, not only dollars.
- Weekend runaway — anomaly detection, not only monthly budget.

**Senior/lead angle** — You are accountable for a number. Caps, tags, janitors, weekly review. This question is how they find out if you have been on-call for money.

**One-liner** — Tag Purpose/Suite/Owner, budget-alarm QA spend, cap autoscaling and TTL everything — the $10k Grid is unbounded nodes plus no alarm.

### Q16. Design: "Run 4,000 Playwright tests on AWS in 12 minutes" — architecture (ECR image, ECS/EKS jobs sharded, S3 artifacts, CloudWatch, IAM). Worked answer.

**Interview answer** — Do the math aloud, then the architecture. 4,000 tests × 20 s average ≈ 1,333 test-minutes. In 12 minutes you need ≈ 111 parallel test-minutes per wall-minute → about **56 shards × 2 workers** (or 28×4) if tests are even — plus ~1–2 minutes overhead, so target **64 shards** and a 10-minute test budget. Image lives in **ECR** (digest-pinned Playwright golden). CI (Actions OIDC or Jenkins) assumes an **IAM role**, launches **64 ECS Fargate tasks or EKS Indexed Jobs** with shm, 2 vCPU / 4 GiB, spot if EKS. Each shard writes blob reports to **S3**. A merge task builds HTML, presigns the URL, emits **CloudWatch** duration/fail/OOM. Idle capacity scale-to-zero.

**Deep dive** — Bottlenecks that blow 12 minutes: (1) **imbalance** — one 8-minute test sets the floor; split or quarantine it. (2) **cold start** — image pull; pre-pull DaemonSet or keep a tiny warm pool; ECR in-region + endpoint. (3) **scheduling** — Fargate account limits, EKS Pending waiting for Karpenter (2–4 min) — start scale-up at workflow start, not after `npm ci`. (4) **auth/data** — storageState + API factories, not UI signup × 4000. (5) **secrets stampede** — ECS injection. (6) **S3 merge** of 64 blobs — seconds, not minutes. (7) **target env** — 64 shards against one tiny RDS will melt QA; isolate data or scale the app. Not in 12 minutes: restoring RDS from snapshot (Q11); `playwright install` at runtime; building the image on each shard. Cost sketch: 64 × 12 min × 2 vCPU Fargate ≈ 25 vCPU-hours per run; × 20 PR runs/day is real money — cache, skip unaffected projects, don't run 4,000 on every docs PR. IAM: launch tasks, pass task role, put S3, ecr pull. Failure SLO: retry only failed shards; don't rerun 4,000.

**Code**

```text
worked capacity
  4000 tests × 20s = 80000 s ≈ 1333 test-min
  12 min wall × 80% efficiency ≈ 9.6 min compute
  1333 / 9.6 ≈ 139 worker-minutes/min → 70 workers
  64 shards × 2 workers = 128 workers  (headroom for skew)
  slowest test must be << 9 min or the SLO is impossible
```

```yaml
# EKS Indexed Job (see 02-kubernetes Q2) — 64 completions
spec:
  completions: 64
  parallelism: 64
  completionMode: Indexed
```

```bash
# merge
aws s3 sync "s3://qa-e2e-artifacts/shop/${RUN}/blobs/" ./blobs
npx playwright merge-reports --reporter html,junit ./blobs
aws s3 sync ./playwright-report "s3://qa-e2e-artifacts/shop/${RUN}/html/"
aws cloudwatch put-metric-data --namespace E2E --metric-name DurationSeconds --value "$SECONDS"
```

```hcl
# IAM task role already in Q2; add ecs:RunTask + iam:PassRole on the task role only
```

**Follow-ups & traps**
- "Why not 1,000 workers?" — App/DB saturation, ECR rate, account Fargate limits, diminishing returns, cost. 64–80 is the usual first target.
- Trap: 12-minute SLO including `docker build` and `npm ci` without a prebuilt image.
- Uneven shards — file-level Playwright shard skew; measure, then `--shard` plus splitting slow files.
- Green in 12 minutes against a mock, 40 against QA — env capacity is part of the design.

**Senior/lead angle** — This is a capacity + economics problem: worker math, env scalability, cold start, cost per PR, and a dashboard. The staff answer names the slowest-test ceiling and the QA-backend bottleneck without being asked.

**One-liner** — Pin a golden ECR image, fan out ~64 shm-sized Fargate/EKS shards via an IAM role, merge blobs on S3 in a final task, watch duration/OOM in CloudWatch — 12 minutes is worker-math plus a pre-pulled image, not a bigger timeout.
