# Collections, Generics & Data Structures Interviewers Ask

This file is the Java collections and generics round that SDET II–III interviews actually run: which structure, why, complexity, and how it shows up in test data, reports, and parallel suites. Java 17/21 (`List.of`, `Map.copyOf`, sequenced collections in 21) is assumed. Default answers: `ArrayList` for lists, `HashMap` for maps, `HashSet` for uniqueness, `ConcurrentHashMap` under threads.

- Q1. Collection hierarchy map
- Q2. ArrayList vs LinkedList
- Q3. ArrayList vs LinkedHashSet (and vs HashSet)
- Q4. HashMap vs Hashtable
- Q5. HashMap vs TreeMap vs LinkedHashMap
- Q6. HashMap internals (hashing, buckets, treeify, resize, load factor)
- Q7. ConcurrentHashMap vs Collections.synchronizedMap
- Q8. Iterator vs ListIterator; fail-fast vs fail-safe; ConcurrentModificationException
- Q9. Comparable vs Comparator — sorting test results
- Q10. Generics: type erasure, PECS, raw types
- Q11. PriorityQueue, Deque, ArrayDeque
- Q12. When to use Map vs Set vs List in test-data code
- Q13. Unmodifiable collections (`copyOf`, `unmodifiableList`) for shared test data
- Q14. Stream-friendly collections; `Collectors.groupingBy` for failures
- Q15. WeakHashMap / IdentityHashMap — brief
- Q16. Simple LRU cache with `LinkedHashMap.removeEldestEntry`

### Q1. Collection hierarchy map (`Collection` / `List` / `Set` / `Queue` / `Map`)

**Interview answer** — `Collection` is the root of bags of elements: `List` (ordered, duplicates, index), `Set` (no duplicates, various order contracts), `Queue`/`Deque` (insert/remove at ends, plus `PriorityQueue` as a heap). `Map` is **not** a `Collection` — it is a separate hierarchy of key/value associations. `Iterable` sits above `Collection` and is what the for-each loop uses. In a framework: test steps are a `List`, unique failing test IDs a `Set`, a work queue of API calls a `Deque`, env config and header maps a `Map`.

**Deep dive** — `AbstractList` / `AbstractSet` / `AbstractMap` provide skeletal implementations so `ArrayList` isn't written from scratch. `SortedSet`/`NavigableSet` (`TreeSet`) and `SortedMap`/`NavigableMap` (`TreeMap`) add range views. Java 21 introduces `SequencedCollection` / `SequencedSet` / `SequencedMap` with `getFirst`/`reversed` — `LinkedHashSet` and `LinkedHashMap` implement them; mention it as a 21 highlight, don't pretend older JDKs have it.

Interfaces vs implementations (say this table aloud):

- List → ArrayList (default), LinkedList (rare), CopyOnWriteArrayList (listener lists)
- Set → HashSet, LinkedHashSet, TreeSet, EnumSet, ConcurrentHashMap.newKeySet()
- Queue → ArrayDeque, LinkedList (legacy as queue), PriorityQueue, BlockingQueue impls
- Map → HashMap, LinkedHashMap, TreeMap, EnumMap, ConcurrentHashMap, WeakHashMap

`Collection` adds `size`, `add`, `remove`, `contains`, `iterator`, `stream`, `toArray`. `List` adds index ops (`get`/`set`/`listIterator`). `Set` is defined by equals-based uniqueness (one `null` in HashSet). `Queue` adds `offer`/`poll`/`peek` (return special values) vs `add`/`remove`/`element` (throw). Map views (`keySet`, `values`, `entrySet`) are backed by the map: mutating the view mutates the map — a Rest Assured header-map trap if you `keySet().clear()`.

**Code**

```java
Collection<String> tags = List.of("smoke", "api");     // List is a Collection
Set<String> ids = new HashSet<>(tags);                 // uniqueness
Map<String, String> env = Map.of("BASE_URL", "https://qa"); // not a Collection

List<String> failures = new ArrayList<>();             // growable report rows
Queue<String> pending = new ArrayDeque<>(List.of("login", "checkout"));

for (Map.Entry<String, String> e : env.entrySet()) {   // Map is Iterable only via views
    log.info("{}={}", e.getKey(), e.getValue());
}
```

**Follow-ups & traps**

- Trap: "HashMap implements Collection" — it doesn't. `map.values()` / `keySet()` / `entrySet()` do.
- `Collections` (utility) vs `Collection` (interface).
- `List.of` / `Set.of` / `Map.of` are unmodifiable and reject nulls (Q13).
- Arrays (`String[]`) are not Collection; `Arrays.asList` is a fixed-size List bridge.
- `Queue.offer` vs `add`: bounded queues return false vs throw — know both when wrapping a Grid slot queue.

**Senior/lead angle** — Standardize defaults in a one-pager: ArrayList, HashMap, HashSet, ArrayDeque, ConcurrentHashMap. Reviewers should reject LinkedList/Hashtable/Vector without a measured reason.

**One-liner** — List/Set/Queue hang off Collection; Map is a sibling; pick ArrayList, HashSet, ArrayDeque, HashMap unless you have a specific order, sort, or concurrency reason.

### Q2. ArrayList vs LinkedList — reality: almost always ArrayList

**Interview answer** — `ArrayList` is a resizable array: O(1) random access, amortized O(1) append, O(n) insert/remove in the middle because of shifting. `LinkedList` is a doubly linked list: O(n) to find index `i`, O(1) insert/remove if you already hold the node, O(1) at the ends. In real JVMs ArrayList wins almost always because of contiguous memory and CPU caches. I would not use LinkedList in a test framework unless I had a profiler saying so; for queues I use `ArrayDeque`, not LinkedList.

**Deep dive** — ArrayList growth: new capacity is roughly `old + old/2` (1.5×), then `System.arraycopy`. Pre-size with `new ArrayList<>(expected)` if you know you will add 10k test rows. LinkedList each node is a heap object (item + prev + next) — huge overhead vs packed references in an array. Iterator of LinkedList is O(1) per step; `get(i)` in a loop is accidentally O(n²). `LinkedList` implements `List` and `Deque`; that dual role is why it still appears in textbooks.

Failing a suite on "LinkedList is faster for inserts" is a common SDET-II miss: inserting at index 0 of an ArrayList of 10k report rows is a memcpy of 10k pointers, still cheaper than chasing 10k nodes if you later `get(i)` in a reporter. ArrayList `ensureCapacity` / `trimToSize` exist; I use the constructor hint, not micro-tuning. For a stack of page breadcrumbs or a queue of API calls, `ArrayDeque` is the JDK's own javadoc recommendation over LinkedList and over `java.util.Stack` (which extends Vector).

**Code**

```java
List<String> results = new ArrayList<>(512);   // prefer this
results.add("PASS login");                     // amortized O(1)
String third = results.get(2);                 // O(1)

Deque<String> stack = new ArrayDeque<>();      // not Stack, not LinkedList
stack.push("page");
stack.pop();

// accidental quadratic: never index-walk a LinkedList
List<String> slow = new LinkedList<>(results);
int sum = 0;
for (int i = 0; i < slow.size(); i++) sum += slow.get(i).length(); // O(n²)
```

**Follow-ups & traps**

- Trap: "LinkedList is O(1) insert so it's faster" — insert at index still requires O(n) traversal.
- `Vector` is a synchronized ArrayList ancestor — don't use it.
- Follow-up: when *does* LinkedList win? Frequent add/remove at ends *and* you needed List + Deque on one object — still usually ArrayDeque + ArrayList.
- `ArrayList.remove(0)` is O(n); if you need a queue, you wanted ArrayDeque, not "ArrayList as queue."


- Pre-size ArrayList when you know the row count of a CSV data provider.
- ArrayDeque for breadcrumbs of pages; LinkedList almost never.
- Vector/Stack are synchronized leftovers — name them so you can reject them.

**Code**

```java
List<TestResult> rows = new ArrayList<>(tests.size());
Deque<String> pages = new ArrayDeque<>();
pages.push("login");
pages.push("checkout");
assert pages.pop().equals("checkout");
```

**One-liner** — ArrayList is the default List; LinkedList is almost never the right queue, stack, or list in a modern JDK.

### Q3. ArrayList vs LinkedHashSet (and vs HashSet) — order, uniqueness, complexity

**Interview answer** — ArrayList keeps insertion order and **allows duplicates**; index access is O(1); `contains` is O(n). HashSet stores unique elements with no order contract; `add`/`contains` average O(1). LinkedHashSet is a HashSet plus a doubly linked list that remembers insertion order (Java 21: sequenced). If I need "unique test IDs in first-seen order" I use LinkedHashSet. If I need "all failure messages including duplicates" I use ArrayList. If I only care about membership (`alreadyRetried.contains(testId)`), HashSet.

**Deep dive** — HashSet is a HashMap with a dummy value (`PRESENT`). LinkedHashSet is a LinkedHashMap. Complexities: HashSet add O(1) average, O(n) worst before treeify of the backing map. ArrayList `contains`/`remove(Object)` scan. `new LinkedHashSet<>(list)` is the idiomatic "dedupe preserving order." Do not use ArrayList + `contains` in a loop to unique-ify — that is O(n²).

Equals/hashCode of the *element* type is the Set contract: two `TestUser` objects with the same email are duplicates only if `equals` says so. LinkedHashSet iteration is insertion order of *first add*; re-adding an existing element does not move it (unlike LinkedHashMap access-order). Java 21 `SequencedSet.reversed()` is a reverse view — useful for "last unique failure first" without copying.

**Code**

```java
List<String> raw = List.of("login", "checkout", "login");
List<String> allRuns = new ArrayList<>(raw);                 // duplicates kept

Set<String> uniqueUnordered = new HashSet<>(raw);            // {login, checkout} — order undefined
Set<String> uniqueInOrder = new LinkedHashSet<>(raw);        // [login, checkout]

boolean seen = uniqueUnordered.contains("login");            // O(1) avg
boolean inList = allRuns.contains("login");                  // O(n)

// O(n²) anti-pattern for "unique test IDs"
List<String> uniqueSlow = new ArrayList<>();
for (String id : raw) if (!uniqueSlow.contains(id)) uniqueSlow.add(id);
```

**Follow-ups & traps**

- Trap: using ArrayList as a Set because "it's ordered" — then uniqueness bugs.
- `Set.of("a","a")` throws `IllegalArgumentException` (duplicate).
- Iteration order of HashSet can change after resize — never assert on it.
- Equals of lists vs sets: `[a,a]` ≠ `[a]` as lists; as sets they collapse.
- `LinkedHashSet.add` of an already-present id returns false and does not reorder — first-seen wins.


- HashSet iteration order is not a contract — never assert equals on a HashSet vs a List of expected order.
- LinkedHashSet first-add wins; re-adding login does not move it to the end.
- Use LinkedHashSet to unique-ify parameterized test names in a report.

**Code**

```java
Set<String> unique = new LinkedHashSet<>();
for (String name : List.of("login", "checkout", "login")) unique.add(name);
assert List.copyOf(unique).equals(List.of("login", "checkout"));
```

**One-liner** — ArrayList: sequence with duplicates; HashSet: unique, unordered; LinkedHashSet: unique, insertion-ordered — that last one is how you dedupe test names without scrambling reports.

### Q4. HashMap vs Hashtable (legacy, synchronized, nulls)

**Interview answer** — `HashMap` is unsynchronized, allows one null key and many null values, and is the default map. `Hashtable` is a Java 1.0 leftover: every method is `synchronized` on the whole table, null keys and null values are forbidden, and its iterators are not fail-fast in the same way as HashMap (Enumerator vs Iterator). There is no reason to use Hashtable in new code. If you need a thread-safe map, use `ConcurrentHashMap` (Q7), not Hashtable.

**Deep dive** — Hashtable's coarse lock serializes all reads. Properties extends Hashtable — still appears when reading `.properties` files (`new Properties()` then `load`); that is the one place you still *touch* Hashtable, but you should copy into a `Map<String,String>` immediately. `Collections.synchronizedMap(new HashMap<>())` is closer to Hashtable's locking and is also usually the wrong choice vs ConcurrentHashMap.

Hashtable enumerations are not fail-fast; HashMap iterators are. Mixing them in a mental model causes "why didn't I get CME?" confusion. Default initial capacity 11 (not a power of two) vs HashMap's 16 is a trivia item — the real interview point is null policy + legacy sync. In Rest Assured, `headers` as a HashMap with a null value can NPE later when a filter iterates; prefer `Map.of`/`LinkedHashMap` without nulls.

**Code**

```java
Map<String, String> config = new HashMap<>();
config.put("browser", "chrome");
config.put(null, "no");              // HashMap allows it — still avoid in frameworks

Hashtable<String, String> legacy = new Hashtable<>();
legacy.put("browser", "chrome");
// legacy.put(null, "x");            // NPE

Properties props = new Properties();
props.load(Files.newInputStream(Path.of("env.properties")));
Map<String, String> env = new HashMap<>();
props.stringPropertyNames().forEach(k -> env.put(k, props.getProperty(k)));
```

**Follow-ups & traps**

- Trap: "Hashtable is thread-safe so use it for parallel tests" — technically synchronized, practically obsolete and slow; it still doesn't make compound actions (`check then put`) atomic.
- `ConcurrentHashMap` also disallows nulls — same as Hashtable, unlike HashMap.
- Follow-up: `Dictionary` is the even older abstract parent of Hashtable.
- `Properties.getProperty` returns String; `get` can return a non-String if someone `put` a non-String — copy via `stringPropertyNames`.


- Copy Properties into HashMap immediately after load.
- Never put null into a map that might later become ConcurrentHashMap.
- Hashtable.elements() Enumerator is not Iterator — another legacy tell.

**Code**

```java
Properties p = new Properties();
p.setProperty("baseUrl", "https://qa");
Map<String, String> env = new HashMap<>();
p.stringPropertyNames().forEach(k -> env.put(k, p.getProperty(k)));
```

**One-liner** — HashMap for single-threaded maps; never Hashtable — if you need concurrency, ConcurrentHashMap.

### Q5. HashMap vs TreeMap vs LinkedHashMap — ordering, complexity, example (sorted test report, LRU)

**Interview answer** — HashMap: no order, average O(1) get/put. LinkedHashMap: insertion order (default) or access order (LRU mode), still average O(1). TreeMap: sorted by key (`Comparable` or `Comparator`), O(log n) get/put, `NavigableMap` range queries. Sorted Allure/HTML summary by test name? TreeMap. Preserve config-file key order? LinkedHashMap. Session cache with eviction? LinkedHashMap access-order (Q16). Everything else HashMap.

**Deep dive** — TreeMap is a red-black tree; keys must be mutually comparable; null keys are forbidden with natural order. LinkedHashMap extends HashMap and adds before/after links on each entry. Java 21 sequenced maps: `linked.putFirst`, `reversed()`. Iteration cost: HashMap iteration is over the table (capacity, including empty buckets historically — improved, but don't size a HashMap to 1e6 for 10 entries and iterate constantly).

Access-order LinkedHashMap is the LRU mechanism (Q16): `get` relocates the entry to the tail. Insertion-order LinkedHashMap is the right default for HTTP headers you want to log in put-order. TreeMap `subMap`/`headMap`/`tailMap` are views — mutating them mutates the tree. Comparator vs Comparable: if you pass a Comparator, keys need not be Comparable (you can sort `TestResult` by duration without implementing `compareTo`).

**Code**

```java
Map<String, Long> durationByTest = new TreeMap<>();           // sorted report
durationByTest.put("checkout", 812L);
durationByTest.put("login", 120L);
durationByTest.forEach((k, v) -> log.info("{} {}ms", k, v));  // login then checkout

Map<String, String> insertion = new LinkedHashMap<>();
insertion.put("Authorization", "Bearer …");
insertion.put("X-Request-Id", "…");                           // headers in put order

Map<String, Object> fast = new HashMap<>(Map.of("sku", "A1")); // no order needed
```

**Follow-ups & traps**

- Trap: TreeMap for "I want it sorted" on a hot per-request map — log n and Comparator bugs for no benefit; sort at report time.
- TreeMap Comparator inconsistent with equals (Q9 of this file) → two keys compareTo 0, one "disappears."
- LinkedHashMap is not thread-safe; wrap or don't share.
- `new TreeMap<>(hashMap)` copies and sorts once — often better than using TreeMap as the live store.

**Senior/lead angle** — Pick the map at the boundary: ingest as HashMap, publish a report as TreeMap/`stream().sorted()`. Don't infect the hot path with sorting.


- Insertion-order LinkedHashMap for headers you dump on failure.
- Access-order LinkedHashMap is LRU (Q16), not 'sorted.'
- TreeMap with String keys is case-sensitive; 'Login' vs 'login' are two entries.

**Code**

```java
Map<String, Long> sorted = new TreeMap<>(Map.of("checkout", 800L, "login", 100L));
assert List.copyOf(sorted.keySet()).equals(List.of("checkout", "login"));
```

**One-liner** — HashMap O(1) unordered; LinkedHashMap O(1) with insertion/access order (LRU); TreeMap O(log n) sorted keys — sort reports, don't sort your locator cache.

### Q6. HashMap internals: hashing, buckets, treeify (Java 8), resize, load factor; equals/hashCode again

**Interview answer** — A HashMap is an array of buckets. `put` computes `hash(key)` (key's `hashCode` mixed with a spread function), indexes with `hash & (capacity - 1)` (capacity is always a power of two), then if the bucket is empty stores the node, else walks a list or a tree comparing `hash` then `equals`. Java 8 treeifies a bucket into a red-black tree when a chain grows past 8 *and* the table is at least 64; below 64 it resizes instead. Load factor default 0.75: resize (double capacity, re-index) when `size > capacity * loadFactor`. If you override `equals` you must override `hashCode` or keys are lost.

**Deep dive** — Spread (`hash ^ (hash >>> 16)`) reduces collisions when hashCodes only differ in high bits. TREEIFY_THRESHOLD = 8, UNTREEIFY_THRESHOLD = 6, MIN_TREEIFY_CAPACITY = 64. Trees compare hash, then Comparable if keys are mutually comparable, then class name / identity — that is why poorly distributed hashCodes still degrade to O(log n) not O(n). Resize is O(n). Worst-case attacks (hash flooding) were the reason for treeify. `get` never uses `==` except as a fast path when the same instance is in the bucket (`e.key == key || equals`).

Null key lives at index 0. Iteration order of HashMap is not insertion order and can change on resize. Capacity constructor `new HashMap<>(expected)` still applies the load factor internally (`tableSizeFor`). After Java 8, a bucket is a linked list of `Node` until treeify, then `TreeNode` extends Node. Transfer on resize can split bins into low/high based on the extra bit of the new mask — interviewers love that sentence.

If you put a mutable `TestUser` as a key and then `user.setId(...)`, `get` using an equal-looking key hashes to a different bucket and returns null while `entrySet` still contains it. Immutable keys (records, String, UserId) are the fix.

**Code**

```java
Map<UserId, TestUser> cache = new HashMap<>(256); // capacity hint
cache.put(new UserId("u-1"), user);

// Must be consistent:
public final class UserId {
    private final String id;
    @Override public boolean equals(Object o) {
        return o instanceof UserId u && id.equals(u.id);
    }
    @Override public int hashCode() { return id.hashCode(); }
}
```

**Follow-ups & traps**

- Trap: "after Java 8 HashMap is O(log n)" — average still O(1); tree is the collision path.
- Mutable keys: mutate a field used in hashCode after put → get returns null (wrong bucket).
- `hashCode` returning constant → one bucket → tree of size n → slow but correct.
- Follow-up: `ConcurrentHashMap` also treeifies; it does not allow nulls.
- Load factor 1.0 vs 0.5: denser vs sparser; 0.75 is the measured default, don't tune it in a framework without metrics.

**Senior/lead angle** — Interviewers at SDET III want the 0.75 / power-of-two / treeify-8 story *and* the equals contract. Then tie it to "our test-user cache is a ConcurrentHashMap keyed by immutable UserId."


- tableSizeFor rounds requested capacity up to a power of two.
- Treeify only if bin length >= 8 AND table length >= 64; else resize.
- Show a mutable-key demo if they ask you to prove the contract.

**Code**

```java
Map<StringBuilder, String> broken = new HashMap<>();
StringBuilder key = new StringBuilder("user-1");
broken.put(key, "ok");
key.append("-mutated");
assert broken.get(key) == null; // lost
```

**One-liner** — Hash, mask to a bucket, equals to find the node; treeify at 8/64; resize at 0.75; break equals/hashCode and the map lies to you.

### Q7. ConcurrentHashMap vs `Collections.synchronizedMap`

**Interview answer** — `Collections.synchronizedMap(map)` wraps every method with `synchronized (mutex)` on a single lock — one thread in the map at a time, and compound actions (`if (!containsKey) put`) are still racy unless you synchronize on the map yourself. `ConcurrentHashMap` (CHM) allows concurrent readers and a high degree of concurrent writers using CAS and, historically, bins/stripes; `get` is non-blocking. CHM forbids null keys and values. For merging parallel test results or a shared retry counter map, use CHM. For a map only touched on one thread, HashMap.

**Deep dive** — CHM iterators are weakly consistent: they may reflect some post-creation updates, they do **not** throw ConcurrentModificationException. Size is an estimate under contention. Compound operations: use `putIfAbsent`, `compute`, `computeIfAbsent`, `merge` — those are atomic per key. `computeIfAbsent` is the right way to lazily create a per-test list of failures. Do not call `computeIfAbsent` with a function that mutates the same map (can deadlock / throw in some versions).

synchronizedMap's iterator still requires locking the map for the entire iteration or you get CME / undefined behavior. Pre-Java 8 CHM used segments (16 by default); Java 8+ uses bins + CAS, so the old "concurrencyLevel constructor" is ignored for sizing in spirit — still legal, not something to tune. Reads are volatile-style; updates use synchronized on the bin or tree lock. Nulls are banned so `get` returning null always means absent, never "present-null" — that ambiguity is why Hashtable/CHM reject nulls.

**Code**

```java
ConcurrentHashMap<String, AtomicInteger> failuresByTest = new ConcurrentHashMap<>();
failuresByTest.computeIfAbsent("login", k -> new AtomicInteger()).incrementAndGet();

ConcurrentHashMap<String, List<String>> errors = new ConcurrentHashMap<>();
errors.computeIfAbsent("login", k -> Collections.synchronizedList(new ArrayList<>()))
      .add("timeout");

Map<String, String> wrapped = Collections.synchronizedMap(new HashMap<>());
synchronized (wrapped) {                 // required for compound/iteration
    if (!wrapped.containsKey("token")) wrapped.put("token", fetch());
}
```

**Follow-ups & traps**

- Trap: CHM makes your *suite* thread-safe — it doesn't; tests still share users and static RestAssured state.
- `newKeySet()` for a concurrent unique-ID set.
- Hashtable vs CHM: both reject nulls; only CHM is a modern concurrent map.
- Follow-up: `ConcurrentSkipListMap` if you need concurrent *sorted* keys.
- `chm.get(k).add(x)` when the value is a plain ArrayList — the map is concurrent, the list is not.


- computeIfAbsent is the atomic lazy-create for failure lists.
- CHM.get(k).add(x) is not atomic if the list is a plain ArrayList.
- size() under contention is an estimate — don't assert exact size from 8 threads without joining.

**Code**

```java
ConcurrentHashMap<String, AtomicInteger> c = new ConcurrentHashMap<>();
c.merge("login", new AtomicInteger(1), (a, b) -> { a.addAndGet(b.get()); return a; });
```

**One-liner** — synchronizedMap is one giant lock; ConcurrentHashMap is the parallel-suite map — use `computeIfAbsent`/`merge`, never nulls, and don't expect iterators to snapshot.

### Q8. Iterator vs ListIterator; fail-fast vs fail-safe; ConcurrentModificationException

**Interview answer** — `Iterator` walks forward with `hasNext`/`next` and may `remove()` the last returned element. `ListIterator` is List-only: bidirectional, `add`/`set`, and index. Fail-fast iterators (ArrayList, HashMap) snapshot `modCount` and throw `ConcurrentModificationException` if the collection is structurally modified other than through that iterator. Fail-safe / weakly consistent iterators (ConcurrentHashMap, CopyOnWriteArrayList) do not throw CME; COW iterates a snapshot, CHM is weakly consistent. CME is a *best-effort* detector, not a concurrency guarantee — you can still corrupt a HashMap with data races and not see CME.

**Deep dive** — Enhanced for-loop is desugared to Iterator; `list.add` inside for-each → CME. `iterator.remove()` is the legal in-flight delete. `list.removeIf(predicate)` (Java 8) uses an iterator correctly. Nested iteration deleting from the same ArrayList is a classic bug. CopyOnWriteArrayList is for read-heavy listener lists: writes copy the array; iterators never see concurrent writes and never CME — expensive if you add on every test.

**Code**

```java
List<String> tests = new ArrayList<>(List.of("a", "b", "c"));
Iterator<String> it = tests.iterator();
while (it.hasNext()) {
    if (it.next().equals("b")) it.remove();   // OK
}
// for (String t : tests) tests.remove(t);    // CME

ListIterator<String> li = tests.listIterator();
while (li.hasNext()) {
    if (li.next().equals("a")) li.set("login"); // replace
}

Map<String, String> live = new ConcurrentHashMap<>(Map.of("k", "v"));
for (var e : live.entrySet()) live.put("k2", "v2"); // no CME (weakly consistent)
```

**Follow-ups & traps**

- Trap: catching CME and retrying as "normal" — it means your collection sharing is wrong.
- `subList` views: modifying the parent can CME the subList.
- Fail-fast does not mean thread-safe; two threads can still break ArrayList without CME.
- `modCount` is unsynchronized — CME is best-effort; never use it as a lock substitute in parallel tests.
- `CopyOnWriteArrayList` for TestNG listeners: iterate safely while another test registers a listener; writes copy the array so don't add on every step.


- for-each is Iterator underneath — add inside it CME on ArrayList.
- iterator.remove is the only legal in-flight delete on fail-fast lists.
- CHM iteration may see puts that happen during the loop — weakly consistent.

**Code**

```java
List<String> names = new ArrayList<>(List.of("a", "b"));
names.removeIf(n -> n.equals("b")); // uses iterator correctly
```

**One-liner** — Iterator is the safe way to delete while walking; fail-fast collections throw CME on structural edits; concurrent collections don't — CME is a bug detector, not a lock.

### Q9. Comparable vs Comparator — sorting test results

**Interview answer** — `Comparable<T>` is the class's *natural* order (`compareTo` inside `TestResult`). `Comparator<T>` is an external strategy you pass to `sort` / `TreeMap` / `PriorityQueue` — duration descending, then name, without touching the class. In a framework I keep `TestResult` as a record and sort with comparators: `Comparator.comparingLong(TestResult::durationMs).reversed().thenComparing(TestResult::name)`. Natural order is for types with one obvious order (Enum, String, Instant).

**Deep dive** — Contract: `sgn(a.compareTo(b)) == -sgn(b.compareTo(a))`, transitivity, and `compareTo` == 0 should agree with `equals` for SortedSet/TreeMap (otherwise two "unequal" results collapse). `compareTo` throwing for "incompatible types" is legacy; generics should prevent it. `Comparator.nullsLast` / `nullsFirst` for optional fields. `Collections.sort` vs `list.sort` vs `stream.sorted` — all use TimSort, stable.

`Comparator.comparing` is null-hostile unless you wrap `nullsLast`. Method references on records (`TestResult::durationMs`) are the readable form. For a retry queue of failed tests you want longest-first: reverse duration, then name for determinism. Implementing Comparable *and* passing a different Comparator to TreeMap is legal — the Comparator wins.

**Code**

```java
public record TestResult(String name, String status, long durationMs)
        implements Comparable<TestResult> {
    @Override public int compareTo(TestResult o) { return name.compareTo(o.name); }
}

List<TestResult> results = /* from listeners */;
results.sort(Comparator.comparing(TestResult::status)
        .thenComparing(Comparator.comparingLong(TestResult::durationMs).reversed()));

TreeMap<TestResult, Path> screenshots = new TreeMap<>(
        Comparator.comparing(TestResult::name));
```

**Follow-ups & traps**

- Trap: `compareTo` using subtraction (`a - b`) — overflow; use `Long.compare`.
- TreeSet of TestResult with compareTo on name only: two failures with the same name, one dropped.
- "Why not Comparable always?" — you often need two orders (report vs retry queue).
- `thenComparing` is the SDET-III answer when they say "sort by status then by time."


- Long.compare / Integer.compare — never subtract.
- thenComparing for status then duration is the report sort.
- TreeSet uniqueness is compareTo==0, not equals — a famous trap.

**Code**

```java
results.sort(Comparator.comparing(TestResult::status)
        .thenComparingLong(TestResult::durationMs).reversed());
```

**One-liner** — Comparable is the type's one natural order; Comparator is how you sort the same test results by status, duration, or name without rewriting the class.

### Q10. Generics: type erasure, PECS (producer-extends, consumer-super), raw types danger

**Interview answer** — Generics are a compile-time contract: `List<WebElement>` stops you putting a `String` in. At runtime type parameters are erased — `List<String>` and `List<Integer>` are both `List` in bytecode — so you cannot `new T()`, `instanceof T`, or create a generic array cleanly. PECS: Producer Extends, Consumer Super. If you only *read* `T` from a collection, `List<? extends T>` (`List<? extends WebDriver>` can be Chrome or Firefox lists). If you only *write* `T`, `List<? super T>`. Raw types (`List` without `<>`) disable checking and cause heap pollution; never use them in new code.

**Deep dive** — Erasure inserts casts at call sites. Bridge methods make overrides with different erased signatures work. `class Page<T extends WebDriver>` is a bounded type parameter. Wildcards vs type parameters: if you need to mention the type twice (`T id, T body`), use `T`; if the method only consumes or only produces, use wildcards. `RestAssured` `extract().as(new TypeRef<List<Order>>(){})` exists because erasure killed `List<Order>.class`.

Heap pollution: mixing raw `List` with `List<String>` then fetching a String → `ClassCastException` at an unrelated line. `@SafeVarargs` and `List.of` reduce this. Unbounded wildcards `List<?>` are "list of some unknown type" — you can read as Object and add only null. PECS mnemonic maps to Selenium: a method that *displays* whatever drivers you give it is `List<? extends WebDriver>` (producer of WebDriver values); a method that *fills* a list you will later treat as Chrome-capable is `List<? super ChromeDriver>` (consumer of ChromeDriver).

**Code**

```java
static WebElement firstVisible(List<? extends WebElement> elements) { // producer
    return elements.stream().filter(WebElement::isDisplayed).findFirst().orElseThrow();
}

static void addChrome(List<? super ChromeDriver> drivers, ChromeDriver d) { // consumer
    drivers.add(d);
}

static <T> T jsonAs(Response r, Class<T> type) {   // Class<T> reifies T
    return r.as(type);
}

// Type token for erased lists (Gson/Jackson style)
static List<OrderResponse> orders(Response r) {
    return r.as(new TypeRef<List<OrderResponse>>() {});
}
```

**Follow-ups & traps**

- Trap: `List<WebDriver> xs = new ArrayList<ChromeDriver>()` — invariant; use `? extends WebDriver`.
- Arrays are covariant (`ChromeDriver[]` is `WebDriver[]`) → `ArrayStoreException`; generics were designed not to repeat that.
- Raw `Response.as(List.class)` → `List` of maps, not `List<Order>`.

**Senior/lead angle** — Framework APIs should be generic at the boundary (`Page<T>`, `ApiClient<T>`) and reify with `Class<T>`/`TypeRef` at the HTTP layer. Ban raw types in Checkstyle.


- TypeRef anonymous subclass is how Rest Assured reifies List<Order>.
- PECS: extends for getters, super for setters — say it that way too.
- Raw List from as(List.class) is List of Maps — ClassCastException later.

**Code**

```java
List<OrderResponse> orders = response.as(new TypeRef<List<OrderResponse>>() {});
```

**One-liner** — Generics are compile-time only (erasure); PECS is extends-for-read, super-for-write; raw types are how ClassCastException shows up three methods later.

### Q11. PriorityQueue, Deque, ArrayDeque

**Interview answer** — `PriorityQueue` is a binary heap: offer/poll O(log n), peek O(1), iteration is **not** sorted. Default min-heap; pass `Comparator.reverseOrder()` for max-heap / longest-running tests first. `Deque` is a double-ended queue; `ArrayDeque` is the resizable-array implementation and the correct default for stack (`push`/`pop`) and queue (`offer`/`poll`). `Stack` and `LinkedList`-as-queue are legacy. Nulls are forbidden in PriorityQueue and ArrayDeque.

**Deep dive** — Heap invariant: parent ≤ children (min-heap); the array index math is `2i+1`. No random access. For "top K slow tests" keep a size-K min-heap of durations: offer each result, if size > K poll the current min so the heap holds the K largest. ArrayDeque is a circular buffer; grow by doubling; faster than LinkedList for both stack and queue because of locality. `ArrayDeque` is not thread-safe; `ConcurrentLinkedDeque` / `ArrayBlockingQueue` for concurrent workers. `offer`/`poll` return false/null; `add`/`remove` throw — use the former when a bounded blocking queue is full rather than blowing a test with `IllegalStateException`.

**Code**

```java
PriorityQueue<TestResult> slowest = new PriorityQueue<>(
        Comparator.comparingLong(TestResult::durationMs).reversed());
results.forEach(slowest::offer);
TestResult worst = slowest.poll();                 // longest, not a full sort

Deque<By> breadcrumbs = new ArrayDeque<>();        // stack of locators / pages
breadcrumbs.push(By.id("modal"));
By top = breadcrumbs.pop();

Deque<Callable<Response>> apiCalls = new ArrayDeque<>();
apiCalls.offer(() -> given().get("/health"));      // queue
```

**Follow-ups & traps**

- Trap: iterating PriorityQueue expecting sorted output — sort a copy or poll until empty.
- `PriorityQueue` of TestResult without Comparator requires Comparable.
- `Stack` extends Vector (synchronized, leftover) — say ArrayDeque instead.
- Nulls forbidden: `pq.offer(null)` NPE — filter skipped tests before ranking.


- Top-K slow tests: min-heap of size K.
- ArrayDeque for both stack and queue — javadoc says so.
- PriorityQueue iterator is heap order, not sorted — poll to drain.

**Code**

```java
PriorityQueue<Long> top = new PriorityQueue<>();
for (long d : durations) {
    top.offer(d);
    if (top.size() > 5) top.poll();
}
```

**One-liner** — ArrayDeque for stacks and queues; PriorityQueue when you need "next best" by comparator, remembering iteration isn't sorted.

### Q12. When to use Map vs Set vs List in test-data code

**Interview answer** — List: ordered cases, duplicates allowed, index/CSV rows, parameterized test arguments in file order. Set: "have I already created this user id," unique SKUs, tags. Map: lookup by id (`userId → TestUser`), grouping (`status → list of tests`), header bags, JSON objects. If you find yourself `list.stream().filter(u -> u.id().equals(id)).findFirst()` in a hot setup path, you wanted a Map.

**Deep dive** — Parameterized TestNG `Object[][]` or JUnit `@MethodSource` is a List (order is the report order). Unique constraint in a data factory: `Set<String> allocatedEmails` plus `ConcurrentHashMap` if parallel. Multimaps: `Map<String, List<T>>` or `groupingBy`. Don't use Map for "two columns of the same type" if order matters and keys aren't meaningful — that's a List of records.

A practical factory: `Map<String, TestUser> byRole` for lookup, `List<CreateOrderRequest> cases` for `@MethodSource`, `Set<String> skusUsed` so two parallel tests don't claim the same inventory SKU. If the API returns an unordered JSON object, deserialize to Map; if it returns a JSON array, deserialize to List — don't force one structure because "maps are flexible."

**Code**

```java
List<CreateOrderRequest> cases = List.of(          // order = execution order
        new CreateOrderRequest("SKU-1", 1),
        new CreateOrderRequest("SKU-1", 99));

Set<String> usedEmails = ConcurrentHashMap.newKeySet();
String email = faker.internet().emailAddress();
if (!usedEmails.add(email)) throw new IllegalStateException("collision");

Map<String, TestUser> usersByRole = Map.of(
        "admin", admin,
        "buyer", buyer);
given().body(usersByRole.get("buyer")).post("/login");
```

**Follow-ups & traps**

- Trap: `List<Map<String,String>>` as the only test-data type — untyped, no equals, easy to typo keys.
- Map iteration order: HashMap not stable; LinkedHashMap if the JSON key order is asserted (usually shouldn't be).
- Set of mutable POJOs without equals/hashCode → uniqueness is reference identity.
- `Map.of` max 10 pairs; use `Map.ofEntries` or a HashMap for larger env blobs.


- Parameterized cases: List. Lookup by role: Map. Allocated emails: Set.
- List<Map<String,String>> is untyped test data — prefer records.
- ConcurrentHashMap.newKeySet() for parallel unique IDs.

**Code**

```java
Set<String> emails = ConcurrentHashMap.newKeySet();
assert emails.add("a@b.c");
assert !emails.add("a@b.c");
```

**One-liner** — List for sequences of cases, Set for uniqueness, Map for lookup/grouping — if you scan a list to find by id, you wanted a Map.

### Q13. Making a collection unmodifiable (`copyOf`, `unmodifiableList`) and why it matters for shared test data

**Interview answer** — Shared static test data must not be mutated by a test that `users.add(...)` "just for this case." `List.copyOf` / `Set.copyOf` / `Map.copyOf` (Java 10) take a snapshot, reject nulls, and throw `UnsupportedOperationException` on mutation. `Collections.unmodifiableList(list)` is a *view*: if the backing list mutates, the view does too. `List.of` is compact and unmodifiable. I freeze reference data at class-init (`public static final List<Country> COUNTRIES = List.copyOf(load())`) and give tests `withX()` copies when they need a variant.

**Deep dive** — Unmodifiable ≠ immutable elements: a List of mutable POJOs can still have fields changed. For true safety, records + copyOf of the collection. `Arrays.asList` is fixed-size but settable (`set` works, `add` doesn't) — a common trap. Guava `ImmutableList` is similar to `copyOf`. In parallel suites, "constant" ArrayList that tests sort in place is a flake factory.

`Collections.unmodifiableList` is a wrapper: cheap, but the callee can still mutate through the original reference. `List.copyOf` copies (or reuses if already immutable) and is independent. Java 21 sequenced unmodifiable lists still reject `addFirst`. Static `List<String> TAGS = new ArrayList<>(List.of("smoke"))` in a base test is the classic "thread-count=8 shuffled tags" bug.

**Code**

```java
public final class ReferenceData {
    public static final List<String> LOCALES = List.of("en-US", "de-DE"); // unmodifiable

    private static final List<TestUser> USERS = loadUsers();
    public static List<TestUser> users() { return List.copyOf(USERS); }
}

List<String> backing = new ArrayList<>(List.of("smoke"));
List<String> view = Collections.unmodifiableList(backing);
backing.add("flaky");                 // view now has "flaky" too — surprise
List<String> snapshot = List.copyOf(backing); // independent
```

**Follow-ups & traps**

- Trap: unmodifiable view vs copy — know which you got.
- `List.of(null)` NPE; HashMap with null copied via `Map.copyOf` NPE.
- Test mutates `List.of` → UOE, which is success (caught the bug).
- `Arrays.asList` allows `set` — not a freeze; candidates confuse it with `List.of`.


- unmodifiableList is a view; copyOf is a snapshot.
- List.of rejects nulls; Arrays.asList allows set().
- Static mutable ArrayList of tags plus parallel = flake.

**Code**

```java
List<String> tags = List.copyOf(List.of("smoke", "api"));
// tags.add("x"); // UOE
```

**One-liner** — `List.copyOf`/`List.of` freeze shared test data; `unmodifiableList` is only a view; parallel tests plus a mutable static list is a flake.

### Q14. Stream-friendly collections; `Collectors.groupingBy` for grouping failures

**Interview answer** — Anything `Collection` is streamable (`list.stream()`). Maps stream via `entrySet()`, `keySet()`, `values()`. `groupingBy` builds a `Map<K, List<T>>` — the standard "group failed tests by exception type / page / owner" one-liner. Use `groupingByConcurrent` only with `parallelStream` (usually a trap in tests — next file). Prefer `ArrayList` as the source; don't stream a `LinkedList` for random ops. After grouping, you still have an ordinary Map to feed a report.

**Deep dive** — `Collectors.groupingBy(classifier, downstream)` — e.g. count with `counting()`, or unique tests with `mapping(..., toSet())`. `partitioningBy` is grouping by a boolean. Encounter order: ordered sources (List) preserve order in the lists unless you use concurrent collectors. Don't mutate the source collection in a stream pipeline.

Prefer collecting into a `TreeMap` for a sorted report: `groupingBy(TestResult::status, TreeMap::new, counting())`. `toList()` on a stream of results is unmodifiable (Java 16); if a reporter will add retries, collect to `ArrayList`. Stream a Map with `map.entrySet().stream()` when grouping already-keyed data (env → tests).

**Code**

```java
Map<String, List<TestResult>> byStatus = results.stream()
        .collect(Collectors.groupingBy(TestResult::status));

Map<String, Long> failCountByPage = results.stream()
        .filter(r -> r.status().equals("FAIL"))
        .collect(Collectors.groupingBy(TestResult::page, Collectors.counting()));

Map<Boolean, List<TestResult>> passFail = results.stream()
        .collect(Collectors.partitioningBy(r -> r.status().equals("PASS")));
```

**Follow-ups & traps**

- Trap: `groupingBy` with a classifier that returns null → NPE.
- `toMap` without a merge function throws on duplicate keys — use `(a, b) -> b` or groupingBy.
- Streaming a ConcurrentHashMap: weakly consistent view.
- `groupingByConcurrent` + ordered List source loses encounter order — fine for counts, bad for "first failure wins."


- groupingBy(status, counting()) for a dashboard line.
- toMap needs a merge on duplicate test names.
- Null classifier NPE — status must be non-null.

**Code**

```java
Map<String, Long> counts = results.stream()
        .collect(Collectors.groupingBy(TestResult::status, Collectors.counting()));
```

**One-liner** — Stream the List of results, `groupingBy` status or page, `counting()` for a failure dashboard — it's a collector, not a new collection type.

### Q15. WeakHashMap / IdentityHashMap — only if useful; keep brief

**Interview answer** — `WeakHashMap` holds **weak keys**: if no other strong reference to the key exists, the entry can be GC'd. Used for caches where the key's lifetime should decide eviction (class metadata, classloader-scoped caches). It is **not** a general-purpose cache (values can keep keys alive via cycles; use `WeakReference` carefully). `IdentityHashMap` compares keys with `==` and `System.identityHashCode`, not `equals` — useful when you must distinguish two equal `UserId` instances, which in tests is almost never. I would not put WebDriver in a WeakHashMap as a substitute for `quit()`.

**Deep dive** — WeakHashMap is not thread-safe; iterators fail-fast. Entries are cleared when the key is only weakly reachable *and* GC runs — not on a timer. Values that strongly reference their keys (or a cycle through a listener) pin the entry forever. IdentityHashMap is a linear-probe table, allows "duplicate" equal keys, and is used inside the JDK for topology where equals would collapse distinct instances (serialization graphs, not test IDs). Both are niche; saying "I'd use WeakHashMap for drivers" is a trap — GC is not teardown and Chrome processes would outlive the Java key.

**Code**

```java
Map<Class<?>, Object> perClassMemo = new WeakHashMap<>(); // key can vanish after class unload

IdentityHashMap<WebElement, String> byInstance = new IdentityHashMap<>();
// two elements that equals() would treat as same stay distinct if different instances
```

**Follow-ups & traps**

- Trap: WeakHashMap as LRU — wrong tool (Q16).
- Values that reference keys strongly prevent reclamation.
- `System.identityHashCode` vs `hashCode` — IdentityHashMap uses the former; don't expect equals-based lookup.
- GC of WeakHashMap keys is not driver.quit().
- IdentityHashMap is == comparison — almost never for test IDs.
- Pinning: a value that references its key keeps the WeakHashMap entry alive.

**Code**

```java
WeakHashMap<Class<?>, String> memo = new WeakHashMap<>();
memo.put(LoginPage.class, "cached");
```


- GC of WeakHashMap keys is not driver.quit().
- IdentityHashMap is == comparison — almost never for test IDs.
- Pinning: a value that references its key keeps the WeakHashMap entry alive.

**Code**

```java
WeakHashMap<Class<?>, String> memo = new WeakHashMap<>();
memo.put(LoginPage.class, "cached");
```

**One-liner** — WeakHashMap GC's entries when keys are otherwise unreachable; IdentityHashMap uses `==`; neither replaces ThreadLocal driver cleanup.

### Q16. How you'd implement a simple LRU cache (`LinkedHashMap.removeEldestEntry`) — coding-adjacent

**Interview answer** — An LRU cache evicts the least-recently-used entry when capacity is exceeded. `LinkedHashMap` with `accessOrder = true` moves an entry to the tail on `get`/`put`; override `removeEldestEntry` to return `size() > capacity`. I prefer composition over extending LinkedHashMap so I can synchronize or bound it later. In SDET tools this is a response-cache for expensive GET fixtures or a screenshot-path cache — never a substitute for quitting browsers.

**Deep dive** — Constructor `new LinkedHashMap<>(cap, 0.75f, true)`. `removeEldestEntry` is called after insert; returning true deletes the eldest (head in access-order). Thread-safety: wrap with `Collections.synchronizedMap` (coarse) or don't share. True concurrent LRU is harder (Caffeine); interviews want the LinkedHashMap sketch. Complexity: O(1) get/put amortized. Alternative: HashMap + doubly linked list (LeetCode 146) — mention if they want you to write nodes.

**Code**

```java
public final class LruCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> map;

    public LruCache(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacity");
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > LruCache.this.capacity;
            }
        };
    }

    public synchronized V get(K key) { return map.get(key); }
    public synchronized void put(K key, V value) { map.put(key, value); }
    public synchronized int size() { return map.size(); }
}

// Example: cache compiled JsonPath / parsed fixtures per test JVM
LruCache<String, OrderResponse> fixtureCache = new LruCache<>(32);
```

**Follow-ups & traps**

- Trap: accessOrder `false` (insertion order) — that is FIFO, not LRU.
- Eldest is removed only on `put` (and `putAll`), not on `get`.
- Follow-up: make it thread-safe — `synchronized` on all accessors, or Caffeine for production.
- Variation: LFU or time-based expiry — different structures.

**Senior/lead angle** — Don't LRU-cache WebElements (stale). Cache immutable test data and HTTP fixtures; measure hit rate before adding another cache.

**One-liner** — LinkedHashMap access-order plus `removeEldestEntry` when `size > cap` is the JDK LRU; O(1), not thread-safe unless you lock.
