#!/usr/bin/env bash
# ex2 · pool size sweep — har query ~1 ms CPU. Connections badhao: throughput kab rukta hai, latency kab badhti hai?
#   ./scripts/sweep.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
echo "=== CPU cores: $(on_pg nproc) · har run 5 sec · query: SELECT count(*) FROM generate_series(1, 20000) ==="
for n in 1 4 8 14 28 56 90; do
  j=$(( n < 8 ? n : 8 ))
  r=$(on_pg "pgbench $DIRECT -U postgres -c $n -j $j -T 5 -n -f $SQLDIR/cpu.sql lab" 2>&1)
  printf "connections %3s → %6s queries/sec · latency avg %7s ms\n" "$n" "$(echo "$r" | tps)" "$(echo "$r" | lat)"
done
