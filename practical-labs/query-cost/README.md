# Index search aur correct stored count

SQL Gurukul ka third Database Practice level: `#level=sds-db-query-cost`. Replay aur dedup levels pehle complete karo. Python 3 ke built-in SQLite se actual SQL run hoti hai. Database memory mein banti hai; existing app/user databases change nahi hote.

`/home/vibekdutta/VixiApps/sql-gurukul` folder mein:

```bash
python3 practical-labs/query-cost/query_cost.py --exercise plan
python3 practical-labs/query-cost/query_cost.py --exercise counter
```

Plan run se pehle predict: two posts ke 30,000 likes each hain. `SELECT COUNT(*) FROM likes WHERE post_id=42` result index add karne se change hoga?

Result **30,000 both times**. First plan contains `SCAN`; second contains `SEARCH` on `likes_post` (this query can use a covering index). Exact text SQLite version se vary kar sakta hai. Index matching range locate karti hai. Matching entries count karna still work hai. No wall-clock speedup, number of physical disk reads or universal three-page guarantee is asserted. This in-memory database does not benchmark storage.

One video slide illustrates an index seek with about three pages. Seek depth is not whole-query cost. PostgreSQL index-only scans also depend on covered columns and visibility; SQLite plan is not a PostgreSQL measurement.

Counter run mein exact observations:

| Step | Membership rows | Stored count | Reason |
|---|---:|---:|---|
| Broken duplicate Ana like | 1 | 2 | Unique membership alone does not suppress unconditional increment. |
| Reset; conditional Ana retry | 1 | 1 | Increment only when new row was inserted, in same transaction. |
| Ben insert followed by exception | 1 | 1 | SQLite transaction rolls back Ben row. No process was killed in this lab. |
| Retry Ben; unlike Ana twice | 1 | 1 | Ben adds once; first unlike removes Ana and decrements; repeated unlike changes nothing. |
| Deliberate count=99; reconciliation | 1 | 1 | Recompute from authoritative membership in one writer transaction. |

Code shape:

```python
with db:
    inserted = db.execute('''
      INSERT INTO likes(post_id,user_id) VALUES(42,?)
      ON CONFLICT(post_id,user_id) DO NOTHING
    ''', ('Ana',)).rowcount
    if inserted:
        db.execute('UPDATE posts SET like_count=like_count+1 WHERE id=42')
```

`PRIMARY KEY(post_id,user_id)` defines one current like per user per post. Both changes share a transaction. SQLite allows one writer at a time. Busy/timeout needs an application retry/error policy; this single-connection exercise does not test contention. The [earlier two-process companion](../event-dedup/README.md) demonstrates race and process-exit recovery separately.

Try one change at a time:

1. Remove `if inserted` and run. Duplicate Ana makes count=2; assertion should fail. Unique constraint still protects membership, not unconditional arithmetic.
2. Commit the membership insert before the injected exception. Ben row remains while count is old. Explain why one transaction matters; then restore code.
3. Remove `if removed`. Second Ana unlike decrements again; stored count and membership differ. At zero, CHECK would reject negative count, but CHECK alone cannot detect all wrong nonnegative totals.
4. Add 30,000 more matching rows. Indexed count must count the larger matching range. Index does not cache aggregate value automatically.

Production questions: direct writes must obey the same update contract; bulk imports/deletes need counter maintenance; reconciliation must not race live changes. Late old "like" after a newer "unlike" needs ordering/version or operation-identity rules beyond membership uniqueness. This example is not a complete social-app event protocol. A very popular post can serialize writes on its counter row. Sharded counters add routing, deduplication and read-sum costs; no performance claim is measured here.

References: [SQLite query-plan output](https://www.sqlite.org/eqp.html), [transactions](https://www.sqlite.org/lang_transaction.html), [UPSERT](https://www.sqlite.org/lang_upsert.html), [PostgreSQL index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html). System-level decisions: [System Gurukul scaling practice](../../../sys-design-gurukul/practical-labs/scaling-decisions/README.md).
