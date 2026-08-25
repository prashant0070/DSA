# Java Collections — deep notes (with examples)

**Browser:** [COLLECTIONS.html](COLLECTIONS.html) · Parent: [NOTES.md](NOTES.md) · Interview: [INTERVIEW-QA.md](INTERVIEW-QA.md)

Related: [equals/hashCode](../00-oop-foundations/NOTES.md) · [complexity](../02-complexity/NOTES.md) · rebuild List/Stack in [01-linear-structures](../01-linear-structures/)

**How to study:** each section = plain English → type the example → check printed output → note the “trap”.

---

## 1. Hierarchy — what belongs where

### In simple words

- **List** = ordered bag; duplicates OK; you can ask for index `0`, `1`, …  
- **Set** = unique items only (by `equals`)  
- **Queue / Deque** = waiting line or stack  
- **Map** = dictionary (key → value). **Map is not a Collection.**

```text
Iterable
 └── Collection
      ├── List   → ArrayList, LinkedList
      ├── Set    → HashSet, LinkedHashSet, TreeSet
      └── Queue  → ArrayDeque, PriorityQueue, LinkedList
Map            → HashMap, LinkedHashMap, TreeMap, ConcurrentHashMap
```

```java
List<String> list = List.of("a", "a");     // [a, a] duplicates OK
Set<String> set = Set.of("a");             // cannot add second "a"
Map<String, Integer> map = Map.of("a", 1); // key "a" → value 1
```

---

## 2. When to use what (with a tiny story)

| You need… | Everyday story | Choose | Tiny example |
| --- | --- | --- | --- |
| Index access | Playlist by track number | **ArrayList** | `list.get(2)` |
| Unique IDs | “Have I seen this ticket?” | **HashSet** | `set.contains(id)` |
| Count words | Dictionary of counts | **HashMap** | `map.get(word)` |
| Undo stack | Browser back | **ArrayDeque** | `stack.push` / `pop` |
| Waiting line | Print queue | **ArrayDeque** | `offer` / `poll` |
| Always smallest | Next closest deadline | **PriorityQueue** | `peek()` min |
| Keep insert order | Config keys as entered | **LinkedHashMap** | iterate in order |
| Sorted keys | Timeline by date string | **TreeMap** | `firstKey()` |
| Many threads | Parallel test results | **ConcurrentHashMap** | `put` from workers |

**Defaults in interviews:** ArrayList, HashMap, HashSet, ArrayDeque, PriorityQueue.

---

## 3. List — ArrayList (most important)

### In simple words

`ArrayList` is a **resizable array**. Fast to jump to any index. Slow to insert/remove in the middle (everything shifts).

### Example — basic ops

```java
List<String> names = new ArrayList<>();
names.add("Ada");           // end
names.add("Bob");
names.add(0, "Zoe");        // insert at front — shifts others
System.out.println(names);          // [Zoe, Ada, Bob]
System.out.println(names.get(1));   // Ada
names.set(1, "Alan");
System.out.println(names);          // [Zoe, Alan, Bob]
names.remove(0);                    // remove by index
names.remove("Bob");                // remove by value (first match)
System.out.println(names);          // [Alan]
System.out.println(names.size());   // 1
```

### Example — growth (mental model)

```text
capacity 10 → add until full → create ~15 slots → copy old elements → continue
```

Most `add` at the end feel O(1). Occasional resize costs O(n). Average still **amortized O(1)**.

```java
List<Integer> nums = new ArrayList<>(100); // optional: pre-size capacity
for (int i = 0; i < 100; i++) nums.add(i);
```

### Example — remove while thinking about types

```java
List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
list.remove(1);                      // removes INDEX 1 → [1, 3]
list = new ArrayList<>(List.of(1, 2, 3));
list.remove(Integer.valueOf(1));     // removes VALUE 1 → [2, 3]
```

### Trap — LinkedList is rarely faster

```java
List<Integer> linked = new LinkedList<>();
linked.add(1);
System.out.println(linked.get(0)); // OK but get(i) walks i nodes → O(n)
```

Prefer **ArrayList** unless you profile a real hotspot at the ends *and* already hold the node.

---

## 4. Set — uniqueness

### In simple words

A Set answers: “Is this already here?” Duplicates (by `equals`) are ignored.

```java
Set<String> tags = new HashSet<>();
tags.add("smoke");
tags.add("smoke");                 // ignored
tags.add("regression");
System.out.println(tags.size());   // 2
System.out.println(tags.contains("smoke")); // true
```

| Class | Order when you iterate | Null allowed? | Cost |
| --- | --- | --- | --- |
| HashSet | No promise | One null | Avg O(1) |
| LinkedHashSet | Insertion order | One null | Avg O(1) |
| TreeSet | Sorted | **No** null | O(log n) |

```java
Set<String> ordered = new LinkedHashSet<>();
ordered.add("b");
ordered.add("a");
ordered.add("b");
System.out.println(ordered);  // [b, a] — insert order, unique

Set<Integer> sorted = new TreeSet<>();
sorted.add(5);
sorted.add(1);
sorted.add(3);
System.out.println(sorted);   // [1, 3, 5]
```

### Example — find duplicates in an array

```java
static List<Integer> findDuplicates(int[] a) {
    Set<Integer> seen = new HashSet<>();
    Set<Integer> dup = new HashSet<>();
    for (int n : a) {
        if (!seen.add(n)) {   // add returns false if already present
            dup.add(n);
        }
    }
    return new ArrayList<>(dup);
}

System.out.println(findDuplicates(new int[]{1, 2, 1, 3, 2})); // [1, 2] (order may vary)
```

---

## 5. Map — HashMap (must-know, with walkthrough)

### In simple words

A Map stores **pairs**: key → value.  
`HashMap` finds the bucket with a hash, then finds the entry with `equals`.

### Example — put / get / merge

```java
Map<String, Integer> ages = new HashMap<>();
ages.put("Ada", 30);
ages.put("Bob", 25);
System.out.println(ages.get("Ada"));           // 30
System.out.println(ages.get("Zoe"));           // null
System.out.println(ages.getOrDefault("Zoe", 0)); // 0
System.out.println(ages.containsKey("Bob"));   // true

// Word frequency — clean way
Map<String, Integer> freq = new HashMap<>();
for (String w : List.of("to", "be", "or", "not", "to", "be")) {
    freq.merge(w, 1, Integer::sum);
}
System.out.println(freq);  // {or=1, not=1, be=2, to=2}  (order may vary)
```

### Example — iterate entries

```java
for (Map.Entry<String, Integer> e : freq.entrySet()) {
    System.out.println(e.getKey() + " → " + e.getValue());
}

freq.forEach((k, v) -> System.out.println(k + "=" + v));
```

### Mental model of buckets

```text
key "to" → hash → bucket index → look at chain/tree → equals → value
```

| Detail | Meaning |
| --- | --- |
| Load factor 0.75 | Resize when size > capacity × 0.75 |
| Resize | New larger table; redistribute — occasional O(n) |
| Null | One null key OK; many null values |
| Threads | **Not** safe — use ConcurrentHashMap |

### Example — why equals/hashCode matter

```java
class Point {
    int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    // WITHOUT equals/hashCode, two Point(1,2) are different keys!
}

Map<Point, String> m = new HashMap<>();
m.put(new Point(1, 2), "A");
System.out.println(m.get(new Point(1, 2))); // null — bad keys

// Fix: override equals + hashCode (see OOP notes) using x and y
```

### LinkedHashMap — keep order / LRU sketch

```java
Map<String, Integer> ordered = new LinkedHashMap<>();
ordered.put("first", 1);
ordered.put("second", 2);
ordered.put("third", 3);
System.out.println(ordered); // {first=1, second=2, third=3} — insertion order

// Tiny LRU idea (access-order = true)
final int CAP = 2;
Map<Integer, Integer> lru = new LinkedHashMap<>(16, 0.75f, true) {
    @Override protected boolean removeEldestEntry(Map.Entry<Integer, Integer> e) {
        return size() > CAP;
    }
};
lru.put(1, 1);
lru.put(2, 2);
lru.get(1);       // make 1 most-recent
lru.put(3, 3);    // evicts eldest (2)
System.out.println(lru.keySet()); // [1, 3]
```

### TreeMap — sorted keys

```java
TreeMap<String, Integer> tm = new TreeMap<>();
tm.put("c", 3);
tm.put("a", 1);
tm.put("b", 2);
System.out.println(tm);           // {a=1, b=2, c=3}
System.out.println(tm.firstKey()); // a
System.out.println(tm.ceilingKey("b")); // b
```

### ConcurrentHashMap

```java
ConcurrentHashMap<String, Integer> results = new ConcurrentHashMap<>();
results.put("login", 1);
results.merge("login", 1, Integer::sum);
// results.put(null, 1); // NPE — no null keys/values
System.out.println(results.get("login")); // 2
```

---

## 6. Queue / Deque / PriorityQueue

### ArrayDeque as stack (LIFO)

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.push(3);
System.out.println(stack.pop());   // 3
System.out.println(stack.peek());  // 2
```

### ArrayDeque as queue (FIFO)

```java
Deque<String> q = new ArrayDeque<>();
q.offer("A");
q.offer("B");
q.offer("C");
System.out.println(q.poll());  // A
System.out.println(q.poll());  // B
```

**Note:** ArrayDeque does **not** allow null.

### PriorityQueue — min-heap example

```java
PriorityQueue<Integer> min = new PriorityQueue<>();
min.offer(5);
min.offer(1);
min.offer(3);
System.out.println(min.peek());  // 1  (smallest)
System.out.println(min.poll());  // 1
System.out.println(min.poll());  // 3

// Max-heap
PriorityQueue<Integer> max = new PriorityQueue<>(Comparator.reverseOrder());
max.offer(5);
max.offer(1);
System.out.println(max.peek());  // 5
```

### Trap — iterating PriorityQueue is NOT sorted

```java
PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(5, 1, 3));
System.out.println(pq); // heap order, e.g. [1, 5, 3] — not fully sorted!
// To print sorted: keep polling, or copy + sort
```

### Example — Top K largest numbers

```java
static List<Integer> topK(int[] a, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>(); // size k
    for (int n : a) {
        minHeap.offer(n);
        if (minHeap.size() > k) minHeap.poll(); // drop smallest
    }
    return new ArrayList<>(minHeap);
}

System.out.println(topK(new int[]{3, 1, 5, 12, 2, 11}, 3)); // [5, 12, 11] (any order)
```

---

## 7. Iterator, fail-fast, removeIf

### In simple words

While you `for-each` a list, **don’t call `list.remove`**. The list notices and throws `ConcurrentModificationException` (fail-fast).

```java
List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4));

// BAD — often throws ConcurrentModificationException
try {
    for (Integer n : list) {
        if (n % 2 == 0) list.remove(n);
    }
} catch (ConcurrentModificationException e) {
    System.out.println("CME as expected");
}

// GOOD — modern
list = new ArrayList<>(List.of(1, 2, 3, 4));
list.removeIf(n -> n % 2 == 0);
System.out.println(list);  // [1, 3]

// GOOD — classic Iterator
list = new ArrayList<>(List.of(1, 2, 3, 4));
Iterator<Integer> it = list.iterator();
while (it.hasNext()) {
    if (it.next() % 2 == 0) it.remove();
}
System.out.println(list);  // [1, 3]
```

---

## 8. Comparable vs Comparator — examples

```java
class Person implements Comparable<Person> {
    final String name;
    final int age;
    Person(String name, int age) { this.name = name; this.age = age; }
    public int compareTo(Person o) {
        return Integer.compare(this.age, o.age); // natural = by age
    }
    public String toString() { return name + "(" + age + ")"; }
}

List<Person> people = new ArrayList<>(List.of(
        new Person("Bob", 40),
        new Person("Ada", 30)
));
Collections.sort(people);                 // uses compareTo
System.out.println(people);               // [Ada(30), Bob(40)]

people.sort(Comparator.comparing(p -> p.name)); // custom
System.out.println(people);               // [Ada(30), Bob(40)] by name
```

---

## 9. Utility APIs — examples

```java
List<Integer> list = new ArrayList<>(List.of(3, 1, 2));
Collections.sort(list);
System.out.println(list);                         // [1, 2, 3]
System.out.println(Collections.binarySearch(list, 2)); // 1
Collections.reverse(list);
System.out.println(list);                         // [3, 2, 1]

List<String> frozen = List.of("a", "b");          // immutable (Java 9+)
// frozen.add("c");  // UnsupportedOperationException

List<String> sync = Collections.synchronizedList(new ArrayList<>());
```

---

## 10. Complexity cheat sheet (with “so what”)

| Structure | Fast at | Slow at | So what |
| --- | --- | --- | --- |
| ArrayList | get/set index, add end | insert middle | Default list |
| HashMap | get/put by key | worst-case collisions | Default dictionary |
| TreeMap | sorted ops | every op log n | Need order |
| HashSet | contains | — | Uniqueness |
| ArrayDeque | ends | middle search | Stack/queue |
| PriorityQueue | peek min / poll | random access | Top-K / scheduling |

---

## 11. Generics reminder

```java
List<String> a = new ArrayList<>();
// List<Object> b = a;  // compile error — lists are invariant (safer than arrays)
```

PECS: producer `? extends`, consumer `? super` — details in OOP ADVANCED.

---

## 12. Streams + collections — one worked example

```java
List<String> words = List.of("apple", "ant", "banana", "bat");

Map<Character, Long> countByFirst = words.stream()
        .collect(Collectors.groupingBy(w -> w.charAt(0), Collectors.counting()));
System.out.println(countByFirst); // {a=2, b=2}
```

In interviews, also be ready to write the same with a `for` loop + `HashMap`.

---

## 13. SDET patterns — copy-paste sketches

```java
// Tag → list of test names
Map<String, List<String>> byTag = new HashMap<>();
byTag.computeIfAbsent("smoke", t -> new ArrayList<>()).add("loginTest");

// Retry queue
Deque<String> retries = new ArrayDeque<>();
retries.offer("flakyCheckout");

// Parallel pass/fail
ConcurrentHashMap<String, String> status = new ConcurrentHashMap<>();
status.put("apiHealth", "PASS");
```

---

## 14. Common pitfalls — each fixed

| Pitfall | Bad | Fix |
| --- | --- | --- |
| CME | remove in for-each | `removeIf` |
| asList add | `Arrays.asList(...).add` | `new ArrayList<>(...)` |
| assume HashMap order | expect sorted keys | TreeMap / LinkedHashMap |
| mutable key | change fields after put | immutable key / don’t mutate |
| PQ sorted iteration | `for (x : pq)` | poll in loop |

---

## 15. Checklist

- [ ] Build a word-frequency HashMap from a sentence  
- [ ] Use ArrayDeque as stack and as queue  
- [ ] Explain ArrayList resize in one sentence  
- [ ] Fix a CME with `removeIf`  
- [ ] Sketch LRU with LinkedHashMap  
- [ ] Top-K with PriorityQueue  

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
