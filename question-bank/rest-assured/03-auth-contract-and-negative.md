# Auth, Contract Testing, Negative & Failure Scenarios

This file is the "what do you do when it isn't the happy path" layer of Java + Rest Assured 5.x interviews: how you obtain and refresh tokens without a browser, OAuth2 and JWT at SDET depth, negative matrices, timeouts and 5xx, third-party instability, failure forensics, contract testing vocabulary, GraphQL, webhooks, DB verification, and file transfer. Happy-path CRUD from file 02 is assumed.

- Q1. How do you handle authentication in API automation?
- Q2. OAuth2 flows an SDET should be able to draw
- Q3. JWT: structure, what you assert, what you don't
- Q4. API keys, HMAC signatures, mTLS
- Q5. How do you test negative API scenarios?
- Q6. How do you test timeout / slow / 503 scenarios?
- Q7. How do you test an unstable third-party API?
- Q8. An API returns 500 — debug playbook
- Q9. How do you capture request/response details for failures?
- Q10. Contract testing: Pact / Spring Cloud Contract vs schema-only
- Q11. GraphQL testing with Rest Assured
- Q12. Webhook testing
- Q13. Database assertion after API
- Q14. Testing file upload/download APIs

### Q1. How do you handle authentication in API automation? (login once → token; refresh; service accounts; never UI for API tests)

**Interview answer** — API tests authenticate through the API: a service account or password grant hits `/oauth/token` (or a test-only token mint), I cache the access token until near `expires_in`, and I inject it on the Rest Assured spec. Refresh uses the refresh token or a new client-credentials call — still HTTP, no browser. I never open Selenium/Playwright to log in as setup for an API suite; that's slower, flakier, and couples API CI to the UI. Secrets come from the CI store, not the repo.

**Deep dive** — Patterns, in the order I'd recommend:

1. **Client credentials (service account)** — dedicated `sdet-orders` client with a tight scope. Best for CI. No user password. Token cached per worker (`ThreadLocal` or a synchronized holder with expiry minus 30s skew).
2. **Password grant / resource-owner** — only if the IdP still enables it for test users. Many IdPs disable it. Prefer a test-user password in the secret store over UI login.
3. **Authorization-code + test harness** — for "real" user tokens when policy forbids password grant: a small helper that talks to the IdP's test token endpoint, or a mocked IdP in component tests. Still not a UI.
4. **Pre-seeded long-lived JWT** — acceptable in hermetic Testcontainers with a test signing key; forbidden against shared QA if it bypasses the real IdP forever.

Refresh: if `expires_in` is 300s and the suite is 10 minutes, refresh. An `AuthRefreshFilter` (file 02 Q8) retries once on 401. Don't refresh on every request.

Roles: cache **per role** (`buyer`, `seller`, `admin`), not one god token. Authz tests are otherwise fake.

UI login for API tests: the only excuse is an org where the only IdP path is a SPA with CSRF and WebAuthn and no test token endpoint — then you still extract the token/cookie *once* in a setup job and reuse it; you don't boot a browser per `@Test`.

**Code**

```java
public final class AuthClient {
    public TokenPair clientCredentials(String scope) {
        return given()
            .contentType(ContentType.URLENC)
            .auth().preemptive().basic(Config.clientId(), Config.clientSecret())
            .formParam("grant_type", "client_credentials")
            .formParam("scope", scope)
        .when().post(Config.tokenUrl())
        .then().statusCode(200)
            .body("token_type", equalTo("Bearer"))
            .extract().as(TokenPair.class);
    }
}

// worker-scoped cache — not a UI
public final class TokenCache {
    public static synchronized String buyer() { /* mint or return if not near expiry */ }
}
```

**Follow-ups & traps**
- Trap: `WebDriver` login in `@BeforeAll` of an API module. Instant seniority hit.
- "Where is the password?" — CI secret / vault. `.env` committed to Git is a fail.
- One admin token for all tests — you cannot claim you tested 403.
- Token log leakage — blacklist `Authorization` (file 02 Q7).

**Senior/lead angle** — Platform provides `AuthClient` + vault integration; services don't invent login. Leads also provision IdP test clients as IaC so a new microservice doesn't wait a week for a client id.

**One-liner** — Mint and cache tokens over HTTP with service accounts, refresh before expiry, inject on the spec — never drive a UI to authenticate an API test.

### Q2. OAuth2 flows an SDET should be able to draw: client_credentials, authorization_code, refresh. Which you automate how.

**Interview answer** — Client credentials is machine-to-machine: `POST /token` with Basic client id/secret and `grant_type=client_credentials` — that's what CI API tests should use. Authorization code is the browser redirect dance: authorize → `code` → token; I automate it only when I must prove the real user flow, usually at UI or a dedicated IdP integration test, not in every orders test. Refresh is `grant_type=refresh_token` plus the refresh token — I automate that explicitly as its own test and as the cache's renewal path. I can draw the three sequence diagrams and say which Rest Assured suite uses which.

**Deep dive** — Draw these without notes:

**Client credentials**
```text
SDET client                    IdP                      API
    |-- POST /token (id+secret, grant=client_credentials) -->|
    |<-- access_token, expires_in, (rarely refresh) ----------|
    |-- GET /orders  Authorization: Bearer ------------------->|
```

**Authorization code** (public SPA uses PKCE)
```text
Browser  → GET /authorize?client_id&redirect_uri&code_challenge
User logs in / consents
Browser  ← 302 redirect_uri?code=
Client   → POST /token (code, code_verifier, client_id)
Client   ← access_token + refresh_token
```

**Refresh**
```text
Client → POST /token  grant_type=refresh_token&refresh_token=...
Client ← new access_token (+ rotating refresh_token)
```

What I automate with Rest Assured:
- Client credentials: **always**, the default for service tests.
- Refresh: a focused test (old access token 401s, refresh succeeds, reuse of a rotated refresh token fails if rotation is on).
- Authorization code: Rest Assured can follow redirects and POST the token URL, but **login/consent HTML** is not an API contract. Use UI tests, or an IdP test API that issues codes, or wiremock the IdP for *your* service's component tests.

Implicit grant is obsolete; don't propose it. Device code appears in TV/CLI apps — mention only if that's the product.

**Code**

```java
@Test
void refreshRotatesAccessToken() {
    TokenPair first = auth.passwordGrant(buyerUser, buyerPassword);

    TokenPair refreshed = given()
        .contentType(ContentType.URLENC)
        .formParam("grant_type", "refresh_token")
        .formParam("refresh_token", first.refreshToken())
        .auth().preemptive().basic(Config.clientId(), Config.clientSecret())
    .when().post(Config.tokenUrl())
    .then().statusCode(200)
        .extract().as(TokenPair.class);

    given().auth().oauth2(first.accessToken())
        .when().get("/orders").then().statusCode(401);

    given().auth().oauth2(refreshed.accessToken())
        .when().get("/orders").then().statusCode(200);
}
```

**Follow-ups & traps**
- "PKCE?" — S256 code_challenge on public clients; without it stolen `code`s are usable. API tests of SPAs should use PKCE if they simulate the SPA.
- Trap: storing forever-lived refresh tokens in Git.
- `auth().oauth2()` does not implement these flows — it only attaches a bearer.
- Scopes: a token without `payments:write` must 403 on capture — that's an OAuth test, not an orders test.

**One-liner** — Client credentials for CI service tests, authorization code for the real user redirect (rarely in RA), refresh as its own contract — `oauth2()` just sticks the resulting Bearer on the wire.

### Q3. JWT: structure (header.payload.sig), what you assert (exp, roles, issuer), what you don't (forging).

**Interview answer** — A JWT is three base64url segments: header (alg, typ), payload (claims), signature. I decode the payload in tests to assert `iss`, `aud`, `exp` is in the future, and `roles`/`scope` match what we asked for. I do **not** forge production-signed JWTs in a QA suite that hits a real IdP — I ask the IdP for a token. Forging is for hermetic tests where *we own the signing key* (Testcontainers IdP or a stub) to simulate expired/wrong-audience tokens. I also never treat "we decoded a JWT" as signature verification — decoding is not validating.

**Deep dive** — `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9`.`payload`.`sig`. Header `alg: none` or `HS256` with a leaked secret are historical attacks; SDETs should know `alg` confusion exists but we don't implement crypto in Rest Assured tests.

Claims to assert on a **token we just obtained**:
- `iss` equals our IdP
- `aud` equals the API (or the resource server)
- `exp` > now + some margin; `nbf` ≤ now
- `sub` / `cid` is the test user or client
- `scope` or `realm_access.roles` contains expected roles

What we don't do against a real environment:
- HS256-sign with a guessed secret
- Copy a production JWT into the repo
- "Validate" by only base64-decoding

Hermetic negative tests (in-process or Testcontainers API with a test JWKS):
- expired `exp`
- wrong `iss` / `aud`
- missing `scope`
- tampered payload with an invalid signature → 401, not 500

Libraries: `jjwt` or `nimbus-jose-jwt` to parse. Rest Assured has no JWT API.

**Code**

```java
String jwt = tokenPair.accessToken();
DecodedJWT decoded = JWT.decode(jwt); // parse only — does not verify sig
assertThat(decoded.getIssuer()).isEqualTo("https://idp.shop.example.com");
assertThat(decoded.getAudience()).contains("orders-api");
assertThat(decoded.getExpiresAt()).isAfter(Date.from(Instant.now().plusSeconds(60)));
assertThat(decoded.getClaim("scope").asString()).contains("orders:write");

given().auth().oauth2(jwt)
    .when().get("/orders")
    .then().statusCode(200);

// Hermetic: expired token minted with the TEST signing key, not stolen prod key
String expired = TestJwt.builder().exp(Instant.now().minusSeconds(30)).sign(testPrivateKey);
given().auth().oauth2(expired)
    .when().get("/orders")
    .then().statusCode(401);
```

**Follow-ups & traps**
- Trap: "I verify JWTs by splitting on dots and decoding JSON." That's parsing, not verification.
- `JWT.decode` vs `JWT.require(algorithm).build().verify` — know the difference.
- Roles in payload vs server-side lookup — if the API trusts `role: admin` in an unsigned claim, that's the defect; a test that forges it in hermetic mode proves the hole.
- Don't log JWTs; they're bearer credentials.

**One-liner** — Header.payload.sig — assert iss/aud/exp/roles on tokens you obtained; forge only with a test key in hermetic suites; decoding is not verifying.

### Q4. API keys, HMAC signatures, mTLS — brief how you'd test.

**Interview answer** — API keys are a shared secret in a header (`X-API-Key` or `Authorization: ApiKey`). I test present/valid/invalid/missing, that the key is not accepted in query params if the spec forbids it, and that a buyer key cannot hit admin routes. HMAC request signing (Stripe-style) means the test client must canonicalize the method, path, timestamp, and body and send `signature`; I test happy path, stale timestamp, mutated body, and replay. mTLS is a client certificate in the handshake — I test a trusted cert succeeds, a missing cert fails at TLS, and a wrong cert never becomes a 200.

**Deep dive**

**API keys** — easy to leak (query strings, logs). Tests: 200 with key, 401 without, 401 with wrong key, 403 with a different product's key. Rotate keys in staging and confirm the old key dies. Never print the key (blacklist the header).

**HMAC** — typically `timestamp + body` signed with HMAC-SHA256. Server rejects `timestamp` older than N minutes (replay window) and recomputes the signature. Test client shares the algorithm with production — if you "skip signing in QA," you aren't testing the security control. Cases: valid signature; body tampered after signing; timestamp skew; header missing; wrong secret. Webhook HMAC is the same idea inbound (Q12).

**mTLS** — Rest Assured `keyStore(p12, pass)` + `trustStore`. Failures are `SSLHandshakeException`, not JSON 401. Cases: good client cert; expired client cert; cert for a different service; server cert untrusted (separate from client). In Kubernetes, this may be mesh-level (Istio) — then the "API test" might never see mTLS if it enters via an ingress that terminates it. Say that: know *where* TLS is terminated.

**Code**

```java
given().header("X-API-Key", Config.ordersApiKey())
    .when().get("/orders").then().statusCode(200);

given().header("X-API-Key", "sk_live_bogus")
    .when().get("/orders").then().statusCode(401);

String ts = String.valueOf(Instant.now().getEpochSecond());
String sig = Hmac.sha256(Config.hmacSecret(), ts + "." + rawJson);
given().header("X-Timestamp", ts)
    .header("X-Signature", sig)
    .contentType(ContentType.JSON)
    .body(rawJson)
.when().post("/payments")
.then().statusCode(201);

given().keyStore("sdet-client.p12", p12Pass)
    .trustStore("qa-ca.jks", trustPass)
.when().get("https://payments.internal/health")
.then().statusCode(200);
```

**Follow-ups & traps**
- Trap: putting API keys in the query string "because Rest Assured queryParam is easier."
- HMAC tests that use a server-side "skip-verify" header in QA — the control is off; test is theatre.
- mTLS 401 confusion — if you got an HTTP status, mTLS already succeeded.

**One-liner** — Keys are headers you rotate and never log; HMAC tests the canonical string and replay window; mTLS is a handshake (keystore) and fails before HTTP.

### Q5. How do you test negative API scenarios? (400 validation matrix, 401/403, 404, 409 conflict, 422, malformed JSON, extra fields, type coercion)

**Interview answer** — Negatives are a matrix, not one "bad request" test. I separate **parse errors** (malformed JSON, wrong Content-Type) from **semantic validation** (qty -1, unknown SKU) from **authn/authz** (no token, expired token, wrong role, other user's id) from **state conflicts** (capture an already captured payment). I assert status, a stable machine-readable `code`, and that the body does not leak stack traces or other users' data. Extra fields and type coercion (`"qty": "2"`) go in that matrix because APIs disagree and consumers will send both.

**Deep dive** — Build a table; execute it with parameterized tests.

| Case | Expect |
| --- | --- |
| Missing `Authorization` | 401 |
| Token for role buyer on `GET /admin/...` | 403 |
| Token for user A on user B's order | 403 or 404 (document which) |
| Unknown `orderId` | 404 |
| Malformed JSON `{` | 400 |
| `Content-Type: text/plain` with JSON body | 415 |
| Well-formed but `qty: -1` | 400 or 422 |
| Missing required `customerId` | 400 or 422 |
| Extra field `adminOverride: true` | ignored (200) **or** 400 if `additionalProperties: false` |
| `"qty": "2"` string | 201 coerced **or** 400 — pin it |
| Duplicate create with same idempotency key + different body | 409 |
| Cancel already cancelled | 409 |
| SQL/NoSQL metacharacters in `sku` | 400/404, **never** 500 |

Don't send real exploits as a "fun" test in prod; injection strings in QA are about unhandled 500s. XSS in JSON is usually a UI concern; still assert the API stores the string safely.

Parameterize: `@MethodSource` with `{body, expectedStatus, expectedCode}`. One raw `given()` helper that does not assert 2xx so the client layer doesn't swallow negatives.

**Code**

```java
@ParameterizedTest
@MethodSource("invalidOrders")
void createOrderValidation(String json, int status, String code) {
    given().spec(ShopSpecs.base(buyerToken))
        .body(json)
    .when().post("/orders")
    .then()
        .statusCode(status)
        .body("code", equalTo(code))
        .body(not(containsString("Exception")))
        .body(not(containsString("at com.shop")));
}

static Stream<Arguments> invalidOrders() {
    return Stream.of(
        Arguments.of("{", 400, "MALFORMED_JSON"),
        Arguments.of("{\"customerId\":\"usr_9\",\"items\":[]}", 422, "ITEMS_REQUIRED"),
        Arguments.of("{\"customerId\":\"usr_9\",\"items\":[{\"sku\":\"SKU-1\",\"qty\":-1}]}", 422, "INVALID_QTY"),
        Arguments.of("{\"customerId\":\"usr_9\",\"items\":[{\"sku\":\"SKU-1\",\"qty\":\"two\"}]}", 400, "INVALID_TYPE")
    );
}

@Test
void buyerCannotReadForeignOrder() {
    Order other = OrderFactory.createPaid(otherBuyerToken);
    given().spec(ShopSpecs.base(buyerToken))
        .when().get("/orders/{id}", other.id())
        .then().statusCode(anyOf(is(403), is(404)))
        .body(not(containsString(other.customerId())));
}
```

**Follow-ups & traps**
- Trap: one test named `testInvalidInput` that sends a blank body and stops.
- 401 vs 403 matrix is mandatory (file 01 Q3).
- Extra fields: if silently ignored, a typo `custmerId` creates with defaults — assert 422, that's a real bug class.
- Don't assert full English `message` strings if i18n will change them; assert `code`.

**Senior/lead angle** — Negative suites catch more security defects than happy-path CRUD. Leads require authz cases in the service template and fail code review on a create-only test class.

**One-liner** — Parameterize parse vs validate vs authz vs conflict; assert status, stable `code`, and no leakage — one "bad JSON" test is not a negative strategy.

### Q6. How do you test timeout / slow / 503 scenarios? (connection vs socket timeout, retries, circuit breaker awareness, mock 504)

**Interview answer** — Connection timeout is "I never established TCP/TLS"; socket/read timeout is "I connected but the body didn't finish." Rest Assured exposes both through `HttpClientConfig`. I unit-test *our client's* policy against WireMock stubs that delay or return 503/504, and I test that retries honor idempotency and that a circuit breaker (if we have one) opens after N failures instead of stampeding. I do not flakily wait for real QA to be slow.

**Deep dive**

- **Connection timeout** — `httpClientConfig().setParam("http.connection.timeout", ...)` / `HttpClientConfig.httpClientConfig().setHttpClientFactory` with Apache `RequestConfig`. Hits a black hole IP or a port that doesn't accept.
- **Socket timeout** — time between packets while reading. WireMock `withFixedDelay(5000)` plus a 1s socket timeout → exception, no HTTP status.
- **504** — you *did* get HTTP from a gateway; the upstream timed out. Assert status 504 and a correlation id. Different from a client timeout exception.
- **503** — shed load; `Retry-After` may be present. Retries with jitter are correct; immediate retry storms are not.
- **Circuit breaker** (Resilience4j, mesh): after threshold 5xx, calls fail fast locally. Tests: mock 500s until open, then a fast failure without hitting WireMock (verify request count), then half-open probe.

Retries: GET is safe to retry; POST `/payments` only with the same `Idempotency-Key`. A generic Rest Assured retry filter that retries all 502s will duplicate charges.

Where to run: component tests with WireMock/MockServer. Against real staging, a 504 test is chaos engineering, not a PR test.

**Code**

```java
wireMock.register(get(urlEqualTo("/orders/ord_1"))
    .willReturn(aResponse().withFixedDelay(5_000).withStatus(200)));

RestAssuredConfig shortRead = config().httpClient(
    httpClientConfig().setParam("http.socket.timeout", 500));

assertThatThrownBy(() ->
    given().config(shortRead).baseUri(wireMock.baseUrl())
        .when().get("/orders/ord_1")
).isInstanceOf(SocketTimeoutException.class); // wrapped by Rest Assured

wireMock.register(get(urlEqualTo("/health-upstream"))
    .willReturn(aResponse().withStatus(504).withHeader("X-Request-Id", "abc")));

given().baseUri(wireMock.baseUrl())
    .when().get("/health-upstream")
    .then().statusCode(504)
    .header("X-Request-Id", equalTo("abc"));
```

**Follow-ups & traps**
- Trap: `Thread.sleep` in a functional test "to simulate slowness." Stub the delay.
- Connection vs socket — if you can't explain both, you don't understand timeouts.
- Retrying 500 POST without a key — duplicate side effects.
- Circuit breaker tests need a *client under test*, not only Rest Assured talking to a slow QA.

**One-liner** — Connection timeout is connect, socket timeout is read; 504 is an HTTP answer from a gateway; exercise them with stubs, and never retry POSTs unless they're idempotent.

### Q7. How do you test an unstable third-party API? (sandbox, contract + stub at YOUR boundary, chaos)

**Interview answer** — I don't build the PR gate on a flaky processor sandbox. I test *our* adapter against a stub that honors the third party's contract (Pact or OpenAPI-generated WireMock), I run a small, isolated sandbox suite on a schedule with strong retries and quarantine, and I use chaos (timeouts, 500s, truncated JSON) against the stub to prove our retry, fallback, and error mapping. Production still needs observability and circuit breakers because no sandbox is the real processor.

**Deep dive** — Three layers:

1. **Contract at our boundary** — `PaymentsAdapter` is tested with WireMock: 201 capture, 409 duplicate, 502, slow, malformed body. These tests are ours, fast, deterministic. If the vendor changes, a contract test (Pact to their sandbox, or a recorded spec + oasdiff) should fail *before* our e2e does.
2. **Vendor sandbox** — nightly, tagged `@external`, using sandbox keys, idempotency keys on every write, budget/rate-limit aware. Failures page the owner of the adapter, not the random PR author. Quarantine if the sandbox is down; don't block merges.
3. **Chaos** — stub returns 429, 503, 207, empty body, wrong Content-Type. Assert we map to domain errors, we don't crash the worker thread, we don't double-capture.

Never: hit the real Stripe/PayPal from 20 PR workers. Never: `if (sandboxDown) return;` silently in a test — skip with a reason or fail the `@external` job.

**Code**

```java
@Test
void adapterMapsProcessor502ToUnavailable() {
    wireMock.register(post("/v1/charges")
        .willReturn(aResponse().withStatus(502)));
    assertThatThrownBy(() -> adapter.capture(orderId, 1999))
        .isInstanceOf(PaymentUnavailableException.class);
}

@Test
@Tag("external")
void sandboxCaptureIsIdempotent() {
    String key = UUID.randomUUID().toString();
    Payment a = sandboxClient.capture(key, req);
    Payment b = sandboxClient.capture(key, req);
    assertThat(b.id()).isEqualTo(a.id());
}
```

**Follow-ups & traps**
- Trap: "we mock everything so we don't need sandbox tests." You'll miss signature header changes.
- Trap: "we only use the sandbox, no stubs." Your CI becomes their uptime.
- Recorded HAR/WireMock mappings go stale — contract tests are the refresh mechanism.

**Senior/lead angle** — Ownership: the adapter team owns stub + sandbox job; product API tests mock the adapter. Leads publish a "third-party test policy" so every new vendor doesn't invent a flaky PR dependency.

**One-liner** — Stub the vendor at your adapter for CI, contract-test the shape, run sandbox nightly with isolation — don't let their instability become your merge gate.

### Q8. An API returns 500 — debug playbook (repro with curl, correlation id, server logs, payload, auth, idempotency, data state).

**Interview answer** — A 500 is an unhandled failure until proven otherwise. I reproduce with the smallest curl (or Rest Assured log) using the **same `X-Request-Id`**, then I grep that id in gateway and app logs, then I inspect payload, auth context, idempotency key, and data state (order already captured, missing row). I don't restart the suite hoping it goes green, and I don't file "API 500" without the id and the request body redacted.

**Deep dive** — Ordered playbook:

1. **Capture the failing call** — method, URL, redacted headers, body, status, response body, `X-Request-Id` / `traceparent`. Rest Assured failure log or Allure attachment (Q9).
2. **Minimize** — drop optional headers; if it still 500s, it's not the extra `X-Debug`. Confirm Content-Type and JSON parse.
3. **curl repro** — same HTTP, not a different Postman collection that "works" because it uses another env. `-H "X-Request-Id: <same or new>"`.
4. **Identity** — does a service-account token 500 where admin doesn't? Authz bugs sometimes 500 on null roles.
5. **Idempotency / replay** — second POST with same key: still 500, or 201 from a half-commit? Half-commit is the scary case (charge succeeded, DB write failed).
6. **Data state** — GET the order; DB row; unique constraints. 500 on create is often a missed 409.
7. **Logs** — search correlation id from ingress → service → DB. If the id wasn't propagated, that's a platform defect that also blocked you.
8. **Classify** — app NPE (fix code), dependency 504 mis-mapped to 500 (fix mapping), bad deploy (rollback), data poison (one row).
9. **Test gap** — add a regression that reproduces with Testcontainers or a stub; don't only curl locally.

500 vs 502/503/504: if curl to the ingress is 502, don't debug the Java NPE first — debug the upstream.

**Code**

```java
// Always send an id so the playbook has a handle
String requestId = UUID.randomUUID().toString();
given().spec(base)
    .header("X-Request-Id", requestId)
    .body(payload)
.when().post("/payments")
.then()
    .statusCode(201); // on failure, Allure filter attaches requestId + redacted dump

// curl equivalent you should be able to write on a whiteboard
// curl -sS -X POST "$BASE/v1/payments" \
//   -H "Authorization: Bearer $TOKEN" \
//   -H "Content-Type: application/json" \
//   -H "Idempotency-Key: $KEY" \
//   -H "X-Request-Id: $RID" \
//   -d '{"orderId":"ord_1","amount":1999,"currency":"USD"}'
```

**Follow-ups & traps**
- Trap: "I reran the test and it passed" as the end of investigation. Intermittent 500s are still defects (timeout, race).
- No correlation header in the product — that's the first finding.
- Pasting tokens into Slack with the curl. Redact.
- Assuming Rest Assured caused the 500 because Log4j looks scary — prove with curl.

**One-liner** — Repro with curl and a correlation id, then logs, payload, auth, idempotency, and data state — a 500 without an id is a missing observability story as much as an app bug.

### Q9. How do you capture request/response details for failures? (filters + Allure attachments + mask secrets)

**Interview answer** — I don't rely on developers remembering `log().all()`. A filter records method, URI, redacted headers, and bodies, and on non-success (or on assertion failure) attaches them to Allure (or the JUnit reporter). `Authorization`, `Cookie`, `Set-Cookie`, and card/PII JSON fields are masked. Green tests stay silent so CI logs remain usable.

**Deep dive** — Implementation pieces:

- `RestAssured.enableLoggingOfRequestAndResponseIfValidationFails()` plus `LogConfig.blacklistHeader` — baseline.
- Custom `Filter` that stores request/response in a `ThreadLocal<HttpExchange>` for the test thread, because Allure attachments are easiest in a JUnit callback after the fact.
- JUnit 5 `TestWatcher` / Allure lifecycle: on failure, attach `exchange.redacted()`.
- Size caps: truncate bodies over N KB; skip binary downloads (attach checksum + Content-Type instead).
- Masking: headers by name; JSON by path (`cardNumber`, `cvv`, `password`, `access_token` in token responses). Regex on `Bearer eyJ` as a backstop.

Don't attach full HAR of the whole suite. Don't print secrets in the attachment "because Allure is internal" — artifacts leak to forks and support tickets.

**Code**

```java
public final class AllureRestFilter implements Filter {
    @Override
    public Response filter(FilterableRequestSpecification req,
                           FilterableResponseSpecification res,
                           FilterContext ctx) {
        Response response = ctx.next(req, res);
        if (response.statusCode() >= 400) {
            Allure.addAttachment(
                req.getMethod() + " " + req.getURI(),
                "text/plain",
                Redactor.exchange(req, response));
        }
        return response;
    }
}

public final class Redactor {
    public static String exchange(FilterableRequestSpecification req, Response res) {
        return """
            %s %s
            X-Request-Id: %s
            Authorization: [ BLACKLISTED ]
            Request body: %s
            Status: %d
            Response body: %s
            """.formatted(
                req.getMethod(), req.getURI(),
                req.getHeaders().getValue("X-Request-Id"),
                maskJson(req.getBody()),
                res.statusCode(),
                maskJson(res.asString()));
    }
}
```

**Follow-ups & traps**
- Trap: Allure attachment of `log().all()` output without blacklist.
- Parallel tests: attachments must be thread-local; a static `lastResponse` will attach the wrong call.
- 204 responses: don't parse JSON in the filter.
- Binary: attaching a 20MB PDF to Allure will make the report unusable.

**One-liner** — Filter + on-failure Allure attachment with blacklisted headers and masked JSON — silent on green, useful on red, never a token dump.

### Q10. Contract testing: Pact / Spring Cloud Contract — consumer-driven contracts vs schema-only. How it fits with Rest Assured e2e. When interviewers say "contract" they often mean schema — distinguish.

**Interview answer** — Schema-only (OpenAPI + `matchesJsonSchemaInClasspath`) checks that *a payload* matches a shape. Consumer-driven contract testing (Pact, Spring Cloud Contract) checks that a **specific interaction** the consumer needs still works: method, path, headers, request fragment, response fragment. Pact is driven by the consumer's tests; the provider verifies those pacts in CI, often via a broker. Rest Assured e2e still has a job: real auth, DB, and multi-service paths that contracts don't run. When an interviewer says "contract testing," I ask whether they mean JSON Schema or CDC — mixing the two is the usual confusion.

**Deep dive**

| | Schema in RA | Pact / SCC |
| --- | --- | --- |
| Who writes it | Provider (usually) | Consumer (Pact) or producer stubs (SCC) |
| What is verified | Document shape | Request/response *interaction* |
| Runs against | Live or stubbed HTTP | Consumer: mock; provider: isolated app |
| Auth/DB | Optional | Usually stubbed |
| Catches | Field removed/type change | "Orders API stopped returning `total`" for *this* client |

Spring Cloud Contract: producer writes Groovy/YAML contracts, generates stubs for consumers and JUnit tests for the producer. Pact: consumer test with a mock server writes a pact file; provider `pactVerify` replays it.

Fit with Rest Assured:
- PR of the **orders service**: schema tests + a few RA integration tests + *provider verification* of pacts from mobile/web.
- PR of the **mobile consumer**: Pact tests (not RA e2e against QA).
- Nightly: RA journeys across services.

Schema cannot replace Pact: additive optional fields pass schema; a consumer that required a field the provider thought optional still breaks — Pact encodings of `matching` rules catch that if the consumer wrote them.

**Code**

```java
// Rest Assured: schema + one business assert (not CDC)
given().spec(base).when().get("/orders/{id}", id)
    .then().body(matchesJsonSchemaInClasspath("schemas/order-v1.json"))
    .body("total", greaterThan(0));

// Pact provider verification is a separate plugin/task, not then().body()
// verifyPact { pactBroker { ... } } against a Testcontainers-started app
```

**Follow-ups & traps**
- Trap: "we do contract testing" = we have Swagger UI.
- Trap: generating Pact from the *provider* and calling it consumer-driven.
- RA e2e vs Pact: if RA is your only contract, every consumer change needs a full stack. That's slow and late.
- Versioned pacts / `pendingPacts` — know that broker WIP pacts exist so providers aren't blocked by unreleased consumers.

**Senior/lead angle** — CDC between mobile and APIs, schema on every RA response, e2e for a few cross-service journeys. Leads run a Pact Broker (or SCC repo) with ownership, not a wiki of JSON files.

**One-liner** — Schema is shape; Pact/SCC is consumer-driven *interactions*; Rest Assured e2e is the real stack — interviewers often say "contract" for the first, so name all three.

### Q11. GraphQL testing with Rest Assured (POST + query body; assert data/errors; why status is often 200 with errors array).

**Interview answer** — GraphQL over HTTP is usually `POST /graphql` with `{"query":"...","variables":{...}}`. Rest Assured handles that as JSON. HTTP **200 with `errors` populated** is normal — the transport succeeded; the operation didn't. I assert `errors` is null (or empty) on success, `data.order.status` on the payload, and I still send `Authorization`. A test that only checks status 200 on GraphQL is almost worthless.

**Deep dive** — Spec: 4xx is for HTTP-level problems (malformed JSON, missing query). Application errors (unknown field, not found, forbidden) are `errors: [{message, path, extensions.code}]` with 200. Some servers use 400 for bad queries; pin yours.

Tests:
- Happy query with variables (never string-concat ids into the query — injection and quoting).
- Mutation: `capturePayment` returns the payment; then a query reads it.
- Authz: buyer query on someone else's order → error code, `data.order` null.
- Schema drift: unknown field → errors; this is your canary if you don't have graphql-inspector in CI.
- N+1 / depth: a deeply nested query should 400/429/error, not time out the origin.

Persisted queries / GET with `query=` exist; still assert `errors`.

**Code**

```java
given().spec(base)
    .body(Map.of(
        "query", "query($id: ID!) { order(id: $id) { id status total } }",
        "variables", Map.of("id", orderId)))
.when().post("/graphql")
.then()
    .statusCode(200)
    .body("errors", nullValue())
    .body("data.order.id", equalTo(orderId))
    .body("data.order.status", equalTo("PAID"));

given().spec(base)
    .body(Map.of(
        "query", "query($id: ID!) { order(id: $id) { id } }",
        "variables", Map.of("id", someoneElsesOrder)))
.when().post("/graphql")
.then()
    .statusCode(200)
    .body("data.order", nullValue())
    .body("errors[0].extensions.code", equalTo("FORBIDDEN"));
```

**Follow-ups & traps**
- Trap: `statusCode(200)` as success.
- String-built queries with unescaped quotes.
- File uploads in GraphQL (multipart spec) — different Content-Type; don't send JSON.
- Subscriptions are WebSockets; Rest Assured is the wrong tool.

**One-liner** — POST JSON to `/graphql`, treat `errors` as the real status code, and assert `data...` — HTTP 200 is just the envelope.

### Q12. Webhook testing (expose a test receiver, or use a tunnel/mock server; assert payload + retry behavior).

**Interview answer** — A webhook is the *API calling us*. I stand up a receiver the provider can reach — WireMock/MockServer in CI if the provider is stubbed, or a sandbox-configured URL (including a tunnel in lower envs) — and I assert method, signature, JSON schema, and business fields. I also assert retries: if I return 500, the provider calls again, and my handler is idempotent on `event.id`. I don't sleep and hope the webhook showed up in a shared debug inbox.

**Deep dive** — Two topologies:

1. **We own both sides in CI** — order service emits to WireMock. Test: POST `/payments/capture` on our API → WireMock received `POST /hooks/merchant` with HMAC, `type=payment.captured`, same `orderId`. Fast, deterministic.
2. **Real vendor sandbox** — vendor needs a public HTTPS URL. Options: a durable test receiver service in the QA VPC; or a controlled tunnel. Policy often forbids ngrok from developer laptops in CI. Prefer an in-cluster mock with a stable DNS name the sandbox is configured to use.

Assertions: timestamp freshness, HMAC (Q4), `Idempotency-Key` or `event.id` replay (deliver twice, one side effect), retry schedule (immediate + exponential) by returning 503 from the mock then 200.

Security: never expose a receiver that reflects bodies to the public without auth. Rotate webhook secrets.

**Code**

```java
wireMock.register(post("/hooks/merchant")
    .willReturn(aResponse().withStatus(200)));

given().spec(base).header("Idempotency-Key", key)
    .body(captureRequest)
.when().post("/payments")
.then().statusCode(201);

await().atMost(5, SECONDS).untilAsserted(() ->
    wireMock.verify(postRequestedFor(urlEqualTo("/hooks/merchant"))
        .withHeader("X-Signature", matching("sha256=.+"))
        .withRequestBody(matchingJsonPath("$.type", equalTo("payment.captured")))
        .withRequestBody(matchingJsonPath("$.orderId", equalTo(orderId)))));

// retry: first delivery 500, second 200, one capture in DB
```

**Follow-ups & traps**
- Trap: polling a third-party "webhook.site" from CI — PII in a public bin, and flaky.
- At-least-once: a test that fails when the vendor retries is a bad test; assert idempotency.
- TLS: vendors refuse HTTP URLs; your receiver must be HTTPS with a trusted cert.

**One-liner** — Point the webhook at a mock you control, assert signed payload and retries, and make the handler idempotent — don't scrape a public request bin.

### Q13. Database assertion after API (JDBC / Testcontainers) — "was it persisted?"

**Interview answer** — HTTP 201 does not prove a commit. For a service I own, I assert the row with JDBC (or the service's repository) against a Testcontainers Postgres — same database the app used. I check the columns that matter (`status`, `total_cents`, `customer_id`), not `select *`. Against a shared QA where I can't see the DB, I use GET (read model) plus a downstream stub; I don't take a production replica credential in the test job.

**Deep dive** — When DB asserts pay off: lost updates, double inserts from missing idempotency, triggers, outbox rows not HTTP-visible yet. When they hurt: coupling tests to indexes and column names so every migration breaks the suite. Prefer asserting on a stable schema or on the outbox/event table the API owns.

Testcontainers pattern: start Postgres, flyway/liquibase, start the app (or `@SpringBootTest`) pointed at it, Rest Assured against `localhost:{randomPort}`, then `jdbcTemplate.queryForObject("select status from orders where id = ?", ...)`.

Read-your-writes: if the API is CQRS with async projection, GET might lag; then either poll the read model (like async APIs) or assert the write DB / outbox, not the replica.

Never: `DELETE FROM orders` in a shared DB from parallel tests. Isolate by `customer_id` or truncate only in the container.

**Code**

```java
@Testcontainers
class CreateOrderPersistenceTest {
    @Container
    static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void createOrderWritesRow() {
        Order order = ordersClient.create(OrderFactory.oneItem("SKU-1"));

        String status = jdbc.queryForObject(
            "select status from orders where id = ?", String.class, order.id());
        Integer total = jdbc.queryForObject(
            "select total_cents from orders where id = ?", Integer.class, order.id());

        assertThat(status).isEqualTo("CREATED");
        assertThat(total).isEqualTo(1999);
        assertThat(order.total()).isEqualTo(1999);
    }
}
```

**Follow-ups & traps**
- Trap: asserting 201 and skipping persistence for payments.
- Mapping `numeric` money to `float` in JDBC — use `BigDecimal` or integer cents.
- `@Transactional` test that rolls back while Rest Assured called a live servlet on another thread — the HTTP thread committed; your test transaction didn't see it, or vice versa. Testcontainers + no shared transaction is simpler.

**Senior/lead angle** — Hermetic DB asserts belong in the service repo. Cross-service "check the other team's DB" is a political and coupling failure; use their API or an event.

**One-liner** — After 201, assert the row (Testcontainers + JDBC) or the read model you actually own — status codes don't prove a commit.

### Q14. Testing file upload/download APIs (multipart, streaming, checksum).

**Interview answer** — Upload with `multiPart` and the documented part names; assert `201`, metadata, and a **checksum** of the stored bytes, not only a filename. Download with Rest Assured `asByteArray()` or a stream to a file; assert `Content-Type`, `Content-Disposition`, byte length, and SHA-256 against the original. I test empty files, oversized files (413), wrong MIME, and that a buyer cannot download another customer's invoice.

**Deep dive** — Upload traps: wrong part name, setting JSON Content-Type on a multipart request, not sending filename, server sniffing MIME vs trusting `Content-Type`. Virus-scan async: 202 then poll (file 01 Q15).

Download traps: loading a 500MB file into `asString()` (charset corruption and OOM). Use `asInputStream()` and hash incrementally. Don't `log().body()` on binaries. `204` vs `200` with empty file. Range requests (`Range: bytes=`) if the API supports resume.

Checksum: compute SHA-256 locally, compare to `Digest` header or to a metadata field, and to the downloaded bytes. That's the invariant that survives filename normalization.

**Code**

```java
Path pdf = Path.of("src/test/resources/invoices/inv-1001.pdf");
byte[] original = Files.readAllBytes(pdf);
String sha = sha256(original);

String id = given().spec(base)
    .multiPart("file", pdf.toFile(), "application/pdf")
    .multiPart("kind", "VAT")
.when().post("/orders/{orderId}/attachments", orderId)
.then().statusCode(201)
    .body("checksumSha256", equalTo(sha))
    .extract().path("id");

byte[] downloaded = given().spec(base)
    .when().get("/attachments/{id}", id)
    .then().statusCode(200)
        .contentType("application/pdf")
        .header("Content-Disposition", containsString("inv-1001.pdf"))
        .extract().asByteArray();

assertThat(sha256(downloaded)).isEqualTo(sha);
assertThat(downloaded).hasSize(original.length);

given().spec(ShopSpecs.base(otherBuyerToken))
    .when().get("/attachments/{id}", id)
    .then().statusCode(anyOf(is(403), is(404)));
```

**Follow-ups & traps**
- Trap: asserting `statusCode(200)` on download without reading bytes (zero-length success).
- Charset: PDFs are not UTF-8 strings.
- Multipart plus `contentType(JSON)` — the file never arrives.
- Cleanup: delete uploaded objects in `@AfterEach` or use unique prefixes in a bucket, or Testcontainers MinIO.

**One-liner** — Multipart upload, stream/byte-array download, SHA-256 both ways, plus size/MIME/authz — a 201 with a filename is not proof the file survived.
