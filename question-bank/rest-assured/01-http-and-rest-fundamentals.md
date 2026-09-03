# HTTP & REST Fundamentals for SDET Interviews

Interviewers mix protocol theory with Rest Assured syntax on the same whiteboard. This file is the HTTP/REST layer you must be able to speak without a cheat sheet: constraints, methods, status codes, headers, auth artifacts, encodings, and the testing patterns (idempotency, pagination, rate limits, async) that show you have actually broken production APIs. Rest Assured 5.x snippets show how an SDET *uses* the protocol — they do not replace knowing it.

- Q1. What is REST? Constraints, and what REST is not
- Q2. HTTP methods: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS — idempotency, safety, POST vs PUT vs PATCH
- Q3. Status codes: 1xx–5xx map and what each common code means in testing
- Q4. Headers that matter
- Q5. Query params vs path params vs body vs headers — where data belongs
- Q6. Cookies vs tokens vs sessions
- Q7. HTTPS/TLS basics an SDET must know
- Q8. JSON vs XML vs form-urlencoded vs multipart
- Q9. REST vs SOAP vs GraphQL vs gRPC — when each, how testing differs
- Q10. Idempotency keys and retries (payments)
- Q11. Pagination patterns (offset, cursor) and how you test them
- Q12. Rate limiting and 429 handling
- Q13. HATEOAS / hypermedia
- Q14. Contract vs schema vs example — vocabulary
- Q15. Synchronous vs async APIs (202 + polling / webhooks)
- Q16. What makes a good API test vs a bad one

### Q1. What is REST? Constraints (stateless, cacheable, uniform interface, layered). What REST is not (any JSON over HTTP).

**Interview answer** — REST is an architectural style for networked systems, defined by Roy Fielding, not a protocol and not "JSON over HTTP." A system is RESTful when it honors the constraints: client–server separation, stateless requests, cacheable responses, a uniform interface, a layered system, and optionally code-on-demand. Most "REST APIs" we test are resource-oriented HTTP APIs that borrow some of those constraints and ignore others — I say that out loud rather than pretending every `/api/v1` is REST.

**Deep dive** — The six constraints, and what they imply for testers:

1. **Client–server** — UI and API evolve independently. You can test the API without a browser, which is why Rest Assured exists.
2. **Stateless** — each request carries all the context the server needs (auth token, resource id, idempotency key). The server must not require "you are on step 3 of this conversation." Session cookies that the server looks up are a pragmatic deviation; if the API is session-sticky, your tests cannot round-robin across nodes without affinity.
3. **Cacheable** — GET/HEAD responses may be cached when `Cache-Control` / `ETag` allow it. Tests that mutate then immediately GET can flake behind a CDN if you ignore validators. `Cache-Control: no-store` on authenticated responses is a security assertion worth making.
4. **Uniform interface** — resources identified by URIs, manipulated via representations (JSON), self-descriptive messages (Content-Type, status), and hypermedia (HATEOAS — usually absent; see Q13). Uniform interface is why `GET /orders/123` plus `Accept: application/json` is enough for a generic client.
5. **Layered system** — clients cannot tell if they hit the origin, a gateway, or a mesh sidecar. 502/504 often come from the layer in front of the service, not the service. Correlation ids must propagate through the layers or your debug story dies at the ingress.
6. **Code-on-demand (optional)** — server ships executable code (JS). Almost never relevant to API automation.

What REST is **not**: JSON-RPC via `POST /invoke` with a method name in the body; GraphQL; gRPC-web; "we have a POST for every verb because the firewall blocks PUT"; SOAP with a JSON body. Those can be perfectly fine APIs. Calling them REST in an interview signals you memorized a slogan.

**Code**

```java
// Stateless: every call carries the token and the resource id. No "current order" on the server.
given()
    .header("Authorization", "Bearer " + accessToken)
    .header("X-Request-Id", UUID.randomUUID().toString())
.when()
    .get("/orders/{id}", orderId)
.then()
    .statusCode(200)
    .header("Cache-Control", containsString("no-store"));
```

**Follow-ups & traps**
- "Is REST a protocol?" — No. HTTP is the protocol REST is usually implemented on. REST can theoretically use other application protocols.
- Trap: listing CRUD verbs as "the REST constraints." Verbs are the uniform-interface *practice*, not Fielding's constraint list.
- "Does stateless mean the server has no database?" — No. It means no *client-specific conversation state* required between requests. Orders live in Postgres; the server just doesn't remember that *you* were browsing page 2.
- "Is our API RESTful?" — Honest answer: resource URLs and JSON does not equal REST. Ask whether requests are self-contained and whether caching/layering were designed, not whether the path looks pretty.

**Senior/lead angle** — At lead level, REST constraints are a *test-design filter*. Statelessness is why you inject tokens per request instead of relying on a login sequence inside the API client. Cacheability is why you put `Cache-Control` and ETag assertions on GETs that sit behind CloudFront. Layering is why a 502 is assigned to platform, not the orders team, until proven otherwise.

**One-liner** — REST is Fielding's constraints (stateless, cacheable, uniform, layered), not "we returned JSON"; most APIs you test are HTTP resource APIs that only partially comply.

### Q2. HTTP methods: GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS — idempotency and safety table. POST vs PUT vs PATCH (the classic).

**Interview answer** — Safe methods (GET, HEAD, OPTIONS) must not change server state. Idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS, TRACE) can be retried: N identical requests leave the same resource state as one. POST is neither safe nor idempotent — two identical `POST /orders` can create two orders. PUT is a full replace and is idempotent. PATCH is a partial update; the spec does not require it to be idempotent, so I never assume it is without reading the API.

**Deep dive**

| Method | Safe | Idempotent | Body | Typical use in testing |
| --- | --- | --- | --- | --- |
| GET | Yes | Yes | No (must not change meaning) | Read; cacheable; retry freely |
| HEAD | Yes | Yes | No | Same as GET, no body — probe existence, Content-Length, ETag |
| OPTIONS | Yes | Yes | Rare | CORS preflight; discover `Allow` |
| PUT | No | Yes | Yes | Replace `/orders/{id}` with the full representation |
| DELETE | No | Yes | Optional | Remove; second DELETE is 404 or 204, resource is still gone |
| POST | No | No | Yes | Create (`201` + `Location`) or non-idempotent action (`/payments/{id}/capture`) |
| PATCH | No | **No\*** | Yes | Partial update. \*JSON Merge Patch of fields is often idempotent; increment/`add` ops are not |

POST vs PUT vs PATCH, the classic:

- **POST `/orders`** — "create a new order." Server assigns `id`. Repeating it creates another order unless the API uses idempotency keys (Q10). Response is usually `201 Created` with `Location: /orders/{id}`.
- **PUT `/orders/{id}`** — "this is the complete order now." Missing fields are cleared or defaulted. Sending the same body twice yields the same resource. Some APIs use PUT to create-if-absent (`201`) or replace (`200`/`204`).
- **PATCH `/orders/{id}`** — "change these fields." Two common payloads: JSON Merge Patch (`{"status":"CANCELLED"}`) and JSON Patch RFC 6902 (`[{"op":"replace","path":"/status","value":"CANCELLED"}]`). A PATCH that does `"op":"add"` to an array, or `"capturedAmount += 10"`, is **not** idempotent.

HEAD vs GET: HEAD must return the same headers GET would, without a body. Useful to assert `Content-Length` or `ETag` cheaply; a bug we catch is HEAD returning `200` with a body, or HEAD `404` while GET `200`.

OPTIONS: browsers send it for CORS. API tests should assert `Access-Control-Allow-Origin` / `Allow-Methods` / `Allow-Headers` on the *preflight*, not only on the GET.

**Code**

```java
// POST creates; PUT replaces; PATCH patches — assert the semantics, not just 2xx
String location = given()
    .contentType(ContentType.JSON)
    .body("""
        {"customerId":"usr_9","items":[{"sku":"SKU-1","qty":1}]}
        """)
.when()
    .post("/orders")
.then()
    .statusCode(201)
    .header("Location", containsString("/orders/"))
    .extract().header("Location");

given().body("""
    {"customerId":"usr_9","items":[{"sku":"SKU-1","qty":2}],"notes":null}
    """)
.when().put(location)
.then().statusCode(200)
    .body("items[0].qty", equalTo(2))
    .body("notes", nullValue());

given().contentType("application/merge-patch+json")
    .body("{\"status\":\"CANCELLED\"}")
.when().patch(location)
.then().statusCode(200)
    .body("status", equalTo("CANCELLED"))
    .body("items[0].qty", equalTo(2)); // untouched field survived
```

**Follow-ups & traps**
- "Is PUT always create-or-replace?" — HTTP allows it; many business APIs reject PUT on an unknown id with 404. Test the documented contract, not the textbook.
- Trap: "PATCH is always idempotent." RFC 5789 explicitly does not require it.
- "Can GET have a body?" — HTTP allows it but caches, proxies, and Rest Assured users will surprise you. Never design or test a GET-with-body as the real contract.
- "Why does retrying POST duplicate payments?" — because POST is not idempotent; this is the on-ramp to idempotency keys (Q10).
- Trap: asserting DELETE always returns 204. Some APIs return 200 with a body, some return 404 on the second delete. Idempotency is about *resource state*, not the status code of the replay.

**Senior/lead angle** — Method semantics drive retry policy in the HTTP client and in CI flakes: GET/PUT/DELETE retries are default-safe; POST/PATCH retries need an idempotency key or they create duplicate orders. A lead who lets the framework retry all 5xx POSTs will duplicate charges in staging and eventually in prod synthetics.

**One-liner** — Safe means no state change; idempotent means retries are free; POST is neither, PUT replaces and is, PATCH is only as idempotent as its patch document.

### Q3. Status codes: 1xx–5xx map. Common ones: 200/201/202/204, 301/302/304, 400/401/403/404/409/412/422/429, 500/502/503/504. What each means in testing.

**Interview answer** — 1xx is informational (we almost never assert it). 2xx is success — but *which* 2xx matters: 200 body, 201 created, 202 accepted-not-done, 204 success-no-body. 3xx is redirection and caching (304). 4xx is the client was wrong — our negative tests live here. 5xx is the server or a hop in front of it failed — a test that expects 500 is documenting a bug, not a contract. I never assert "status is 200" when the API should have returned 201 or 204; wrong success codes hide contract drift.

**Deep dive** — Map, then the testing implication of each common code.

| Class | Meaning | Default test stance |
| --- | --- | --- |
| 1xx | Informational (`100 Continue`, `101 Switching Protocols`) | Ignore unless testing WebSocket upgrade / Expect: 100-continue |
| 2xx | Success | Assert the *specific* code plus body/headers |
| 3xx | Redirect / cache revalidation | Follow or assert `Location`; 304 means your validators work |
| 4xx | Client error | Negative suite; must not be 500 |
| 5xx | Server / gateway error | Fail the test; file a defect; do not "expect 500" as a stable contract |

**2xx**
- **200 OK** — GET/PUT/PATCH/POST-that-isn't-create. Body present.
- **201 Created** — POST create. Assert `Location` (and often the body `id` matches it).
- **202 Accepted** — async accepted. Body should include a status URL or job id. Polling starts here (Q15). Asserting 202 and walking away is an incomplete test.
- **204 No Content** — success, empty body. Rest Assured `as(Order.class)` or `jsonPath()` on 204 throws or returns empty — assert status and *don't* parse JSON.

**3xx**
- **301 Moved Permanently** — caches and clients should rewrite the URI. Assert `Location` and that the new resource works; following POST+301 is a famous interoperability mess.
- **302 Found** — temporary; historically browsers turned POST into GET. Prefer 303 (see-other GET) or 307/308 (preserve method) in modern APIs.
- **304 Not Modified** — conditional GET with matching `ETag`/`If-None-Match` or `If-Modified-Since`. Assert empty body and that you saved a payload round-trip.

**4xx** (the negative-test palette)
- **400 Bad Request** — malformed *syntax* (broken JSON, wrong types at parse time). Some teams dump all validation here; others reserve 400 for parse errors only.
- **401 Unauthorized** — missing/invalid *authentication*. Should include `WWW-Authenticate` for challenged basic/digest. "Unauthorized" is a misnomer — it means "unauthenticated."
- **403 Forbidden** — authenticated, not allowed (wrong role, resource you don't own). Distinguishing 401 vs 403 is a classic interview probe.
- **404 Not Found** — unknown URI or unknown id. Some security-conscious APIs return 404 instead of 403 to avoid leaking existence — document that, don't "fix" it in tests.
- **409 Conflict** — state conflict: duplicate `Idempotency-Key` with a different body, order already captured, unique email. Assert the error code in the body, not just 409.
- **412 Precondition Failed** — `If-Match` ETag didn't match; someone else updated the order. This is your optimistic-concurrency test.
- **422 Unprocessable Content** — well-formed JSON that fails *semantic* validation (qty: -1, unknown sku). RFC 9110 restored this as "Unprocessable Content." Not every API uses it; some fold this into 400. Test the actual API.
- **429 Too Many Requests** — rate limit. Assert `Retry-After` (Q12).

**5xx**
- **500 Internal Server Error** — unhandled exception. Repro is a defect, not a test you keep green by expecting 500.
- **502 Bad Gateway** — proxy/gateway got a bogus response from upstream (connection reset, invalid HTTP). Often ingress/mesh, not the app.
- **503 Service Unavailable** — overloaded, deploying, or deliberately shed load. May carry `Retry-After`. Circuit breakers fire on this.
- **504 Gateway Timeout** — proxy waited, upstream didn't answer in time. Distinct from a client-side Rest Assured timeout (no response at all).

**Code**

```java
given().header("Authorization", "Bearer " + buyerToken)
.when().get("/orders/does-not-exist")
.then().statusCode(404);

given().header("Authorization", "Bearer " + buyerToken)
.when().get("/admin/payments")
.then().statusCode(403); // authenticated, wrong role — not 401

given().contentType(ContentType.JSON).body("{not-json")
.when().post("/orders")
.then().statusCode(anyOf(is(400), is(415)));

given().contentType(ContentType.JSON)
    .header("If-Match", "\"stale-etag\"")
    .body("{\"status\":\"SHIPPED\"}")
.when().patch("/orders/{id}", orderId)
.then().statusCode(412);
```

**Follow-ups & traps**
- "401 vs 403?" — 401 = who are you? 403 = I know who you are, no. If a missing token returns 403, call it out as a spec smell but test what ships.
- Trap: `then().statusCode(200)` on a POST create. Interviewers notice. 201 is the contract.
- Trap: parsing a 204 body. Also: Rest Assured's default success family is 200–360 in some older mental models — always assert the exact code.
- "Is 422 standard?" — Yes now (RFC 9110). Many Spring apps use it via `@Valid`. If the API returns 400 with a validation array, don't invent 422 in tests.
- "Should tests accept a range like 2xx?" — Smoke probes can use `statusCode(successful())` (`200–299`). Contract tests must pin the code.

**Senior/lead angle** — Status codes are a shared language with SREs. A suite that maps 502/503/504 to different owners (ingress vs app vs dependency) cuts MTTR. Leads also ban "assert 200 or 201 or 202" unless the API genuinely has multiple success modes — fuzzy success assertions are how async regressions slip through.

**One-liner** — Pin the specific code: 201 vs 200 vs 204 vs 202 are different contracts, 401≠403, 4xx is your negative suite, 5xx is a bug (or a hop), not a green test.

### Q4. Headers that matter: Content-Type, Accept, Authorization, Cookie, Cache-Control, ETag/If-None-Match, X-Request-Id, Retry-After, CORS headers.

**Interview answer** — Headers are how HTTP carries metadata the body shouldn't. `Content-Type` is what I'm sending; `Accept` is what I want back. `Authorization` and `Cookie` are credentials — never log them. Caching is `Cache-Control` plus validators (`ETag` / `If-None-Match`). `X-Request-Id` (or `traceparent`) is how I stitch a failed test to server logs. `Retry-After` tells me how to treat 429/503. CORS headers are the browser's gate; API tests that skip OPTIONS miss a whole class of "works in Postman, fails in the SPA" bugs.

**Deep dive** — What each one is *for*, and what I assert.

- **Content-Type** — the body's media type (`application/json; charset=UTF-8`, `application/x-www-form-urlencoded`, `multipart/form-data`, `application/merge-patch+json`). Servers branch parsers on it. Wrong type → 415 Unsupported Media Type. Rest Assured `contentType(ContentType.JSON)` sets it on the request; on the response I assert it before parsing.
- **Accept** — content negotiation. `Accept: application/json` vs `application/xml`. A missing or `*/*` Accept often still returns JSON; a strict API may 406 Not Acceptable. Versioning sometimes lives here (`application/vnd.shop.order.v2+json`).
- **Authorization** — `Bearer <jwt>`, `Basic base64(user:pass)`, `HMAC` scheme. One header, not a body field. See file 03 for flows. Must be blacklisted from logs.
- **Cookie** — `Cookie:` request, `Set-Cookie:` response. Attributes that matter: `HttpOnly`, `Secure`, `SameSite`, `Path`, `Max-Age`. Browser clients send them automatically; Rest Assured does **not** unless you retain a `SessionFilter` or extract `set-cookie`.
- **Cache-Control** — `no-store` for authenticated GETs, `max-age` / `public` for catalogs. `Vary: Accept-Encoding, Authorization` prevents cache poisoning across users.
- **ETag / If-None-Match / If-Match** — validators. GET → ETag; subsequent GET with `If-None-Match` → 304. PUT/PATCH with `If-Match` → 412 on stale writes. Weak etags (`W/"..."`) are for semantic equivalence, not byte identity.
- **X-Request-Id / X-Correlation-Id / `traceparent` (W3C Trace Context)** — I generate a UUID per request in the client, send it, and on failure print it. If the service overwrites my id instead of echoing it, tracing is broken.
- **Retry-After** — delta-seconds or HTTP-date. Present on 429 and sometimes 503. Tests should parse it rather than hardcoding `sleep(60)`.
- **CORS** — `Origin` on the request; `Access-Control-Allow-Origin` (never `*` with credentials), `Allow-Methods`, `Allow-Headers`, `Allow-Credentials`, `Max-Age` on the response. Preflight is `OPTIONS` with `Access-Control-Request-Method` and `Access-Control-Request-Headers`. Rest Assured is not a browser — a green CORS-less API test does not prove the SPA can call it.

**Code**

```java
String etag = given()
    .header("Authorization", "Bearer " + token)
    .header("X-Request-Id", requestId)
    .accept(ContentType.JSON)
.when()
    .get("/orders/{id}", orderId)
.then()
    .statusCode(200)
    .contentType(ContentType.JSON)
    .header("X-Request-Id", equalTo(requestId))
    .header("Cache-Control", containsString("no-store"))
    .extract().header("ETag");

given()
    .header("Authorization", "Bearer " + token)
    .header("If-None-Match", etag)
.when()
    .get("/orders/{id}", orderId)
.then()
    .statusCode(304);

given()
    .header("Origin", "https://shop.example.com")
    .header("Access-Control-Request-Method", "POST")
    .header("Access-Control-Request-Headers", "authorization,content-type")
.when()
    .options("/orders")
.then()
    .header("Access-Control-Allow-Origin", equalTo("https://shop.example.com"))
    .header("Access-Control-Allow-Credentials", equalTo("true"));
```

**Follow-ups & traps**
- "Content-Type vs Accept?" — Content-Type describes *this* payload; Accept describes *desired* response. Mixing them is a junior tell.
- Trap: `log().all()` dumping `Authorization`. Blacklist it (file 02 Q7).
- "Why did Postman work but the browser didn't?" — CORS or cookie `SameSite`. Rest Assured will not catch this unless you send `Origin` and OPTIONS.
- Trap: asserting `Access-Control-Allow-Origin: *` together with cookies — browsers will refuse. The combination is invalid.

**One-liner** — Content-Type is what you send, Accept is what you want, Authorization/Cookie are secrets, ETag/Cache-Control are caching, X-Request-Id is your debug handle, CORS is a browser protocol Rest Assured will not exercise unless you ask.

### Q5. Query params vs path params vs body vs headers — where data belongs.

**Interview answer** — Path params identify *which* resource (`/orders/{orderId}`). Query params *filter, sort, paginate, or flag* a resource (`?status=PAID&page=2`). The body carries the representation you are creating or replacing. Headers carry protocol metadata (auth, correlation, content negotiation, preconditions) — not business fields. If I see `GET /orders?orderId=` I flag it; if I see `Authorization` in the JSON body I flag it harder.

**Deep dive** — Placement is a contract, and tests should fail when it drifts.

| Location | Identifies | Examples | Caching / logs |
| --- | --- | --- | --- |
| Path | The resource | `/users/usr_9/orders/ord_1` | In URLs, access logs, traces |
| Query | A view of the resource | `?status=PAID&limit=20&cursor=abc` | In URLs and logs; **never secrets** |
| Body | Representation / command | order JSON, JSON Patch | Not in default access logs; size limits apply |
| Header | Metadata | `Authorization`, `Idempotency-Key`, `If-Match` | Logged unless redacted |

Rules of thumb I use in reviews:
- If it's in the URI template of the resource, it's a path param.
- If two different values still mean "the same resource, different slice," it's query (filters, include, locale sometimes).
- If the HTTP method has a body by convention (POST/PUT/PATCH), business fields go in the body — not as 15 query params.
- GET bodies are non-interoperable; filters stay in the query string.
- Credentials never go in the query string (they'll leak via `Referer`, access logs, browser history, APM).
- Idempotency keys belong in a header (`Idempotency-Key`), not the body, so intermediaries and the API gateway can hash the request uniformly.
- Multi-tenant `X-Tenant-Id` is a header (or in the token), not a path you let users rewrite to hop tenants — and tests must prove that.

Rest Assured 5.x: `pathParam` / unnamed `{orderId}` in the verb method, `queryParam` (and `queryParams` map), `body`, `header`/`headers`. Form fields are a *body encoding*, not query params, even though they look like `k=v`.

**Code**

```java
given()
    .header("Authorization", "Bearer " + token)
    .header("Idempotency-Key", UUID.randomUUID().toString())
    .pathParam("userId", "usr_9")
    .queryParam("status", "PAID")
    .queryParam("limit", 20)
    .queryParam("cursor", lastCursor)
    .contentType(ContentType.JSON)
    .body(new CaptureRequest("ch_123", 1999, "USD"))
.when()
    .post("/users/{userId}/payments/capture")
.then()
    .statusCode(200);
```

**Follow-ups & traps**
- "Can I put JSON in a query param?" — You can; you shouldn't. Length limits, encoding hell, logs.
- Trap: `queryParam("token", secret)` because "it's easier than a header." Instant reject.
- "Path vs query for search?" — `GET /orders?q=sku:SKU-1` is a search *view*; `GET /orders/ord_1` is a resource. Don't make a fake id for a search.
- Rest Assured trap: mixing `get("/orders/" + id)` string concat with `pathParam`. Prefer templates so encoding (`ord/1` vs `ord%2F1`) is correct.

**Senior/lead angle** — Wrong placement becomes a security finding (tokens in query), a caching bug (auth-varying content keyed only on URL), or an observability gap (no correlation header). Leads put this in the API design review checklist, not only in the test suite.

**One-liner** — Path names the resource, query slices it, body is the representation, headers are metadata and secrets — keep those four jobs from leaking into each other.

### Q6. Cookies vs tokens vs sessions.

**Interview answer** — A session is server-side state keyed by an id. A cookie is the browser-native way to send that id (or a token) on every request. A token — typically a JWT or opaque bearer — is a credential the *client* stores and sends in `Authorization`, which Rest Assured does explicitly because it is not a browser. I pick the mechanism the API actually uses: cookie session for server-rendered web, bearer token for SPAs/mobile/service calls, and I never assume Rest Assured will keep cookies unless I install a session filter.

**Deep dive**

- **Session** — server stores `{sessionId → user, roles, expiry}` in Redis/memory. The client only holds the id. Revocation is easy (delete the key); scaling requires shared session store; load balancers need stickiness or a shared store. Classic servlet `JSESSIONID`.
- **Cookie** — `Set-Cookie` / `Cookie` headers. Can hold a session id **or** the token itself. Browser automatically attaches cookies for the matching domain/path, which is why CSRF exists: `evil.com` can trigger a request to `api.shop.example.com` and the browser will send the cookie unless `SameSite=Lax/Strict` or anti-CSRF tokens block it. Flags: `Secure` (HTTPS only), `HttpOnly` (no JS — mitigates XSS token theft), `SameSite`, `Path`, `Domain`.
- **Token (bearer / JWT)** — client sends `Authorization: Bearer ...`. Browsers do **not** auto-attach this; JavaScript (or Rest Assured) must. XSS is the threat if the token sits in `localStorage`. CSRF is largely a non-issue for pure bearer-header APIs because the browser won't add that header for a cross-site form. JWTs are often *self-contained* (see file 03): revocation is harder (short TTL + denylist).

Hybrids you'll actually test:
- BFF sets an `HttpOnly` cookie wrapping an opaque session; the SPA never sees the JWT.
- First login returns `{accessToken, refreshToken}`; refresh rotates.
- mTLS plus a token — cookie irrelevant.

Rest Assured: `cookie("JSESSIONID", value)`, `cookies(map)`, `getDetailedCookies()`, and `SessionFilter` to replay `Set-Cookie` automatically across requests. Default Rest Assured does *not* behave like Chrome.

**Code**

```java
// Cookie session (browser-style API)
SessionFilter session = new SessionFilter();
given().filter(session)
    .contentType(ContentType.URLENC)
    .formParam("email", "buyer@example.com")
    .formParam("password", password)
.when().post("/login")
.then().statusCode(204)
    .cookie("JSESSIONID", not(emptyString()));

given().filter(session) // sends JSESSIONID
.when().get("/orders/current")
.then().statusCode(200);

// Bearer token (SPA/mobile API) — explicit, no cookie jar needed
given().auth().oauth2(accessToken)
.when().get("/orders/current")
.then().statusCode(200);
```

**Follow-ups & traps**
- "Is a JWT a session?" — No. A session is server-side; a JWT is typically stateless auth. Teams still say "session token" loosely — clarify.
- Trap: Rest Assured test logs in, gets `Set-Cookie`, next request 401 because no `SessionFilter`.
- "Why HttpOnly?" — stops `document.cookie` theft via XSS; Rest Assured still sees the cookie on the response because it is the HTTP client, not JS.
- "CSRF on a bearer API?" — generally no if the token is only in `Authorization` and not also in a cookie. If you put the JWT in a cookie, you're back in CSRF land.

**One-liner** — Sessions live on the server, cookies are how browsers attach credentials automatically (CSRF), tokens are how non-browsers authenticate in Authorization (XSS if stored in JS) — Rest Assured must be told to do either.

### Q7. HTTPS/TLS basics an SDET must know (what TLS does, cert chain, SNI). Not a crypto lecture.

**Interview answer** — TLS is the layer that authenticates the server (and optionally the client) and encrypts the HTTP bytes on the wire — that's what makes HTTPS. The server presents a certificate chain: leaf (the hostname) signed by intermediates signed by a CA your trust store already has. SNI is how a client, during the handshake, says which hostname it wants so the server can pick the right cert on a shared IP. As an SDET I care about hostname verification, expired/untrusted certs in QA, and why `relaxedHTTPSValidation()` is a loaded gun in a shared Rest Assured framework.

**Deep dive** — What you must be able to draw:

1. TCP connect → TLS handshake (ClientHello with **SNI** = `api.shop.example.com`) → server cert chain → client verifies: (a) chain to a trusted root, (b) not expired/revoked, (c) **hostname matches** SAN/CN, (d) optionally stapled OCSP → keys derived → HTTP.
2. **Cert chain** — leaf `CN/SAN=api.shop.example.com` → intermediate CA → root CA in the JVM `cacerts` (or a custom truststore). QA often breaks (b) or (c): expired staging certs, `*.qa.internal` not in SAN, self-signed.
3. **SNI** — without it, name-based virtual hosts can't pick a cert. A test that hits `https://10.0.1.8` with a Host header but no SNI hostname will see a default cert and fail verification. Rest Assured/HttpClient uses the URI host for SNI; that's why you should not replace the host with a raw IP and "fix" the Host header.
4. **What TLS does not do** — it does not authenticate the *user* (that's app auth), does not encrypt data at rest, does not stop a compromised server from lying.

mTLS: the server also requests a client cert. Used for service-to-service. Tests need a client keystore (`.p12`) plus truststore. Missing client cert → handshake failure, which looks like a connection error, not a 401.

JVM trust: `javax.net.ssl.trustStore`, Rest Assured `trustStore()`, or `relaxedHTTPSValidation()` which disables both trust and hostname checks. The last one will happily talk to an MITM box.

**Code**

```java
// Custom trust material for a QA CA — preferred over relaxing
given()
    .trustStore("qa-ca.jks", "changeit")
    .baseUri("https://api.qa.shop.internal")
.when().get("/health")
.then().statusCode(200);

// mTLS
given()
    .keyStore("client-sdet.p12", "storepass")
    .trustStore("qa-ca.jks", "changeit")
.when().get("https://payments.qa.shop.internal/v1/health")
.then().statusCode(200);

// Last resort, never as a global framework default:
given().relaxedHTTPSValidation().get("https://localhost:8443/health");
```

**Follow-ups & traps**
- "What does SNI stand for?" — Server Name Indication. If you can't say "hostname in the handshake," you don't know it.
- Trap: globally calling `RestAssured.useRelaxedHTTPSValidation()` in a shared lib. One bad cert in one env teaches the whole org to skip TLS.
- "Handshake failed vs 401?" — Handshake never reaches HTTP; Rest Assured throws `SSLHandshakeException`. 401 is an HTTP response after TLS succeeded.
- "Why does curl -k work but Java fail?" — curl `-k` skips verification; the JVM does not. Also the JVM truststore is not the OS/browser store.

**Senior/lead angle** — Policy: per-environment truststores checked into a secrets-capable config, hostname verification always on, `relaxedHTTPSValidation` banned except a named local-dev profile. Leads treat "QA certs are messy" as a platform ticket, not a test-framework feature.

**One-liner** — TLS authenticates the server via a cert chain and encrypts HTTP; SNI picks the cert by hostname; SDETs fix truststores rather than disabling verification in the shared client.

### Q8. JSON vs XML vs form-urlencoded vs multipart.

**Interview answer** — These are body encodings, selected by `Content-Type`. JSON is the default for public REST APIs we test. XML still shows up in enterprise/SOAP-ish HTTP. `application/x-www-form-urlencoded` is HTML form posts and some OAuth token endpoints. `multipart/form-data` is files plus fields, with a boundary. I set the type explicitly in Rest Assured and assert the response type before parsing — feeding a JSON parser an XML error page is a common false failure.

**Deep dive**

- **JSON (`application/json`)** — objects, arrays, numbers, strings, booleans, null. No comments, no trailing commas (strict). Numbers are a testing trap: `19.99` as `float` vs `BigDecimal` vs integer cents (`1999`). Charset should be UTF-8. Rest Assured uses Jackson (or Gson) to serialize POJOs and Groovy JsonPath to assert.
- **XML (`application/xml`, `text/xml`, plus namespaces)** — elements, attributes, namespaces. Assert with Rest Assured XML path (`xmlPath()`, `body("order.status", equalTo("PAID"))` with a registered namespace). SOAP envelopes are XML with a required schema; don't treat them as "JSON but angle brackets."
- **form-urlencoded (`application/x-www-form-urlencoded`)** — `grant_type=client_credentials&scope=orders:write`. Keys and values percent-encoded. No nested objects unless the API invents bracket conventions. OAuth2 token URLs are the #1 place SDETs still need this. Rest Assured: `contentType(URLENC).formParam(...)` — *not* `body(json)`.
- **multipart (`multipart/form-data`)** — each part has its own headers (`Content-Disposition`, optional `Content-Type`). Used for `POST /orders/{id}/invoice` with a PDF plus `{"type":"VAT"}` as another part. Boundaries must not collide with file bytes — the client library handles that. Testing: checksum the uploaded bytes on GET download, don't just assert 200.

Also seen: `application/octet-stream` (raw file), `application/json-patch+json`, `application/merge-patch+json`, `text/csv`, `application/protobuf` (not REST-typical).

**Code**

```java
// JSON
given().contentType(ContentType.JSON).body(order).post("/orders");

// form-urlencoded — OAuth token
given()
    .contentType(ContentType.URLENC)
    .formParam("grant_type", "client_credentials")
    .formParam("scope", "orders:write")
    .auth().preemptive().basic(clientId, clientSecret)
.when().post("/oauth/token")
.then().statusCode(200)
    .body("token_type", equalTo("Bearer"));

// multipart — file + metadata
given()
    .multiPart("file", new File("invoices/inv-1001.pdf"), "application/pdf")
    .multiPart("metadata", "{\"kind\":\"VAT\"}", "application/json")
.when().post("/orders/{id}/attachments", orderId)
.then().statusCode(201)
    .body("checksumSha256", equalTo(sha256(Files.readAllBytes(path))));
```

**Follow-ups & traps**
- Trap: posting JSON to `/oauth/token` when the spec says form-urlencoded — 415 or a cryptic 400.
- Trap: `contentType(JSON)` plus `formParam` — you're sending the wrong encoding.
- "How do you assert XML namespaces?" — declare them on `XmlPath` / `namespace()` in Rest Assured; ignoring xmlns makes expressions silently miss.
- Float money in JSON: prefer integer minor units in the contract; tests using `equalTo(19.99f)` will flake.

**One-liner** — JSON for resource APIs, urlencoded for classic forms and OAuth token calls, multipart for files, XML when the enterprise said so — `Content-Type` decides the parser, so set it and assert it.

### Q9. REST vs SOAP vs GraphQL vs gRPC — when each, how testing differs.

**Interview answer** — REST/HTTP-JSON is resource-oriented, cache-friendly, easy to probe with Rest Assured. SOAP is an XML contract (WSDL + envelope) over HTTP, still common in banks and ERPs — you test operations and schemas, not URL nouns. GraphQL is one POST endpoint with a query language; HTTP status is often 200 while errors sit in `errors[]`. gRPC is HTTP/2 + protobuf, streaming-capable, not a natural Rest Assured target — you use generated stubs. I pick the client that matches the protocol rather than forcing everything through Rest Assured.

**Deep dive**

| | REST/HTTP | SOAP | GraphQL | gRPC |
| --- | --- | --- | --- | --- |
| Contract | OpenAPI / informal | WSDL + XSD | SDL / schema | `.proto` |
| Transport | HTTP/1.1 or 2 | HTTP (usually POST) | HTTP POST (mostly) | HTTP/2 |
| Payload | JSON (typical) | XML envelope | JSON query/result | Protobuf |
| Ops | Methods + URLs | Named operations | Query/mutation/subscription | RPC methods |
| Errors | Status codes | Fault in envelope | `errors` array, often HTTP 200 | Status codes (gRPC), trailers |
| Tooling | Rest Assured, Postman | SoapUI, CXF clients | RA POST, Apollo, GraphQL Java | grpcurl, generated Java stubs |

When each: public web/mobile APIs → REST. Multi-step enterprise transactions, WS-Security, existing WSDL → SOAP. Many clients needing different slices of a graph (BFF for a complex UI) → GraphQL. Low-latency internal service meshes, streaming, polyglot contracts → gRPC.

Testing differences that interviewers want:
- REST: status + headers + jsonPath + schema. Cache and idempotency matter.
- SOAP: validate against XSD, assert on `//Fault`, WS-Addressing headers, sometimes WS-Security signatures. Rest Assured *can* POST XML but you're fighting the tool.
- GraphQL: always POST `/graphql` (or GET with query string). Assert `data.order.status` **and** that `errors` is null. Authorization still via headers. N+1 / depth limits / persisted queries are GraphQL-specific tests.
- gRPC: no JSONPath; use proto assertions on generated messages. TLS and deadlines (`Deadline`) replace HTTP timeouts. You don't Rest-Assure a gRPC service; you might test a gRPC-gateway's REST facade with RA.

**Code**

```java
// GraphQL through Rest Assured — HTTP 200 is not success
given()
    .auth().oauth2(token)
    .contentType(ContentType.JSON)
    .body("""
        {"query":"query($id:ID!){ order(id:$id){ id status total } }","variables":{"id":"ord_1"}}
        """)
.when().post("/graphql")
.then().statusCode(200)
    .body("errors", nullValue())
    .body("data.order.status", equalTo("PAID"));
```

**Follow-ups & traps**
- Trap: "GraphQL is REST because it's JSON over HTTP."
- Trap: using Rest Assured as the gRPC story. Mention proto stubs.
- "Can SOAP be RESTful?" — SOAP is an RPC style. "SOAP over HTTP" is still SOAP.
- "How do you contract-test gRPC?" — proto compatibility (BUF/breaking checks) plus consumer stubs; Pact has gRPC support, but that's not RA.

**One-liner** — Rest Assured owns HTTP+JSON (and can POST GraphQL); SOAP is WSDL/XSD; GraphQL hides errors under 200; gRPC is protobuf on HTTP/2 with generated clients.

### Q10. Idempotency keys and retries (payments).

**Interview answer** — An idempotency key is a client-generated token, usually the `Idempotency-Key` header, that lets the server treat retries of a non-idempotent POST as the same operation. In payments, the browser double-clicks or the client times out after the charge succeeded — without a key you capture twice; with a key the second POST returns the original result. I test three cases: same key + same body returns the original payment, same key + different body returns 409, and a new key creates a new payment.

**Deep dive** — POST `/payments` is not idempotent. Networks fail after the server committed but before the client saw `201`. Clients retry. The Stripe-style contract:

1. Client sends `Idempotency-Key: <uuid>` plus body.
2. Server hashes key (and often the request fingerprint) and stores `{key → response, status, body-hash}` with a TTL (24h typical).
3. Replay with same key and same body: return the stored response (same `paymentId`, same 201), do not charge again.
4. Replay with same key and **different** body: `409 Conflict` (or 422) — the key is bound.
5. Different key: new payment.

Retries vs idempotency: retries are the client's policy (when to resend). Idempotency is the server's guarantee that resending is safe. You need both: retry without a key is dangerous; a key without retries still loses the race on a timeout if the client gives up forever.

What to assert: database/charge count is 1; response bodies of first and second call match on `id`; `X-Request-Id` may differ; server logs show one capture. Also test expiry: after TTL, the same key may start a new operation — know the documented window.

Rest Assured: do **not** let a generic retry filter retry POST without echoing the same `Idempotency-Key`. That's a framework bug that will pass unit tests and fail in prod.

**Code**

```java
String key = UUID.randomUUID().toString();
String body = """
    {"orderId":"ord_1","amount":1999,"currency":"USD","source":"tok_visa"}
    """;

String paymentId = given()
    .header("Idempotency-Key", key)
    .contentType(ContentType.JSON)
    .body(body)
.when().post("/payments")
.then().statusCode(201)
    .extract().path("id");

given().header("Idempotency-Key", key).contentType(ContentType.JSON).body(body)
.when().post("/payments")
.then().statusCode(201)
    .body("id", equalTo(paymentId)); // same charge

given().header("Idempotency-Key", key)
    .contentType(ContentType.JSON)
    .body("""
        {"orderId":"ord_1","amount":4999,"currency":"USD","source":"tok_visa"}
        """)
.when().post("/payments")
.then().statusCode(409);
```

**Follow-ups & traps**
- "Is PUT enough for payments?" — PUT of a client-supplied `paymentId` can work, but most processors still want POST + key because the id is server-assigned.
- Trap: generating a new UUID on every retry in the HTTP client. That *defeats* the feature.
- "What about GET after a timed-out POST?" — if you have the key, you can also `GET /payments?idempotencyKey=` if the API exposes it; otherwise the stored POST replay is the recovery path.
- Don't sleep-and-hope; assert on `id` equality and a downstream charge count (stub or ledger API).

**Senior/lead angle** — Payment suites that aren't idempotent-safe cannot run in parallel or with CI retries. Leads make `Idempotency-Key` a mandatory header on the payments client wrapper, generate it at the test-data factory, and ban naked `post("/payments")` in review.

**One-liner** — Same `Idempotency-Key` plus same body = one payment no matter how many retries; same key plus different body = 409; a new key is a new charge.

### Q11. Pagination patterns (offset, cursor) and how you test them.

**Interview answer** — Offset pagination is `?page=2&size=20` or `?offset=40&limit=20` — simple, breaks when rows shift under you, expensive on deep pages. Cursor pagination is `?limit=20&cursor=eyJpZCI6...` — the cursor encodes a position (id + sort key), stable under inserts, what I'd expect on `/orders`. I test page size, next/prev links, last page shorter than limit, empty page, that no id is duplicated or skipped across the full crawl, and that a stale cursor behaves as documented (400 vs empty).

**Deep dive**

**Offset/page:** `GET /orders?status=PAID&page=0&size=50`. Total count often included (`totalElements`). Bugs: `page` 0- vs 1-based; `size` over max silently clamped; `page=9999` returns `[]` with 200 vs 400. Under concurrent inserts, item 51 moves and you skip/duplicate — that's why we don't use offset for "export all orders" tests if the table is hot.

**Cursor:** `GET /orders?limit=50&cursor=<opaque>`. Response: `{items, nextCursor, prevCursor}` or Link headers (`rel="next"`). Cursor is typically a signed blob of `(createdAt, id)` — treat it as opaque in tests; don't decode unless you are testing the encoding. Inserts *behind* the cursor don't shift the next page. Deleting the cursor's row: API should still advance (seek by key), not 500.

**Keyset** is cursor's implementation: `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT n`.

What a thorough crawl test does:
1. Create N+1 orders with a unique `customerId` so the dataset is yours.
2. Page with `limit=N` until `nextCursor == null`.
3. Concatenate ids; assert size N+1, uniqueness, expected sort order.
4. Mutate mid-crawl (insert a newer order) and show offset duplicates vs cursor stability if asked to compare.
5. Assert `limit` max enforcement and `limit=0` / negative → 400.

Rest Assured: loop with `extract().path("nextCursor")`; don't hardcode page 1 only.

**Code**

```java
List<String> ids = new ArrayList<>();
String cursor = null;
do {
    Response r = given()
        .auth().oauth2(token)
        .queryParam("customerId", customerId)
        .queryParam("limit", 2)
        .queryParam("cursor", cursor)
    .when().get("/orders")
    .then().statusCode(200)
        .body("items.size()", lessThanOrEqualTo(2))
        .extract().response();
    ids.addAll(r.jsonPath().getList("items.id"));
    cursor = r.path("nextCursor");
} while (cursor != null);

assertThat(ids).doesNotHaveDuplicates();
assertThat(ids).hasSize(expectedCount);
```

**Follow-ups & traps**
- Trap: testing only page 1. Pagination bugs live on page 2 and the last page.
- "Total count with cursor?" — often omitted on purpose (expensive). Don't assert `total` if the API doesn't promise it.
- Off-by-one: inclusive vs exclusive cursors; `hasNext` true with empty `items`.
- Sort instability: cursor without a unique tie-breaker (`id`) will skip twins of the same `createdAt`.

**One-liner** — Offset is simple and drifts under writes; cursor is stable; tests must crawl every page and assert no dupes, no skips, and a documented stale-cursor behavior.

### Q12. Rate limiting and 429 handling.

**Interview answer** — Rate limits cap how many requests a client (API key, user, IP, token) can make per window. When exceeded, the API returns **429 Too Many Requests**, ideally with `Retry-After` and remaining-quota headers (`X-RateLimit-Limit/Remaining/Reset` or IETF `RateLimit`). In tests I prove the limit exists, that the 429 body is structured, that we don't retry blindly in a hot loop, and that a well-behaved client honors `Retry-After`. I do not soak the shared QA cluster from CI on every PR.

**Deep dive** — Algorithms: fixed window (cheap, burst at boundary), sliding window, token bucket (burst allowed, refill rate). Limits may be per-route (`POST /payments` stricter than `GET /orders`). Gateways (Kong, Apigee, AWS API Gateway) often enforce this *in front of* the service — a 429 may never hit app logs.

Headers to know:
- `Retry-After: 12` (seconds) or an HTTP-date.
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch) — de facto standard.
- IETF draft `RateLimit: "default";r=0;t=12`.

Testing strategy:
- **Dedicated client identity** — a test API key with a tiny quota (e.g. 5/min), not the shared suite key.
- **Assert contract** — burst past the cap → 429 + `Retry-After` present and parseable.
- **Assert recovery** — after waiting `Retry-After`, the next request is 200 and remaining resets.
- **Assert isolation** — another key is unaffected (no noisy-neighbor).
- **Client behavior** — the Rest Assured filter backs off; it does not busy-loop; it does not retry POST without an idempotency key.

Load tests of rate limits belong in a performance/chaos job, not the PR gate. A PR test should use a stubbed gateway or a sandboxed key.

**Code**

```java
int hits = 0;
int status;
do {
    status = given().auth().oauth2(lowQuotaToken)
        .when().get("/orders")
        .then().extract().statusCode();
    hits++;
} while (status != 429 && hits < 50);
assertThat(status).isEqualTo(429);

int retryAfter = Integer.parseInt(
    given().auth().oauth2(lowQuotaToken).when().get("/orders")
        .then().statusCode(429)
        .header("Retry-After", matchesPattern("\\d+"))
        .extract().header("Retry-After"));

await().atMost(retryAfter + 2, SECONDS).untilAsserted(() ->
    given().auth().oauth2(lowQuotaToken).when().get("/orders").then().statusCode(200));
```

**Follow-ups & traps**
- Trap: hammering prod-like QA from parallel CI workers with one key — you 429 the whole pipeline. Isolate keys per shard/worker.
- 429 vs 503 — 429 is *you*; 503 is *me* (shed load). Retry both, but attribution differs.
- Missing `Retry-After`: client should still exponential-backoff with jitter, not retry immediately.
- "Should the test fail on 429?" — in a functional suite, unexpected 429 is infra pollution (fail/quarantine). In an explicit rate-limit test, 429 is success.

**Senior/lead angle** — Give CI its own quota class, shard-aware keys, and a budget dashboard. Leads who skip this learn about rate limits when the nightly suite DDoSes login and pages the on-call.

**One-liner** — 429 plus `Retry-After` is the contract; test it with an isolated low-quota identity; never surprise the shared environment with a PR-time flood.

### Q13. HATEOAS / hypermedia — rarely implemented, don't fake expertise.

**Interview answer** — HATEOAS is the hypermedia constraint of REST: the response contains links that tell the client what it can do next, so the client doesn't hardcode URLs. In Fielding's model that's mandatory; in the industry it's rare. Spring HATEOAS `_links` and HAL/JSON:API are the forms you might actually see. I will not pretend our `/orders` API is HATEOAS because it returns an `id` — that's just an identifier. If the API truly is hypermedia, I test the links (rel, href, allowed methods) rather than concatenating URLs in the client.

**Deep dive** — Uniform interface's fourth sub-constraint: "hypermedia as the engine of application state." The client starts at a root (`GET /`) and follows `rel`s (`"capture"`, `"cancel"`, `"self"`). State transitions are discovered, not compiled in. Benefits: server can rehome URLs; clients only know link relations.

Why teams skip it: SDK/OpenAPI already hardcode paths; mobile apps ship with those paths; extra payload weight; few clients implement a generic hypermedia agent. What people confuse with HATEOAS: pretty URLs, returning nested objects, OpenAPI, "we have a `links` array we never update."

If you *do* have HAL:

```json
{
  "id": "ord_1",
  "status": "PAID",
  "_links": {
    "self": { "href": "https://api.shop.example.com/orders/ord_1" },
    "cancel": { "href": "https://api.shop.example.com/orders/ord_1/cancel" }
  }
}
```

Tests: (1) `self` href is GET-able and matches the resource. (2) `cancel` is present only when status allows cancel — **this is the actual value of HATEOAS** — and absent (or 409 if still called) otherwise. (3) Don't skip the link and hit a hardcoded `/cancel` if the point of the API is discovery.

**Code**

```java
String cancelHref = given().auth().oauth2(token)
.when().get("/orders/{id}", orderId)
.then().statusCode(200)
    .body("_links.self.href", endsWith("/orders/" + orderId))
    .extract().path("_links.cancel.href");

if (cancelHref != null) {
    given().auth().oauth2(token).post(cancelHref)
        .then().statusCode(anyOf(is(200), is(204)));
}
```

**Follow-ups & traps**
- Trap: "Yes we use HATEOAS" because Swagger exists. OpenAPI is a contract document, not hypermedia in responses.
- "Is HATEOAS required for REST?" — In Fielding's dissertation, yes. In job interviews, describe the constraint accurately and say almost nobody fully implements it.
- JSON:API `links` / `relationships` is a cousin; same testing idea: follow documented rels.

**One-liner** — HATEOAS means the payload's links drive the next call; it is a real REST constraint, rarely shipped, and claiming it without `_links` (or equivalent) is a credibility hit.

### Q14. Contract vs schema vs example — vocabulary.

**Interview answer** — An **example** is a sample payload in docs or a recorded response — illustrative, not enforced. A **schema** is a formal description of shape and types (JSON Schema, OpenAPI `schema`, XSD) that a validator can check. A **contract** is an agreement between consumer and provider about behavior — it includes schema, but also status codes, headers, error shapes, and sometimes interactions (Pact). Interviewers often say "contract test" when they mean "JSON Schema in Rest Assured"; I distinguish those so I don't oversell what `matchesJsonSchemaInClasspath` is doing.

**Deep dive**

| Term | What it is | What it guarantees | Typical tool |
| --- | --- | --- | --- |
| Example | One illustration | Nothing; can rot | README, Swagger "example" |
| Schema | Structure, types, required fields, enums | Payload *shape* of one message | JSON Schema, OpenAPI, `matchesJsonSchemaInClasspath` |
| Contract | Bilateral agreement on interactions | Provider won't break this consumer | Pact, Spring Cloud Contract, OpenAPI + spectral |
| OpenAPI | API description (paths, ops, schemas, auth) | Only if validated/linted/gated | Swagger, Spectral, oasdiff |

Schema **does** catch: missing `id`, `status` not in enum, `amount` as string, extra properties if `additionalProperties: false`.

Schema **does not** catch: `POST /payments` charges the wrong card, 201 vs 200, `Idempotency-Key` replay semantics, "PAID orders cannot be cancelled," pagination uniqueness, authz (buyer can't GET someone else's order). Those are contract-of-behavior and need tests or Pact interaction definitions.

Consumer-driven contract (CDC): the consumer publishes "I will call `GET /orders/{id}` and I need `id` and `status`." Provider CI verifies against that. Schema-only in the provider repo is *provider-owned* documentation, not CDC.

Versioning: breaking a schema (rename `total` → `totalAmount`) is a breaking contract change even if examples in Confluence were updated.

**Code**

```java
// Schema: shape only
given().auth().oauth2(token)
.when().get("/orders/{id}", orderId)
.then()
    .statusCode(200)
    .body(matchesJsonSchemaInClasspath("schemas/order-v1.json"))
    .body("status", equalTo("PAID"))           // business, not schema
    .body("customerId", equalTo(customerId));  // authorization/ownership
```

**Follow-ups & traps**
- Trap: "We have contract tests" pointing at a committed `example.json` compared with `equals`. That's snapshot testing of an example; brittle and not a schema.
- "Is OpenAPI a contract?" — It's a candidate contract. Without breaking-change CI (oasdiff) it's a wiki in YAML.
- Pact vs schema: Pact is interaction + CDC broker; schema is structural. Both can coexist with Rest Assured e2e (file 03 Q10).

**Senior/lead angle** — Vocabulary is how you stop a team from thinking schema validation replaced integration tests. Leads put schema on every response in the PR gate (cheap), Pact between mobile and orders (medium), and a few Rest Assured e2e journeys (expensive).

**One-liner** — Examples illustrate, schemas constrain shape, contracts agree on behavior; Rest Assured schema checks are the middle one — necessary, not sufficient.

### Q15. Synchronous vs async APIs (202 + polling / webhooks) — how to test.

**Interview answer** — Synchronous APIs finish the work before they answer (`201` + the order). Asynchronous APIs accept work (`202 Accepted`) and complete later — you poll a status resource or wait for a webhook. I test the accept path, the status machine (`PENDING → PAID` or `FAILED`), timeout behavior, and that webhooks retry, sign payloads, and are idempotent when delivered twice. I never `Thread.sleep(30)` as the strategy; I poll with a timeout and a clear failure message.

**Deep dive** — Why async: payment settlement, report generation, AML checks, anything that waits on a person or a batch. Patterns:

1. **202 + Location** — `POST /reports` → `202` + `Location: /jobs/job_9`. `GET /jobs/job_9` until `status=DONE` then `GET` the result URL.
2. **202 + body** — `{ "jobId": "job_9", "statusUrl": "..." }`.
3. **Webhook / callback** — API calls `POST https://our-test-receiver/hooks/payments` with an Event payload (`payment.captured`). The test process exposes a receiver (MockServer, WireMock, or a tunnel to a local server) and waits for the event.
4. **202 + poll + webhook** — both; poll is for the originating client, webhook for the backend.

Testing sync vs async:
- Sync: one request, assert final state (DB + GET).
- Async: assert 202 *and* eventually-final. Use Awaitility, not a fixed sleep. Bound the wait (e.g. 10s in CI with a stubbed worker, 60s against a real sandbox).
- Failure path: job `FAILED` with an error code; webhook still delivered.
- Timeouts: job stays `PENDING` past SLA → test asserts we surface that, not that we hang the suite.
- Exactly-once: webhooks are at-least-once — duplicate delivery must not double-ship.

Against real processors, prefer sandbox + polling. In CI, stub the worker to complete on the next GET so the test is fast and deterministic.

**Code**

```java
String jobUrl = given().auth().oauth2(token)
    .body("{\"orderId\":\"ord_1\",\"type\":\"TAX_EXPORT\"}")
.when().post("/reports")
.then().statusCode(202)
    .extract().header("Location");

await().atMost(15, SECONDS).pollInterval(500, MILLISECONDS).untilAsserted(() ->
    given().auth().oauth2(token)
    .when().get(jobUrl)
    .then().statusCode(200)
        .body("status", equalTo("DONE"))
        .body("downloadUrl", notNullValue())
);
```

**Follow-ups & traps**
- Trap: asserting 202 and stopping. You tested the inbox, not the business outcome.
- Trap: `Thread.sleep(5000)` — too short on a slow CI box, too long on a stub, always flaky.
- "Do I need a public URL for webhooks?" — in CI, prefer a mock the *provider sandbox* can reach, or better: invert the test and have *your* service call WireMock. Don't ngrok from a unit-test job if policy forbids it.
- 200 vs 202: some APIs block and return 200 after 30s. That's still sync, just slow — test with timeouts, not a job resource.

**One-liner** — Sync asserts the final representation now; async asserts 202 plus an eventual DONE (poll or webhook) with bounded waiting — never a single sleep.

### Q16. What makes a good API test vs a bad one (not just status 200).

**Interview answer** — A good API test treats the HTTP call as a business action: it arranges owned test data, asserts status *and* payload *and* side effects, and fails with a correlation id. A bad one hits a shared `GET /orders` and checks 200. I look for: specific status, schema or typed body, field-level business assertions, authz (cannot see someone else's order), idempotency where it matters, and no dependence on leftover QA data. Speed and isolation are part of quality — a test that only works at 2 a.m. is a bad test that happens to be green.

**Deep dive** — A checklist I use in review:

**Good**
- Owns data: factory creates `customer` + `order` with unique ids; cleanup or TTL.
- Asserts the contract: 201, `Location`, schema, `status=CREATED`, `total` matches items.
- Asserts the effect: GET by id returns the same; DB or downstream stub received one capture.
- Asserts the negative: buyer token cannot GET another user's order (403/404).
- Deterministic: no `items.size() > 0` on a global list.
- Debuggable: `X-Request-Id` logged; secrets redacted.
- Fast: no UI, no arbitrary 10s sleep, parallel-safe.
- One behavior per test: "cancel transitions PAID → CANCELLED" not "create, pay, ship, cancel, refund."

**Bad**
- `statusCode(200)` only — a 200 HTML error page or an empty `{}` passes.
- Hitting production-like shared catalog: `GET /products` and asserting a SKU marketing added last year.
- Chained mega-test: 40 calls, fails at step 37 with no isolation (file 02 Q12).
- Hardcoded ids from a demo tenant that someone deleted.
- Asserting the entire JSON tree with `equals` — breaks on `updatedAt` / tracing fields.
- Sleeping for async instead of polling a status.
- Using admin credentials for every test so 403 paths never run.
- Logging bearer tokens into CI artifacts.

Pyramid reminder: many cheap schema + authz tests at the API layer beat three enormous e2e journeys that all start with UI login. A good API test is a *component* test of the service, not a worse UI test without a browser.

**Code**

```java
@Test
void buyerCannotReadSomeoneElsesOrder() {
    Order victim = OrderFactory.createPaid(sellerAdmin); // owned data
    given().auth().oauth2(buyerToken)
    .when().get("/orders/{id}", victim.id())
    .then()
        .statusCode(anyOf(is(403), is(404)))
        .body(not(containsString(victim.customerId()))); // no leak
}

@Test
void createOrderPersistsTotals() {
    String requestId = UUID.randomUUID().toString();
    int total = given()
        .header("X-Request-Id", requestId)
        .auth().oauth2(buyerToken)
        .body(OrderFactory.request("SKU-1", 2))
    .when().post("/orders")
    .then()
        .statusCode(201)
        .body(matchesJsonSchemaInClasspath("schemas/order-v1.json"))
        .body("items[0].qty", equalTo(2))
        .body("total", equalTo(3998))
        .extract().path("total");

    // side effect: read model agrees
    given().auth().oauth2(buyerToken)
    .when().get("/orders/{id}", /* id from Location */)
    .then().body("total", equalTo(total));
}
```

**Follow-ups & traps**
- "Is schema enough?" — No (Q14). Schema plus one business invariant plus one authz check is the minimum bar.
- Trap: calling a test "e2e" because it used HTTP. E2E crosses *systems*; API tests should usually stay in one service plus its DB.
- "How many assertions?" — as many as one behavior needs. Multiple `then().body` clauses are fine; multiple unrelated behaviors are not.
- Flakes: shared data, timezones (`LocalDate.now()`), and unordered arrays (`items[0]` without a sort). Those make otherwise good tests bad.

**Senior/lead angle** — Quality of API tests is measured by escaped defects in *services* and by time-to-signal on PRs, not by count. Leads delete tests that only assert 200, fund factories/cleanup, and make authz tests a required example in the framework template.

**One-liner** — A good API test owns its data and asserts status, shape, business meaning, and side effects; a bad one asserts 200 on a shared endpoint and hopes QA still has that order.
