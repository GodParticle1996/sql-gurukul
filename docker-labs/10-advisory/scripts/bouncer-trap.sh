#!/usr/bin/env bash
# ex3 · session-level advisory lock + PgBouncer transaction pooling = ek lock, do maalik
#   ./scripts/bouncer-trap.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
bq "SELECT pg_advisory_unlock_all()" >/dev/null          # pichhle run ka kachra

echo "=== session-level lock, bouncer ke raaste (lab_tiny: pool mein 1 asli connection) ==="
echo "client A (bouncer): pg_try_advisory_lock(42) → $(bq 'SELECT pg_try_advisory_lock(42)')   ...kaam kiya, unlock bhool gaya, chala gaya"
echo "client B (bouncer): pg_try_advisory_lock(42) → $(bq 'SELECT pg_try_advisory_lock(42)')   ← B ko bhi mil gaya — ab DO maalik"
echo "client C (seedha) : pg_try_advisory_lock(42) → $(pgq 'SELECT pg_try_advisory_lock(42)')   ← aur baaki sab ke liye band"
holder=$(pgq "SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = 42")
echo "pg_locks: key 42 → pid $holder · bouncer se 'SELECT pg_backend_pid()' → pid $(bq 'SELECT pg_backend_pid()')   ← wahi pooled connection"
echo "A aur B dono chale gaye — phir bhi lock pakda hua hai: pid $(pgq "SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = 42")"

echo
echo "=== ilaaj: transaction-level lock — COMMIT par khud chhootta ==="
bq "SELECT pg_advisory_unlock_all()" >/dev/null
echo "client A (bouncer): BEGIN; pg_try_advisory_xact_lock(42) → $(bq 'BEGIN' 'SELECT pg_try_advisory_xact_lock(42)' 'COMMIT'); ...kaam...; COMMIT"
echo "client C (seedha) : pg_try_advisory_lock(42) → $(pgq 'SELECT pg_try_advisory_lock(42)')   ← lock chhoot chuka tha"
