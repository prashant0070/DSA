# Debugging engineering

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Senior and Lead interviews often reward the best debugger, not the person who remembers the most trivia.

## Scope

### Java

- `NullPointerException`
- `ConcurrentModificationException`
- race conditions
- deadlocks
- OOM and leaks

### UI automation

- stale element
- element intercepted
- timeout
- context leakage
- browser crash

### API and platform

- HTTP 500 vs timeout vs retry storm
- connection pool exhaustion
- DNS and TLS failures
- auth and token issues

### Distributed / CI

- consumer lag
- duplicate events
- eventual consistency failure
- only fails on Linux
- only fails in parallel
- only fails nightly

## Practice method

For each scenario answer:

1. What evidence do I need first?
2. What are the most likely layers?
3. What would I rule out quickly?
4. What permanent fix would I propose?
