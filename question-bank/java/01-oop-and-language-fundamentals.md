# OOP & Java Language Fundamentals

This file is the Java-track opener for SDET II–III interviews: the language questions that come before Selenium, Rest Assured, or TestNG. Interviewers use these to check whether you can design a framework, not just write page objects. Answers are calibrated for Java 17/21. Tie every concept to DriverFactory, BasePage, locators, and test data when that makes the answer stronger.

- Q1. Interface vs abstract class
- Q2. OOP principles with real-world and automation examples (SOLID preview)
- Q3. Static binding vs dynamic binding; overload vs override
- Q4. `final` vs `finally` vs `finalize()`
- Q5. `static` — fields, methods, blocks, nested classes; why static WebDriver is dangerous
- Q6. `this` vs `super`; constructor chaining
- Q7. Access modifiers and package design in a framework
- Q8. Composition vs inheritance — component objects vs deep BasePage hierarchies
- Q9. `equals()` / `hashCode()` contract; `==` vs `equals`; String intern pool; mutable keys
- Q10. Immutability: why String is immutable; immutable test-data classes
- Q11. Wrapper classes, autoboxing, NPE from unboxing
- Q12. `var` (local type inference)
- Q13. Records (Java 16+) for API POJOs
- Q14. Enums for env/browser; enum with fields
- Q15. `Object` methods you should know
- Q16. Stack vs heap; Java is pass-by-value

### Q1. Interface vs abstract class — complete: multiple inheritance of type, default methods, when each, real SDET example

**Interview answer** — An interface is a capability contract: a type can implement many of them, so it is how Java gets multiple inheritance of type. An abstract class is a partial implementation for a family of classes that share state and protected helpers; a class can extend only one. Since Java 8, interfaces can have `default` and `static` methods, so the old "interfaces can't have code" line is wrong — but they still cannot hold instance fields. In a framework I use an interface for `DriverFactory` (Chrome, Firefox, remote all produce a `WebDriver`) and an abstract class for `BasePage` (shared `WebDriver`, wait helper, common navigation) because pages are a family with shared state.

**Deep dive** — Multiple inheritance of *implementation* is banned for classes to avoid the diamond problem for fields. Interfaces sidestep that for type: `class LoginPage extends BasePage implements Waitable, Screenshotable`. If two interfaces provide the same default method, the implementing class must override and pick (or call `InterfaceName.super.method()`). Abstract classes can have constructors, instance fields, and non-public members; that is why `BasePage` is an abstract class — every page needs a driver reference and a `WebDriverWait`. Interfaces cannot be instantiated and cannot keep per-instance mutable state. A functional interface (single abstract method) is additionally a target for lambdas — `ExpectedCondition<T>` is the Selenium example.

Default methods were added so library authors could evolve APIs without breaking implementors (`List.sort` is the JDK case). In a test framework, a default method on `DriverFactory` such as `default WebDriver createHeadless()` is convenient, but if every implementation needs different fields (capabilities, grid URL), an abstract class or a composition-based factory is cleaner. Prefer interface when you need a seam for mocking (`WaitUtils` as interface so tests can inject a fake wait). Prefer abstract class when subclasses share protected fields and a constructor invariant ("driver must be non-null").

**Code**

```java
public interface DriverFactory {
    WebDriver create(Browser browser, Capabilities caps);

    default WebDriver createHeadless(Browser browser) {
        return create(browser, new ChromeOptions().addArguments("--headless=new"));
    }
}

public final class LocalDriverFactory implements DriverFactory {
    @Override
    public WebDriver create(Browser browser, Capabilities caps) {
        return switch (browser) {          // Java 21 switch expression
            case CHROME  -> new ChromeDriver((ChromeOptions) caps);
            case FIREFOX -> new FirefoxDriver((FirefoxOptions) caps);
            case EDGE    -> new EdgeDriver((EdgeOptions) caps);
        };
    }
}

public abstract class BasePage {
    protected final WebDriver driver;
    protected final WebDriverWait wait;

    protected BasePage(WebDriver driver) {
        this.driver = Objects.requireNonNull(driver);
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    protected WebElement find(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }
}

public class LoginPage extends BasePage {
    private static final By USER = By.id("username");
    public LoginPage(WebDriver driver) { super(driver); }
    public void login(String user, String pass) { find(USER).sendKeys(user); /* ... */ }
}
```

**Follow-ups & traps**

- Trap: "interfaces cannot have methods with bodies" — false since Java 8 (`default`/`static`); Java 9 added private methods in interfaces.
- "Can an abstract class implement an interface?" — Yes; it may leave interface methods abstract for subclasses.
- "Why not make BasePage an interface with default methods?" — No instance `driver` field; every method would need the driver passed in, which is noisier than a constructor-held field.
- Follow-up: abstract class with zero abstract methods is legal; it exists to block `new BasePage()` and share code.
- Diamond default methods: compiler error until the class overrides.

**Senior/lead angle** — Treat `DriverFactory` as the stable published contract and keep Selenium types behind it so you can swap local Chrome for Selenium Grid or Playwright-Java later without rewriting tests. `BasePage` should stay thin; the moment it grows a kitchen-sink of utilities, split by composition (see Q8).

**One-liner** — Interfaces for capabilities and multiple type inheritance (`DriverFactory`); abstract classes for shared state in a family (`BasePage`); default methods evolve APIs, they do not replace instance fields.

### Q2. OOP principles with REAL-WORLD + automation examples (encapsulation, inheritance, polymorphism, abstraction; SOLID preview)

**Interview answer** — Encapsulation hides internals behind a stable API — a bank account doesn't expose its ledger, and a page object doesn't expose locators. Inheritance reuses a family relationship (`SavingsAccount extends Account`, `LoginPage extends BasePage`) but is the most expensive form of reuse. Polymorphism lets you program to a type (`PaymentMethod pay`, `WebDriver driver = new ChromeDriver()`) so callers don't switch on concrete classes. Abstraction extracts the "what" (`WaitUtils.untilClickable`) from the "how" (FluentWait polling). SOLID is how you keep those four from rotting a framework at scale.

**Deep dive** — Real world: a coffee machine encapsulates boiler pressure; you press brew. A savings account *is-a* account (inheritance) but a customer *has-a* address (composition). ATMs treat debit and credit cards polymorphically as `Card`. The waiting-line ticket system abstracts "next customer" from whether the backend is a queue or a display.

Automation mapping that interviewers expect:

- **Encapsulation:** locators are `private static final By` (or a private record of locators). Tests call `loginPage.login(user, pass)`, never `driver.findElement(By.id("username"))`. Changing an id is one edit.
- **Inheritance:** `BasePage` holds driver + wait. Cost: every page is coupled to BasePage's constructor and lifecycle; a change to wait timeout hits the whole suite; diamond pain if you also extend `BaseTest`.
- **Polymorphism:** `WebDriver driver = new ChromeDriver()` — tests use the interface; Grid, Chrome, Firefox are substitutable. Rest Assured `RequestSpecification` is the same idea.
- **Abstraction:** `WaitUtils` hides polling, ignore-list, and timeout. Tests say "wait until cart count is 3."

SOLID preview (say these names, then one sentence each):

- **S**ingle Responsibility — `LoginPage` logs in; it does not write Allure steps and parse JSON.
- **O**pen/Closed — add `EdgeDriverFactory` without editing a giant `if (browser)` in tests; closed for modification, open for extension.
- **L**iskov — a `RemoteWebDriver` must honor `WebDriver` contracts; a "fake" driver that no-ops `quit()` will leak sessions in CI.
- **I**nterface Segregation — `Waits` vs `JsExecutor` vs `CookieStore` rather than one 40-method `DriverUtils`.
- **D**ependency Inversion — pages depend on `WebDriver`, not `ChromeDriver`; config depends on an `Env` abstraction, not `System.getProperty` sprinkled everywhere.

**Code**

```java
public class LoginPage {                          // encapsulation
    private static final By USER = By.id("user");
    private static final By PASS = By.id("pass");
    private final WebDriver driver;
    public LoginPage(WebDriver driver) { this.driver = driver; }
    public HomePage login(String user, String pass) { /* uses USER/PASS */ return new HomePage(driver); }
}

WaitUtils.clickable(driver, By.id("checkout"));   // abstraction

WebDriver driver = new ChromeDriver();            // polymorphism (see Q3)
```

**Follow-ups & traps**

- Trap: listing the four pillars without an example — interviewers treat that as memorization.
- "Is inheritance encapsulation?" — No. Inheritance often *breaks* encapsulation by exposing `protected` internals to subclasses.
- Follow-up: "Where did you violate SOLID in a real framework?" — Have a story: god `BaseTest`, or locators in tests.
- Weak SOLID: reciting the acronym and stalling on Liskov.

**Senior/lead angle** — At SDET III you are graded on whether page objects, factories, and waits have clear ownership. Encapsulation of locators is the blast-radius control that keeps a 2,000-test suite mergeable.

**One-liner** — Hide locators, inherit only true page-family behavior, program to `WebDriver`/`DriverFactory`, abstract waits — then use SOLID to stop BasePage and BaseTest from becoming god objects.

### Q3. Static binding vs dynamic binding / compile-time vs runtime polymorphism. Overload vs override. Practical examples (`WebDriver driver = new ChromeDriver()`)

**Interview answer** — Overloading is compile-time (static) polymorphism: the compiler picks the method by the *declared* argument types. Overriding is runtime (dynamic) polymorphism: the JVM picks the implementation from the *actual* object's class via invokevirtual / invokeinterface. `WebDriver driver = new ChromeDriver(); driver.get(url)` is dynamic dispatch — the compile-time type is `WebDriver`, the runtime type is `ChromeDriver`. `driver.quit()` cannot be resolved to a `ChromeDriver`-only method without a cast, because the compiler only sees `WebDriver`.

**Deep dive** — Bytecode: overloaded calls are `invokestatic` / `invokespecial` / `invokevirtual` with a descriptor baked in at compile time — changing an overload's parameter type is a source-incompatible change. Overridden instance methods use a vtable (or interface itable): each class has a table of method pointers; the call looks up the runtime class. `private`, `static`, and `final` methods are statically bound — they cannot be overridden (`static` is hidden, not overridden). Constructors are always `invokespecial` (static bind).

The classic overload trap: `log(Object)` vs `log(String)` — `log(null)` picks the most specific applicable method (`String`) at compile time. Autoboxing and varargs make overload resolution surprising (`log(int)` vs `log(Integer)` vs `log(int...)`).

In Selenium, `ChromeDriver` overrides `get(String)` from `RemoteWebDriver`/`WebDriver`. Calling through a `WebDriver` reference still hits Chrome's implementation. Extra methods like `ChromeDriver.getLocalStorage()` are not on the interface — that is why we rarely downcast in tests.

**Code**

```java
WebDriver driver = new ChromeDriver();  // declared WebDriver, runtime ChromeDriver
driver.get("https://qa.example.com");   // dynamic bind → ChromeDriver.get
driver.quit();                          // dynamic bind → ChromeDriver.quit

// Overload = static bind (declared types)
assertThat(response.statusCode()).isEqualTo(200);          // isEqualTo(int)
assertThat(response.body().asString()).isEqualTo("ok");    // isEqualTo(String)

public class WaitUtils {
    public static WebElement visible(WebDriver d, By by) { /* ... */ }
    public static List<WebElement> visible(WebDriver d, List<By> locators) { /* overload */ }
}

@Override public void click() { /* override of a BasePage or WebElement wrapper */ }
```

**Follow-ups & traps**

- Trap: "Java always uses runtime polymorphism" — not for static/private/final/overloads.
- "`static` methods can be overridden" — they can be *hidden*. `Parent.foo()` vs `Child.foo()` is resolved by the reference type.
- Follow-up: covariant return types — an override may return a subtype (`ChromeDriver getDriver()` overriding `WebDriver getDriver()`).
- `@Override` is not required but a senior candidate uses it so a signature mismatch is a compile error, not a silent overload.

**Senior/lead angle** — Framework APIs should avoid overload sets that differ only by autoboxed types (`wait(int seconds)` vs `wait(Integer seconds)`). Prefer `Duration` (Java 8+) as a single parameter.

**One-liner** — Overload is picked by the compiler from declared types; override is picked by the JVM from the live object — `WebDriver driver = new ChromeDriver()` is the textbook dynamic bind.

### Q4. `final` vs `finally` vs `finalize()` — finalize is deprecated/removed for a reason; never use it

**Interview answer** — `final` is a language modifier: a final class cannot be subclassed, a final method cannot be overridden, a final variable is assigned once. `finally` is a try-block clause that runs on both success and exception paths, which is why we used it to `driver.quit()` before try-with-resources. `finalize()` was an `Object` method the GC called before reclaiming an object; it is deprecated (Java 9) and deprecated for removal (Java 18+). It is unreliable, runs on a GC thread, and can resurrect objects. Never use it — use try-with-resources, `Cleaner`, or an explicit `quit()` in a TestNG `@AfterMethod`.

**Deep dive** — `final` fields have a Java Memory Model freeze: after the constructor completes, other threads seeing the object are guaranteed to see the initialized final fields (safe publication). That is why immutable objects need `final` fields. A final *reference* can still point to a mutable object (`final List<String> locators` — you can still `add`). `finally` still runs after `return` in `try`; a `return` in `finally` swallows the original exception — a notorious bug. `finally` does **not** run on `System.exit`, JVM crash, or if the thread is `stop()`'d (already dead API).

`finalize()` was never a destructor. The finalizer thread can starve; an object with a non-trivial `finalize` takes at least two GC cycles; and a thrown exception from `finalize` is swallowed. Java 21 still *has* the method (so "removed" is slightly ahead of the JDK, but "never use it" is the only correct engineering answer). Replacement: `java.lang.ref.Cleaner` (Java 9) for native resource recovery, or — in tests — deterministic teardown.

`final` methods in `BasePage` (`find`, `click`) prevent a subclass from breaking wait semantics. `final` class on `DriverManager` prevents "clever" subclasses that skip `remove()`. Interviewers also ask: can you change a `final` array's *elements*? Yes. Can you reassign the array? No. Same trap as `final List`.

**Code**

```java
public final class DriverManager {          // final class: no subclassing
    private final ThreadLocal<WebDriver> tl = new ThreadLocal<>(); // final reference

    public void tearDown() {
        WebDriver driver = tl.get();
        try {
            if (driver != null) driver.quit();
        } finally {
            tl.remove();                    // must run even if quit() throws
        }
    }
}

// NEVER:
@Override protected void finalize() { driver.quit(); }  // deprecated, unreliable
```

**Follow-ups & traps**

- Trap: "finally always runs" — not on `System.exit` / crash.
- Trap: using `finalize` to quit WebDriver — sessions leak until a non-deterministic GC, Grid slots exhaust.
- `final` parameters exist; they stop reassignment, not mutation of the object.
- Java 21: `finalize` still compiles with a deprecation warning; treat it as forbidden in review.
- `Cleaner.register` vs quit in AfterMethod: tests must be deterministic; Cleaner is a safety net for native libs, not for Chrome sessions.

**One-liner** — `final` means assign-once / no-override / no-subclass; `finally` is guaranteed cleanup on the normal exception path; `finalize()` is a deprecated GC hook you must never use for drivers or files.

### Q5. `static` keyword: fields, methods, blocks, nested classes. Why static WebDriver is dangerous

**Interview answer** — `static` belongs to the class, not an instance: one field per Class object, methods that cannot touch instance state, a static initializer that runs once at class init, and static nested classes that do not hold an implicit outer-`this`. A `static WebDriver` is shared by every test on every thread in that JVM. Under TestNG/JUnit parallel, two tests overwrite the same reference — test A quits test B's browser, screenshots capture the wrong session, Rest Assured `RequestSpecification` filters leak tokens across tests. Use `ThreadLocal<WebDriver>` or instance fields created in `@BeforeMethod`.

**Deep dive** — Class initialization is synchronized by the JVM; static initializers (`static { }`) and static field initializers run once, in textual order, on first active use. A failure there is `ExceptionInInitializerError` wrapping the cause — the class is then unusable. Static methods are statically bound (Q3). A static nested class is a namespacing convenience (`DriverManager.Holder`); an *inner* class (non-static) silently holds the outer instance, which is a leak if you pass a listener/anonymous inner class that outlives the page.

Static is correct for: constants (`private static final By LOGIN = By.id("login")` — locators are immutable data), pure functions (`WaitUtils.clickable`), and factories with no thread state. Static is wrong for: WebDriver, `RestAssured.baseURI` mutated per test, Faker instances with seeds you expected to be per-test, and mutable config loaded then overwritten.

**Code**

```java
public final class Locators {
    private Locators() {}
    public static final By CHECKOUT = By.id("checkout");  // OK: immutable
}

public final class BadDriver {
    public static WebDriver driver;                       // DANGER under parallel
}

// Class init
public final class Env {
    public static final String BASE_URL;
    static {
        BASE_URL = Objects.requireNonNull(System.getenv("BASE_URL"), "BASE_URL required");
    }
}

public class Reports {                 // static nested vs inner
    public static final class Row { }  // no outer this
    public class Listener { }          // holds Reports.this — leak risk
}
```

**Follow-ups & traps**

- Trap: "static means thread-safe" — the opposite: shared mutable static is the default race.
- `RestAssured.baseURI` / `RestAssured.requestSpecification` are static; in parallel API tests prefer a per-thread `RequestSpecification` instance.
- Static import of locators is fine; static import of a mutable factory is not.
- Follow-up: class-init deadlock if two classes' static blocks reference each other.

**Senior/lead angle** — Ban `static WebDriver` in the framework checklist. Code-review for `static` mutable fields the same way you review ThreadLocal leaks. Constants and pure helpers are the allowed static surface.

**One-liner** — `static` is per-class shared state: perfect for immutable locators and utilities, fatal for WebDriver and tokens the moment the suite goes parallel.

### Q6. `this` vs `super`; constructor chaining

**Interview answer** — `this` is the current instance: `this.driver = driver` disambiguates fields, `this()` chains to another constructor in the same class. `super` is the parent: `super(driver)` calls a parent constructor, `super.click()` calls the parent method you overrode. Constructor chaining rule: `this(...)` or `super(...)` must be the first statement (Java 21 still; Java 22+ has some flexibility with statements before `super`, but interviews expect the classic rule). If you write no constructor call, the compiler inserts `super()`. If the parent has no no-arg constructor, you must call `super(...)` explicitly — this is why `LoginPage` must `super(driver)` into `BasePage`.

**Deep dive** — Construction order: memory allocated, fields defaulted (0/null/false), superclass constructor completes, instance initializers and field initializers of this class run in order, then the constructor body. Calling an overridable method from a constructor is a bug: the subclass fields are not initialized yet, so `BasePage()` calling `open()` which LoginPage overrides can NPE. Static init of the class already happened earlier.

`this` in a lambda is the enclosing class, not a "lambda instance." In an anonymous inner class, `this` is the inner instance; `Outer.this` reaches the page. `super.clone()` / `super.equals()` are the usual calls when you override Object methods and want the parent contribution.

**Code**

```java
public abstract class BasePage {
    protected final WebDriver driver;
    protected BasePage(WebDriver driver) {
        this.driver = Objects.requireNonNull(driver, "driver");
    }
    protected BasePage(WebDriver driver, Duration timeout) {
        this(driver);                 // this() chaining — must be first
        this.wait = new WebDriverWait(driver, timeout);
    }
}

public class LoginPage extends BasePage {
    public LoginPage(WebDriver driver) {
        super(driver);                // super() chaining — must be first
    }
    public LoginPage(WebDriver driver, Duration timeout) {
        super(driver, timeout);
    }
}
```

**Follow-ups & traps**

- Trap: using both `this()` and `super()` in one constructor — illegal.
- Trap: overridable calls in constructors — flaky page-object NPEs at `new LoginPage(driver)`.
- Follow-up: "What if BasePage has only `BasePage(WebDriver)`?" — every subclass must `super(driver)`; there is no implicit default.
- Java 25 / JEP 447 flexible constructors may appear as trivia; for 17/21 stay with "first statement."

**One-liner** — `this` is me, `super` is my parent; `this()`/`super()` chain constructors and must be first — `LoginPage` always `super(driver)` into `BasePage`.

### Q7. Access modifiers and package design in a framework

**Interview answer** — Java has four levels: `private` (class only), package-private / default (no modifier, same package), `protected` (package + subclasses), `public` (everywhere). A framework should expose a small public API (`LoginPage.login`, `DriverFactory.create`, `TestConfig.get`) and keep locators, waits, and JSON internals hidden. Package-by-feature (`com.acme.pages.checkout`, `com.acme.api.orders`) beats a giant `utils` package because package-private then actually means something: checkout tests can see checkout helpers, login tests cannot.

**Deep dive** — `protected` is wider than people think: any subclass in *any* package, plus the whole package. That is why `protected WebDriver driver` on `BasePage` lets a utility in the same package grab the driver — sometimes useful, often a leaky abstraction. Prefer `private` fields and `protected` *methods* that encode intent (`protected WebElement find(By by)`).

Modules (JPMS) add `exports` but most test jars are the unnamed module; don't lean on `module-info.java` unless the interviewer asks (see streams file Q10). In Maven, `src/main/java` vs `src/test/java`: production framework code should not depend on test-scoped classes; page objects that live in `src/main` cannot import JUnit assertions if you publish the POM as a library.

Typical layout:

```text
com.acme.framework
  driver/     public DriverManager, DriverFactory; package-private impls
  config/     public Env; package-private loaders
  pages/      public *Page; private locators inside each class
  api/        public clients; package-private DTOs if not shared
  internal/   package-private wait/js helpers — no public surface
```

**Code**

```java
package com.acme.framework.pages;

public class CartPage {
    private static final By ROW = By.cssSelector("[data-testid=line]"); // hidden
    private final WebDriver driver;

    public CartPage(WebDriver driver) { this.driver = driver; }

    public int lineCount() { return driver.findElements(ROW).size(); }   // public API
}
```

**Follow-ups & traps**

- Trap: everything `public` "for tests" — then tests couple to internals and you cannot refactor locators.
- `private` locators vs `protected` — if a subclass in another package needs a locator, that is a smell; pass a `By` in or extract a component.
- Follow-up: can a subclass access `private` of the parent? No. Can it access package-private of the parent? Only if same package.

**Senior/lead angle** — Publish an explicit API document: what SDETs may import. ArchUnit or Checkstyle `import` bans (`org.openqa.selenium.By` outside `pages/`) enforce it.

**One-liner** — Small public surface, locators private, package-by-feature so package-private is real encapsulation — `protected driver` on BasePage is a privilege, not a default.

### Q8. Composition vs inheritance — why component objects beat deep BasePage hierarchies

**Interview answer** — Inheritance is "is-a"; composition is "has-a." Deep `BasePage → ShopPage → CheckoutPage → PaymentPage` hierarchies share the wrong things and create fragile constructors. A checkout page *has-a* header, *has-a* cart-summary component, *has-a* payment form — each component owns its locators and is reused on other pages. I still use a thin `BasePage` for driver + wait, then stop. The same rule killed giant `BaseTest` classes: use TestNG listeners / JUnit extensions, not five levels of test superclasses.

**Deep dive** — Inheritance couples lifecycle: changing `BasePage`'s constructor breaks every subclass. It also violates Liskov when `AdminPage extends BasePage` but `open()` assumes a customer URL. Composition lets you test a `DatePicker` once and drop it into search, booking, and profile. Selenium's own API is composition-heavy: a `WebDriver` *has* `Navigate`, `Options`, `TargetLocator`.

Cost of BasePage god-objects: merge conflicts, unused methods on pages that don't have a header, and "I don't know which superclass implements `click`." The rule of thumb: inherit only when you are truly specializing behavior and need protected hooks; otherwise compose.

**Code**

```java
public final class Header {                         // component object
    private static final By CART = By.id("cart");
    private final WebDriver driver;
    public Header(WebDriver driver) { this.driver = driver; }
    public CartPage openCart() { driver.findElement(CART).click(); return new CartPage(driver); }
}

public class ProductPage {                          // composition, not Checkout extends Product
    private final WebDriver driver;
    private final Header header;
    private final DatePicker deliveryDate;

    public ProductPage(WebDriver driver) {
        this.driver = driver;
        this.header = new Header(driver);
        this.deliveryDate = new DatePicker(driver, By.id("delivery"));
    }

    public Header header() { return header; }
}
```

**Follow-ups & traps**

- Trap: "composition means never inherit" — `LoginPage extends BasePage` is still fine if BasePage is 20 lines.
- Fragile base class problem: name it if they ask why inheritance hurts.
- Follow-up: how do components get a driver? Constructor injection from the page, same `ThreadLocal` lookup, or a small `DriverHolder` — never a static component singleton.

**Senior/lead angle** — Standardize a `Component` interface (`root()` locator, `isVisible()`) so new widgets are copy-paste, not new inheritance trees. This is the same advice as Playwright's locator-as-component pattern.

**One-liner** — Thin BasePage for driver/wait, then components (`Header`, `DatePicker`) composed into pages — deep page inheritance is how frameworks rot.

### Q9. `equals()` and `hashCode()` contract; `==` vs `equals`; String intern pool; mutable keys

**Interview answer** — `==` compares references (and primitive values). `equals` compares content if the class overrides it; `Object.equals` is also reference equality. The contract: equals is reflexive, symmetric, transitive, consistent, and `x.equals(null)` is false. If `a.equals(b)` then `a.hashCode() == b.hashCode()`. Strings override both; `"qa" == new String("qa")` is false, `"qa".equals(new String("qa"))` is true. The intern pool holds unique literals; `intern()` can put a runtime string there — never use `==` for string content. Never use a mutable object as a HashMap key: if you mutate a field that participates in hashCode after insert, the entry is lost in the wrong bucket.

**Deep dive** — HashMap locates a bucket with `hash & (n-1)` then walks the chain/tree with `equals` (see collections file Q6). Breaking the contract produces "I put it in the map and get returns null." Lombok `@EqualsAndHashCode` / records generate both together — good. Including a mutable `List` field in equals is a time bomb. For entities (User with DB id), equals is usually identity (id); for value objects (Money, Email, test-data `UserCredentials`), equals is field-based.

Integer cache: `Integer.valueOf(100) == Integer.valueOf(100)` may be true (cached -128..127) while `200` is false — another reason never to use `==` on wrappers.

**Code**

```java
public final class UserId {
    private final String value;
    public UserId(String value) { this.value = Objects.requireNonNull(value); }

    @Override public boolean equals(Object o) {
        return o instanceof UserId other && value.equals(other.value); // Java 16+ pattern
    }
    @Override public int hashCode() { return value.hashCode(); }
}

String a = "chrome";
String b = new String("chrome");
a == b;                 // false
a.equals(b);            // true
a == b.intern();        // true — don't rely on this in tests

Map<UserId, TestUser> users = new HashMap<>();
// BAD: key class with setters for `value`
```

**Follow-ups & traps**

- Trap: overriding equals without hashCode — HashSet allows "duplicates," HashMap lookups fail.
- Trap: `==` on Strings "works on my machine" because of the intern pool.
- `instanceof` equals without `getClass()` allows subclass equality; using `getClass()` is stricter (can break Liskov for value types). Know the trade-off; records use the equivalent of same-type.
- Mutable key demo: put, mutate, get → null, but iterating `entrySet` still finds it.

**Senior/lead angle** — For API POJOs used in assertions, prefer records (Q13) so equals/hashCode/toString are correct by default. For WebElement, never put them in a HashSet expecting DOM identity — they are not value objects.

**One-liner** — `==` is identity, `equals` is content; equal objects must share hashCode; intern pool makes `==` on strings a trap; mutable HashMap keys disappear.

### Q10. Immutability: why String is immutable; how to write an immutable test-data class

**Interview answer** — String is immutable so it can be interned, used safely as a HashMap key, shared across threads without locks, and used for class names / URLs / security-sensitive paths without a caller mutating them under you. `concat`/`replace` return new strings; the original char data is unchanged (Java 9+ strings are byte[] + coder, not char[]). An immutable test-data class has `private final` fields, no setters, defensive copies of collections, and is typically a `record` or a class with a builder that produces a final snapshot. Tests then share `STANDARD_USER` across threads without one test changing another's password.

**Deep dive** — Immutability ⇒ hashCode can be cached (String does). It also makes happens-before easier: publish a final reference to an immutable object and other threads see a consistent view. Costs: lots of short-lived objects from concatenation (see exceptions/strings file). For test data, immutability plus a `withX()` copy method (or `record` with a compact constructor) beats a mutable JavaBean that Rest Assured serializes while another thread mutates it.

Defensive copy: if the class holds a `List<Item>`, store `List.copyOf(items)` (Java 10, unmodifiable, rejects nulls) so callers cannot mutate via the reference they passed in.

**Code**

```java
public final class TestUser {
    private final String email;
    private final String password;
    private final List<String> roles;

    public TestUser(String email, String password, List<String> roles) {
        this.email = Objects.requireNonNull(email);
        this.password = Objects.requireNonNull(password);
        this.roles = List.copyOf(roles);          // unmodifiable copy
    }

    public String email() { return email; }
    public String password() { return password; }
    public List<String> roles() { return roles; } // already unmodifiable
    public TestUser withEmail(String email) { return new TestUser(email, password, roles); }
}

public record OrderRequest(String sku, int qty) {  // Java 16+ — see Q13
    public OrderRequest {
        if (qty < 1) throw new IllegalArgumentException("qty");
    }
}
```

**Follow-ups & traps**

- Trap: `final List<String> roles` without `copyOf` — the list contents are still mutable.
- "Are records always immutable?" — Shallow: a record holding an `ArrayList` is a mutable record.
- Why String for locators is safe as static constants: immutability + interned literals.

**One-liner** — String is immutable for pooling, safety, and hash keys; test data should be `final` fields or records with `List.copyOf`, plus `withX()` copies instead of setters.

### Q11. Wrapper classes, autoboxing, NPE from unboxing (`Integer x = null; int y = x`)

**Interview answer** — Each primitive has a wrapper (`int`/`Integer`, `boolean`/`Boolean`, …) so values can live in collections (`List<Integer>` — type parameters cannot be primitives). Autoboxing is the compiler inserting `Integer.valueOf` / `intValue`. The landmine is unboxing null: `Integer x = null; int y = x;` throws `NullPointerException` at the implicit `x.intValue()`. JSON/API fields that are optional numbers become `Integer` in POJOs for a reason — they can be absent; don't assign them to `int` without a null check.

**Deep dive** — `Integer.valueOf` caches -128..127 (JLS; actually `IntegerCache` and `-XX:AutoBoxCacheMax`). `==` on wrappers is identity, not numeric equality. Mixing `==` with autoboxing (`Integer a = 200; a == 200`) unboxes and can "work" while `a == Integer.valueOf(200)` fails — don't. Streams of primitives (`IntStream`) exist to avoid boxing in hot loops; in tests it rarely matters. Rest Assured / Jackson: prefer `Integer`/`Boolean` in DTOs when the API can omit the field; use `int` only when the contract guarantees presence.

Generic collections store references: `list.add(3)` boxes. `list.remove(3)` is a famous overload trap — `remove(int index)` not `remove(Object)`. `Boolean.TRUE.equals(flag)` is the null-safe test; `if (flag)` unboxes and NPEs. Each wrapper except `Void` has `parseX` / `valueOf`; `valueOf` uses the cache, `new Integer(n)` is deprecated (Java 9) and always allocates.

**Code**

```java
Integer timeout = null;
int seconds = timeout;           // NPE — implicit timeout.intValue()

Integer status = response.jsonPath().get("retryAfter"); // may be null from API
int retryAfter = (status != null) ? status : 0;

List<Integer> codes = new ArrayList<>();
codes.add(201);                  // autobox
codes.remove(201);               // BUG: remove(index 201) → IndexOutOfBounds
codes.remove(Integer.valueOf(201)); // correct
```

**Follow-ups & traps**

- Trap: `==` on Integers in assertions — use `equals` or AssertJ/`assertEquals`.
- Boolean wrapper in `if (flag)` when flag is null → NPE. Prefer `boolean` or `Boolean.TRUE.equals(flag)`.
- Follow-up: why `List<int>` is illegal — type erasure / arrays of reified types vs generics.
- `Integer` in a `Map<String, Integer>` of JSON numbers: missing key is null, then unboxing in arithmetic NPEs at the assertion line, not at parse.


- Boolean unboxing in `if (enabled)` when JSON omitted the field — NPE at the if.
- `list.remove(3)` vs `remove(Integer.valueOf(3))` — say it in the interview.
- Cache range is JLS-guaranteed for Integer; Long cache is implementation-dependent beyond that.

**Code**

```java
Integer retries = body.get("retries"); // null if omitted
int n = (retries == null) ? 0 : retries;  // never unbox blindly
List<Integer> codes = new ArrayList<>();
codes.add(204);
codes.remove(Integer.valueOf(204));
```

**One-liner** — Wrappers let primitives into collections; autoboxing hides `valueOf`/`intValue`; unboxing null is an NPE, so optional JSON numbers stay `Integer` until you null-check.

### Q12. `var` (local type inference) — when OK in tests

**Interview answer** — `var` (Java 10) is local-variable type inference: the compiler still has a concrete type, it just writes it for you. It is legal for locals, indexes in enhanced for-loops, and try-with-resources; it is not legal for fields, method parameters, or return types. In tests I use it when the right-hand side is obvious (`var driver = new ChromeDriver()`, `var users = List.of(...)`) and I annotate when the RHS is a long generic or a wildcard (`var x = someApi()` that returns `Map<String, List<Condition<?>>>` is the case *for* var). I avoid `var` when it hides that you got an `Object` or a raw type.

**Deep dive** — `var` is not JavaScript dynamism and not `Object`. `var list = new ArrayList<>()` fails — the compiler cannot infer `T` without a target type (`var list = new ArrayList<String>()` is fine). `var` with diamond and lambdas has limits. `var` on a null initializer is illegal. In a review culture, a team rule such as "var for constructors and factory calls, explicit types at assertion boundaries" keeps tests readable. Java 11 added `var` in lambda parameters for annotation sites (`(@Nonnull var x) ->`).

Anonymous types: `var w = new Object() { void ping() {} }; w.ping();` is a parlor trick. In page objects I still write `private final WebDriver driver` — `var` is locals only. Don't `var` a Rest Assured `Response` if the next five lines call JSONPath; the type name is documentation.

**Code**

```java
var driver = new ChromeDriver();                 // OK — type is ChromeDriver
var wait = new WebDriverWait(driver, Duration.ofSeconds(10));
var body = given().get("/orders").then().extract().body(); // OK if you don't need the type name

var rows = driver.findElements(By.cssSelector("tr"));      // List<WebElement>

// NOT a field:
// private var driver;   // compile error
```

**Follow-ups & traps**

- Trap: "var is loosely typed" — it is inferred and still checked.
- Trap: `var x = getMap(); x.get(0)` — if getMap returns `Object`, you just lost generics; that's on the API, var made it less visible.
- Anonymous types: `var w = new Object() { void ping() {} }; w.ping();` works and is a parlor trick, not production style.
- `var` in try-with-resources is idiomatic: `try (var in = Resources.open("users.json"))`.


- `var` is a reserved type name, not a keyword in all contexts — still cannot be a field.
- Good: `var wait = new WebDriverWait(driver, Duration.ofSeconds(10));`
- Bad: `var x = factory.create();` when create() returns Object/raw.

**Code**

```java
var options = new ChromeOptions();
options.addArguments("--headless=new");
var driver = new ChromeDriver(options);
var wait = new WebDriverWait(driver, Duration.ofSeconds(10));
```

**One-liner** — `var` infers locals only; use it when the RHS names the type, not when it would hide `Object`, raw types, or a surprising API return.

### Q13. Records (Java 16+) for API POJOs — interview-relevant modern Java

**Interview answer** — A `record` is a transparent, shallow-immutable data carrier: the compiler generates the canonical constructor, accessors (`sku()`, not `getSku()` unless you add them), `equals`, `hashCode`, and `toString`. For Rest Assured / Jackson request and response bodies they replace boilerplate POJOs. Jackson 2.12+ binds records natively; accessor names are the component names. Use a compact constructor for validation. Don't use records for page objects — those have behavior and a driver.

**Deep dive** — Records are `final`, cannot extend a class (they implicitly extend `java.lang.Record`), can implement interfaces, and can have static fields/methods and additional instance methods. Instance fields beyond the header are illegal. Serialization: prefer Jackson over Java `Serializable` (see exceptions file). Pattern matching (`if (obj instanceof Order(String sku, int qty))`) is Java 21 and pairs naturally with records. Compact constructor runs before assignment and can normalize (`qty` checked, `sku` stripped).

Jackson note: default visibility uses accessors; if a test still uses Gson, you may need extra config. Rest Assured `objectMapperConfig` should be the same mapper the service uses so `record CreateOrder(String sku, int qty)` round-trips.

**Code**

```java
public record CreateOrderRequest(String sku, int qty) {
    public CreateOrderRequest {
        Objects.requireNonNull(sku, "sku");
        if (qty < 1) throw new IllegalArgumentException("qty must be >= 1");
    }
}

public record OrderResponse(String id, String status, List<String> items) {
    public OrderResponse {
        items = List.copyOf(items);   // freeze nested mutability
    }
}

CreateOrderRequest req = new CreateOrderRequest("SKU-1", 2);
given().body(req).contentType(JSON).post("/orders")
       .then().statusCode(201)
       .extract().as(OrderResponse.class);
```

**Follow-ups & traps**

- Trap: records with mutable `List` components without `copyOf` — not immutable.
- Lombok `@Data` vs records — records are language-level; prefer them on 17+.
- "Can a record have a setter?" — No; add a `withQty(int)` that returns a new record.
- Accessor names vs JavaBeans: some old mappers expect `getSku()`; configure or add a delegating method.

**Senior/lead angle** — Standardize DTOs as records in `api/` and keep Selenium types out of them. That split is the Java equivalent of typed Playwright API fixtures.

**One-liner** — Records are concise immutable POJOs with real equals/hashCode — use them for Rest Assured bodies, not for pages that hold a WebDriver.

### Q14. Enums: when to use for env/browser; enum with fields

**Interview answer** — Use enums for closed sets you switch on: `Browser { CHROME, FIREFOX, EDGE }`, `Env { QA, STAGING, PROD }`. They are typesafe, iterable (`values()`), and can hold fields and behavior (`baseUrl`, `createDriver()`). That beats stringly-typed `if (browser.equals("chrome"))` which fails at runtime on `"Chrome"`. Don't enum things that change per deployment without a rebuild (feature flags, dynamic tenant lists) — those belong in config.

**Deep dive** — Each enum constant is a singleton; `==` is safe for enums (still, `equals` is fine). You can give constants constructor args and abstract methods so each browser builds its own `Options`. `EnumMap` / `EnumSet` are faster than HashMap for enum keys. Switching on enums is exhaustive in Java 21 switch expressions if you don't have `default` — adding a browser becomes a compile error at every switch, which is a feature.

Loading from env: `Browser.valueOf(System.getenv("BROWSER").toUpperCase(Locale.ROOT))` — catch `IllegalArgumentException` and rethrow a clear `FrameworkException`.

**Code**

```java
public enum Browser {
    CHROME("chrome") {
        @Override public WebDriver create() {
            ChromeOptions o = new ChromeOptions();
            o.addArguments("--headless=new");
            return new ChromeDriver(o);
        }
    },
    FIREFOX("firefox") {
        @Override public WebDriver create() { return new FirefoxDriver(); }
    };

    private final String gridName;
    Browser(String gridName) { this.gridName = gridName; }
    public String gridName() { return gridName; }
    public abstract WebDriver create();

    public static Browser fromEnv() {
        String raw = System.getenv().getOrDefault("BROWSER", "CHROME");
        return Browser.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    }
}

public enum Env {
    QA("https://qa.example.com"),
    STAGING("https://stg.example.com"),
    PROD("https://example.com");
    private final String baseUrl;
    Env(String baseUrl) { this.baseUrl = baseUrl; }
    public String baseUrl() { return baseUrl; }
}
```

**Follow-ups & traps**

- Trap: `enum` for yes/no flags that should be `boolean`.
- `valueOf` is case-sensitive — always normalize.
- Enums can implement interfaces (`DriverFactory` per constant) — powerful, easy to overcook.
- Never `new` an enum; constructors are implicit and private.

**One-liner** — Enums are the typesafe closed set for browser and env, can carry fields and per-constant behavior, and make switches exhaustive — stop passing `"chrome"` strings around the framework.

### Q15. Object class methods you should know (`equals`, `hashCode`, `toString`, `getClass`, wait/notify)

**Interview answer** — Every class extends `Object`. The methods I actually use: `equals`/`hashCode` (collections and assertion identity — Q9), `toString` (logs and Allure steps — always override on test-data types), `getClass` (runtime type, useful in factories and in equals implementations). `clone` is a minefield (Cloneable is broken; prefer copy constructors). `wait`/`notify`/`notifyAll` are low-level monitors; I mention them only if we are in a concurrency round — in frameworks I use `WebDriverWait`, `CountDownLatch`, or `CompletableFuture` instead of `obj.wait()`. `finalize` is Q4 — never.

**Deep dive** — `toString` default is `ClassName@hexIdentityHash`. When a test fails with `expected <User@1a2b> but was <User@3c4d>`, you lost the interview's logging. Records generate a useful toString. `getClass()` is `final` and returns the runtime `Class<?>`; `instanceof` is usually preferable for type tests because it handles subclasses and null. `wait`/`notify` must be called while holding the monitor (`synchronized (obj)`); spurious wakeups require a loop on the condition. Selenium and Rest Assured already abstract waiting — rolling your own `wait/notify` for a page load is a red flag.

`clone` requires `Cloneable` and is a shallow copy by default; page objects with a driver field would share the session — another reason to prefer copy constructors. `notify` wakes one waiter, `notifyAll` wakes all; use `notifyAll` unless you prove otherwise. Don't mention wait/notify in a Selenium round unless they pivot to concurrency.

**Code**

```java
public final class TestUser {
    private final String email;
    // equals/hashCode as in Q9
    @Override public String toString() { return "TestUser[email=%s]".formatted(email); }
}

// Concurrency file covers wait/notify; do not use for UI waits:
synchronized (lock) {
    while (!ready) lock.wait();   // always a loop
    lock.notifyAll();
}
```

**Follow-ups & traps**

- Trap: using `getClass().getName()` in logs instead of `toString` on domain objects.
- `identityHashCode` vs `hashCode` — the former ignores overrides; HashMap uses the latter.
- `clone()` vs copy constructor vs record copy — recommend anything but clone.
- Overriding toString on exceptions' context objects is what makes Allure readable.


- Override toString on test-data records so assertion failures print fields.
- getClass() is final — you cannot mock it; use instanceof.
- wait/notify belong in the concurrency file; do not use them for UI waits.

**Code**

```java
public record TestUser(String email, String role) {
    @Override public String toString() { return "TestUser[%s,%s]".formatted(email, role); }
}
```

**One-liner** — Know equals/hashCode/toString/getClass for daily framework work; treat wait/notify as concurrency trivia and finalize as forbidden.

### Q16. Stack vs heap; pass-by-value (the classic "Java is pass by reference" trap)

**Interview answer** — Each thread has a stack of frames: locals, operands, return address. The heap holds objects and arrays (shared across threads, GC-managed). A local `WebDriver driver` variable is a *reference on the stack* pointing at a ChromeDriver object on the heap. Java is **pass-by-value**: methods receive a copy of the bits. For primitives that is the number; for objects that is a copy of the reference. You can mutate the object through that reference (`driver.get(url)`), but reassigning the parameter (`driver = new FirefoxDriver()`) does not change the caller's variable. That is why people say "pass by reference" and why that answer is marked wrong.

**Deep dive** — Heap: young generation (Eden + survivors) for short-lived objects — most page objects and JSON trees die here; old generation for long-lived (static caches, ThreadLocal leftovers). Stack overflow is too-deep recursion or huge local arrays; heap OOM is leaks (drivers not quit). The reference copy explains a common DriverFactory bug:

```java
void init(WebDriver driver) { driver = new ChromeDriver(); } // caller's driver still null
```

You must return the driver, assign to a field, or set a ThreadLocal. Passing `List<User>` lets the method `list.add` (same list object); passing `list = new ArrayList<>()` inside the method does not replace the caller's list.

Escape analysis (JIT) may allocate some objects on the stack, which is an optimization, not a language rule — say "objects live on the heap" unless they ask about JIT.

**Code**

```java
static void reassign(WebDriver driver) {
    driver = new ChromeDriver();          // local copy of reference overwritten
}

static void mutate(WebDriver driver) {
    driver.get("https://qa.example.com"); // same heap object as caller
}

static void wrap(List<String> tags) {
    tags.add("smoke");                    // caller sees the add
    tags = List.of("ignored");            // caller still has original list
}

WebDriver d = null;
reassign(d);
assert d == null;                         // pass-by-value
```

**Follow-ups & traps**

- Trap: "objects are passed by reference" — the reference is passed by value.
- How to "return two things" — record, holder object, or mutate an array of length 1 (ugly).
- Primitive `int` cannot be mutated by a callee; `int[]` can, because the array is on the heap.
- Thread stacks vs heap dumps: `jstack` vs `jmap`/`jcmd GC.heap_dump`.

**Senior/lead angle** — This question is a filter. Nail it in two sentences, then connect it to why `ThreadLocal.set(driver)` is required instead of passing a reassigned local out of `@BeforeMethod` incorrectly.

**One-liner** — Stack holds per-thread frames and references; heap holds objects; Java passes copies of primitives and copies of references — mutating an object is visible, reassigning a parameter is not.
