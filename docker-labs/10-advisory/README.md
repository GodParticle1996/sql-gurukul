# 🐳 SQL Lab 10 — Advisory locks: database hi taala-chaabi

SQL Gurukul → 🔬 Database Internals → **Database Hi Taala-Chaabi — Advisory Locks** (`db-advisory`) level ka lab.
Video: Akhil Sharma — Distributed Locks (Intermediate System Design, Ep 3). System Gurukul lab 36 ne dikhaya ki TTL wala lock
(Redis `SET NX PX`, Redlock) GC pause mein **do baar paisa kaat deta hai**. Yahan wahi sawaal asli **PostgreSQL 16**, **MySQL 8.0**
aur **PgBouncer 1.23** par: jab kaam bhi database mein hai, toh lock bhi wahin kyun rakho.

```bash
docker compose up -d          # Postgres → 55432 · PgBouncer → 56432 (transaction pooling) · MySQL → 33306
./scripts/cron.sh             # ex1-cron
./scripts/xact.sh             # ex2-xact
./scripts/bouncer-trap.sh     # ex3-bouncer-trap
docker compose down -v
```

**Docker nahi hai?** Local Postgres (55432), MySQL 8.0.24+ (33306) aur PgBouncer (56432, `pool_mode = transaction`, `[databases]`
mein `lab_tiny` with `pool_size=1` → `host=127.0.0.1 port=55432`). Phir `NO_DOCKER=1 ./scripts/…`. Neeche ke numbers aise hi local
instances par chalaye gaye hain (Postgres 16.2, MySQL 8.0.46, PgBouncer 1.23.1).

| Postgres | MySQL | Kab chhootta hai |
|---|---|---|
| `pg_advisory_lock(key)` / `pg_try_advisory_lock(key)` | `GET_LOCK('naam', timeout)` | session khatam ya unlock |
| `pg_advisory_xact_lock(key)` / `pg_try_advisory_xact_lock(key)` | — (hai hi nahi) | **COMMIT / ROLLBACK** par khud |
| `pg_locks` (`locktype = 'advisory'`) | `IS_USED_LOCK('naam')` → connection id | |

---

## ex1-cron — 3 servers, ek raat ka job

Teen app servers par wahi cron. Teeno ek hi pal mein jaagte hain aur lock try karte hain.

```
=================== POSTGRES — pg_try_advisory_xact_lock(42) ===================
server C: lock nahi mila → skip
server A: lock nahi mila → skip
server B: lock mila → job chalaya (2 sec)
job_runs mein rows: 1

--- server D ki ghadi 3 second peeche thi — woh ab jaaga ---
server D: lock mila → job chalaya (2 sec)
job_runs mein rows: 2   ← lock ne sirf EK SAATH chalne se roka tha
ilaaj (lock ke andar 'aaj ho chuka?' check) ke baad: server D: aaj ka job ho chuka → skip

--- lock pakadne wala server mar jaaye toh? (session-level pg_advisory_lock) ---
pg_locks: advisory key 42 → serverA (pid 723435)
server B: pg_try_advisory_lock(42) → f
server A ki machine mari (uska connection toota)
server B: pg_try_advisory_lock(42) → t   ← na TTL ka andaaza, na intezaar

=================== MYSQL — GET_LOCK('nightly_job', 0) ===================
server C: lock nahi mila → skip
server A: lock nahi mila → skip
server B: lock mila → job chalaya (2 sec)
job_runs mein rows: 1

--- lock pakadne wala mar jaaye toh? ---
IS_USED_LOCK('nightly_job') → connection 53 ke paas
server B: GET_LOCK('nightly_job', 0) → 0
connection 53 mara (KILL)
server B: GET_LOCK('nightly_job', 0) → 1
```

(Kaun jeetega — har run mein alag. Rows hamesha 1.)

👉 Lock sirf **ek saath** chalne se rokta hai. Der se jaaga server D phir se chala gaya — lock free tha. Asli ilaaj: lock ke
**andar** "aaj ho chuka?" check (lock ke andar check-then-act safe hai, bahar race hai).

👉 Lock ki umar = **connection ki umar**. Server mara → connection toota → lock turant free. Redis lock mein yahi kaam TTL ka
andaaza karta hai (bahut chhota = kaam ke beech lock gaya; bahut bada = mare hue server ka lock minutes tak atka).

👉 ⚠️ Ulta khatra: connection **chupchaap** mara ho (network kata, packet nahi aaye) toh database ko pata chalne mein TCP
keepalive jitna waqt lagta hai — Linux default par **2 ghante**. `tcp_keepalives_idle` / `idle_session_timeout` set karo.

## ex2-xact — lock aur kaam EK HI transaction mein: GC pause wala zombie

System Gurukul lab 36 ki kahani: worker A ne lock liya, paisa kaata, phir **GC pause** mein atak gaya. Wahan Redis lock ka TTL
khatam hua, B ne lock liya aur kaata, A jaaga aur **dobara** kaata. Yahan lock + UPDATE ek hi transaction mein hain:

```
=================== POSTGRES — pg_advisory_xact_lock + UPDATE, ek hi transaction ===================
wallet: ₹10000
t=1s  worker A: lock liya, ₹500 kaate — phir GC pause (4 sec tak database ko kuch nahi bhejta)
t=1s  worker B: pg_try_advisory_xact_lock(7) → f   ← A ke paas hai, B ne nahi kaata
t=3s  worker A ke sessions: 0   ← 2 sec 'idle in transaction' ke baad database ne khatam kiya
t=3s  wallet: ₹10000   ← A ka ₹500 kabhi COMMIT hua hi nahi; session gaya → ROLLBACK, lock bhi chhoota
t=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹9500
t=4s  worker A jaaga, COMMIT bheja → FATAL:  terminating connection due to idle-in-transaction timeout
wallet: ₹9500   ← ek hi baar kata ✅ (zombie ka COMMIT database ne khud mana kiya)

=================== MYSQL — SELECT … FOR UPDATE + wait_timeout ===================
wallet: ₹10000
t=1s  worker A: row lock (FOR UPDATE), ₹500 kaate — phir GC pause · InnoDB mein khule transactions: 1
t=1s  worker B: SELECT … FOR UPDATE NOWAIT → ERROR 3572 (HY000) at line 1: Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.
t=3s  InnoDB mein khule transactions: 0   ← wait_timeout = 2 → server ne A ka connection band kiya → uska ₹500 ROLLBACK
t=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹9500
t=4s  worker A jaaga, COMMIT bheja → ERROR 4031 (HY000) at line 6: The client was disconnected by the server because of inactivity. See wait_timeout and interactive_timeout for configuring this behavior.
wallet: ₹9500   ← ek hi baar kata ✅

--- MySQL ka GET_LOCK transaction ka hissa NAHI ---
ROLLBACK ke baad wallet_1 lock: connection 76 ke paas · main connection 76 hoon
```

👉 Lab 36 mein fencing token isliye chahiye tha kyunki **lock ek jagah (Redis), kaam doosri jagah (ledger)**. Yahan lock aur
kaam **ek hi transaction** mein hain: zombie ka adhoora kaam kabhi COMMIT hua hi nahi, aur uska der se aaya COMMIT database ne
mana kar diya. Database ka transaction hi fencing token ka kaam kar raha hai.

👉 Pause chhota ho toh? A ka lock bana rehta hai, B **intezaar** karta hai — double charge kabhi nahi, bas der. Isliye
`idle_in_transaction_session_timeout` (Postgres) / `wait_timeout` (MySQL) zaroor rakho — warna atka hua worker sabko rok dega.

👉 **MySQL:** `GET_LOCK` session ka hai, transaction ka nahi — ROLLBACK ke baad bhi pakda rehta hai, `RELEASE_LOCK` bhoole toh
connection band hone tak. Transaction ke saath chalne wala lock chahiye toh **row lock** (`SELECT … FOR UPDATE`, `NOWAIT` /
`SKIP LOCKED`). (Purana jaal: MySQL 5.7 se pehle doosra `GET_LOCK` pehle wale ko chupchaap chhod deta tha.)

## ex3-bouncer-trap — PgBouncer + session lock = ek lock, do maalik

```
=== session-level lock, bouncer ke raaste (lab_tiny: pool mein 1 asli connection) ===
client A (bouncer): pg_try_advisory_lock(42) → t   ...kaam kiya, unlock bhool gaya, chala gaya
client B (bouncer): pg_try_advisory_lock(42) → t   ← B ko bhi mil gaya — ab DO maalik
client C (seedha) : pg_try_advisory_lock(42) → f   ← aur baaki sab ke liye band
pg_locks: key 42 → pid 714806 · bouncer se 'SELECT pg_backend_pid()' → pid 714806   ← wahi pooled connection
A aur B dono chale gaye — phir bhi lock pakda hua hai: pid 714806

=== ilaaj: transaction-level lock — COMMIT par khud chhootta ===
client A (bouncer): BEGIN; pg_try_advisory_xact_lock(42) → t; ...kaam...; COMMIT
client C (seedha) : pg_try_advisory_lock(42) → t   ← lock chhoot chuka tha
```

👉 Transaction pooling mein client ka "session" hota hi nahi — lock **bouncer ke pooled connection** par chipak gaya. B ko wahi
connection mila, aur Postgres ke liye yeh wahi session hai jiske paas lock pehle se hai → `t` (advisory lock ek hi session mein
dobara lene par milta hai, ginti badhti hai). Pool bada ho toh bug **random** ho jaata hai: kabhi do maalik, kabhi lock atka.

👉 Lab 09 ka `SET` wala jaal, bas zyada khatarnak. Bouncer ke peeche hamesha `pg_advisory_xact_lock`, ya woh kaam session pooling
wale alag pool se.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| 3 servers, ek job? | `pg_try_advisory_xact_lock` / `GET_LOCK(…, 0)` → rows hamesha 1 |
| Der se jaaga server? | Lock free tha → dobara chala; lock ke andar "aaj ho chuka?" check |
| Lock wala server mara? | Connection toota → lock turant free (koi TTL nahi) |
| GC pause wala zombie? | Lock + kaam ek transaction mein → uska COMMIT mana, ek hi baar kata |
| MySQL ROLLBACK ke baad `GET_LOCK`? | Pakda rehta hai — row lock (`FOR UPDATE`) transaction ke saath chalta hai |
| Bouncer (transaction pooling) + session lock? | Do maalik — `pg_advisory_xact_lock` use karo |
