# Search index aur expiring seat hold

Commands **sql-gurukul folder** se run karo. Python3 standard library and FTS5-enabled SQLite chahiye. Dono scripts disposable temporary database create, inspect and delete karti hain. App database change nahi hoti.

Pehle predict karo. Phir run. Result ka reason bolo. Last mein one condition change karo.

## Search: words vs phrase

```bash
python3 practical-labs/design-method/search.py
```

| Row | Text |
|---|---|
| 1 | system design interview tips |
| 2 | design of system |
| 3 | system outage report |
| 4 | interview prep system design |

**Predict:** `system AND design` and `"system design"` same rows denge?

**Actual:** five checks pass. AND →[1,2,4]. Phrase →[1,4]. Update row2 to `runtime engineering` →AND[1,4]. Roll back deletion of row1 →phrase[1,4]. Commit row1 deletion →phrase[4].

**Why:** AND needs both tokens. Phrase needs consecutive tokens in declared order. Default FTS5 tokenization is not exact raw-string equality. Ordinary FTS5 virtual table maintains its own stored content and index. Transaction rollback restores both locally. This is not an external-content configuration or an asynchronous remote index.

**Change:** replace row2 with `system design basics`. Predict row2 now appears in both queries before its later update. Change expected initial arrays only after explaining why. Then change phrase to `"design system"`; row2’s original `design of system` still will not match because `of` separates the tokens.

**Decision:** use [FTS5 documented matching rules](https://www.sqlite.org/fts5.html) to define user-facing search behavior. Parameter binding prevents SQL interpolation; the parameter still follows MATCH query syntax. Search workload, ranking, language support and operations decide whether a separate search service is useful. [System Gurukul Search](../../../sys-design-gurukul/index.html#level=search) covers asynchronous indexing, deletion revisions and permissions.

## Holds: stale owner vs valid sale

```bash
python3 practical-labs/design-method/holds.py
```

**Predict:** Alice generation7 expired600. Bob generation8 owns C7/A12 until1200. Alice payment callback arrives700. Seat remains unsold. Should Alice succeed?

**Actual:** five groups pass:

1. Late Alice, wrong owner and wrong generation reject.
2. C7/A13 expires700; finalization at exactly700 rejects under `expires > now`.
3. Injected failure rolls back both sale and capture intent.
4. Valid Bob sale commits with exactly one capture intent.
5. Bob’s same committed operation retries after expiry and returns its stored result. A new operation or old Alice callback rejects. Outbox still contains one intent.

**Why:** availability alone is not current authority. Conditional UPDATE checks owner, generation, deadline and unsold state together. Stable operation identity distinguishes a replay from another purchase. Local transaction includes sale plus intent; remote payment execution is outside that boundary.

**Change:** on a disposable copy, remove the owner and generation predicates together. Predict Alice’s stale call can win because the seat is unsold and Bob’s deadline is still valid. The first assertion should catch the bug. Restore guards before the next exercise. Separately change the policy to `expires >= now` and explain the new equality behavior before changing its expected result.

**Limits:** these are actual SQLite statements, commits and rollbacks. Hold acquisition and time are fixtures. The script does not simulate a distributed cache failover, race two checkout connections or run a payment provider. [Existing seat-claim practical](../seat-claim/README.md) covers its own database race conditions. [SQLite UPDATE semantics](https://www.sqlite.org/lang_update.html) define which rows match a predicate. Zero affected rows need state classification, not an unconditional success label.

**Payment interview:** if Alice only has a payment authorization, reconcile/void under provider rules. If money was already captured, product policy may require refund. An outbox relay can retry and must use provider-specific idempotency/reconciliation. One local outbox row does not prove one remote charge.

Source review: [1 Method](https://www.youtube.com/watch?v=e8H8d0irqLg). Database mechanics stay here; [System Gurukul practical](../../../sys-design-gurukul/practical-labs/design-method/README.md) covers queue, media, chat, admission and feed decisions.
