#!/usr/bin/env bash
# Primary, standby (streaming replica) aur MySQL — docker ho toh containers mein, warna local clients.
#   Local (NO_DOCKER=1): primary PGPORT (55432) par archive_mode = on ho, ARCHIVE_DIR = uska archive folder;
#   standby PGPORT_B (55433) par (pg_basebackup -R se bana); pg_basebackup/pg_ctl PATH mein.
use_docker=0
if [ -z "$NO_DOCKER" ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q .; then use_docker=1; fi
_pg() {   # _pg <service> <port> [psql args...]
  local svc=$1 port=$2; shift 2
  if [ $use_docker = 1 ]; then docker compose exec -T $svc psql -U postgres "$@"
  else psql -h "${PGHOST:-localhost}" -p $port -U postgres "$@"; fi
}
pgp() { local a=() s; for s in "$@"; do a+=(-c "$s"); done; _pg primary "${PGPORT:-55432}"   -d lab -qAt "${a[@]}"; }
pgs() { local a=() s; for s in "$@"; do a+=(-c "$s"); done; _pg standby "${PGPORT_B:-55433}" -d lab -qAt "${a[@]}"; }
myq() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysql -uroot -N -e "$1"
  else mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot -N -e "$1"; fi
}
# primary ki machine par shell command (pg_basebackup, pg_ctl, restore) — docker mein primary container ke andar
on_primary() {
  if [ $use_docker = 1 ]; then docker compose exec -T -u postgres primary bash -c "$1"
  else bash -c "$1"; fi
}
if [ $use_docker = 1 ]; then ARCHIVE=/var/lib/postgresql/archive; WORK=/tmp/pitr; RPORT=5433; PRIMARY_PORT=5432
else ARCHIVE=${ARCHIVE_DIR:-}; WORK=${PITR_DIR:-/tmp/sqlgurukul-pitr}; RPORT=${PGPORT_R:-55434}; PRIMARY_PORT=${PGPORT:-55432}; fi
# restore kiye hue server par query
pgr() { on_primary "psql -h localhost -p $RPORT -U postgres -d lab -qAt -c \"$1\""; }
# mysqldump / mysqlbinlog / mysql (stdin) — docker mein mysql container ke andar
on_mysql() {
  if [ $use_docker = 1 ]; then docker compose exec -T mysql bash -c "$1"
  else bash -c "$1"; fi
}
if [ $use_docker = 1 ]; then MYCONN="-uroot"; else MYCONN="-h ${MYHOST:-127.0.0.1} -P ${MYPORT:-33306} -uroot"; fi
ms_since() { echo $(( ($(date +%s%N) - $1) / 1000000 )); }
