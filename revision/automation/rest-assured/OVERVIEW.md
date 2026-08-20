# Rest Assured — overview & best practices

**API layer:** [framework-design §6](../../framework-design/NOTES.md#6-api--rest-assured-and-http-layer)  
**HTTP theory:** [api-http](../../api-http/NOTES.md)  
**Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

## Structure

```text
BaseApiClient (spec, auth, logging)
  → UserApiClient, OrderApiClient
  → POJOs for request/response
```

## Best practices

```java
given().spec(requestSpec).body(dto).when().post("/users")
     .then().statusCode(201).body("id", notNullValue());
```

- Reusable `RequestSpecification` / `ResponseSpecification`  
- Environment base URI from config  
- Schema validation for contract  
- Extract → chain (create user → get id → update)  
- Log on failure only (reduce noise)  
- Separate API tests from UI — faster pyramid  

## Auth patterns

- Basic / Bearer token in spec  
- OAuth token fetch in `@BeforeAll`  
- Refresh before expiry  

## Avoid

- Hard-coded URLs and secrets  
- Asserting entire JSON blob when 2 fields matter  
- One 3000-line “ApiTests” class  
