#!/usr/bin/env bash
# Postgres (seedha + PgBouncer ke raaste) aur MySQL — docker ho toh containers ke andar, warna local clients.
#   Local (NO_DOCKER=1): Postgres PGPORT (55432), MySQL MYPORT (33306), PgBouncer BPORT (56432) jiske [databases] mein
#   `lab_tiny` (pool_size=1, pool_mode = transaction) ho — pgbouncer/pgbouncer.ini jaisa, bas host=127.0.0.1.
use_docker=0
if [ -z "$NO_DOCKER" ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q .; then use_docker=1; fi
# pga <naam> "SQL" ... — application_name = naam, taaki pg_stat_activity / pg_locks mein pehchaan sakein
pga() { local app=$1; shift; local a=() s; for s in "$@"; do a+=(-c "$s"); done
  if [ $use_docker = 1 ]; then docker compose exec -T -e PGAPPNAME=$app postgres psql -U postgres -d lab -qAt "${a[@]}"
  else PGAPPNAME=$app psql -h "${PGHOST:-localhost}" -p "${PGPORT:-55432}" -U postgres -d lab -qAt "${a[@]}"; fi; }
pgq() { pga lab "$@"; }
# pgf <naam> < file — psql script stdin se (jab \! jaisi psql commands chahiye)
pgf() { local app=$1
  if [ $use_docker = 1 ]; then docker compose exec -T -e PGAPPNAME=$app postgres psql -U postgres -d lab -qAt -f -
  else PGAPPNAME=$app psql -h "${PGHOST:-localhost}" -p "${PGPORT:-55432}" -U postgres -d lab -qAt -f -; fi; }
# bq "SQL" ... — PgBouncer (transaction pooling) ke raaste, database lab_tiny (1 asli connection)
bq() { local a=() s; for s in "$@"; do a+=(-c "$s"); done
  if [ $use_docker = 1 ]; then docker compose exec -T postgres psql -h pgbouncer -p 6432 -U postgres -d lab_tiny -qAt "${a[@]}"
  else psql -h "${PGHOST:-localhost}" -p "${BPORT:-56432}" -U postgres -d lab_tiny -qAt "${a[@]}"; fi; }
myq() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysql -uroot lab -N -e "$1"
  else mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot lab -N -e "$1"; fi; }
# myin < file — stdin se (DELIMITER wale procedures, `system` command)
myin() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysql -uroot lab -N
  else mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot lab -N; fi; }
