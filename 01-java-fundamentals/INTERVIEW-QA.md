# Java fundamentals — Interview Q&A

**Depth:** FAANG / SDET II–Senior style. Say the answer out loud; then check.

Related notes: [NOTES.md](NOTES.md) · [STRINGS.md](STRINGS.md) · [COLLECTIONS.md](COLLECTIONS.md) · [OOP Q&A](../00-oop-foundations/INTERVIEW-QA.md)

---

## A. Strings

### A1. Why is `String` immutable in Java?

**Answer:** Security (paths, class names, network), thread-safety without locks, safe use as HashMap keys, string pool reuse, and cached `hashCode`. Methods return new strings instead of mutating.

### A2. Difference between `String`, `StringBuilder`, and `StringBuffer`?

| | Mutable | Sync | Use |
| --- | --- | --- | --- |
| String | No | N/A (immutable) | Normal text |
| StringBuilder | Yes | No | Building in loops |
| StringBuffer | Yes | Yes | Rare shared mutable |

Prefer **StringBuilder** unless you need synchronized mutation.

### A3. `==` vs `equals` for strings?

`==` compares references. `equals` compares characters. Literals may share the pool so `==` can accidentally be true — never rely on it for content.

### A4. What is the string pool / `intern()`?

Pool of unique string instances. Literals are pooled. `intern()` returns the pooled equivalent (adds if missing). Saves memory for duplicate values; overuse can pressure the pool.

### A5. Why is `s += x` in a loop slow?

Each `+=` creates a new `String` and copies characters → roughly **O(n²)** total work. Use `StringBuilder.append`.

### A6. How does `substring` work in modern Java?

Since Java 7u6, `substring` **copies** the needed range into a new string (no shared backing array). Older JDKs shared the array and could leak memory if a tiny substring kept a huge original alive.

### A7. How would you check if two strings are anagrams?

Count frequencies (`int[26]` or `int[256]`) in O(n), or sort both and compare O(n log n). Prefer counting for interviews when alphabet is small.

### A8. `trim` vs `strip`?

`trim` removes chars ≤ U+0020. `strip` (Java 11+) uses Unicode whitespace. Prefer `strip` on modern JDKs.

### A9. Is `String` thread-safe?

Yes, because immutable. Sharing one `String` across threads is safe. Sharing a **StringBuilder** is not.

### A10. How do you reverse a string?

`new StringBuilder(s).reverse().toString()`, or two-pointer swap on `char[]`. Mention Unicode/surrogate pairs if interviewer digs deep.

---

## B. Arrays

### B1. Are arrays covariant? Why is that dangerous?

`String[]` is a subtype of `Object[]`. You can assign and then `arr[0] = 1` → **ArrayStoreException** at runtime. Generics are invariant (`List<String>` is not `List<Object>`) partly to avoid this.

### B2. `Arrays.asList` — can you add elements?

No — fixed-size list backed by the array. `add`/`remove` throw `UnsupportedOperationException`. Use `new ArrayList<>(Arrays.asList(...))` for a growable list.

### B3. How to copy an array?

`Arrays.copyOf`, `System.arraycopy`, `clone()`, or manual loop. `clone` is shallow for object arrays.

---

## C. Collections — lists & queues

### C1. ArrayList vs LinkedList?

ArrayList: contiguous array, O(1) index access, amortized O(1) append, O(n) mid insert. LinkedList: node links, O(n) index, O(1) ends if you already have the node. **Prefer ArrayList** unless profiling says otherwise.

### C2. How does ArrayList grow?

When full, allocates a larger array (~1.5×) and copies elements. Occasional O(n) resize → **amortized O(1)** add at end.

### C3. Why prefer ArrayDeque over Stack / LinkedList for stack/queue?

ArrayDeque: resizable circular array, no sync tax of `Stack`, better locality than LinkedList, nulls forbidden (good). Fast for push/pop/offer/poll.

### C4. How does PriorityQueue work?

Binary heap. Default min-heap. offer/poll O(log n), peek O(1). Iteration is **not** sorted order — only heap order. For max-heap use reverse comparator.

### C5. Vector vs ArrayList?

Vector methods are synchronized (coarse). ArrayList is not. Prefer ArrayList + explicit concurrency control or concurrent collections.

---

## D. HashMap / HashSet (high frequency)

### D1. How does HashMap work internally?

`hash(key)` → bucket index. Bucket holds a linked list or (Java 8+) a **tree** when collisions are many. `equals` resolves collisions within the bucket. Resizes when load factor threshold exceeded.

### D2. What is load factor? Default?

Threshold = capacity × loadFactor. Default **0.75** balances space vs collision rate. Higher → denser, more collisions; lower → more memory, fewer collisions.

### D3. Why override both `equals` and `hashCode`?

Hash structures use hash to find bucket, then equals to find entry. Equal objects must share hashCode; otherwise you break Set/Map contracts (duplicates / lost lookups).

### D4. Can HashMap have null keys/values?

One null key, many null values. **ConcurrentHashMap** allows **neither**.

### D5. Is HashMap thread-safe?

No. Concurrent modification can corrupt structure. Use `ConcurrentHashMap`, `Collections.synchronizedMap`, or external locking.

### D6. HashMap vs Hashtable vs ConcurrentHashMap?

| | Sync | Nulls | Prefer |
| --- | --- | --- | --- |
| HashMap | No | Yes | Single-threaded |
| Hashtable | Yes (legacy) | No | Avoid |
| ConcurrentHashMap | Yes (fine-grained) | No | Multi-threaded |

### D7. LinkedHashMap — what’s special?

Maintains insertion order (or access order). Used to implement **LRU cache** via `removeEldestEntry` + access-order constructor.

### D8. TreeMap vs HashMap?

TreeMap: sorted keys, O(log n), no null key with natural ordering, NavigableMap methods. HashMap: unordered, avg O(1).

### D9. What is HashSet backed by?

A HashMap (keys = set elements, dummy value). Same hash/equals rules.

### D10. Fail-fast iterator — what does it mean?

Structural modification while iterating (except via Iterator.remove) increments `modCount`; iterator detects mismatch → `ConcurrentModificationException`. Best-effort detection, not a hard concurrency guarantee.

---

## E. Comparable / Comparator / sorting

### E1. Comparable vs Comparator?

Comparable: natural order inside the class (`compareTo`). Comparator: external / multiple sort keys. Prefer Comparator when you can’t change the class or need several orders.

### E2. Must `compareTo` be consistent with `equals`?

Strongly recommended for TreeSet/TreeMap. If compareTo says 0 but equals is false, sorted collections treat them as duplicates oddly.

---

## F. Generics & type system

### F1. What is type erasure?

Generic type parameters are checked at compile time and erased at runtime. `List<String>` becomes roughly raw `List`. Can’t do `new T()` or `instanceof T` meaningfully.

### F2. PECS?

**Producer Extends, Consumer Super.** `List<? extends T>` — read as T. `List<? super T>` — write T.

### F3. Why can’t you create a generic array easily?

Arrays are reified/covariant; generics are erased/invariant — conflict leads to heap pollution. Prefer `List<T>`.

---

## G. Exceptions

### G1. Checked vs unchecked?

Checked (`Exception` not `RuntimeException`): must catch or declare. Unchecked (`RuntimeException` / `Error`): not required. Prefer unchecked for programming errors; checked for recoverable external failures (debated in modern APIs).

### G2. `finally` always runs?

Almost always — even after return. Exceptions: `System.exit`, JVM crash, infinite loop in try, thread death.

### G3. try-with-resources?

Auto-closes `AutoCloseable` resources. Prefer over manual finally close.

---

## H. Autoboxing & wrappers

### H1. Why can `Integer a = 100; Integer b = 100; a == b` be true but `200` false?

Cache for **-128..127**. Outside cache, `new` instances → `==` false. Always `equals` for wrappers.

### H2. Unboxing null?

`int x = integerRef` when ref is null → **NPE**.

---

## I. Streams / Optional

### I1. Intermediate vs terminal operations?

Intermediate (`filter`, `map`) lazy and return a stream. Terminal (`collect`, `forEach`, `count`) trigger computation.

### I2. When not to use streams?

Hot tight loops where clarity/perf of for-loop wins; when you need early indexed access; whiteboard unless interviewer likes FP style.

### I3. Optional as a field?

Generally discouraged. Prefer Optional as **return type** for “maybe absent.”

---

## J. Concurrency (fundamentals)

### J1. `synchronized` vs `volatile`?

`synchronized`: mutual exclusion + visibility for the critical section. `volatile`: visibility for that field’s reads/writes; not atomic for `i++`.

### J2. Why no static WebDriver in parallel tests?

Shared mutable state across threads → race conditions, flaky tests, wrong browser context. Prefer ThreadLocal carefully or (better) DI per test instance.

---

## K. Scenario picks (say structure + why)

| Scenario | Pick |
| --- | --- |
| Frequency of words | `HashMap<String,Integer>` |
| Unique IDs seen | `HashSet` |
| Recent N pages (LRU) | `LinkedHashMap` access-order |
| Top K scores | `PriorityQueue` size K |
| BFS / task queue | `ArrayDeque` |
| Sorted unique timestamps | `TreeSet` / `TreeMap` |
| Config key → value | `HashMap` or immutable `Map.of` |
| Parallel test result merge | `ConcurrentHashMap` |
| Build huge log line | `StringBuilder` |
| Parse CSV fields | `split` carefully / library |

---

## L. Rapid-fire (one-liners)

1. Default List? → **ArrayList**  
2. Default Map? → **HashMap**  
3. Stack in modern Java? → **ArrayDeque**  
4. Thread-safe map? → **ConcurrentHashMap**  
5. Sorted map? → **TreeMap**  
6. Insertion-order map? → **LinkedHashMap**  
7. Why String key OK in HashMap? → immutable + proper equals/hashCode  
8. CME cause? → structural change during fail-fast iteration  
9. `List.of` mutable? → **No**  
10. Char frequency alphabet a–z? → `int[26]`  

---

## M. Coding prompts to practice aloud

1. Implement `isAnagram(a,b)`  
2. Reverse words in a sentence  
3. First non-repeating character in a stream/string  
4. Group anagrams (`Map<String, List<String>>` with sorted key)  
5. Design LRU cache API (LinkedHashMap or HashMap + DLL)  
6. Find duplicates in array using Set  
7. Merge two sorted lists (ArrayList + two pointers)  

Implement in [practice/easy](../practice/easy/README.md) (string / hash / two-pointer tags).

---

## N. How to answer in an SDET interview

1. State the structure + **time/space**  
2. Mention **thread-safety** if parallel execution comes up  
3. Tie to framework: “I’d store test metadata in ConcurrentHashMap keyed by test id…”  
4. Admit tradeoffs: LinkedList rarely wins; streams are clarity not magic  

Cross-check OOP identity questions in [00-oop INTERVIEW-QA](../00-oop-foundations/INTERVIEW-QA.md).
