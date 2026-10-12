# 🐳 SQL Gurukul — Docker Labs

🔬 **Database Internals** track (aur badhaye gaye Isolation / Races / Partitioning / Sharding levels) ke labs.
Har lab asli **PostgreSQL 16** aur **MySQL 8.0** par chalta hai. Har README mein **asli run ke numbers** hain —
tumhari machine par timing alag aayegi, **pattern wahi rahega**.

| Lab | Kya dikhata hai | Levels |
|---|---|---|
| [01-wal](01-wal/README.md) | WAL/redo ka size, har COMMIT ka fsync, `kill -9` ke baad WAL replay | WAL, Checkpoint |
| [02-isolation](02-isolation/README.md) | har isolation level ke 3 jaal, ek seat 20 log, deadlock + lock ordering | Isolation, Races |
| [03-partitioning](03-partitioning/README.md) | pruning aur uske jaal, partition key ke 5 errors, 20 TB table ko live partition | Partitioning, Partition key, Live partitioning |
| [04-storage](04-storage/README.md) | BRIN vs B-tree, chaudi vs patli row, row versions + VACUUM, lambi transaction, fractional ordering, MV vs trigger | Min/max, MVCC, Ordering & views |
| [05-sharding](05-sharding/README.md) | logical shards do machines par, Instagram IDs, UUID ka bill, partial/expression index | Sharding, Sharded IDs, Postgres ke hathiyaar |
| [06-cdc](06-cdc/README.md) | app chalte hue snapshot + WAL stream (logical replication), binlog ROW vs STATEMENT | BOSS: 50 TB migration |
| [07-trees](07-trees/README.md) | 2 lakh blocks: `parent_id` vs materialized path vs closure table, recursive CTE, page ko uske hi bachche mein daalne ka chakra | Tree in SQL (`db-trees`) |
| [08-replication](08-replication/README.md) | asli streaming standby (lag, read-only, DROP bhi copy), `pg_basebackup` + WAL archive PITR, `mysqldump` + binlog PITR | Read Replicas, Backup & Replication |
| [09-pooling](09-pooling/README.md) | ek connection ki memory, `max_connections` ki deewar, pool size ka pahaad (pgbench), PgBouncer kab jeetta / kab nahi, `SET` ka jaal | Connection Pool, Postgres ke hathiyaar |
| [10-advisory](10-advisory/README.md) | 3 servers ek cron, lock wala server mara, GC pause wala zombie (lock + kaam ek transaction), `GET_LOCK` aur PgBouncer ke jaal | Advisory Locks (`db-advisory`) |

```bash
cd sqlgurukul/docker-labs/01-wal
docker compose up -d        # Postgres → localhost:55432, MySQL → localhost:33306
./run.sh pg sql/<file>.pg.sql
./run.sh my sql/<file>.my.sql
docker compose down -v      # kaam khatam
```

- Labs 05 aur 06 mein **doosri machine** bhi hai: Postgres B → `55433`, MySQL B → `33307` (lab 05).
- Lab 08 mein Postgres **standby** → `55433` (khud `pg_basebackup` se banta hai). Labs 09 aur 10 mein **PgBouncer** → `56432`.
- Ek waqt mein ek hi lab chalao — sab same ports use karte hain.
- **Docker nahi hai?** Apne local Postgres/MySQL par `lab` database banao aur har command ke aage `NO_DOCKER=1`
  lagao (`PGPORT`, `PGPORT_B`, `MYPORT`, `MYPORT_B`, `BPORT` env se ports badlo). Lab 06 ke liye node A par `wal_level = logical`.
  Lab 08 ke liye local primary par `archive_mode = on` + ek `pg_basebackup -R` wala standby; labs 09/10 ke liye local PgBouncer
  (har lab ke README mein poori shartein).
- Errors kai jagah **jaan-boojh kar** aate hain (har jaal ka asli error dikhana hai) — `run.sh` rukta nahi.
