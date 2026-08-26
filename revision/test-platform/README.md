# Test platform engineering

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

This domain turns framework knowledge into platform and SDET III / Lead-level architecture.

## Core idea

Move from:

- tests
- browser
- CI

To:

- scheduler
- queue
- worker fleet
- browser/device pool
- artifact pipeline
- result store
- flake classification
- capacity planning

## Scope

### Distributed execution

- test queue
- worker claim protocol
- heartbeats and leases
- retries and idempotency
- cancellation and timeouts

### Browser and device infrastructure

- browser pool
- device reservation
- health checks
- image/version management
- shard strategy

### Results and analytics

- result ingestion
- artifact storage
- historical trends
- flaky signature clustering
- quarantine workflow

### Ops and cost

- resource allocation
- capacity planning
- queue delay
- cost per run / per device minute
- build vs buy decisions

## Interview questions

- Design a distributed UI test runner.
- Design a device farm.
- How do you auto-detect flaky tests?
- How do you scale from one team to ten teams without chaos?
