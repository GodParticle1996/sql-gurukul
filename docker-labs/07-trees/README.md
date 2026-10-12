# 🐳 SQL Lab 07 — Tree ko table mein kaise rakhein: Notion ke blocks

SQL Gurukul → 🔬 Database Internals → **Page Ke Andar Page — Tree Ko Table Mein Kaise Rakhein** (`db-trees`) level ka lab.
Video: Akhil Sharma — Notion (har cheez ek block, block ke andar block). Asli **PostgreSQL 16** aur **MySQL 8.0** par.

```bash
docker compose up -d
./run.sh pg sql/ex1-trees.pg.sql
./run.sh my sql/ex1-trees.my.sql
```

Docker nahi hai? Local Postgres/MySQL par `lab` database banao aur `NO_DOCKER=1 …` lagao.
Numbers ek laptop (WSL) ke hain. Timing alag aayegi, **pattern wahi rahega**.

---

## ex1-trees — 200,000 blocks, teen tareeke

Notion mein page ke andar heading, heading ke neeche toggle, toggle ke andar ek aur page… sab **blocks** hain aur har block ka
ek parent hai. 200,000 blocks, 3 workspaces (roots), har block ke 4 bachche → gehraai ~9.

| Tareeka | Har row mein kya | Misaal (block 90000) |
|---|---|---|
| **Adjacency list** | sirf `parent_id` | `90000 → parent 22500` |
| **Materialized path** | poora raasta | `1/5/21/87/351/1406/5625/22500/90000` |
| **Closure table** | har (ancestor, descendant) jodi | `(1,90000) (5,90000) … (22500,90000)` — 9 rows |

### Postgres

```
=== 1. Teen tareeke — kitni rows, kitni jagah ===
 adjacency (parent_id) |  200000 | 20 MB
 materialized path     |  200000 | 30 MB
 closure table         | 1712628 | 153 MB

=== 2. Permission check: block 90000 dikhane se pehle uske saare ancestors (upar ki taraf chalo) ===
          tareeka          | rows_mile | pages_padhe |  ms
 adjacency + recursive CTE |         9 |          36 | 0.05
 materialized path (1 row) |         9 |           4 | 0.01
 closure table             |         9 |          12 | 0.01

=== 3. Page 5 aur uske andar sab kuch (neeche ki taraf — page export / delete / copy) ===
 adjacency + recursive CTE |     21845 |       71007 | 20.74
 materialized path LIKE    |     21845 |         358 |  2.38
 closure table             |     21845 |          88 |  1.02

=== 4. Drag-and-drop: page 5 (poore subtree ke saath) ko workspace 1 se workspace 3 mein le jao ===
 adjacency: parent_id badlo   |          1 |   0.6
 path: har descendant ka path |      21845 |  96.0
 closure: purane rishte hatao |      21845 | 220.5
 closure: naye rishte jodo    |      21845 | 784.5

        90000 ka naya raasta         |        closure ke ancestors
 3/5/21/87/351/1406/5625/22500/90000 | 3,5,21,87,351,1406,5625,22500,90000
```

### MySQL

```
| adjacency (parent_id) |  200000 |    16.0 |      (size_mb)
| materialized path     |  200000 |    32.1 |
| closure table         | 1712628 |   191.5 |

=== 2. Permission check: block 90000 ke saare ancestors ===
| adjacency + recursive CTE |         9 |         28 |  0.2 |      (rows_mile | rows_padhi | ms)
| materialized path (1 row) |         1 |          1 |  0.2 |
| closure table             |         9 |         10 |  0.2 |

=== 3. Page 5 aur uske andar sab kuch ===
| adjacency + recursive CTE |     21845 |      87381 | 27.5 |
| materialized path LIKE    |     21845 |      21847 |  5.6 |
| closure table             |     21845 |      21846 |  2.1 |

=== 4. Drag-and-drop: page 5 ko workspace 1 se workspace 3 mein ===
| adjacency: parent_id badlo   |          1 |   5.8 |
| path: har descendant ka path |      21845 | 708.9 |
| closure: purane rishte hatao |      21845 | 895.2 |
| closure: naye rishte jodo    |      21845 | 202.5 |
```

(Writes ki timing har run mein kaafi badalti hai — ek run mein Postgres path update 85 ms, doosre mein 225 ms. **`rows_badli` nahi
badalta**: 1 vs 21,845. Wahi asli sabak hai.)

👉 **Upar chalna** (permission check — "kya is user ko is block ka koi ancestor share hua hai?") teeno mein sasta hai: gehraai sirf ~9.
Adjacency 9 index lookups karta hai, path ek row padhta hai, closure ek index range.

👉 **Neeche chalna** (page export/copy/delete): adjacency har level par har block ke bachche dhoondhta hai → Postgres **71,007 pages**,
closure table **88 pages** mein wahi 21,845 blocks. Recursive CTE ka kharcha subtree ke size ke saath badhta hai.

👉 **Move karna** (drag-and-drop): adjacency mein **1 row**. Path mein subtree ki **har** row ka path dobara likha (21,845).
Closure mein 21,845 purane rishte hatao + 21,845 naye jodo — aur table pehle se **8.5× badi** (1.7M rows, 153–191 MB).

👉 Isi liye Notion **`parent_id`** rakhta hai (drag-and-drop har minute hota hai), aur permission ke liye upar ki chhoti walk karta hai.
Jahan subtree reads bahut zyada aur moves kam (category tree, org chart report) — wahan closure/path.

## Jaal — page ko uske hi bachche ke andar daal do

```
=== 5. Jaal: page 5 ko uske hi bachche (page 21) ke andar daal do ===        (Postgres)
adjacency ne chupchaap maan liya. Ab 21 ke ancestors — CYCLE clause ke saath:
 id | parent_id | chakkar
 21 |         5 | f
  5 |        21 | f
 21 |         5 | t

 closure: 21 page 5 ke andar hai? | path: 21 page 5 ke andar hai?
 t                                | t
```

```
bina guard: 21 ke ancestors →                                                  (MySQL)
ERROR 3636 (HY000) at line 97: Recursive query aborted after 1001 iterations. Try increasing @@cte_max_recursion_depth to a larger value.

guard ke saath (dekhe hue ids ki list):
|   21 |         5 | 21   |
|    5 |        21 | 21,5 |
```

`parent_id` ko koi constraint cycle se nahi rokta. Ek galat drag-and-drop → 5 ka parent 21, 21 ka parent 5 → har ancestor query
**hamesha ke liye** ghoomti hai. Postgres mein bina guard ke query kabhi khatam nahi hoti (lab mein `CYCLE` clause laga ke dikhaya);
MySQL 1,001 chakkar ke baad khud rok deta hai (`cte_max_recursion_depth`).

Ilaaj: **move se pehle poochho** — "naya parent mere hi subtree mein toh nahi?" Closure table mein ek lookup, path mein ek `LIKE`,
adjacency mein naye parent se upar ki walk (≤ 9 hops).

## MySQL ke do aur jaal (script mein comment)

- `DELETE … WHERE x IN (SELECT … FROM same_table)` → **ERROR 1093** — usi table ko subquery mein nahi padh sakte. Subtree pehle ek alag table mein.
- `TEMPORARY` table ek query mein do baar khul nahi sakti → **ERROR 1137 Can't reopen table**. Isliye helper normal table.
- Recursive CTE ke anchor mein `CAST(id AS CHAR(255))` — warna path column ki width pehli row jitni ban jaati hai aur lambe path kat jaate hain.

## Kya seekha

| Sawaal | Adjacency | Materialized path | Closure table |
|---|---|---|---|
| Jagah | 20 MB | 30 MB | 153 MB (8.5× rows) |
| Upar walk (permission) | 9 lookups | 1 row | 1 range |
| Poora subtree | 71,007 pages | 358 pages | 88 pages |
| Move (drag-and-drop) | **1 row** | 21,845 rows | 2 × 21,845 rows |
| Cycle se bachav | khud check karo | `LIKE` se | ek lookup |
