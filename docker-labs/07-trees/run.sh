#!/usr/bin/env bash
# SQL file ko Postgres ya MySQL par chalao.
#   ./run.sh pg sql/ex1-wal-basics.pg.sql
#   ./run.sh my sql/ex1-wal-basics.my.sql
# Docker compose chal raha ho toh containers ke andar; warna local psql/mysql se
# (PGPORT=55432, MYPORT=33306 — compose bhi yahi ports kholta hai).
engine="$1"; file="$2"
if [ -z "$engine" ] || [ -z "$file" ]; then echo "usage: ./run.sh pg|my <file.sql>"; exit 1; fi
use_docker=0
if [ -z "$NO_DOCKER" ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q .; then use_docker=1; fi
if [ "$engine" = "pg" ]; then
  if [ $use_docker = 1 ]; then docker compose exec -T postgres psql -U postgres -d lab -q -f - < "$file"
  else psql -h "${PGHOST:-localhost}" -p "${PGPORT:-55432}" -U postgres -d lab -q -f "$file"; fi
else
  if [ $use_docker = 1 ]; then docker compose exec -T mysql mysql -uroot lab --table --force < "$file"
  else mysql -h "${MYHOST:-127.0.0.1}" -P "${MYPORT:-33306}" -uroot lab --table --force < "$file"; fi
fi
