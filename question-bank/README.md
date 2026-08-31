# SDET Interview Question Bank — TypeScript, Playwright, CI/CD, Lead/Architecture

A detailed, answer-first question bank: **417 questions across 30 files**, built from a consolidated master list of real interview questions plus the gap topics interviewers actually probe (Locator vs ElementHandle, setup projects, sharding, Jenkins shared libraries, mock-vs-contract-vs-E2E decisions, AI/MCP in QA).

Every question follows the same template:

- **Interview answer** — what you say aloud, 2–5 sentences
- **Deep dive** — internals, why it works that way, trade-offs
- **Code** — modern Playwright Test + TypeScript (no deprecated APIs)
- **Follow-ups & traps** — the cross-questions that come next, and common wrong answers
- **Senior/lead angle** — how to elevate the answer for Senior/Staff loops
- **One-liner** — a single sentence to memorize

## Tracks

### 1. TypeScript (50 questions) — [typescript/](typescript/)

Playwright interviews assume the Node.js runner, so TS/JS fundamentals are asked before any Playwright question.

| File | Covers |
| --- | --- |
| [01-typescript-fundamentals.md](typescript/01-typescript-fundamentals.md) | Types, interface vs type, generics, utility types, narrowing, tsconfig, classes, destructuring |
| [02-async-await-and-promises.md](typescript/02-async-await-and-promises.md) | Event loop, the forgotten-`await` classic, Promise.all patterns, forEach trap, typed retry/poll utilities |
| [03-typescript-coding-questions.md](typescript/03-typescript-coding-questions.md) | 16 coding problems with typed solutions and complexity notes |

### 2. Playwright (215 questions) — [playwright/](playwright/)

| File | Covers |
| --- | --- |
| [01-fundamentals-and-architecture.md](playwright/01-fundamentals-and-architecture.md) | What/why Playwright, vs Selenium AND vs Cypress, Browser→Context→Page, protocol internals, language-binding differences |
| [02-installation-execution-and-cli.md](playwright/02-installation-execution-and-cli.md) | Install, CLI, headed/debug/UI mode, codegen, tags/grep, retries, reporters, channels |
| [03-locators.md](playwright/03-locators.md) | getBy* strategies, Locator vs ElementHandle, strict mode, chaining/filtering, shadow DOM, dynamic-ID scenarios |
| [04-auto-waiting-and-actions.md](playwright/04-auto-waiting-and-actions.md) | Actionability checks, the waitForTimeout pushback, fill vs pressSequentially, dropdowns, drag, scroll, the waiting map |
| [05-assertions-and-test-structure.md](playwright/05-assertions-and-test-structure.md) | Web-first assertions, expect.poll/toPass, custom matchers, hooks, skip/only/fixme/fail, test.step, execution order |
| [06-tabs-frames-and-dialogs.md](playwright/06-tabs-frames-and-dialogs.md) | New tabs/popups (wait-before-click race), frameLocator, dialog auto-dismiss trap, basic auth |
| [07-authentication-and-storage-state.md](playwright/07-authentication-and-storage-state.md) | storageState, setup projects, API login, multi-role parallel auth, stale-token handling |
| [08-fixtures.md](playwright/08-fixtures.md) | test.extend, worker vs test scope, auto fixtures, options, overriding built-ins, mergeTests |
| [09-page-object-model.md](playwright/09-page-object-model.md) | POM in Playwright vs Selenium, component objects, fixture-injected POMs, assertions-in-POM debate, refactoring |
| [10-configuration-and-projects.md](playwright/10-configuration-and-projects.md) | playwright.config.ts, use inheritance, projects/dependencies, env config, timeout hierarchy, webServer |
| [11-parallel-execution-and-sharding.md](playwright/11-parallel-execution-and-sharding.md) | Workers, fullyParallel, serial mode, worker-isolated data, shards + blob report merging |
| [12-network-interception-and-api-testing.md](playwright/12-network-interception-and-api-testing.md) | route.fulfill/continue/abort, waitForResponse, HAR replay, APIRequestContext, WebSockets, page.clock |
| [13-file-upload-and-download.md](playwright/13-file-upload-and-download.md) | setInputFiles, filechooser, download verification (content, not just presence), invalid/large files |
| [14-debugging-tracing-and-advanced.md](playwright/14-debugging-tracing-and-advanced.md) | Trace Viewer, Inspector, visual regression, accessibility, device emulation, evaluate/addInitScript |
| [15-flaky-tests.md](playwright/15-flaky-tests.md) | Flakiness taxonomy, CI-only failure playbook, flaky-vs-real-defect, quarantine, prevention by design |
| [16-scenario-questions.md](playwright/16-scenario-questions.md) | Worked solutions: cheapest-flight calendar, dynamic tables, pagination, infinite scroll, autocomplete, wizards |

### 3. CI/CD (70 questions) — [cicd/](cicd/)

| File | Covers |
| --- | --- |
| [01-cicd-fundamentals.md](cicd/01-cicd-fundamentals.md) | CI vs CD vs CD, pipeline design for test stages, quality gates, artifacts, parallelism layers |
| [02-jenkins.md](cicd/02-jenkins.md) | Deep dive: pipelines, full Playwright Jenkinsfile, agents, CRON + `H`, credentials, shared libraries, scaling Jenkins |
| [03-github-actions-and-modern-ci.md](cicd/03-github-actions-and-modern-ci.md) | Canonical Playwright workflow, matrix + sharding + merge-reports, caching, secrets, reusable workflows |
| [04-docker-for-test-automation.md](cicd/04-docker-for-test-automation.md) | Playwright image version-matching trap, --ipc=host, compose stacks, resource limits, K8s at scale |
| [05-reporting-and-artifacts.md](cicd/05-reporting-and-artifacts.md) | Reporters, publishing, sharded-report merging, Allure, custom reporters, flakiness metrics, exec reporting |

### 4. Lead / Architecture (82 questions) — [architecture-lead/](architecture-lead/)

| File | Covers |
| --- | --- |
| [01-framework-architecture.md](architecture-lead/01-framework-architecture.md) | Framework structure with rationale, design patterns (incl. Singleton-in-parallel trap), monorepo vs central repo, maintaining thousands of tests |
| [02-test-data-management.md](architecture-lead/02-test-data-management.md) | Factories/builders, parallel-safe uniqueness, cleanup strategies, seeding trade-offs, PII |
| [03-environments-and-secrets.md](architecture-lead/03-environments-and-secrets.md) | Env config layering, secret stores, secrets-in-trace-files trap, ephemeral PR environments |
| [04-test-strategy-and-release.md](architecture-lead/04-test-strategy-and-release.md) | Smoke vs regression, automate-vs-manual ROI, "20 minutes before deploy", green-tests-but-prod-broken |
| [05-scaling-integration-and-observability.md](architecture-lead/05-scaling-integration-and-observability.md) | Multi-team platforms, hours→minutes CI, API+UI+DB architecture, mock/contract/E2E decision framework, SQL for SDETs |
| [06-ai-in-qa-and-sdet.md](architecture-lead/06-ai-in-qa-and-sdet.md) | MCP and Playwright agents, AI test/data generation, failure analysis, self-healing locator risks, AI-powered framework design |

## Recommended study order

1. **TypeScript first** (files 01–02 minimum) — async/await questions gate everything else.
2. **Playwright core**: 01 → 05 in order (fundamentals, execution, locators, waiting, assertions).
3. **Playwright applied**: 06 → 10 (tabs/frames, auth, fixtures, POM, config).
4. **Playwright scale**: 11 → 16 (parallel, network, files, debugging, flakiness, scenarios).
5. **CI/CD**: fundamentals → Jenkins or GitHub Actions depending on the target company → Docker → reporting.
6. **Lead/architecture**: all six files; these are the differentiators for Senior/Staff loops.
7. **TypeScript coding** (file 03) throughout, a few problems per day.

## How to drill

- Read the **Interview answer**, close the file, say it aloud, then check yourself.
- For every question, also answer the **Follow-ups & traps** bullets — that's where loops are won.
- Before an interview, re-read only the **One-liner** sections of the tracks you'll face.
- Java/Selenium equivalents, DSA, SQL depth, and behavioral prep live in the rest of this repo — see the [root README](../README.md).
