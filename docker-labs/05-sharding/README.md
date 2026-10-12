# 🐳 SQL Lab 05 — Sharding ka Instagram tareeka: logical shards, apni IDs, chhote indexes

SQL Gurukul → 🔬 Database Internals → **Logical shards**, **Sharded IDs**, **Postgres ke chhote hathiyaar** levels ka lab.
Video: Instagram ne Postgres ko kaise shard kiya (2012 engineering blog par based).
Is lab mein **har engine ki do machines** hain — node A aur node B.

```bash
docker compose up -d         # Postgres A → 55432, B → 55433 · MySQL A → 33306, B → 33307
./scripts/shards.sh          # ex1 (dono engines)
./run.sh pg sql/ex2-ids.pg.sql        ./run.sh my sql/ex2-ids.my.sql
./run.sh pg sql/ex3-indexes.pg.sql    ./run.sh my sql/ex3-indexes.my.sql
```

Docker nahi hai? Char local instances chahiye (ports `PGPORT`, `PGPORT_B`, `MYPORT`, `MYPORT_B` env se badlo)
aur `NO_DOCKER=1 …`. Numbers ek laptop (WSL) ke hain — **pattern wahi rahega**.

---

## ex1-shards — 8 logical shards, pehle ek machine, phir do

Instagram ne shuru mein **hazaaron logical shards** banaye (Postgres **schemas**) — sab kuch hi machines par.
Ek mapping table batati hai: logical shard → machine. Machine bhari toh kuch logical shards doosri machine par
bhej do, mapping badlo. Data, schema, app ka code — kuch nahi badla.

```
=================== POSTGRES (logical shard = schema) ===================
10,000 users × 8 photos. Shard = user_id % 8
Node A par:  8 shards, 80000 photos

--- ek user ki profile: sirf EK shard ---
user 12 → shard_4 → node A → 8 photos
--- feed: 200 followed users ki photos ---
200 users → 8 alag shards (sabse poochna padega, aur sabse dheema shard poori feed ko dheema karega)

--- Node A 95% bhar gaya. Shards 4-7 node B par bhejo ---
pg_dump | psql — 4 schemas node B par (254 ms)
Node A: 4 schemas, 40000 photos   |   Node B: 4 schemas, 40000 photos
Mapping: 0→A  1→A  2→A  3→A  4→B  5→B  6→B  7→B
--- App ka code wahi. Wahi function: ---
user 12 → shard_4 → node B → 8 photos
user 9 → shard_1 → node A → 8 photos

=================== MYSQL (logical shard = database) ===================
Node A par: 8 shard databases
user 12 → shard_4 → node A → 8 photos
Shards 4-7 node B par (mysqldump, 1470 ms): 4 databases
Mapping: 0→A  1→A  2→A  3→A  4→B  5→B  6→B  7→B
user 12 → shard_4 → node B → 8 photos
user 9 → shard_1 → node A → 8 photos
```

👉 `user_id % 8` **kabhi nahi badalta** — isliye koi row rewrite nahi hui. Agar `user_id % 2` (physical machines) se
shuru kiya hota, teesri machine aate hi `% 3` = lagbhag har row ki jagah badalti.

👉 User ki profile = 1 shard (tez). Feed = 200 users = saare shards (scatter-gather) — shard key ka daam.

👉 Lab mein `pg_dump` ke dauraan un shards par writes rok-ne padte. Instagram ne **replication** se data pehle hi
node B par stream kiya, phir sirf mapping palti — downtime lagbhag zero.

👉 MySQL mein "schema" aur "database" ek hi cheez hai, toh logical shard = ek database. Pattern bilkul wahi.

---

## ex2-ids — har shard apni ID banaye, poori duniya mein unique

Instagram ki 64-bit ID: **41 bit** time (ms, custom epoch se — ~41 saal) | **13 bit** logical shard (8192) |
**10 bit** sequence (har shard mein har ms 1024).

**Postgres** (asli Instagram function, PL/pgSQL)

```
         id          | ms_since_epoch |      kab_bani_utc       | shard | seq
 3988980312464954369 |   475523509081 | 2026-09-18 14:58:50.802 |     5 |   1

             tareeka             | takraav
 har shard ka apna bigserial     |   50000
 Instagram id (shard bits andar) |       0
 ek hi shard ke andar duplicate? |       0

 ek_ms_mein_sabse_zyada  →  446            (limit 1024)
--- agar sequence ko sirf 2 bit diye hote (4 per ms)? ---
 ids_bani | unique_ids | duplicate
    50000 |        560 |     49440

bigint vs UUID v4 — 1,000,000 rows PRIMARY KEY
 INSERT:  bigint 2172 ms   uuid 6168 ms
 index:   bigint 21 MB     uuid 38 MB

 Limit ->  Index Scan Backward using t_bigint_pkey on t_bigint     ← "naye 20 posts", bina timestamp index
```

**MySQL** (sequence nahi hota — counter table + `LAST_INSERT_ID()`, jo Flickr ka "ticket server" jugaad hai)

```
| 3988980978159719425 | 2026-09-18 15:00:10.1590 |     5 |    1 |
| har shard ka apna AUTO_INCREMENT |   20000 |
| Instagram id (shard bits andar)  |       0 |

| pk                                          | insert_ms | table_mb |
| bigint (Instagram jaisa, time ke kram mein) |      5203 |     32.6 |
| 16 random bytes (UUID v4 jaisa)             |     12117 |     68.6 |
| UUID_TO_BIN(UUID(), 1) (time pehle)         |      6918 |     41.6 |

EXPLAIN ... ORDER BY id DESC LIMIT 20  →  Extra: Backward index scan
```

👉 Har shard ka apna auto-increment = har shard par id 1, 2, 3… → **saari 50,000 takraati hain**.

👉 Sequence ke bits = ek ms mein kitni IDs. 10 bit (1024) kaafi hai (hamari tight loop 446/ms tak gayi);
2 bit hote toh 50,000 mein se sirf 560 unique. Bits ka bantwaara ek **faisla** hai: zyada shard bits = kam sequence bits.

👉 Random UUID = har naya insert B-tree ke **beech mein** kahin → pages aadhe bhare, aur har jagah ke page memory mein
chahiye. MySQL mein aur bura, kyunki InnoDB ki **table hi PK ke kram mein** hoti hai (68.6 MB vs 32.6 MB).
UUID chahiye hi toh time-pehle wala (`UUID_TO_BIN(uuid, 1)`, ya UUID v7).

👉 MySQL function mein `NOW(3)` ek statement mein **ek hi time** deta hai — `SYSDATE(3)` asli ghadi hai.

---

## ex3-indexes — chhote indexes

**Postgres** (2,000,000 photos, 2 saal)

```
                index_                 |  size
 poora index (2 saal)                  | 60 MB
 partial (WHERE created >= 1 Dec 2025) | 2552 kB

 user 42, created >= 5 Dec 2025  →  Index Scan Backward using photos_user_recent
 user 42, created >= 1 Jun 2025  →  Index Scan using photos_user_all

 poora token (64 char) | 182 MB
 left(token, 8)        | 60 MB
 Index Scan using photos_token_8 on photos
   Index Cond: ("left"(token, 8) = 'f1c15925'::text)
   Filter: (token = 'f1c1592588411002af340cbaedd6fc33e3c9cb08585a40829bc88130b0b8ebdf'::text)
```

**MySQL** (1,000,000 photos)

```
CREATE INDEX … WHERE created >= '2025-12-01'
ERROR 1064 (42000): You have an error in your SQL syntax … near 'WHERE created >= '2025-12-01''

| photos_token_full |  83.9 MB |
| photos_token_p8   |  21.5 MB |     ← prefix index: token(8)
| photos_token_f8   |  21.5 MB |     ← functional index: (LEFT(token, 8))
EXPLAIN SELECT id FROM photos WHERE token = @t  →  key: photos_token_p8, rows: 1
```

👉 **Partial index**: feed sirf 30 din dekhti hai, toh index bhi sirf 30 din ka — 60 MB → 2.5 MB. Shart fixed date
honi chahiye (`now()` nahi chalta), isliye har mahine naya partial index + purana DROP. **MySQL mein partial index
hai hi nahi.**

👉 **Expression index**: 64 char ke token ke pehle 8 character kaafi unique hain (2M mein 1 row). Index 3× chhota.
Postgres mein query ko wahi `left(token, 8)` likhna padta hai; MySQL ka **prefix index** `token(8)` bina query
badle kaam karta hai.

👉 Instagram ne kaha tha "10× chhota" — hamara 3× aaya kyunki B-tree ki har entry mein ~16 byte ka overhead hai
(pointer, header). Asli bachat key ki lambai par depend karti hai. **Khud naapo, blog par bharosa mat karo.**

---

## Khud try karo

1. `shards.sh` mein `SHARDS=8` ko `16` karo aur shards 8-15 node B par bhejo. Mapping ke alawa kya badla?
2. ex2 mein shard bits 13 se 5 kar do (sequence ko 18 bit). Ab kitne shards ho sakte hain, aur ek ms mein kitni IDs?
3. ex3 (Postgres): `CREATE INDEX … ON photos (user_id, created) WHERE created >= '2025-12-01'` ke baad
   `WHERE created >= now() - interval '30 days'` wali query ka plan dekho. Partial index kyun nahi chuna gaya?
