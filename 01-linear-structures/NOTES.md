# Phase 1 — Linear structures

**Browser version (diagrams + definitions):** [NOTES.html](NOTES.html)

**Prev:** [00-oop-foundations](../00-oop-foundations/NOTES.md)  
**Next:** Phase 2 — hashing (after you finish the problems here)

You now **build** the structures interviews ask about — as Java classes with interfaces, not static utility methods.

Compile and run (from this folder):

```bash
javac -d out src/dsa/linear/*.java problems/dsa/linear/problems/*.java
java -cp out dsa.linear.Demo
java -cp out dsa.linear.problems.ValidParenthesesWithStack
```

Read every `LEARN:` block in `src/`. Complexity reference: [02-complexity](../02-complexity/NOTES.md).

---

## 1. Why interfaces here?

Same idea as Phase 0 `Payable` and future `Stack` in interviews:

```java
Stack<Integer> stack = new ArrayStack<>();
// later swap:
stack = new LinkedStack<>();
```

Client code calls `push` / `pop` — **polymorphism**. Internals differ; contract stays the same.

Three questions for every structure:

1. **What is the object?** (fields, invariants)
2. **What is the contract?** (`Stack<T>`, `Queue<T>`)
3. **What can swap?** (`ArrayStack` vs `LinkedStack`)

---

## 2. Dynamic array (`DynamicArray`)

**Invariant:** `0 <= size <= backing.length`; elements live in `[0, size)`.

| Operation | Amortized | Notes |
| --- | --- | --- |
| `get(i)` | O(1) | Bounds check |
| `set(i, x)` | O(1) | |
| `addEnd(x)` | O(1)* | Double capacity when full |
| `removeEnd()` | O(1) | |

\* Amortized O(1) because resizing copies all elements occasionally — O(n) resize, but rare → **amortized** O(1) per add.

**vs `ArrayList`:** Same idea. You are learning *why* `ArrayList` behaves as it does.

---

## 3. Singly linked list

**Invariant:** `head` is first node or null; each node’s `next` points to rest or null.

| Operation | Time |
| --- | --- |
| `addFirst` | O(1) |
| `removeFirst` | O(1) |
| `contains` | O(n) |
| Index `get(i)` | O(n) |

**Private inner class `Node`:** nodes are implementation detail — callers use list methods only.

**`Iterable<T>`:** enables enhanced for-loop — iterator pattern (Phase 1 OOP win).

---

## 4. Stack (LIFO)

**Interface:** `push`, `pop`, `peek`, `isEmpty`, `size`.

| Implementation | push | pop | Notes |
| --- | --- | --- | --- |
| `ArrayStack` | O(1)* | O(1) | Dynamic array at end |
| `LinkedStack` | O(1) | O(1) | Push at head |

Use for: parentheses, DFS iterative, undo, monotonic stack problems.

**Do not use `java.util.Stack`** in this phase’s problems — use **your** `dsa.linear.Stack`.

---

## 5. Queue (FIFO)

**Interface:** `offer` (enqueue), `poll` (dequeue), `peek`, `isEmpty`, `size`.

| Implementation | offer | poll |
| --- | --- | --- |
| `ArrayQueue` | O(1)* | O(1) | Circular buffer — head/tail indices |
| `LinkedQueue` | O(1) | O(1) | Tail pointer |

**Circular array trick:** when tail reaches end, wrap to 0; avoid shifting all elements.

Use for: BFS, sliding window (some variants), task scheduling.

---

## 6. Complexity summary

| Structure | Access | Insert end | Insert front | Remove front |
| --- | --- | --- | --- | --- |
| Dynamic array | O(1) | O(1)* | O(n) | O(n) |
| Linked list | O(n) | O(n) | O(1) | O(1) |
| Stack | — | push O(1) | — | pop O(1) |
| Queue | — | offer O(1) | — | poll O(1) |

---

## 7. Walk the code (order)

| File | Focus |
| --- | --- |
| `DynamicArray.java` | resize, size vs capacity |
| `SinglyLinkedList.java` | inner Node, Iterable |
| `Stack.java` | interface contract |
| `ArrayStack.java` / `LinkedStack.java` | two implementations |
| `Queue.java` | interface |
| `ArrayQueue.java` | circular indices |
| `LinkedQueue.java` | head + tail |
| `Demo.java` | run everything |
| Problems | use **your** types |

---

## 8. Practice problems (you implement)

| Problem | Uses | Pattern |
| --- | --- | --- |
| `ValidParenthesesWithStack` | `Stack<Character>` | Matching brackets |
| `ReverseLinkedListInPlace` | `SinglyLinkedList` | Three pointers |
| `QueueWithTwoStacks` | `Stack` × 2 | Classic design |

Run each until `All checks passed.`

When done, move to [practice/easy](../practice/easy/README.md) `#14 ValidParentheses` and compare with your Phase 1 stack — then continue easy list from `#1` if you haven’t.

---

## 9. Interview one-liners

- **Array vs linked list?** — array: cache-friendly O(1) index; linked: O(1) front insert, no resize copy.  
- **Stack vs queue?** — LIFO vs FIFO.  
- **Why circular queue?** — O(1) poll without shifting.  
- **When `LinkedStack` over `ArrayStack`?** — No resize spikes; nodes overhead; stack size unknown huge.

Next phase builds `HashMap` — keys need `equals`/`hashCode` from Phase 0.
