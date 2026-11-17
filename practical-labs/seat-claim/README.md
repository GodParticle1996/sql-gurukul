# One seat: old reads, guarded writes

Run from SQL Gurukul. Python3 standard library only. The program creates temporary SQLite files and two child processes, then cleans up. No existing database or external payment service is touched.

```bash
python3 practical-labs/seat-claim/seat_claim.py
```

Before running: both processes read **available, version7**. Parent waits for both reads, then releases both writes. Each worker performs its write/booking transaction. Predict which rule the transaction alone fails to protect.

Observed results:

```text
broken: both processes read available v7; changed=[1, 1]; bookings=2; final=sold v7
guarded: both processes read available v7; changed=[0, 1]; bookings=1; final=sold v8
Version mismatch: changed=0, but seat is still available.
Injected exception after claim → rollback restores available v8 and zero bookings.
```

Winner may be Ana or Ben. Output sorts affected-row counts; it does not claim fixed scheduling.

The broken version uses an earlier availability decision. A transaction around unconditional writes cannot repair that stale decision. The guarded update checks both business state and expected revision while modifying the row:

```sql
UPDATE seat
SET status='sold', owner=?, version=version+1
WHERE id='F12' AND status='available' AND version=?;
```

Here `?` is SQLite parameter syntax. Only affected-row count1 authorizes the booking insert. Claim and booking share one transaction. Successful UPDATE alone is not a committed booking. The lab intentionally omits a booking-seat uniqueness constraint so the broken path remains observable.

Four experiments run: broken two-process claim; guarded two-process claim; metadata-only version mismatch; injected-exception rollback. SQLite permits one writer transaction at a time. Both original reads finish before BEGIN IMMEDIATE; no read transaction is held across the barrier. This arrangement demonstrates stale decisions despite serialized writes. It does not test PostgreSQL row locks, read-snapshot upgrade failures, power loss, external charge rollback or production throughput.

Try one change at a time in a copy:

1. **Remove guarded predicates.** Keep only `WHERE id='F12'`. Both booking inserts can succeed; the one-booking assertion fails.
2. **Re-read after metadata conflict.** Version is8 but seat remains available. Re-evaluate business rules, then use expected8 and `status='available'`. A zero-row result alone cannot justify “sold.”
3. **Remove availability check on retry.** After a successful sale, read version8 and retry with only version8. A version match can now overwrite a sold seat. Version and business eligibility serve different purposes.
4. **Move booking outside transaction.** Inject the failure after claim commit. Seat stays sold with no booking. Reconcile or prevent this split commit; an external payment cannot be pulled into SQLite's local rollback.
5. **Add UNIQUE(seat_id).** The second broken booking insert fails. Roll back the entire transaction, classify the conflict and report correctly. A schema guard is another defense; it does not make the earlier read fresh.

PostgreSQL alternative, shown as a sketch rather than executed here:

```sql
BEGIN;
SELECT status FROM seats WHERE id='F12' FOR UPDATE;
-- Application checks the returned status.
-- If available, update seat and insert booking in this same transaction.
-- If unavailable, do not make the booking.
COMMIT;
```

Use the existing [engine labs](../../docker-labs) for PostgreSQL/MySQL execution. Keep remote calls outside long row-lock holds; coordinate payment with explicit durable states and provider-supported retry handling.

References: [SQLite transactions](https://www.sqlite.org/lang_transaction.html), [PostgreSQL row locking](https://www.postgresql.org/docs/current/explicit-locking.html), [PostgreSQL Read Committed](https://www.postgresql.org/docs/current/transaction-iso.html). Optimistic UPDATE can still acquire database locks. Waiting, predicate recheck and isolation errors depend on the engine and transaction mode.
