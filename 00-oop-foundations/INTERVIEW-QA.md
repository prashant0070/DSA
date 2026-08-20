# OOP — interview Q&A

Pair with [NOTES.md](NOTES.md) and [ADVANCED.md](ADVANCED.md).

---

## Core

**Q: Explain encapsulation with a test example.**  
A: Page object exposes `login(user, pass)`; locators and waits are private. Tests don’t use raw XPath. Invariants: can’t click before page loaded.

**Q: Overloading vs overriding?**  
A: Overload: same class, different parameters, compile-time. Override: subclass, same signature, runtime dispatch. `@Override` catches typos.

**Q: Interface vs abstract class?**  
A: Interface: capability, multiple inheritance. Abstract class: shared code + family. Use interface for `Payable`, `Stack<T>` contract; abstract when shared fields/helpers (`Shape`).

**Q: Composition vs inheritance?**  
A: “Has-a” vs “is-a”. `HashSet has a HashMap`. Prefer composition for reuse. Inheritance for true subtype (Circle is Shape). Test frameworks: compose helpers, don’t extend giant BaseTest for everything.

**Q: Compile-time vs runtime polymorphism?**  
A: Overloading = compile-time. Overriding = runtime (virtual method dispatch). `Shape s = new Circle(2); s.area()` runs Circle.

---

## equals / hashCode

**Q: Rules for equals?**  
A: Reflexive, symmetric, transitive, consistent; null false. If equal, hash codes must match. Use same fields in both.

**Q: Two BankAccount objects same balance — equal?**  
A: **Identity object** — usually no (different accounts). **Value object** (Money amount) — yes if same cents.

**Q: What breaks if hashCode wrong?**  
A: HashMap/HashSet lookup fails — object “lost” in bucket. Phase 2 builds HashMap — this matters.

---

## Generics

**Q: Why generics?**  
A: Compile-time type safety, no cast, no ClassCastException at runtime.

**Q: `List<? extends Number>` — can you add Integer?**  
A: Can read as Number; adding is restricted (except null). Wildcard for API flexibility.

**Q: Erasure?**  
A: Generics removed at compile time; runtime `List<String>` is raw List. No `new T()`.

---

## Java specifics

**Q: String pool?**  
A: Literals interned; `==` may true for literals with same content; use `equals` always for user strings.

**Q: StringBuilder vs StringBuffer?**  
A: StringBuilder faster, not synchronized. StringBuffer thread-safe, slower. Use Builder in single-threaded code.

**Q: final keyword three uses?**  
A: final class (no extend), final method (no override), final field (assign once). Final reference — object inside can still mutate unless immutable.

**Q: static block vs constructor?**  
A: Static block runs once per class load; constructor per instance.

---

## SDET crossover

**Q: Thread-safe Page Object?**  
A: Page objects should be **per thread/session** — no static WebElement fields. Immutable locators (String), driver from thread-local or test fixture.

**Q: OOP in Rest Assured POJOs?**  
A: Encapsulation + Jackson/Gson serialization; builder for request bodies; immutable response DTOs where possible.

---

## Self-check

Explain without reading: interface vs abstract, equals/hashCode, Strategy vs Factory, why static driver fails parallel.

Patterns: [design-patterns INTERVIEW-QA](../revision/design-patterns/INTERVIEW-QA.md)
