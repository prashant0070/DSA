# Jenkins Platform Architecture (Lead / Staff)

Assume the reader already writes declarative Jenkinsfiles, knows `post { always }`, credentials bindings, and a first shared library — that material is `question-bank/cicd/02-jenkins.md`. This file is the **platform** interview: capacity math, `JENKINS_HOME` disaster recovery, JCasC + Job DSL, library versioning across teams, Kubernetes agents as the default, Vault/AWS secrets at org scale, org folders, lockable resources, HA realities, plugin CVEs, queue-time as a quality metric, TCO versus GitHub Actions/GitLab/Buildkite, and a playbook for migrating 200 Freestyle jobs without a freeze.

- Q1. Controller vs agents vs executors vs labels — capacity planning math
- Q2. JENKINS_HOME, backup, disaster recovery
- Q3. JCasC + Job DSL / pipeline libraries — config-as-code for a 50-job org
- Q4. Shared Library architecture for a multi-team SDET org
- Q5. Agent strategies: static VMs vs Docker vs Kubernetes
- Q6. Ephemeral Playwright/Selenium agents (pod templates)
- Q7. Credentials and secrets at org scale
- Q8. Multi-branch, org folders, GitHub org integration, PR decoration
- Q9. Scaling pain: starvation, quiet period, throttle, lockable resources
- Q10. High availability, controller bottleneck, cloud agents
- Q11. Plugin risk management
- Q12. Observability of Jenkins itself
- Q13. Jenkins vs GitHub Actions vs GitLab vs Buildkite (org decision)
- Q14. Lead playbook: migrating 200 Freestyle jobs to pipeline-as-code

### Q1. Controller vs agents vs executors vs labels — capacity planning math (executors × job duration).

**Interview answer** — The **controller** schedules, stores config, and serves the UI — it should run **zero** test executors. An **agent** is a machine/pod connected to the controller. An **executor** is a slot on an agent: one executor runs one pipeline node/stage (roughly one workspace). **Labels** (`playwright`, `jdk17`, `gpu`) are how jobs request the right agent. Capacity: if a Playwright job occupies 1 executor for 20 minutes and you need 30 concurrent PR jobs at peak, you need ≥30 executors *and* the CPU/RAM behind them — `executors × (60 / duration_min)` is jobs per hour per pool. Queue time starts when peak concurrent jobs exceed executors.

**Deep dive** — Math interviewers want on the whiteboard. Let `C` = target concurrent jobs, `D` = mean executor occupancy in minutes (pipeline wall time on that agent, not test-minutes after internal parallelism), `H` = peak hours. Executors needed ≈ `C`. Throughput ≈ `executors × 60 / D` jobs/hour. If D=25 min and you have 8 executors, you finish ~19 jobs/hour; a 9 a.m. burst of 40 PRs queues ~an hour. Playwright inside one executor with 4 workers still counts as **one** executor — inner parallelism does not multiply Jenkins slots; it multiplies **host CPU**. So size the *agent* for workers, and the *pool* for concurrent pipelines. `pipeline { agent none }` plus per-stage agents: a lightweight checkout stage should not hold a 4-CPU Playwright pod. Labels: too many (`chrome-131-a`, `chrome-131-b`) fragment the pool; too few (`linux`) schedule API tests onto browser-sized nodes and starve e2e. Cloud agents (Q5) make `C` elastic; static VMs make it a budget line. Controller executors >0 is how someone `npm ci`s the controller into a 9 a.m. outage.

**Code**

```groovy
pipeline {
  agent none
  stages {
    stage('Checkout+Lint') {
      agent { label 'small-cpu' }
      steps { checkout scm; sh 'npm ci && npm run lint' }
    }
    stage('E2E') {
      agent { label 'playwright && linux && amd64' }
      steps { sh 'npx playwright test --workers=2' }
    }
  }
}
```

```text
peak PRs C=24, mean occupancy D=18 min
static pool: 24 executors, each 2 vCPU 4Gi (workers=2)
jobs/hour ≈ 24 × 60/18 = 80
if only 8 executors: queue grows by 16 jobs every 18 min at peak
```

**Follow-ups & traps**
- "Add executors on the controller?" — Never for tests. That is the trap.
- Trap: 16 executors on a 4-vCPU VM — you scheduled 16 Chromiums onto 4 cores (file 01 Q8) and called it capacity planning.
- `agent { label 'playwright' }` at top-level holds the fat agent during a 2-minute `archiveArtifacts` wait — `agent none` + post on the right node, or stash.
- Labels vs clouds: Kubernetes pod templates *are* labels with YAML (Q6).

**Senior/lead angle** — Publish a capacity card per pool and a weekly "p95 queue wait" (Q12). Headcount conversations use this math, not "Jenkins feels slow."

**One-liner** — Controller schedules, agents execute, executors are slots, labels route; needed executors ≈ peak concurrent jobs, and each slot must have the CPU for *inner* workers — queue time is occupancy math.

### Q2. JENKINS_HOME, what you back up, what you don't; disaster recovery.

**Interview answer** — `JENKINS_HOME` is the controller's state: `config.xml`, jobs, `plugins/`, users, secrets (encrypted), build history, workspaces sometimes. I back up **config + jobs + secrets + plugin list + JCasC YAML** continuously, and **build artifacts/history** with a shorter retention. I do **not** treat agent workspaces, `workspace/` on the controller, or `caches/` as DR-critical. Recovery: new controller from AMI/Helm, restore home (or better: JCasC + jobs-as-code so home is almost empty), decrypt secrets with the **master key**. If you lose `$JENKINS_HOME/secrets/master.key` and `hudson.util.Secret`, credentials are unrecoverable.

**Deep dive** — Layout: `jobs/<name>/config.xml` (Freestyle still lives here), `jobs/<name>/builds/` (history — large), `secrets/`, `users/`, `nodes/`, `caches/`, `fingerprints/`. Thin backup: exclude `builds/*/archive`, `workspace`, `@tmp`. Fat backup: everything, slow, needed if auditors want last month's logs on the controller (prefer external logs, Q12). CloudBees / Operations Center: different topology, same key story. Kubernetes: `JENKINS_HOME` on a PVC — snapshot the PVC *and* export JCasC. Rebuild-from-code posture: JCasC + Job DSL/org folders + credentials in Vault means a burned controller is a 30-minute Helm install, not a 2-day archaeology. DR drill: restore in staging quarterly; if you have never done it, you do not have DR. Failure: backup the PVC while Jenkins writes — use a snapshot consistent story or brief quiet. Cost: 200k old builds in home = 50 Gi PVC and 20-minute controller boot.

**Code**

```bash
# thin rsync (controller quiet or filesystem freeze)
rsync -a --delete \
  --exclude 'workspace/' --exclude 'caches/' \
  --exclude 'jobs/*/workspace*' \
  --exclude 'jobs/*/builds/*/archive' \
  "$JENKINS_HOME/" /backup/jenkins-thin/
# always copy:
# secrets/master.key secrets/hudson.util.Secret identity.key.enc
```

```yaml
# Helm values — persistence + backup annotation
controller:
  persistence:
    size: 50Gi
    storageClass: gp3
```

**Follow-ups & traps**
- "We have AMI snapshots" — without `master.key` they may boot a Jenkins that cannot decrypt credentials. Say the key names.
- Trap: backing up workspaces full of Playwright videos as DR.
- "RTO/RPO?" — e.g. RPO 1 hour (backup cadence), RTO 1 hour (Helm + restore drill). Numbers beat "we have backups."
- Plugins directory vs plugin `plugins.txt` — the list is enough if you can download; air-gap needs the bits.

**Senior/lead angle** — DR is a tested runbook plus JCasC so the home directory shrinks. Multiple controllers (Q10) reduce blast radius more than a bigger NFS volume.

**One-liner** — Back up config, jobs, encrypted secrets and the master key, plus a plugin list; drop workspaces and fat archives — DR is a restore drill, not a tar file nobody has opened.

### Q3. JCasC + Job DSL / pipeline libraries — config-as-code for a 50-job org.

**Interview answer** — **JCasC** is YAML for the *controller*: clouds, security realm, authorization, tool installers, credentials *bindings*, Kubernetes clouds, mail. **Job DSL** (or Organization Folders / Pipeline jobs from YAML) seeds *jobs*. **Shared libraries** (Q4) are the pipeline logic. For ~50 jobs I would not click anything: a Git repo `jenkins-infra/` with JCasC, a `plugins.txt`, and Job DSL that creates org folders pointing at GitHub. Apply on boot (`CASC_JENKINS_CONFIG`) and in a pipeline that dry-runs JCasC.

**Deep dive** — 50 jobs is still in "one controller + org folders" territory; 5,000 jobs is when you split controllers. JCasC gotchas: credentials in YAML are a smell — pull from Vault/AWS at boot. Schema drift on plugin upgrade breaks JCasC — pin plugins (Q11). Job DSL: `pipelineJob` vs `multibranchPipelineJob`; DSL that `scm`s the Jenkinsfile from the product repo, not an inline script. Alternative: Kubernetes `Job` CRDs / CasC + jobs only as org-folder auto-discovery so you never DSL individual pipelines. Promotion: PR to `jenkins-infra` → apply on a **staging controller** → promote. Failure: JCasC overwrite wiping a click-ops snowflake someone needed — that's the point; freeze click-ops. Cost: the repo is cheap; the staging controller is required.

**Code**

```yaml
# jenkins.yaml (JCasC)
jenkins:
  systemMessage: "QA Jenkins — config from jenkins-infra@${GIT_SHA}"
  numExecutors: 0
  clouds:
    - kubernetes:
        name: "eks-e2e"
        serverUrl: "https://kubernetes.default"
        namespace: "jenkins-agents"
        templates:
          - name: "playwright"
            label: "playwright"
            yaml: |
              spec:
                containers:
                  - name: jnlp
                    image: jenkins/inbound-agent:3261.v9c670a_318a_8e-1
                  - name: pw
                    image: 123.dkr.ecr.us-east-1.amazonaws.com/e2e-pw@sha256:4f3c…
                    resources:
                      requests: { cpu: "2", memory: "4Gi" }
security:
  gitHostKeyVerificationConfiguration:
    sshHostKeyVerificationStrategy: "knownHostsStrategy"
unclassified:
  location:
    url: "https://jenkins.qa.example.com/"
```

```groovy
// Job DSL
organizationFolder('shop') {
  organizations {
    github {
      repoOwner('myorg')
      credentialsId('github-app')
    }
  }
  projectFactories {
    workflowMultiBranchProjectFactory { scriptPath 'Jenkinsfile' }
  }
}
```

**Follow-ups & traps**
- "JCasC vs Job DSL?" — Controller vs jobs. Both. Libraries vs either — logic.
- Trap: 50 hand-clicked jobs "until we have time for CasC."
- Applying JCasC from a job on the same controller — chicken/egg; boot-time CasC first.
- Secrets in the CasC Git repo — use `${vault:...}` or AWS, not plaintext.

**Senior/lead angle** — `jenkins-infra` is a product repo with CODEOWNERS, staging controller, and a changelog. Fifty jobs is how you prove the pattern before 500.

**One-liner** — JCasC owns the controller, Job DSL/org folders own job creation, libraries own pipeline logic — Git is the source of truth for a 50-job org, not the UI.

### Q4. Shared Library architecture for a multi-team SDET org (versioning, breaking changes, testing the library itself).

**Interview answer** — One org library (`@Library('qa-pipeline')`) that exposes a small API: `qaPlaywright { shards = 8 }`, `qaMavenGrid { browser = 'chrome' }`, `qaPublish { s3 = true }`. Internals live in `vars/` (simple steps) and `src/` (Java/Groovy classes). Versioning: teams pin `@Library('qa-pipeline@v3')` or a Git tag; `master` floating is how a Friday library change reds 40 suites. Breaking changes: major tag, changelog, dual-run. Test the library with Jenkins Pipeline Unit, a canary folder of representative Jenkinsfiles, and the staging controller.

**Deep dive** — `vars/qaPlaywright.groovy` is the paved road; if every Jenkinsfile has a 200-line `script {}`, the library failed. CPS: pipeline Groovy is continuation-passing — `sleep`, `httpRequest`, non-serializable `Date` in fields break in surprising ways; `@NonCPS` is a scalpel. Trust: a global library is **trusted** (can bypass sandbox) — review it like production, CODEOWNERS, no drive-by. Folder libraries for one team that is experimenting. Versioning strategy: semver tags; Renovate on Jenkinsfiles; deprecation warnings in `echo` for one minor. Testing: `jenkins-pipeline-unit` for logic; Replay job is not a test. Contract tests: a `library-tests` repo with golden Jenkinsfiles run on every library PR (multibranch). Failure: library that wraps too much (hides the Jenkinsfile so teams cannot debug) vs too little (copy-paste). Cost of a breaking `qaPublish` rename: 50 PRs — provide aliases for a version.

**Code**

```groovy
// vars/qaPlaywright.groovy
def call(Map args = [:]) {
  int shards = args.shards ?: 4
  String image = args.image ?: defaultImage()
  pipeline {
    agent none
    options {
      timeout(time: args.timeoutMin ?: 45, unit: 'MINUTES')
      timestamps()
      buildDiscarder(logRotator(numToKeepStr: '30'))
    }
    stages {
      stage('E2E') {
        matrix {
          axes { axis { name 'SHARD'; values shardsList(shards) } }
          agent { kubernetes { yaml podYaml(image) } }
          stages {
            stage('Test') {
              steps {
                container('pw') {
                  sh "npx playwright test --shard=${SHARD}/${shards} --reporter=blob,junit"
                }
              }
            }
          }
        }
      }
      stage('Merge') { steps { qaMergeReports() } }
    }
    post { always { qaPublish() } }
  }
}
```

```groovy
// consumer Jenkinsfile
@Library('qa-pipeline@v3.12.0') _
qaPlaywright shards: 8, suite: 'checkout'
```

**Follow-ups & traps**
- "Float `master` so everyone gets fixes?" — Hotfixes yes on a patch tag; floating master is a outage multiplier.
- Trap: library contains team-specific locators or `BASE_URL`s.
- How you tested the last library change — if the answer is "we merged and watched," that's the finding.
- Sandbox vs trusted — know which you are and why.

**Senior/lead angle** — Library as a product: API surface, versioning, canary, support channel, adoption metric. Same paved-road story as golden images (file 01 Q15).

**One-liner** — A small version-pinned library API, trusted and reviewed, tested on a canary controller — breaking changes ride major tags, not `master` on Friday.

### Q5. Agent strategies: static VMs vs Docker agents vs Kubernetes agents (Jenkins Kubernetes plugin) — the modern default.

**Interview answer** — **Static VMs**: predictable, rot (disk, Chrome, zombies), poor packing, patching tax. **Docker agents** (`agent { docker { image ... } }` — syntax in `question-bank/cicd/02`): great isolation if a fat Docker host exists; still a pet daemon, sock security, cache-on-disk stories. **Kubernetes plugin**: each build (or stage) gets a pod from a template; the modern default wherever EKS/GKE/AKS already exists. I would not start a *new* Jenkins in 2026 on a farm of Windows-named static slaves.

**Deep dive** — Static: still valid for macOS, licensed browsers, hardware lab. Put them behind labels and a health monitor; recycle weekly. Docker: the Jenkins user needs to talk to dockerd — typically `docker.sock` — which is root-equivalent (file 01 Q11). Image pull cache on the host is the speed win. Kubernetes: JNLP/inbound agent container + workload containers; `container('pw') { sh 'npx playwright test' }`. Scaling is the cluster's problem (file 02 Q7). Cold start: pull + pod schedule — same as K8s Jobs. Mixed: Kubernetes for Linux e2e, a static label for iOS. Cost: static 24/7 vs pods that die. Failure: Kubernetes plugin version vs controller version; WebSocket vs TCP agents through firewalls.

**Code**

```groovy
agent {
  kubernetes {
    defaultContainer 'pw'
    yamlFile 'ci/pod.yaml'   // in the product repo or from the library
  }
}
```

```groovy
// older but still seen
agent {
  docker {
    image 'mcr.microsoft.com/playwright:v1.46.0-jammy'
    args '--ipc=host --init --cpus=2 --memory=4g'
  }
}
```

**Follow-ups & traps**
- "Why not Docker-in-Docker on K8s for the docker agent block?" — DinD is a last resort; use Kubernetes plugin or Kaniko/buildah for image builds.
- Trap: 50 static "Playwright" VMs all `latest` Chrome, never patched.
- Windows agents — static or cloud VMs; Kubernetes Windows is possible and painful.
- Agent protocol / WebSockets through the ALB — platform detail that unblocks "offline agents."

**Senior/lead angle** — Default template is Kubernetes; exceptions are an allowlist (macOS, devices). Decommission static Linux as you go (Q14).

**One-liner** — Static VMs rot, Docker agents need a daemon and a sock, Kubernetes pods are the default ephemeral agent — keep pets only for OS you cannot schedule as Linux pods.

### Q6. Ephemeral Playwright/Selenium agents: pod templates with browser images, resource requests, timeouts.

**Interview answer** — A pod template is two+ containers: `jnlp` (the agent) and `pw` or `maven` (the golden image). Requests: 2 CPU / 4 Gi for two Playwright workers, memory emptyDir at `/dev/shm` 1–2 Gi, `init: true`/tini in the image. `activeDeadline` / pipeline `timeout` so a hung Chrome cannot occupy the namespace forever. Selenium: either this pod *is* Chrome+JDK, or the pod is a thin JVM talking to Grid Service (file 02 Q6). Pin image digest. `workspaceVolume` emptyDir, not NFS, for speed.

**Deep dive** — `defaultContainer` so `sh` does not run on the JNLP Alpine image (missing browsers — classic). UID: Jenkins writes the workspace as one UID; Playwright `pwuser` must match or use `runAsUser` + `fsGroup` (file 01 Q6). shm: YAML `emptyDir.medium: Memory`. Timeouts: pipeline `options { timeout }`, Kubernetes plugin `idleMinutes`, pod `activeDeadlineSeconds`. Node selectors/taints for spot (file 02 Q12). Secrets: `serviceAccountName` with IRSA, not env in the template YAML in Git. Retention: `podRetention: onFailure` for debug, `never` for success. Cost: `idleMinutes: 10` reuses pods (faster, dirtier); `0` is cleaner. I pick 0 for e2e, small idle for lint pods.

**Code**

```yaml
# ci/pod.yaml
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenkins-e2e
  securityContext:
    fsGroup: 1000
  volumes:
    - name: dshm
      emptyDir: { medium: Memory, sizeLimit: 2Gi }
  containers:
    - name: jnlp
      image: jenkins/inbound-agent:jdk17
      resources:
        requests: { cpu: "200m", memory: "256Mi" }
    - name: pw
      image: 123.dkr.ecr.us-east-1.amazonaws.com/e2e-pw@sha256:4f3c…
      imagePullPolicy: IfNotPresent
      resources:
        requests: { cpu: "2", memory: "4Gi" }
        limits: { memory: "5Gi" }
      volumeMounts:
        - { name: dshm, mountPath: /dev/shm }
      env:
        - { name: CI, value: "true" }
```

```groovy
options { timeout(time: 40, unit: 'MINUTES') }
```

**Follow-ups & traps**
- "`sh` says playwright: not found`" — command ran in `jnlp`. `defaultContainer 'pw'` or `container('pw')`.
- Trap: no shm mount — file 01 Q3 all over again.
- Idle reuse + leftover Chrome profiles — flakes; prefer fresh pods for browsers.
- Resource requests omitted — BestEffort, evicted mid-suite (file 02 Q3).

**Senior/lead angle** — The pod YAML lives in the library, not copied into 50 repos. Teams pass `shards` and `suite`; they do not edit jnlp images.

**One-liner** — JNLP plus a digest-pinned golden container, honest CPU/memory, memory-backed `/dev/shm`, pipeline timeout — and `sh` must run in the browser container, not the agent sidecar.

### Q7. Credentials and secrets at org scale (folder credentials, HashiCorp Vault plugin, AWS Secrets Manager; masking failures).

**Interview answer** — Scope secrets as narrowly as Jenkins allows: **folder credentials** per team, not a global `browserstack-key` every pipeline can read. Prefer **Vault** or **AWS Secrets Manager** as the source of truth, with the plugin or a `withCredentials` that fetches at runtime (file 03 Q8). Masking: Credentials Binding masks known values; it will **not** mask a password you `echo` after `jq` split it, or a token Playwright printed in a trace. Fork PRs never see folder creds.

**Deep dive** — Credential types: secret text, file, username/password, SSH, AWS, secret file for kubeconfig. Folder vs global vs node. HashiCorp Vault plugin: AppRole or Kubernetes auth from the agent pod; `vaultToken` not stored in home if you can avoid it. AWS: instance profile on controller is too broad; agent IRSA per template is better. Azure Key Vault similar. Rotation: change in Vault, no Jenkins UI. Masking failures: multiline secrets, unicode lookalikes, secrets that appear in URLs in `set -x`. `set +x` around fetches. Pipeline `ansiColor` does not help. Audit: who used `credentialsId` — not great in OSS Jenkins; CloudBees has more. Failure: `withCredentials` wrapping only the test step but `npm ci` private registry token needed earlier.

**Code**

```groovy
stage('E2E') {
  steps {
    withCredentials([
      string(credentialsId: 'qa-bstack-key', variable: 'BSTACK_KEY'),
      usernamePassword(credentialsId: 'qa-test-user', usernameVariable: 'U', passwordVariable: 'P')
    ]) {
      container('pw') {
        sh '''
          set +x
          export TEST_USER_PASSWORD="$P"
          set -x
          npx playwright test
        '''
      }
    }
  }
}
```

```groovy
// Vault (conceptual)
withVault([vaultSecrets: [[path: 'secret/qa/e2e', secretValues: [[envVar: 'P', vaultKey: 'password']]]]]) {
  sh 'npx playwright test'
}
```

**Follow-ups & traps**
- "Where do you put the BrowserStack key?" — Folder for that product, from Vault, not `credentials.xml` click-ops forever.
- Trap: global creds "for convenience."
- Masking and traces — architecture-lead secrets file; disable traces on jobs that dump env, or redact.
- Untrusted `Jenkinsfile` from a fork — do not inject secrets (Q8).

**Senior/lead angle** — Secret graph: store → Jenkins mapping → folder RBAC → agent IRSA. Rotation drill. This is an audit finding waiting to happen if global.

**One-liner** — Folder-scoped credentials sourced from Vault or AWS, injected at runtime, masking treated as incomplete — never global keys, never secrets in traces.

### Q8. Multi-branch + org folders + GitHub org integration; PR decoration.

**Interview answer** — A **multibranch** job scans one repo for Jenkinsfiles and builds branches/PRs. An **Organization Folder** scans a GitHub/GitLab *org* (or list) and creates a multibranch per repo — that is how 50 jobs appear without DSL per repo. GitHub App credentials beat a user's PAT. PR **decoration** (checks API, status, optional Jenkins GitHub plugin comments) is what gates merge; build the **merge result**, not only the head (`question-bank/cicd/02` Q15). Discover only repos with a Jenkinsfile to avoid 200 empty jobs.

**Deep dive** — GitHub Branch Source: strategies, `buildOriginPRMerge`, fork trust (`from trusted users` vs everyone). GitHub App: installation, permissions `checks:write`, `contents:read`. Rate limits: org folder scan every minute on a 400-repo org will 403 — backoff, webhooks (`GitHub webhook` to `/github-webhook/`). Secondary: Jenkinsfile path `ci/Jenkinsfile`. Traits: `OriginPullRequestDiscoveryTrait`. Decoration: Check Run name stable so branch protection can require "e2e / checkout". Don't spam comments on every shard — one summary with the S3 URL. Security: `authorize-project` plugin, `trusted` vs untrusted libraries. Cost: building every branch of every repo — `buildsToKeep`, `exclude branches` `feature/*` if needed.

**Code**

```groovy
// org folder traits are usually JCasC, not a Jenkinsfile
// Jenkinsfile in the product repo:
when { changeRequest() }
steps { sh 'npx playwright test --grep @smoke' }
```

```yaml
# JCasC fragment
jobs:
  - script: |
      organizationFolder('github-org') {
        organizations { github { repoOwner('myorg'); credentialsId('github-app') } }
      }
```

**Follow-ups & traps**
- "PR green, main red" — you built the head, not the merge. Classic.
- Trap: org folder with `all repos` and no Jenkinsfile filter — scan storm.
- Fork PR + secrets — untrusted.
- Check name changes every plugin upgrade — protection rules break.

**Senior/lead angle** — One org folder, GitHub App, webhook, merge-queue compatible check names. New repo onboarding is "add Jenkinsfile" not "open a ticket for a job."

**One-liner** — Org folders auto-discover Jenkinsfiles; build PR merges; decorate via Checks API; webhooks not tight polling — and never trust fork pipelines with secrets.

### Q9. Scaling pain: executor starvation, quiet period, throttle, lockable resources (device farm slots), disableConcurrentBuilds.

**Interview answer** — **Starvation**: too few executors or fat labels — queue grows (Q1). **Quiet period**: seconds of wait after a push to coalesce bursts — good for `main`, annoying for "I clicked Build." **Throttle builds** / **Rate limit** plugins: cap concurrent jobs per folder so one squad cannot eat the cluster. **Lockable Resources**: named locks (`ios-phone-7`, `grid-chrome-slot-pool` with quantity) for things that are not horizontally scalable. `disableConcurrentBuilds(abortPrevious: true)` on PR pipelines so only the latest push runs.

**Deep dive** — Starvation vs slow tests: if occupancy D is 90 minutes, adding executors without sharding (cicd fundamentals) is a money fire. Quiet period vs webhooks: 5s quiet + 30 PR pushes = slower feedback; 0 quiet + 30 jobs = stampede. `milestone` / `lock` to serialize deploys. Lockable Resources: quantity matching Device Farm private slots; `lock('bstack-parallel') { }` with a pool size equal to the license. Failure: deadlock (job A holds lock 1 waits lock 2, inverse); always timeout on `lock`. `disableConcurrentBuilds` on a nightly that is also triggered by webhook — you skip nightlies accidentally; use it on change-request jobs. Fairness: Priority Sorter plugin — political. Cost: locks that serialize Linux Chrome as if it were a device — false scarcity.

**Code**

```groovy
options {
  disableConcurrentBuilds(abortPrevious: true)
  quietPeriod(5)
}
stage('iOS') {
  steps {
    lock(resource: 'devicefarm-ios', quantity: 1) {
      sh 'mvn -Dplatform=ios test'
    }
  }
}
```

```groovy
// throttle: at most 4 e2e of this folder
options {
  throttleJobProperty(
    categories: ['e2e-org-wide'],
    throttleEnabled: true,
    throttleOption: 'category',
    maxConcurrentPerNode: 0,
    maxConcurrentTotal: 4
  )
}
```

**Follow-ups & traps**
- "Everything queued behind a red nighty" — no throttle, one 40-executor job. Cap nightlies.
- Trap: `lock` around the entire pipeline including lint.
- `abortPrevious` on `main` — may abort a release train; use only on PRs.
- Quiet period 60s "to reduce load" — developers hate Jenkins, they don't hate load.

**Senior/lead angle** — Locks for true mutexes (devices, shared QA mutation). Elastic executors for Linux browsers. Throttle is a fairness policy published in the README.

**One-liner** — Size executors, coalesce with a small quiet period, throttle noisy folders, lock only real slots, abort stale PR builds — don't serialize Chrome as if it were an iPhone.

### Q10. High availability / controller bottleneck / cloud agents.

**Interview answer** — Classic OSS Jenkins is an **active-passive** story at best: one controller writes `JENKINS_HOME`. HA is "fast failover" (warm standby, CloudBees HA, or Kubernetes restart off a PVC) plus **horizontal scale of agents**, not two active controllers sharing jobs. The controller bottleneck is CPU/heap from many pipelines' CPS threads, huge logs, and plugin UI — fix by **no builds on controller**, shorter build history, external logging, splitting controllers per org, and moving work to agents. Cloud agents (K8s/EC2 plugin) remove the agent bottleneck that people mistake for needing HA.

**Deep dive** — Symptoms of controller overload: UI lag, "Waiting for next available executor" when agents are idle (actually Hudson queue thread stuck), GC pauses, webhook 504. Heap: 4–8 Gi typical; 32 Gi is a smell (too many jobs on one controller). Split: one controller per GitHub org or per safety domain (prod-deploy vs test-only). CloudBees Operations Center federates. Jenkinsfile CPS: heavy `script {}` loops on the controller — move work to `sh` on agents. WebSockets agents vs thousands of TCP connections. Disaster: failover without sticky OIDC cookies. Cost: two full Jenkins vs one + good agents — prefer the latter until the controller is the proven bottleneck (metrics Q12).

**Code**

```text
scale-out order
  1. executors off controller
  2. Kubernetes/cloud agents
  3. trim history + external logs
  4. split controller by org
  5. vendor HA if RTO demands hot standby
```

**Follow-ups & traps**
- "We'll run two controllers with a shared NFS home" — corrupted home, lock files. Don't unless a vendor design.
- Trap: "HA" meaning two agents.
- UI slow after 200k builds — history, not "need Kubernetes for Jenkins itself."
- Controller in a bursty spot node — your scheduler dies with the spot.

**Senior/lead angle** — RTO via JCasC rebuild plus agent elasticity. Buy CloudBees if the business wants vendor HA; don't pretend OSS is active-active.

**One-liner** — OSS Jenkins HA is fast restore plus many agents; the controller is a singleton scheduler — don't put tests on it, and split controllers before you NFS-share a home.

### Q11. Plugin risk management (security CVEs, pin versions, update cadence).

**Interview answer** — Plugins are Jenkins' feature and its CVE surface. I keep a **minimal allowlist** (`plugins.txt` with versions), I do **not** click "update all" on production, I soak on a staging controller, and I watch the weekly security advisories. Abandoned plugins that block core upgrades get replaced or dropped. Every plugin is a supply-chain dependency.

**Deep dive** — Pin: `git:5.2.1` not `git:latest`. Update cadence: monthly core, weekly security if needed, with a rollback AMI/PVC snapshot. Staging: same JCasC, synthetic jobs. Plugin health: last release date, required core version, issue tracker. Custom plugins: treat as internal products. `script-security` / `pipeline-groovy` — keep current. Failure: "Pipeline: Job" plugin skew vs workflow-cps — the classic half-upgrade. Detached plugins in modern cores. Cost: two days of SDET time per bad update vs a CVE on the GitHub plugin.

**Code**

```text
# plugins.txt (Jenkins Configuration as Code / plugin installation manager)
kubernetes:4296.v20a_7e4d77cf6
workflow-aggregator:600.vb_57c...
git:5.2.2
credentials-binding:681.vf91669a_32e45
configuration-as-code:1850.va_a_8c...
# NO: random UI cosmetics, abandoned publishers
```

```bash
# update with a PR, not on the box
jenkins-plugin-cli --plugin-file plugins.txt --plugin-download-directory plugins/
```

**Follow-ups & traps**
- "How soon after a GitHub plugin CVE?" — Read the advisory, if RCE then emergency window; if XSS on the controller UI, still fast. Have a process.
- Trap: 180 plugins "because someone needed it in 2018."
- Update all on Friday before a release train.
- Pipeline libraries depending on a plugin's global step — version the pairing.

**Senior/lead angle** — Plugin owner is the platform team; quarterly "kill unused." This is the Jenkins equivalent of golden-image CVE policy.

**One-liner** — Allowlist and pin plugins, soak on staging, patch on a cadence driven by advisories — "update all" on prod is how you spend the weekend.

### Q12. Observability of Jenkins itself (build queue time as a quality metric).

**Interview answer** — Jenkins is part of the developer experience SLO. I export **queue time** (time waiting for an executor), **job duration**, **failure rate**, **controller CPU/heap**, **agent online count**, **pod start latency** (Kubernetes plugin), and **webhook-to-start**. Queue time is a *quality* metric: a 15-minute e2e that waited 40 minutes is a 55-minute feedback loop. Prometheus + Jenkins metrics plugin or OpenTelemetry; logs off-box.

**Deep dive** — Plugins: Prometheus, Metrics, OpenTelemetry. Labels: job folder, label requested, PR vs nightly. Alert: p95 queue > 5 minutes during working hours; agent disk > 80%; executors on controller > 0. Correlate with cluster Pending (file 02). Build time vs queue time stacked chart for leadership. Cost: queue time × engineer count is the hidden salary burn (`question-bank/architecture-lead/05`). Do not alert on every red e2e — that's the suite's SLO; alert on platform faults (queue, OOM of controller, cloud provision failures).

**Code**

```text
SLOs (example)
  p95 queue wait (weekday 9–6) < 3 min for label=playwright
  p95 pod provision < 90 s
  controller API p95 < 500 ms
  backup success 100% daily
```

```groovy
// emit a custom metric from the library
qaMetrics.queueWait(env.JOB_NAME, currentBuild.getStartTimeInMillis() - currentBuild.timeInMillis)
```

**Follow-ups & traps**
- "Jenkins is slow" — split queue vs execution vs app under test. Three different owners.
- Trap: only looking at job duration in the UI trend (excludes queue).
- Metrics plugin left unauthenticated — scrape is public.
- No agent disk metric — Playwright videos fill it, then "flaky" checkouts.

**Senior/lead angle** — Put queue time on the same dashboard as flake rate. Platform review weekly. This is how you justify Kubernetes agents to finance.

**One-liner** — Measure queue wait, provision latency, and controller health as SLOs — a fast suite behind a 40-minute queue is a failed platform.

### Q13. Jenkins vs GitHub Actions vs GitLab vs Buildkite at org-decision level (TCO, lock-in, ephemeral, secrets, compliance).

**Interview answer** — I compare **TCO** (people + minutes + idle VMs), **lock-in** (Groovy libraries vs Actions YAML vs GitLab includes vs Buildkite pipelines-as-code + plugins), **ephemeral compute** (native vs plugin achievement), **secrets** (OIDC to cloud vs stored keys), and **compliance** (VPC, air-gap, audit). Defaults: GitHub shop → Actions + OIDC, self-hosted runners if VPC. GitLab shop → GitLab CI. Heterogeneous or heavy on-prem plugins → Jenkins. High-scale hosted with opinionated UX → Buildkite (agents you run, control plane they run). I refuse "Jenkins is legacy therefore migrate next quarter" without a 200-job playbook (Q14).

**Deep dive** —

| Dimension | Jenkins | Actions | GitLab CI | Buildkite |
| --- | --- | --- | --- | --- |
| Control plane | You | GitHub | GitLab.com or self | Buildkite |
| Agents | You (K8s/EC2) | GH-hosted or self | Shared or self | You (elastic) |
| Pipeline language | Groovy/declarative | YAML | YAML | YAML + plugins |
| Org reuse | Shared libraries | Reusable workflows | Includes/CI templates | Plugins + YAML |
| Secrets | Vault/folder/OIDC | OIDC native | OIDC / protected vars | Agent + vault |
| Compliance air-gap | Strong | Harder | Self-managed strong | Agents yes, control plane SaaS |
| TCO shape | Staff-heavy | Minutes-heavy | Mixed | Minutes + agent VMs |

Lock-in: shared libraries are deep lock-in; reusable workflows are shallower but GitHub-shaped. Ephemeral: Actions default; Jenkins via K8s plugin. Feature checklist wars are junior; TCO + constraints are senior. Hybrid during migration is mandatory.

**Code**

```text
decision prompts
  - Where does the code live?
  - Must tests run in our VPC?
  - How many pipelines, how custom?
  - Do we already staff a controller?
  - What is the audit requirement for logs/secrets?
```

**Follow-ups & traps**
- "Which is best?" — For whom. Repeat the table, pick with constraints.
- Trap: dismissing Jenkins at a bank that cannot use GH-hosted runners.
- Buildkite vs Actions — Buildkite for agent control with less Jenkins ops; still a vendor.
- TCO forgetting SDET time maintaining 50 copy-pasted workflows.

**Senior/lead angle** — This *is* the staff question. Deliver a one-pager: constraints, 3-year TCO, migration risk, recommendation. Not a Twitter take.

**One-liner** — Choose on TCO, secrets/OIDC, where compute must live, and reuse model — Actions/GitLab when the VCS is home, Jenkins when plugins/VPC/staff already justify it, Buildkite when you want hosted control with your agents.

### Q14. Lead playbook: migrating 200 Freestyle jobs to pipeline-as-code without stopping the business.

**Interview answer** — Inventory, classify, templatize, dual-run, cut over by wave, delete. I do **not** freeze development for a rewrite. Waves: (1) already-simple jobs → Job DSL + stock library, (2) high-churn product repos that want PRs, (3) snowflakes last or never (a true one-click admin job can stay Freestyle). Success is org folders + Jenkinsfiles in repos + Freestyle count trending to zero, with the same or better gates.

**Deep dive** — **Inventory**: name, owner, trigger, SCM, secret IDs, downstream jobs, last build date (delete the dead first — often 30%). **Classify**: e2e / build / deploy / cron glue. **Template**: `qaPlaywright`, `qaMaven`, `qaDeploy` covering 80%. **Dual-run**: Freestyle and pipeline on the same webhook, compare exit codes and artifacts for N days; pipeline is informational then becomes the required check. **Secrets**: map UI creds to folder/Vault as you touch each wave. **Downstream**: Freestyle `build other project` becomes `build job:` or a better event (SNS/EventBridge). **Comms**: per-squad champion, office hours, changelog. **Stop-the-business risks**: cron jobs nobody understands; production deploy Freestyle — those get extra rehearsal. **Metrics**: Freestyle count, mean time to new repo onboard, queue SLO. Timeline: calendar time depends on org size; the *shape* is waves, not a big-bang weekend. Rollback: keep Freestyle disabled-not-deleted for one sprint.

**Code**

```text
wave 0  disable jobs with 0 builds in 90 days (after owner ping)
wave 1  80 "run tests on git push" jobs → org folder + library
wave 2  parameterized env-select jobs → pipeline parameters
wave 3  chained downstream → single pipeline stages or events
wave 4  deploys → dedicated CD with approvals
wave 5  leftovers: document why they remain
```

```groovy
// strangler: pipeline calls old job if a flag is on
if (params.USE_LEGACY_FREESTYLE) {
  build job: 'legacy/shop-e2e', wait: true
} else {
  qaPlaywright shards: 6
}
```

**Follow-ups & traps**
- "Big-bang holiday cutover?" — No. Dual-run. This is the trap.
- Trap: rewriting 200 unique Jenkinsfiles with no library — you migrated the mess.
- Owners unknown — the inventory *is* the first deliverable; missing owners go to a stewardship round.
- Deleting Freestyle the day pipeline goes green — keep a rollback window.

**Senior/lead angle** — Program management: inventory, waves, champions, dual-run gates, metrics. Technical excellence without the playbook still stops the business.

**One-liner** — Inventory and delete the dead, template the 80% into a library, dual-run waves by squad, strangler-fig the rest — never a freeze weekend that rewrites 200 jobs at once.
