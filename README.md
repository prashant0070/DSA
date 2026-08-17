# OOP + DSA in Java

A practice curriculum: you learn object-oriented programming **by building data structures and algorithms as real classes**, not as a pile of static methods.

**Language:** Java 17+  
**Current phase:** `00-oop-foundations`

## How to use this repo

1. Open the current phase folder.
2. Read `NOTES.md`.
3. Compile and run the `src` examples.
4. Attempt the `problems` yourself, then run the reference `main` self-checks.
5. When that phase feels solid, move on. Do not skip ahead just to collect folders.

Every structure in later phases answers three questions:

1. **What is the object?** (fields, invariants, encapsulation)
2. **What is the contract?** (interface or abstract class)
3. **What can swap?** (another implementation of the same interface)

Example: `Stack<T>` is the contract; `ArrayStack` and `LinkedStack` are two implementations. Client code depends on the interface — that is polymorphism.

## Requirements

- JDK 17 or newer (`java -version`)
- A terminal. No Maven or Gradle until tests are introduced later.

## Compile and run a phase

From a phase folder (example: Phase 0):

```bash
cd 00-oop-foundations

# compile examples + problems into ./out
javac -d out src/dsa/foundations/*.java problems/dsa/foundations/problems/*.java

# run the Phase 0 demo
java -cp out dsa.foundations.Demo

# run a problem self-check
java -cp out dsa.foundations.problems.Temperature
java -cp out dsa.foundations.problems.TotalPay
java -cp out dsa.foundations.problems.PointEquals
```

On Windows PowerShell, the `javac` line is the same. Use `\` instead of `/` only if you list files by hand.

## Phase map

| Phase | Folder | You build | OOP focus |
| --- | --- | --- | --- |
| 0 | `00-oop-foundations` | Small objects: account, shapes, box | Class/object, encapsulation, inheritance vs composition, interfaces, generics, `equals`/`hashCode`, SOLID |
| 1 | `01-linear-structures` | Dynamic array, linked lists, stack, queue, deque | Inner classes, interfaces, `Iterable` |
| 2 | `02-hashing` | Hash map and hash set from scratch | `equals`/`hashCode` contract, composition |
| 3 | `03-trees` | Binary tree, BST, traversals | Composite, `Comparable` vs `Comparator` |
| 4 | `04-heaps` | Heap / priority queue | Strategy (`Comparator`) |
| 5 | `05-graphs` | Graph interface + BFS/DFS/Dijkstra as separate types | Depend on interfaces |
| 6 | `06-sorting-searching` | Sort strategies, binary search | Strategy pattern |
| 7 | `07-recursion-backtracking` | Solvers with private recursive helpers | Encapsulate search state |
| 8 | `08-dynamic-programming` | Problem classes + cache collaborator | Composition |
| 9 | `09-advanced-structures` | Trie, Union-Find, segment tree, LRU cache | Compose simpler objects |
| 10 | `10-lld-with-dsa` | Cache, rate limiter, scheduler, file tree | SOLID applied to interview design |

Phases 1–10 are added as you complete the previous one. The folders appear when that phase is unlocked.

## Typical lesson (from Phase 1 onward)

- `NOTES.md` — the idea, the invariant, the complexity
- `src/` — your structure as classes (for example `Stack`, `ArrayStack`, `LinkedStack`)
- `problems/` — 2–5 problems that **import your classes**, not `java.util` replacements, until the notes say otherwise

## Practice rule

Prefer **your** types over the JDK collections while you are learning that structure. Using `java.util.Stack` to “solve” a stack problem skips the point of this repo.
