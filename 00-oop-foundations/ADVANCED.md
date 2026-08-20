# OOP — advanced topics

**Basics:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)  
**Patterns:** [revision/design-patterns](../revision/design-patterns/NOTES.md)

---

## 1. Immutability

An **immutable** object cannot change after construction.

```java
public final class Money {
    private final int cents;
    public Money(int cents) { this.cents = cents; }
    public int cents() { return cents; }
    // no setter
}
```

**Why:** Thread-safe sharing, safe as HashMap keys, no surprise mutations.  
**Records** (Java 16+) are immutable by default for components.

**Interview:** `String` is immutable — `s += "x"` creates new objects (O(n²) in loop); use `StringBuilder`.

---

## 2. Shallow vs deep copy

**Shallow copy:** New object, but nested references point to same inner objects.  
**Deep copy:** Clone entire graph.

```java
// defensive copy on getter for mutable fields
public List<String> tags() {
    return List.copyOf(tags); // unmodifiable copy
}
```

**SDET:** Copy test data objects so parallel tests don’t mutate shared lists.

---

## 3. `Comparable` vs `Comparator`

```java
class User implements Comparable<User> {
    public int compareTo(User other) { return this.id - other.id; }
}

Comparator<User> byName = Comparator.comparing(User::name);
Arrays.sort(users, byName);
```

- **Comparable** — natural order inside the class (`TreeSet`, `sort` default).  
- **Comparator** — external, multiple sort orders (Strategy pattern).

**Heaps / trees in DSA** use both constantly.

---

## 4. Generics — bounds and wildcards

```java
class Box<T extends Number> { ... }  // T must be Number or subclass

void copy(List<? extends Number> src, List<? super Integer> dest) { ... }
```

- **`? extends T`** — read (producer): you get T out, don’t put (except null).  
- **`? super T`** — write (consumer): you put T in.

**PECS:** Producer Extends, Consumer Super.

**Interview:** `List<Object>` is **not** a supertype of `List<String>` — generics are invariant.

---

## 5. Static vs instance

| | Instance | Static |
| --- | --- | --- |
| Belongs to | One object | The class |
| Call | `obj.method()` | `Class.method()` |
| Fields | Per object | One shared — **danger in parallel tests** |

**Rule:** No static mutable `WebDriver` in test frameworks.

---

## 6. Inner classes

```java
public class Outer {
    private int x = 1;
    class Inner {
        void print() { System.out.println(x); } // holds reference to Outer
    }
}
```

**Private static nested class** — no outer reference; common for `Node` in linked structures (Phase 1).

---

## 7. Enums

```java
public enum Browser { CHROME, FIREFOX }
```

Type-safe constants; can hold methods and fields. Prefer over string `"chrome"`.

---

## 8. Optional (Java 8+)

```java
Optional<User> findUser(int id);
return findUser(1).map(User::email).orElse("unknown");
```

Avoid `Optional` as field type; use for **return values** to signal missing.

---

## 9. Lambda and functional interfaces

```java
Runnable r = () -> System.out.println("run");
Predicate<String> nonEmpty = s -> !s.isBlank();
list.removeIf(s -> s.length() == 0);
```

**Functional interface** — one abstract method (`@FunctionalInterface`).

---

## 10. Streams (know + don’t overuse in interviews)

```java
List<String> names = users.stream()
    .filter(u -> u.active())
    .map(User::name)
    .sorted()
    .toList();
```

**Interview:** Solve with loops first; mention streams for readability in production. Know `map`, `filter`, `reduce`, `collect`, `flatMap`.

---

## 11. Exception design

- **Checked** — caller must handle (`IOException`).  
- **Unchecked** — `RuntimeException` (`IllegalArgumentException`, `IllegalStateException`).

Custom:

```java
public class TestDataException extends RuntimeException {
    public TestDataException(String msg) { super(msg); }
}
```

**SDET:** Fail fast with clear messages in framework code.

---

## 12. SOLID — advanced angles

**Liskov violation example:** Subclass `Square extends Rectangle` where setWidth breaks setHeight expectation — why composition beats forced inheritance.

**Dependency inversion in tests:**

```java
interface DriverFactory { WebDriver create(); }
class LoginTest {
    private final DriverFactory factory;
    LoginTest(DriverFactory factory) { this.factory = factory; }
}
```

---

## 13. Tricky interview topics checklist

- [ ] `==` vs `equals` vs `hashCode` contract  
- [ ] Why String immutable  
- [ ] Interface vs abstract class — when which  
- [ ] Composition vs inheritance  
- [ ] Generics erasure (no `new T()` at runtime)  
- [ ] `final` on reference vs object mutability  
- [ ] Pass-by-value (Java always copies reference value)  
- [ ] Enum singleton vs double-checked locking  

See [INTERVIEW-QA.md](INTERVIEW-QA.md) for verbal answers.
