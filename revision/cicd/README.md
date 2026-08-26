# CI/CD architecture

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

CI/CD matters far beyond “Jenkins vs GitHub Actions.”

## Scope

### Pipeline flow

- PR validation
- build
- unit
- contract
- integration
- smoke
- regression
- performance
- release

### Design concerns

- fail-fast vs full visibility
- shard strategy
- artifacts and logs
- matrix execution
- environment promotion
- feature flags
- blue/green and canary awareness
- rollback playbooks

### Quality angle

- what blocks merge?
- what blocks release?
- how do you stop flaky chaos from breaking trust?

## Interview questions

- How do you reduce CI time without reducing confidence?
- What belongs in PR vs nightly?
- How do you design reliable gates for a fast-moving org?
