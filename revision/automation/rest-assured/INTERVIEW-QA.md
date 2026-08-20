# Rest Assured — interview Q&A

**Q: Structure API framework?** — Base spec + domain clients + POJOs + config per env.

**Q: Chain APIs in test?** — Extract id: `int id = given()...extract().path("id")`.

**Q: Schema validation?** — JSON Schema in Rest Assured; catch breaking API changes early.

**Q: 401 vs 403 tests?** — No token vs wrong role token.

**Q: Test OAuth?** — Token endpoint in setup; store in spec; refresh logic.

**Q: API vs UI same framework repo?** — Shared config/reporting; separate modules; business flows compose both.

**Q: Microservice test?** — Mock downstream with WireMock when unstable; contract tests between teams.

**Q: Data cleanup?** — Delete via API in `@AfterEach`; idempotent create with unique keys.

HTTP codes: [api-http INTERVIEW-QA](../../api-http/INTERVIEW-QA.md)
