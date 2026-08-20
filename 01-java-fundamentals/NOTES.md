# Java fundamentals — full notes

**Before:** [00-oop-foundations](../00-oop-foundations/NOTES.md)  
**Next:** [02-complexity](../02-complexity/NOTES.md)  
**Examples:** `src/java/fundamentals/` — compile and run `Demo.java`

```bash
cd 01-java-fundamentals
javac -d out src/java/fundamentals/*.java
java -cp out java.fundamentals.Demo
```

---

## 1. Syntax essentials

### Types

| Kind | Examples |
| --- | --- |
| Primitives | `int`, `long`, `double`, `boolean`, `char` |
| Reference | `String`, arrays, any class |

**Pass-by-value:** Java copies the value (for references, copies the reference — not the object).

### Control flow

`if/else`, `switch` (Java 14+ switch expressions), `for`, enhanced `for`, `while`, `do-while`, `break`, `continue`.

### Methods

Return type, parameters, `void`, overloading, recursion.

---

## 2. Arrays

```java
int[] a = new int[5];
int[][] grid = new int[rows][cols];
Arrays.sort(a);
Arrays.fill(a, 0);
System.arraycopy(src, 0, dest, 0, n);
```

2D arrays: `grid.length` rows, `grid[i].length` cols.

---

## 3. Strings

| Type | Thread-safe | Use |
| --- | --- | --- |
| `String` | Immutable | Default |
| `StringBuilder` | No | Single-thread concat in loops |
| `StringBuffer` | Yes | Legacy; prefer Builder |

```java
"abc".equals(s);          // never s.equals("abc") if s may be null
s.length(); s.charAt(i);
s.substring(from, to);
String.join(",", list);
```

---

## 4. Collections framework

### List — ordered, duplicates OK

| Class | Internal | get(i) | add end | Notes |
| --- | --- | --- | --- | --- |
| `ArrayList` | Array | O(1) | Amortized O(1) | Default choice |
| `LinkedList` | Nodes | O(n) | O(1) | Deque ops |

### Set — no duplicates

| Class | Order | Complexity |
| --- | --- | --- |
| `HashSet` | None | O(1) avg |
| `LinkedHashSet` | Insertion | O(1) avg |
| `TreeSet` | Sorted | O(log n) |

### Map — key → value

| Class | Order | Null keys |
| --- | --- | --- |
| `HashMap` | None | 1 null key allowed |
| `LinkedHashMap` | Insertion | |
| `TreeMap` | Sorted keys | No null |
| `ConcurrentHashMap` | — | Thread-safe |

**Interview:** HashMap = array of buckets + chains/trees; needs `hashCode`/`equals` on keys.

### Queue / Deque

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.pop();
Queue<Integer> q = new ArrayDeque<>();
q.offer(1); q.poll();
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
```

---

## 5. Exceptions

```java
try {
    ...
} catch (IllegalArgumentException e) {
    ...
} finally {
    cleanup(); // always runs (except System.exit)
}
```

Checked: must declare or catch (`IOException`). Unchecked: `RuntimeException` subclasses.

---

## 6. Java 8+ — lambdas and streams

```java
list.forEach(x -> System.out.println(x));
list.removeIf(x -> x < 0);

list.stream()
    .filter(x -> x > 0)
    .map(x -> x * 2)
    .sorted()
    .collect(Collectors.toList());
```

**Optional:** `Optional.ofNullable(x).orElse(default)`

**Method reference:** `User::getName`, `System.out::println`

---

## 7. Common interview gotchas

- Autoboxing null → NPE on unbox  
- `Integer` cache -128 to 127 — `==` may work for small ints only  
- Modifying list while iterating → `ConcurrentModificationException` — use iterator.remove or removeIf  
- `Arrays.asList` returns fixed-size list  
- Default interface methods on interfaces (Java 8)

---

## 8. SDET usage map

| Java feature | Test framework use |
| --- | --- |
| Collections | Test data, caching, listeners |
| Maps | Environment config, user pools |
| Streams | Filter test cases by tag |
| Optional | Safe config lookup |
| ExecutorService | Parallel test runners |
| ConcurrentHashMap | Shared live results dashboard |

---

## 9. Study path

1. Read this doc  
2. Run `Demo.java`  
3. Complete [00-oop-foundations](../00-oop-foundations/) if not done  
4. Start [practice/easy](../practice/easy/README.md)

Examples: [src/java/fundamentals/](src/java/fundamentals/)
