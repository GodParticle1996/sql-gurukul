# 🐳 SQL Lab 06 (BOSS) — CDC: purana system chalta rahe, naya system pakde

SQL Gurukul → 🔬 Database Internals → **BOSS: 50 TB migration ka database hissa** ka lab.
Video: "Migrating 50 TB at 100k RPS" — snapshot + transaction log ka stream (CDC), idempotent writes.
Is lab mein wahi kaam asli **Postgres logical replication** aur **MySQL binlog** se.

```bash
docker compose up -d          # Postgres A (source, wal_level=logical) → 55432, Postgres B → 55433, MySQL → 33306
./scripts/pg-cdc.sh           # ex1
./scripts/my-binlog.sh        # ex2
```

Docker nahi hai? Node A Postgres par `wal_level = logical` chahiye (`ALTER SYSTEM SET wal_level = logical` + restart),
MySQL par binlog on (8.0 ka default). Phir `NO_DOCKER=1 ./scripts/…`. Numbers ek laptop (WSL) ke hain.

---

## ex1-pg-cdc — snapshot + stream, app chalti rahi

Node A = purana system, 200,000 accounts, **app 10 second tak likhti rehti hai** (~20,000 transactions/sec: balance +1,
har 10va naya account). Beech mein node B par `CREATE SUBSCRIPTION` — Postgres pehle poori table ka **snapshot** copy
karta hai (ek pakke WAL position par), phir us position ke baad ka **har badlaav** WAL se stream karta hai.
Debezium bhi yahi karta hai (replication slot ke zariye), bas beech mein Kafka hota hai.

```
Node A (purana system): 200,000 accounts. Node B (naya system): khaali table, same schema.
App likh rahi hai (10 s)... ab node B par SUBSCRIPTION: pehle snapshot, phir WAL ka stream
    0 s | A: 203614 rows, sum 201843148   | B: 0 rows, sum 0                | peeche: 1306 kB
    1 s | A: 205762 rows, sum 202938621   | B: 204747 rows, sum 202420971   | peeche: 2712 kB
    2 s | A: 207826 rows, sum 203991262   | B: 207307 rows, sum 203726574   | peeche: 2130 kB
    ...
    8 s | A: 219917 rows, sum 210157677   | B: 219523 rows, sum 209956739   | peeche: 1464 kB
--- app ne likhna band kiya (cutover se pehle ka 'write freeze') ---
    9 s | A: 220127 rows, sum 210264775   | B: 220127 rows, sum 210264775   | peeche: 0 bytes
✅ A aur B barabar — ab proxy ko node B ki taraf palat sakte ho

=== Jaal 1: 'notes' table bina PRIMARY KEY ke publish ki ===
INSERT chala. Ab UPDATE:
   ERROR:  cannot update table "notes" because it does not have a replica identity and publishes updates
   HINT:  To enable updating the table, set REPLICA IDENTITY using ALTER TABLE.
Ilaaj: PRIMARY KEY do (ya REPLICA IDENTITY FULL — tab poori purani row se match hota hai, dheema):
   UPDATE chala ✅

=== Jaal 2: node A par naya column (DDL replicate NAHI hota) ===
A: 220128 rows | B: 220127 rows | B par apply errors: 2
(B ek event apply nahi kar paaya → uske BAAD ka poora stream ruka. A par WAL jama ho raha hai.)
B par bhi column jodo:
A: 220128 rows | B: 220128 rows ✅ (retry ke baad stream wahi se chalu — koi row nahi chhooti)
```

👉 **App ek second ke liye bhi nahi ruki.** B snapshot ke dauraan bhi A par likhna chalu tha — woh badlaav WAL mein the,
aur slot ne unhe sambhal ke rakha. B lagataar ~1-2 MB peeche (kuch milliseconds) chalta raha.

👉 **Cutover = likhna ek pal roko → "peeche: 0" ka intezaar → proxy palto.** Video mein yahi: pehle 1% users, phir 10%, 50%, 100%.

👉 **Jaal 1**: UPDATE/DELETE ko B par **kaunsi row** badalni hai, yeh batane ke liye PK (replica identity) chahiye.
PK nahi toh Postgres source par hi UPDATE mana kar deta hai.

👉 **Jaal 2**: logical replication **sirf data** bhejta hai, `ALTER TABLE` nahi. B ek event apply nahi kar paaya toh
**us ke baad ka sab ruka** (order bigadna data kharab karne se behtar hai). Aur jab tak B ruka hai, A ka replication slot
WAL ko delete nahi hone deta — kai din ruka reh gaya toh **A ki disk bhar jaati hai**. Migration ke dauraan
schema change = pehle B par, phir A par.

---

## ex2-my-binlog — Debezium jo padhta hai, woh khud padho

```
=== 1. binlog_format = ROW (MySQL 8 ka default): UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1 ===
   ### UPDATE `lab`.`wallet`
   ### WHERE
   ###   @1=1
   ###   @2='asha'
   ###   @3=100
   ### SET
   ###   @1=1
   ###   @2='asha'
   ###   @3=80

=== 2. binlog_format = STATEMENT: wahi UPDATE ===
   UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1

=== 3. Consumer ko ek event DO BAAR mila (network retry, consumer restart — Kafka mein aam baat) ===
   asli balance (source): 80   (pehla UPDATE ke baad)
   ROW event (state '= 80') do baar lagaya   → 80 ✅
   STATEMENT event ('- 20') do baar lagaya   → 60 ❌
```

👉 ROW format mein binlog **poori row pehle aur baad** likhta hai (`binlog_row_image = FULL`). Consumer "balance = 80"
likhta hai — do baar likho, teen baar likho, jawab 80. Yahi **idempotent** hai.

👉 STATEMENT format sirf SQL bhejta hai — "20 ghatao". Do baar mila toh 40 ghat gaye. Isliye CDC ke liye **ROW** (MySQL)
aur logical decoding (Postgres) — dono **state** bhejte hain, delta nahi.

👉 `mysqlbinlog --read-from-remote-server` MySQL ko **replica ban kar** binlog maangta hai — file system nahi chhoota,
source par koi query nahi chali. Debezium bhi aise hi kaam karta hai.

---

## Khud try karo

1. `WRITE_SECONDS=30 ./scripts/pg-cdc.sh` — kya "peeche" badhta hai ya ek jagah tikta hai? (Tikta hai = B apply
   kar pa raha hai. Badhta hi jaaye = B chhota pad raha hai.)
2. ex1 mein Jaal 2 ke baad B par column **mat** jodo. 1 minute baad node A par
   `SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) FROM pg_replication_slots;`
   chalao — kitna WAL atka hai? (Aakhir mein `DROP SUBSCRIPTION sub` zaroor chalao.)
3. MySQL: `SET SESSION binlog_row_image = 'MINIMAL'` karke ex2 dobara chalao. `WHERE` aur `SET` mein ab kya hai?
   Consumer ke liye isme kya khatra hai?
