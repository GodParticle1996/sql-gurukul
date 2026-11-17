**Event replay — actual SQLite exercises**

Python 3 ka built-in SQLite use hota hai. Har experiment fresh memory database banata hai.
MySQL/PostgreSQL server ya Docker ki zaroorat nahi. Existing database touch nahi hota.

```bash
cd /home/vibekdutta/VixiApps/sql-gurukul
python3 practical-labs/event-replay/replay.py --index none
python3 practical-labs/event-replay/replay.py --index wrong
python3 practical-labs/event-replay/replay.py --index right
python3 practical-labs/event-replay/replay.py --index right --cursor 199
python3 practical-labs/event-replay/replay.py --index right --cursor 200
python3 practical-labs/event-replay/replay.py --exercise pagination
python3 practical-labs/event-replay/replay.py --exercise checkpoint
python3 practical-labs/event-replay/replay.py --exercise checkpoint --atomic
python3 practical-labs/event-replay/replay.py --check
```

| Experiment | Predict first | Expected observation |
|---|---|---|
| No index | Order-41 ka cursor 197 hai. Next 2 rows? | 198, 199. Plan table scan aur temporary sort dikha sakta hai. |
| Wrong index | `state` index order/sequence filter mein help karega? | Result same. Relevant composite lookup available nahi. |
| Right index | `(order_id, seq)` ka leading column kya narrow karta hai? | Plan `events_order_seq` range search use karta hai. Result 198, 199. |
| Last page | `--cursor 199` par next 2 rows maangi. Kitni bachi hain? | Sirf sequence 200. `LIMIT 2` maximum hai, guaranteed count nahi. |
| Caught up | `--cursor 200` par kya result hai? | Empty rows. Is dataset ka known head 200 hai; abhi koi newer change nahi. |
| Pagination | First page 1,2,3 ke baad row 1 delete ho. OFFSET 3 ab kya skip karega? | OFFSET next page 5 se; cursor `seq>3` next page 4 se. |
| Separate commits | Total +10 commit; checkpoint se pehle failure. Retry? | Total 20, checkpoint 1. |
| Same transaction | Total +10 ke baad failure, commit se pehle. Retry? | Failure par total 0. Retry ke baad total 10, checkpoint 1. |

Plan wording SQLite version ke saath badal sakti hai. Output ko exact latency benchmark ya rows-examined count mat samjho. Lab engine/version print karta hai. Actual application parameters aur data distribution par plan dobara inspect karo.

**Exercises**

1. Cursor 197 ki jagah 199 lagao. Result mein kitni rows honi chahiye? Empty page ko error kyun nahi bolna chahiye?
2. Query se `order_id` filter hatao. Repeated sequence numbers different orders mein hain. Result scope aur ordering kaunse problems create karenge?
3. `seq > cursor` ko `seq >= cursor` karo. Duplicate event ka risk explain karo.
4. All events already deleted hon toh `MAX(seq)` from retained rows reliable head nahi. Separate stream head/floor metadata ka design batao.
5. Local projection ki jagah remote bank charge rakho. SQLite transaction remote effect ko rollback kyun nahi kar sakti?

<details>
<summary>Worked answers — prediction ke baad kholo</summary>

1. **Page boundary:** `--cursor 199` se `[[200, "state-200"]]` milta hai. `--cursor 200` se `[]` milta hai. Lab mein har order ka known head 200 hai. Empty page ka matlab yahan caught up hai. General replay service mein empty result akela proof nahi: authorization, stream existence, head aur retention floor bhi check karo. Is dataset ke CLI cursor inputs 0 through 200 hain.
2. **Missing scope:** `replay.py` ke top par `QUERY` constant mein `order_id=? AND` hataane par query sab orders match karegi. Parameters mein order ID bhi hatani padegi. Sab orders ke same sequence numbers hain, isliye `ORDER BY seq` ties ko uniquely order nahi karta. Order-41 ke replay ke liye correct fix stream filter rakhna hai. Filter scope choose karta hai; user authorization application ki responsibility hai.
3. **Inclusive cursor:** `>= 197` sequence 197 dobara return karega. Cursor ka contract tha ki 197 already applied hai. State replacement same result de sakti hai; `total = total + 10` dobara chale toh total galat hoga. Query `>` rakho aur retries ke liye consumer ka duplicate-handling contract bhi define karo.
4. **Separate metadata:** `streams` row mein `head`, `floor` aur current snapshot rakho. Example: head 5, retained events 4 and 5, floor 3. Cursor 3 replay kar sakta hai; cursor 2 ke liye event 3 missing hai. Head ko retained table ke `MAX(seq)` se rebuild mat karo: table empty ho sakti hai. Append/cleanup ke saath related metadata ko consistent transaction mein update karo. System Gurukul ka `EventStore` is contract ka runnable example hai.
5. **Remote effect:** bank apna transaction separately commit karta hai. SQLite rollback us bank transaction ko undo nahi karta. Stable payment operation ID, provider-supported idempotency, durable work tracking aur uncertain result ka reconciliation chahiye. Local checkpoint ko bank success ka substitute mat maano.

</details>

Index plan, query rows, unique constraint, deletion ke baad pagination aur broken/fixed checkpoint `--check` se verify hote hain. Fault injection Python exception hai, actual machine power loss nahi. External side effects aur multi-writer event ordering is lab ka proof nahi hain.

References: [SQLite query planner](https://www.sqlite.org/queryplanner.html), [query plan output](https://www.sqlite.org/eqp.html), [SQLite isolation](https://www.sqlite.org/isolation.html).
