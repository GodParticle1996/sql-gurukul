# 🐳 SQL Lab 04 — Storage: min/max pruning, row versions, ordering aur live summary

SQL Gurukul → 🔬 Database Internals → **Pruning & columnar**, **Row versions (MVCC)**, **Ordering & views** levels ka lab.
Videos: Snowflake (micro-partitions, immutable files), Airtable (drag-and-drop ordering, live views).
Asli **PostgreSQL 16** aur **MySQL 8.0** par.

```bash
docker compose up -d
./run.sh pg sql/<file>.pg.sql
./run.sh my sql/<file>.my.sql
./scripts/long-txn.sh                      # ex2 ka doosra hissa (do connections ek saath)
```

Docker nahi hai? Local Postgres/MySQL par `lab` database banao aur `NO_DOCKER=1 …` lagao.
Numbers ek laptop (WSL) ke hain. Timing alag aayegi, **pattern wahi rahega**.

---

## ex1-minmax — "data kahan NAHI hai" batao

Snowflake har file (micro-partition) ke har column ka **MIN aur MAX** yaad rakhta hai. Query `WHERE order_date = '3 March'`
aayi — jis file ka range `1 Jan – 9 Jan` hai, use khola hi nahi. Postgres mein yahi cheez hai: **BRIN index**.

```bash
./run.sh pg sql/ex1-minmax.pg.sql
./run.sh my sql/ex1-minmax.my.sql
```

**Postgres** — 5,000,000 orders. Ek table time ke kram mein likhi (jaise app likhti hai), ek bilkul shuffled.

```
      cheez      |  size
 table (5M rows) | 249 MB
 B-tree index    | 107 MB
 BRIN index      | 24 kB

=== Ek din (3 March) ki bikri — kitne 8 kB pages padhne pade? ===
     table_        |                 plan                 | pages_padhe |  ms
 ordered  + BRIN   | Bitmap Heap Scan + Bitmap Index Scan |         261 |   6.3
 shuffled + BRIN   | Seq Scan                             |       31872 | 368.8
 ordered  + B-tree | Index Scan                           |         129 |   2.9

=== BRIN andar kya rakhta hai? Har 128 pages ka MIN aur MAX ===
 range_no |    min     |    max              range_no | min_shuffled | max_shuffled
        0 | 2025-01-01 | 2025-01-02                  0 | 2025-01-01   | 2025-12-31
        1 | 2025-01-02 | 2025-01-03                  1 | 2025-01-01   | 2025-12-31
        2 | 2025-01-03 | 2025-01-05                  2 | 2025-01-01   | 2025-12-31

=== Chaudi row (22 columns) vs patli row (2 columns) — sawaal sirf sum(amount) ===
 wide (22 col)  | 143 MB  | Seq Scan |       18240 | 43.1
 narrow (2 col) | 7168 kB | Seq Scan |         896 | 16.5
```

👉 BRIN **4,400 guna chhota** hai B-tree se (24 kB vs 107 MB) aur kram wale data par lagbhag utna hi tez.
Shuffled data par **bekaar**: har range ka min = 1 Jan, max = 31 Dec → "shayad yahan ho" → sab padho.
Snowflake bhi yahi kehta hai: pruning ke liye data **natural order** mein hona chahiye (ek hafte ka data saath likha gaya);
bigad jaaye toh background mein **re-cluster**.

👉 Row store mein `sum(amount)` ke liye bhi **poori row** padhni padti hai — 22 columns = 20× pages.
Columnar store (Snowflake, ClickHouse) har column alag rakhta hai: 300 mein se 3 columns chahiye toh 3 hi padho.

**MySQL** — InnoDB mein BRIN nahi hai. Table **khud PRIMARY KEY ke kram** mein rakhi hoti hai (clustered index).

```
| table_           | index_name  | size_mb |
| orders_noidx     | PRIMARY     |    75.6 |
| orders_secidx    | created_idx |    38.6 |     ← alag B-tree
| orders_clustered | PRIMARY     |    75.6 |     ← PK = (created, id): koi extra index nahi

| sawaal                       | rows_padhi | ms   |
| koi index nahi               |    2000002 |  485 |
| secondary index (created)    |       5481 |    7 |
| PK = (created, id) clustered |       5481 |    3 |

| wide (22 col)  |     200002 |  211 |   149.7 MB |
| narrow (2 col) |     200002 |   39 |     6.5 MB |
```

👉 MySQL ka jawaab: jis column par range query sabse zyada hai, use **PK ke aage** rakho — data waise hi kram mein
baithega, extra index ki zaroorat nahi. Keemat: har secondary index mein PK copy hota hai, toh chauda PK = mote indexes.

---

## ex2-versions — UPDATE ke baad purani copy kahan jaati hai?

Snowflake ki files kabhi badalti nahi (S3 = likho ek baar): ek row badli → **nayi file**, purani file wahin padi
(isi se "time travel" milta hai). Postgres bhi yahi karta hai — row level par.

```bash
./run.sh pg sql/ex2-versions.pg.sql
./run.sh my sql/ex2-versions.my.sql
./scripts/long-txn.sh
```

**Postgres**

```
 ctid  | xmin  | id | balance              ctid    | xmin  | id | balance
 (0,7) | 42564 |  7 |    1000     UPDATE → (1273,125) | 42566 |  7 |     900

                   kadam                   | table_size | live_rows | dead_rows
 0. shuru (200,000 rows)                   | 10192 kB   |    200000 |         1
 1. sab rows UPDATE (1 baar)               | 20 MB      |    200000 |    200001
 2. sab rows UPDATE (3 baar)               | 40 MB      |    200000 |    600000
 3. VACUUM                                 | 40 MB      |    200000 |         0
 4. phir se sab UPDATE                     | 40 MB      |    200000 |    200000
 5. VACUUM FULL (poori table dobara likhi) | 10192 kB   |    200000 |         0
```

**MySQL (InnoDB)**

```
| kadam                       | table_file_mb | undo_history_len_txns |
| 0. shuru (200,000 rows)     |          16.0 |                     8 |
| 1. sab rows UPDATE (1 baar) |          16.0 |                     9 |
| 2. sab rows UPDATE (3 baar) |          16.0 |                    11 |
```

**Lambi transaction (koi 8 second ka report) — `long-txn.sh`**

```
=== Postgres ===
20 baar poori table UPDATE (report abhi chal raha hai)  → dead rows: 20000
VACUUM kiya (report abhi bhi chal raha hai)            → dead rows: 20000   ❌ hat nahi sakti
Report khatam, phir VACUUM                             → dead rows: 0   ✅

=== MySQL ===
shuru                                                  → purge kitna peeche: 0 trx-ids
300 chhote UPDATEs (report abhi chal raha hai)         → purge kitna peeche: 599 trx-ids   ❌ purge ruka hua
Report khatam, 2 second baad                           → purge kitna peeche: 0 trx-ids   ✅
```

👉 **Postgres**: UPDATE = nayi row, nayi jagah (`ctid` badla). Purani row "dead" hokar page par padi rehti hai —
3 updates ke baad table 4 guna. `VACUUM` dead rows ki jagah **dobara use ke liye khaali** karta hai (size wahi 40 MB,
par agla UPDATE naya space nahi maangta). Disk wapas chahiye toh `VACUUM FULL` — poori table dobara likhta hai aur
tab tak table **locked**.

👉 **MySQL**: UPDATE row ko **apni jagah** badalta hai (file 16 MB hi rahi). Purana version **undo log** mein jaata hai —
koi purana snapshot use padh sakta hai. Purge thread baad mein saaf karta hai.

👉 **Dono mein ek hi dushman: lambi transaction.** Jab tak koi purana snapshot khula hai, database purani copies
nahi hata sakta — kya pata woh report unhe padhe. Production mein ek bhoola hua `BEGIN` (ya 2 ghante ka report)
= table bloat (Postgres) / undo log ka pahaad (MySQL). Video ki 20 TB table mein VACUUM ek mahine se chal raha tha — wahi bimari.

---

## ex3-order-views — Airtable ke do sawaal

```bash
./run.sh pg sql/ex3-order-views.pg.sql
./run.sh my sql/ex3-order-views.my.sql
```

**(a) Drag karke task ko 2nd aur 3rd ke beech rakho** (10,000 tasks)

```
              tareeka              | rows_likhi |   wal
 integer pos (sab ko renumber)     |       9998 | 2237 kB
 fractional pos (2 aur 3 ka beech) |          1 | 72 bytes

 kitni_baar_chala | a |         b          | beech_ka
               52 | 2 | 2.0000000000000004 |        2
```

👉 Position 2.5 rakh do — sirf **ek row** likhi (MySQL mein bhi 9998 vs 1). Par float8 / DOUBLE mein sirf 52 baar
aadha kar sakte ho; 53rd baar beech ka number = kinaara hi nikalta hai → do tasks ki position barabar. Isliye
fractional indexing ke saath kabhi-kabhi **rebalance** (poori list 1, 2, 3… se dobara) — raat ko, chupchaap.
(Figma jaise tools string keys use karte hain — "a", "an", "b" — jo lambe ho sakte hain, khatam nahi hote.)

**(b) Dashboard: "har city ki kamaai"** (1,000,000 orders)

```
Postgres                                        MySQL
 tareeka 1: har baar poori query     35.8 ms     137 ms
 tareeka 2: MATERIALIZED VIEW padho   0.4 ms     (MySQL mein MV nahi — khud ki snapshot table)
            REFRESH                  66.8 ms     907 ms
 REFRESH ... CONCURRENTLY bina unique index:
   ERROR: cannot refresh materialized view "public.city_revenue_mv" concurrently
   HINT:  Create a unique index with no WHERE clause on one or more columns of the materialized view.

 5000 INSERT, bina trigger             16 ms      60 ms
 5000 INSERT, trigger ke saath        271 ms     164 ms

 asli (poori query)                 125567931    125841510
 materialized view / snapshot       124567931    124841510   ← purana (aakhri REFRESH wala)
 summary table + trigger            125567931    125841510   ← hamesha taaza
```

👉 Materialized view = jawab save karke rakha. Padhna turant, par **baasi** — 10,000 naye orders dikhe hi nahi.
REFRESH = poori query dobara (1M rows). `CONCURRENTLY` padhne walon ko nahi rokta, par unique index maangta hai.

👉 Trigger wali summary table **hamesha taaza** hai — par har INSERT ab 2 kaam karta hai (Postgres mein 17× dheema) aur
saare "Delhi" orders **ek hi summary row** ko lock karte hain — flash sale mein wahi row hot-spot ban jaati hai.
Airtable jaisa "live" system yeh kaam incremental aur memory mein karta hai; hum database mein trigger se wahi karte hain.

---

## Khud try karo

1. ex1 (Postgres): `CREATE TABLE orders_resorted AS SELECT * FROM orders_shuffled ORDER BY created` se data dobara
   kram mein likho, uspar BRIN banao. 3 March wali query ke pages kitne gire?
2. ex2 (Postgres): `CREATE TABLE accounts (…) WITH (fillfactor = 70)` karke dobara chalao. 1 UPDATE ke baad size kitna
   bada? (Khaali jagah same page par = "HOT update" — index ko chhoona bhi nahi padta.)
3. ex3: trigger ko `FOR EACH STATEMENT` + transition table (`REFERENCING NEW TABLE AS new_rows`) se likho —
   5000 INSERT ek hi statement mein (`INSERT … SELECT generate_series`) daalo. Ab trigger ki keemat kitni?
