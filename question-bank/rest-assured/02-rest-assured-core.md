# Rest Assured Core API

This file is the Rest Assured 5.x working knowledge SDET interviews actually run: given/when/then, specs, jsonPath vs POJOs vs schema, params, logging without leaking secrets, filters, auth helpers, SSL, Jackson, extract-and-chain (and why not to), timings, comparisons with other HTTP clients, parallel safety, and how to lay out a Java API test framework. Syntax without HTTP fundamentals is fragile — pair this with `01-http-and-rest-fundamentals.md`.

- Q1. What is Rest Assured?
- Q2. given/when/then, request/response spec, full CRUD example
- Q3. How do you validate a response body?
- Q4. How do you validate schema?
- Q5. RequestSpecification / ResponseSpecification reuse
- Q6. Path/query/form params, headers, cookies, multipart
- Q7. Logging and the secrets trap
- Q8. Filters (Filter interface)
- Q9. Authentication methods in Rest Assured
- Q10. SSL: relaxedHTTPSValidation and custom certs
- Q11. Serialization/deserialization with Jackson
- Q12. Extracting values and chaining — and why chaining tests is a smell
- Q13. Response time assertions
- Q14. Rest Assured vs other HTTP clients and tools
- Q15. Parallel Rest Assured tests — thread safety
- Q16. Organizing an API test framework

### Q1. What is Rest Assured? BDD-ish given/when/then over Apache HttpClient. Why Java shops use it.

**Interview answer** — Rest Assured is a Java DSL for testing HTTP APIs. You describe a request with `given()`, send it with `when()`, and assert with `then()` — BDD-flavored, but it is not a BDD framework like Cucumber. Underneath, Rest Assured 5.x still speaks HTTP via Apache HttpClient, then layers Groovy JsonPath/GPath, Hamcrest matchers, and optional Jackson serialization. Java shops use it because it lives in the same Maven/Gradle build as the service, pairs with JUnit 5 or TestNG, and lets SDETs share POJOs and Jackson config with the application.

**Deep dive** — Architecture in one paragraph: your test code → Rest Assured DSL (`RequestSpecification`) → filters → Apache HttpClient → wire. The response flows back through filters into a `Response` that can be asserted in-place (`then()`) or extracted. Groovy is on the classpath because JsonPath expressions (`items.findAll { it.status == 'PAID' }`) are GPath. Rest Assured 5.x moved onto Groovy 4; that matters when a shop's Groovy 2 plugins collide.

Why Java shops pick it over "just HttpClient":
- Fluent assertions on JSON without hand-rolling ObjectMapper + AssertJ for every call.
- First-class specs, auth helpers, multipart, cookies, SSL knobs.
- Same language as Spring services — reuse DTOs, Testcontainers, and security test fixtures.
- Familiar to a decade of SDETs; hiring and examples are cheap.

What it is not: a load tool, a contract broker, a mock server, or a test runner. You still need JUnit/TestNG, and you still need WireMock/Pact/Gatling for those jobs. Compared with Spring `WebTestClient`, Rest Assured is **out-of-process** (real HTTP) unless you use the `spring-mock-mvc` module; that distinction is the usual follow-up in Spring shops.

**Code**

```java
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

given()
    .baseUri("https://api.shop.example.com")
    .auth().oauth2(accessToken)
    .contentType(ContentType.JSON)
.when()
    .get("/orders/{id}", "ord_1")
.then()
    .statusCode(200)
    .body("status", equalTo("PAID"));
```

**Follow-ups & traps**
- "Is it BDD?" — It's a BDD-*style* DSL. No Gherkin unless you wrap it yourself. Saying "we do BDD because Rest Assured" is a trap.
- "What HTTP engine?" — Apache HttpClient 4.x in 5.x. Not Java 11 `HttpClient`, not OkHttp.
- "Does it require Groovy code?" — Tests can be pure Java; Groovy is a dependency for JsonPath.
- Trap: citing Rest Assured 2.x APIs (`expect()` as the entry point) in a 5.x interview.

**One-liner** — Rest Assured is a Java HTTP-testing DSL (given/when/then) on Apache HttpClient plus JsonPath — chosen because it sits naturally in Java builds next to JUnit and Jackson.

### Q2. given/when/then / request/response spec. Full CRUD example (create order, get, update, delete) with assertions.

**Interview answer** — `given()` builds the request (headers, body, params, auth), `when()` selects the method and URL, `then()` asserts status, headers, and body. I keep shared environment concerns on a `RequestSpecification` and shared success checks on a `ResponseSpecification`, then write each test as the delta: this path, this body, these assertions. A CRUD test should assert *resource lifecycle*, not four unrelated 200s — the GET after POST must see the same id, PATCH must not blank omitted fields, DELETE must make GET return 404.

**Deep dive** — You can omit `when()` (`given().get("/orders")`); I keep it in interviews because it reads as arrange/act/assert. `given()` returns a spec you can reuse; calling `when()` after more `given()` configuration is invalid once the request is sent.

CRUD caveats that make the example senior:
- POST asserts `201` + `Location` + body id.
- GET uses that id, not a fixture guessed from QA.
- PUT/PATCH: show you know the difference (file 01 Q2).
- DELETE: assert subsequent GET 404; second DELETE is still idempotent at the resource level.
- Don't put all four in one `@Test` for a large suite (Q12); for a whiteboard CRUD story, one flow is acceptable if you say you'd split them with a factory.

**Code**

```java
@Test
void orderCrudLifecycle() {
    RequestSpecification shop = new RequestSpecBuilder()
        .setBaseUri("https://api.shop.example.com")
        .setBasePath("/v1")
        .setContentType(ContentType.JSON)
        .addHeader("Authorization", "Bearer " + token)
        .setConfig(config().logConfig(logConfig().blacklistHeader("Authorization")))
        .build();

    ResponseSpecification created = new ResponseSpecBuilder()
        .expectStatusCode(201)
        .expectContentType(ContentType.JSON)
        .expectBody("id", notNullValue())
        .build();

    String id = given().spec(shop)
        .body("""
            {"customerId":"usr_9","items":[{"sku":"SKU-1","qty":1}]}
            """)
    .when().post("/orders")
    .then().spec(created)
        .body("status", equalTo("CREATED"))
        .extract().path("id");

    given().spec(shop)
    .when().get("/orders/{id}", id)
    .then().statusCode(200)
        .body("id", equalTo(id))
        .body("items[0].sku", equalTo("SKU-1"));

    given().spec(shop)
        .body("{\"status\":\"CANCELLED\"}")
    .when().patch("/orders/{id}", id)
    .then().statusCode(200)
        .body("status", equalTo("CANCELLED"))
        .body("items[0].qty", equalTo(1));

    given().spec(shop)
    .when().delete("/orders/{id}", id)
    .then().statusCode(anyOf(is(200), is(204)));

    given().spec(shop)
    .when().get("/orders/{id}", id)
    .then().statusCode(404);
}
```

**Follow-ups & traps**
- "given/when/then vs request()/response()?" — `request()` is the same spec without BDD names; `response()` starts assertions on an already-executed `Response`. Interviewers accept either; be consistent.
- Trap: `RestAssured.baseURI` mutated in one test and leaking into another (Q15). Prefer specs.
- Path style: `get("/orders/{id}", id)` and `pathParam("id", id)` are both valid in 5.x.
- Don't assert DELETE 200 if the API returns 204 — pin the documented code.

**One-liner** — given builds, when sends, then asserts; specs hold the shared pieces; CRUD is only convincing if GET/PATCH/DELETE observe the same id you created.

### Q3. How do you validate a response body? jsonPath, hamcrest matchers, POJO deserialization (as(Order.class)), JsonPath collections.

**Interview answer** — Three layers I stack. Hamcrest + JsonPath in `then().body("status", equalTo("PAID"))` for a few critical fields. Groovy collection expressions for lists: `items.findAll { it.qty > 0 }.size()`. And `extract().as(Order.class)` (or `jsonPath().getList("items", Item.class)`) when I want typed AssertJ on a real object. I do not deserialize a 200-field payload to assert one enum — JsonPath is cheaper and the failure message points at the path.

**Deep dive** — Rest Assured JsonPath is Groovy GPath over the parsed JSON (or XML). Dots are object navigation, `[0]` is index, `find`/`findAll`/`collect`/`sum`/`max` are Groovy. Hamcrest matchers (`equalTo`, `hasItems`, `everyItem`, `greaterThan`, `notNullValue`, `hasSize`) are the assertion vocabulary inside `body(path, matcher)`.

POJO path: Jackson maps the body to `Order`. Failures become `MismatchedInputException` — worse diagnostics than `body("status", equalTo(...))` unless you also keep a schema check. Use POJOs when the test's *logic* is on the object (totals, filtering in Java) or when you pass the result into another client method.

Collections:
- `body("items.id", hasItems("ord_1"))` — extracts a list of `id` from each element.
- `body("items.size()", equalTo(2))`
- `body("items.findAll { it.status == 'PAID' }.size()", equalTo(1))`
- `jsonPath().getList("items.findAll { it.qty > 1 }.sku")`

Root arrays: `body("[0].id", notNullValue())` or `as(Order[].class)`.

Don't: `body(equalTo(entireJsonString))` — whitespace, key order, timestamps.

**Code**

```java
given().auth().oauth2(token)
.when().get("/orders/{id}", orderId)
.then()
    .statusCode(200)
    .body("id", equalTo(orderId))
    .body("status", equalTo("PAID"))
    .body("items.size()", equalTo(2))
    .body("items.sku", hasItems("SKU-1", "SKU-2"))
    .body("items.findAll { it.qty > 1 }.size()", greaterThanOrEqualTo(1))
    .body("total", equalTo(5997));

Order order = given().auth().oauth2(token)
    .when().get("/orders/{id}", orderId)
    .then().statusCode(200)
    .extract().as(Order.class);
assertThat(order.items()).allMatch(i -> i.qty() > 0);

List<String> paidIds = given().auth().oauth2(token)
    .queryParam("customerId", customerId)
    .when().get("/orders")
    .then().extract().jsonPath()
    .getList("items.findAll { it.status == 'PAID' }.id");
```

**Follow-ups & traps**
- "jsonPath vs `body()`?" — `body(path, matcher)` *is* JsonPath. `response.jsonPath()` is the same engine when you need a Java value.
- Trap: `items[0]` on an unordered list — flake. `find { it.sku == 'SKU-1' }.qty` is stable.
- Groovy vs Java: `{ it.status == 'PAID' }` only works inside Rest Assured's Groovy-evaluated paths, not in a Java lambda you pass to `body()`.
- Numeric types: JSON `10` may arrive as `Integer` or `Float`; `equalTo(10)` vs `equalTo(10.0f)` is a classic false failure — use `equalTo(10)` with `Integer` or Hamcrest `comparesEqualTo`.

**One-liner** — JsonPath + Hamcrest for targeted fields and collections, POJOs when you need typed logic — never stringify-compare the whole payload.

### Q4. How do you validate schema? matchesJsonSchemaInClasspath (JSON Schema). What schema validation does and does not catch.

**Interview answer** — Rest Assured's `json-schema-validator` module (separate artifact, same 5.x version) exposes `matchesJsonSchemaInClasspath("schemas/order-v1.json")` as a Hamcrest matcher on the body. I run it on success responses — and on error envelopes — to catch missing fields, type changes, and enum drift before any field assertion. Schema does **not** catch business lies: wrong total, broken authz, or "PAID can still be cancelled." Those stay as explicit `body(...)` or DB checks.

**Deep dive** — JSON Schema (draft 04/07/2019-09/2020-12 depending on the validator version bundled) describes types, `required`, `enum`, `minLength`, `$ref`, `additionalProperties`. Rest Assured 5.x uses Francis Galiegue's `json-schema-validator` under `io.restassured.module.jsv.JsonSchemaValidator`.

Does catch:
- `id` removed or turned into a number
- new required field the consumer doesn't know about (if you require it)
- extra fields if `additionalProperties: false`
- enum `status` gaining a typo `PAIDD`

Does not catch:
- HTTP status / headers
- semantic rules (`total == sum(items)`)
- authorization
- ordering, pagination completeness
- performance
- whether the example in the schema's `"examples"` matches production (examples are not constraints unless you use a custom keyword)

Practice: store schemas in `src/test/resources/schemas/`, version them (`order-v1.json`), generate from OpenAPI when possible so they don't drift from the spec. Keep `additionalProperties` explicit — `true` (default in draft-04) lets unknown fields through, which may be what you want for forward compatibility.

**Code**

```java
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;

given().auth().oauth2(token)
.when().get("/orders/{id}", orderId)
.then()
    .statusCode(200)
    .body(matchesJsonSchemaInClasspath("schemas/order-v1.json"))
    .body("total", equalTo(expectedTotal)); // schema will not check this arithmetic
```

**Follow-ups & traps**
- Trap: forgetting the `json-schema-validator` dependency and wondering why the import doesn't exist — it is **not** inside `rest-assured.jar`.
- "Draft version mismatch" — a 2020-12 schema with a draft-04 engine fails opaquely. Pin drafts in the file (`"$schema"`) and in the module version.
- Error bodies need their own schema (`error-v1.json` with `code`, `message`, `requestId`).
- Schema that is a copy-paste of one happy payload with every field `required` will fail on optional nulls — that's a bad schema, not a bad API.

**Senior/lead angle** — Schema in the PR gate is the cheapest contract net. Generate it from OpenAPI in CI so SDETs aren't hand-editing JSON Schema. Do not let schema tests replace CDC (Pact) or a handful of business Rest Assured tests.

**One-liner** — `matchesJsonSchemaInClasspath` catches shape and types; it will never catch a wrong total, a missing 403, or a broken state machine — you still write those assertions.

### Q5. RequestSpecification / ResponseSpecification reuse (base URI, headers, auth, expected status).

**Interview answer** — A `RequestSpecification` is a reusable, preconfigured request: base URI, JSON content type, auth, correlation-id filter, logging config. A `ResponseSpecification` is a reusable bundle of expectations: status 200, JSON content type, maybe a schema. I build them once per client/environment with `RequestSpecBuilder` / `ResponseSpecBuilder`, then `given().spec(req).when().get(...).then().spec(okJson)`. I do not hang shared mutable state on `RestAssured.baseURI` statics if tests run in parallel.

**Deep dive** — Specs compose: `given().spec(base).spec(withIdempotencyKey).body(...)`. Later specs override earlier values for the same setter. `ResponseSpecification` is easy to overuse — if every test `expectStatusCode(200)`, POST creates start failing mysteriously. Split: `json200`, `json201`, `noContent204`, `clientError`.

Auth on the spec: fine for a service-account token that lives for the worker. User-specific tokens belong on a per-test spec or a method `givenBuyer()` that copies the base and adds `Authorization`. Copying: `new RequestSpecBuilder().addRequestSpecification(base).addHeader(...).build()` so you don't mutate the shared base (Q15).

Response specs can include Hamcrest body matchers, but I keep those test-specific; shared response specs stay protocol-level (status, content-type, `X-Request-Id` echoed).

**Code**

```java
public final class ShopSpecs {
    public static RequestSpecification base(String token) {
        return new RequestSpecBuilder()
            .setBaseUri(Config.baseUri())
            .setBasePath("/v1")
            .setContentType(ContentType.JSON)
            .setAccept(ContentType.JSON)
            .addHeader("Authorization", "Bearer " + token)
            .setConfig(config().logConfig(
                logConfig().blacklistHeader("Authorization", "Cookie")))
            .addFilter(new RequestIdFilter())
            .build();
    }

    public static ResponseSpecification jsonOk() {
        return new ResponseSpecBuilder()
            .expectStatusCode(200)
            .expectContentType(ContentType.JSON)
            .expectHeader("X-Request-Id", not(emptyOrNullString()))
            .build();
    }
}

// usage
given().spec(ShopSpecs.base(buyerToken))
    .pathParam("id", orderId)
.when().get("/orders/{id}")
.then().spec(ShopSpecs.jsonOk())
    .body("status", equalTo("PAID"));
```

**Follow-ups & traps**
- Trap: `RestAssured.requestSpecification = ...` global static plus parallel tests with different tokens.
- Mutating a shared spec: `base.header("Authorization", tokenB)` overwrites token A for everyone. Always copy.
- Response spec with status 200 applied to DELETE 204 — the failure looks like a product bug.
- `spec()` vs merging maps of headers — builders are the 5.x-readable form.

**One-liner** — Request specs own environment, auth, and headers; response specs own protocol-level expectations; copy them per test, don't mutate a global `RestAssured.*`.

### Q6. Path/query/form params, headers, cookies, multipart file upload.

**Interview answer** — Path params fill `{placeholders}` in the URL, query params append `?k=v`, form params build `application/x-www-form-urlencoded` bodies, headers are metadata, cookies are `Cookie`/`Set-Cookie`, and multipart is `multiPart(...)` for files. The usual Rest Assured bugs are using `formParam` while `Content-Type` is JSON, concatenating path ids without encoding, and forgetting that cookies are not auto-replayed without a `SessionFilter`.

**Deep dive** — API surface (5.x):

- Path: `.pathParam("orderId", id)` with `get("/orders/{orderId}")`, or `get("/orders/{orderId}", id)`. Maps: `pathParams(map)`.
- Query: `.queryParam("status", "PAID")`, repeated keys `.queryParam("sku", "A", "B")` → `sku=A&sku=B`. Don't put JSON in query params.
- Form: `.contentType(ContentType.URLENC).formParam("grant_type", "client_credentials")`. This is a **body**.
- Headers: `.header`, `.headers(map)`, `.accept`, `.contentType`.
- Cookies: `.cookie("JSESSIONID", v)`, `.cookies(...)`. Read with `then().cookie(...)` or `extract().detailedCookie("JSESSIONID")` for `HttpOnly`/`Secure`.
- Multipart: `.multiPart("file", new File("inv.pdf"), "application/pdf")`, additional parts for metadata. Don't set `Content-Type` to JSON; Rest Assured sets `multipart/form-data` with a boundary. Control names must match the API (`file` vs `upload`).

Encoding: `pathParam` encodes `/` in ids (`ord/1` → `ord%2F1`) depending on config (`encoderConfig().encodePredefinedChars`). String-concat paths skip that — a directory traversal or 404 waiting to happen.

**Code**

```java
given().spec(base)
    .pathParam("userId", "usr_9")
    .queryParam("status", "PAID")
    .queryParam("limit", 20)
    .header("If-None-Match", etag)
    .cookie("locale", "en-GB")
.when().get("/users/{userId}/orders")
.then().statusCode(200);

given()
    .contentType(ContentType.URLENC)
    .formParam("grant_type", "password")
    .formParam("username", "buyer@example.com")
    .formParam("password", password)
.when().post("/oauth/token")
.then().statusCode(200);

given().spec(base)
    .multiPart("file", new File("invoices/inv-1001.pdf"), "application/pdf")
    .multiPart("kind", "VAT")
.when().post("/orders/{id}/attachments", orderId)
.then().statusCode(201)
    .body("filename", equalTo("inv-1001.pdf"));
```

**Follow-ups & traps**
- `queryParam` vs `formParam` — if it's in the URI after `?`, it's query; if it's the body of a form POST, it's form. OAuth token endpoints are form.
- Trap: `contentType(JSON)` + `multiPart` — the server sees JSON and no file.
- Cookie assertions: `then().cookie("JSESSIONID")` only checks presence; use `DetailedCookie` for flags.
- Repeated query params: some APIs want `status=PAID,OPEN` as one param — that's a different contract.

**One-liner** — Path identifies, query filters, form encodes a body, headers/cookies carry metadata, multipart sends files — mixing those Rest Assured methods is the most common 400 you will write yourself.

### Q7. Logging: log().all(), filters, never logging Authorization (the secrets trap).

**Interview answer** — `given().log().all()` dumps the request; `then().log().all()` dumps the response; `log().ifValidationFails()` is what I actually leave on in CI so green tests stay quiet. Rest Assured will print `Authorization` and `Cookie` unless I blacklist them via `LogConfig`. I also attach the redacted dump to Allure on failure through a filter. Logging secrets is a production incident if CI artifacts are world-readable — I've seen tokens harvested from a "debug" HTML report.

**Deep dive** — `log()` on the request spec is a `RequestLoggingFilter` under the hood; on `then()` it's a `ResponseLoggingFilter`. `LogDetail` can be `ALL`, `HEADERS`, `BODY`, `PARAMS`, `URI`, `METHOD`, `STATUS`. Prefer `ifValidationFails(LogDetail.ALL)` plus `RestAssured.enableLoggingOfRequestAndResponseIfValidationFails()` for a global default.

Blacklist (5.x):

```java
RestAssured.config = config().logConfig(
    logConfig()
        .blacklistHeader("Authorization", "Cookie", "Set-Cookie")
        .blacklistDefaultHeaders() // optional extras depending on version
);
```

Blacklisted values print as `[ BLACKLISTED ]`. Blacklisting is case-insensitive in current 5.x. Body secrets: JSON `{"cardNumber":"..."}` is **not** a header — you need a custom filter that redacts known JSON paths before logging, or you never log bodies of payment endpoints.

`PrettyPrint` can explode memory on large downloads; don't `log().all()` on `GET /reports/export.csv`.

**Code**

```java
@BeforeAll
static void redactAndLogOnFailure() {
    RestAssured.config = config().logConfig(
        logConfig().blacklistHeader("Authorization", "Cookie", "Set-Cookie"));
    RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
}

given().spec(base)
    .log().ifValidationFails()
.when().post("/payments")
.then()
    .log().ifValidationFails()
    .statusCode(201);
```

**Follow-ups & traps**
- Trap: "we only log on failure" but the failure report includes the full Authorization header. Blacklist is independent of when you log.
- `log().all()` in a `@BeforeEach` on a 500-test parallel suite — unreadable CI logs and leaked PII.
- Allure `@Attachment` of `response.asString()` on `/users` — GDPR. Redact or attach ids only.
- `print()` vs `log()` — `prettyPrint()` returns a string and always prints; easy to leave on.

**Senior/lead angle** — Secret hygiene is a framework default, not a test-author convention. Leads add a unit test that a logged request cannot contain `Bearer eyJ`.

**One-liner** — Log on failure, blacklist `Authorization` and cookies, never dump payment bodies — `log().all()` without a blacklist is how tokens escape CI.

### Q8. Filters (Filter interface) — logging filter, auth refresh filter. Architecture use.

**Interview answer** — A Rest Assured `Filter` is middleware around the HTTP call: `filter(request, responseSpec, ctx)` and you either `ctx.next(...)` or short-circuit. That's how logging, correlation ids, auth refresh, and Allure attachments are implemented without touching every test. I register filters on the shared request spec so application tests stay unaware. An auth-refresh filter retries once on 401 after fetching a new token — carefully, and never on non-idempotent POSTs without an idempotency key.

**Deep dive** — `Filter`, `OrderedFilter` (run order), `FilterContext.next()`. Request is a `FilterableRequestSpecification` — you can add headers before `next`. After `next`, you have a `Response` you can inspect and optionally call `next` again (retry). Infinite retry on 401 is a well-known outage pattern (refresh endpoint also 401s → storm).

Architecture uses:
- **RequestIdFilter** — if missing, set `X-Request-Id`.
- **Redacting logging filter** — wrap `RequestLoggingFilter` with a blacklist + JSON redaction.
- **Auth refresh** — on 401, refresh, `replaceHeader("Authorization", ...)`, retry once.
- **AllureFilter** — attach method, URI, redacted headers, body on non-2xx.
- **MetricsFilter** — count status classes for a suite dashboard.

Filters are the right place for cross-cutting concerns; they are the wrong place for business assertions.

**Code**

```java
public final class AuthRefreshFilter implements Filter {
    private final TokenSource tokens;

    @Override
    public Response filter(FilterableRequestSpecification req,
                           FilterableResponseSpecification res,
                           FilterContext ctx) {
        Response response = ctx.next(req, res);
        if (response.statusCode() != 401 || req.getURI().contains("/oauth/token")) {
            return response;
        }
        String fresh = tokens.refresh();
        req.replaceHeader("Authorization", "Bearer " + fresh);
        return ctx.next(req, res); // exactly one retry
    }
}

public final class RequestIdFilter implements Filter {
    @Override
    public Response filter(FilterableRequestSpecification req,
                           FilterableResponseSpecification res,
                           FilterContext ctx) {
        if (req.getHeaders().get("X-Request-Id") == null) {
            req.header("X-Request-Id", UUID.randomUUID().toString());
        }
        return ctx.next(req, res);
    }
}

// registration
new RequestSpecBuilder().addFilter(new RequestIdFilter())
    .addFilter(new AuthRefreshFilter(tokens))
    .addFilter(new AllureRestFilter())
    .build();
```

**Follow-ups & traps**
- Order matters: request-id before logging, logging before Allure, refresh before logging the retry.
- Trap: refresh filter retries POST `/payments` without preserving `Idempotency-Key` — duplicate charge.
- Filters on `RestAssured.filters(...)` are global and surprise tests that wanted a raw call (health checks, the token endpoint).
- Don't do `Thread.sleep` inside filters for 429; a dedicated backoff policy with a cap belongs there if anywhere.

**Senior/lead angle** — The client layer is a spec plus an ordered filter chain. That's the same idea as servlet filters / OkHttp interceptors; describing it that way lands with backend interviewers.

**One-liner** — Filters are Rest Assured's interceptor chain: logging, correlation, token refresh, attachments — shared on the spec, forbidden as a place to hide business asserts.

### Q9. Authentication methods in RA: basic, digest, oauth2, preemptive vs challenged. bearerToken.

**Interview answer** — Rest Assured can send Basic (preemptive or challenged), Digest, and OAuth2 bearer tokens via `auth()`. Preemptive Basic puts `Authorization: Basic ...` on the first request; challenged waits for a `401` + `WWW-Authenticate` and then retries — an extra round trip, and a problem if the API returns 403 instead of 401. There is no method named `bearerToken()`; `auth().oauth2(accessToken)` is the 5.x way to send `Authorization: Bearer <token>`. API keys are just headers.

**Deep dive**

| Helper | Wire behavior |
| --- | --- |
| `auth().basic(user, pass)` | Challenged Basic — wait for 401 |
| `auth().preemptive().basic(user, pass)` | Header on the first request |
| `auth().digest(user, pass)` | RFC 2617 digest after challenge |
| `auth().oauth2(token)` | `Authorization: Bearer {token}` (preemptive header in current 5.x) |
| `auth().preemptive().oauth2(token)` | Explicit preemptive bearer |
| `header("X-API-Key", key)` | Not an `auth()` scheme |
| `auth().certificate(...)` | Client cert (mTLS-related) |

Challenged vs preemptive: many JSON APIs never send `WWW-Authenticate` and never use the HTTP challenge dance — they return 401 JSON. Challenged Basic then never sends credentials. **Always preemptive** unless you are testing a legacy servlet that truly challenges.

OAuth2 *flows* (authorization code, client credentials) are not implemented by `auth().oauth2` — that helper only attaches an access token you already obtained. You still POST the token URL (form-urlencoded) yourself (file 03).

Never put Basic credentials in the URL (`https://user:pass@host`) in tests you log; use the DSL.

**Code**

```java
// Preemptive Basic — admin tools, actuator
given().auth().preemptive().basic("admin", adminPassword)
    .when().get("/admin/orders")
    .then().statusCode(200);

// Bearer — there is no bearerToken(); oauth2() is Bearer
given().auth().oauth2(accessToken)
    .when().get("/orders")
    .then().statusCode(200);

// Equivalent explicit header
given().header("Authorization", "Bearer " + accessToken)
    .when().get("/orders")
    .then().statusCode(200);

// Obtain the token, then attach it
String accessToken = given()
    .contentType(ContentType.URLENC)
    .auth().preemptive().basic(clientId, clientSecret)
    .formParam("grant_type", "client_credentials")
    .formParam("scope", "orders:read")
.when().post("/oauth/token")
.then().statusCode(200)
    .extract().path("access_token");
```

**Follow-ups & traps**
- Trap: `auth().basic` against an API that doesn't challenge → 401 forever even with good passwords.
- Trap: calling `oauth2()` a full OAuth implementation. It's a header helper.
- Digest over HTTP is still plaintext-equivalent for many attacks; only relevant on legacy.
- "bearerToken" as a variable name is fine; as a Rest Assured API it doesn't exist — say `oauth2`.

**One-liner** — Preemptive Basic for challenge-less APIs, `auth().oauth2(token)` for Bearer (no `bearerToken()` method), and real OAuth flows are extra POSTs you write yourself.

### Q10. SSL: relaxedHTTPSValidation(), custom certs, why QA envs have bad certs and the risk of relaxing in a shared framework.

**Interview answer** — `relaxedHTTPSValidation()` tells Rest Assured to skip certificate authenticity and hostname verification. QA has bad certs because internal CAs aren't in the JVM truststore, SANs don't match `api.qa.internal`, or someone used a self-signed leftover. I will use a custom `trustStore()` (and `keyStore()` for mTLS) for those environments. I will not set relax globally in a shared framework — that trains every suite to ignore MITM and hides cert expiry until production.

**Deep dive** — Rest Assured SSL config sits on `SSLConfig`: truststore, keystore, `allowAllHostnames()`, `relaxedHTTPSValidation()`. Relax is equivalent to "trust anyone, don't check the name." That is appropriate for an ephemeral localhost with a generated cert in a named `local` profile. It is not appropriate as `RestAssured.useRelaxedHTTPSValidation()` in `BaseTest` used by 30 services.

Why QA certs are messy: short-lived ACM certs not synced to a private hostname, Docker compose with `localhost` certs accessed via `host.docker.internal`, corporate proxies intercepting TLS with a MITM CA developers installed in the *browser* but not in `cacerts`.

Risk of relax in a shared lib: a test against `https://orders.prod.example.com` from a misconfigured env file still "works" through a proxy that presented a bogus cert. You also won't notice QA cert expiry — ops will, during a customer demo.

**Code**

```java
// Environment-specific trust, hostname verification ON
given()
    .trustStore(Config.qaTrustStore(), Config.trustStorePassword())
    .baseUri("https://api.qa.shop.internal")
.when().get("/health")
.then().statusCode(200);

// mTLS
given()
    .keyStore(Config.clientP12(), Config.p12Password())
    .trustStore(Config.qaTrustStore(), Config.trustStorePassword())
.when().get("https://payments.qa.shop.internal/health")
.then().statusCode(200);

// Allowed only behind an explicit local profile
if (Config.env() == Env.LOCAL) {
    given().relaxedHTTPSValidation().get("https://localhost:8443/health");
}
```

**Follow-ups & traps**
- Handshake exception vs HTTP 401 — TLS never became HTTP.
- Trap: `--insecure` in curl as the mental model for the Java framework default.
- `allowAllHostnames()` with a real truststore still skips name matching — almost as dangerous as full relax if DNS is attacker-controlled.
- Corporate SSL inspection: install the proxy CA in the truststore; don't relax.

**Senior/lead angle** — Cert strategy is platform engineering: inject a trust bundle into CI images. The test framework should consume `SSL_TRUSTSTORE_PATH`, not contain `relaxedHTTPSValidation()`.

**One-liner** — QA certs fail because the JVM doesn't trust them; fix the truststore (and keystore for mTLS), and never make `relaxedHTTPSValidation()` the shared default.

### Q11. Serialization/deserialization with Jackson; ObjectMapper config; date formats.

**Interview answer** — Rest Assured 5.x uses Jackson 2 by default to turn POJOs into JSON bodies and JSON into POJOs via `body(order)` and `as(Order.class)`. If dates, `BigDecimal` money, or `UNKNOWN_PROPERTIES` aren't configured, tests fail in ways that look like API bugs. I register a single `ObjectMapper` through `objectMapperConfig().jackson2ObjectMapperFactory(...)` — the same shape of config the Spring app uses: `JavaTimeModule`, no timestamps, `WRITE_BIGDECIMAL_AS_PLAIN`, fail or ignore unknown properties deliberately.

**Deep dive** — Without config, Jackson writes `Instant` as a numeric timestamp and `LocalDate` as an array `[2026,9,3]` unless `JavaTimeModule` is registered. APIs almost always want ISO-8601 (`2026-09-03T13:00:00Z`). Money: `double` is forbidden; `BigDecimal` or integer cents. `FAIL_ON_UNKNOWN_PROPERTIES` true makes tests brittle to additive, backward-compatible fields; false hides removals you might have wanted schema to catch — that's why schema + mapper ignore-unknown is a common pair.

Records vs beans: Jackson 2.12+ works with records; Rest Assured 5.x is fine with them. Nested lists: `getList("items", Item.class)`.

Charset and `Content-Type` must stay `application/json` or Jackson never runs (you'll serialize a POJO `.toString()` if you do something wrong — actually Rest Assured uses the mapper based on content type).

**Code**

```java
public final class JacksonSupport {
    public static ObjectMapper mapper() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new JavaTimeModule());
        m.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        m.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        m.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        m.configure(JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN, true);
        return m;
    }
}

@BeforeAll
static void restAssuredJackson() {
    RestAssured.config = config().objectMapperConfig(
        objectMapperConfig().jackson2ObjectMapperFactory((type, charset) -> JacksonSupport.mapper()));
}

public record Item(String sku, int qty) {}
public record CreateOrderRequest(String customerId, List<Item> items) {}
public record Order(String id, String status, List<Item> items, Instant createdAt) {}

Order created = given().spec(base)
    .body(new CreateOrderRequest("usr_9", List.of(new Item("SKU-1", 2))))
.when().post("/orders")
.then().statusCode(201)
    .extract().as(Order.class);
```

**Follow-ups & traps**
- Trap: `equalTo("2026-09-03T13:00:00Z")` vs a POJO `Instant` that printed with nanos.
- Default timezone: `ZonedDateTime` without zone in the payload. Prefer `Instant` + `Z`.
- Two ObjectMappers (app vs tests) that disagree on `snake_case` vs `camelCase` — `PropertyNamingStrategies.SNAKE_CASE`.
- Gson on the classpath can steal the mapper if you don't pin Jackson in config.

**One-liner** — One Jackson `ObjectMapper` registered with Rest Assured: JavaTime ISO-8601, decimal money, and a conscious unknown-property policy — otherwise date arrays and float pennies show up as "API bugs."

### Q12. Extracting values and chaining (extract path token, use in next request) — and why chaining tests is a smell; prefer setup API in beforeEach.

**Interview answer** — `extract().path("access_token")`, `extract().as(Order.class)`, `extract().header("Location")` pull values into Java so the next call can use them. That's correct *inside* a test or a factory. Chaining across tests — `@Test void create()`, `@Test void get()` that depends on a static `id` from create — is a smell: order-dependent, parallel-unsafe, and a failure in create cascades as a mysterious 404 in get. I create data in `@BeforeEach` / a factory / Testcontainers seed, and each test starts from a known world.

**Deep dive** — Extract API: `extract().path()`, `.jsonPath()`, `.header()`, `.cookie()`, `.response()`, `.as(T)`, `.asString()`. `then().extract()` ends the assertion chain; you can also `then().statusCode(201).extract()`.

Inside one test, POST-then-GET is not a smell; it *is* the lifecycle assertion. The smell is **test methods as a workflow** (`dependsOnMethods` in TestNG is the red flag). Also smelly: a suite-wide `static String orderId` assigned in `@BeforeAll` and mutated.

Better:
- `OrderFixtures.createPaid(buyer)` returns an `Order` for this test.
- Cleanup in `@AfterEach` or by using unique customers that TTL.
- Auth token: worker-scoped cache with expiry, not a chain of `loginTest` → everything else.

When chaining *is* the product (multi-step BPM), still one test with Awaitility, or a dedicated flow object, not five JUnit methods.

**Code**

```java
// Good: extract inside a factory, tests stay independent
public final class OrderApi {
    public Order create(String token, CreateOrderRequest req) {
        return given().spec(ShopSpecs.base(token)).body(req)
            .when().post("/orders")
            .then().statusCode(201)
            .extract().as(Order.class);
    }
}

@BeforeEach
void seed() {
    order = orders.create(buyerToken, OrderFactory.oneItem("SKU-1"));
}

@Test
void getReturnsSeededOrder() {
    given().spec(ShopSpecs.base(buyerToken))
        .when().get("/orders/{id}", order.id())
        .then().statusCode(200).body("id", equalTo(order.id()));
}

@Test
void cancelSeededOrder() {
    given().spec(ShopSpecs.base(buyerToken))
        .when().post("/orders/{id}/cancel", order.id())
        .then().statusCode(200).body("status", equalTo("CANCELLED"));
}

// Smell: do not do this
// @Test void t1_create() { id = ... }
// @Test void t2_get() { get(id); }
```

**Follow-ups & traps**
- TestNG `dependsOnMethods` — interviewers treat it as a known anti-pattern for API suites.
- "But login is expensive" — cache the token at worker scope with a lock, don't make `testLogin` a dependency.
- Extract without asserting status first — you'll deserialize an error HTML as `Order`.
- Parallel: static extracted ids will cross wires (Q15).

**One-liner** — Extract freely inside a test or factory; never chain `@Test` methods through a shared id — seed in `beforeEach` so tests stay independent and parallel-safe.

### Q13. Response time assertions (time(lessThan)) — useful as a smoke signal, not a load test.

**Interview answer** — `then().time(lessThan(2000L), TimeUnit.MILLISECONDS)` fails if that single HTTP call is slower than the threshold. I use it as a canary on a few health-critical endpoints in a known environment, not as a performance program. It does not control warm-up, concurrency, percentiles, or server load — a laptop VPN and a loaded QA node will both false-fail. Load belongs in Gatling/k6/JMeter against a dedicated profile.

**Deep dive** — Rest Assured measures client-perceived round trip (DNS, TLS, TTFB, body download) on that one call. No percentile, no histogram, no baseline. CI runners with noisy neighbors make tight bounds flake. If you must: loose thresholds (p99-ish of historical *single-user* times, e.g. 2–5s), only `@smoke` on `GET /health` and `POST /orders` happy path, never on cold first calls without a warmup request.

Better signals: server-side APM (p95 of `POST /payments`), synthetic probes, and dedicated perf jobs. Time assertions in functional suites are a *regression tripwire* ("we accidentally added a 20s sleep"), not evidence the API meets an SLO.

**Code**

```java
given().spec(base)
.when().get("/health")
.then()
    .statusCode(200)
    .time(lessThan(2L), TimeUnit.SECONDS);

// Warmup then measure — still not a load test
given().spec(base).get("/orders/{id}", orderId);
given().spec(base)
.when().get("/orders/{id}", orderId)
.then().time(lessThan(800L), TimeUnit.MILLISECONDS);
```

**Follow-ups & traps**
- Trap: "our API tests prove p95 < 200ms" because every test has `time(lessThan(200))`. That's statistically meaningless and flaky.
- First call includes TLS handshake and JIT — exclude it or use a health warmup in `@BeforeAll`.
- Timeouts (`connectionTimeout`, `socketTimeout` in `HttpClientConfig`) are *limits*, not measurements. A timeout throws; `time()` asserts.

**One-liner** — `time(lessThan(...))` is a tripwire for catastrophic slowness on one call; it is not a load test and must not be your SLO evidence.

### Q14. Rest Assured vs HTTP libraries (Java 11 HttpClient, OkHttp, RestTemplate, WebTestClient) vs Playwright request fixture vs Postman/Newman — when each.

**Interview answer** — Rest Assured is a *test DSL* on HttpClient: assertions, specs, jsonPath. Java 11 `HttpClient` and OkHttp are general HTTP clients — you'd wrap them with AssertJ yourself. RestTemplate is a legacy Spring client (maintenance mode); `WebClient`/`RestClient` are the modern Spring ones. `WebTestClient` can bind to a Spring context **without** a real port (`MockMvc`/`bindToApplicationContext`) or to a live server — different test level. Playwright's `APIRequestContext` shines when the same test already drives a browser. Postman/Newman is for exploratory collections and lightweight CI, not for a Java domain model. I use Rest Assured for Java API suites; I don't force it where another tool is already the system's client.

**Deep dive**

| Tool | Process | Best for | Weak at |
| --- | --- | --- | --- |
| Rest Assured 5.x | Out-of-process HTTP | Java SDET API suites, jsonPath, specs | Browser-coupled flows, gRPC |
| Java 11 HttpClient | Out-of-process | Production clients, HTTP/2 | Fluent JSON asserts |
| OkHttp | Out-of-process | Interceptors, HTTP/2, Android-like | Test sugar |
| RestTemplate | Out-of-process | Legacy Spring | New work (frozen) |
| WebTestClient | In-process *or* live | Spring slice tests, WebFlux | Not a service-vs-real-gateway test if in-process |
| Playwright `request` | Out-of-process | API setup in a TS UI suite, cookie injection | Java shops, deep schema tooling |
| Postman/Newman | Out-of-process | Exploration, contract smoke for non-Java teams | Parallel scale, POJOs, code review of tests |

When interviewers ask "why not HttpClient?": you can, but you'll reinvent logging filters, auth refresh, and jsonPath. When they ask "why not only Playwright?": if the org's API tests must run in Maven next to Java services, Rest Assured wins; if the only automation is TS e2e, Playwright request is enough for setup/assert.

WebTestClient in-process will **not** catch nginx/gateway issues, TLS, or real filters. Call that a component test.

**Code**

```java
// Rest Assured — assertion-first
given().spec(base).when().get("/orders/{id}", id).then().body("status", equalTo("PAID"));

// Same call, Java 11 HttpClient — you own parsing
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create(Config.baseUri() + "/v1/orders/" + id))
    .header("Authorization", "Bearer " + token)
    .GET().build();
HttpResponse<String> res = HttpClient.newHttpClient().send(req, BodyHandlers.ofString());
Order order = JacksonSupport.mapper().readValue(res.body(), Order.class);
assertThat(order.status()).isEqualTo("PAID");
```

**Follow-ups & traps**
- Trap: comparing Rest Assured to JMeter. Different job.
- "RestTemplate vs Rest Assured" — one is an app client, one is a test DSL; Spring tests can use both (MockRestServiceServer vs live RA).
- Newman + Java services: possible, but diffs live in JSON collections that PR review handles poorly.

**One-liner** — Rest Assured for Java API test suites; HttpClient/OkHttp for production-style clients; WebTestClient for in-process Spring; Playwright request for UI-adjacent TS; Postman for humans — don't make one tool pretend to be the others.

### Q15. Parallel Rest Assured tests — thread safety (specs are typically fine if not mutated; don't share mutable tokens without ThreadLocal/fixtures).

**Interview answer** — Rest Assured specs are safe to *share* across threads if they are treated as immutable after `build()`. They are not safe if one test calls `spec.header("Authorization", otherUser)` on a static spec. Static `RestAssured.baseURI`, `RestAssured.authentication`, and a global `String token` are classic race conditions. I give each worker its own tokens via `ThreadLocal` or JUnit parallel-friendly factories, and unique test data (customer ids) so two threads don't cancel the same order.

**Deep dive** — JUnit 5 `junit.jupiter.execution.parallel.enabled=true` plus `same_thread` vs `concurrent`. Rest Assured's `given()` creates a new spec from defaults each time; the danger is the **defaults** (`RestAssured.requestSpecification`, `baseURI`, `filters()`) and your own statics.

Safe:
- Immutable `RequestSpecification` constants for URL, content-type, blacklisted logging.
- `given().spec(base).auth().oauth2(tokenForThisTest)`.
- ThreadLocal token cache keyed by role.
- Data factories using UUIDs.

Unsafe:
- `RestAssured.baseURI = ...` in `@BeforeEach`.
- Static `RequestSpecification AUTH` mutated with the last login.
- `@TestInstance(Lifecycle.PER_CLASS)` mutable fields with parallel methods.
- Shared `Order id` in the database without isolation (optimistic locking 409s look like product bugs).

HttpClient connection pools underneath *are* thread-safe; you don't need a client per thread. You need **data and config** isolation.

**Code**

```java
public final class Tokens {
    private static final ThreadLocal<String> BUYER = new ThreadLocal<>();

    public static String buyer() {
        String existing = BUYER.get();
        if (existing != null && !Jwt.isExpired(existing)) {
            return existing;
        }
        String fresh = AuthClient.clientCredentials("buyer-sdet");
        BUYER.set(fresh);
        return fresh;
    }
}

// immutable base — no auth header
static final RequestSpecification BASE = new RequestSpecBuilder()
    .setBaseUri(Config.baseUri())
    .setContentType(ContentType.JSON)
    .build();

given().spec(BASE).auth().oauth2(Tokens.buyer())
    .body(OrderFactory.unique())
    .when().post("/orders")
    .then().statusCode(201);
```

**Follow-ups & traps**
- "Is Rest Assured thread-safe?" — The DSL is if you don't mutate shared specs/statics. Blanket "yes" or "no" is weak.
- TestNG parallel `methods` with a superclass field `protected String token` filled in `@BeforeClass` — not thread-safe.
- Rate limits: parallel workers share a quota (file 01 Q12) — one key per worker.
- Don't synchronize the entire HTTP call; synchronize token refresh only.

**One-liner** — Share immutable specs, never mutate them; keep tokens and test data per thread; static `RestAssured.baseURI` and a global token are how parallel suites randomly 401.

### Q16. Organizing an API test framework: client layer, specs, POJOs, data factories, env config. Folder tree.

**Interview answer** — Tests should read like behaviors and never contain `baseUri` or raw JSON strings for core resources. A client layer wraps Rest Assured per service (`OrdersClient.create()`), specs hold protocol defaults, POJOs/records are the payload types, factories/builders produce unique valid data, and env config is typed and injected from CI. That structure is what lets fifty tests change auth in one filter and lets two teams not paste `given().header(...)` forever.

**Deep dive** — Dependency rule: tests → clients → specs/filters → Rest Assured. Tests may use factories. Clients do not import test classes. Config does not import clients.

Env config: `BASE_URI`, `OAUTH_TOKEN_URL`, truststore path, timeouts — from environment variables, never from a committed `application-secret.properties` with real passwords. One `Env` enum (`LOCAL`, `QA`, `STAGING`).

Factories vs builders: `OrderFactory.paidBuyerOrder()` for the common case; `OrderRequestBuilder` when a test needs a missing SKU or negative qty for negatives.

Reporting lives at the filter layer (Q8), not in tests.

**Code**

```text
api-tests/
├── pom.xml
├── src/test/java/com/shop/api/
│   ├── tests/                          # JUnit 5; one behavior per test
│   │   ├── orders/
│   │   │   ├── CreateOrderTest.java
│   │   │   ├── CancelOrderTest.java
│   │   │   └── OrderAuthzTest.java
│   │   └── payments/
│   │       └── IdempotentCaptureTest.java
│   ├── clients/                        # one class per service/resource
│   │   ├── OrdersClient.java
│   │   ├── PaymentsClient.java
│   │   └── AuthClient.java
│   ├── specs/
│   │   └── ShopSpecs.java
│   ├── filters/
│   │   ├── RequestIdFilter.java
│   │   ├── AuthRefreshFilter.java
│   │   └── AllureRestFilter.java
│   ├── model/                          # records / DTOs
│   │   ├── Order.java
│   │   └── CreateOrderRequest.java
│   ├── data/
│   │   ├── OrderFactory.java
│   │   └── OrderRequestBuilder.java
│   ├── config/
│   │   ├── Config.java                 # reads env vars, validates
│   │   └── JacksonSupport.java
│   └── support/
│       └── Tokens.java                 # ThreadLocal cache
└── src/test/resources/
    ├── schemas/
    │   ├── order-v1.json
    │   └── error-v1.json
    └── junit-platform.properties       # parallel config
```

```java
public final class OrdersClient {
    private final RequestSpecification spec;

    public OrdersClient(String token) {
        this.spec = ShopSpecs.base(token);
    }

    public Order create(CreateOrderRequest body) {
        return given().spec(spec).body(body)
            .when().post("/orders")
            .then().statusCode(201)
            .extract().as(Order.class);
    }
}
```

**Follow-ups & traps**
- Trap: a 2,000-line `BaseTest` with every helper. That's a dumping ground, not a client layer.
- "Where do assertions live?" — protocol asserts can live in the client (`create` expects 201); business asserts stay in the test so the client stays reusable for negative cases (`createExpecting(400)` or `raw()`).
- Monorepo: publish `clients` + `specs` as a JAR if many services share auth — version it.
- Don't put production package names only under `src/main` and then duplicate DTOs badly — either test-module DTOs or consume the API module.

**Senior/lead angle** — This tree is the template you stamp for each microservice: they own `tests/` and `clients/` for their service; auth, filters, config, and Jackson live in a shared `api-test-platform` library (file 04 Q14).

**One-liner** — Tests call clients; clients use immutable specs and filters; factories own data; config owns the environment — raw `given()` in a test class is a smell once you have more than one resource.
