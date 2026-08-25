# Big-O and complexity — full notes

**Browser version (diagrams + definitions):** [NOTES.html](NOTES.html)

**Before:** [01-java-fundamentals](../01-java-fundamentals/NOTES.md) basics  
**Next:** [03-dsa-patterns](../03-dsa-patterns/NOTES.md) — which pattern fits which problem  
**Practice:** After reading, analyze every solution you write in `practice/easy/` and `practice/medium/`.

---

## 1. Why complexity matters in interviews

Interviewers want:

1. **Can you pick a reasonable approach?** (HashMap vs nested loops)  
2. **Can you analyze what you wrote?** (Time? Space? Can it scale?)  
3. **Can you optimize when n grows?** (O(n²) → O(n log n))

SDET rounds use the same bar at Amazon, Google, Microsoft, Flipkart, Uber for coding screens.

---

## 2. Asymptotic notation (what the symbols mean)

We describe growth as input size **n → ∞**. Constants and lower-order terms are dropped.

| Notation | Meaning | Interview use |
| --- | --- | --- |
| **O(f(n))** | Upper bound — “at most ~f(n)” | **Default answer** — worst case |
| **Ω(f(n))** | Lower bound — “at least ~f(n)” | Best case (rarely asked alone) |
| **Θ(f(n))** | Tight bound — both O and Ω | “Exactly Θ(n)” when precise |

**Practical rule:** Say **“O(…)”** and mean **worst-case time** unless they ask for best/average.

Common classes (slowest → fastest for large n):

```text
O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!)
```

---

## 3. How to calculate TIME complexity

### Step 1 — Define n

What grows? Array length, number of nodes, number of edges, string length, etc.

### Step 2 — Count operations as a function of n

Focus on **loops, recursion depth, and divide size** — not every `+` or `=`.

### Step 3 — Take the dominant term

```java
for (int i = 0; i < n; i++) {      // n
    for (int j = 0; j < n; j++) {  // n
        ...
    }
}
// Time: O(n * n) = O(n²)
```

```java
for (int i = 0; i < n; i++) {      // n
    ...
}
for (int j = 0; j < n; j++) {      // n
    ...
}
// Time: O(n + n) = O(n)  — sequential, not nested
```

### Step 4 — Halving → log n

```java
while (n > 0) {
    n = n / 2;
}
// Iterations ≈ log₂(n) → O(log n)
```

Binary search on sorted array: each step halves search space → **O(log n)**.

### Step 5 — Recursion — master the templates

**Linear recursion (one call, n depth):**

```java
void dfs(Node node) {
    if (node == null) return;
    dfs(node.left);
    dfs(node.right);
}
// Visits each node once → O(n) for n nodes
```

**Branching (two calls, halving):**

```java
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
// Time: O(2ⁿ) — exponential (without memo)
```

**Merge sort pattern:** two halves + merge → **O(n log n)**.

### Step 6 — Hidden costs

| Code | Looks like | Actually |
| --- | --- | --- |
| `Arrays.sort(arr)` | O(n) loop? | **O(n log n)** |
| `list.contains(x)` on ArrayList | O(1)? | **O(n)** |
| `map.get(k)` HashMap | | **O(1)** average |
| `set.contains(x)` TreeSet | | **O(log n)** |
| `s += "a"` in loop | O(n) | **O(n²)** — strings immutable in Java |
| `sb.append("a")` | | **O(n)** total |

---

## 4. How to calculate SPACE complexity

Count **extra** memory your algorithm uses (auxiliary space). Often ignore input storage unless asked “total space.”

| Pattern | Auxiliary space |
| --- | --- |
| Few variables | **O(1)** |
| HashMap of n entries | **O(n)** |
| Recursion depth d | **O(d)** call stack |
| BFS queue (worst level width w) | **O(w)** |
| Merge sort (not in-place) | **O(n)** |
| DFS recursion on tree height h | **O(h)** |

**Example — Two Sum with HashMap:**  
Time O(n), Space O(n) for the map.

**Example — Two pointers on sorted array:**  
Time O(n), Space O(1) — only indices.

---

## 5. Best, average, worst case

| Case | When |
| --- | --- |
| **Worst** | Default for interviews — “what if bad luck?” |
| **Best** | Sorted input helps — rarely the main answer |
| **Average** | Expected over random inputs — HashMap O(1) average |

QuickSort: average O(n log n), worst O(n²) with bad pivot — mention worst if asked.

---

## 6. Worked examples (from this repo)

### MaxElement (easy)

```java
for (int x : nums) { ... }  // one pass
```
**Time O(n), Space O(1)**

### Two Sum (easy)

One pass + HashMap lookups.  
**Time O(n), Space O(n)**

### Binary search (easy)

Halve each step.  
**Time O(log n), Space O(1)**

### Valid parentheses (easy)

Each char pushed/popped once.  
**Time O(n), Space O(n)** stack worst case `"((("`  

### Merge sort (Phase 6 — future)

Divide log n levels, merge n work per level.  
**Time O(n log n), Space O(n)** typical implementation

### Number of islands (medium)

Each cell visited once → **Time O(rows × cols), Space O(rows × cols)** worst DFS stack.

---

## 7. Complexity cheat sheet by pattern

| Pattern | Typical time | Typical extra space |
| --- | --- | --- |
| Single scan | O(n) | O(1) |
| Two pointers | O(n) | O(1) |
| Prefix sum | O(n) prep, O(1) query | O(n) |
| Hash map/set | O(n) | O(n) |
| Sort then scan | O(n log n) | O(1) or O(n) |
| Binary search | O(log n) | O(1) |
| Sliding window fixed k | O(n) | O(1) or O(k) |
| Sliding window variable | O(n) | O(map size) |
| BFS/DFS graph | O(V + E) | O(V) |
| Heap top-K | O(n log k) | O(k) |
| 1D DP | O(n) | O(n) or O(1) optimized |
| 2D DP | O(n × m) | O(n × m) |

---

## 8. How to answer in an interview

1. **Brute force** — “Nested loops, O(n²), let me optimize.”  
2. **Optimized** — state approach and complexity.  
3. **Trade-off** — “O(n) time with O(n) space for the map; we could sort for O(1) space but O(n log n) time.”  
4. **Verify** — walk a tiny example.

---

## 9. Common mistakes

- Saying O(n + m) when one variable dominates — still correct, simplify if one is clearly main.  
- Ignoring sort cost when you call `Arrays.sort`.  
- Forgetting recursion stack in space.  
- Claiming HashMap is always O(1) — say **average**; worst case O(n) with collisions (rare in interviews).  
- Using `String +=` in a loop and claiming O(n).

---

## 10. Practice drill

For each problem you solve, write in a comment:

```java
// Time: O(?)
// Space: O(?)
// Why: ...
```

Start with [MaxElement](../practice/easy/src/dsa/practice/easy/MaxElement.java), [TwoSum](../practice/easy/src/dsa/practice/easy/TwoSum.java), then medium problems in [practice/medium/](../practice/medium/README.md).

---

## 11. Self-check

- [ ] Nested loop → O(n²) without hesitation  
- [ ] Halving loop → O(log n)  
- [ ] HashMap one pass → O(n) time, O(n) space  
- [ ] BFS on graph → O(V + E)  
- [ ] Explain auxiliary vs total space  

Next: [03-dsa-patterns/NOTES.md](../03-dsa-patterns/NOTES.md)
