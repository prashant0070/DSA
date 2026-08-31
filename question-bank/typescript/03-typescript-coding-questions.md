# TypeScript Coding Questions for SDET Rounds

Interviewers hiring for Playwright roles increasingly run the coding round in TypeScript instead of Java, and they expect clean types, not JavaScript with `.ts` renamed. Solutions below show idiomatic array methods and the classic-loop version where interviewers ask for it, because "now do it without built-ins" is the standard second question. Each problem has a statement, a typed interview-ready solution, a complexity note, and follow-up variations.

- Q1. Reverse a string (no `.reverse()`)
- Q2. Check if two strings are anagrams
- Q3. First non-repeating character
- Q4. Find duplicates in an array
- Q5. Remove duplicates (Set + manual)
- Q6. Character frequency count (Map/Record)
- Q7. Two sum
- Q8. Flatten a nested array (recursive + `.flat()`)
- Q9. Chunk an array
- Q10. Group array of objects by property
- Q11. Sort array of objects by multiple keys
- Q12. Deep clone vs shallow copy
- Q13. Debounce function (typed)
- Q14. Async retry with exponential backoff
- Q15. Async polling `waitUntil`
- Q16. String compression (aabbbc → a2b3c1)

### Q1. Reverse a string (no `.reverse()`)

**Interview answer** — Walk the string from the end and build the result, or use a two-pointer swap on a character array. I'd mention that `split('').reverse().join('')` exists but is banned by the constraint — and that it breaks on surrogate pairs like emoji anyway, which the manual loop also does unless you iterate by code points.

**Code**

```ts
function reverseString(input: string): string {
  let result = '';
  for (let i = input.length - 1; i >= 0; i--) {
    result += input[i];
  }
  return result;
}

// Unicode-safer: iterating a string yields code points, not UTF-16 units
function reverseUnicode(input: string): string {
  let result = '';
  for (const ch of input) result = ch + result;
  return result;
}
```

**Deep dive** — O(n) time; string concatenation in a loop is fine in V8 (ropes), but building an array and joining is the textbook-safe answer. The two-pointer in-place version needs an array since JS strings are immutable.

**Follow-ups & traps**

- Variation: reverse the words in a sentence but not the letters ("run all tests" → "tests all run") — split on whitespace, reverse the array manually.
- Variation: check palindrome — two pointers moving inward, normalize case first.
- Trap: forgetting strings are immutable and trying `input[i] = ...` — silently does nothing.

**One-liner** — Iterate from the end (or two-pointer an array); strings are immutable, and `.reverse()` was the banned shortcut for a reason.

### Q2. Check if two strings are anagrams

**Interview answer** — Two strings are anagrams if they contain the same characters with the same counts. The clean O(n) approach: build a frequency map from the first string, decrement while scanning the second, and fail on any count going negative or lengths differing. Sorting both and comparing works too but costs O(n log n).

**Code**

```ts
function areAnagrams(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const ch of a) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of b) {
    const remaining = counts.get(ch);
    if (!remaining) return false;      // missing or already zero
    counts.set(ch, remaining - 1);
  }
  return true;
}

areAnagrams('listen', 'silent'); // true
```

**Deep dive** — O(n) time, O(k) space for the alphabet. The early length check removes the need to verify leftover counts at the end.

**Follow-ups & traps**

- Variation: ignore case and spaces ("Dormitory" / "dirty room") — normalize with `toLowerCase()` and strip non-letters first; clarify requirements before coding.
- Variation: group a list of strings into anagram buckets — key a `Map` by the sorted string.
- Trap: `!remaining` also catches `undefined` — call it out; interviewers like seeing you handle both "absent" and "exhausted" in one check.

**One-liner** — Count characters from one string, decrement with the other; any miss or leftover means not anagrams — O(n) beats sorting.

### Q3. First non-repeating character

**Interview answer** — Two passes: first build a character-frequency map, then scan the string again in order and return the first character whose count is one. Maps preserve insertion order in JS, so a one-pass-then-iterate-the-map version also works, but the two-pass scan is easier to defend.

**Code**

```ts
function firstNonRepeating(input: string): string | null {
  const counts = new Map<string, number>();
  for (const ch of input) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of input) {
    if (counts.get(ch) === 1) return ch;
  }
  return null;
}

firstNonRepeating('swiss'); // 'w'
```

**Deep dive** — O(n) time, O(k) space. Returning `string | null` (not `undefined` or `-1`-style sentinels) is the typed-API answer; the caller is forced to handle absence under `strictNullChecks`.

**Follow-ups & traps**

- Variation: return the index instead of the character; or first *repeating* character (return on the first count > 1 during the second pass... which becomes a Set seen-check in one pass).
- Trap: nesting `indexOf`/`lastIndexOf` per character — correct but O(n²); say why you avoided it.

**One-liner** — Count in pass one, return the first count-of-one in pass two — order comes from the string, not the map.

### Q4. Find duplicates in an array

**Interview answer** — Track what you've seen in a `Set`; anything already present when you reach it is a duplicate. Collect duplicates into a second `Set` so each duplicated value reports once, then spread it into an array. O(n) time, and it generalizes to any primitive-keyed data like test IDs.

**Code**

```ts
function findDuplicates<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const dupes = new Set<T>();
  for (const item of items) {
    if (seen.has(item)) dupes.add(item);
    else seen.add(item);
  }
  return [...dupes];
}

findDuplicates(['checkout.spec.ts', 'login.spec.ts', 'checkout.spec.ts']); // ['checkout.spec.ts']
```

**Deep dive** — O(n) time, O(n) space. The filter-with-indexOf one-liner (`items.filter((x, i) => items.indexOf(x) !== i)`) reads nicely but is O(n²) and reports a triple twice — know both and say why you chose the Set.

**Follow-ups & traps**

- Variation: duplicates among objects (e.g. orders by `id`) — Set of the key field, since object identity is by reference.
- Variation: count occurrences of each duplicate — upgrade to a `Map<T, number>` (Q6).
- Trap: `Set` uses reference equality for objects — `findDuplicates([{id:1},{id:1}])` finds nothing; interviewers plant this.

**One-liner** — One Set for seen, one for duplicates — O(n), reports each duplicate once, but remember Sets compare objects by reference.

### Q5. Remove duplicates (Set + manual)

**Interview answer** — The idiomatic answer is one line: spread a `Set` built from the array, which preserves first-occurrence order. The manual version — the inevitable follow-up — is a seen-Set with a result array, and it's also the shape you need when deduplicating objects by a key.

**Code**

```ts
// Idiomatic: Set preserves insertion order
const uniqueTags = [...new Set(['smoke', 'regression', 'smoke', 'api'])]; // ['smoke','regression','api']

// Manual — and the shape that extends to objects
function dedupeBy<T, K>(items: T[], keyOf: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

const uniqueOrders = dedupeBy(orders, (o) => o.id); // first occurrence of each id wins
```

**Deep dive** — Both O(n). The generic `keyOf` extractor is the interview differentiator: it shows you know `new Set(objects)` doesn't dedupe by content, and it produces a reusable utility instead of a one-off.

**Follow-ups & traps**

- Variation: keep the *last* occurrence instead of the first — iterate reversed, or overwrite in a `Map<K, T>` and take its values.
- Trap: `filter((x, i, arr) => arr.indexOf(x) === i)` — fine for tiny arrays, O(n²) in general.

**One-liner** — `[...new Set(arr)]` for primitives; for objects, dedupe through a Set of extracted keys.

### Q6. Character frequency count (Map/Record)

**Interview answer** — Iterate once, incrementing a counter per character, with `?? 0` handling the first sighting. I'd use a `Map<string, number>` for dynamic keys, and show the `Record<string, number>` version since interviewers often ask for a plain object — the pattern is identical and it's the building block behind anagrams, first-non-repeating, and compression.

**Code**

```ts
function charFrequencyMap(input: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of input) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

function charFrequencyRecord(input: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of input) counts[ch] = (counts[ch] ?? 0) + 1;
  return counts;
}

charFrequencyRecord('passed'); // { p: 1, a: 1, s: 2, e: 1, d: 1 }
```

**Deep dive** — O(n) time, O(k) space. Map advantages: no prototype-key collisions (`'constructor'` as input!), `size`, direct iteration; Record advantages: JSON-serializable and lighter syntax. With `noUncheckedIndexedAccess`, the Record read is `number | undefined` — the `?? 0` satisfies the compiler honestly.

**Follow-ups & traps**

- Variation: most frequent character — iterate the map tracking a running max; or word frequency (split on `/\s+/` first).
- Trap: `counts[ch]++` when the key is absent gives `NaN` — the `?? 0` is load-bearing.

**One-liner** — `set(ch, (get(ch) ?? 0) + 1)` in a single pass — the frequency map is the parent of half the string questions.

### Q7. Two sum

**Interview answer** — For each number, the partner I need is `target - current`. One pass with a Map from value to index: if the complement is already in the map, return both indices; otherwise store the current value. O(n) time instead of the O(n²) nested loops, and it handles duplicates correctly because I check for the complement before inserting.

**Code**

```ts
function twoSum(nums: number[], target: number): [number, number] | null {
  const indexByValue = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    const j = indexByValue.get(complement);
    if (j !== undefined) return [j, i];
    indexByValue.set(nums[i], i);
  }
  return null;
}

// e.g. which two line items sum to the invoice total?
twoSum([299, 1499, 701, 500], 1000); // [0, 2]
```

**Deep dive** — O(n) time, O(n) space. The tuple return type `[number, number] | null` is more honest than returning `[]` on failure. Check-before-insert is what makes `twoSum([500, 500], 1000)` work.

**Follow-ups & traps**

- Variation: return the values or all pairs; three-sum (sort + two pointers, O(n²)).
- Variation: sorted input — two pointers from both ends, O(1) extra space.
- Trap: `if (j)` instead of `if (j !== undefined)` — index 0 is falsy; a classic TS-flavored bug the interviewer waits for.

**One-liner** — Map each value to its index and look up `target − current` before inserting — one pass, and never truthiness-check an index.

### Q8. Flatten a nested array (recursive + `.flat()`)

**Interview answer** — The built-in is `arr.flat(Infinity)` for arbitrary depth. The manual version — which is what's really being asked — recurses: for each element, if it's an array, flatten it and spread the result; otherwise keep it. I'd type the nested structure with a recursive type alias so the signature is honest.

**Code**

```ts
type Nested<T> = (T | Nested<T>)[];

function flatten<T>(input: Nested<T>): T[] {
  const result: T[] = [];
  for (const item of input) {
    if (Array.isArray(item)) result.push(...flatten(item));
    else result.push(item);
  }
  return result;
}

// e.g. suite tree → flat list of spec files
flatten<string>(['login.spec.ts', ['checkout.spec.ts', ['payment.spec.ts']]]);
// ['login.spec.ts', 'checkout.spec.ts', 'payment.spec.ts']

['a', ['b', ['c']]].flat(Infinity); // built-in, depth unlimited
```

**Deep dive** — O(n) over total elements; recursion depth equals nesting depth (stack overflow risk only for pathological inputs — mention an explicit-stack iterative version as the fix). `.flat()` defaults to depth 1, which is the detail interviewers probe.

**Follow-ups & traps**

- Variation: flatten to a fixed depth — thread a `depth` parameter, decrement on recursion, matching `.flat(depth)` semantics.
- Variation: iterative with a stack — no recursion limit; be ready to sketch it.
- Trap: `push(...hugeArray)` can hit argument-count limits on very large inputs — `for..of` push or `concat` avoids it; nice bonus point.

**One-liner** — Recurse on arrays, keep scalars, spread the results — and remember `.flat()` is depth-1 unless you pass `Infinity`.

### Q9. Chunk an array

**Interview answer** — Step through the array in strides of the chunk size and slice each window; the last chunk is naturally shorter. This shows up in real test code when batching API seeding calls so you don't fire hundreds of parallel requests.

**Code**

```ts
function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error(`chunk size must be >= 1, got ${size}`);
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// Batch-seed 100 users, 10 concurrent requests at a time
for (const batch of chunk(userPayloads, 10)) {
  await Promise.all(batch.map((u) => request.post('/api/users', { data: u })));
}
```

**Deep dive** — O(n) time and space; `slice` handles the ragged final chunk since it clamps to the array end. The batching loop is the answer to "how do you limit concurrency without a library" (see file 2, Q7).

**Follow-ups & traps**

- Variation: chunk into N groups (instead of groups of N) — compute size as `Math.ceil(length / n)`.
- Trap: forgetting to validate `size` — `size = 0` makes the loop infinite.

**One-liner** — Stride by `size`, `slice(i, i + size)` — chunking is also your no-library concurrency limiter.

### Q10. Group array of objects by property

**Interview answer** — Reduce into a `Record` keyed by the property: for each item, initialize the bucket with `??=` and push. Since Node 21/ES2024 there's also `Object.groupBy` and `Map.groupBy` — worth naming, but I'd write the reduce version since it runs everywhere and shows the mechanics. Grouping test results by status is the natural SDET example.

**Code**

```ts
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
}

function groupBy<T, K extends string>(items: T[], keyOf: (item: T) => K): Record<K, T[]> {
  const groups = {} as Record<K, T[]>;
  for (const item of items) {
    (groups[keyOf(item)] ??= []).push(item);
  }
  return groups;
}

const byStatus = groupBy(results, (r) => r.status);
// byStatus.failed: TestResult[] — typed access per status
console.log(`Failed: ${byStatus.failed?.length ?? 0}`);
```

**Deep dive** — O(n). The generic `keyOf` function beats a hardcoded property name — it handles derived keys (`r.file.split('/')[0]`). Honest typing note: the return type claims every `K` key exists, but absent groups are missing at runtime — hence the `?.` on access; `Partial<Record<K, T[]>>` is the stricter signature.

**Follow-ups & traps**

- Variation: count per group instead of collecting — `Record<K, number>` with `+ 1` instead of push.
- Variation: `Map.groupBy(results, r => r.status)` — one line on Node 21+; know it exists and its version constraint.
- Trap: `groups[key].push(...)` without initializing the bucket — `undefined.push` crash; `??=` is the idiom.

**One-liner** — Fold into `Record<K, T[]>` with `(groups[key] ??= []).push(item)` — and mention `Object.groupBy` for modern-runtime bonus points.

### Q11. Sort array of objects by multiple keys

**Interview answer** — Write a comparator that compares by the first key and falls through to the next on ties — the `||` chain works because a non-zero comparison short-circuits it. Strings compare with `localeCompare`, numbers by subtraction, and I always sort a copy because `.sort()` mutates in place — a real bug source when sorting shared test data.

**Code**

```ts
interface TestResult { file: string; status: 'failed' | 'passed'; durationMs: number }

// Failed first, then slowest first, then by file name
const sorted = [...results].sort(
  (a, b) =>
    a.status.localeCompare(b.status) ||        // 'failed' < 'passed' alphabetically — convenient here
    b.durationMs - a.durationMs ||
    a.file.localeCompare(b.file),
);

// Generic, direction-aware version for the follow-up
type SortSpec<T> = { key: keyof T; dir?: 'asc' | 'desc' }[];

function sortBy<T>(items: T[], specs: SortSpec<T>): T[] {
  return [...items].sort((a, b) => {
    for (const { key, dir = 'asc' } of specs) {
      const [x, y] = [a[key], b[key]];
      const cmp = typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y));
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

sortBy(results, [{ key: 'status' }, { key: 'durationMs', dir: 'desc' }]);
```

**Deep dive** — O(n log n); `Array.prototype.sort` is stable per the spec (guaranteed since ES2019), so equal elements keep their relative order — which is why chaining single-key sorts in reverse priority also works. `[...items]` (or `toSorted()` on Node 20+) avoids mutating the input.

**Follow-ups & traps**

- Variation: `toSorted()` — the non-mutating built-in; know it's ES2023/Node 20.
- Trap: comparing numbers with `localeCompare` or strings with subtraction — `NaN` comparator results make the sort order garbage silently.
- Trap: relying on default `.sort()` for numbers — it sorts lexicographically (`[10, 9, 1]` → `[1, 10, 9]`).

**One-liner** — Chain comparisons with `||` so ties fall through to the next key, and never sort shared data without copying first.

### Q12. Deep clone vs shallow copy

**Interview answer** — Spread and `Object.assign` copy one level: nested objects and arrays are still shared references, so mutating a clone's nested field mutates the original — the classic cause of test-data pollution between tests. For a real deep clone, modern Node has `structuredClone`, which handles nesting, Dates, Maps, Sets and cycles. `JSON.parse(JSON.stringify(...))` is the legacy trick, and I'd name its failures: drops `undefined` and functions, mangles Dates into strings, throws on cycles.

**Code**

```ts
const defaultOrder = {
  id: 'ord_1',
  status: 'pending' as const,
  items: [{ sku: 'SKU-1', qty: 1 }],
};

// Shallow: items is SHARED
const shallow = { ...defaultOrder };
shallow.items[0].qty = 99;
console.log(defaultOrder.items[0].qty); // 99 — original polluted; next test inherits it

// Deep: fully independent (Node 17+/all browsers)
const deep = structuredClone(defaultOrder);
deep.items[0].qty = 99;
console.log(defaultOrder.items[0].qty); // 1 — safe

// Manual recursive clone — the "no built-ins" follow-up
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = deepClone(v);
  return out as T;
}
```

**Deep dive** — `structuredClone` limits: no functions, no class prototypes (instances come back as plain objects), no DOM nodes — so it clones data, not page objects. The manual version above also skips prototypes, symbol keys, and cycles; say so before the interviewer does. Root cause framing: shared module-level test data plus shallow copy equals order-dependent tests.

**Follow-ups & traps**

- Variation: extend `deepClone` to handle `Date`, `Map`, `Set`, or cycles (a `WeakMap` of visited objects).
- Trap: `JSON.parse(JSON.stringify(order))` on anything with Dates — assertions against ISO strings start failing mysteriously.
- Follow-up: "How do you avoid needing deep clones?" — builders that construct fresh objects per test (file 1, Q10) beat cloning shared mutable defaults.

**One-liner** — Spread is one level deep; `structuredClone` for real data cloning; and the best fix is fresh builders instead of shared mutable defaults.

### Q13. Debounce function (typed)

**Interview answer** — Debounce delays a function until calls stop arriving for a quiet period: every call resets a timer, and only the last call in a burst executes. Typing it generically means capturing the wrapped function's parameter tuple with `Parameters<T>`-style generics so the debounced version keeps the same signature. In test tooling it appears in watch-mode triggers or noisy event handlers; in the product under test it's *why* you type into a search box and the request only fires after a pause — which affects what your test should wait for.

**Code**

```ts
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

// e.g. a file-watcher that re-runs the affected spec, but not per keystroke of saving
const scheduleRun = debounce((specFile: string) => runSpec(specFile), 300);
watcher.on('change', scheduleRun);
```

**Deep dive** — Key mechanics: `clearTimeout` on every call is what implements "reset the quiet period"; the last arguments win. `ReturnType<typeof setTimeout>` types the handle portably across Node (`Timeout` object) and browsers (`number`). Debouncing an async function is a design smell — the dropped calls' promises would dangle; return values don't fit the model.

**Follow-ups & traps**

- Variation: throttle — at most one execution per interval regardless of call rate; be ready to state the difference crisply (debounce = after the burst, throttle = during the burst at a fixed rate).
- Variation: leading-edge option — fire immediately, then suppress the burst.
- Trap (SDET-specific): testing a debounced search box — asserting immediately after `fill()` races the quiet period; wait for the network response or the result locator, don't `waitForTimeout(300)` a magic number.

**One-liner** — Reset a timer on every call and run only when the calls go quiet — typed by making the wrapper generic over the argument tuple.

### Q14. Async retry with exponential backoff

**Interview answer** — Loop up to N attempts: try the operation, and on failure wait `base × 2^attempt` before the next try, throwing the last error with context when attempts run out. The two details that separate a working version from a broken one: `return await` inside the `try` so rejections are actually caught, and an awaited sleep so the loop yields to the event loop.

**Code**

```ts
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  { attempts = 4, baseDelayMs = 250, maxDelayMs = 5_000 }: {
    attempts?: number; baseDelayMs?: number; maxDelayMs?: number;
  } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (e) {
      lastError = e;
      if (attempt < attempts - 1) {
        const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        const jitter = delay * (0.5 + Math.random() * 0.5); // avoid synchronized worker retries
        await new Promise((res) => setTimeout(res, jitter));
      }
    }
  }
  throw new Error(`Operation failed after ${attempts} attempts`, { cause: lastError });
}

// e.g. third-party sandbox API that 429s under parallel CI workers
const token = await retryWithBackoff(() => paymentSandbox.createToken(card), { attempts: 5 });
```

**Deep dive** — Delays: 250, 500, 1000, 2000ms capped at `maxDelayMs`; jitter prevents parallel Playwright workers from retrying in lockstep. `cause` preserves the real failure for CI logs. Refinement worth mentioning: a `shouldRetry(e)` predicate — retrying a 401 or an assertion failure just wastes time and hides bugs.

**Follow-ups & traps**

- Variation: retry only on specific errors (network, 429/503) — add a predicate parameter.
- Trap: `return operation()` without `await` inside `try` — rejections escape the catch and the function never retries (see file 2, Q9).
- Trap: retrying around Playwright *assertions* — that's masking flakiness; retries belong at unreliable external boundaries, and test-level retries belong in Playwright config.

**One-liner** — `try / return await / catch / sleep(base × 2^n + jitter)` in a loop, then throw the last error with `cause` — and only retry what's legitimately transient.

### Q15. Async polling `waitUntil`

**Interview answer** — Poll a predicate on an interval until it returns truthy or a deadline passes, with an awaited sleep between checks so the event loop keeps running. This is the compact interview version — the production-grade one with typed results, error capture, and labels is in file 2, Q13, along with when you should use Playwright's `expect.poll` instead of writing this at all.

**Code**

```ts
async function waitUntil(
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000,
  intervalMs = 200,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

// e.g. wait for a background report job the UI can't see
await waitUntil(async () => (await request.get(`/api/reports/${jobId}`)).ok());
```

**Deep dive** — Deadline arithmetic (not attempt counting) keeps the timeout honest when the predicate itself is slow. Complexity is bounded by `timeout / interval` predicate calls. See file 2, Q13 for the generic value-returning variant, last-error capture via `cause`, and the event-loop reasoning behind the awaited sleep.

**Follow-ups & traps**

- Variation: return the value the predicate produced instead of `void` — the generic version in file 2, Q13.
- Trap: `while (true)` with no awaited sleep — starves the event loop, so the thing you're polling can never even respond.
- Follow-up: "Why not use this for element state?" — locator assertions auto-retry with better error output; hand-rolled polling is for out-of-band conditions only.

**One-liner** — Loop against a deadline, await the predicate, await a sleep — and reach for `expect.poll` before writing it yourself.

### Q16. String compression (aabbbc → a2b3c1)

**Interview answer** — Single pass with a run counter: walk the string, count consecutive identical characters, and append `char + count` when the run ends — comparing each character to the next makes the run boundary explicit. It's the classic closer because it packs off-by-one traps into ten lines: the final run, the empty string, and the "only compress if shorter" variation.

**Code**

```ts
function compress(input: string): string {
  if (input.length === 0) return '';
  let result = '';
  let runChar = input[0];
  let runLength = 1;
  for (let i = 1; i <= input.length; i++) {
    if (input[i] === runChar) {
      runLength++;
    } else {
      result += `${runChar}${runLength}`;   // run ended (i === length falls here too)
      runChar = input[i];
      runLength = 1;
    }
  }
  return result;
}

compress('aabbbc');  // 'a2b3c1'
compress('abc');     // 'a1b1c1'
```

**Deep dive** — O(n) time. Letting the loop run to `i === input.length` (where `input[i]` is `undefined` and never equals `runChar`) flushes the final run without duplicated append-logic after the loop — call that out; forgetting the last run is *the* bug in this problem.

**Follow-ups & traps**

- Variation: return the original when compression doesn't shrink it (`'abc'` → `'abc'`) — one length comparison at the end.
- Variation: decompression (`'a2b3'` → `'aabbb'`) — parse char + digits, mind multi-digit counts like `a12`.
- Trap: multi-digit runs — any solution assuming single-digit counts fails on 10+ repeats; mention it unprompted.

**One-liner** — Count runs in one pass and flush `char + count` at each boundary — the last run is where candidates fail.
