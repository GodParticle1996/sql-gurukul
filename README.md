# 🛕 SQL Gurukul

**SQL seekho, khel khel mein — Hinglish mein, hands-on, `SELECT *` se production DBA tak.**

KubeGurukul aur AWS Gurukul ka sibling. Pure HTML/CSS/JS — no build, no dependencies,
sab kuch browser mein. Aur andar ek **asli chalne wala MySQL simulator** hai.

## Run it

```bash
# Option 1: bas file kholo (sab local hai)
explorer.exe index.html        # WSL se
# ya Windows Explorer mein index.html double-click

# Option 2: serve karo
cd sqlgurukul
python3 -m http.server 8000
# → http://localhost:8000
```

Diagram gallery: [`gallery.html`](gallery.html) — saare 42 concept visuals ek page par.

## Kya khaas hai — asli SQL engine

Baaki gurukul apps command output ko *mock* karte hain. Yahan [`sqlcli.js`](sqlcli.js)
ek **chhota MySQL engine** hai — tokenizer, expression parser, aur query executor:

```sql
mysql> SELECT o.name, COUNT(s.id) AS sessions
    -> FROM operators o
    -> LEFT JOIN bx50Sessions s ON o.opId = s.userId
    -> GROUP BY o.name ORDER BY sessions DESC;
+--------------+----------+
| name         | sessions |
+--------------+----------+
| Ravi Kumar   |        3 |
| Priya Sharma |        2 |
| Vikram Rao   |        0 |     ← LEFT JOIN + COUNT(s.id) ka sabak
+--------------+----------+
```

Tumhari query **sach mein chalti hai** — result seed data se compute hota hai, script
se nahi. Isliye galat query galat jawab deti hai, aur `WHERE ip = NULL` sach mein
`Empty set` deta hai.

**Supported:**
- **Queries** — `SELECT` (DISTINCT, INNER/LEFT JOIN, WHERE, GROUP BY *on expressions*, HAVING,
  ORDER BY, LIMIT/OFFSET, aliases), derived tables `FROM (SELECT …) t`, `UNION [ALL]`
- **Window functions** — `ROW_NUMBER/RANK/DENSE_RANK/LAG/LEAD/FIRST_VALUE/LAST_VALUE` plus
  `SUM/COUNT/AVG/MIN/MAX` `OVER (PARTITION BY … ORDER BY …)`, with MySQL's default frame
  (aggregate + `ORDER BY` = **running total**)
- **CTEs** — `WITH a AS (…), b AS (…) SELECT …`, chained and reusable
- **Conditional logic** — `CASE WHEN … THEN … ELSE … END`, and aggregates over *any*
  expression: `SUM(CASE WHEN status='pass' THEN 1 ELSE 0 END)`
- **Subqueries** — scalar, `IN`, and **correlated** `EXISTS` / `NOT EXISTS`
- **Functions** — `COALESCE IFNULL NULLIF IF` · `CONCAT UPPER LOWER LENGTH SUBSTRING TRIM
  REPLACE LEFT RIGHT` · `ABS ROUND FLOOR CEIL MOD GREATEST LEAST` ·
  `NOW CURDATE DATE YEAR MONTH DAY DATEDIFF DATE_FORMAT`
- **Writes & DDL** — `INSERT / UPDATE (with expressions) / DELETE` ·
  `CREATE/ALTER/DROP TABLE` · `CREATE INDEX` · `CREATE VIEW`
- **Ops** — `EXPLAIN` (real `type: ALL` → `ref` analysis, **composite index + left-most
  prefix rule** ke saath) · `BEGIN / COMMIT / ROLLBACK` ·
  `SHOW TABLES` / `DESCRIBE` / `SHOW INDEXES` (with `Seq_in_index`)

Constraint errors bhi asli hain — `ERROR 1062 Duplicate entry`, `ERROR 1048 cannot be null`,
`ERROR 1146 Table doesn't exist`, `ERROR 1054 Unknown column`.

## Database — asli factory se

Sara content ek hi database par chalta hai jo **`KPMinWSL/aas-api`** ke asli
Sequelize models se derive kiya gaya hai (device manufacturing / test automation):

| Table | Kya hai |
|-------|---------|
| `bx50Builds` | device builds (buildNum UNIQUE, duration **BIGINT** — asli overflow migration!) |
| `bx50Data` | device registry (FK `buildNum`, ek jaan-boojh ke rakha orphan row) |
| `bx50Sessions` | junction table: operators × builds (N:M) |
| `operators` | factory operators (ek jaan-boojh ke bina-session wala — LEFT JOIN ke liye) |
| `bmsTester` | BMS board test results (**UUID** primary key — distributed writes) |
| `adcTestResult` | ADC bench results (`progress` counter — race condition ka level) |
| `firmwareFiles` | uploaded firmware binaries |

Seed data mein **bugs jaan-boojh ke chhode gaye hain** — orphan `buildNum 1099`,
NULL `ip`, NULL `partNumber`, ek operator bina sessions ke. Har war story inhi par bani hai.

## Kya hai isme

- **5 tracks, 54 levels** — pehle 4 sequential unlock, har track ka boss + certificate:
  - 🌱 **Beginner (10):** Database 101, SELECT, WHERE/LIKE/IN/NULL, CRUD,
    Data Types (INT overflow), GROUP BY/HAVING, **CASE WHEN & conditional aggregation**,
    **String & Date functions**, Keys & Constraints, Boss: Factory Report
  - 🔥 **Intermediate (13):** INNER JOIN (silent row drop), LEFT JOIN + anti-join,
    FK & 1:N/N:M, **Constraints deep (FK actions, UNIQUE ka NULL jaal)**,
    Subqueries (`NOT IN` + NULL trap), Normalization (+ **schema splitter lab**),
    **BCNF & denormalization ka faisla**, **UNION & self-joins**,
    Indexes & EXPLAIN (+ **index picker lab**), **Index types — kaunsa kab**,
    **Composite indexes & left-most prefix**, ALTER & Migrations, Boss: Slow Dashboard
  - 🚀 **Advanced (10):** Transactions & ACID, Isolation & lost update,
    **Row locks & deadlocks**, Views, Window Functions, **CTEs**,
    Query Tuning (N+1, + **N+1 slider lab**), SQL Injection, Backup & Replication,
    Boss: 3AM Database Down
  - ⚙️ **Scale & Internals (9):** **Connection pooling** (Little's Law slider),
    **Races & MVCC** (`FOR UPDATE` / optimistic / atomic condition),
    **Join algorithms & optimizer**, **Read replicas** (lag, read-after-write),
    **Sharding** (kab haan, kab nahi), **CAP — CP kab, AP kab**,
    **Slow query log** (total time vs per-call), **Partitioning**,
    Final Boss: DB har taraf se dab raha hai
  - 🔬 **Database Internals (12, hamesha khula):** har level mein **MySQL vs Postgres** ka farak aur ek
    **asli-container lab** — **WAL / redo log**, **Checkpoint & crash recovery**, **MVCC — row versions,
    VACUUM vs undo, lambi transaction**, **Partition key ke 5 jaal**, **20 TB live table ko partition karna**
    (NOT VALID → VALIDATE → ATTACH, MySQL EXCHANGE PARTITION), **Min/max pruning — BRIN, columnar (Snowflake)**,
    **Drag-ordering + live summary (Airtable)**, **Tree in SQL — Notion blocks** (parent_id vs path vs closure,
    recursive CTE, chakra ka jaal), **Sharded IDs (Instagram 41/13/10)**, **Partial / expression index,
    PgBouncer**, **Advisory locks** (3 servers ek cron, GC pause wala zombie, `GET_LOCK` aur PgBouncer ke jaal),
    Boss: **50 TB migration — CDC** (logical replication, binlog, idempotent events).
    Saath mein purane levels badhaye: Isolation (kitaab vs asli engine), Races (ek seat 20 log, deadlock),
    Partitioning (pruning ke jaal), Sharding (Instagram ke logical shards), Read replicas (asli standby ka lag),
    Backup (asli PITR — WAL archive + binlog), Connection pool (asli pgbench sweep), PgBouncer (ek-core ki chhat).
    Docker labs 01–10 (`docker-labs/README.md`).

- **Har level mein:** 🎯 objectives · 📖 3 Hinglish lessons + ⚡ real war story ·
  📊 signature diagram · 🎮 4-5 challenges · 🎤 interview round (MCQ + hands-on
  terminal) · 🏋️ real-MySQL homework · 🧘 5 flashcards

- **Game types (8):** 🗂️ bins · 🔢 order · 🔗 match · 🧠 quiz ·
  📄 SQL fill-in-the-blanks · 🎯 diagram hotspots · 🚨 3AM incident decision-trees ·
  🖥️ **MySQL terminal** (67 missions)

- **Interactive labs (4)** — `labs.js`. Inme "sahi jawab yaad karo" nahi hai;
  inme tum ek knob ghumate ho aur number **khud** badalta hai:
  - 🎚️ **Slider lab** — pool size, query time, read:write ratio, N+1 ki ginti.
    Numbers live compute hote hain, hardcode nahi
  - 🔀 **Schema splitter** — god-table ke columns ko tables mein baanto,
    aur update/insert/delete anomalies **live gayab hote** dekho
  - 📊 **Index picker** — columns se index banao (kram maayne rakhta hai) aur
    EXPLAIN turant badalta dekho: `type`, `key`, rows examined, `Using index`
  - 🎬 **Flow player** — do transactions ya ek request ka safar, ek-ek kadam,
    play/pause, aur beech mein sawaal

- **🐳 Docker labs (6)** — [`docker-labs/`](docker-labs/README.md): asli **PostgreSQL 16 + MySQL 8** containers,
  har exercise ke README mein **asli run ke numbers**. Level ke andar ka 🐳 stage batata hai kya chalana hai,
  kya dikhna chahiye, phir output par ek sawaal. Docker nahi? `NO_DOCKER=1` + apne local DB.

- **Retention:** 🧘 Revision Dojo (spaced repetition 1→3→7→16→35 din) ·
  🎲 surprise pop quiz · 🔥 daily streak

- **Progression:** XP, 11 ranks (🐣 Query Shishya → 👑 Database Mahaguru),
  per-level badges + 1-3 stars, per-track certificate. `localStorage` mein save
  (`sqlgurukul-v1`).

## Har level ka war story asli hai

Content asli codebase ke evidence se bana hai — 79 migration files, model comments,
aur schema quirks:

- `2024-12-16-change-bx50Sessions-duration-to-bigint` → **INT overflow** level
- `2025-08-12-remove-unique-macAddress-cloudLink` → **constraint reality check**
- `bx50Data` ke 40 columns (8 secrets samet) → **god-table / normalization** level
- `adcTestResult.latestDevice` boolean → **window function** level
- `adcTestResult.dateCode` `'2624'` (year+week string) → **string/date functions** level
- QA dashboard's 3 separate count queries → **CASE WHEN** level (the "112% pass rate" bug)
- `bmsTester` ka UUID PK vs `bx50Builds` ka AUTO_INCREMENT → **keys** level

## App extend karna

Naya level/track/game/card add karna sirf data files ka kaam hai — engine ko
chhoona nahi padta. Poora guide: [`EXTENDING.md`](EXTENDING.md)

## Files

| File | Kya hai |
|------|---------|
| `core.js` | State, XP, ranks, streak, spaced repetition, level registry (`SG` namespace) |
| `sqlcli.js` | **MySQL simulator** — tokenizer, parser, executor, EXPLAIN, transactions |
| `games.js` | Game renderers (bins/order/match/quiz/fill/hotspot/incident) |
| `labs.js` | **Interactive labs** — slider · splitter · indexlab (live EXPLAIN) · flow player |
| `dockerlab.js` | 🐳 **Docker lab stage** — steps + copy button + "kya dikhna chahiye" + output par sawaal |
| `app.js` | Screens: home, track maps, stages, interview, Dojo, pop quiz, certificates |
| `visuals.js` | 42 concept diagrams (`VISUALS[levelId]`) — naye tracks apne diagrams apni data file mein jodte hain |
| `data-core.js` | Ranks, tracks, aur shared `FACTORY_DB` seed (`SG.factoryDB()`) |
| `validate.js` | **Content checker + mission runner + lab renderer** — `node validate.js` (koi dependency nahi).\nLabs ko sach mein render karta hai, unke goals ko **solvable** saabit karta hai, aur non-Latin script leaks pakadta hai |
| `data-beginner.js` / `data-intermediate.js` / `data-advanced.js` / `data-scale.js` | Level content |
| `data-int-*.js` (6 files) | 🔬 Database Internals track (IIFE mein — koi global nahi) + purane levels ke `SG.extendLevel` |
| `docker-labs/01…06` | Asli Postgres + MySQL labs (compose, scripts, SQL, README numbers ke saath) |
| `gallery.html` | Saare diagrams ek page par |

## Database practice companions

The `db-practice` track starts at `index.html#level=sds-db-replay`: scoped replay queries, composite indexes, cursor pagination and atomic checkpoints. Complete that level to unlock `sds-db-dedup`: claim an event identity and apply its local database effect in one transaction. Then `sds-db-query-cost` covers actual query plans, matching-row work and a conditional like counter.

Run `python3 practical-labs/event-replay/replay.py --check` and `python3 practical-labs/event-dedup/dedup.py --check`. The second lab uses two real worker processes. Broken check-then-act produces total 20; the atomic version produces 10. A separate child-process crash checks rollback and safe retry. Each README includes individual exercises and worked outputs. Run `python3 practical-labs/query-cost/query_cost.py` for SCAN-to-SEARCH plans, duplicate-like failure, conditional counter, exception rollback and unlike/reconciliation. Existing `locks` now includes two seat-claim stages. Run `python3 practical-labs/seat-claim/seat_claim.py`: two actual processes reproduce two bookings, then a guarded UPDATE permits one; version-only conflict and exception rollback are checked separately. These are isolated SQLite experiments, not external payment or queue integrations.

Existing `sds-db-dedup` also adds two request-replay stages. Run `python3 practical-labs/request-replay/replay.py` for scoped parameters, saved response, child exits before/after commit, key pruning, UPSERT expressions and stale-version protection. Six actual SQLite cases pass; no external payment is made.

Existing `sds-db-query-cost` also adds two spatial-query stages. Run `python3 practical-labs/spatial-query/query.py` for a real R*Tree query, exact radius/eligibility filtering, stale-index failure, trigger maintenance/rollback and30 full-scan parity checks. PostGIS reference is documented but was not executed.

Existing `sds-db-dedup` adds two judge-verdict stages. Run `python3 practical-labs/judge-verdict/verdict.py`: two connections race, old generation fails, exception rolls back verdict/outbox, repeated delivery applies one local effect, and scoring rebuild includes wrong attempts. Five actual SQLite checks pass. [Guide](practical-labs/judge-verdict/README.md).

Existing `sds-db-query-cost` and `locks` add four One Method stages. Run `python3 practical-labs/design-method/search.py` and `python3 practical-labs/design-method/holds.py` for FTS5 word/phrase matching and update/rollback, current hold authority, expiry and atomic sale/payment-intent replay. Ten real SQLite check groups passed. [Guide](practical-labs/design-method/README.md).

Current validator: 6 tracks, 57 levels, 277 stages, 67 terminal missions, 150 interview questions, 301 flashcards and 57 diagrams. The validator ran 67 missions and rendered 71 labs. Focused flow/deep-link/gate checks pass with `node dev/sds-test.cjs`; fresh browser layout checks for the dedup, query/counter, seat-claim, request-replay, spatial-query judge-verdict and design-method additions remain pending.

These lessons are original database companions to the System Gurukul source reviews. Transport, receiver architecture and signature checks remain in System Gurukul. [Delivery and remaining source review](../research/system-design-school/DELIVERY.md).
