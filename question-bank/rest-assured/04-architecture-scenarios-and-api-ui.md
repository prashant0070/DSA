# API Architecture, API+UI Integration & Scenarios

This file is the senior/lead layer: how you design a Rest Assured 5.x platform, where API tests sit in the pyramid, how they combine with Selenium/Playwright, data prep, mocking ownership, Testcontainers, versioning, payment retries, effectiveness metrics, CI layout, and a multi-service test platform. Syntax lives in files 01–03; this is how you use it in a real org.

- Q1. How would you design a scalable API automation framework?
- Q2. Layering: component/API tests vs e2e vs contract — pyramid numbers
- Q3. Combining API + UI: create via API, verify UI; login via API, inject cookie
- Q4. The UI says order created — verify it was saved (GET + DB)
- Q5. Login button enables after API — wait on outcome
- Q6. Prepare test data via API instead of UI
- Q7. Verify UI data against API
- Q8. Mocking in API tests vs mocking in UI
- Q9. Testcontainers for API tests
- Q10. Versioning APIs and testing two versions
- Q11. Idempotent retry tests for payments
- Q12. How do you measure API test effectiveness?
- Q13. CI for API suites
- Q14. Lead: API test platform for many microservices

### Q1. How would you design a scalable API automation framework? (clients per service, shared auth, env, factories, parallel-safe, CI sharding)

**Interview answer** — I'd split a **shared platform library** (auth, specs, filters, config, Jackson, reporting) from **per-service clients and tests**. Each service gets an `OrdersClient`, factories that mint unique data, and immutable specs. Parallelism is assumed: ThreadLocal tokens, no mutable globals, unique ids, shardable JUnit tests. CI runs a fast PR slice and shards the rest. New services copy a template; they don't fork the auth code.

**Deep dive** — Scalability here is *people and repos*, not "can Rest Assured POST." Constraints:

- **Clients per service** — `orders-client` methods map 1:1 to resources. A mega `ApiUtil` becomes unowned.
- **Shared auth** — one `AuthClient` against the IdP; tokens cached per worker/role.
- **Env** — `BASE_URI_ORDERS`, `BASE_URI_PAYMENTS`, vault-backed secrets. Same tests, different env files.
- **Factories** — unique `customerId`s; cleanup or disposable tenants. Parallel without unique data is a 409 storm.
- **Parallel-safe** — file 02 Q15. JUnit parallel + CI shards (split by class).
- **CI sharding** — `-Djunit.jupiter.execution.parallel.enabled` locally; in CI, N jobs with a shard index (Maven failsafe + class lists, or JUnit 5 `junit.jupiter.conditions` / custom discovery). Merge Allure/JUnit XML.
- **Versioning the lib** — semver; don't break `OrdersClient.create` from a logging change.

Anti-patterns: one Git repo with 8,000 unstructured tests against shared QA; RestAssured.baseURI in a static block; UI POM reused as the API framework.

**Code**

```text
api-test-platform/          # published JAR
  auth/, specs/, filters/, config/, report/

orders-api/                 # service repo
  src/test/java/.../clients/OrdersClient.java
  src/test/java/.../tests/...
  src/test/resources/schemas/

# PR job sketch
./mvnw -pl orders-api test -Dgroups=smoke
# nightly: 4 shards
./mvnw test -Dshard=$SHARD -DshardCount=4
```

**Follow-ups & traps**
- "One framework to test all APIs and the UI?" — share auth and env, not a single class hierarchy.
- Trap: scaling by adding more sleep and more retries.
- Ownership: if platform has no on-call, every service forks it in a month.

**Senior/lead angle** — Draw the package diagram and the CI graph in the same answer. Scalability is sharding + ownership + unique data, not a longer BaseTest.

**One-liner** — Shared platform for auth/config/filters, clients and tests per service, immutable specs, unique data, parallel workers plus CI shards.

### Q2. Layering: component/API tests vs e2e vs contract — pyramid numbers.

**Interview answer** — Most tests should sit at the service boundary: Rest Assured (or WebTestClient) against one app plus Testcontainers collaborators — hundreds of these. Contract tests (Pact/SCC) sit beside them, fewer, focused on consumer interactions. Cross-service e2e (order → payment → email) are tens, not hundreds. UI e2e are fewer still. A ratio I'd defend for a mature orders domain is roughly **70% component/API, 15% contract, 10% cross-service API, 5% UI** — counts, not gospel, but if 80% of runtime is UI, the pyramid is inverted.

**Deep dive** — Definitions interviewers mix up:

- **Unit** — domain/pure Java, no HTTP. Still the base. SDETs may not write them but should not ignore them in the pyramid story.
- **Component / API** — deploy or boot *one* service, stub others, real DB. Rest Assured to `localhost`. This is the SDET's home.
- **Contract** — Pact/SCC. Fast, no full graph.
- **E2E API** — real (or docker-compose) graph, still no browser.
- **E2E UI** — browser.

Numbers: I talk in **runtime budget** and **failure localization**, not a sacred 70/20/10. PR gate: unit + component/API smoke + provider contracts, under ~10 minutes. Nightly: full API + a handful of UI journeys.

If component tests need 12 mocks, the service is too coupled — that's an architecture smell the pyramid reveals.

**Code**

```text
        /\
       /UI\           ~5%  Playwright/Selenium journeys
      /----\
     / e2e  \         ~10%  API across real services
    /--------\
   / contract \       ~15%  Pact / SCC
  /------------\
 / component API \    ~70%  RA + Testcontainers + WireMock
/----------------\
      unit             (dev-owned, still the foundation)
```

**Follow-ups & traps**
- Trap: "we have 2,000 Rest Assured tests" that all hit shared QA through the gateway — those are slow e2e, not component tests.
- Contract tests don't count as e2e. Don't double-count.
- "We deleted UI tests because we have API tests" — you no longer test rendering, CORS, or cookie `SameSite`.

**One-liner** — Rest Assured belongs mostly at the one-service component layer; contracts protect consumers; e2e and UI stay thin — if the suite is mostly browser or mostly shared-QA, the pyramid is inverted.

### Q3. Combining API + UI: create order via API, verify UI; login via API, inject cookie. Full Java+RestAssured + Selenium/Playwright sketch.

**Interview answer** — Hybrid tests use HTTP for arrange and sometimes assert, and the browser only for what the UI uniquely does. I create an order with Rest Assured, open the order page, and assert the table. I log in via the token/session API and inject a cookie or `localStorage` so Playwright/Selenium never types a password. The sketch is: API client (RA) + browser driver sharing an env and a user identity, with a single correlation id on both.

**Deep dive** — Two canonical hybrids:

1. **API arrange → UI assert** — fastest "does the screen show what the backend stored?"
2. **API auth → UI session** — inject `JSESSIONID` or SPA `access_token`. Playwright: `context.addCookies` / `addInitScript`. Selenium: `driver.manage().addCookie`. For JWTs in memory (not cookies), execute JS or use Playwright storage state generated from API login.

Java + Playwright and Java + Selenium both pair with Rest Assured in the same JVM. TypeScript Playwright uses `request` instead of RA; in a Java shop, RA is the API half.

Don't: UI login then scrape a token from DevTools for later RA calls unless you must — mint the token once and feed both.

**Code**

```java
@Test
void orderCreatedViaApiAppearsInUi(Page page) {
    Order order = orders.create(buyerToken, OrderFactory.oneItem("SKU-1"));

    Cookie session = new Cookie("JSESSIONID", sessionFromToken(buyerToken));
    session.domain = Config.cookieDomain();
    session.path = "/";
    session.httpOnly = true;
    session.secure = true;
    page.context().addCookies(List.of(session));

    page.navigate(Config.webBase() + "/orders/" + order.id());
    assertThat(page.getByTestId("order-status")).hasText("Created");
    assertThat(page.getByTestId("order-total")).hasText("£19.99");
}

// Selenium equivalent
@Test
void loginViaApiInjectCookie() {
    String jsession = auth.loginSessionCookie(buyerUser, buyerPassword);
    driver.get(Config.webBase() + "/"); // domain must be set first
    driver.manage().addCookie(new org.openqa.selenium.Cookie.Builder("JSESSIONID", jsession)
        .domain(Config.cookieDomain()).path("/").isHttpOnly(true).isSecure(true).build());
    driver.navigate().refresh();
    driver.get(Config.webBase() + "/orders");
    assertEquals("Orders", driver.getTitle());
}
```

**Follow-ups & traps**
- Cookie `Domain` / `Secure` / `SameSite` mismatch — injection silently doesn't attach.
- You must land on the domain before `addCookie` in Selenium.
- SPA that ignores cookies and reads `localStorage` — inject the token there, not a dead JSESSIONID.
- Hybrid tests still aren't a substitute for API authz matrices.

**One-liner** — Rest Assured arranges (data, session); the browser only asserts UI behavior — inject cookies/tokens from the API, don't click login unless login is the feature.

### Q4. The UI says order created — verify it was saved (GET + DB).

**Interview answer** — UI success is a claim, not a commit. After the toast, I `GET /orders/{id}` with Rest Assured and assert status, total, and customer. If I own the service, I also assert the row (file 03 Q13). If the GET disagrees with the UI, it's a frontend cache or a 202 fire-and-forget bug — that's the defect this pattern exists to catch.

**Deep dive** — Failure modes this finds: UI optimistic update with a failed POST; POST 202 still pending; write to a replica the GET didn't see; wrong id in the URL. The test should capture `orderId` from the UI (network response or success page) then GET that id — not a "latest order" query that races.

Async create: wait on GET until `CREATED`/`PAID` (Awaitility), still no blind sleep. DB assert is for the service repo; in a pure UI repo, GET is the contract you can see.

**Code**

```java
page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Place order")).click();
String id = page.getByTestId("order-id").textContent();

await().atMost(10, SECONDS).untilAsserted(() ->
    given().spec(ShopSpecs.base(buyerToken))
        .when().get("/orders/{id}", id)
        .then().statusCode(200)
            .body("status", anyOf(equalTo("CREATED"), equalTo("PAID")))
            .body("total", equalTo(1999)));
```

**Follow-ups & traps**
- Trap: asserting only the green checkmark.
- Using admin GET that bypasses the same authz the UI used — you might see a row the user shouldn't.
- Timeouts too tight on 202+worker.

**One-liner** — After the UI celebrates, GET the resource (and the DB if you own it) — the toast is not persistence.

### Q5. Login button enables after API — wait on outcome (cross-tool).

**Interview answer** — If the button enables only after `/auth/precheck` or similar returns 200, I wait on **that outcome**, not a `sleep(1000)` and not only on "button enabled" if I care about the API. In Playwright I `waitForResponse` for the precheck, then assert enabled. In Selenium I wait for the button's enabled state *and* optionally poll the API. Cross-tool means the UI wait and the API wait are aligned to the same signal so flakes don't come from racing the handler.

**Deep dive** — Race: click login before the client finished fetching CSRF or remote config. The app disables the button until `GET /login/options` succeeds. A test that clicks immediately is flaky. A test that waits 3 seconds is slow and still flaky on a bad day.

Best: wait for the network response (Playwright `waitForResponse`, Selenium 4 CDP or a proxy) **then** assert `button` enabled. If you only have Selenium without intercept: explicit wait on `elementToBeClickable` is the UI contract; pair with a Rest Assured health/precheck in setup if the API is down (fail fast with a better message).

Don't wait on the API *instead* of the button if the bug is "API 200 but button stays disabled" — that's the UI bug you want.

**Code**

```java
// Playwright Java — arm, act, await the API, then the button
Response precheck = page.waitForResponse(
    r -> r.url().contains("/auth/precheck") && r.status() == 200,
    () -> page.navigate(Config.webBase() + "/login"));
assertEquals(200, precheck.status());
assertThat(page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in")))
    .isEnabled();

// Selenium — UI outcome; fail fast if API is down
given().get(Config.apiBase() + "/auth/precheck").then().statusCode(200);
new WebDriverWait(driver, Duration.ofSeconds(10))
    .until(ExpectedConditions.elementToBeClickable(By.id("sign-in")));
```

**Follow-ups & traps**
- Trap: `Thread.sleep(2000)` "because the API is slow."
- Waiting only on the API and clicking before React committed state.
- Playwright: subscribe to `waitForResponse` *before* navigation (file of races).

**One-liner** — Wait for the same event the UI waits for (the precheck response *and* the enabled button) — sleeps and "just click" are how this test flakes.

### Q6. Prepare test data via API instead of UI — always, unless testing the form.

**Interview answer** — UI is the slow, flaky way to create an order you'll use to test refunds. I seed with Rest Assured (or SQL in a hermetic env) and save the browser for the behavior under test. The exception is when the **form itself** is the feature — validation messages, client-side totals, file picker. Even then, subsequent steps (pay, ship) should jump via API if they aren't in scope.

**Deep dive** — Cost: a 15-click setup is 15 chances to flake and 30 seconds before the assertion. Parallelism dies if every test registers a user through the SPA (rate limits, CAPTCHA, email verification). CAPTCHA/OTP exist to stop you — that's a hint to use a test API.

Factories: `UserFactory.buyer()`, `OrderFactory.paid()`. They call the public API when that's the contract you want to respect (validation, events) or an internal test-seed endpoint when public APIs cannot create the needed state (simulate `SHIPPED`).

Never: commit a SQL dump of production. Never: share one `orderId` in a spreadsheet.

**Code**

```java
@BeforeEach
void seedPaidOrder() {
    buyer = users.ensureBuyer(); // API
    order = orders.createPaid(buyer.token(), OrderFactory.oneItem("SKU-1"));
}

@Test
void refundFormSubmits() {
    page.navigate("/orders/" + order.id() + "/refund");
    page.getByLabel("Reason").fill("Damaged");
    page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Refund")).click();
    assertThat(page.getByTestId("refund-status")).hasText("Refunded");
}
```

**Follow-ups & traps**
- "Always API" including the test whose requirement is "user can complete checkout in the browser" — that test *should* use the UI for checkout.
- Seed endpoints that bypass validation will hide bugs if used for tests that claim to represent customers.
- Data cleanup: API delete or tenant drop, not UI.

**One-liner** — Seed with Rest Assured unless the form is what you're testing — UI setup is how suites get slow and flaky.

### Q7. Verify UI data against API (normalization, pagination, formatting).

**Interview answer** — I treat the API as the source of truth and the UI as a projection. GET the orders list (handling pagination), then assert each visible row matches after **normalization**: money formatting (`1999` cents → `£19.99`), dates (`2026-09-03T13:00:00Z` → `3 Sep 2026`), and truncated names. I don't string-compare raw JSON to innerText. I also check that page 2 of the UI matches cursor page 2 of the API, not that "there are some rows."

**Deep dive** — Drift classes: timezone (UTC in API, local in UI), rounding, sorting (UI sorts client-side differently), pagination (UI page size 10, API default 20), stale React Query cache. A strong test pulls API data with the **same filters** the UI sent (status, sort).

Normalization helpers live in one place: `Money.formatGbp(1999)`, `Dates.uiDate(instant, zone)`. Don't scatter `replace("£","")`.

Empty and overflow: last page count; "showing 1–10 of 23" vs API `total`. If the API has no total (cursor), don't invent one from the UI string.

**Code**

```java
List<Order> api = orders.listAllPages(buyerToken, Map.of("status", "PAID"));

page.navigate("/orders?status=PAID");
Locator rows = page.getByTestId("order-row");
assertThat(rows).hasCount(Math.min(10, api.size()));

String uiTotal = page.getByTestId("order-row").nth(0).getByTestId("total").innerText();
assertThat(uiTotal).isEqualTo(Money.formatGbp(api.get(0).total()));
assertThat(page.getByTestId("order-row").nth(0).getByTestId("id").innerText())
    .isEqualTo(api.get(0).id());
```

**Follow-ups & traps**
- Trap: `assertEquals(apiJson, page.content())`.
- Locale: CI in `en_US` vs `en_GB` date formats.
- Comparing only `items[0]` on an unsorted list.

**One-liner** — GET the same slice the UI shows, then compare normalized money, dates, and ids — never raw JSON versus innerText.

### Q8. Mocking in API tests (WireMock, MockServer) vs mocking in UI (Playwright route) — who owns the mock.

**Interview answer** — Mocks belong at the **boundary you don't own for this test**. In Rest Assured component tests, WireMock stands in for payments, email, IdP — the orders service is real. In UI tests, Playwright `route` stands in for **your backend** when you're testing rendering, or for third parties the browser calls directly. Two teams mocking the same payments API with different JSON is how you ship "green" and still break. The owner of the real API owns the contract (Pact/OpenAPI); mockers consume it, they don't invent fields.

**Deep dive**

| Test | Real | Mock | Tool |
| --- | --- | --- | --- |
| Orders component | Orders app + DB | Payments, email | WireMock / MockServer |
| UI unit of checkout page | Browser | `POST /orders` | Playwright `route.fulfill` |
| UI e2e happy path | Browser + APIs | Payment processor maybe | sandbox or stub at adapter |
| Consumer contract | Consumer code | Provider (generated) | Pact |

Who owns the mock:
- **Adapter team** owns WireMock mappings that represent the vendor.
- **Orders team** owns mocks of payments *as orders understands the contract* — ideally generated from Pact/OpenAPI.
- **UI team** owns `route` fixtures for presentational tests; they should not be the source of truth for API shape.

Conflict: UI mocks `total` as a string `"19.99"` while the API returns cents. UI tests pass, RA schema fails (or vice versa). Fix: generate types/schemas from OpenAPI for both.

**Code**

```java
// API test — mock collaborator, real orders service
wireMock.register(post("/v1/captures")
    .willReturn(okJson("{\"id\":\"ch_1\",\"status\":\"succeeded\"}")));
given().spec(base).post("/orders/{id}/pay", orderId)
    .then().statusCode(200);

// UI test — mock YOUR API for a presentational case (Playwright TS shown as the common form)
// await page.route('**/v1/orders', r => r.fulfill({ json: { items: [] } }));
```

**Follow-ups & traps**
- Trap: UI and API suites with hand-copied JSON that diverged six months ago.
- Mocking the system under test in an API test (WireMock replacing orders while testing orders) — you're testing the mock.
- Playwright route doesn't exercise CORS the same way a real backend does — don't claim it does.

**Senior/lead angle** — A catalog of stubs in the platform repo, generated from contracts. Leads kill snowflake mocks in wiki pages.

**One-liner** — WireMock mocks collaborators in API tests; Playwright `route` mocks backends in UI tests; the provider's contract owns the JSON — mockers don't invent it.

### Q9. Testcontainers for API tests (Postgres + app) — hermetic CI.

**Interview answer** — Testcontainers starts real dependencies (Postgres, Kafka, LocalStack) from JUnit, so Rest Assured hits a disposable stack that no other PR shares. I run Flyway against that Postgres, boot the app on a random port, and point Rest Assured at it. CI becomes hermetic: no "who truncated QA," no leftover orders. That's the default I want in the **service repo**; shared QA is for a thin e2e slice.

**Deep dive** — Pattern: `@Testcontainers` + `@Container static PostgreSQLContainer` + Spring `DynamicPropertySource` (or docker compose module for app + db). Rest Assured `baseURI = "http://localhost:" + port`. Parallel: one container per class is cheaper; per-test is isolation max, slower. Reuse (`testcontainers.reuse.enable`) locally, not in CI if state leaks.

What belongs in the container: DB, broker, the app. What still gets mocked: paid vendor APIs (unless you have a local emulator).

Pitfalls: Docker-in-Docker on some CI; image pull time (cache images in the runner); wait strategies (app not listening yet — use HTTP wait on `/health`); Ryuk leftover containers.

Compared with shared QA: hermetic tests find schema migrations; they miss ingress, real IdP, and real network policies — keep a small staging suite.

**Code**

```java
@Testcontainers
@SpringBootTest(webEnvironment = RANDOM_PORT)
class OrdersApiIT {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @LocalServerPort int port;

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @BeforeEach
    void ra() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = port;
    }

    @Test
    void createThenGet() {
        String id = given().auth().oauth2(TestJwt.buyer())
            .contentType(ContentType.JSON)
            .body(OrderFactory.oneItem("SKU-1"))
        .when().post("/orders")
        .then().statusCode(201).extract().path("id");

        given().auth().oauth2(TestJwt.buyer())
            .when().get("/orders/{id}", id)
            .then().statusCode(200).body("id", equalTo(id));
    }
}
```

**Follow-ups & traps**
- Trap: Testcontainers + still pointing Rest Assured at `https://qa.shop.com`.
- Static `RestAssured.port` with parallel classes — bind per test class, don't use process-wide statics if parallel.
- App wait: first test 401/connection refused because Tomcat wasn't up — use a health wait.

**One-liner** — Postgres + app in Testcontainers, Rest Assured to localhost — hermetic CI that doesn't share QA state; keep a thin real-env suite for ingress and IdP.

### Q10. Versioning APIs (URL / header) and testing two versions.

**Interview answer** — URL versioning (`/v1/orders`, `/v2/orders`) and header versioning (`Accept: application/vnd.shop.order.v2+json`) both exist; I test **what we ship**, including overlap during a deprecation window. While v1 is alive I run the v1 schema and critical journeys *and* v2; I don't delete v1 tests the day v2 merges. Breaking-change checks (oasdiff) run in CI so "small" field renames don't skip a version bump.

**Deep dive** — Strategies: path (`/v1`), query (`?version=2`) — least loved, cache-hostile — media type, or custom `X-API-Version`. Sunset headers (`Deprecation`, `Sunset`) are worth asserting when a version is dying.

Test matrix during overlap:
- v1 happy path + schema
- v2 happy path + schema
- v1 client headers against v2-only route → 404/406
- Compatibility shim: v1 `total` still present while v2 uses `totalCents`

Clients in the framework: `OrdersV1Client`, `OrdersV2Client` sharing auth, not a boolean `if (v2)`.

**Code**

```java
given().spec(baseV1).when().get("/orders/{id}", id)
    .then().statusCode(200)
    .body(matchesJsonSchemaInClasspath("schemas/order-v1.json"));

given().spec(baseV2)
    .accept("application/vnd.shop.order.v2+json")
.when().get("/orders/{id}", id)
    .then().statusCode(200)
    .body(matchesJsonSchemaInClasspath("schemas/order-v2.json"))
    .body("totalCents", equalTo(1999));

given().spec(baseV1).when().get("/v2/orders/{id}", id)
    .then().statusCode(anyOf(is(404), is(406)));
```

**Follow-ups & traps**
- Trap: one client that toggles version and a single test file with `if`.
- Dropping v1 tests while customers still call v1.
- Header versioning forgotten because Rest Assured `accept(JSON)` always sends `application/json` — v2 never selected.

**One-liner** — Separate clients and schemas per version; keep v1 tests until v1 is off; make Accept/path explicit so you don't accidentally test only v1.

### Q11. Idempotent retry tests for payments (same Idempotency-Key).

**Interview answer** — I simulate the real failure: POST capture with an `Idempotency-Key`, then retry the **same** key and body as if the client timed out. I assert one `paymentId`, one charge in the stub/ledger, and 409 if the body changes. I also retry after a forced 502 from WireMock on the first attempt (if the server committed after sending 502 — the ugly case) and prove the key still coalesces. CI retries of the *test* must reuse the key from a factory, not mint a new UUID in a Rest Assured retry filter.

**Deep dive** — Cases (expand file 01 Q10 into a suite):

1. Happy retry: 201 then 201, same id.
2. Conflicting body: 409.
3. Client timeout: socket timeout on first call (WireMock delay), retry same key → one charge.
4. Test framework retry: JUnit retry extension must not rebuild the key in `@BeforeEach` if the POST might have committed. Store the key with the test data.
5. Parallel: two threads, same key — one winner, one replay; no two charges.

The payments client wrapper **requires** a key parameter; tests that call raw `post("/payments")` fail review.

**Code**

```java
@Test
void captureRetriesDoNotDoubleCharge() {
    String key = UUID.randomUUID().toString();
    CaptureRequest body = new CaptureRequest(order.id(), 1999, "USD");

    String id1 = payments.capture(buyerToken, key, body).id();
    String id2 = payments.capture(buyerToken, key, body).id();
    assertThat(id2).isEqualTo(id1);
    wireMock.verify(1, postRequestedFor(urlEqualTo("/v1/charges")));
}

@Test
void captureTimeoutThenRetrySameKey() {
    String key = UUID.randomUUID().toString();
    wireMock.register(post("/v1/charges").inScenario("to")
        .whenScenarioStateIs(STARTED)
        .willReturn(aResponse().withFixedDelay(5_000).withStatus(200))
        .willSetStateTo("done"));
    // first client call times out; second hits processor or replay cache
    // assert single charge id on our API
}
```

**Follow-ups & traps**
- New UUID in a generic 502 retry filter — the bug you're paid to prevent.
- Asserting only HTTP 201 twice without verifying the processor stub count.
- Using PUT without a key and calling it idempotent when the processor still double-charges.

**One-liner** — Same `Idempotency-Key` and body must yield one payment through timeouts and retries; the client wrapper mints the key once, not the retry filter.

### Q12. How do you measure API test effectiveness? (escaped defects in services, contract breakage caught, time-to-signal)

**Interview answer** — Count **escaped defects** that a reasonable API test could have caught (wrong status, schema break, authz hole, double charge), **contract breakages caught in CI** before mobile/web released, and **time-to-signal** on a PR (minutes to a useful failure, not hours of UI). Vanity metrics — 5,000 tests, 98% pass — don't tell me if `/payments` can still double-capture. I also track flake rate; a noisy suite trains people to ignore the signal.

**Deep dive** — Metrics I'd put on a dashboard:

- Escaped production defects tagged `detectable-at-api` vs `needs-ui` vs `needs-prod-traffic`.
- Pact/schema failures per week that never reached nightly e2e — that's the contract layer working.
- PR gate duration (p50/p95) and time-to-green after a failing commit.
- Flake rate by test (`passes on retry` / runs).
- Coverage of *risk*: payments, authz, idempotency — not line coverage of test code.

Not: "assertion count," "we assert schema on everything" without business cases, "100% endpoint coverage" of GET health.

Feedback loop: every escaped defect adds a Rest Assured test or a Pact interaction in the same sprint. If it can't be expressed at API layer, say why (pure CSS, etc.).

**Code**

```text
escaped_defects{layer="api"}     # should trend down
contract_fails_caught_in_pr
pr_gate_minutes{p95}
flake_ratio
idempotency_tests_present{service="payments"}  # 0/1 health check
```

**Follow-ups & traps**
- Trap: celebrating a green nightly that doesn't run payments.
- Line coverage of controllers as a proxy for API test quality — mocks can inflate it.
- Time-to-signal includes queue time; optimize the gate, not only the test code.

**Senior/lead angle** — Effectiveness is an org metric: escaped defects by *service owner*, not by the SDET team's test count. Leads use it to fund factories and Testcontainers, not more UI.

**One-liner** — Measure escaped service defects, contracts caught in CI, and minutes-to-signal — not raw test counts or a 98% pass rate on a flaky suite.

### Q13. CI for API suites (fast PR gate, nightly broader, prod synthetic)

**Interview answer** — PRs run a **fast gate**: unit, Testcontainers component/API smoke, schema, provider Pact verify — target under 10 minutes, hermetic. Nightly runs the full API matrix, `@external` sandboxes, and a few cross-service journeys against staging. Production gets **synthetics**: read-mostly probes plus a carefully idempotent write, with secrets and data isolation, paging the service owner on fail. The same Rest Assured clients are reused; tags and env config change, not a second framework.

**Deep dive**

```text
PR:    lint → unit → Testcontainers API @smoke + schema + pactVerify
merge: artifact promote
nightly: full @api on staging + @external sandboxes + shard
prod:  synthetic @prod-safe every N minutes (GET health, GET order of a canary, optional idempotent ping)
```

PR must not: hit rate-limited QA, run 40-minute captures, depend on a UI. Nightly may: broader data, chaos against stubs, contract drift vs live OpenAPI.

Prod synthetics rules: no random POST `/payments` without a dedicated merchant and idempotency key; no deleting customer data; credentials in a separate vault path; results in the same observability tool as prod (not only Jenkins).

Artifacts: JUnit XML, Allure with redacted attachments, `X-Request-Id` in the failure Slack message.

**Code**

```text
# junit-platform.properties locally
junit.jupiter.execution.parallel.enabled=true

# GitHub Actions sketch
pr.yml:        mvn -Dgroups=smoke,contract test
nightly.yml:   mvn -Dgroups=api,external test  (shard matrix)
synthetic.yml: mvn -Dgroups=prodSafe test      (schedule, prod env, tight timeout)
```

**Follow-ups & traps**
- Trap: PR and nightly are the same 2-hour job.
- Prod synthetic using a developer's token.
- Skipping `@external` forever because it failed once — quarantine with an expiry, don't delete.

**One-liner** — Hermetic smoke on PR, broad API nightly, locked-down synthetics in prod — same clients, different tags and environments.

### Q14. Lead: API test platform for many microservices (shared lib, catalog of services, ownership, pact broker).

**Interview answer** — At platform scale I ship a versioned **api-test-platform** library (auth, filters, specs builders, reporting, Testcontainers helpers), a **catalog** of services (base URLs per env, owners, SLOs, OpenAPI links), and a **Pact Broker** (or SCC repo) with provider verification required to merge. Each service owns its clients and tests in its repo; the platform team owns the library and the broker, not 400 test classes. Governance is templates + required examples (authz, idempotency for writers), not a central bottleneck that writes everyone's tests.

**Deep dive** — Pieces:

1. **Shared lib** — semver, changelog, `relaxedHTTPSValidation` banned, secret blacklist tested. Compatibility tested against two Rest Assured 5.x minors.
2. **Catalog** — service id, repo, `BASE_URI` keys, owner Slack, whether it is Pact provider, rate-limit class for CI keys. This is how a new SDET finds "who owns payments."
3. **Ownership** — CODEOWNERS on clients; flaky tests page the service, not "QA."
4. **Pact Broker** — consumers publish; providers verify on PR; `can-i-deploy` before release.
5. **Golden template** — `cookiecutter` service with `OrdersClient`, schema folder, Testcontainers IT, smoke tag, Allure filter already wired.
6. **CI standard** — reusable workflow: smoke job, shard job, synthetic job. Services opt in.
7. **Data** — optional shared "identity" service for test users; no shared mutable orders DB.

Failure mode: a platform team that requires tickets to add a header. Avoid by making extension points (custom filters) first-class.

**Code**

```text
org/
  api-test-platform/          # JAR: auth, filters, config, allure, testcontainers
  pact-broker/                # or SaaS
  service-catalog/            # yaml: orders, payments, users...
  reusable-workflows/         # pr-api.yml, nightly-api.yml

orders-service/               # owns:
  src/test/.../OrdersClient.java
  src/test/.../tests/
  openapi.yaml
  pact-provider verification

payments-service/             # owns captures + idempotency suite
```

**Follow-ups & traps**
- Trap: one monorepo of all API tests owned by a central QA team — review lag, stale tests, no service ownership.
- Trap: every service copies the JAR source because publishing was "too hard."
- Catalog without owners is a wiki. Owners must be people on-call.

**Senior/lead angle** — This is the actual lead answer: platform as a product, services as customers, contracts as the release gate, Rest Assured as the implementation detail inside the template. Draw who pages whom at 3 a.m. when `@smoke` fails.

**One-liner** — Versioned shared lib, service-owned clients/tests, a living catalog, and a Pact broker with `can-i-deploy` — the platform team enables, it doesn't hoard the tests.
