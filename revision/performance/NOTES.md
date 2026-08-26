# Performance engineering — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

Locust track: [../automation/locust/](../automation/locust/)

---

## 1. Latency vs throughput

- Latency: time per request
- Throughput: requests/sec
- Percentiles beat averages for user experience

---

## 2. Little’s Law (awareness)

`concurrency ≈ throughput × latency`  
Useful sanity check for load models and pool sizes.

---

## 3. Bottleneck checklist

CPU saturation · memory/GC · disk · network · DB locks/slow queries · connection pools · thread pools · queue depth · external rate limits · test-tool limits

---

## 4. Load generation architecture

Distributed generators → target → metrics backend → thresholds as CI gates.  
Compare runs; watch coordinated omission / client-side saturation.

Tool awareness: Locust (primary), k6, JMeter, Gatling.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
