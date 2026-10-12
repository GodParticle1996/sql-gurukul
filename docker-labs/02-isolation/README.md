# 🐳 SQL Lab 02 — Isolation levels, lost update, deadlock

SQL Gurukul → 🔬 Database Internals → **Isolation**, **OCC vs PCC** levels ka lab.
Asli **PostgreSQL 16** aur **MySQL 8.0** par, do terminal ek saath chalane ka kaam script khud karti hai.

```bash
docker compose up -d          # Postgres → localhost:55432, MySQL → localhost:33306
./scripts/anomalies.sh        # ex1
./scripts/booking.sh          # ex2 + ex3
```

Docker nahi hai? Apne local Postgres/MySQL par `lab` database banao aur `NO_DOCKER=1 ./scripts/…`
chalao (ports `PGPORT` / `MYPORT` env se badlo).

Numbers asli run ke hain (ek laptop, WSL). Timing alag aayegi, **pattern wahi rahega**.

---

## ex1-anomalies — har level par teen jaal

Script har isolation level par teen chhote "do transaction" khel chalati hai:

| Jaal | Kya hota hai (seat booking app mein) |
|---|---|
| **Dirty read** | T2 ne seat `booked` likhi, abhi COMMIT nahi kiya — T1 ko `booked` dikh gaya. Phir T2 ne ROLLBACK kiya. T1 ne ek aisi cheez dekhi jo kabhi hui hi nahi. |
| **Non-repeatable read** | T1 ne seat ka status do baar padha, beech mein T2 ne COMMIT kar diya — do alag jawab. |
| **Phantom** | T1 ne `count(*) WHERE status='free'` do baar gina, beech mein T2 ne nayi seat daali — ginti badal gayi. |

```bash
./scripts/anomalies.sh
```

```
ENGINE     LEVEL              DIRTY READ   NON-REPEATABLE   PHANTOM
Postgres   READ UNCOMMITTED   nahi         HUA ❌          HUA ❌
Postgres   READ COMMITTED     nahi         HUA ❌          HUA ❌
Postgres   REPEATABLE READ    nahi         nahi             nahi
Postgres   SERIALIZABLE       nahi         nahi             nahi
MySQL      READ UNCOMMITTED   HUA ❌      HUA ❌          HUA ❌
MySQL      READ COMMITTED     nahi         HUA ❌          HUA ❌
MySQL      REPEATABLE READ    nahi         nahi             nahi
MySQL      SERIALIZABLE       nahi         nahi             nahi
```

👉 Teen baatein jo table se dikhti hain:
1. **Postgres mein dirty read hota hi nahi.** `READ UNCOMMITTED` likhoge toh Postgres chupchaap
   `READ COMMITTED` chala deta hai. MySQL sach mein uncommitted data dikha deta hai.
2. **Default alag hai:** Postgres ka default `READ COMMITTED` (non-repeatable + phantom dono ho sakte hain),
   MySQL ka default `REPEATABLE READ`.
3. Standard kehta hai REPEATABLE READ mein phantom ho sakta hai — par **dono engines** snapshot
   (MVCC) se padhte hain, isliye simple `SELECT` mein phantom nahi dikha. Farak `UPDATE`/`SELECT … FOR UPDATE`
   par aata hai: MySQL "current read" karta hai (latest committed row), Postgres serialization error deta hai.

---

## ex2-booking — ek seat, 20 log ek saath

Seat 10 free hai. 20 connection ek saath "book" karte hain. Har ek: status padho → 0.2 s socho → likho.

| Tareeka | Kya karta hai |
|---|---|
| **naive** | `SELECT status` → agar `free` → `UPDATE … booked` |
| **`SELECT … FOR UPDATE`** (pessimistic) | padhte waqt hi row par lock. Baaki 19 line mein khade rehte hain. |
| **version column** (optimistic) | koi lock nahi. `UPDATE … WHERE id=10 AND version = <jo padha tha>`. 0 rows badli = kisi aur ne pehle le li. |

```bash
./scripts/booking.sh
```

```
ENGINE     TAREEKA                       EK SEAT KITNI BAAR BIKI  TIME
Postgres   naive (padho-socho-likho)     20 ❌                    252 ms
MySQL      naive (padho-socho-likho)     20 ❌                    438 ms
Postgres   SELECT ... FOR UPDATE         1 ✅                     4095 ms
MySQL      SELECT ... FOR UPDATE         1 ✅                     4174 ms
Postgres   version column (optimistic)   1 ✅                     237 ms
MySQL      version column (optimistic)   1 ✅                     424 ms
```

👉 **naive = 20 tickets ek seat ke.** Sabne `free` padha kyunki kisi ne abhi likha nahi tha.
Default isolation (dono engines) ise nahi rokta.

👉 **FOR UPDATE sahi hai par line lagti hai:** 20 × 0.2 s ≈ 4 s. Har user doosre ka "sochna" wait karta hai.
Lock ke andar slow kaam (payment API call) = poori line slow.

👉 **Version column sahi bhi, tez bhi** — par 19 logon ko "seat chali gayi, dobara try karo" milta hai.
Jahan takraav kam hai (profile edit, cart), optimistic jeet-ta hai. Jahan sab ek hi row par toot padte
hain (flash sale ki aakhri seat), retry ka toofan aata hai — wahan pessimistic ya queue.

---

## ex3-deadlock — ulta kram, dono phanse

`acc` table mein do account. T1: pehle id 1, phir id 2. T2: pehle id 2, phir id 1 (0.3 s baad shuru).

```
--- DEADLOCK: T1 (A phir B) aur T2 (B phir A) ---
Postgres: deadlock detected  → ek transaction rollback hua
MySQL:    Deadlock found when trying to get lock
--- Ab dono transactions ek hi KRAM mein (pehle id 1, phir id 2) ---
Postgres: koi deadlock nahi ✅ (doosra transaction bas ruka, phir chala)
```

👉 T1 ke paas lock 1 hai, lock 2 chahiye. T2 ke paas lock 2 hai, lock 1 chahiye. Dono hamesha wait karte.
Database ek cycle dhoondhta hai aur **ek transaction ko maar deta hai** (Postgres `deadlock_timeout`
= 1 s ke baad check karta hai; InnoDB turant). App ko us error par **retry** karna hi padega.

👉 Ilaaj: **locks hamesha ek hi kram mein lo** (jaise chhoti id pehle). Transfer(5 → 3) bhi pehle 3 ko lock kare.
Phir ulta cycle ban hi nahi sakta — doosra bas thoda ruk-ta hai.

---

## Khud try karo

1. `booking.sh` mein `sleep 0.2` ko `0.05` karo. FOR UPDATE ka time kitna gira? (≈ 20 × soch-ne ka time)
2. Postgres naive tareeke ko `SERIALIZABLE` mein chalao (`BEGIN ISOLATION LEVEL SERIALIZABLE`). Kitne
   bike? Baaki ko kaunsa error mila? (`could not serialize access` — yeh bhi retry maangta hai.)
3. MySQL: `SHOW ENGINE INNODB STATUS\G` deadlock ke baad chalao — `LATEST DETECTED DEADLOCK` section mein
   dono transactions aur unke locks dikhte hain.
