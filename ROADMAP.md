# Repo roadmap — complete SDET II / III / Lead interview prep

This repository is designed to become your **single primary preparation system** for SDET interviews across coding, automation, systems, leadership, and AI-enabled quality engineering.

It should not mean “the only thing you ever read on the internet.” It means that if you follow this repo end-to-end, all core interview topics, practice tracks, mock loops, and revision maps are already organized here.

## Goal

Cover the full preparation surface for:

- SDET II
- Senior SDET
- SDET III
- Lead SDET / QA Lead
- SDE-adjacent SDET loops at Amazon, Apple, Google, Meta, Microsoft, Uber, Atlassian and similar product companies

## Core principle

Do not learn in random order.

Build in this sequence:

1. Java + OOP + complexity + DSA foundations
2. Coding fluency and production Java design
3. Concurrency, debugging, DB internals, networking
4. Automation architecture and platform thinking
5. Distributed systems, Kafka, observability, security
6. System design, quality strategy, leadership, company-specific behavior

## Target outcome by level

| Level | Must be strong in | Nice-to-have but not blocker |
| --- | --- | --- |
| SDET II | Easy/medium coding, OOP, API/UI/mobile basics, SQL, framework basics, 5 STAR stories | Deep distributed systems |
| Senior SDET | Medium coding fluency, framework architecture, debugging, CI/CD, SQL internals, basic HLD/LLD | Advanced platform ownership |
| SDET III | Medium + selected advanced coding, concurrency, distributed systems, test platform design, observability, leadership stories | Deep org roadmap |
| Lead SDET | Quality strategy, platform architecture, org influence, system design, metrics, hiring/mentoring, technical depth | Hard-core algorithm depth beyond interview bar |

## Workstreams in this repo

### 1. Foundations

- `00-oop-foundations/`
- `01-java-fundamentals/`
- `02-complexity/`
- `03-dsa-patterns/`

### 2. Build your own structures

- `01-linear-structures/`
- future phases `02`–`10`

### 3. Coding practice

- `practice/easy/`
- `practice/medium/`
- `practice/advanced/`
- `practice/production-java/`
- `practice/system-coding/`

### 4. Revision domains

- `revision/java-engineering/`
- `revision/design-patterns/`
- `revision/framework-design/`
- `revision/automation/`
- `revision/typescript-playwright/`
- `revision/api-http/`
- `revision/sql/`
- `revision/distributed-systems/`
- `revision/networking/`
- `revision/observability/`
- `revision/security/`
- `revision/quality-engineering/`
- `revision/test-platform/`
- `revision/docker/`
- `revision/kubernetes/`
- `revision/aws/`
- `revision/cicd/`
- `revision/git/`
- `revision/performance/`
- `revision/debugging/`
- `revision/ai-sdet/`
- `revision/system-design/`
- `revision/behavioral/`
- `revision/lead-sdet/`

## Gap-closure waves

### Wave 1 — coding base first

- Finish Java/OOP/complexity/patterns
- Complete easy set
- Expand medium by pattern, not randomly
- Start production Java exercises

### Wave 2 — engineering depth

- JVM
- collections internals
- concurrency
- debugging
- DB internals
- networking

### Wave 3 — SDET III platform depth

- distributed systems
- Kafka/event-driven testing
- test platform engineering
- observability
- security
- quality strategy

### Wave 4 — tool depth

- Playwright internals and TypeScript
- Selenium Grid 4 / BiDi / CDP
- Appium device-farm thinking
- API engineering and contracts
- cloud/platform depth

### Wave 5 — lead-level execution

- HLD/LLD platform designs
- org roadmap and metrics
- hiring, mentoring, influence
- company-specific behavioral mapping

## Rules for using this repo well

1. Notes are not readiness. Implementation + explanation under time is readiness.
2. Coding remains Java-first. TypeScript and Python are support languages.
3. Do not add every technology. Add depth in the chosen stack.
4. Review weak topics weekly using mock questions.
5. Every major domain should answer two questions:
   - What is asked in interviews?
   - How do I practice this, not just read it?

## Weekly rhythm

| Day | Primary work |
| --- | --- |
| Mon–Thu | Coding problems + one concept revision |
| Fri | Deep revision track: concurrency, SQL, Playwright, Kafka, etc. |
| Sat | System design / framework / platform whiteboard |
| Sun | Behavioral mock + weak-pattern review |

## Exit criterion

The repo is “complete enough” for a loop when you can do all of the following:

- Solve medium coding problems cleanly in Java under time
- Explain framework/test architecture with trade-offs
- Design a distributed test platform and defend the trade-offs
- Debug flaky, API, CI, concurrency and distributed failures aloud
- Tell 8–10 metric-backed STAR stories tailored by company
- Speak to security, observability, reliability, and release strategy as an engineering leader
