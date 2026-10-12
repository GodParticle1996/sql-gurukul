# 🐳 SQL Lab 08 — Asli replica, asli galti, asli restore

SQL Gurukul → ⚙️ Scale & Internals → **Read Replicas** (ex1-replica) aur 🚀 Advanced → **Backup & Replication** (ex2-pitr) levels ka lab (badhaye gaye hisse).
Video: Akhil Sharma — Replication (Intermediate System Design, Ep 7): "replica backup nahi hai".
Asli **PostgreSQL 16** (primary + streaming standby) aur **MySQL 8.0** (binlog) par.

```bash
docker compose up -d          # primary → 55432 · standby → 55433 (khud pg_basebackup se banta hai) · MySQL → 33306
./scripts/replica.sh          # ex1-replica
./scripts/pitr.sh             # ex2-pitr (Postgres)
./scripts/pitr-mysql.sh       # ex2-pitr (MySQL)
docker compose down -v
```

**Docker nahi hai?** Local primary (`archive_mode = on`, `wal_level = replica` ya `logical`, `pg_hba` mein `host replication`)
aur usse `pg_basebackup -R` se bana standby chahiye. Phir:

```bash
NO_DOCKER=1 ARCHIVE_DIR=/primary/ka/archive/folder ./scripts/pitr.sh    # PGPORT 55432, PGPORT_B 55433, restore 55434
```

Neeche ke numbers isi tarah local Postgres 16.2 + MySQL 8.0.46 (WSL laptop) par chalaye gaye hain.

---

## ex1-replica — replica kya karta hai, kya nahi

```
=== 1. Replica kaun hai, kaisa hai ===
primary ko dikh raha: walreceiver · streaming · async
primary: 10000 orders   |   standby: 10000 orders   |   standby in recovery? t

=== 2. Standby par likhne ki koshish ===
ERROR:  cannot execute INSERT in a read-only transaction

=== 3. Chhoti write — standby par kitni der mein? ===
COMMIT ke baad standby se poochha → 1-vi koshish mein mil gaya (psql chalane mein hi ~20 ms lag jaate hain)
Postgres ka apna hisaab: write_lag 00:00:00.000108 · replay_lag 00:00:00.001003

=== 4. Bada batch job: 2,000,000 orders ek transaction mein ===
COMMIT ke    55 ms baad | primary: 2010001 | standby:    10001 | standby kitna peeche: 12 MB
COMMIT ke   448 ms baad | primary: 2010001 | standby:  2010001 | standby kitna peeche: 0 bytes

=== 5. Galti: kisi ne primary par DROP TABLE chala diya ===
primary par DROP → standby se bhi gayab: 596 ms ke andar (isme psql chalane ka waqt bhi shaamil)
standby: ERROR:  relation "orders" does not exist
```

👉 **Async** replica: primary COMMIT karke aage badh jaata hai, standby peeche se WAL lagata hai. Aam taur par lag **~1 ms**
(`replay_lag`) — isliye "maine save kiya, dikh nahi raha" bug test mein kabhi nahi dikhta.

👉 Par bade batch job ke **turant baad** standby **12 MB peeche** tha: primary par 2,010,001 orders, standby par abhi bhi 10,001.
Usi pal koi report standby se padhe → poora batch gayab dikhega. Isliye "apna likha hua primary se padho" ya lag dekh ke route karo.

👉 Standby **read-only** hai — writes hamesha primary par.

👉 `DROP TABLE` standby tak pahuncha (ek run mein 64 ms, doosre mein 596 ms — dono baar aadhe second ke andar). Replica har
cheez copy karta hai, **galtiyan bhi**. Failover karke bhi table wapas nahi aata.

## ex2-pitr — base backup + WAL archive: samay mein peeche jao

Primary har bhari hui WAL file (16 MB) ko `archive_command` se ek alag folder mein copy karta hai. Raat ko `pg_basebackup`.
Galti hone par: base backup ki copy + archive ki WAL files **replay** — `recovery_target_time` par ruk jao.

```
02:00  base backup liya (pg_basebackup):      10000 orders
09:00  subah ke naye orders:                   10500 orders
10:42  intern ne chalaya: DELETE FROM orders;   (WHERE bhool gaya)
       primary: 0 orders   |   standby: 0 orders
       WAL archive mein: 103 files, aakhri: 000000010000000000000064

=== Restore 1: sirf base backup (02:00 wali copy) ===
       orders: 10000   ← subah ke 500 gaye

=== Restore 2: base backup + WAL archive, recovery_target_time = DELETE se thik pehle ===
       target: 2026-09-29 13:19:03.129453-04
       orders: 10500   ← sab wapas ✅   (restore + replay: 2672 ms)
       server log: recovery stopping before commit of transaction 825, time 2026-09-29 13:19:03.612522-04
```

MySQL mein wahi kaam `mysqldump` + **binlog** karte hain. Dump apne andar likh deta hai ki woh binlog ki kis position par liya
gaya; wahan se binlog replay karo aur DELETE wale transaction se thik pehle ruko (`--stop-position`):

```
02:00  mysqldump liya: 10000 orders   (dump ke andar likha: binlog binlog.000001, position 165944199)
09:00  subah ke naye orders: 10500
10:42  intern ne chalaya: DELETE FROM orders;   → 0 orders
       binlog mein DELETE wala transaction position 165950968 par shuru hota hai

=== Restore 1: sirf dump ===
       orders: 10000   ← subah ke 500 gaye

=== Restore 2: dump + binlog replay (165944199 se 165950968 tak — DELETE se thik pehle) ===
       orders: 10500   ← sab wapas ✅
```

👉 Restore hamesha **alag server / alag database** mein (lab: port 55434 aur `shop_restore`) — prod par seedha replay nahi.
Wahan se sahi rows wapas copy karo.

👉 Sirf dump/snapshot = **aakhri backup tak** ka data. Dump + log = **kisi bhi pal** tak. Log (WAL archive / binlog) hi RPO ko
ghanton se seconds tak laata hai.

👉 Aur restore **test** karo — yeh script khud ek restore drill hai. Jo backup kabhi restore nahi hua, woh backup nahi, umeed hai.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| Replica ka lag kitna? | Aam taur par ~1 ms — par bade batch ke baad 12 MB / ~0.4 s peeche |
| Standby par write? | `ERROR: cannot execute INSERT in a read-only transaction` |
| DROP TABLE ka kya hua? | Standby par bhi gaya, aadhe second ke andar |
| Sirf backup se restore | 10,000 — subah ke 500 gaye |
| Backup + WAL/binlog | 10,500 — DELETE se thik pehle tak |
