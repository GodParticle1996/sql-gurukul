#!/usr/bin/env bash
# ex1 · ek connection ki keemat, aur max_connections ki deewar
#   ./scripts/conn-cost.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
ensure_data
echo "=== 0. max_connections = $(pgq 'SHOW max_connections') · CPU cores: $(on_pg nproc) ==="

echo
echo "=== 1. 90 connections, har ek second mein sirf ek chhoti query ==="
on_pg "pgbench $DIRECT -U postgres -c 90 -j 4 -T 8 -n -f $SQLDIR/read.sql lab" >/dev/null 2>&1 &
sleep 5
pgq "SELECT 'us pal: ' || string_agg(state || ' ' || n, ' · ') FROM (SELECT state, count(*) n FROM pg_stat_activity WHERE application_name = 'pgbench' GROUP BY state) s"
pids=$(pgq "SELECT string_agg(pid::text, ' ') FROM pg_stat_activity WHERE application_name = 'pgbench'")
on_pg "t=0; n=0; for p in $pids; do k=\$(awk '/^Private_(Clean|Dirty):/{s+=\$2} END{print s}' /proc/\$p/smaps_rollup); t=\$((t+k)); n=\$((n+1)); done
       echo \"\$n backend processes · apni (private) memory \$((t/1024)) MB · ek connection ≈ \$((t/n)) kB\""
wait

echo
echo "=== 2. 150 clients seedha Postgres par (max_connections = 100) ==="
on_pg "pgbench $DIRECT -U postgres -c 150 -j 4 -T 3 -n -S lab" 2>&1 | grep -m1 -oE 'FATAL:.*'
