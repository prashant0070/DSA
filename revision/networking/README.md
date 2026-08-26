# Networking for SDET interviews

**Notes:** [NOTES.md](NOTES.md)  
**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Networking is often invisible until debugging rounds or API/platform discussions expose the gap.

## Scope

### Core protocols

- TCP basics: handshake, reliability, ordering
- UDP basics and when it matters
- HTTP methods, status codes, headers, keep-alive
- HTTP/1.1 vs HTTP/2 awareness
- WebSocket basics
- SSE basics

### Infra concepts

- DNS lookup flow
- TLS handshake basics
- proxies and load balancers
- ports, NAT, firewalls, ingress basics

### Interview debugging

- timeout vs connection refused vs DNS failure
- TLS certificate issues
- flaky network dependencies in tests
- why a service works locally but fails in CI/VPC

## Common SDET applications

- browser test failures caused by network conditions
- API retries and timeouts
- mobile/device lab connectivity issues
- service mesh or proxy side effects

## Interview questions

- What happens when you enter a URL?
- Difference between TCP and HTTP?
- Why would a test fail only in one environment?
- How do DNS or TLS issues show up in automation?
