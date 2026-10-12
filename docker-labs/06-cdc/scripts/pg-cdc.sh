#!/usr/bin/env bash
# ex1 · 50 TB migration ka chhota roop: purana system (node A) chalta rahe, naya (node B) pakde — snapshot + change stream
#   ./scripts/pg-cdc.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
WRITE_SECONDS=${WRITE_SECONDS:-10}

# purani run ka kachra saaf
pgb "SET client_min_messages=warning" "DROP SUBSCRIPTION IF EXISTS sub" "DROP TABLE IF EXISTS accounts, notes" >/dev/null 2>&1
pga "SET client_min_messages=warning" "DROP PUBLICATION IF EXISTS pub" "DROP TABLE IF EXISTS accounts, notes" \
    "SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE slot_name = 'sub'" >/dev/null 2>&1

pga "CREATE TABLE accounts (id bigserial PRIMARY KEY, owner text, balance bigint)" \
    "INSERT INTO accounts (owner, balance) SELECT 'user_' || g, 1000 FROM generate_series(1, 200000) g" \
    "CREATE TABLE notes (txt text)" \
    "CREATE PUBLICATION pub FOR TABLE accounts, notes" >/dev/null
pgb "CREATE TABLE accounts (id bigserial PRIMARY KEY, owner text, balance bigint)" "CREATE TABLE notes (txt text)" >/dev/null
echo "Node A (purana system): 200,000 accounts. Node B (naya system): khaali table, same schema."

# app chal rahi hai: har transaction ek balance +1 karta hai, har 10va naya account kholta hai
pga "SET synchronous_commit = off" "DO \$\$ DECLARE t0 timestamptz := clock_timestamp(); i int := 0; rid int; BEGIN
       WHILE clock_timestamp() < t0 + interval '$WRITE_SECONDS seconds' LOOP
         i := i + 1;
         rid := 1 + (random() * 199999)::int;     -- pehle variable mein: WHERE mein random() = har row par naya = seq scan
         UPDATE accounts SET balance = balance + 1 WHERE id = rid;
         IF i % 10 = 0 THEN INSERT INTO accounts (owner, balance) VALUES ('new_' || i, 500); END IF;
         COMMIT;
       END LOOP; END \$\$" >/dev/null &
writer=$!
sleep 1
echo "App likh rahi hai ($WRITE_SECONDS s)... ab node B par SUBSCRIPTION: pehle snapshot, phir WAL ka stream"
t0=$(date +%s%N)
pgb "SET client_min_messages=warning" "CREATE SUBSCRIPTION sub CONNECTION '$SRC_CONN' PUBLICATION pub" >/dev/null

state() {
  local a b lag
  b=$(pgb "SELECT count(*) || ' rows, sum ' || coalesce(sum(balance), 0) FROM accounts")   # B pehle — warna B "aage" dikh sakta hai
  a=$(pga "SELECT count(*) || ' rows, sum ' || sum(balance) FROM accounts")
  lag=$(pga "SELECT coalesce(pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)), '-') FROM pg_replication_slots WHERE slot_name = 'sub'")
  printf "%5s s | A: %-28s | B: %-28s | peeche: %s\n" "$(( ($(date +%s%N) - t0) / 1000000000 ))" "$a" "$b" "$lag"
}
while kill -0 $writer 2>/dev/null; do state; sleep 1; done
echo "--- app ne likhna band kiya (cutover se pehle ka 'write freeze') ---"
for i in $(seq 1 15); do
  state
  [ "$(pga "SELECT sum(balance) FROM accounts")" = "$(pgb "SELECT sum(balance) FROM accounts")" ] && break
  sleep 1
done
if [ "$(pga "SELECT count(*), sum(balance) FROM accounts")" = "$(pgb "SELECT count(*), sum(balance) FROM accounts")" ]; then
  echo "✅ A aur B barabar — ab proxy ko node B ki taraf palat sakte ho"
else echo "❌ abhi barabar nahi"; fi

echo
echo "=== Jaal 1: 'notes' table bina PRIMARY KEY ke publish ki ==="
pga "INSERT INTO notes VALUES ('hello')" >/dev/null
echo "INSERT chala. Ab UPDATE:"
pga "UPDATE notes SET txt = 'bye'" 2>&1 | sed 's/^/   /'
echo "Ilaaj: PRIMARY KEY do (ya REPLICA IDENTITY FULL — tab poori purani row se match hota hai, dheema):"
pga "ALTER TABLE notes REPLICA IDENTITY FULL" "UPDATE notes SET txt = 'bye'" >/dev/null && echo "   UPDATE chala ✅"

echo
echo "=== Jaal 2: node A par naya column (DDL replicate NAHI hota) ==="
pga "ALTER TABLE accounts ADD COLUMN city text" "INSERT INTO accounts (owner, balance, city) VALUES ('ddl_test', 1, 'Pune')" >/dev/null
sleep 3
echo "A: $(pga "SELECT count(*) FROM accounts") rows | B: $(pgb "SELECT count(*) FROM accounts") rows | B par apply errors: $(pgb "SELECT apply_error_count FROM pg_stat_subscription_stats WHERE subname = 'sub'")"
echo "(B ek event apply nahi kar paaya → uske BAAD ka poora stream ruka. A par WAL jama ho raha hai.)"
echo "B par bhi column jodo:"
pgb "ALTER TABLE accounts ADD COLUMN city text" >/dev/null
for i in $(seq 1 20); do [ "$(pga "SELECT count(*) FROM accounts")" = "$(pgb "SELECT count(*) FROM accounts")" ] && break; sleep 1; done
echo "A: $(pga "SELECT count(*) FROM accounts") rows | B: $(pgb "SELECT count(*) FROM accounts") rows ✅ (retry ke baad stream wahi se chalu — koi row nahi chhooti)"

# saaf-safai: subscription pehle, taaki node A ka slot na atke (atka slot = WAL kabhi delete nahi hoga)
pgb "SET client_min_messages=warning" "DROP SUBSCRIPTION sub" >/dev/null
