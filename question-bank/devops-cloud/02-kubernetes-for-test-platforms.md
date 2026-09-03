# Kubernetes for Test Execution Platforms

Docker on a daemon gets you parity; Kubernetes is how a platform team rents *elastic, isolated, disposable* compute for tests. The CI/CD track (`question-bank/cicd/04-docker-for-test-automation.md` Q12) only teases K8s. This file is the interview: workload kinds, QoS/OOM, secrets, Grid alternatives (Moon/Selenoid/Callisto), KEDA, NetworkPolicies, artifact strategy, namespaces, cost, a lead-level platform design, and Helm/Kustomize. For Jenkinsfile/Actions syntax see `question-bank/cicd`; for Docker shm/PID 1/images see `question-bank/devops-cloud/01-docker-deep-dive.md`.

- Q1. Why Kubernetes for tests? When it is overkill
- Q2. Pod, Deployment, Job, CronJob, StatefulSet — which for test runs
- Q3. Requests vs limits, QoS, OOMKilled tests that look like flakes
- Q4. ConfigMaps vs Secrets vs external secret stores
- Q5. Running Playwright/Selenium on Kubernetes
- Q6. Selenium Grid on K8s / Moon / Selenoid / Callisto
- Q7. Autoscaling test runners (KEDA, cluster-autoscaler, pending pods)
- Q8. Networking: Services, Ingress, in-cluster vs public QA, NetworkPolicies
- Q9. Persistent volumes for reports vs S3 and discarding pods
- Q10. Debugging a failed Job
- Q11. Namespace strategy for QA vs ephemeral PR environments
- Q12. Cost control (spot, limit ranges, idle clusters)
- Q13. Lead: design a test platform on K8s
- Q14. Helm / Kustomize for test infra as code

### Q1. Why K8s for tests? (ephemeral runners, scale-to-zero, isolation) When it's overkill.

**Interview answer** — Kubernetes earns its keep for tests when we need three properties at once: ephemeral isolation (a pod is a clean machine that dies), elastic capacity (the node pool grows for the 9 a.m. PR rush and shrinks at night), and scheduling isolation (requests/limits, namespaces, NetworkPolicies). The patterns are ephemeral CI agents (Jenkins Kubernetes plugin, Actions runner controller) and explicit fan-out (a Job per shard). It is overkill when a handful of GitHub-hosted runners or a docker-compose stack already meet SLO — then you bought etcd, CNI, upgrades, and an on-call rotation to run a nightly suite.

**Deep dive** — What K8s uniquely provides versus "more Docker hosts": a scheduler that bin-packs heterogeneous pods (API tests 0.2 CPU, Playwright 2 CPU), declarative Jobs with backoff and completion counts, cluster autoscaler / Karpenter reacting to pending pods, multi-tenant RBAC, and a Service DNS that looks like production. Scale-to-zero: with KEDA (Q7) or by simply not running Deployments for tests, idle cost is the control-plane plus whatever node floor you keep. Isolation: each suite can be a NetworkPolicy-constrained namespace; a runaway Grid cannot scrape staging Redis if you did the policies. Costs you inherit: platform engineering (upgrades, CNI, storage classes, ingress controllers), cold-start (image pull + node scale 2–8 minutes unless you warm), and failure modes that look like flakes (preemption, NotReady nodes, imagePullBackoff). Decision test: if queue time is chronic *after* sharding and caching, and the org already runs EKS/GKE/AKS, put test workloads on it. If the QA team would be the first K8s tenant, do not start here — rent GHA/Buildkite and ship features. Build-vs-lease: ephemeral runners on the platform team's cluster is the usual win; a "QA cluster" with no owners is a graveyard.

**Code**

```text
use K8s when ≥2 of:
  - peak concurrency >> average (PR storms)
  - need per-PR app+db+tests isolation
  - org already has a platform cluster + on-call
avoid when:
  - < ~50 container-hours/day and no cluster exists
  - suite is 10 minutes on 2 GHA runners
  - nobody can explain NetworkPolicy or LimitRange
```

**Follow-ups & traps**
- "40-minute CI queue — is K8s the fix?" — Elastic capacity might be; first prove shards, image pull cache, and runner size. K8s does not make tests faster, it makes waiting for machines shorter.
- Trap: proposing a dedicated cluster for one team's nightly. Overkill judgment is part of the grade.
- "Spot nodes?" — Yes for retry-tolerant shards (Q12); not for the controller or a one-shot release gate without retry.
- "Does Playwright need K8s?" — No. It needs N machines. K8s is one way to mint them.

**Senior/lead angle** — Frame TCO: platform team already operating EKS vs QA operating Docker VMs vs vendor CI minutes. The lead answer is a spreadsheet and an on-call chart, not a pod YAML.

**One-liner** — K8s is ephemeral isolation plus elastic scheduling for test compute — buy it when the org already runs a cluster and queues hurt; skip it when compose or hosted runners already meet the SLO.

### Q2. Pod, Deployment, Job, CronJob, StatefulSet — which you use for test runs (Job/CronJob, not Deployment).

**Interview answer** — A Pod is the unit: one or more containers sharing net/IPC/volumes. Test *runs* are finite batch work, so the API is **Job** (run N pods to completion) and **CronJob** (create a Job on a schedule). A Deployment is for long-running services that should be restarted forever — using it for Playwright means a crash loops the suite, `kubectl rollout` semantics are meaningless, and you never get a completion object. StatefulSet is for identity + stable storage (a test DB you pretend is production-like, or Grid components that need sticky disks) — not for shards. The app under test in an ephemeral namespace might be a Deployment; the suite still is a Job.

**Deep dive** — Job: `spec.completions`, `parallelism`, `backoffLimit`, `ttlSecondsAfterFinished`, `activeDeadlineSeconds`. Indexed Jobs (`completionMode: Indexed`) give `JOB_COMPLETION_INDEX` for `--shard=$((i+1))/N`. `backoffLimit: 0` if you do not want kube retrying a failed suite (Playwright already retried tests). `ttlSecondsAfterFinished` so pods do not pile forever — but TTL before artifact upload is a race (Q9). CronJob: `concurrencyPolicy: Forbid` for nightlies so a long run does not overlap; `startingDeadlineSeconds` if the controller was down. Never `Replace` for tests unless you accept killed mid-suite. Deployment: restartPolicy always Always; a test container that exits 1 gets restarted — "infinite flake generator." Some shops run a *worker pool* Deployment that pulls from a queue (SQS/KEDA); that is a platform, not "a Deployment of Playwright." StatefulSet: ordinal DNS (`pg-0.test-db`), PVCs — seed data snapshots (AWS file Q11) live here. DaemonSet: node exporters, maybe buildkitd, not tests. Grid hub: Deployment (or StatefulSet if the session map is local disk — prefer Redis and a Deployment). Grid nodes: often Deployment + HPA or a Job/KEDA ScaledJob. `restartPolicy` on Job pods must be `Never` or `OnFailure` — `Always` is invalid.

**Code**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: checkout-e2e-${RUN_ID}
  labels: { suite: checkout, run: "${RUN_ID}" }
spec:
  completions: 8
  parallelism: 8
  completionMode: Indexed
  backoffLimit: 0
  activeDeadlineSeconds: 2400
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: e2e-runner
      containers:
        - name: playwright
          image: ghcr.io/org/e2e-pw@sha256:4f3c…
          args: ["npx", "playwright", "test", "--shard=$(SHARD)", "--reporter=blob"]
          env:
            - name: SHARD
              value: "$(JOB_COMPLETION_INDEX+1)/8"  # see note: use a wrapper script
```

Indexed shard env is cleaner with a small bash wrapper because kube does not evaluate arithmetic in `env.value`. CronJob wraps the same Job template with `schedule: "H 3 * * *"` — the `H` is Jenkins; K8s wants standard cron (`30 3 * * *`) plus `timeZone` if supported.

**Follow-ups & traps**
- "Why not a Deployment with replicas=8?" — Restarts, no completion, no indexed shard, `kubectl wait --for=condition=complete` does not exist. This is the trap.
- Trap: `backoffLimit: 6` (the default) silently reruns a red suite and wrecks Allure plus billing.
- "StatefulSet for tests because we need reports on disk?" — That's a PVC anti-pattern (Q9). Upload and die.
- Cron overlap on month-end long runs — `Forbid` vs missed SLAs; alert on `LastScheduleTime`.

**Senior/lead angle** — The platform API should mint Jobs, not ask teams to pick kinds. If someone needs a Deployment, they are building a worker service — different product, different SLO.

**One-liner** — Tests are Jobs (and CronJobs); Deployments are for services that must stay up; StatefulSets are for sticky identity like DBs — never loop a suite with a Deployment.

### Q3. Requests vs limits, QoS, OOMKilled tests looking like flakes.

**Interview answer** — `requests` are what the scheduler reserved; `limits` are the cgroup cap. CPU over limit is throttle (timeouts); memory over limit is OOMKilled (exit 137, `Page crashed`). QoS: Guaranteed (request=limit for every container) is least evicted; Burstable (request < limit) is the usual test pod; BestEffort (none) is first to die under pressure. Under-requesting packs too many Playwright pods on a node — they stay under limit but starve — classic CI-only flakes. Over-requesting wastes money and leaves pods Pending.

**Deep dive** — Scheduler only looks at **requests**. A node with 8 Gi allocatable and eight pods requesting 512 Mi will co-locate them even if each wants to burst to 4 Gi; then they fight and OOM or throttle. Eviction: kubelet evicts based on actual usage vs requests when the node is under memory pressure — Burstable pods above request are targets. Spot/preemptible: preemption looks like random SIGTERM (Q4 in Docker file — tini + grace). `OOMKilled` is on the container status, not in Playwright's error message. Java heap vs cgroup: `UseContainerSupport`. shm emptyDir memory counts against the container's memory limit (Docker Q3). CPU CFS: `resources.limits.cpu: "1"` with 4 Playwright workers is the timeout machine. Right-size protocol: Vertical Pod Autoscaler in recommendation mode, or scrape `container_memory_working_set_bytes` for a week. LimitRange in the QA namespace (Q12) stops teams from omitting requests (BestEffort) or requesting 16 CPU "to be safe." QoS trap: set CPU limit = request for tests to get Guaranteed — then you cannot burst, and you pay for peak; Burstable with honest requests is usually better for tests. Failure mode: `FailedScheduling` vs running-but-flaky — Pending is visible; throttle is not.

**Code**

```yaml
resources:
  requests: { cpu: "2", memory: "4Gi" }
  limits:   { cpu: "2", memory: "5Gi" }   # memory headroom for shm + Chrome spike
volumeMounts:
  - { name: dshm, mountPath: /dev/shm }
volumes:
  - name: dshm
    emptyDir: { medium: Memory, sizeLimit: 1Gi }
```

```bash
kubectl get pod checkout-e2e-3-xyz -o jsonpath='{.status.containerStatuses[0].state.terminated}'
# reason=OOMKilled exitCode=137
kubectl describe pod checkout-e2e-3-xyz | grep -A2 'Last State'
```

**Follow-ups & traps**
- "Flaky timeouts only at 9 a.m." — node overcommit; look at CPU throttle metrics, not the test code.
- Trap: no requests "so they schedule faster" — BestEffort, first evicted, worst flakes.
- "Should limits equal requests?" — Memory often yes (predictable OOM vs eviction). CPU often request < limit *or* equal if you want Guaranteed and you measured.
- Exit 137 in Job but Playwright HTML missing — OOM mid-write; still upload partial artifacts.

**Senior/lead angle** — Publish the capacity card as a LimitRange + a documented `resources` snippet in the Helm chart. Treat OOMKilled count as an infra SLO. Cost conversations start from request-hours, not limit-hours (that's what you pay on most clouds).

**One-liner** — Requests schedule, limits cgroup; CPU over limit times out, memory over limit OOMKills — under-requesting packs starvation that looks like flakes.

### Q4. ConfigMaps vs Secrets vs external secret stores.

**Interview answer** — ConfigMaps hold non-confidential config (`BASE_URL`, tags, worker counts). Secrets hold credentials, but default K8s Secrets are base64 in etcd — obfuscation, not a vault. At scale I keep canonical secrets in AWS Secrets Manager, Vault, or GSM, and sync them into the cluster with External Secrets Operator or mount via CSI — short-lived, rotatable, auditable. Tests fetch at runtime (env or file); they never bake into the image (Docker Q11).

**Deep dive** — ConfigMap: `envFrom`, `configMapKeyRef`, or mounted files (Playwright config fragment). Updates do not automatically restart Jobs — Jobs are immutable anyway; next run sees the new map. Size limit ~1 MiB. Secrets: same API, different etcd encryption if you enabled encryption-at-rest (say whether you did). RBAC: a namespace-wide `get secrets` is how one team steals another's BrowserStack key — prefer per-suite ServiceAccounts. External: External Secrets Operator, Secrets Store CSI driver, Vault Agent injector. Rotation: CSI can refresh files; env vars will not refresh until a new pod — fine for Jobs. CI-created secrets (a Job that `kubectl create secret` from a pipeline) duplicates IAM — better: the pipeline assumes an AWS role (file 03 Q2) and the *pod* assumes an IRSA role to read the secret, no kube Secret at all. Failure modes: missing `optional: false` envFrom fails slowly; `optional: true` starts without `API_TOKEN` and tests 401-flake. Logging: `kubectl describe` does not print secret data; app logs might — redact. Cost: Secrets Manager per-secret + API calls; SSM cheaper; kube Secrets "free" until the audit finding.

**Code**

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: e2e-checkout }
data:
  BASE_URL: http://shop.qa.svc:8080
  WORKERS: "2"
---
# External Secrets → kube Secret (or skip kube and use CSI)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata: { name: e2e-checkout }
spec:
  refreshInterval: 1h
  secretStoreRef: { name: aws-secrets, kind: ClusterSecretStore }
  target: { name: e2e-checkout }
  data:
    - secretKey: BSTACK_KEY
      remoteRef: { key: qa/e2e/browserstack, property: accessKey }
---
# Job env
envFrom:
  - configMapRef: { name: e2e-checkout }
env:
  - name: BSTACK_KEY
    valueFrom:
      secretKeyRef: { name: e2e-checkout, key: BSTACK_KEY }
```

```bash
# Prefer: no kube Secret, IRSA
aws secretsmanager get-secret-value --secret-id qa/e2e/browserstack --query SecretString --output text
```

**Follow-ups & traps**
- "Are K8s Secrets encrypted?" — At rest only if you turned on encryption; in etcd they are base64 by default. Do not claim AES if you never configured it.
- Trap: ConfigMap for `DB_PASSWORD` "because it's QA." QA passwords leak to prod-shaped data.
- "How do tests get cloud creds?" — Pod IAM (IRSA/Workload Identity), not long-lived keys in Secrets.
- Fork PRs / untrusted Jobs — do not mount production secret stores into PR namespaces (Q11).

**Senior/lead angle** — One secret architecture for the org: external store + IRSA + External Secrets for things that must be env vars. Ban `kubectl apply -f secret.yaml` in Git. Rotation drills are the lead proof.

**One-liner** — ConfigMaps for non-secrets, real vaults for secrets, kube Secret only as a projection — Jobs pick them up at start, images never contain them.

### Q5. Running Playwright/Selenium on K8s: init containers for browsers? sidecars? using official images as Job.

**Interview answer** — Prefer the golden test image (file 01 Q15) as the **single Job container**: browsers already baked, `npx playwright test` or `mvn test` is the command. Init containers are for fetching config, waiting for the app Service, or hydrating credentials — not for `playwright install` (that destroys pinning and hammers the network). Sidecars: an artifact uploader (Q9), a video/VNC sidecar for Grid nodes, or a logging sidecar — not a second browser. Selenium: either RemoteWebDriver against a Grid Service, or Chrome in the same pod as the JVM (sidecar Chrome is possible but you then own Chrome lifecycle).

**Deep dive** — Init vs bake: `playwright install` in an initContainer duplicates 100+ MB per pod start, races the registry, and misses the image-tag contract. The only good "browser init" is copying a cached browser cache from a PVC — usually more pain than a fatter image pull with a node-local cache (containerd). `imagePullPolicy: IfNotPresent` plus a DaemonSet that pre-pulls the golden digest on nodes is the scale move. Waiting for the app: init `busybox` wget loop is inferior to the app's readiness + a short retry in the test runner; if you must, wait on `http://shop:8080/health`. Sidecar Chrome: `localhost:4444` WebDriver in-pod — used when you refuse Grid. Share `emptyDir` for `/dev/shm`? shm is per-container unless `shareProcessNamespace` + careful mounts — usually give each container its own memory emptyDir. Official Playwright image as Job: works; run as `pwuser`; set `CI=true`; mount shm; do not run as root. Selenium Java: JDK image with Chrome (file 01 Q2) as Job, or slim JVM + Grid. Resources: one browser-in-pod is easier to size than Grid. Failure: initContainer hangs → Job looks Pending forever; always `activeDeadlineSeconds`.

**Code**

```yaml
spec:
  template:
    spec:
      initContainers:
        - name: wait-app
          image: public.ecr.aws/docker/library/busybox:1.36
          command: ["sh", "-c", "until wget -qO- http://shop:8080/health; do sleep 2; done"]
      containers:
        - name: playwright
          image: mcr.microsoft.com/playwright:v1.46.0-jammy
          workingDir: /src
          command: ["npx", "playwright", "test"]
          env:
            - { name: CI, value: "true" }
            - { name: BASE_URL, value: "http://shop:8080" }
          volumeMounts:
            - { name: src, mountPath: /src }
            - { name: dshm, mountPath: /dev/shm }
            - { name: out, mountPath: /src/blob-report }
        - name: upload
          image: public.ecr.aws/aws-cli/aws-cli:2
          command: ["sh", "-c", "trap 'aws s3 sync /out s3://qa-artifacts/$RUN_ID' TERM; sleep infinity"]
          volumeMounts:
            - { name: out, mountPath: /out }
      volumes:
        - name: src
          emptyDir: {}
        - name: out
          emptyDir: {}
        - name: dshm
          emptyDir: { medium: Memory, sizeLimit: 2Gi }
```

In production the suite is already in the image; the `src` volume is only if you still checkout at runtime (slower, not recommended).

**Follow-ups & traps**
- "Init container to install Chrome?" — Anti-pattern. Bake or use official images.
- Trap: sidecar that uploads on a separate `command` that exits immediately — use `preStop` hook or make upload the Job's last container with a shared completion file, or upload from the test container in `post`.
- "shareProcessNamespace for Chrome zombie reaping?" — Optional; tini in the test image is simpler.
- Official image + `npm ci` in the Job — you just threw away layer cache; copy the suite in at image build.

**Senior/lead angle** — The paved road is `kind: Job` + golden image + S3 sidecar or native upload step. Init/sidecar exceptions are documented. Teams that `playwright install` in cluster get a platform ticket, not a blessing.

**One-liner** — Official/golden image as the Job container; init waits or fetches, it does not install browsers; sidecars upload artifacts or run VNC — Chrome-as-init is a smell.

### Q6. Selenium Grid on K8s / Moon / Selenoid / Callisto — landscape and trade-offs.

**Interview answer** — Four families. **Selenium Grid 4** on K8s (official Helm, Dynamic Grid with K8s provider) is the vendor path: Router/Distributor as Deployments, Nodes as pods per session or a pool. **Moon** (Aerokube, commercial) is a Kubernetes-native browser farm with good UX, video, and autoscaling — you pay license. **Selenoid** is Aerokube's older Docker-socket based farm — excellent on a VM, awkward as a K8s citizen (`docker.sock` again). **Callisto** (and similar) sits in front of Selenoid/Moon to allocate sessions from CI. I pick Grid 4 if we already speak W3C WebDriver and want OSS; Moon if the org will pay to not operate Dynamic Grid sharp edges; Selenoid only where a Docker host already exists and K8s is not the runtime.

**Deep dive** — Grid 4 K8s: Dynamic Grid creates a pod per session via the K8s API (RBAC to create pods — scope it). Cold start includes image pull; mitigate with pre-pulled node images and a small warm pool. Session map / Event Bus: Redis, not in-memory, if Router is replicated. **Moon**: browsers as pods, built-in CA, S3 video, Kubernetes-native — cost is license + still needing node capacity. **Selenoid**: Ggr (router) + Selenoid daemons; each session a container. On K8s people run Selenoid in Docker-in-Docker or mount the host runtime — security and ops tax. **Callisto**: queueing/allocation layer so Jenkins jobs do not stampede. **Playwright**: still not this (workers/shards). **When Grid-on-K8s vs cloud vendor:** same as Docker Q9 but node pools replace VMs — burst to 500 Chrome pods if the autoscaler cooperates; Safari still vendor. Failure modes: RBAC too wide (Grid can spawn privileged pods), no `ttl` on session pods (leak), video filling emptyDir, GraphQL UI exposed via Ingress without auth. Cost: Moon license vs engineer-weeks on Dynamic Grid vs BrowserStack minutes — model at 50th and 95th percentile concurrency.

**Code**

```yaml
# Sketch: Grid 4 components as Deployments + Redis; nodes via Dynamic Grid
# (official selenium-grid Helm chart is what you'd actually apply — Q14)
apiVersion: apps/v1
kind: Deployment
metadata: { name: selenium-router }
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: router
          image: selenium/router:4.27.0
          args: ["--redis-host", "redis", "--redis-port", "6379"]
          ports: [{ containerPort: 4444 }]
          resources:
            requests: { cpu: "500m", memory: "512Mi" }
```

**Follow-ups & traps**
- "Selenoid on EKS?" — Possible, not native; expect sock or DinD. Interviewers want that hesitation.
- Trap: Ingress on 4444 open to the internet — public Grid is a browser botnet.
- "Moon vs Grid 4?" — Money vs engineering; both need node capacity and shm. Moon wins on polish; Grid wins on no-vendor.
- Playwright on Moon? — Moon has Playwright support in some versions; still evaluate whether shards on Jobs are simpler.

**Senior/lead angle** — Pick one farm. Multi-farm "standards" are how you pay twice. Review quarterly against BrowserStack invoice. Scope Dynamic Grid's RBAC like you would a CI system that can exec.

**One-liner** — Grid 4 Dynamic on K8s is the OSS default; Moon is the paid native farm; Selenoid is Docker-era; Callisto allocates — none of them replace Playwright sharding, and none should be public.

### Q7. Autoscaling test runners (KEDA, cluster-autoscaler, pending pods).

**Interview answer** — Two layers. **Pod autoscaling** creates more test Jobs/pods: KEDA ScaledJob/ScaledObject on queue depth (SQS, Prometheus `ci_queue_length`, GitHub webhooks), or a controller that mints Jobs. **Node autoscaling** (cluster-autoscaler or Karpenter) adds nodes when pods are Pending due to insufficient CPU/memory. Pending pods are the signal, not CPU of existing Playwright pods (those are already busy). Scale-to-zero at night with KEDA `minReplicaCount: 0` on worker pools; for Jobs, zero is the default when nothing is submitted.

**Deep dive** — Cluster-autoscaler: watches unschedulable pods, adds nodes in the right AZ/instance type, respects `maxSize`. It will not scale on CPU 100% if everything already scheduled — that's HPA/KEDA's job. Karpenter: faster, provision-by-pod, good for bursty test shapes (2 CPU Playwright vs 200m API). Pending forever: missing node selector, huge requests, `NoSchedule` taints, PVC in wrong AZ, or max node group hit — CA cannot help. KEDA ScaledJob: each queue message → Job; perfect for "N suites in SQS." ScaledObject on a Deployment worker pool: alternative architecture. HPA on CPU for Grid *nodes* can work; HPA on CPU for a Job does not exist. GitHub Actions runner controller: scales runner pods on `workflow_job` — that's KEDA-like. Jenkins Kubernetes plugin: provisions an agent pod per build — the "autoscaler" is Jenkins' queue. Failure: scale-up storm at 9:00, ECR rate-limit, then scale-down killing in-flight pods (use PDBs only for services; for Jobs, disable CA scale-down on nodes with annotation `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` during the run). Spot interruption: Karpenter/CA drains — SIGTERM — tini (file 01 Q4) + Job retry of that shard only. Cost: idle min-size node group is the silent bill; KEDA to zero is the fix.

**Code**

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata: { name: e2e-from-queue }
spec:
  pollingInterval: 15
  maxReplicaCount: 80
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123/e2e-runs
        queueLength: "1"
        awsRegion: us-east-1
  jobTargetRef:
    parallelism: 1
    completions: 1
    backoffLimit: 1
    template:
      spec:
        restartPolicy: Never
        containers:
          - name: playwright
            image: ghcr.io/org/e2e-pw@sha256:4f3c…
            resources:
              requests: { cpu: "2", memory: "4Gi" }
```

```yaml
# Karpenter NodePool hint: interruptible test nodes
spec:
  disruption:
    expireAfter: 4h
  taints:
    - { key: workload, value: e2e, effect: NoSchedule }
```

**Follow-ups & traps**
- "HPA on the Job?" — Jobs don't HPA. KEDA ScaledJob or mint more Jobs.
- Trap: scaling nodes on CPU average of Grid hub — wrong signal; scale on session queue depth or Pending nodes.
- "Pods Pending but nodes exist" — taint/toleration, affinity, or resource requests > largest node.
- Scale-down mid-suite — CA evicted a node; annotate or use dedicated nodepool with slower scale-down.

**Senior/lead angle** — SLO: p95 time-to-running-pod (queue + schedule + pull). Instrument Pending reasons. Cap `maxReplicaCount` with a budget alarm (Q12 / AWS Q15) so a bad loop cannot mint 5,000 pods.

**One-liner** — KEDA (or Jenkins/ARC) scales pods from a queue; cluster-autoscaler/Karpenter scales nodes from Pending pods — CPU HPA on a Job is the wrong tool.

### Q8. Networking: Services, Ingress, hitting an app in-cluster vs public QA; NetworkPolicies for test isolation.

**Interview answer** — In-cluster, tests should use Service DNS: `http://shop.qa.svc.cluster.local:8080` (short: `http://shop.qa`). A ClusterIP Service is not on the internet. Ingress (or Gateway API) is for humans and webhooks hitting from outside — optional for tests if the Job shares the namespace or is allowed by policy. Public QA URLs add DNS, TLS, WAF, and flakiness; use them when the suite must see the real edge (CDN, cookies on the product domain). NetworkPolicies default-deny in ephemeral namespaces: allow tests → app + db, allow egress to package registries only if the image still pulls at runtime (it shouldn't), deny tests → prod.

**Deep dive** — Service types: ClusterIP (default), NodePort (avoid for tests), LoadBalancer (cost, for preview URLs). Headless Services for StatefulSet DBs. kube-proxy vs kube-proxy-less (Cilium): usually irrelevant if DNS works. DNS: `ndots` in alpine causing extra searches — use FQDN or set `dnsConfig`. Ingress auth: do not put the Grid UI on a public Ingress (Q6). Hitting public QA from cluster: NAT Gateway (AWS Q14), allowlists — the "works in cluster, 403 from GitHub-hosted runners" is the inverse. NetworkPolicy: not all CNIs enforce (Amazon VPC CNI needs extra; Calico/Cilium do). A policy that drops DNS (`kube-dns`) looks like random resolution flakes. Egress to S3: via NAT or Gateway endpoint; tests need that if they upload. mTLS service mesh: nice, but Jobs need identities — extra tax. Cost: LoadBalancer per PR namespace is how you get a $4k bill; use cluster-internal DNS or one shared Ingress with path/host routing and auth.

**Code**

```yaml
apiVersion: v1
kind: Service
metadata: { name: shop }
spec:
  selector: { app: shop }
  ports: [{ port: 8080, targetPort: 8080 }]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: e2e-isolation }
spec:
  podSelector: { matchLabels: { role: e2e } }
  policyTypes: [Ingress, Egress]
  ingress: []   # nobody should call the test pod
  egress:
    - to:
        - podSelector: { matchLabels: { app: shop } }
      ports: [{ protocol: TCP, port: 8080 }]
    - to:
        - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: kube-system } }
          podSelector: { matchLabels: { k8s-app: kube-dns } }
      ports: [{ protocol: UDP, port: 53 }, { protocol: TCP, port: 53 }]
    - to:
        - podSelector: { matchLabels: { app: minio } }  # or S3 via CIDR/FQDN if CNI supports
      ports: [{ protocol: TCP, port: 443 }]
```

**Follow-ups & traps**
- "`localhost:8080` in the Job" — the Job pod, not the app, unless you used `hostNetwork` (don't) or a sidecar.
- Trap: NetworkPolicy without DNS allow — "flaky getaddrinfo."
- "Ingress for the HTML report?" — Then you have an auth problem (AWS Q10). Prefer pre-signed S3.
- Cross-namespace: `shop.qa.svc.cluster.local` plus policies that allow it; do not default-allow all namespaces.

**Senior/lead angle** — Default-deny in `pr-*` namespaces is the isolation product. Public preview URLs are a separate, authenticated Ingress with TTL. Tests against public QA are for contract-at-the-edge, not for speed.

**One-liner** — Jobs talk ClusterIP Service DNS; Ingress is for humans; NetworkPolicies default-deny so ephemeral tests cannot wander into prod — and always allow DNS.

### Q9. Persistent volumes for reports vs uploading to S3 and discarding pods.

**Interview answer** — I do not keep reports on PVs. The pod is disposable: write traces to `emptyDir`, upload to S3 (or GCS/Azure Blob) in `post`/`preStop`/sidecar, then let `ttlSecondsAfterFinished` delete the pod. PVs add AZ stickiness, leftover 10 Gi disks, `Retain` policy orphans, and permission games (`fsGroup`). PVs are for databases you seed (StatefulSet), not for HTML.

**Deep dive** — emptyDir: dies with the pod — you must upload before the kubelet deletes. Race with `ttlSecondsAfterFinished: 30` is real; upload in the test process finally block, or a sidecar that watches a `done` file. Read-only root + emptyDir for `/tmp` and output (file 01 Q11). PVC ReadWriteMany: EFS/NFS for Allure merge across shards — works, slow for many small files, cost, and still you should copy to S3 for durability. HostPath: never in multi-node clusters. Artifact flow: shards → blob reports on S3 prefix `s3://qa-e2e/$run_id/shard-N` → merge Job downloads and publishes HTML. Lifecycle: expire traces 14d (AWS Q3). Failure: OOM before upload — `preStop` may not run on OOM; mitigate with a sidecar that streams or with smaller shards. Cost: EBS gp3 per shard × forgotten `Retain` is the "disk graveyard"; S3 is cents.

**Code**

```bash
# end of Job wrapper
npx playwright test --reporter=blob
aws s3 sync /app/blob-report "s3://qa-e2e/${RUN_ID}/${JOB_COMPLETION_INDEX}/" --only-show-errors
```

```yaml
# merge Job
containers:
  - name: merge
    image: ghcr.io/org/e2e-pw@sha256:4f3c…
    command: ["bash", "-c"]
    args:
      - |
        aws s3 sync "s3://qa-e2e/${RUN_ID}/" /tmp/blobs
        npx playwright merge-reports --reporter html /tmp/blobs
        aws s3 sync /app/playwright-report "s3://qa-e2e/${RUN_ID}/html/"
```

**Follow-ups & traps**
- "Why not NFS so I can open the report in the cluster?" — Then you operate NFS and still need auth. S3 + pre-signed URL.
- Trap: `ttlSecondsAfterFinished` shorter than upload time.
- OOM and missing artifacts — sidecar streaming or smaller workers.
- `ReadWriteOnce` PVC + parallelism=8 — seven pods Pending.

**Senior/lead angle** — Artifact bus is S3 (or equivalent) with a path contract. PVs are an exception register. This is also the CloudWatch/cost story: object counts and lifecycle rules.

**One-liner** — emptyDir then S3, then delete the pod — PVs for test reports become leaked disks and AZ magnets.

### Q10. Debugging a failed Job (`kubectl logs`, `describe`, ephemeral debug container).

**Interview answer** — `kubectl describe job` / `describe pod` for events (`OOMKilled`, `ImagePullBackOff`, `FailedScheduling`, probe failures). `kubectl logs` for the suite; `--previous` if it crashed. `kubectl get pod -o yaml` for exit codes and restart counts. For a still-running or retained pod: `kubectl exec`; for a crashed distroless/minimal image: `kubectl debug -it --image=busybox --target=playwright` (ephemeral container) if the cluster enables it. Copy artifacts with `kubectl cp` only if you failed to upload — last resort.

**Deep dive** — Jobs create pods named `jobname-index-random`. `kubectl logs job/checkout-e2e` tails one pod — with Indexed Jobs you must name the pod. Events age out of `describe` — use Loki/CloudWatch. `kubectl debug` requires `EphemeralContainers` feature (GA) and RBAC. `shareProcessNamespace` helps debug Chrome children. Common event dictionary: `Insufficient cpu` (requests), `node(s) had taint`, `FailedCreate` (RBAC/quota), `DeadlineExceeded` (`activeDeadlineSeconds`). Keep failed pods: `ttlSecondsAfterFinished` not too aggressive; `failedJobsHistoryLimit` on CronJobs. Do not debug by `sleep infinity` in production templates — a `debug: "true"` overlay that replaces command is fine in PR namespaces. Trace-first: if S3 upload worked, you may not need exec at all (file 01 Q12).

**Code**

```bash
kubectl describe job checkout-e2e-123
kubectl get pods -l job-name=checkout-e2e-123 -o wide
kubectl describe pod checkout-e2e-123-3-abc
kubectl logs checkout-e2e-123-3-abc -c playwright --tail=200
kubectl logs checkout-e2e-123-3-abc -c playwright --previous
kubectl debug -it checkout-e2e-123-3-abc --image=public.ecr.aws/docker/library/busybox:1.36 --target=playwright
kubectl cp checkout-e2e-123-3-abc:/app/test-results ./test-results -c playwright
```

**Follow-ups & traps**
- "Job failed, `logs` empty" — initContainer failed (`-c wait-app`), or the process never flushed stdout (buffer) — `python -u` / `PYTHONUNBUFFERED` analogue for Node is running without a TTY; use `--tty` rarely, better log explicitly.
- Trap: debugging a pod the TTL already deleted — raise failed history, ship logs to CloudWatch (AWS Q9).
- `ImagePullBackOff` — digest/tag/perms; not a test flake.
- `kubectl exec` denied — RBAC; that's good in prod-like ns.

**Senior/lead angle** — Debug bundle: events + logs + inspect-equivalent dumped to S3 on Job failure automatically. `kubectl` is for the platform team; product engineers get the trace URL.

**One-liner** — describe for kube events, logs for the suite, debug/exec only while the pod exists — and ship artifacts off-cluster so TTL can delete the body.

### Q11. Namespace strategy for QA vs ephemeral PR environments.

**Interview answer** — Long-lived **QA/staging namespaces** (`qa`, `staging`) hold the shared deployed app, data services, and NetworkPolicies that are reviewed. **Ephemeral PR environments** are `pr-$id` namespaces (or `preview-$sha`) created by the pipeline, containing app + db + Job, quota-capped, default-deny, TTL-destroyed. Tests against shared QA need isolation rules (data namespacing) because they are not the only tenant. PR namespaces are the compose-file-on-steroids pattern.

**Deep dive** — Shared QA: cheaper, always warm, drift-prone, noisy-neighbor tests, secrets are "real" QA secrets. PR ns: high fidelity to the branch, cost per PR, cold start, need image builds of the *app*, teardown hooks that actually run (`helm uninstall`, `kubectl delete ns`). Hybrid: PR runs smoke in `pr-*`; nightly full regression in `qa`. Namespace-as-isolation is not a security boundary against a cluster-admin, but it is the RBAC unit (`RoleBinding` per team). ResourceQuota + LimitRange per `pr-*` (CPU, pod count, LoadBalancer count=0). Label `owner`, `ttl`, `git.pr`. A controller (ns-janitor, Uber's) deletes after 24h. Collision: two Jobs in `qa` using the same test user — that's test-data design (`question-bank/architecture-lead/02-test-data-management.md`), not kube. Cost: 80 leftover `pr-*` with RDS-from-K8s or LoadBalancers.

**Code**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pr-4817
  labels:
    purpose: preview
    git.pr: "4817"
    ttl-hours: "24"
---
apiVersion: v1
kind: ResourceQuota
metadata: { name: cap, namespace: pr-4817 }
spec:
  hard:
    pods: "20"
    requests.cpu: "16"
    requests.memory: 32Gi
    services.loadbalancers: "0"
```

```bash
# teardown in CI always()
kubectl delete namespace "pr-${PR}" --wait=false
```

**Follow-ups & traps**
- "All tests in `default`?" — RBAC nightmare, no quota, accidental deletes. Instant fail.
- Trap: copying prod secrets into `pr-*` for "realism."
- Teardown on cancelled GitHub Actions — `if: always()` delete; leaked ns are a budget line.
- Cross-ns NetworkPolicy to `qa` from `pr-*` — usually deny; PRs get their own app.

**Senior/lead angle** — Two products: stable QA (owned by env team) and a preview operator (owned by platform). SLOs differ. Chargeback by namespace labels (AWS Q15).

**One-liner** — Shared QA namespaces for warm full-stack; `pr-*` namespaces with quota and TTL for branch isolation — never `default`, never leftover LoadBalancers.

### Q12. Cost control (spot/preemptible nodes, limit ranges, idle clusters).

**Interview answer** — Test compute should be interruptible, request-honest, and off when idle. Put Playwright Jobs on spot/preemptible node pools with tolerations, retry the shard on SIGTERM. LimitRange so every pod has requests. Scale node groups to zero (Karpenter idle, GKE scale-to-zero). Cap parallelism in KEDA/Jenkins. Delete preview namespaces. Tag everything for chargeback. The runaway Grid (AWS Q15) is a missing maxReplica and a 24/7 on-demand node group.

**Deep dive** — Spot: 60–80% cheaper, 2-minute warning on AWS. Acceptable if shards are idempotent and artifacts are on S3. Not for a single non-retried release-gate pod unless you can retry the Job. Mix: on-demand for merge Jobs and Grid Router; spot for Chrome nodes and Playwright shards. LimitRange: default requests if omitted; max limits. ResourceQuota per namespace. Cluster idle: scheduled shutdown of non-prod clusters (dev clusters at night) — tests must not assume 24/7 unless paid. Image pull: ECR in-region, node-local cache, smaller images — pull time is node time. Observability: `kube_pod_container_resource_requests` × price. Failure: spot interruption storms in one AZ — spread, retry. Political: finance sees "EKS" not "tests"; tags `app=e2e`.

**Code**

```yaml
apiVersion: v1
kind: LimitRange
metadata: { name: e2e-defaults, namespace: qa }
spec:
  limits:
    - type: Container
      defaultRequest: { cpu: "500m", memory: "1Gi" }
      default: { cpu: "2", memory: "4Gi" }
      max: { cpu: "4", memory: "8Gi" }
```

```yaml
# Job: land on spot pool
spec:
  template:
    spec:
      tolerations:
        - { key: spot, operator: Exists, effect: NoSchedule }
      nodeSelector: { intent: e2e-spot }
      terminationGracePeriodSeconds: 45
```

**Follow-ups & traps**
- "Spot made nightlies flaky" — interruptions without Job retry. Retry the *pod*, not the whole 4,000 tests.
- Trap: on-demand m5.4xlarge node group min=10 "for Grid" at 3 a.m.
- LimitRange max too small for Chrome — teams set `nodeSelector` to escape and blow the budget on another pool.
- Idle control-plane still costs — merge tiny clusters; don't run five EKS for five squads without a reason.

**Senior/lead angle** — Budget alarm + maxReplica + spot + scale-to-zero is the control system. Review request-hours weekly with squad leads. Cost is a quality metric: dollars per green PR.

**One-liner** — Spot for retried shards, LimitRange/Quota to stop BestEffort and 16-CPU jokes, scale-to-zero and TTL previews — cap autoscaling or Grid will find the credit card.

### Q13. Lead: design a "test platform" on K8s — API that spins a Job per suite, collects artifacts, exposes a dashboard.

**Interview answer** — A small control plane: an API (or GitHub App / Jenkins shared library) that accepts `{suite, git_sha, shards, env, image_digest}`, creates an Indexed Job from a Helm template, injects IRSA + ConfigMap, waits on Job completion (watch or webhook), merges blob reports from S3, and writes run metadata to a DB the dashboard reads. Teams do not `kubectl apply`. The cluster runs golden images on spot node pools. SLOs: time-to-pod, cost per run, flake rate, artifact freshness.

**Deep dive** — Components: (1) **Admission API** — authn via OIDC from CI, validates image is on the allowlist (golden digest or derived FROM golden), enforces max shards. (2) **Job factory** — Helm/Kustomize render; labels `suite`, `run_id`, `pr`; ownerReferences for GC. (3) **Artifact bus** — S3 layout `s3://e2e/$suite/$run_id/`. (4) **Merge worker** — another Job or Lambda on S3 event. (5) **Metadata** — Postgres: run, shard durations, exit codes, OOM flags from a controller watching pod statuses. (6) **Dashboard** — Grafana or a small UI: green/red, trace links, queue time. (7) **Quota** — per-team ResourceQuota. (8) **Preview operator** — optional, spins `pr-*` apps. Failure modes: API is a SPOF (make it a Deployment, not a laptop script); runaway loops (admission max); dashboard without OOM fields (hides infra). Alternative: skip custom API and use Jenkins Kubernetes plugin or ARC — still a platform if templates and images are centralized. When to custom-build: multiple CI systems need the same farm; compliance wants an audit log of who ran what against QA.

**Code**

```text
CI (GHA/Jenkins)
  OIDC → platform API POST /runs
             ├─ helm install e2e-$run_id  (Indexed Job)
             ├─ pods pull ghcr.io/org/e2e@sha256
             ├─ shards → s3://e2e/$run_id/shard-N
             └─ Job complete webhook
  merge Job → HTML to s3 + presigned URL on PR
  controller → run_stats table (duration, oom, retries)
  Grafana ← Prometheus (KEDA, pending, throttle) + run_stats
```

```yaml
# admission allowlist snippet
imageMustMatch: 'ghcr.io/org/e2e-pw@sha256:*'
maxParallelism: 20
requireResources: true
```

**Follow-ups & traps**
- "Why not let teams apply YAML?" — drift, no allowlist, no cost cap, no dashboard. Platform is the API + templates.
- Trap: dashboard that only shows Playwright HTML — misses Pending, OOM, pull time.
- "How do we handle 4,000 tests in 12 minutes?" — AWS Q16 / sharding math + this factory.
- Custom API vs Jenkins-only — don't build a PaaS for one CI.

**Senior/lead angle** — Run it as a product: adoption, onboarding time, support, changelog of the golden image. Staff on-call. Kill-by-default unused features (VNC farms nobody uses). This question *is* the staff design round.

**One-liner** — An API mints allowlisted Jobs, S3 holds artifacts, a merge publishes reports, a dashboard shows suite *and* infra signals — teams never raw `kubectl apply`.

### Q14. Helm / Kustomize for test infra as code.

**Interview answer** — Helm if we have a parameterized *chart* (Grid, the e2e Job factory, preview app) with values per env. Kustomize if we overlay a base YAML (patches for `pr-*` vs `qa`) without a templating language. Many platforms use Helm for the product (Grid, Moon) and Kustomize for GitOps overlays (Argo CD). The rule is the same as pipeline-as-code: the cluster state is in Git, reviewed, no click-ops.

**Deep dive** — Helm: `values.yaml` for image digest, shard count, resources, nodeSelector; `helm template` in CI to review rendered YAML; version the chart like the golden image. Hooks: Helm post-install Job for smoke — careful with hook deletions vs artifacts. Kustomize: `base/` Job + `overlays/pr` patches `BASE_URL`; no loops — Indexed Jobs with N shards are painful in pure Kustomize (Helm wins for repetition). Jsonnet/CDK8s: if the org already lives there. Secrets: neither Helm nor Kustomize should commit Secret values — Sealed Secrets, SOPS, External Secrets. Testing: `kubeconform`/`kube-linter`/`helm test` plus the canary suite. Failure: `latest` in values, unpinned chart deps, `helm upgrade` that restarts a Grid hub mid-day (session loss). GitOps: Argo CD app per team namespace; the test platform chart is one App.

**Code**

```yaml
# charts/e2e-job/values.yaml
image: ghcr.io/org/e2e-pw@sha256:4f3c…
shards: 8
resources:
  requests: { cpu: 2, memory: 4Gi }
nodeSelector: { intent: e2e-spot }
suite: checkout
```

```yaml
# kustomize overlay
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: [../../base]
patches:
  - target: { kind: Job, name: e2e }
    patch: |-
      - op: replace
        path: /spec/parallelism
        value: 2
```

```bash
helm upgrade --install e2e-checkout charts/e2e-job \
  --namespace pr-4817 --create-namespace \
  --set shards=4 --set runId=$GITHUB_RUN_ID \
  --wait --timeout 30m
```

**Follow-ups & traps**
- "Helm vs Kustomize?" — Helm for reusable parameterized products; Kustomize for overlays on rendered/base YAML. Both in Git.
- Trap: templating kubectl secrets into the chart from CI logs.
- `helm install` without `--wait` then immediately `kubectl logs` — race.
- Chart from the internet unpinned (`selenium-grid` latest) — supply chain.

**Senior/lead angle** — One official chart for "run this suite" is the paved road; teams pass values, not forks of the chart. Version breaking values (`shards` rename) like the golden-image contract.

**One-liner** — Helm charts parameterize Jobs/Grid; Kustomize overlays env differences; Git is the source of truth — pin charts and image digests, never commit raw secrets.
