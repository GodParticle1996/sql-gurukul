# 🐳 SQL Lab 09 — Connection pooling: asli Postgres, asli pgbench, asli PgBouncer

SQL Gurukul → ⚙️ Scale & Internals → **Connection Pool** (ex2-sweep) aur 🔬 Database Internals → **Postgres Ke Chhote Hathiyaar** (ex1-cost, ex3-bouncer) levels ka lab (badhaye gaye hisse).
Video: Akhil Sharma — Connection Pooling (Intermediate System Design, Ep 4). System Gurukul lab 35 isi ka simulator hai; yahan
wahi baatein **asli** Postgres 16 + PgBouncer 1.23 par.

```bash
docker compose up -d          # Postgres → 55432 · PgBouncer → 56432 (transaction pooling, 20 asli connections)
./scripts/conn-cost.sh        # ex1-cost
./scripts/sweep.sh            # ex2-sweep
./scripts/bouncer.sh          # ex3-bouncer
docker compose down -v
```

**Docker nahi hai?** Local Postgres (55432, `max_connections = 100`) aur local PgBouncer (56432) chahiye, jiske
`[databases]` mein `lab` (pool 20) aur `lab_tiny` (`pool_size=1`) hon — `pgbouncer/pgbouncer.ini` jaisa, bas `host=127.0.0.1 port=55432`.
Phir `NO_DOCKER=1 ./scripts/…` (`PGPORT`, `BPORT` env se ports badlo). `pgbench` PATH mein ho.

Neeche ke numbers ek **laptop** (Intel Core Ultra 7 255U — 15 W, 14 threads, WSL) par hain, jahan saath mein aur programs bhi chal
rahe the. Ek hi test do run mein bahut alag number de sakta hai — isliye **ek hi run ke andar ki tulna** dekho, absolute number nahi.

---

## ex1-cost — ek connection ki keemat

```
=== 0. max_connections = 100 · CPU cores: 14 ===

=== 1. 90 connections, har ek second mein sirf ek chhoti query ===
us pal: idle 90
90 backend processes · apni (private) memory 109 MB · ek connection ≈ 1250 kB

=== 2. 150 clients seedha Postgres par (max_connections = 100) ===
FATAL:  sorry, too many clients already
```

👉 Postgres mein har connection = ek **alag OS process** (backend). 90 connections, aur 90 ke 90 **idle** — phir bhi har ek ne
~1.25 MB apni memory pakdi hui hai (catalog cache, plan cache, buffers ka hisaab). 1,000 connections = ~1.2 GB sirf baithe rehne ke.
(MySQL mein connection ek **thread** hai — sasta, par wahan bhi `max_connections` ki deewar hai.)

👉 101-va client aate hi: `FATAL: sorry, too many clients already`. 50 app servers × 30 connections ka pool = 1,500 — seedha
Postgres par kabhi nahi chalega.

## ex2-sweep — pool kitna bada? Connections badhao, dekho kab ruk jaata hai

Har query ~1 ms CPU khaati hai (`SELECT count(*) FROM generate_series(1, 20000)`). Har setting 5 second.

```
=== CPU cores: 14 · har run 5 sec · query: SELECT count(*) FROM generate_series(1, 20000) ===
connections   1 →    693 queries/sec · latency avg   1.443 ms
connections   4 →   2328 queries/sec · latency avg   1.718 ms
connections   8 →   1808 queries/sec · latency avg   4.422 ms
connections  14 →   1063 queries/sec · latency avg  13.164 ms
connections  28 →   1054 queries/sec · latency avg  26.545 ms
connections  56 →   1455 queries/sec · latency avg  38.481 ms
connections  90 →   1434 queries/sec · latency avg  62.738 ms
```

(Pehle run mein bhi peak **4** par tha — 2,297/sec — aur uske baad 1,485–1,914 ke beech; latency 1.35 → 52 ms.)

👉 Throughput ka **pahaad**: 1 → 4 tak badhta hai, phir **girta** hai. 4 se 90 connections karne par kaam **zyada nahi hua**
(2,328 → 1,434), bas har query ka intezaar **36 guna** (1.7 → 62.7 ms). Zyada connections = CPU ke liye zyada dhakka-mukki
(context switch, cache thrash, locks) — kaam nahi.

👉 Little's Law se jaancho: `connections ÷ latency = throughput` → 90 ÷ 62.7 ms = **1,434/sec**. Bilkul wahi. Pool bada karne se
queue **app se nikal kar database ke andar** chali jaati hai — wahan woh aur mehngi hai.

👉 Is laptop par peak 4 par kyun, 14 par kyun nahi? CPU 15 W ka hai: gine-chune bade (tez) cores, baaki chhote power-saving cores, aur
saath mein doosre programs. 14 asli cores wale server par peak aage khiskega. **Shape wahi rahega** — isliye pool size ka
andaaza `cores × 2` (+ disks) se shuru karo, phir **apni machine par naapo**. "Jitna bada utna accha" kabhi nahi.

## ex3-bouncer — PgBouncer kab jeetta hai, kab nahi

PgBouncer apps aur Postgres ke beech baithta hai. **Transaction pooling**: client ko asli connection sirf ek transaction ke liye
milta hai, phir wapas pool mein. Lab mein pool = **20** asli connections.

```
=== 1. Lambe connections, sirf SELECT — 5 sec har run ===
seedha      70 clients → 121480 tps · latency avg   0.576 ms
PgBouncer   70 clients →  13026 tps · latency avg   5.374 ms
PgBouncer 1000 clients →  11581 tps · latency avg  86.346 ms   (us waqt Postgres par asli connections: 21)

=== 2. Har request par NAYA connection (PHP / serverless jaisa) — pgbench -C, 20 clients ===
seedha    (har baar naya backend process) →    856 tps · naya connection  4.569 ms
PgBouncer (asli connection pehle se khula) →   4167 tps · naya connection  0.792 ms

=== 3. Transaction pooling ka jaal — SET kisi aur ke sar (lab_tiny: pool mein sirf 1 asli connection) ===
client A ne chalaya: SET work_mem = '512MB'  aur chala gaya
client B (bilkul naya) : SHOW work_mem → 512MB      ← A ki setting B par!
seedha Postgres        : SHOW work_mem → 4MB
Ilaaj — SET LOCAL (sirf transaction ke andar): uske baad client B → 4MB
```

👉 **Bouncer muft nahi hai.** Clients `max_connections` ke andar hain aur connections lambe chalte hain → seedha Postgres
**121,480 tps**, bouncer ke raaste **13,026**. PgBouncer ek hi process hai jo **ek hi CPU core** par chalta hai — `top` mein
use **99%** par dekha. Woh apni chhat par atak gaya (is laptop par alag-alag run mein 8,700–21,500 tps), Postgres nahi.
(Ek aur run mein, jab laptop par doosre programs bhaari chal rahe the: seedha 8,012, bouncer 8,736 — tab dono barabar.)
Production mein isliye bouncer app ke paas / har node par chalate hain, ya `so_reuseport` se kai bouncer processes.

👉 **Uska asli kaam — jo seedha ho hi nahi sakta:** 1,000 clients → Postgres par sirf **21** asli connections (20 `lab` ke,
1 `lab_tiny` ka). Seedha jaate toh ex1 wala `FATAL`.

👉 **Naya connection sasta:** har request par naya connection (PHP, serverless, lambda) → seedha Postgres ko har baar naya process
banana padta hai (**4.6 ms**) → 856 tps. Bouncer ke paas asli connection pehle se khula hai (**0.8 ms**) → **4,167 tps** (~5×).

👉 **Jaal:** transaction pooling mein "session" hota hi nahi. `SET` server connection par chipak jaata hai aur **agle** client ko
mil jaata hai. Yahi baaki session wali cheezon ke saath: session-level advisory locks (lab 10), `LISTEN`, temp tables, SQL `PREPARE`.
Ilaaj: `SET LOCAL` / transaction ke andar ki cheezein — ya woh app session pooling par jaaye. (Protocol-level prepared statements
PgBouncer 1.21+ mein `max_prepared_statements` se chal jaate hain.)

👉 Chhota jaal jo script banate waqt pakda: bouncer ke apne **20 pooled connections bhi** `max_connections` mein ginte hain (woh
10 minute idle rehte hain). Pehle 90 clients seedha bheje the → 90 + 20 > 100 → `FATAL`. Isliye script 70 bhejti hai.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Ek idle connection ki keemat? | ~1.25 MB apni memory (Postgres = process per connection) |
| 101-va client? | `FATAL: sorry, too many clients already` |
| Pool bada = tez? | Nahi — 4 par 2,328/sec, 90 par 1,434/sec aur latency 36× |
| Bouncer throughput badhata hai? | Nahi — ek core ki chhat (99% CPU); lambe connections par seedha tez |
| Bouncer kab zaroori? | 1,000 clients → 21 connections · naya connection 4.6 → 0.8 ms |
| Transaction pooling ka jaal? | `SET` agle client par — `SET LOCAL` use karo |
