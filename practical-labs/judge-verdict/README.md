# Judge verdict: current generation ko hi result mile

Existing [SQL deduplication lesson](../../index.html#level=sds-db-dedup) ke two new stages ke saath use karo. Replay prerequisite unchanged hai. Full system choices [System Gurukul guide](../../../sys-design-gurukul/practical-labs/contest-judge/README.md) mein hain.

SQL Gurukul folder se:

```bash
python3 practical-labs/judge-verdict/verdict.py
```

Python standard library only. [verdict.py](verdict.py) apni temporary SQLite file banati aur remove karti hai. Existing app/user databases untouched. Five checks execute actual SQL. Broker redelivery is a repeated function call; no Redis, broker, sandbox or submitted code runs.

| Check | Predict | Expected result | Explain |
|---|---|---|---|
| Two workers | Same generation, NULL verdict; two connections attempt AC/WA. | Affected-row counts0 and1; one outbox row. Winner may vary. | Conditional predicate + SQLite writer transaction protects one terminal write. |
| Rejudge | Row generation2; old worker generation1. | Guarded write0; NULL-only broken predicate would write1. | NULL alone forgets which judging round owns the result. |
| Exception | Verdict/outbox changed, exception before COMMIT. | Reopened database has neither change. Valid retry commits both. | One transaction prevents split verdict/publication state. This is exception rollback, not a power-cut test. |
| Redelivery | Same committed result event delivered twice. | One local inbox row/effect. | Inbox identity and local effect share a transaction. External service effects need their own protocol. |
| Rebuild | X:WA10,AC30,AC40; Y:AC50. Then rejudge AC30→WA. | Initially2 solved/100 penalty. Afterwards2 solved/130 penalty. | First AC changes to40; two earlier WA add40. Y adds50. |

First predict only the **rejudge** row. Run the full script. Find `PASS rejudge`. Read the predicate below before moving to another check:

```sql
UPDATE submissions SET verdict = ?
WHERE id = ? AND generation = ? AND verdict IS NULL;
```

Three conditions identify the row, judging round and unfinished state. Zero rows can mean missing ID, stale generation or already terminal. Check current state before choosing a response. The real code uses parameter binding; values are not interpolated into SQL.

Next, intentionally remove `generation = ?` and its bound argument in a copied lab file. The stale-generation assertion should fail. Explain why an ordinary retry must retain generation, while explicit rejudge must create a new generation. Restore the guard.

For rollback practice, move the verdict and outbox to separate transactions in a copied file. Predict the split state at the failure injection point. The current assertions should reject that change. A failed attempt must not erase an earlier committed verdict.

Rebuild rule is original and illustrative: each contest/user/problem contributes one solve; earliest Accepted by submitted minute and ID wins; each earlier Wrong Answer adds20 penalty minutes. Other verdicts add no penalty in this exercise. SQL uses `ROW_NUMBER()` for first Accepted and a correlated count for earlier WA. Rebuild from accepted-only rows loses those wrong attempts. Real scoring may use different rules.

The race uses two connections in two threads with a barrier before writing. SQLite serializes writers. This verifies this engine and these predicates; it does not establish another database's isolation or distributed-queue behavior. Outbox rows intentionally retain history. Canonical submissions carry current generations; the board must ignore obsolete scoring versions or rebuild from canonical state.

Production live rebuild also needs a consistent snapshot, a watermark for later changes and a publication handoff. This finite script changes no rows while rebuilding. See [SQLite UPDATE](https://www.sqlite.org/lang_update.html) for predicate semantics.
