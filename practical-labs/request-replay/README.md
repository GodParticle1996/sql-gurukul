# Same key, changed amount aur lost reply

SQL Gurukul folder mein Python 3 se run karo. Standard library ke alawa dependency nahi. Lab temporary SQLite files aur two child processes use karti hai; existing data touch nahi hota.

```bash
python3 practical-labs/request-replay/replay.py
```

`payments` **local rows** hain. Koi real payment nahi hoti. `apply()` key claim, local row aur replay result ko ek transaction mein rakhti hai. `BEGIN IMMEDIATE` SQLite writer access leta hai; PostgreSQL row locking ka test nahi. Concurrent old-read claim ka separate two-process experiment [event-dedup](../event-dedup/README.md) mein hai.

## Pehle predict, phir observe

| Case | Expected result | Database reason |
|---|---|---|
| Same key; JSON field order badli | Same payment ID; 1 effect | Narrow validated schema ke fields sorted form mein compare hote hain. Raw JSON text equality use nahi hoti. |
| Same key; amount 4999→5999 | Reject; 1 effect | Identity ko original parameters se bind kiya hai. Conflict ko normal replay mat bolo. |
| Same key, different shop | Independent payment | Unique identity `(account, operation, key)` hai. Account trusted authenticated context se aana chahiye. Lab mein account explicit argument hai. |
| Same shop, second purchase, same amount | New key creates another payment | Body content aur business intent alag cheezein hain. |
| Child exits before commit | 0 markers, 0 payments; retry creates 1 | Claim, effect aur result ek transaction mein the. |
| Child exits after commit, before reply | 1 marker, 1 payment; retry replays | Result save ho chuka hai. Client ka reply miss hona effect undo nahi karta. |
| First key delete, then retry | Overall 3 markers, 4 payments | Do other independent purchases bhi present hain. Deleted first identity ab new lagti hai. |
| UPSERT sets 100 twice | 100 | Repeated absolute assignment, with no intervening update. |
| UPSERT adds 10 twice, starting 90 | 110 | Conflict branch still adds each time. UPSERT word duplicate protection nahi. |
| Old SET 100 arrives after new 120 | Unguarded:100; guarded:120 | Idempotence alone ordering/version protection nahi. |

Canonicalization yahan only `{amount_cents, currency}` ke liye hai. Amount positive integer, currency explicit uppercase USD/CAD. Unknown fields reject hote hain. Production schema ko defaults, nested arrays, decimal amounts aur version changes ke rules define karne honge. Body fingerprint **key ka substitute nahi**; lab full normalized parameters store karti hai, hash nahi.

## Code mein dekho

1. `requests` primary key identity enforce karti hai. `rowcount` batata hai claim new thi ya duplicate.
2. New claim par payment aur saved result likhte hain. Commit successful hone ke baad response return hota hai.
3. Duplicate par original parameters compare hote hain. Match ho toh saved result; mismatch ho toh rollback/error.
4. `result IS NULL` ko successful completion nahi maante. Correct single-transaction path incomplete row commit nahi karti. Separately committed `in_progress` claim ek **different recovery algorithm** maangti hai.

## Changes to try

1. Parameter comparison remove karo. Changed-amount check fail hoga. **Repair:** same identity ki body ko silently mutate mat karo.
2. `apply()` mein payment insert se pehle COMMIT add karke run karo. Crash-before-commit expectation tootegi: marker survive karegi, effect absent ho sakta hai. **Repair:** local claim/effect/result ki common commit boundary rakho.
3. Absolute UPSERT ki conflict branch mein `n=stock.n+excluded.n` lagao. First assertion fail hogi: repeated assignment ab increment hai. **Repair:** actual SQL expression padho; operation name par guess mat karo.
4. Version predicate remove karo. Stale-set assertion fail hogi: latest 120 overwrite ho jayega. **Repair:** version/business condition rakho; zero rows ko conflict/missing-state ke context mein interpret karo.

Child exit tests actual SQLite restart behavior check karte hain. Power cut, disk loss, provider rollback ya cross-service atomic commit prove nahi hote. Retention delete deliberately unsafe example hai; old unknown purchase ko new key se charge karna repair nahi. Business status/reconciliation System Gurukul ke [retry lab](../../../sys-design-gurukul/practical-labs/retry-identity/README.md) mein hai.

References: [SQLite transactions](https://www.sqlite.org/lang_transaction.html), [UPSERT conflict expressions](https://www.sqlite.org/lang_upsert.html).
