# Networking for SDET — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## 1. What happens when you enter a URL (interview story)

1. Parse URL (scheme, host, port, path)
2. **DNS** resolve host → IP
3. **TCP** handshake (SYN, SYN-ACK, ACK)
4. **TLS** handshake if HTTPS (certs, keys, cipher)
5. **HTTP** request/response
6. Browser renders; may open more connections (HTTP/2 multiplexing)

SDET use: classify failures as DNS / TCP / TLS / HTTP / app.

---

## 2. TCP vs HTTP

| | TCP | HTTP |
| --- | --- | --- |
| Layer | Transport | Application |
| Job | Reliable byte stream | Request/response semantics |
| Concepts | ports, handshake, retransmission | methods, status, headers, body |

HTTP runs on TCP (usually). WebSocket starts with HTTP upgrade then framed messages.

---

## 3. HTTP essentials

- Methods: GET/POST/PUT/PATCH/DELETE (idempotency matters for retries)
- Status: 2xx success, 4xx client, 5xx server
- Headers: Auth, Content-Type, Cache-Control, Correlation-Id
- Keep-alive / connection reuse
- HTTP/2: multiplexing on one connection (awareness)

---

## 4. DNS & TLS

**DNS failure:** unknown host, wrong env DNS, split-horizon issues in VPC.

**TLS failure:** expired cert, wrong SAN, corporate proxy MITM without trust store, clock skew.

---

## 5. Troubleshooting map

| Symptom | Check |
| --- | --- |
| UnknownHostException | DNS |
| Connection refused | process listening? security group? |
| Connection timed out | network path, firewall, wrong VPC |
| Handshake failure | TLS/certs |
| 401/403 | authz |
| 502/504 | gateway/upstream |

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
