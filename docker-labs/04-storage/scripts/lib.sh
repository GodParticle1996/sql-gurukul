#!/usr/bin/env bash
# pgq "SQL" [...more -c]   aur   myq "SQL" — docker ho toh container mein, warna local client
use_docker=0
if [ -z "$NO_DOCKER" ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q .; then use_docker=1; fi
pgq() {
  local args=() s; for s in "$@"; do args+=(-c "$s"); done
  if [ $use_docker = 1 ]; then docker compose exec -T postgres psql -U postgres -d lab -qAt "${args[@]}"
  else psql -h "${PGHOST:-localhost}" -p "${PGPORT:-55432}" -U postgres -d lab -qAt "${args[@]}"; fi
}
myq() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysql -uroot lab -N -e "$1"
  else mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot lab -N -e "$1"; fi
}
# myin < file   — stdin se (DELIMITER wale stored procedures ke liye)
myin() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysql -uroot lab -N
  else mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot lab -N; fi
}
