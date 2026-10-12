# 🐳 SQL Lab 03 — Partitioning: pruning, key ke jaal, live table ko partition karna

SQL Gurukul → 🔬 Database Internals → **Partitioning kyun**, **Partition key**, **Live partitioning** levels ka lab.
Asli **PostgreSQL 16** aur **MySQL 8.0** par. (Video: Jimmy Angelakos, "PostgreSQL Partitioning in Production".)

```bash
docker compose up -d                       # Postgres → localhost:55432, MySQL → localhost:33306
./run.sh pg sql/<file>.pg.sql
./run.sh my sql/<file>.my.sql
```

Docker nahi hai? Apne local Postgres/MySQL par `lab` database banao aur `NO_DOCKER=1 ./run.sh …` chalao.
Errors **jaan-boojh kar** aate hain (har jaal ka asli error dikhana hai) — script ruk-ti nahi.
Numbers ek laptop (WSL) ke hain. Timing alag aayegi, **pattern wahi rahega**.

---

## ex1-pruning — ek hi data, do tables

2,000,000 sensor readings (poora 2025). `readings_flat` = ek badi table. `readings` = 12 mahine ke 12 partitions.

```bash
./run.sh pg sql/ex1-pruning.pg.sql
./run.sh my sql/ex1-pruning.my.sql
```

**Postgres**

```
             sawaal             | partitions_padhe |      kaunse      | pages_padhe |  ms
--------------------------------+------------------+------------------+-------------+-------
 March avg        | flat        |                1 | readings_flat    |        1550 |  33.3
 March avg        | partitioned |                1 | readings_2025_03 |        1082 |  23.7
 date_trunc March | partitioned |               12 | sab 12           |       12744 | 252.3
 sensor_id = 42   | partitioned |               12 | sab 12           |       12744 |  66.6

=== 3. Retention: January ka data hatao ===
           tareeka           | ms | wal_bana | table_size_baad
-----------------------------+----+----------+-----------------
 (pehle) flat table ka size  |    |          | 142 MB
 flat: DELETE WHERE ts < Feb | 99 | 18 MB    | 142 MB
 partitioned: DETACH + DROP  |  1 | 18 kB    | 131 MB
```

**MySQL** (flat table par `IGNORE INDEX` — dikhane ke liye ki pruning khud kitna bachata hai)

```
EXPLAIN ... WHERE ts >= '2025-03-01' AND ts < '2025-04-01'   → partitions: p2025_03
EXPLAIN ... WHERE MONTH(ts) = 3                              → partitions: p2025_01,p2025_02,…,p2025_12

| sawaal                         | rows_padhi | ms   |
| March avg        | flat        |    2000018 |  343 |
| March avg        | partitioned |     169864 |   34 |
| MONTH(ts) = 3    | partitioned |    2000012 |  390 |
| sensor_id = 42   | partitioned |    2000012 |  253 |

| tareeka                     | ms   | disk_par_file     |
| (pehle) flat file           | NULL | 132 MB            |
| flat: DELETE WHERE ts < Feb | 8090 | 132 MB            |
| partitioned: DROP PARTITION |  288 | 208 MB (11 files) |
```

👉 **Pruning tabhi hota hai jab WHERE mein partition key SEEDHI ho.** `date_trunc('month', ts)` ya
`MONTH(ts)` likha — database ko pata hi nahi chalta ki March kaunsa partition hai, toh saare 12 padhta hai.
Filter doosre column (`sensor_id`) par ho, tab bhi saare 12.

👉 **Achhe index ke saath pruning ka fayda chhota hai** (Postgres: 1550 → 1082 pages). Partitioning ka
asli fayda **maintenance** hai: January hatana = `DELETE` (99 ms, 18 MB WAL, table ka size wahi ka wahi —
bas andar dead rows) ya `DROP` (1 ms, 18 kB WAL, file hi gayab). MySQL mein 8 s vs 0.3 s.

---

## ex2-key-traps — partition key ke 5 jaal

```bash
./run.sh pg sql/ex2-key-traps.pg.sql
./run.sh my sql/ex2-key-traps.my.sql
```

| Jaal | Postgres | MySQL |
|---|---|---|
| **1. Row ka koi partition nahi** | `ERROR: no partition of relation "orders" found for row` | `ERROR 1526: Table has no partition for value from column_list` |
| ilaaj | `DEFAULT` partition — par baad mein Feb partition banao toh `ERROR: updated partition constraint for default partition "orders_default" would be violated by some row` | `MAXVALUE` partition — naya mahina = `REORGANIZE PARTITION pmax` (pmax ki rows copy) |
| **2. PK mein partition key nahi** | `ERROR: unique constraint on partitioned table must include all partitioning columns` | `ERROR 1503: A PRIMARY KEY must include all columns in the table's partitioning function` |
| **3. Partition key UPDATE ki** | row `orders_2025_02` se `orders_2025_01` mein chali gayi | row `p2025_02` se `p2025_01` mein chali gayi |
| **4. Do column ki RANGE key** `(date, location)` | doosra partition: `ERROR: partition "t_multi_b" would overlap partition "t_multi_a"`; location 80 gayi `t_multi_a` mein | location 80 gayi `pa` mein (jo location < 50 ke liye socha tha) |
| ilaaj | sub-partitioning: location 80 → `t_sub_2025_01_b` ✅ | (MySQL: `SUBPARTITION BY HASH/KEY` hi milta hai) |
| **5. Kam values wala column (status) par HASH** | 4 partitions: 80000 / 20000 / 0 / 0 | 4 partitions: 80256 / 9807 / 10107 / 0 |
| customer_id par HASH | 25083 / 24904 / 24934 / 25079 | 23948 / 24827 / 25368 / 23853 |

👉 Jaal 4 sabse chupa hua hai: `(date, location)` ko database **ek tuple** ki tarah compare karta hai —
jaise dictionary mein shabd. Pehla column (date) hi faisla kar deta hai. "Har mahine ke andar location
ke hisaab se" chahiye toh **sub-partitioning** karo, multi-column key nahi.

👉 Jaal 5: `status` mein 3 hi values hain aur 80% "delivered" — ek partition mota, do khaali.
Achhi key = (a) jis par queries filter karti hain, (b) bahut saari values, (c) jo kabhi badalti nahi.

---

## ex3-live — chalti hui badi table ko partition karo, bina app roke

Video ki kahaani: 20 TB ki OLTP table, VACUUM ek mahine se chal raha hai. Shart: table lock nahi, 2× disk nahi,
aadha-adhoora view nahi. Plan (ek transaction): table rename → naya partitioned parent → indexes parent par →
naye mahine ka partition → purani table ko **legacy partition** ki tarah ATTACH.

Lab mein `daily_totals` = 2,373,000 rows (218 MB), 2019 se June 2025.

```bash
./run.sh pg sql/ex3-live.pg.sql
./run.sh my sql/ex3-live.my.sql
```

**Postgres**

```
 validate_ke_dauraan_lock  →  ShareUpdateExclusiveLock      (INSERT/UPDATE chalte rehte hain)
 rename_attach_ke_dauraan_lock  →  AccessExclusiveLock      (sab ruk jaata hai)

                        tareeka                         | app_ruki_ms | background_scan_ms
--------------------------------------------------------+-------------+--------------------
 1. seedha ATTACH (scan rename-transaction ke andar)    |         139 |                  0
 2. pehle NOT VALID + VALIDATE (app chalu), phir ATTACH |           6 |                123
 3. NOT VALID + pg_constraint hack, phir ATTACH (video) |           7 |                  0
```

👉 ATTACH ko pakka karna hai ki legacy ki **har row** range ke andar hai — iske liye poori table padhta hai,
aur us waqt table par sabse bhaari lock hai. 218 MB (RAM mein) = 139 ms. **20 TB disk se = ghante.** App band.

👉 Tareeka 2 (safe, bina catalog chhede): `CHECK … NOT VALID` (turant) → `VALIDATE CONSTRAINT` (poora scan,
par halka lock — app chalu) → ab ATTACH ko pata hai ki constraint pakka hai, scan skip. App sirf 6 ms ruki.

👉 Tareeka 3 (video wala): 20 TB par VALIDATE bhi din bhar disk ghisega. Presenter ne data par bharosa karke
`UPDATE pg_constraint SET convalidated = true` kiya — Postgres ko "maan lo" bol diya. **Yeh tabhi jab tumhe
pakka pata ho** ki koi row range ke bahar nahi (future dates wagairah). Galat nikla toh pruning galat
jawab dega — koi error nahi aayega.

**Video ka aakhri step — ek chhoti baat jo video mein nahi hai:**

```
June ka partition banao — par legacy June ko pehle se "own" karti hai:
ERROR:  partition "daily_totals_2025_06" would overlap partition "daily_totals_legacy"
Partition ke bina seedha move karo toh? Rows wapas legacy mein hi gir-ti hain:
 june_ki_rows_kahan  | count
 daily_totals_legacy | 30000

=== Sahi batch (ek transaction): legacy DETACH → June partition → move → legacy chhoti range se wapas ATTACH ===
Ek mahine ka batch: 88 ms
      partition       |  rows   |    min     |    max
 daily_totals_legacy  | 2343000 | 2019-01-01 | 2025-05-31
 daily_totals_2025_06 |   30000 | 2025-06-01 | 2025-06-30
```

👉 Legacy ki range `2019 → July 2025` hai, toh `DELETE … RETURNING` se nikaali rows `INSERT` hote hi **wapas legacy
mein** gir jaati hain. Har batch mein legacy ko detach karo, ek mahina nikaalo, legacy ko **chhoti range** ke saath
wapas attach karo — sab ek transaction mein (88 ms). Raat ko ek-ek mahina.

**MySQL** (1,186,500 rows) — MySQL mein `NOT VALID` constraint nahi hai. Uska jawaab: `EXCHANGE PARTITION`.

```
| tareeka                                     | app_ruki_ms | background_ms |
| 1. ALTER TABLE ... PARTITION BY (copy)      |        9342 |             0 |
| 2. EXCHANGE PARTITION (with validation)     |         606 |         16654 |
| 3. EXCHANGE ... WITHOUT VALIDATION + RENAME |         331 |         16654 |

REORGANIZE PARTITION p_legacy INTO (p_legacy < June, p2025_06)  →  9097 ms
| p_legacy | 1168875 |   | p2025_06 | 15375 |
```

👉 Seedha `ALTER TABLE … PARTITION BY` = poori table ki copy, writes band (9.3 s).

👉 EXCHANGE ke liye dono tables ka structure **bilkul same** chahiye — isliye pehle legacy ka PK `(id)` se
`(id, total_date)` karna pada (`ALGORITHM=INPLACE, LOCK=NONE` — 16.6 s ka rebuild, par app chalu).
Phir khaali partitioned table ka `p_legacy` partition legacy table se **swap** (files ki adla-badli, copy nahi).
`WITHOUT VALIDATION` = Postgres wala hack, MySQL ka officially supported roop.

👉 `LOCK TABLES … EXCHANGE … RENAME … UNLOCK` ek saath — warna swap aur rename ke beech aaya INSERT
khaali purani table mein chala jaata.

👉 Farak: MySQL mein legacy se June alag karna (`REORGANIZE`) **poori p_legacy dobara likhta hai** (9 s) — Postgres
jaisa "ek mahina nikaalo" batch nahi hai. Badi legacy ko MySQL mein chhota karne ka practical tareeka: use
waise hi rehne do, retention poora hone par ek baar mein `DROP PARTITION p_legacy`.

---

## Khud try karo

1. ex1 mein `CREATE INDEX readings_ts` hata do. Ab "March avg flat vs partitioned" ke pages kitne alag hain?
2. ex2 mein `DEFAULT` partition ki jagah pehle se 3 mahine ke partitions banao — ek chhota `DO` loop likho jo
   "agle 3 mahine" ke partitions `IF NOT EXISTS` ke saath banaye (yahi cron job roz chalta hai).
3. ex3 (Postgres) mein hack se pehle legacy mein ek row `2030-01-01` wali daal do. ATTACH phir bhi chalega.
   Ab `SELECT count(*) FROM daily_totals WHERE total_date = '2030-01-01'` chalao — jawaab kya aaya, aur kyun?
