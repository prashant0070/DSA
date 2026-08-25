# OOP + DSA + SDET interview prep (Java)

A practice curriculum: OOP and DSA **by building structures as classes**, plus **SDET revision** (framework architecture, tools, behavioral).

**Language:** Java 17+  
**Browser notes:** [index.html](index.html) — every `NOTES.md` has a matching `NOTES.html` with diagrams (open locally).  
**Master map:** [CURRICULUM.md](CURRICULUM.md) — all tracks and status  
**Current phase:** `01-linear-structures` — **[START.md](START.md)** for today's steps  
**Easy problems:** [practice/easy/](practice/easy/README.md) — 75 stubs **you implement**  
**Medium problems:** [practice/medium/](practice/medium/README.md) — 25 interview-core stubs **you implement**  
**Advanced problems:** [practice/advanced/](practice/advanced/README.md) — 20 SDET III / Amazon-level stubs  
**Coding Q&A (FAANG):** [practice/CODING-INTERVIEW-QA.md](practice/CODING-INTERVIEW-QA.md)  
**Full coding question list:** [practice/CODING-QUESTIONS-INDEX.md](practice/CODING-QUESTIONS-INDEX.md) — every stub as an actual interview question  
**Amazon / Apple SDET III plan:** [AMAZON-APPLE-SDET3-CHECKLIST.md](AMAZON-APPLE-SDET3-CHECKLIST.md)  
**SDET revision:** [revision/](revision/README.md) — patterns, framework, tools, SQL, platform, AI

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
| 1 | `01-linear-structures` | Dynamic array, linked list, stack, queue | **Active** — [NOTES](01-linear-structures/NOTES.md) |
| 2 | `02-hashing` | Hash map and hash set from scratch | `equals`/`hashCode` contract, composition |
| 3 | `03-trees` | Binary tree, BST, traversals | Composite, `Comparable` vs `Comparator` |
| 4 | `04-heaps` | Heap / priority queue | Strategy (`Comparator`) |
| 5 | `05-graphs` | Graph interface + BFS/DFS/Dijkstra as separate types | Depend on interfaces |
| 6 | `06-sorting-searching` | Sort strategies, binary search | Strategy pattern |
| 7 | `07-recursion-backtracking` | Solvers with private recursive helpers | Encapsulate search state |
| 8 | `08-dynamic-programming` | Problem classes + cache collaborator | Composition |
| 9 | `09-advanced-structures` | Trie, Union-Find, segment tree, LRU cache | Compose simpler objects |
| 10 | `10-lld-with-dsa` | Cache, rate limiter, scheduler, file tree | SOLID applied to interview design |

Phases 2–10 unlock as you complete the previous one.

**Active:** [01-linear-structures](01-linear-structures/NOTES.md) · [START.md](START.md)

## Typical lesson (from Phase 1 onward)

- `NOTES.md` — the idea, the invariant, the complexity
- `src/` — your structure as classes (for example `Stack`, `ArrayStack`, `LinkedStack`)
- `problems/` — 2–5 problems that **import your classes**, not `java.util` replacements, until the notes say otherwise

## Easy interview questions

Easy **patterns for every common interview topic** live in `practice/easy/` (75 stubs). They are not a full interview set: medium topics (islands, backtracking, variable window, Trie, LRU, …) are listed as out of scope in that README.

See the table and compile commands in [practice/easy/README.md](practice/easy/README.md). `java.util` is allowed on this track.

## Practice rule

Prefer **your** types over the JDK collections while you are learning that structure. Using `java.util.Stack` to “solve” a stack problem skips the point of this repo.

## SDET interview revision

| Track | Folder | Status |
| --- | --- | --- |
| System design HLD/LLD/Automation | [revision/system-design/](revision/system-design/) | Done + HTML |
| Design patterns | [revision/design-patterns/](revision/design-patterns/) | Done |
| Framework architecture | [revision/framework-design/](revision/framework-design/) | Done |
| Automation tools | [revision/automation/](revision/automation/) | Done (5 tools) |
| HTTP / REST | [revision/api-http/](revision/api-http/) | Done |
| SQL | [revision/sql/](revision/sql/) | Done |
| Docker / K8s / AWS | [revision/docker-k8s-aws/](revision/docker-k8s-aws/) | Done |
| AI / GenAI SDET | [revision/ai-sdet/](revision/ai-sdet/) — expanded [INTERVIEW-QA](revision/ai-sdet/INTERVIEW-QA.md) | Done |
| Behavioral & leadership | [revision/behavioral/](revision/behavioral/) | STAR · Leadership · Company · Gaps |

## Learning modules (coding + theory)

| Module | Folder | Status |
| --- | --- | --- |
| OOP foundations | [00-oop-foundations/](00-oop-foundations/) | Done |
| OOP advanced + Q&A | [ADVANCED.md](00-oop-foundations/ADVANCED.md) | Done |
| Java fundamentals | [01-java-fundamentals/](01-java-fundamentals/) — [STRINGS](01-java-fundamentals/STRINGS.md) · [COLLECTIONS](01-java-fundamentals/COLLECTIONS.md) · [INTERVIEW-QA](01-java-fundamentals/INTERVIEW-QA.md) | Done (deep) |
| Big-O / complexity | [02-complexity/](02-complexity/) | Done |
| DSA patterns | [03-dsa-patterns/](03-dsa-patterns/) | Done |
| Medium DSA practice | [practice/medium/](practice/medium/) | 25 stubs |
| Advanced DSA (SDET III) | [practice/advanced/](practice/advanced/) | 20 stubs |
| FAANG coding Q&A | [practice/CODING-INTERVIEW-QA.md](practice/CODING-INTERVIEW-QA.md) | Done |
| Amazon/Apple SDET III plan | [AMAZON-APPLE-SDET3-CHECKLIST.md](AMAZON-APPLE-SDET3-CHECKLIST.md) | Done |
| Phases 01–10 (build HashMap, Stack, …) | [01-linear-structures/](01-linear-structures/) active · 02–10 coming | Build your own structures |

Full index: [revision/README.md](revision/README.md) · [CURRICULUM.md](CURRICULUM.md)
