# Selenium — overview & best practices

**Architecture context:** [framework-design §3](../../framework-design/NOTES.md#3-web--selenium-architecture)  
**Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

## Stack

```text
Test → Java bindings → W3C WebDriver → ChromeDriver → Browser
```

Remote: `RemoteWebDriver` → Grid hub → node.

## Best practices

- Explicit waits (`WebDriverWait` + `ExpectedConditions`)  
- Page Object Model — locators private  
- `data-testid` partnership with dev  
- One driver per test for parallel  
- Grid/cloud for browser matrix  
- Quit in `@AfterEach` — prevent zombie processes  

## Avoid

- `Thread.sleep`  
- Static shared WebDriver  
- XPath from root with indices  
- Implicit wait + explicit wait confusion  

## SDET depth topics

Synchronization, frames/alerts/windows, Actions API, JS executor, file upload, cookies, headless vs headed, capabilities, Grid scaling.
