# TypeScript Fundamentals for SDET Interviews

This file covers the core TypeScript questions asked in SDET interviews for Playwright roles: the type system, generics, utility types, classes, modules, and the language features Playwright's API is built on. Interviewers use these to check whether you can design and maintain a typed framework, not just record scripts. Every answer is calibrated for TypeScript 5.x and Node 20+.

- Q1. Why TypeScript over JavaScript for test automation frameworks?
- Q2. What is type inference? When do you annotate explicitly?
- Q3. `any` vs `unknown` vs `never`
- Q4. `interface` vs `type` alias
- Q5. Optional (`?`) and `readonly` properties
- Q6. Union and intersection types
- Q7. Literal types for safer configs
- Q8. `enum` vs `const enum` vs union of string literals
- Q9. Generics: functions, interfaces, constraints
- Q10. Utility types: Partial, Required, Pick, Omit, Record, ReturnType, Awaited
- Q11. Type narrowing and type guards
- Q12. Type assertion (`as`) vs casting
- Q13. `strictNullChecks`, optional chaining `?.`, nullish coalescing `??` vs `||`
- Q14. Modules: import/export, default vs named exports
- Q15. tsconfig options that matter for a Playwright project
- Q16. Classes: access modifiers, readonly, static, abstract
- Q17. Arrow functions vs regular functions and `this`
- Q18. Destructuring and spread/rest
- Q19. Map/Set vs plain objects/Record
- Q20. Error handling: `unknown` in catch, custom errors, `.d.ts` files

### Q1. Why TypeScript over JavaScript for test automation frameworks?

**Interview answer** — TypeScript catches whole classes of bugs at compile time instead of at test runtime, which matters because a flaky suite that fails on a typo wastes CI hours. It gives us autocomplete and refactoring safety across page objects, fixtures, and test data, so a rename in a page object breaks the build, not the nightly run. Playwright itself is written in TypeScript, so we get first-class typings for every API, and typed fixtures via `test.extend` are only really usable from TS.

**Deep dive**

- Tests have no user to report bugs — a wrong property name in a JS test fails only when that test runs, possibly days later. TS moves that failure to the editor.
- Framework-scale benefits: typed page objects mean `loginPage.sumbit()` is a compile error, not a runtime `undefined is not a function` buried in a trace.
- Typed test data: an `Order` interface keeps builders, API stubs, and assertions in sync when the backend contract changes.
- Playwright ships `.d.ts` typings and its docs default to TS; `test.extend<MyFixtures>()` needs a type argument to be safe.
- Cost: a compile step and a learning curve — but with `ts-node`/Playwright's built-in transpilation there is no separate build to manage.

**Follow-ups & traps**

- "Doesn't TS slow you down?" — Playwright transpiles test files on the fly; type checking can run as a separate CI step (`tsc --noEmit`), so runtime speed is unchanged.
- "Can't JSDoc give you the same?" — partially, but no enforcement of generics/fixtures, and it degrades under refactoring.
- Trap: claiming TS prevents runtime bugs entirely — it only checks what's typed; API responses still need runtime validation.

**Senior/lead angle** — On a team, TS is a contract enforcement tool: page-object interfaces, fixture shapes, and test-data schemas become explicit and reviewable, which is what keeps a 50-engineer suite maintainable.

**One-liner** — TypeScript moves test failures from CI runtime to compile time and makes a large Playwright framework refactorable.

### Q2. What is type inference? When do you annotate explicitly?

**Interview answer** — Inference means the compiler figures out a type from the value, so `const retries = 3` is `number` without me writing it. I annotate at boundaries: function parameters, return types of public/exported functions, and empty or ambiguous initializers like `const results: TestResult[] = []`. Inside function bodies I let inference work — redundant annotations are noise.

**Deep dive**

- `const env = 'qa'` infers the literal type `'qa'`; `let env = 'qa'` widens to `string`. This widening is why configs sometimes need `as const` or explicit literal-union annotations.
- Return-type annotations on exported functions act as documentation and stop accidental API changes from leaking (the compiler errors at the source, not at 40 call sites).
- Contextual inference: in `test('login', async ({ page }) => {...})`, `page` is inferred as `Page` from Playwright's own types — you never annotate it.

```ts
const timeouts = { action: 10_000, navigation: 30_000 }; // inferred { action: number; navigation: number }

// Annotate the boundary; let the body infer
export function buildOrder(overrides: Partial<Order> = {}): Order {
  const base = { id: crypto.randomUUID(), status: 'pending', items: [] }; // inferred
  return { ...base, ...overrides } as Order;
}
```

**Follow-ups & traps**

- "What type does `const x = []` get?" — `any[]` (or `never[]` under some settings); always annotate empty arrays.
- Trap: annotating everything "for clarity" — it hides real signal and fights inference improvements in newer TS versions.
- Follow-up: `as const` — freezes literals and makes arrays/objects readonly with literal element types.

**One-liner** — Let inference handle locals, annotate function boundaries and empty initializers.

### Q3. `any` vs `unknown` vs `never`

**Interview answer** — `any` opts out of type checking entirely — you can call anything on it and the compiler stays silent, so it's how bugs sneak into typed code. `unknown` is the safe counterpart: it accepts any value but you must narrow it before use, which is why it's the right type for API responses and `catch` variables. `never` is the type of values that can't exist — a function that always throws returns `never`, and it's what's left after exhaustive narrowing, which we exploit for exhaustiveness checks.

**Deep dive**

- `any` is contagious: one `any` API response spreads through every assertion built on it.
- `unknown` forces a runtime check (type guard, schema validation) before property access — exactly what untrusted data needs.
- `never` in practice: exhaustive `switch` over a status union — if someone adds a status and forgets a case, assigning to `never` fails to compile.

```ts
async function getOrder(page: APIRequestContext, id: string): Promise<unknown> {
  return (await page.get(`/api/orders/${id}`)).json();
}

type OrderStatus = 'pending' | 'shipped' | 'cancelled';

function labelFor(status: OrderStatus): string {
  switch (status) {
    case 'pending': return 'Awaiting shipment';
    case 'shipped': return 'On the way';
    case 'cancelled': return 'Cancelled';
    default: {
      const exhaustive: never = status; // compile error if a new status is added
      throw new Error(`Unhandled status: ${exhaustive}`);
    }
  }
}
```

**Follow-ups & traps**

- "When is `any` acceptable?" — rare escape hatches at untyped third-party boundaries, ideally quarantined behind a typed wrapper immediately.
- Trap: saying `unknown` and `any` are "basically the same" — the whole point is `unknown` requires narrowing.
- Follow-up: "What returns `never`?" — `throw`-only functions, infinite loops, and impossible intersections like `string & number`.

**One-liner** — `any` disables checking, `unknown` demands narrowing, `never` marks the impossible — prefer `unknown` at every untrusted boundary.

### Q4. `interface` vs `type` alias

**Interview answer** — For object shapes they're mostly interchangeable, so the honest answer is: interfaces support declaration merging and are extended with `extends`; type aliases can express things interfaces can't — unions, tuples, mapped and conditional types. My convention is interfaces for public object contracts like page-object or fixture shapes, and type aliases for unions, function types, and derived types. The one hard requirement: only `interface` can merge, which is how you augment third-party types like extending Playwright or Node globals.

**Deep dive**

- Declaration merging: two `interface Config {...}` declarations in the same scope merge; two `type Config = ...` declarations are a compile error. Merging is what powers module augmentation (`declare module '@playwright/test' {...}`).
- `extends` vs intersection: `interface A extends B` errors immediately on incompatible members; `type A = B & C` silently produces `never` members on conflicts — `extends` gives better diagnostics.
- Only `type` can do: `type Result = Passed | Failed`, `type Handler = (r: Response) => void`, mapped types, `keyof` gymnastics.
- Performance folklore: interfaces are marginally cheaper for the checker on huge codebases; not a deciding factor for a test framework.

```ts
interface LoginPageActions {
  goto(): Promise<void>;
  login(user: string, pass: string): Promise<void>;
}

type Env = 'qa' | 'staging' | 'prod';               // union — type only
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
```

**Follow-ups & traps**

- "Which do you use for fixtures?" — a `type` or `interface` both work with `test.extend<MyFixtures>()`; pick one and be consistent.
- Trap: claiming interfaces are "faster at runtime" — both are erased; there is no runtime difference.
- Follow-up: "How would you add a custom property to Playwright's `TestInfo`?" — module augmentation, which requires interface merging.

**Senior/lead angle** — Codify the choice in a lint rule (`@typescript-eslint/consistent-type-definitions`) so the team doesn't relitigate it in every review.

**One-liner** — Interfaces merge and extend; type aliases express unions and derived types — use interfaces for contracts, types for everything else.

### Q5. Optional (`?`) and `readonly` properties

**Interview answer** — `?` marks a property that may be absent, and its type becomes `T | undefined` at use sites, so the compiler forces a check. `readonly` prevents reassignment after construction, which I use for things that must not drift mid-test, like a page object's `Page` reference or a base URL. Both are compile-time only — `readonly` doesn't freeze the object at runtime.

**Deep dive**

- `{ retries?: number }` differs from `{ retries: number | undefined }`: the first allows omitting the key entirely; the second requires passing `undefined` explicitly (relevant with `exactOptionalPropertyTypes`).
- `readonly` is shallow: a `readonly items: Order[]` can't be reassigned, but you can still `push` into it — use `ReadonlyArray<Order>` / `readonly Order[]` to block mutation too.
- In page objects, `private readonly page: Page` communicates "injected once, never swapped".

```ts
interface TestUser {
  readonly username: string;
  readonly password: string;
  displayName?: string;      // optional profile field
}

class LoginPage {
  constructor(private readonly page: Page) {}
  async login(user: TestUser) {
    await this.page.getByLabel('Username').fill(user.username);
    await this.page.getByLabel('Password').fill(user.password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
```

**Follow-ups & traps**

- Trap: expecting `readonly` to throw at runtime like `Object.freeze` — it's erased by compilation.
- Follow-up: "How do you make every property optional/required?" — `Partial<T>` / `Required<T>` (see Q10).
- Trap: overusing `?` in test data types so nothing is guaranteed — builders should return fully-populated required types.

**One-liner** — `?` means "may be missing, check before use"; `readonly` means "set once", and both vanish at runtime.

### Q6. Union and intersection types

**Interview answer** — A union `A | B` is a value that is one of several types, and you must narrow before using members specific to one branch. An intersection `A & B` combines shapes — the value must satisfy all of them. In test frameworks I use unions for alternative states like API results, and intersections to compose config layers, like base config plus environment overrides.

**Deep dive**

- On a union, you can only access members common to all branches until you narrow — this is what makes discriminated unions safe (see Q11).
- Intersections of object types merge members; conflicting primitive members collapse to `never`, which surfaces as confusing "not assignable" errors.
- Composition pattern for configs: small focused types intersected, rather than one god-interface.

```ts
interface BaseConfig { baseURL: string; timeoutMs: number }
interface AuthConfig { apiToken: string }
interface BrowserConfig { headless: boolean; viewport: { width: number; height: number } }

type E2EConfig = BaseConfig & AuthConfig & BrowserConfig;

type LocatorInput = string | { role: 'button' | 'link'; name: string };

function resolve(page: Page, input: LocatorInput): Locator {
  return typeof input === 'string'
    ? page.locator(input)
    : page.getByRole(input.role, { name: input.name });
}
```

**Follow-ups & traps**

- Follow-up: "What's a discriminated union?" — a union whose members share a literal tag field (`kind`/`status`) enabling automatic narrowing in a `switch`.
- Trap: `A & B` on incompatible primitives gives `never`, not an error at the definition — the failure shows up far away at a call site.
- Follow-up: `interface extends` vs `&` — see Q4; `extends` errors earlier on conflicts.

**One-liner** — Union = one of, needs narrowing; intersection = all of, used for composing config and mixin shapes.

### Q7. Literal types for safer configs

**Interview answer** — A literal type is a type of one exact value, like `'qa'`, and a union of literals like `'qa' | 'staging' | 'prod'` turns a free-form string into a closed set the compiler enforces. That means a typo like `'stagng'` in a config or CLI parsing is a compile error instead of a test run pointed at the wrong environment. Combined with `as const`, literal types also drive autocomplete for config keys.

**Deep dive**

- `let` widens literals to `string`; `const` and `as const` preserve them. `as const` on an object makes every property a readonly literal — ideal for lookup tables of environment URLs.
- Template literal types extend this: `` type Route = `/api/${string}` `` constrains endpoint strings.
- Runtime boundary: `process.env.TEST_ENV` is `string | undefined` — validate it into the union rather than asserting.

```ts
const ENVS = ['qa', 'staging', 'prod'] as const;
type Env = (typeof ENVS)[number];                 // 'qa' | 'staging' | 'prod'

const baseURLs: Record<Env, string> = {
  qa: 'https://qa.shop.example.com',
  staging: 'https://staging.shop.example.com',
  prod: 'https://shop.example.com',
};

function parseEnv(raw: string | undefined): Env {
  if (raw && (ENVS as readonly string[]).includes(raw)) return raw as Env;
  throw new Error(`TEST_ENV must be one of ${ENVS.join(', ')}, got: ${raw}`);
}
```

**Follow-ups & traps**

- Follow-up: "Why derive the type from the array instead of writing both?" — single source of truth: the runtime validation list and the type can't drift apart.
- Trap: `as Env` directly on `process.env.TEST_ENV` — an assertion, not a check; garbage still flows through.
- Follow-up: this pattern vs enums — next question.

**One-liner** — Literal unions turn "any string" config values into compiler-checked closed sets, killing typo bugs.

### Q8. `enum` vs `const enum` vs union of string literals

**Interview answer** — I prefer unions of string literals for most test-framework cases: they're zero runtime cost, serialize naturally as the strings your API and reports already use, and are simpler to derive from `as const` arrays. `enum` generates a runtime object, which is occasionally useful for iteration, but numeric enums have unsafe quirks. `const enum` inlines values at compile time but breaks under `isolatedModules`-style transpilation — which is how Playwright and most modern toolchains compile — so it's effectively off the table.

**Deep dive**

- String literal unions: pure types, erased at compile time; pair with an `as const` array when you need runtime iteration (Q7 pattern).
- `enum Status { Pending, Shipped }` emits a bidirectional-mapped object for numeric enums; historically, any `number` was assignable to a numeric enum (tightened in TS 5.0, but the reputation stuck). String enums are safer but nominal — you must write `Status.Pending`, can't pass the raw string, which fights JSON test data.
- `const enum` requires whole-program compilation to inline; single-file transpilers (esbuild, swc, ts-node with `isolatedModules`, Playwright's transform) can't resolve them — runtime errors or build failures.

```ts
// Preferred: literal union + const array
const ORDER_STATUSES = ['pending', 'shipped', 'cancelled'] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

// Compare: enum forces Status.Pending everywhere and adds runtime code
enum StatusEnum { Pending = 'pending', Shipped = 'shipped' }
```

**Follow-ups & traps**

- Follow-up: "How do you iterate a literal union?" — you can't iterate a type; keep the `as const` array as the runtime source and derive the type.
- Trap: recommending `const enum` in a Playwright repo — it conflicts with per-file transpilation.
- Follow-up: "Any enum upside?" — a stable namespace (`Status.Pending`) and refactor-rename ergonomics; some teams accept string enums for that.

**One-liner** — Prefer string-literal unions derived from `as const` arrays; enums add runtime baggage and `const enum` breaks modern transpilers.

### Q9. Generics: functions, interfaces, constraints

**Interview answer** — Generics let you write code that's reusable across types without losing type safety — the type parameter flows from input to output. In a test framework the classic examples are a typed API response wrapper like `ApiResponse<T>`, typed test-data builders, and Playwright's own `test.extend<MyFixtures>()`, where the generic tells the compiler exactly what your custom fixtures look like inside every test. Constraints with `extends` let a generic require capabilities, like "any type with an `id`".

**Deep dive**

- A generic function defers the type decision to the call site; inference usually fills it in — `firstOf([order1, order2])` infers `T = Order`.
- Constraints: `<T extends { id: string }>` allows accessing `.id` inside the function while staying generic.
- Generic interfaces/type aliases model containers: response envelopes, paginated results, builders.
- Playwright: `test.extend<MyFixtures>()` is a generic method — the type argument is what makes `async ({ loginPage }) => {}` type-check and autocomplete.

```ts
interface ApiResponse<T> {
  status: number;
  data: T;
  requestId: string;
}

async function getJson<T>(ctx: APIRequestContext, url: string): Promise<ApiResponse<T>> {
  const res = await ctx.get(url);
  return { status: res.status(), data: (await res.json()) as T, requestId: res.headers()['x-request-id'] };
}

const orders = await getJson<Order[]>(request, '/api/orders'); // orders.data: Order[]

// Constraint: works for any entity with an id
function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(i => i.id === id);
}

// Playwright fixtures are generics in action
type MyFixtures = { loginPage: LoginPage };
export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
});
```

**Follow-ups & traps**

- Follow-up: "Default type parameters?" — `interface ApiResponse<T = unknown>` for when callers don't care.
- Trap: `<T>` that's used only once in a signature — usually a sign the generic adds nothing; a plain type would do.
- Trap: confusing `as T` inside `getJson` with validation — the generic is a promise you make, not a check; pair with schema validation (zod) for untrusted APIs.
- Follow-up: "What does `keyof T` give you?" — a union of property names, enabling typed accessors like `pluck<T, K extends keyof T>(obj: T, key: K): T[K]`.

**Senior/lead angle** — Generics are your framework's extension points: a well-typed `ApiClient<T>` and fixture types mean feature teams get compile-time contracts without reading your source.

**One-liner** — Generics preserve type flow through reusable code — `ApiResponse<T>` and `test.extend<MyFixtures>()` are the two you must know cold.

### Q10. Utility types: Partial, Required, Pick, Omit, Record, ReturnType, Awaited

**Interview answer** — Utility types transform existing types instead of duplicating them: `Partial<T>` makes all properties optional, `Required<T>` the reverse, `Pick`/`Omit` select or drop keys, `Record<K, V>` builds keyed maps, `ReturnType<F>` extracts what a function returns, and `Awaited<T>` unwraps promises. The test-framework use case is data builders: the builder takes `Partial<Order>` overrides and returns a full `Order`, so tests only specify what they care about.

**Deep dive**

- They're implemented as mapped/conditional types — knowing that `Partial<T>` is `{ [K in keyof T]?: T[K] }` shows depth.
- `Omit<Order, 'id' | 'createdAt'>` is the natural "create payload" type — server-generated fields removed, no second interface to maintain.
- `Awaited<ReturnType<typeof createOrder>>` types a variable holding the resolved result of an async helper without exporting an extra type.
- `Partial` is shallow — nested objects stay fully required; deep-partial requires a custom mapped type or a library.

```ts
interface Order {
  id: string;
  customerEmail: string;
  items: { sku: string; qty: number }[];
  status: 'pending' | 'shipped' | 'cancelled';
  createdAt: string;
}

type CreateOrderPayload = Omit<Order, 'id' | 'createdAt'>;
type StatusCounts = Record<Order['status'], number>;

const defaultOrder: Order = {
  id: 'ord_default', customerEmail: 'qa@example.com',
  items: [{ sku: 'SKU-1', qty: 1 }], status: 'pending', createdAt: new Date().toISOString(),
};

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return { ...defaultOrder, ...overrides };
}

const shipped = buildOrder({ status: 'shipped' }); // typo in key or status = compile error
```

**Follow-ups & traps**

- Follow-up: "`Pick` vs `Omit` — when each?" — `Pick` when the kept set is small/stable, `Omit` when the removed set is (payload types usually `Omit` server fields).
- Trap: assuming `Partial` is deep — spread-merging nested `items` overrides silently replaces the whole array/object.
- Follow-up: "What does `Awaited<Promise<Promise<string>>>` give?" — `string`; it unwraps recursively, matching `await` semantics.

**One-liner** — Utility types derive payloads, builders, and maps from one source-of-truth interface instead of maintaining copies.

### Q11. Type narrowing and type guards

**Interview answer** — Narrowing is the compiler refining a broad type to a specific one inside a code path, driven by runtime checks it understands: `typeof` for primitives, `instanceof` for classes, `in` for property presence, discriminant fields in tagged unions, and custom `is` predicates when the logic is our own. This is how you safely go from `unknown` API data or a union result type to concrete property access.

**Deep dive**

- Discriminated unions are the workhorse: check the literal tag, and every branch gets the exact member type.
- Custom guard: `function isOrder(v: unknown): v is Order` — the `v is Order` return type teaches the compiler; the body must actually verify, or you've written a lie the compiler trusts.
- `instanceof` narrows across `try/catch` for custom error classes (Q20). Beware: it fails across realm boundaries (rare in tests, real in browser contexts).

```ts
type StepResult =
  | { status: 'passed'; durationMs: number }
  | { status: 'failed'; error: string; screenshotPath: string };

function report(r: StepResult) {
  if (r.status === 'failed') {
    console.error(r.error, r.screenshotPath); // narrowed to the failed branch
  }
}

function isOrder(v: unknown): v is Order {
  return typeof v === 'object' && v !== null
    && typeof (v as Order).id === 'string'
    && Array.isArray((v as Order).items);
}

const body: unknown = await response.json();
if (!isOrder(body)) throw new Error('Response is not an Order');
expect(body.status).toBe('pending'); // body: Order here
```

**Follow-ups & traps**

- Trap: a guard whose body doesn't match its claim (`return true`) — compiles fine, corrupts every downstream type.
- Follow-up: "Why doesn't narrowing survive into a callback?" — the compiler can't prove the value didn't change between the check and the (possibly async) callback execution; copy to a `const` first.
- Follow-up: schema validators (zod) as guards — `schema.parse` gives you validation and the type in one step; preferred at API boundaries.

**One-liner** — Narrowing converts runtime checks the compiler understands into type refinements — discriminated unions and `is` predicates are the interview staples.

### Q12. Type assertion (`as`) vs casting

**Interview answer** — `as` is not a cast in the C/Java sense — nothing happens at runtime. It's me overriding the compiler's opinion, so it's only as correct as I am. It's legitimate where I genuinely know more than the compiler, like `as const` or a just-validated value; it's a smell when used to silence errors, and `as unknown as T` — the double assertion — is the biggest red flag because it can convert anything to anything.

**Deep dive**

- The compiler rejects assertions between unrelated types (`'qa' as number` errors), but `as unknown as T` launders any value through `unknown`, defeating that safety net.
- Common test-code smell: `(await res.json()) as Order` with no validation — the assertion documents hope, not fact. Prefer a guard or schema parse (Q11).
- Non-null assertion `!` is the same family: `page.url()!` claims "not null/undefined" with zero proof; fine after an explicit check, dangerous as a habit.
- Angle-bracket syntax `<Order>value` exists but conflicts with JSX; `as` is the standard.

```ts
// Smell: hoping the API matches
const order = (await res.json()) as Order;

// Better: validate, then the type is earned
const body: unknown = await res.json();
if (!isOrder(body)) throw new Error(`Unexpected payload: ${JSON.stringify(body)}`);
const order2: Order = body;
```

**Follow-ups & traps**

- Follow-up: "When is `as` fine?" — `as const`, narrowing a validated value, working around known-imprecise third-party types (with a comment).
- Trap: "casting converts the value" — no; `'3' as unknown as number` is still the string `'3'` at runtime and will break arithmetic silently.
- Follow-up: `satisfies` (TS 4.9+) — checks a value against a type without widening it; often the better tool than `as` for config objects.

**One-liner** — `as` changes what the compiler believes, never what the value is — every assertion is an unverified claim, and `as unknown as` is a confession.

### Q13. `strictNullChecks`, optional chaining `?.`, nullish coalescing `??` vs `||`

**Interview answer** — With `strictNullChecks` on — which it should always be, via `strict` — `null` and `undefined` are not assignable to other types, so the compiler forces you to handle absence. Optional chaining `?.` short-circuits to `undefined` instead of throwing when something in the chain is nullish. `??` provides a default only for `null`/`undefined`, while `||` also replaces every falsy value — and that difference bites in test configs where `0`, `''`, or `false` are legitimate values.

**Deep dive**

- Without strict null checks, `const el = list.find(...)` typed as `T` instead of `T | undefined` is a latent crash — the flag is the single biggest safety win in tsconfig.
- `retries: 0` with `opts.retries || 3` silently becomes 3; `opts.retries ?? 3` respects the explicit zero. Same for `headless: false || true`.
- `?.` on method calls: `response?.headers()`; combined with `??` for a full fallback chain. Note `a?.b.c` still throws if `b` is nullish — `?.` guards only its own link.
- `process.env.X` is `string | undefined` — the canonical place all three features meet.

```ts
interface RunOptions { retries?: number; workers?: number; headless?: boolean }

function normalize(opts: RunOptions) {
  return {
    retries: opts.retries ?? 2,        // opts.retries || 2 would break retries: 0
    workers: opts.workers ?? 4,
    headless: opts.headless ?? true,   // || would force headless even when explicitly false
  };
}

const traceDir = process.env.TRACE_DIR ?? 'test-results/traces';
```

**Follow-ups & traps**

- Trap: `||` for numeric/boolean defaults — the classic `retries: 0` bug; interviewers plant this deliberately.
- Follow-up: "What is `??=`?" — nullish assignment: `opts.retries ??= 2`.
- Follow-up: "How does `?.` interact with `await`?" — `await maybe?.json()` awaits `undefined` fine, but the result type is `T | undefined`; handle it.

**One-liner** — Strict null checks make absence explicit; `?.` navigates it safely, and `??` defaults only nullish — never use `||` where `0`, `''`, or `false` are valid.

### Q14. Modules: import/export, default vs named exports

**Interview answer** — Every file with an import or export is a module with its own scope; you share code via named exports or a single default export. In frameworks I use named exports almost exclusively: they're refactor-safe because the name is checked at the import site, they autocomplete better, and re-exporting through barrel files is cleaner. Default exports let every consumer pick a different local name, which fragments a codebase — `LoginPage` in one spec, `SignInPage` in another, same class.

**Deep dive**

- Named export/import is a compile-checked contract: renaming the export breaks all imports visibly; a default export renames silently.
- Playwright convention: `export const test = base.extend<...>(...)` and `export { expect }` from a fixtures file — named, so specs do `import { test, expect } from '../fixtures'`.
- `export type { Order }` / `import type { Order }` marks type-only flow — erased at compile time, avoids accidental runtime imports and circular-dependency surprises (enforced by `verbatimModuleSyntax` in TS 5.x).
- ESM vs CJS in Node 20: Playwright projects run either; `"module": "ESNext"/"NodeNext"` in tsconfig plus `"type": "module"` in package.json for true ESM. `esModuleInterop` smooths importing CJS packages.

```ts
// pages/login.page.ts
export class LoginPage { /* ... */ }

// fixtures.ts — the standard Playwright pattern
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
});
export { expect } from '@playwright/test';
```

**Follow-ups & traps**

- Follow-up: "Barrel files?" — an `index.ts` re-exporting a folder; convenient, but watch for circular imports and slower editor tooling in huge repos.
- Trap: mixing `module.exports` and `export` in one project without understanding the interop — classic "undefined is not a constructor" failures.
- Follow-up: "Why `import type`?" — guarantees erasure; prevents a types-only dependency from becoming a runtime one.

**One-liner** — Prefer named exports: compile-checked names, consistent imports, clean barrels — exactly what a shared fixtures file needs.

### Q15. tsconfig options that matter for a Playwright project

**Interview answer** — The non-negotiable is `"strict": true`, which bundles `strictNullChecks`, `noImplicitAny`, and friends. Then `target` and `module`/`moduleResolution` set to modern values for Node 20 — `ES2022`/`NodeNext` or bundler-style — `esModuleInterop` for CJS packages, and `paths` aliases so specs import `@pages/login.page` instead of `../../../pages`. I also run `tsc --noEmit` in CI, because Playwright transpiles tests without type-checking them.

**Deep dive**

- Playwright's built-in transform strips types per-file and does not type-check — a type error can sit in your repo while tests "pass". A separate `tsc --noEmit` (or `--build`) CI step is the guard.
- `target: ES2022`: native async/await, class fields — no downleveling artifacts in stack traces.
- `paths` need only the compiler for type resolution; Playwright resolves them at runtime too (it reads tsconfig), which is why aliases work in specs without a bundler.
- Useful extras: `noUncheckedIndexedAccess` (index access returns `T | undefined` — catches `rows[0].text()` on empty arrays), `forceConsistentCasingInFileNames` (macOS vs Linux CI), `resolveJsonModule` for JSON test data, `types: ["node"]`.

```ts
// tsconfig.json (representative)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": { "@pages/*": ["pages/*"], "@fixtures": ["fixtures.ts"] }
  }
}
```

**Follow-ups & traps**

- Trap: believing Playwright type-checks your tests because they're `.ts` — it only transpiles; broken types run happily.
- Follow-up: "What breaks if `esModuleInterop` is off?" — default-imports of CJS modules (`import path from 'path'`) fail or need `import * as`.
- Follow-up: "Why `noUncheckedIndexedAccess`?" — array and record index access becomes honest about `undefined`; painful to enable late, valuable from day one.

**Senior/lead angle** — tsconfig is a team policy file: strictness flags decided once, enforced by CI type-check, so review debates become compiler errors.

**One-liner** — `strict` on, modern target/module, path aliases, and a `tsc --noEmit` CI step — because Playwright transpiles but never type-checks.

### Q16. Classes: access modifiers, readonly, static, abstract

**Interview answer** — `private` restricts a member to the class, `protected` extends that to subclasses, `public` is the default. `readonly` locks a field after construction, `static` puts a member on the class rather than instances, and `abstract` classes define a contract plus shared behavior that subclasses must complete. The page-object model is the natural home for all of these: an abstract `BasePage` with shared navigation, and concrete pages that must define their own URL and readiness check.

**Deep dive**

- TS `private` is compile-time only; JS `#field` is enforced at runtime. For page objects compile-time is fine; mention `#` to show you know the difference.
- Constructor parameter properties (`constructor(protected readonly page: Page)`) declare and assign in one line — idiomatic in page objects.
- `abstract` methods have no body; the compiler forces subclasses to implement them — a stronger contract than a base-class method that throws.
- `static` fits factories and constants (`LoginPage.URL`), but avoid static mutable state: Playwright workers are separate processes, so statics don't leak across workers — but within one worker they persist across tests and create ordering coupling.

```ts
abstract class BasePage {
  constructor(protected readonly page: Page) {}
  protected abstract readonly path: string;

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilReady();
  }
  protected abstract waitUntilReady(): Promise<void>;
}

class OrdersPage extends BasePage {
  protected readonly path = '/orders';
  private readonly table = this.page.getByRole('table', { name: 'Orders' });

  protected async waitUntilReady(): Promise<void> {
    await this.table.waitFor();
  }
  async orderRow(id: string): Promise<Locator> {
    return this.table.getByRole('row', { name: id });
  }
}
```

**Follow-ups & traps**

- Follow-up: "TS `private` vs `#private`?" — erasure vs runtime enforcement; `#` also survives `as any` poking.
- Trap: deep inheritance trees of page objects — interviewers probe whether you'd prefer composition (components like `NavBar` as fields) beyond one abstract base.
- Follow-up: "Can you instantiate an abstract class?" — no; that's the point — it's a template, not a product.

**Senior/lead angle** — One abstract base for cross-cutting concerns (navigation, readiness, logging), composition for page components; inheritance depth beyond two levels is a design smell in test code.

**One-liner** — Modifiers encode intent, `abstract BasePage` encodes contract — inject `page` as `protected readonly` and force subclasses to define readiness.

### Q17. Arrow functions vs regular functions and `this`

**Interview answer** — A regular function gets its own `this` decided by how it's called; an arrow function has no `this` of its own and captures it lexically from where it's written. That's why passing a class method as a callback loses `this`, and why arrows are the default for callbacks. Playwright docs use arrows for test bodies because they're concise and there's no useful `this` to bind — the context arrives explicitly as the destructured `{ page }` parameter.

**Deep dive**

- Call-site binding rules for regular functions: method call (`obj.m()` → `obj`), plain call (`undefined` in strict mode/modules), `call/apply/bind`, `new`.
- Detached method bug: `const login = loginPage.login; await login(user)` — `this` is `undefined`. Fix: `loginPage.login.bind(loginPage)`, a wrapping arrow, or an arrow class field.
- Arrows also lack `arguments`, can't be `new`-ed, and can't be generators.
- One Playwright-relevant caveat: `page.evaluate(() => ...)` runs in the browser — `this` semantics still apply there, but more importantly the closure is serialized, so lexical capture of Node-side variables doesn't cross; pass args explicitly.

```ts
class OrdersApi {
  constructor(private readonly ctx: APIRequestContext) {}

  // Arrow class field: `this` is fixed to the instance, safe to pass around
  getOrder = async (id: string) => (await this.ctx.get(`/api/orders/${id}`)).json();
}

// Standard Playwright shape: arrow + destructured fixtures, no `this` involved
test('user can view an order', async ({ page }) => {
  await page.goto('/orders/ord_123');
  await expect(page.getByRole('heading', { name: 'Order ord_123' })).toBeVisible();
});
```

**Follow-ups & traps**

- Trap: "arrow functions bind `this` to the class" — imprecise; they capture the enclosing lexical scope, which in a class field happens to be the instance under construction.
- Follow-up: "Why not arrows for object-literal methods?" — the enclosing scope isn't the object, so `this` won't be it.
- Follow-up: memory note — arrow class fields create one function per instance vs one shared prototype method; irrelevant for page objects, worth knowing for hot paths.

**One-liner** — Regular functions get `this` from the call, arrows inherit it from the code — Playwright sidesteps the issue by handing you `{ page }` explicitly.

### Q18. Destructuring and spread/rest

**Interview answer** — Destructuring unpacks properties or elements into variables in one step; spread expands an object or array into another; rest collects the remainder. The Playwright-specific reason this matters: fixtures are delivered as one object, and `async ({ page, request }) => {}` destructures exactly the fixtures you name — which is not just style, because Playwright inspects the destructuring pattern to know which fixtures to instantiate for that test.

**Deep dive**

- Fixture mechanics: lazy initialization — if your test never destructures `request`, that fixture is never set up. Naming fixtures in the parameter is the dependency declaration.
- Renaming and defaults: `const { retries: maxRetries = 2 } = config`.
- Spread for test data overrides: `{ ...defaultOrder, status: 'shipped' }` — the builder pattern from Q10. Order matters: later spreads win.
- Spread is shallow — nested `items` still shares the reference with the default; mutation in one test bleeds into another if the default object is module-level (see file 3, deep clone).
- Rest in tuples/params types cleanly: `function tag(name: string, ...values: string[])`.

```ts
test('checkout via UI with API-seeded cart', async ({ page, request }) => {
  const order = { ...defaultOrder, items: [{ sku: 'SKU-9', qty: 2 }] };
  await request.post('/api/test/seed-cart', { data: order });

  await page.goto('/checkout');
  const { customerEmail } = order;
  await page.getByLabel('Email').fill(customerEmail);
});

// Rest parameter in a helper
function urlWithParams(base: string, ...pairs: [string, string][]): string {
  const url = new URL(base);
  for (const [k, v] of pairs) url.searchParams.set(k, v);
  return url.toString();
}
```

**Follow-ups & traps**

- Trap: mutating `defaultOrder.items` after a spread "copy" — shallow copy shares nested references; test pollution follows.
- Follow-up: "Why does Playwright require the destructuring pattern rather than `(fixtures) => fixtures.page`?" — it parses the parameter to determine fixture dependencies; taking the whole object defeats lazy setup (Playwright supports it only in limited forms).
- Follow-up: array destructuring with holes and defaults — `const [first, , third = 'n/a'] = cells`.

**One-liner** — Destructuring `{ page }` is Playwright's dependency injection syntax, and spread builds test-data overrides — but remember both are shallow.

### Q19. Map/Set vs plain objects/Record

**Interview answer** — A plain object typed as `Record<K, V>` is right when keys are strings from a known closed set — like per-environment URLs — and you want literal-key autocomplete and JSON serialization for free. `Map` is right when keys are dynamic or non-string, when insertion order and easy iteration matter, or when you add and remove entries a lot. `Set` is the tool for uniqueness and membership checks, like collecting distinct failed test IDs.

**Deep dive**

- Objects inherit from a prototype — keys like `constructor` can collide (use `Object.create(null)` or just use `Map`). Maps have no such hazard and allow object keys, e.g. keying metadata by `Locator` or `Page`.
- `Map` has `size`, guaranteed insertion-order iteration, and O(1)-ish add/delete without the shape-mutation costs of objects.
- Serialization: `JSON.stringify(map)` yields `{}` — convert via `Object.fromEntries(map)`; this trips people writing custom reporters.
- `Record<Env, string>` with a literal-union key type forces exhaustiveness — forget the `prod` entry and it won't compile; a `Map` can't check that.

```ts
const baseURLs: Record<'qa' | 'staging' | 'prod', string> = {
  qa: 'https://qa.shop.example.com',
  staging: 'https://staging.shop.example.com',
  prod: 'https://shop.example.com',
}; // missing key = compile error

// Dynamic aggregation in a custom reporter: Map is the right tool
const failuresByFile = new Map<string, number>();
for (const r of results) {
  if (r.status === 'failed') failuresByFile.set(r.file, (failuresByFile.get(r.file) ?? 0) + 1);
}

const flakyTestIds = new Set<string>(results.filter(r => r.retries > 0).map(r => r.id));
```

**Follow-ups & traps**

- Follow-up: "WeakMap?" — keys held weakly, entries GC-ed with the key; niche in tests (caching per-`Page` state without leaks).
- Trap: using an object for dynamic keys then hitting `hasOwnProperty`/prototype issues — the interviewer wants to hear "that's what Map is for".
- Follow-up: Set for equality — object membership is by reference; `set.has({...})` with a fresh object is always false.

**One-liner** — `Record` for closed string-keyed config (compiler-checked), `Map`/`Set` for dynamic keys, ordering, and uniqueness at runtime.

### Q20. Error handling: `unknown` in catch, custom errors, `.d.ts` files

**Interview answer** — In modern TS, the `catch` variable is `unknown` (with `useUnknownInCatchVariables` under `strict`), because JavaScript lets you throw anything — so I narrow with `instanceof Error` before touching `.message`. For framework errors I define custom error classes carrying context, like which selector or endpoint failed, so a CI failure log is diagnosable without rerunning. Declaration files (`.d.ts`) hold types without implementation — they're how typed packages ship their API and how we type untyped globals or JS utilities.

**Deep dive**

- `catch (e)` — `e: unknown`; the honest pattern is `e instanceof Error ? e.message : String(e)`.
- Custom errors: extend `Error`, set `name`, attach structured fields; use `cause` (Node 16+/ES2022) to chain the original failure instead of swallowing it.
- Rethrow vs handle: in tests, prefer letting errors fail the test with full context; catch only to enrich and rethrow, or for genuinely expected failures.
- `.d.ts`: ambient declarations (`declare global`, `declare module 'legacy-lib'`), generated by `tsc --declaration` for published helpers. In a Playwright repo you mostly meet them when augmenting types or typing an internal JS script.

```ts
class ApiAssertionError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    readonly status: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ApiAssertionError';
  }
}

async function expectOk(res: APIResponse, endpoint: string): Promise<void> {
  if (!res.ok()) {
    throw new ApiAssertionError(`Expected 2xx from ${endpoint}`, endpoint, res.status());
  }
}

try {
  await expectOk(await request.get('/api/orders'), '/api/orders');
} catch (e) {
  if (e instanceof ApiAssertionError) console.error(`[${e.status}] ${e.endpoint}: ${e.message}`);
  throw e; // never swallow — the test must fail
}
```

**Follow-ups & traps**

- Trap: `catch (e) { console.log(e.message) }` — under strict settings `e` is `unknown`; also throwables aren't always `Error`s.
- Trap: catch-and-log without rethrow in a test helper — converts real failures into false passes.
- Follow-up: "What's `error.cause`?" — standard chaining; wrap low-level errors with context while preserving the original stack.
- Follow-up: "When did you last write a `.d.ts`?" — good answers: augmenting `ProcessEnv` for typed env vars, or `declare module` for an untyped internal package.

**One-liner** — Catch as `unknown`, narrow with `instanceof`, throw rich custom errors with `cause` — and never let a helper swallow a failure.
