#!/usr/bin/env bash
# Node A aur node B — docker ho toh containers mein, warna local clients (ports env se badlo)
use_docker=0
if [ -z "$NO_DOCKER" ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q .; then use_docker=1; fi
_pg() {   # _pg <service> <port> [psql args...]
  local svc=$1 port=$2; shift 2
  if [ $use_docker = 1 ]; then docker compose exec -T $svc psql -U postgres "$@"
  else psql -h "${PGHOST:-localhost}" -p $port -U postgres "$@"; fi
}
_my() {   # _my <service> <port> [mysql args...]
  local svc=$1 port=$2; shift 2
  if [ $use_docker = 1 ]; then docker compose exec -T $svc mysql -uroot "$@"
  else mysql -h "${MYHOST:-127.0.0.1}" -P $port -uroot "$@"; fi
}
pga()  { local a=() s; for s in "$@"; do a+=(-c "$s"); done; _pg postgres   "${PGPORT:-55432}"   -d lab -qAt "${a[@]}"; }
pgb()  { local a=() s; for s in "$@"; do a+=(-c "$s"); done; _pg postgres_b "${PGPORT_B:-55433}" -d lab -qAt "${a[@]}"; }
mya()  { _my mysql   "${MYPORT:-33306}"   -N -e "$1"; }
myb()  { _my mysql_b "${MYPORT_B:-33307}" -N -e "$1"; }
# ek schema node A se nikaalo (pg_dump) aur node B mein daalo
pg_move_schema() {
  if [ $use_docker = 1 ]; then docker compose exec -T postgres pg_dump -U postgres -n "$1" lab | docker compose exec -T postgres_b psql -U postgres -q -d lab >/dev/null
  else pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-55432}" -U postgres -n "$1" lab | psql -h "${PGHOST:-localhost}" -p "${PGPORT_B:-55433}" -U postgres -q -d lab >/dev/null; fi
}
my_move_db() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysqldump -uroot --databases "$1" | docker compose exec -T mysql_b mysql -uroot
  else mysqldump -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot --databases "$1" 2>/dev/null | mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT_B:-33307}" -uroot; fi
}
