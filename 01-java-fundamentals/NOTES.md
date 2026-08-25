# Java fundamentals — full notes (with examples)

**Browser:** [NOTES.html](NOTES.html)  
**Deep dives:** [STRINGS.md](STRINGS.md) · [COLLECTIONS.md](COLLECTIONS.md) · [INTERVIEW-QA.md](INTERVIEW-QA.md)

**Before:** [00-oop-foundations](../00-oop-foundations/NOTES.md)  
**Next:** [02-complexity](../02-complexity/NOTES.md)

```bash
cd 01-java-fundamentals
javac -d out src/java/fundamentals/*.java
java -cp out java.fundamentals.Demo
```

**How to read this file:** each section has (1) plain English, (2) a small code example, (3) what prints / what happens. Deep String and Collection chapters have even more examples.

---

## What’s covered here vs elsewhere

| Topic | This folder | Elsewhere |
| --- | --- | --- |
| **Strings (deep + examples)** | [STRINGS.md](STRINGS.md) | Practice problems only |
| **Collections (deep + examples)** | [COLLECTIONS.md](COLLECTIONS.md) | Phase 1 rebuilds List/Stack/Queue |
| **equals / hashCode** | Used in maps/sets | [00-oop NOTES](../00-oop-foundations/NOTES.md) §7 |
| **Interview Q&A** | [INTERVIEW-QA.md](INTERVIEW-QA.md) | — |

---

## 1. Types and memory

### In simple words

Java has two kinds of variables:

- **Primitive** = the box *holds the number itself* (`int age = 25`).
- **Reference** = the box *holds an address* to an object on the heap (`String name = "Ada"`).

### Example — primitive vs reference

```java
int a = 10;
int b = a;        // copy the VALUE 10 into b
b = 99;
System.out.println(a);  // 10  — a did not change

int[] x = {1, 2, 3};
int[] y = x;      // copy the ADDRESS — both point to same array
y[0] = 99;
System.out.println(x[0]);  // 99  — same array!
```

### Pass-by-value (with examples)

Java always copies **what is inside the variable**.

```java
static void bump(int[] arr) {
    arr[0] = 99;           // change the object at that address
}

static void rebind(int[] arr) {
    arr = new int[]{7};    // only the local copy of the address changes
}

public static void main(String[] args) {
    int[] nums = {1, 2, 3};
    bump(nums);
    System.out.println(nums[0]);   // 99

    rebind(nums);
    System.out.println(nums[0]);   // still 99 — caller’s variable unchanged
}
```

**Remember:** methods can *mutate* the object you pointed to; they cannot make your variable point somewhere else.

### Autoboxing — with examples

```java
Integer boxed = 5;     // int → Integer (autobox)
int plain = boxed;     // Integer → int (unbox)

Integer z = null;
// int boom = z;       // NullPointerException — unboxing null

Integer a = 100;
Integer b = 100;
System.out.println(a == b);       // often true  (cache -128..127)

Integer c = 200;
Integer d = 200;
System.out.println(c == d);       // often false (outside cache)
System.out.println(c.equals(d));  // true — always use equals for wrappers
```

---

## 2. Arrays

### In simple words

An array is a fixed-size row of slots. After you create it, **length never grows**. Index starts at `0`.

### Example — create, read, write

```java
int[] scores = new int[3];     // {0, 0, 0} — defaults
scores[0] = 10;
scores[1] = 20;
scores[2] = 30;
System.out.println(scores.length);  // 3
System.out.println(scores[1]);      // 20
// scores[3] = 40;  // ArrayIndexOutOfBoundsException
```

### Example — shortcuts and helpers

```java
import java.util.Arrays;

int[] a = {3, 1, 4};
Arrays.sort(a);
System.out.println(Arrays.toString(a));  // [1, 3, 4]

int[] copy = Arrays.copyOf(a, a.length);
System.out.println(Arrays.equals(a, copy));  // true

Arrays.fill(a, 0);
System.out.println(Arrays.toString(a));  // [0, 0, 0]
```

### Example — `Arrays.asList` trap

```java
List<Integer> fixed = Arrays.asList(1, 2, 3);
// fixed.add(4);  // UnsupportedOperationException — size is fixed

List<Integer> growable = new ArrayList<>(Arrays.asList(1, 2, 3));
growable.add(4);  // OK → [1, 2, 3, 4]
```

### Example — 2D array

```java
int[][] grid = {
    {1, 2, 3},
    {4, 5, 6}
};
System.out.println(grid.length);     // 2 rows
System.out.println(grid[0].length);  // 3 cols
System.out.println(grid[1][2]);      // 6
```

### Example — loop with index vs for-each

```java
int[] nums = {10, 20, 30};

for (int i = 0; i < nums.length; i++) {
    System.out.println("index " + i + " = " + nums[i]);
}

for (int n : nums) {
    System.out.println(n);  // value only — no index
}
```

---

## 3. Strings — start here, then go deep

### In simple words

A `String` is text that **cannot change**. If you “change” it, Java gives you a **new** string.

```java
String s = "hi";
s.toUpperCase();              // returns "HI" but you threw it away
System.out.println(s);        // hi

s = s.toUpperCase();
System.out.println(s);        // HI
```

| Type | Can change content? | Use when |
| --- | --- | --- |
| `String` | No | Normal text |
| `StringBuilder` | Yes | Building text in a loop |
| `StringBuffer` | Yes (slower, synced) | Almost never today |

**Bad (slow):**

```java
String s = "";
for (int i = 0; i < 5; i++) {
    s = s + i;   // creates a new String every time
}
System.out.println(s);  // 01234
```

**Good:**

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) {
    sb.append(i);
}
System.out.println(sb.toString());  // 01234
```

Full chapter with pool, `==`, methods, anagrams: **[STRINGS.md](STRINGS.md)**

---

## 4. Collections — start here, then go deep

### In simple words

| Need | Think of it as | Class you usually pick |
| --- | --- | --- |
| Ordered list, duplicates OK | Shopping list | `ArrayList` |
| Unique items only | Set of IDs | `HashSet` |
| Key → value lookup | Dictionary | `HashMap` |
| Stack / queue | Undo stack / waiting line | `ArrayDeque` |
| Always take smallest | Priority line | `PriorityQueue` |

### Tiny working examples

```java
// List
List<String> names = new ArrayList<>();
names.add("Ada");
names.add("Bob");
System.out.println(names.get(0));     // Ada
System.out.println(names.size());     // 2

// Set — duplicates ignored
Set<Integer> ids = new HashSet<>();
ids.add(1);
ids.add(1);
System.out.println(ids);              // [1]

// Map — word frequency
Map<String, Integer> freq = new HashMap<>();
freq.put("to", 1);
freq.put("to", freq.get("to") + 1);   // or freq.merge("to", 1, Integer::sum)
System.out.println(freq.get("to"));   // 2

// Deque as stack
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
System.out.println(stack.pop());      // 2
```

Full chapter (HashMap internals, fail-fast, LRU…): **[COLLECTIONS.md](COLLECTIONS.md)**

---

## 5. Exceptions

### In simple words

An **exception** is Java’s way of saying “something went wrong.”  
**Checked** = compiler forces you to handle (e.g. file I/O).  
**Unchecked** = programming mistakes (`NullPointerException`, bad args).

```text
Throwable
 ├── Error          (OutOfMemoryError — usually don’t catch)
 └── Exception
      ├── RuntimeException  (unchecked)
      └── checked           (must catch or declare throws)
```

### Example — try / catch / finally

```java
static int parseAge(String s) {
    try {
        int age = Integer.parseInt(s);
        if (age < 0) {
            throw new IllegalArgumentException("age cannot be negative: " + age);
        }
        return age;
    } catch (NumberFormatException e) {
        System.out.println("not a number: " + s);
        return -1;
    } finally {
        System.out.println("parseAge finished for input=" + s);
    }
}

// parseAge("21")  → prints "parseAge finished..." then returns 21
// parseAge("abc") → prints "not a number..." then "parseAge finished..." then returns -1
```

### Example — try-with-resources

```java
try (java.io.BufferedReader br =
         new java.io.BufferedReader(new java.io.StringReader("line1\nline2"))) {
    System.out.println(br.readLine());  // line1
} // br.close() called automatically
```

| Exception | Typical meaning | Example trigger |
| --- | --- | --- |
| `IllegalArgumentException` | Bad input | `age = -1` |
| `IllegalStateException` | Object not ready | pop empty stack |
| `NullPointerException` | Used null | `String s = null; s.length()` |
| `IndexOutOfBoundsException` | Bad index | `list.get(99)` |
| `ConcurrentModificationException` | Changed list while looping | see Collections notes |

---

## 6. Generics (with examples)

### In simple words

Generics let you say “this List holds **Strings**,” so the compiler stops you putting an `Integer` in by mistake.

```java
List<String> names = new ArrayList<>();
names.add("Ada");
// names.add(42);  // compile error — good!

String first = names.get(0);  // no cast needed
```

```java
Map<String, Integer> ages = new HashMap<>();
ages.put("Ada", 30);
int adaAge = ages.get("Ada");
```

```java
// Bounded type: T must be a Number (or subclass)
static <T extends Number> double sum(List<T> nums) {
    double total = 0;
    for (T n : nums) {
        total += n.doubleValue();
    }
    return total;
}

System.out.println(sum(List.of(1, 2, 3)));        // 6.0
System.out.println(sum(List.of(1.5, 2.5)));       // 4.0
```

**PECS (short):**  
- `List<? extends Number>` → you can **read** as Number  
- `List<? super Integer>` → you can **write** Integer  

Deep dive: [00-oop ADVANCED](../00-oop-foundations/ADVANCED.md)

---

## 7. Lambdas, streams, Optional

### In simple words

A **lambda** is a short anonymous function: `x -> x > 0`.  
A **stream** is a pipeline: filter → map → collect.

### Example — without streams vs with streams

```java
List<Integer> nums = List.of(1, 2, 3, 4, 5, 6);

// Classic loop
List<Integer> result = new ArrayList<>();
for (int n : nums) {
    if (n % 2 == 0) {
        result.add(n * 10);
    }
}
System.out.println(result);  // [20, 40, 60]

// Same with stream
List<Integer> result2 = nums.stream()
        .filter(n -> n % 2 == 0)
        .map(n -> n * 10)
        .toList();
System.out.println(result2); // [20, 40, 60]
```

### Example — removeIf and grouping

```java
List<String> words = new ArrayList<>(List.of("a", "bb", "ccc", "dd"));
words.removeIf(w -> w.length() < 2);
System.out.println(words);  // [bb, ccc, dd]

Map<Integer, List<String>> byLen = words.stream()
        .collect(Collectors.groupingBy(String::length));
System.out.println(byLen);  // {2=[bb, dd], 3=[ccc]}
```

### Example — Optional

```java
Optional<String> maybe = Optional.ofNullable(findName("Ada")); // may be null
String name = maybe.orElse("unknown");
maybe.ifPresent(n -> System.out.println("found " + n));

// Prefer as return type, not as a field
static Optional<String> findName(String id) {
    if ("Ada".equals(id)) return Optional.of("Ada Lovelace");
    return Optional.empty();
}
```

| Stream op | Meaning | Tiny example |
| --- | --- | --- |
| `filter` | Keep some | `n -> n > 0` |
| `map` | Transform each | `n -> n * 2` |
| `flatMap` | One → many, flatten | split words |
| `reduce` | Combine to one | sum |
| `collect` | Build List/Map | `Collectors.toList()` |
| `sorted` / `distinct` | Order / unique | — |

**Interview tip:** solve with a normal loop first. Streams are for clear production code.

---

## 8. Concurrency basics (with mini examples)

### In simple words

Two threads changing the same data at once can corrupt it. Use locks / concurrent collections.

```java
// synchronized — only one thread at a time in this method
synchronized void increment() {
    count++;
}

// ConcurrentHashMap — safe for many threads
ConcurrentHashMap<String, Integer> results = new ConcurrentHashMap<>();
results.put("testA", 1);
results.merge("testA", 1, Integer::sum);

// AtomicInteger — lock-free counter
AtomicInteger passed = new AtomicInteger(0);
passed.incrementAndGet();
```

```java
// BAD for parallel Selenium tests
// public static WebDriver driver;  // shared → flaky

// GOOD idea: one driver per test instance (via DI / factory)
```

More: [framework-design](../revision/framework-design/NOTES.md)

---

## 9. Common gotchas — each with a fix

### 1) Unboxing null

```java
Integer x = null;
// int y = x;  // NPE
if (x != null) {
    int y = x;
}
```

### 2) Integer `==`

```java
Integer a = 200, b = 200;
System.out.println(a.equals(b));  // use this
```

### 3) CME while looping

```java
List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
// BAD:
// for (Integer n : list) { if (n == 2) list.remove(n); }

// GOOD:
list.removeIf(n -> n == 2);
```

### 4) `String +=` in a loop → use StringBuilder (see §3)

### 5) Bad HashMap key (forgot equals/hashCode) → see OOP notes + Collections

---

## 10. SDET usage map (with tiny sketch)

```java
// Test data table
List<Map<String, String>> rows = List.of(
    Map.of("user", "ada", "pass", "secret"),
    Map.of("user", "bob", "pass", "hunter2")
);

// Dynamic XPath
StringBuilder xp = new StringBuilder("//button[text()='");
xp.append("Login").append("']");
String xpath = xp.toString();

// Parallel results
ConcurrentHashMap<String, String> status = new ConcurrentHashMap<>();
status.put("loginTest", "PASS");
```

---

## 11. Study path

1. This NOTES file — type out each example once  
2. [STRINGS.md](STRINGS.md) — every section has “try this” examples  
3. [COLLECTIONS.md](COLLECTIONS.md) — same  
4. [INTERVIEW-QA.md](INTERVIEW-QA.md) — answer aloud  
5. Run `Demo.java`  
6. Easy string/hash problems in [practice/easy](../practice/easy/README.md)

Browser: [NOTES.html](NOTES.html)
