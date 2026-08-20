# Start here — Day 1

**Current phase:** [01-linear-structures](01-linear-structures/NOTES.md)

You said **start** — follow this order today.

---

## Step 1 (30 min) — Phase 0 check

If not done yet:

```bash
cd 00-oop-foundations
javac -d out src/dsa/foundations/*.java problems/dsa/foundations/problems/*.java
java -cp out dsa.foundations.Demo
```

Skim [00-oop-foundations/NOTES.md](00-oop-foundations/NOTES.md) sections 1–5.

---

## Step 2 (20 min) — Complexity

Read [02-complexity/NOTES.md](02-complexity/NOTES.md) sections 1–4.  
You need this before grading your own solutions.

---

## Step 3 (45 min) — Phase 1 structures

```bash
cd 01-linear-structures
javac -d out src/dsa/linear/*.java problems/dsa/linear/problems/*.java
java -cp out dsa.linear.Demo
```

Read in order: `Stack.java` → `ArrayStack` → `LinkedStack` → `ArrayQueue` → `SinglyLinkedList`.

Open [01-linear-structures/NOTES.md](01-linear-structures/NOTES.md).

---

## Step 4 (60 min) — Your first implementations

### A. Easy warm-up (open in IDE)

[BestTimeToBuySellStock.java](practice/easy/src/dsa/practice/easy/BestTimeToBuySellStock.java) — running minimum, O(n).

```bash
cd practice/easy
javac -d out src/dsa/practice/easy/*.java
java -cp out dsa.practice.easy.BestTimeToBuySellStock
```

Implement `maxProfit` until `All checks passed.`

### B. Phase 1 problem 1

Implement [ValidParenthesesWithStack.java](01-linear-structures/problems/dsa/linear/problems/ValidParenthesesWithStack.java) using **`dsa.linear.ArrayStack`**.

---

## Step 5 (optional today)

- Phase 1 problem 2: `reverseInPlace()` in `SinglyLinkedList.java`  
- Phase 1 problem 3: `QueueWithTwoStacks.java`  

---

## This week

| Day | Target |
| --- | --- |
| 1 | Phase 1 Demo + ValidParenthesesWithStack + BestTimeToBuySellStock |
| 2 | Reverse list + easy #1–#5 |
| 3 | QueueWithTwoStacks + easy #6–#14 |
| 4 | Read [03-dsa-patterns](03-dsa-patterns/NOTES.md) + easy #15–#25 |
| 5 | [revision/framework-design](revision/framework-design/NOTES.md) §1–2 aloud |

Full map: [CURRICULUM.md](CURRICULUM.md)
