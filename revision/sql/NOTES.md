# SQL — revision notes

**Deep Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## Core queries

```sql
SELECT col FROM t WHERE ... GROUP BY col HAVING ... ORDER BY col LIMIT n;
```

- **WHERE** — filter rows before group  
- **HAVING** — filter groups after aggregate  
- **DISTINCT** — unique rows  

---

## JOINs

| Join | Returns |
| --- | --- |
| INNER | Matching rows only |
| LEFT | All left + match or NULL |
| RIGHT | All right + match or NULL |
| FULL | All from both |
| CROSS | Cartesian product |

**Interview:** “Users with no orders” → `LEFT JOIN ... WHERE orders.id IS NULL`

---

## Subqueries & CTE

```sql
WITH active_users AS (
  SELECT id FROM users WHERE status = 'active'
)
SELECT * FROM orders WHERE user_id IN (SELECT id FROM active_users);
```

---

## Window functions

```sql
SELECT user_id, amount,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
FROM payments;
```

**RANK**, **DENSE_RANK**, **LAG**, **LEAD** — analytics, dedupe, compare to previous row.

---

## Indexes

- **B-tree** index — equality and range  
- **Composite index** — leftmost prefix rule  
- **Unique index** — enforce uniqueness  

**Why query slow?** Full table scan, missing index, wrong type coercion, function on indexed column.

---

## ACID

| | |
| --- | --- |
| Atomicity | All or nothing |
| Consistency | Valid state |
| Isolation | Concurrent transactions |
| Durability | Committed survives crash |

**Isolation levels:** READ UNCOMMITTED → READ COMMITTED → REPEATABLE READ → SERIALIZABLE  
**Phenomena:** dirty read, non-repeatable read, phantom read.

---

## Normalization vs denormalization

**Normalize** — reduce redundancy (OLTP). **Denormalize** — read performance (OLAP, reporting).

---

## SQL vs NoSQL (interview)

| SQL | NoSQL |
| --- | --- |
| Schema | Flexible schema |
| JOINs | Embed or app-side join |
| ACID transactions | Eventual consistency common |
| Vertical scale + sharding | Horizontal scale |

**SDET:** Assert DB state after API test — `SELECT count(*)`, `WHERE id = ?`.

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
