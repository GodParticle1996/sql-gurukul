#!/usr/bin/env bash
# ex1 · asli streaming replica — lag, read-only, aur "replica backup nahi"
#   ./scripts/replica.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh

pgp "SET client_min_messages=warning" "DROP TABLE IF EXISTS orders" \
    "CREATE TABLE orders (id bigserial PRIMARY KEY, amount int, note text)" \
    "INSERT INTO orders (amount) SELECT (random() * 5000)::int FROM generate_series(1, 10000)" >/dev/null
sleep 1
echo "=== 1. Replica kaun hai, kaisa hai ==="
pgp "SELECT 'primary ko dikh raha: ' || application_name || ' · ' || state || ' · ' || sync_state FROM pg_stat_replication"
echo "primary: $(pgp 'SELECT count(*) FROM orders') orders   |   standby: $(pgs 'SELECT count(*) FROM orders') orders   |   standby in recovery? $(pgs 'SELECT pg_is_in_recovery()')"

echo
echo "=== 2. Standby par likhne ki koshish ==="
pgs "INSERT INTO orders (amount) VALUES (1)" 2>&1 | head -1

echo
echo "=== 3. Chhoti write — standby par kitni der mein? ==="
pgp "INSERT INTO orders (amount, note) VALUES (1, 'naya order')" >/dev/null
n=1; until [ "$(pgs "SELECT count(*) FROM orders WHERE note = 'naya order'")" = 1 ]; do n=$((n + 1)); done
echo "COMMIT ke baad standby se poochha → $n-vi koshish mein mil gaya (psql chalane mein hi ~20 ms lag jaate hain)"
sleep 0.3
pgp "SELECT 'Postgres ka apna hisaab: write_lag ' || coalesce(write_lag::text, '-') || ' · replay_lag ' || coalesce(replay_lag::text, '-') FROM pg_stat_replication"

echo
echo "=== 4. Bada batch job: 2,000,000 orders ek transaction mein ==="
pgp "INSERT INTO orders (amount) SELECT (random() * 5000)::int FROM generate_series(1, 2000000)" >/dev/null
t0=$(date +%s%N)
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  s=$(pgs "SELECT count(*) FROM orders")
  lag=$(pgp "SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) FROM pg_stat_replication")
  printf "COMMIT ke %5s ms baad | primary: 2010001 | standby: %8s | standby kitna peeche: %s\n" "$(ms_since $t0)" "$s" "$lag"
  [ "$s" = 2010001 ] && break
  sleep 0.2
done

echo
echo "=== 5. Galti: kisi ne primary par DROP TABLE chala diya ==="
t0=$(date +%s%N)
pgp "DROP TABLE orders"
until [ "$(pgs "SELECT count(*) FROM pg_tables WHERE tablename = 'orders'")" = 0 ]; do :; done
echo "primary par DROP → standby se bhi gayab: $(ms_since $t0) ms ke andar (isme psql chalane ka waqt bhi shaamil)"
echo "standby: $(pgs 'SELECT count(*) FROM orders' 2>&1 | head -1)"
echo "Replica ne wafadaari se woh galti bhi copy kar di. Wapas laane ka raasta: base backup + WAL archive (./scripts/pitr.sh)."
