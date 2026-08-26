# Networking — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. TCP vs HTTP?
TCP moves bytes reliably between ports. HTTP defines messages/methods/status on top.

### Q2. Why test works locally but fails in CI?
Different DNS, egress rules, missing secrets, no access to internal hosts, TLS interception, IPv6 vs IPv4.

### Q3. Idempotent methods — why care?
Safe retries. GET/PUT/DELETE generally idempotent; POST often not without idempotency key.

### Q4. WebSocket testing angle?
Connection lifecycle, reconnect, auth on connect, message ordering, heartbeats — not only REST asserts.

### Q5. Explain TLS briefly.
Client verifies server certificate chain; negotiates keys; then encrypted application data. Failures often cert/trust related.
