# Playwright — overview & best practices

**Make this a strength.** Full architecture: [framework-design §4](../../framework-design/NOTES.md#4-web--playwright-architecture-make-this-a-strength)  
**Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

## Model

```text
Browser → Context (isolated session) → Page → Locator
```

## Best practices

- **One Context per test** in parallel  
- Locators: `getByRole`, `getByTestId`  
- Fixtures for setup/teardown  
- `storageState` for auth reuse  
- Trace on first retry in CI  
- `page.route()` for network mock  
- APIRequestContext for API-only steps  
- Projects for browser matrix  
- Sharding: `--shard=i/n`  

## Avoid

- Shared context across tests  
- CSS nth-child chains  
- Disabling auto-wait without reason  
- Giant tests without business layer  

## CI config essentials

```text
workers: CPU cores
retries: 1 in CI
trace: on-first-retry
video: retain-on-failure
```
