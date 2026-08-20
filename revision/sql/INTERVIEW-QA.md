# SQL — interview Q&A

**Q: Second highest salary?**  
A: `ORDER BY salary DESC LIMIT 1 OFFSET 1` or subquery `MAX` excluding max.

**Q: Duplicate emails?**  
A: `GROUP BY email HAVING COUNT(*) > 1`

**Q: Nth highest salary?**  
A: `DENSE_RANK() OVER (ORDER BY salary DESC) = N` or correlated subquery.

**Q: INNER vs LEFT JOIN?**  
A: Inner drops non-matching; left keeps all left table rows.

**Q: WHERE vs HAVING?**  
A: WHERE filters rows; HAVING filters groups after GROUP BY.

**Q: Index when to add?**  
A: Columns in WHERE/JOIN frequently; consider write overhead; composite for multi-column filters.

**Q: Why is query slow?**  
A: EXPLAIN plan, missing index, select *, lock contention, network, cold cache.

**Q: Test DB validation after API create?**  
A: Poll or direct SELECT; use test schema; cleanup in teardown; no prod DB.

**Q: Transaction in test?**  
A: Rollback after test for isolation (some teams); or dedicated test data + delete.

**Q: Deadlock?**  
A: Two transactions lock rows in opposite order — retry, consistent lock order, smaller transactions.

**Q: Sharding vs replication?**  
A: Sharding splits data; replication copies for read scale/HA.

Write queries on whiteboard: JOIN + GROUP BY + HAVING at least once before interview.
