# Same event, do workers

`sql-gurukul` folder mein Python 3 se run karo. Sirf standard library chahiye. Lab apni temporary SQLite database banati aur remove karti hai.

```bash
python3 practical-labs/event-dedup/dedup.py --mode broken
python3 practical-labs/event-dedup/dedup.py --mode atomic
python3 practical-labs/event-dedup/dedup.py --mode crash
python3 practical-labs/event-dedup/dedup.py --check
```

Same shop-a event `evt-1` local total mein 10 add karta hai. Do independent processes same event handle karte hain.

| Run | Observation | Reason |
|---|---|---|
| broken | Final shop-a total **20**; seen ID ek hi | Dono workers pehle absent dekhte hain. Dono effect apply karte hain. Unique row baad mein add karna already doubled effect undo nahi karta. |
| atomic | Final shop-a total **10** | Writer transaction ke andar unique event claim aur total update hote hain. Duplicate insert no-op hai; duplicate worker effect skip karta hai. |
| crash | Retry se pehle total **0**, seen rows **0**; retry ke baad **10** | Child process insert ke baad, commit se pehle exit karta hai. Reopened database partial transaction ko commit nahi maanti. |

Har run shop-b ke same `evt-1` ko separately process bhi karta hai. Result shop-b 10 hota hai. Identity `(merchant, event_id)` se scoped hai; ek merchant ki event doosre merchant ko suppress nahi karti.

Changes karke observe karo:

1. `broken` mein `seen` table ka primary key already present hai. Explain karo ki total phir bhi 20 kyun hua.
2. `apply_atomic()` mein `if inserted:` condition hatao. Duplicate event ka total 20 ho sakta hai. Unique marker ko side effect ki condition banana zaroori hai.
3. Seen row commit karke, total update se pehle crash simulate karo. Retry marker dekhkar skip karegi aur effect miss hoga. Dono writes ka same commit boundary required hai.
4. Event markers delete kar do aur old event retry karo. Marker retention retry/replay policy se chhoti hui toh duplicate protection expire ho jaati hai.

SQLite ek waqt mein ek writer transaction chalati hai. `BEGIN IMMEDIATE` writer transaction shuru karta hai; contention par wait ya busy error possible hai. Is lab mein bounded connection timeout hai. Yeh PostgreSQL/MySQL locking ka simulation nahi hai. External API call ko local transaction rollback nahi kar sakti.

Original database exercise, motivated by webhook duplicate processing. [SQLite transactions](https://www.sqlite.org/lang_transaction.html) and [UPSERT conflict handling](https://www.sqlite.org/lang_upsert.html) explain the SQL behavior.
