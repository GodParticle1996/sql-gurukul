#!/usr/bin/env bash
# ex3 · ek lambi transaction (jaise 10 second ka report) — safai ka kaam ruk jaata hai
#   ./scripts/long-txn.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
HOLD=8

echo "=== Postgres: dead rows VACUUM se hat-ti hain — par tab nahi jab koi purana snapshot khula ho ==="
pgq "SET client_min_messages=warning" "DROP TABLE IF EXISTS hot" \
    "CREATE TABLE hot (id int PRIMARY KEY, n int) WITH (autovacuum_enabled = off)" \
    "INSERT INTO hot SELECT g, 0 FROM generate_series(1, 1000) g" "VACUUM hot" >/dev/null
dead() { pgq "SELECT pg_stat_force_next_flush()" >/dev/null; pgq "SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'hot'"; }

pgq "BEGIN ISOLATION LEVEL REPEATABLE READ" "SELECT count(*) FROM hot" "SELECT pg_sleep($HOLD)" "COMMIT" >/dev/null &
report=$!
sleep 1
for i in $(seq 1 20); do pgq "UPDATE hot SET n = n + 1" >/dev/null; done
echo "20 baar poori table UPDATE (report abhi chal raha hai)  → dead rows: $(dead)"
pgq "VACUUM hot" >/dev/null
echo "VACUUM kiya (report abhi bhi chal raha hai)            → dead rows: $(dead)   ❌ hat nahi sakti"
wait $report
pgq "VACUUM hot" >/dev/null
echo "Report khatam, phir VACUUM                             → dead rows: $(dead)   ✅"

echo
echo "=== MySQL: purani versions undo log mein — purge thread unhe tab tak nahi hata sakta jab tak report chal raha hai ==="
myq "DROP TABLE IF EXISTS hot; CREATE TABLE hot (id int PRIMARY KEY, n int) ENGINE=InnoDB;
     INSERT INTO hot WITH RECURSIVE g(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM g WHERE x < 1000) SELECT x, 0 FROM g;"
# purge lag = (abhi tak ke transactions) - (jin tak ka undo kachra saaf ho chuka) — SHOW ENGINE INNODB STATUS se
hist() { local s; s=$(myq "SHOW ENGINE INNODB STATUS");
  echo $(( $(echo "$s" | grep -o 'Trx id counter [0-9]*' | awk '{print $4}') - $(echo "$s" | grep -o "Purge done for trx's n:o < [0-9]*" | awk '{print $NF}') )); }
sleep 2
echo "shuru                                                  → purge kitna peeche: $(hist) trx-ids"
myq "START TRANSACTION WITH CONSISTENT SNAPSHOT; SELECT count(*) FROM hot; DO SLEEP($HOLD); COMMIT;" >/dev/null &
report=$!
sleep 1
for i in $(seq 1 300); do echo "UPDATE hot SET n = n + 1 WHERE id = $(( (i % 1000) + 1 ));"; done | myin
sleep 2
echo "300 chhote UPDATEs (report abhi chal raha hai)         → purge kitna peeche: $(hist) trx-ids   ❌ purge ruka hua"
wait $report
sleep 2
echo "Report khatam, 2 second baad                           → purge kitna peeche: $(hist) trx-ids   ✅"
