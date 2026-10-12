# 🛕 SQL Gurukul — Build Plan

**SQL seekho, khel khel mein — Hinglish mein, hands-on, `SELECT *` se production DBA tak.**

KubeGurukul / AWS Gurukul ka sibling. Pure HTML/CSS/JS — no build, no dependencies.

## Decisions

- **Naam:** SQL Gurukul 🛕 → folder `sqlgurukul/`
- **Flavour:** MySQL 8 (kyunki asli source project MySQL par hai)
- **Domain:** `KPMinWSL/aas-api` ke asli Sequelize models se derived factory-testing DB
- **Scope:** 3 tracks, 28 levels (10 + 9 + 9)
- **Terminal sim:** asli chalne wala mini SQL engine (mock output nahi)
- **Language:** Hinglish throughout
- **Namespace:** `SG`, store key `sqlgurukul-v1`

## Tech Architecture

| File | Kya hai | Sibling apps se farak |
|------|---------|----------------------|
| `core.js` | State, XP, ranks, streak, SRS, registry | Namespace `SG`, SQL ranks |
| `sqlcli.js` | **MySQL simulator** — tokenizer + parser + executor | Naya — asli query execution |
| `games.js` | Game renderers | Same engine, fill game SQL templates |
| `visuals.js` | 28 SQL concept diagrams | Naya content, same `.dg-*` primitives |
| `app.js` | Screens | Same engine, SQL branding |
| `style.css` | MySQL teal (#2fb4d4) + deep navy | Naya palette |
| `data-core.js` | Ranks + tracks + **FACTORY_DB seed** | Seed shared hai — `SG.factoryDB()` |
| `data-*.js` | 10 / 9 / 9 levels | Full content |

### Kyun asli engine, mock nahi

Baaki gurukul apps mein command output scripted hai. SQL mein woh kaam nahi karta —
seekhne ka poora point yeh hai ki **galat query galat jawab de**. `WHERE ip = NULL`
ko `Empty set` <i>sach mein</i> dena chahiye, warna woh sabak nahi banta.

Isliye `sqlcli.js` mein:
- **Tokenizer** — strings, numbers, identifiers, operators, arithmetic
- **Recursive-descent expression parser** — AND/OR/NOT, comparisons, LIKE/IN/BETWEEN/IS NULL,
  arithmetic, CASE WHEN, 25+ scalar functions, scalar/IN/correlated-EXISTS subqueries
- **Query executor** — JOIN (inner/left) row-context building, WHERE, GROUP BY (on
  expressions) + aggregates over any expression, HAVING, ORDER BY, LIMIT/OFFSET, DISTINCT,
  derived tables, CTEs (`WITH`), `UNION [ALL]`
- **Window functions** — partition + order + MySQL's default cumulative frame
- **DML/DDL** — INSERT (constraints + auto-increment), UPDATE (expression values),
  DELETE, CREATE/ALTER/DROP TABLE, CREATE INDEX, CREATE VIEW
- **EXPLAIN** — index detection se `type: ALL` vs `ref` decide
- **Transactions** — BEGIN/COMMIT/ROLLBACK via snapshot
- **Asli MySQL error codes** — 1062, 1048, 1146, 1054, 1064, 1242, 1364

## Tracks & Levels (28 total)

### 🌱 Track 1: Beginner — Query Shishya Path (10)
1. **🗄️ Database 101** — table/row/column, SHOW TABLES, DESCRIBE
2. **🔍 SELECT** — FROM, WHERE, ORDER BY, LIMIT, execution order
3. **🎯 WHERE ke Hathiyar** — AND/OR, LIKE, IN, BETWEEN, **NULL ka jaal**
4. **✏️ CRUD** — INSERT/UPDATE/DELETE, WHERE safety, soft delete
5. **📏 Data Types** — INT vs BIGINT (**asli overflow migration**), DECIMAL vs FLOAT
6. **📊 Aggregates** — COUNT/SUM/AVG, GROUP BY, WHERE vs HAVING
7. **🔀 CASE WHEN** — if-else, conditional aggregation, pass-rate, pivot
8. **🔤 String & Date Functions** — CONCAT/COALESCE/DATE_FORMAT/DATEDIFF, NULL propagation
9. **🔑 Keys & Constraints** — PK, UNIQUE, NOT NULL, DEFAULT, AUTO_INCREMENT vs UUID
10. **🏆 Boss: Factory Report**

### 🔥 Track 2: Intermediate — JOIN Sadhak Path (9)
1. **🔗 INNER JOIN** — ON, aliases, **silent row drop**
2. **⬅️ LEFT JOIN** — anti-join pattern, COUNT(*) trap
3. **🪢 Relationships** — FK, 1:N, N:M junction, ON DELETE
4. **🎁 Subqueries** — IN/scalar, **NOT IN + NULL jaal**
5. **🧹 Normalization** — god-table → 3NF, denormalization trade-offs
6. **🪞 UNION & Self-Joins** — UNION vs UNION ALL, self-join pair traps
7. **⚡ Indexes & EXPLAIN** — B-tree, type: ALL → ref, index ki keemat
8. **🚜 ALTER & Migrations** — up/down, expand-contract
9. **🏆 Boss: Slow Dashboard**

### 🚀 Track 3: Advanced — Schema Guru Path (9)
1. **🔒 Transactions & ACID** — BEGIN/COMMIT/ROLLBACK as seatbelt
2. **🧊 Isolation Levels** — dirty/phantom reads, **lost update**, deadlock
3. **🪟 Views** — reuse + security layer
4. **🪜 Window Functions** — PARTITION BY, ROW_NUMBER top-N-per-group
5. **📖 CTEs** — WITH, chaining, CTE + window = top-N-per-group
6. **🔧 Query Tuning** — N+1, SELECT *, deep OFFSET, sargable
7. **💉 SQL Injection** — prepared statements, least privilege
8. **💾 Backup & Replication** — PITR, replication ≠ backup
9. **👑 Final Boss: 3AM Database Down**

## Per-Level Structure

🎯 objectives · 📖 3 lessons (+ ⚡ war story) · 📊 VISUALS[id] · 🎮 4-5 stages ·
🎤 interview (MCQ + hands-on terminal) · ✔ success checklist · 🏋️ real-MySQL homework ·
🧘 5 flashcards → Revision Dojo

## Game Types (8)

🗂️ bins · 🔢 order · 🔗 match · 🧠 quiz · 📄 fill (SQL blanks) · 🎯 hotspot ·
🚨 incident · 🖥️ terminal (55 missions)

## Ranks (11)

| XP | Rank | Icon |
|----|------|------|
| 0 | Query Shishya | 🐣 |
| 200 | SELECT Sevak | 🔍 |
| 450 | WHERE Wala | 🎯 |
| 750 | JOIN Jodidar | 🔗 |
| 1100 | GROUP BY Gyani | 📊 |
| 1500 | Index Acharya | ⚡ |
| 1950 | Transaction Tapasvi | 🔒 |
| 2450 | Schema Shilpi | 🏗️ |
| 3000 | Optimizer Ojha | 🚀 |
| 3600 | Replication Rishi | 🌐 |
| 4300 | Database Mahaguru | 👑 |

## Content Sourcing — asli evidence se

Har war story `KPMinWSL/aas-api` ke asli artifacts se aayi hai:

| Evidence | Level |
|----------|-------|
| `2024-12-16-change-bx50Sessions-duration-to-bigint.cjs` | Data Types (INT overflow) |
| `2025-08-12-remove-unique-macAddress-cloudLink.cjs` | Keys (constraint reality check) |
| `bx50Data` ke ~40 columns (8 secrets samet) | Normalization + SELECT * risk |
| `adcTestResult.latestDevice` boolean + `progress` counter | Window functions + lost update |
| `adcTestResult.dateCode` `'2624'` (year+week string) | String & Date functions |
| QA dashboard ki 3 alag count queries ("112% pass rate") | CASE WHEN |
| "shift buddy" duplicate emails | UNION & self-joins |
| 180-line query with a thrice-copy-pasted subquery | CTEs |
| `bmsTester` UUID PK vs `bx50Builds` AUTO_INCREMENT | Keys (distributed writes) |
| `bx50Sessions` (userId + buildNum) | N:M junction table |
| 79 migration files | Migrations level |

## Verification (build ke doraan)

Browser ke bina bhi sab kuch node + stubbed DOM se test kiya gaya:

1. **Structural validator** — har stage ka schema, quiz answer indices, bin ids,
   hotspot targets vs `data-hs`, incident graph reachability → 0 problems
2. **Mission runner** — saare 55 terminal missions ki solution asli engine mein
   chala ke `success()` verify → 55/55 complete
3. **Fill solver** — saare 20 fill stages programmatically solve → 0 unfilled slots
4. **Boot test** — `app.js` load + har track map, 28 level intros, certificates, Dojo render
5. **Engine smoke suite** — ~60 standalone queries (window fns, CTEs, UNION, CASE,
   correlated EXISTS, self-joins, functions) output ke saath verify

Yeh harness `scratchpad` mein hain aur content edit ke baad dobara chalane laayak hain.
