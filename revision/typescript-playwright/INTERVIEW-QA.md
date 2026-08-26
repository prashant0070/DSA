# TypeScript + Playwright — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Why TypeScript with Playwright?
Typed configs/fixtures, better IDE help, safer refactors in large suites.

### Q2. interface vs type?
Often interchangeable for object shapes; types more flexible for unions/mapped types. Don’t bike-shed — know both exist.

### Q3. What breaks if you forget await?
Test continues before action finishes → flake or false pass/fail.

### Q4. Fixtures vs global beforeAll?
Fixtures isolate per-test and compose; global setup shares state carefully (auth project dependency pattern).

### Q5. How reuse login?
`storageState` from setup project; avoid UI login every test.

### Q6. Java vs TS in interview?
Code algorithms in Java here; read/write Playwright TS for role realism.
