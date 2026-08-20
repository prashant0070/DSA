# Phase 0 — OOP foundations

**Prev:** [00-oop-foundations](../00-oop-foundations/NOTES.md)  
**Next:** [01-linear-structures](../01-linear-structures/NOTES.md) — **you are here** · [START.md](../START.md)

This phase is almost no DSA. You are learning the Java object model that every later structure will use. Read this, run `Demo`, then try the three problems.

**How to study the code:** every `src` file starts with a `LEARN:` comment. Open the file, read that block, then read the line comments. Hover or search the keyword table below when something is new.

Compile and run (from this folder):

```bash
javac -d out src/dsa/foundations/*.java problems/dsa/foundations/problems/*.java
java -cp out dsa.foundations.Demo
```

---

## 1. Class and object

A **class** is the blueprint. An **object** is one instance in memory.

```java
BankAccount a = new BankAccount("Ada");  // constructor builds the object
BankAccount b = new BankAccount("Bob");  // a second, separate object
```

- Fields hold **state**.
- Methods are **behavior**.
- `this` is the current object (used when a parameter shadows a field).
- A constructor’s job is to leave the object in a **valid** state.

`Counter` in `src` is the smallest useful structure: one private number, operations that change it, an invariant (`0 <= value <= max`).

---

## 2. Encapsulation (private + invariants)

**Encapsulation** means the object owns its data. Callers use methods; they do not poke fields.

```java
private int balanceCents;   // not public
public int balanceCents() { return balanceCents; }
```

An **invariant** is a rule that must stay true after every public method:

- `BankAccount`: balance never negative; deposits and withdrawals must be positive.
- `Counter`: value stays in `[0, max]`.
- `Temperature` (problem): you never store a temperature below absolute zero.

If a caller could set `balanceCents = -50` directly, the object would be lying. That is why fields stay `private`.

Getters are fine. Setters are not automatic: only add a setter if changing that field is a legal operation.

---

## 3. Inheritance vs composition

**Inheritance (`extends`)** = *is-a*. Use it when the subtype really is the parent type.

- `Circle` *is a* `Shape`.
- A `LinkedStack` *is a* `Stack` only if `Stack` is a type you can substitute (usually an interface — see below).

**Composition (`has-a`)** = the object *holds* another object and delegates.

- A `HashSet` *has a* `HashMap` (Phase 2).
- An LRU cache *has a* map and *has a* linked list (Phase 9).

Default to composition. Inheritance couples you to the parent’s internals and makes future change harder. The Liskov rule (below) is the test: if you cannot use the child everywhere the parent is expected, do not inherit.

---

## 4. Abstract class vs interface

| | Abstract class | Interface |
| --- | --- | --- |
| Keyword | `abstract class` | `interface` |
| Fields | Can have state | Constants / (rarely) defaults |
| Inheritance | A class `extends` **one** class | A class `implements` **many** interfaces |
| Use when | Shared code + a family of types (`Shape`) | A **capability** (`Payable`, later `Stack<T>`) |

`Shape` is abstract: every shape has `area()` and `perimeter()`, but there is no generic “shape drawing” without a concrete kind.

`Payable` is an interface: anything that can produce a payment amount — an invoice, a salaried worker — without sharing a parent class.

**Overloading** = same method name, different parameter lists, decided at compile time (`deposit(int)` vs `deposit(int, String)`).  
**Overriding** = same signature in a subclass, decided at runtime (`Circle.area()` vs `Rectangle.area()`).

---

## 5. Polymorphism

Polymorphism means **one variable type, many runtime types**.

```java
Shape s = new Circle(3);   // compile-time type Shape, runtime type Circle
s.area();                  // Circle.area() runs
```

The client depends on `Shape` (or `Payable`). You can later add `Triangle` without changing the loop that sums areas.

This is the same idea as Phase 1:

```java
Stack<Integer> stack = new ArrayStack<>();
// later:
stack = new LinkedStack<>();
```

Same calls (`push`, `pop`). Different internals.

---

## 6. Generics

`Box<T>` is a container that the compiler types for you.

```java
Box<String> names = new Box<>();
names.set("Ada");
String n = names.get();   // no cast
```

Without generics you would store `Object` and cast, which fails at runtime. `T` is a **type parameter**. Later, `DynamicArray<T>` and `HashMap<K,V>` are the same idea.

Bounds (you will need these in trees and heaps):

```java
class BinarySearchTree<T extends Comparable<T>> { ... }
```

That says “`T` must be comparable to itself,” so `insert` can call `compareTo`.

---

## 7. `equals` and `hashCode`

`==` compares **references** (same object in memory).  
`equals` compares **value**, if you define it.

Rules if you override `equals`:

1. Reflexive, symmetric, transitive, consistent; `equals(null)` is `false`.
2. **If `a.equals(b)` then `a.hashCode() == b.hashCode()`.**
3. Override both together. Use the same fields in both.

Value objects (a `Point`, money in cents, a map key) should implement both. Identity objects (a live `BankAccount` that mutates) usually should **not** — two accounts with the same balance are still different accounts.

Phase 2 (hash map) will break in confusing ways if this contract is wrong. Practice it now in `PointEquals`.

Java 16+ `record` types generate `equals`/`hashCode`/`toString` from their components. Use a record when the type *is* its data (`Invoice` is a record in `src`).

---

## 8. SOLID (one page)

- **S — Single responsibility.** `BankAccount` stores money and enforces invariants. It does not print PDF statements.
- **O — Open/closed.** Add a new `Shape` by adding a class, not by editing a giant `switch` inside `Shape`.
- **L — Liskov substitution.** A `Circle` must be safe to use wherever a `Shape` is expected. Do not override `area()` to throw “not supported.”
- **I — Interface segregation.** `Payable` is one method. Do not invent `Worker` with `pay()`, `punchClock()`, `fileTax()` that invoices cannot implement.
- **D — Dependency inversion.** Depend on abstractions (`Shape`, `Payable`, later `Stack<T>`), not on a single concrete class. `Demo` already does this: it sums `Payable[]`, not `Invoice[]`.

You do not need the other classic patterns (Factory, Singleton, Observer) in Phase 0. Strategy and Iterator show up when stacks, sorts, and trees need them.

---

## 9. Java words you will see in this folder

| Word | Meaning |
| --- | --- |
| `class` | Blueprint for objects |
| `new` | Create one object from the blueprint |
| `this` | The current object (this account, this circle) |
| `private` | Only this class can use the field/method |
| `public` | Anyone can call it |
| `final` (class) | Nobody can `extend` it |
| `final` (field) | Assigned once, never reassigned |
| `static` | Belongs to the class, not one object (`main`, factories, helpers) |
| `abstract` | Incomplete type; subclasses fill in the methods |
| `interface` | A list of methods a class promises to implement |
| `extends` | Is-a (one parent class) |
| `implements` | Has-capability (many interfaces allowed) |
| `@Override` | Replaces a parent/interface method; compiler checks the name |
| `record` | Short value type; Java writes `equals` / `hashCode` for you |
| `throw` | Abort this call with an error object |
| `package` | Folder namespace (`dsa.foundations`) so names do not clash |

**Exception pair used here**

- `IllegalArgumentException` — the caller passed a bad value (negative deposit).
- `IllegalStateException` — the object is fine, but this action is not allowed right now (withdraw more than the balance).

---

## 10. Walk the code (open these in order)

| File | What to notice |
| --- | --- |
| `src/.../BankAccount.java` | `private` fields, `this`, constructor validation, no public setter for balance |
| `src/.../Counter.java` | Same pattern, even smaller — a structure is just state + rules |
| `src/.../Shape.java` | `abstract`; you cannot `new Shape()` |
| `src/.../Circle.java` and `Rectangle.java` | `extends` + `@Override` — two formulas, one type |
| `src/.../Payable.java` | Interface: one method, no body |
| `src/.../Invoice.java` | `record` + `implements Payable` |
| `src/.../Box.java` | `<T>` — type chosen by the caller |
| `src/.../Demo.java` | Run this; each method is a live example of the rows above |
| `problems/.../Temperature.java` | One internal field; convert on the way in/out |
| `problems/.../TotalPay.java` | Loop over `Payable[]`, not `Invoice[]` |
| `problems/.../PointEquals.java` | `==` vs `equals`; hashCode uses the same fields |

---

## How to practice this phase

1. Run `dsa.foundations.Demo` and read each class it uses.
2. Cover the `src` files and recopy `BankAccount` from memory — constructor, private field, rejected operations.
3. Solve the three problems **without** opening the reference first. Each file’s top comment is the spec; `main` is the grader.
4. Compare your code to the reference. Then run:

```bash
java -cp out dsa.foundations.problems.Temperature
java -cp out dsa.foundations.problems.TotalPay
java -cp out dsa.foundations.problems.PointEquals
```

All three should print `All checks passed.`

When that is easy, say so and we start Phase 1: arrays, linked lists, stacks, and queues as classes.
