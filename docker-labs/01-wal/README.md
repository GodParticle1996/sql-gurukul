# 🐳 SQL Lab 01 — WAL / redo log: pehle log, phir data

SQL Gurukul → 🔬 Database Internals → **WAL** aur **Checkpoint** levels ka lab.
Asli **PostgreSQL 16** aur **MySQL 8.0** par.

```bash
docker compose up -d                       # Postgres → localhost:55432, MySQL → localhost:33306
./run.sh pg sql/<file>.pg.sql              # Postgres par chalao
./run.sh my sql/<file>.my.sql              # MySQL par chalao
```

Docker nahi hai? Apne local Postgres/MySQL par `lab` database banao aur `NO_DOCKER=1 ./run.sh …`
chalao (ports `PGPORT` / `MYPORT` env se badlo).

Numbers asli run ke hain (ek laptop, WSL) — tumhari machine ki disk alag hai, isliye numbers alag
aayenge; **pattern wahi rahega**.

---

## ex1-wal-basics — ek row, kitne indexes, kitna log

Teen tables, har ek mein 50,000 rows: 0 index, 1 index, 5 indexes.

```bash
./run.sh pg sql/ex1-wal-basics.pg.sql
./run.sh my sql/ex1-wal-basics.my.sql
```

```
Postgres (WAL)                 MySQL (InnoDB redo log)
  0 index |  6268 kB             0 index |  6.5 MB
  1 index |    11 MB             1 index |  8.6 MB
  5 index |    28 MB             5 index | 16.8 MB

Ek UPDATE ka WAL record (sirf badlaav, poori row nahi): 344 bytes
```

👉 Har index ek aur B-tree hai jise badalna padta hai — aur har badlaav pehle log mein jaata hai.
Client ko "done" tabhi milta hai jab **log** disk par pakka ho; data pages baad mein.

---

## ex2-commit-cost — har COMMIT ka fsync

5,000 alag-alag transactions, har ek ek row.

```bash
./run.sh pg sql/ex2-commit-cost.pg.sql
./run.sh my sql/ex2-commit-cost.my.sql
```

```
Postgres
 synchronous_commit=on  | 4436 ms |   1,127 commits/sec
 synchronous_commit=off |   50 ms | 100,000 commits/sec

MySQL
 safe    (flush_log_at_trx_commit=1, sync_binlog=1) | 32284 ms |   155 commits/sec
 relaxed (flush_log_at_trx_commit=2, sync_binlog=0) |   551 ms | 9,078 commits/sec
```

👉 Yeh speed **muft nahi hai**. `off` / `2` ka matlab: commit "ho gaya" bol diya, par log abhi disk
par pakka nahi — machine crash hui toh aakhri kuch sau milliseconds (Postgres) ya ~1 second (MySQL)
ke commits ja sakte hain. MySQL mein **do** log hain (redo + binlog), isliye dono ki setting badalni padi.

---

## ex3-crash-recovery — kill -9 aur WAL replay

```bash
./run.sh pg sql/ex3-crash-setup.pg.sql
./run.sh pg sql/ex3-crash-writer.pg.sql &        # lagatar commits
sleep 4
docker compose kill -s SIGKILL postgres          # bijli gayi
docker compose start postgres
docker compose logs postgres | grep -E "not properly|redo starts|redo done|ready"
./run.sh pg sql/ex3-crash-check.pg.sql
```

```
LOG:  database system was not properly shut down; automatic recovery in progress
LOG:  redo starts at 0/187C638
LOG:  redo done at 0/4D1AB58 system usage: ... elapsed: 0.19 s
LOG:  database system is ready to accept connections

 rows_bache | aakhri_id          duplicate_ids
      31272 |     31272                      0
```

👉 Crash ke waqt bahut saare pages sirf memory mein "dirty" the. Restart par Postgres ne pichhle
checkpoint (`redo starts at …`) se WAL **replay** kiya aur har committed row wapas aa gayi.
`redo starts` se `redo done` tak jitna WAL hai, utna hi recovery ka kaam — isi liye checkpoints
zaroori hain.
