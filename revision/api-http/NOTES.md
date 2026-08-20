# HTTP & REST — revision notes

**Deep Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)  
**Framework context:** [framework-design](../framework-design/NOTES.md) §6

---

## HTTP methods

| Method | Idempotent | Safe | Body | Typical use |
| --- | --- | --- | --- | --- |
| GET | Yes | Yes | No | Read |
| POST | No | No | Yes | Create, actions |
| PUT | Yes | No | Yes | Replace resource |
| PATCH | No* | No | Yes | Partial update |
| DELETE | Yes | No | Optional | Remove |

*PATCH idempotency depends on implementation.

**PUT vs PATCH:** PUT replaces entire resource; PATCH updates fields.

---

## Status codes (must know)

| Code | Meaning | Test assert |
| --- | --- | --- |
| 200 | OK | GET success |
| 201 | Created | POST create |
| 204 | No content | DELETE success |
| 400 | Bad request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not found | Wrong URL/id |
| 409 | Conflict | Duplicate, state conflict |
| 422 | Unprocessable | Validation errors (API style) |
| 429 | Too many requests | Rate limit |
| 500 | Server error | Bug |
| 502 | Bad gateway | Upstream down |
| 503 | Unavailable | Overload/maintenance |
| 504 | Gateway timeout | Slow upstream |

**401 vs 403:** Not logged in vs logged in but denied.

---

## Headers & auth

- **Content-Type** / **Accept** — JSON, XML  
- **Authorization:** Bearer JWT, Basic base64  
- **Cookie** — session  
- **Correlation-Id** — trace across services  

**OAuth2 flows (interview level):** Authorization code (web), client credentials (service), refresh tokens.

---

## REST design

- Resources as nouns (`/users/123/orders`)  
- Stateless — server holds no client session state in REST purist sense  
- HATEOAS — links in response (optional)  

---

## Testing layers

```text
Contract (schema/Pact) → API integration → E2E UI
```

**Rest Assured** belongs in API client layer — see [automation/rest-assured](../automation/rest-assured/OVERVIEW.md).

---

## JSON testing

- JSONPath assertions  
- JSON Schema validation  
- POJO serialize/deserialize round-trip  

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
