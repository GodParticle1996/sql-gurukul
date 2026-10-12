#!/usr/bin/env bash
# ex3 · PgBouncer (transaction pooling, 20 asli connections) — kab jeetta hai, kab nahi. Aur uska jaal.
#   ./scripts/bouncer.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
ensure_data
echo "=== 1. Lambe connections, sirf SELECT — 5 sec har run ==="
# 70, 90 nahi: bouncer ke apne 20 pooled connections bhi max_connections (100) mein ginte hain
r=$(on_pg "pgbench $DIRECT  -U postgres -c 70   -j 8 -T 5 -n -S lab" 2>&1); printf "seedha      70 clients → %6s tps · latency avg %7s ms\n" "$(echo "$r" | tps)" "$(echo "$r" | lat)"
r=$(on_pg "pgbench $BOUNCER -U postgres -c 70   -j 8 -T 5 -n -S lab" 2>&1); printf "PgBouncer   70 clients → %6s tps · latency avg %7s ms\n" "$(echo "$r" | tps)" "$(echo "$r" | lat)"
on_pg "pgbench $BOUNCER -U postgres -c 1000 -j 8 -T 5 -n -S lab > /tmp/b1000.txt 2>&1" &
sleep 3
srv=$(pgq "SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()")
wait
r=$(on_pg "cat /tmp/b1000.txt; rm -f /tmp/b1000.txt"); printf "PgBouncer 1000 clients → %6s tps · latency avg %7s ms   (us waqt Postgres par asli connections: %s)\n" "$(echo "$r" | tps)" "$(echo "$r" | lat)" "$srv"

echo
echo "=== 2. Har request par NAYA connection (PHP / serverless jaisa) — pgbench -C, 20 clients ==="
conn() { grep -m1 -oE 'average connection time = [0-9.]+ ms' | cut -d' ' -f5; }
r=$(on_pg "pgbench $DIRECT  -U postgres -C -c 20 -j 4 -T 5 -n -S lab" 2>&1); printf "seedha    (har baar naya backend process) → %6s tps · naya connection %6s ms\n" "$(echo "$r" | tps)" "$(echo "$r" | conn)"
r=$(on_pg "pgbench $BOUNCER -U postgres -C -c 20 -j 4 -T 5 -n -S lab" 2>&1); printf "PgBouncer (asli connection pehle se khula) → %6s tps · naya connection %6s ms\n" "$(echo "$r" | tps)" "$(echo "$r" | conn)"

echo
echo "=== 3. Transaction pooling ka jaal — SET kisi aur ke sar (lab_tiny: pool mein sirf 1 asli connection) ==="
bq lab_tiny "RESET work_mem" >/dev/null
bq lab_tiny "SET work_mem = '512MB'" >/dev/null
echo "client A ne chalaya: SET work_mem = '512MB'  aur chala gaya"
echo "client B (bilkul naya) : SHOW work_mem → $(bq lab_tiny 'SHOW work_mem')      ← A ki setting B par!"
echo "seedha Postgres        : SHOW work_mem → $(pgq 'SHOW work_mem')"
bq lab_tiny "RESET work_mem" >/dev/null
bq lab_tiny "BEGIN" "SET LOCAL work_mem = '512MB'" "COMMIT" >/dev/null
echo "Ilaaj — SET LOCAL (sirf transaction ke andar): uske baad client B → $(bq lab_tiny 'SHOW work_mem')"
