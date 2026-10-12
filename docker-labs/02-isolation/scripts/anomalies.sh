#!/usr/bin/env bash
# ex1 · teen anomalies, har isolation level par, dono engines par — ASLI do sessions ke saath.
#   ./scripts/anomalies.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
reset_pg() { pgq "SET client_min_messages=warning" "DROP TABLE IF EXISTS seats" "CREATE TABLE seats (id int PRIMARY KEY, row_name text, status text)" "INSERT INTO seats VALUES (10,'A','free'),(11,'A','free'),(12,'B','free')" >/dev/null; }
reset_my() { myq "DROP TABLE IF EXISTS seats; CREATE TABLE seats (id int PRIMARY KEY, row_name varchar(4), status varchar(10)) ENGINE=InnoDB; INSERT INTO seats VALUES (10,'A','free'),(11,'A','free'),(12,'B','free');"; }

# --- Postgres -------------------------------------------------------------
pg_dirty() {   # A padhta hai jab B ne likha par COMMIT nahi kiya
  reset_pg
  ( pgq "BEGIN" "UPDATE seats SET status='booked' WHERE id=10" "SELECT pg_sleep(2)" "ROLLBACK" >/dev/null ) &
  sleep 0.7
  local r=$(pgq "BEGIN ISOLATION LEVEL $1" "SELECT status FROM seats WHERE id=10" "COMMIT" | tail -1); wait
  [ "$r" = "booked" ] && echo "HUA ❌" || echo "nahi"
}
pg_nonrep() {  # A ek hi row do baar padhta hai, beech mein B COMMIT karta hai
  reset_pg
  ( sleep 0.7; pgq "UPDATE seats SET status='booked' WHERE id=10" >/dev/null ) &
  local out=$(pgq "BEGIN ISOLATION LEVEL $1" "SELECT status FROM seats WHERE id=10" "SELECT pg_sleep(1.5)" "SELECT status FROM seats WHERE id=10" "COMMIT" | grep -v '^$'); wait
  [ "$(echo "$out" | head -1)" != "$(echo "$out" | tail -1)" ] && echo "HUA ❌" || echo "nahi"
}
pg_phantom() { # A ek hi query do baar, beech mein B range mein INSERT
  reset_pg
  ( sleep 0.7; pgq "INSERT INTO seats VALUES (13,'A','free')" >/dev/null ) &
  local out=$(pgq "BEGIN ISOLATION LEVEL $1" "SELECT count(*) FROM seats WHERE row_name='A'" "SELECT pg_sleep(1.5)" "SELECT count(*) FROM seats WHERE row_name='A'" "COMMIT" | grep -v '^$'); wait
  [ "$(echo "$out" | head -1)" != "$(echo "$out" | tail -1)" ] && echo "HUA ❌" || echo "nahi"
}
# --- MySQL ----------------------------------------------------------------
my_dirty() {
  reset_my
  ( myq "START TRANSACTION; UPDATE seats SET status='booked' WHERE id=10; DO SLEEP(2); ROLLBACK;" >/dev/null ) &
  sleep 0.7
  local r=$(myq "SET SESSION TRANSACTION ISOLATION LEVEL $1; START TRANSACTION; SELECT status FROM seats WHERE id=10; COMMIT;" | tail -1); wait
  [ "$r" = "booked" ] && echo "HUA ❌" || echo "nahi"
}
my_nonrep() {
  reset_my
  ( sleep 0.7; myq "UPDATE seats SET status='booked' WHERE id=10;" ) &
  local out=$(myq "SET SESSION TRANSACTION ISOLATION LEVEL $1; START TRANSACTION; SELECT status FROM seats WHERE id=10; DO SLEEP(1.5); SELECT status FROM seats WHERE id=10; COMMIT;"); wait
  [ "$(echo "$out" | head -1)" != "$(echo "$out" | tail -1)" ] && echo "HUA ❌" || echo "nahi"
}
my_phantom() {
  reset_my
  ( sleep 0.7; myq "INSERT INTO seats VALUES (13,'A','free');" ) &
  local out=$(myq "SET SESSION TRANSACTION ISOLATION LEVEL $1; START TRANSACTION; SELECT count(*) FROM seats WHERE row_name='A'; DO SLEEP(1.5); SELECT count(*) FROM seats WHERE row_name='A'; COMMIT;"); wait
  [ "$(echo "$out" | head -1)" != "$(echo "$out" | tail -1)" ] && echo "HUA ❌" || echo "nahi"
}

printf "\n%-10s %-18s %-12s %-16s %-10s\n" ENGINE LEVEL "DIRTY READ" "NON-REPEATABLE" PHANTOM
for lvl in "READ UNCOMMITTED" "READ COMMITTED" "REPEATABLE READ" "SERIALIZABLE"; do
  printf "%-10s %-18s %-12s %-16s %-10s\n" Postgres "$lvl" "$(pg_dirty "$lvl")" "$(pg_nonrep "$lvl")" "$(pg_phantom "$lvl")"
done
for lvl in "READ UNCOMMITTED" "READ COMMITTED" "REPEATABLE READ" "SERIALIZABLE"; do
  printf "%-10s %-18s %-12s %-16s %-10s\n" MySQL "$lvl" "$(my_dirty "$lvl")" "$(my_nonrep "$lvl")" "$(my_phantom "$lvl")"
done
