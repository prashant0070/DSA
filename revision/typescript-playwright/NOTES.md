# TypeScript for Playwright — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Java remains coding-interview language. TS is for modern Playwright engineering credibility.

---

## 1. TypeScript essentials

- `type` / `interface` for shapes
- Classes optional; many codebases prefer functions + types
- Generics: `Promise<T>`, `Fixture<T>`
- `async`/`await` over raw Promise chains
- Modules: `import`/`export`
- Union types, optional fields (`?`)
- `unknown` vs `any` (prefer unknown)

---

## 2. Async mental model

```ts
const res = await page.request.get('/api');
expect(res.ok()).toBeTruthy();
```

Unawaited promises → flaky races. Always await Playwright APIs.

---

## 3. Playwright + TS surfaces

| Surface | Why |
| --- | --- |
| `playwright.config.ts` | projects, retries, reporters, baseURL |
| Fixtures | custom test context (auth, api) |
| `storageState` | reused auth |
| Projects | chromium/firefox; setup dependencies |
| Locators | auto-wait; prefer getByRole |
| Trace / video | failure artifacts |

---

## 4. npm basics

`package.json` scripts, lockfile, install in CI cache, pin Playwright browsers version with deps.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
