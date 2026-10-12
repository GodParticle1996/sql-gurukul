#!/usr/bin/env bash
# Postgres seedha aur PgBouncer ke raaste — docker ho toh postgres container ke andar se, warna local clients.
#   Local (NO_DOCKER=1): Postgres PGPORT (55432), PgBouncer BPORT (56432) jiske [databases] mein `lab` aur
#   `lab_tiny` (pool_size=1) hon — pgbouncer/pgbouncer.ini dekho. pgbench PATH mein.
use_docker=0
if [ -z "$NO_DOCKER" ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q .; then use_docker=1; fi
if [ $use_docker = 1 ]; then DIRECT="-h localhost -p 5432"; BOUNCER="-h pgbouncer -p 6432"
else DIRECT="-h localhost -p ${PGPORT:-55432}"; BOUNCER="-h localhost -p ${BPORT:-56432}"; fi
on_pg() {   # postgres ki machine par shell (pgbench, /proc padhna)
  if [ $use_docker = 1 ]; then docker compose exec -T postgres bash -c "$1"
  else bash -c "$1"; fi
}
pgq() { local a=() s; for s in "$@"; do a+=(-c "$s"); done
  if [ $use_docker = 1 ]; then docker compose exec -T postgres psql -U postgres -d lab -qAt "${a[@]}"
  else psql $DIRECT -U postgres -d lab -qAt "${a[@]}"; fi; }
# bq <database> "SQL" — PgBouncer ke raaste
bq() { local db=$1; shift; local a=() s; for s in "$@"; do a+=(-c "$s"); done
  if [ $use_docker = 1 ]; then docker compose exec -T postgres psql $BOUNCER -U postgres -d $db -qAt "${a[@]}"
  else psql $BOUNCER -U postgres -d $db -qAt "${a[@]}"; fi; }
if [ $use_docker = 1 ]; then SQLDIR=/lab/scripts; else SQLDIR=$(pwd)/scripts; fi
# pgbench ka data (10 lakh accounts) — pehle se ho toh dobara nahi
ensure_data() { [ "$(pgq "SELECT to_regclass('pgbench_accounts') IS NOT NULL")" = t ] || on_pg "pgbench $DIRECT -U postgres -i -s 10 -q lab" >/dev/null 2>&1; }
tps() { grep -m1 -oE 'tps = [0-9.]+' | cut -d' ' -f3 | cut -d. -f1; }
lat() { grep -m1 -oE 'latency average = [0-9.]+ ms' | cut -d' ' -f4; }
