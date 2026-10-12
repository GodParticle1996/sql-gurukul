#!/usr/bin/env bash
# ex2 · point-in-time restore — base backup + WAL archive se galti se THIK PEHLE tak
#   ./scripts/pitr.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
[ -z "$ARCHIVE" ] && { echo "ARCHIVE_DIR set karo — local primary ke archive_command wala folder"; exit 1; }

pgp "SET client_min_messages=warning" "DROP TABLE IF EXISTS orders" \
    "CREATE TABLE orders (id bigserial PRIMARY KEY, amount int, created timestamptz DEFAULT now())" \
    "INSERT INTO orders (amount) SELECT (random() * 5000)::int FROM generate_series(1, 10000)" >/dev/null
on_primary "rm -rf $WORK && mkdir -p $WORK && pg_basebackup -h localhost -p $PRIMARY_PORT -U postgres -D $WORK/base -X stream"
echo "02:00  base backup liya (pg_basebackup):      $(pgp 'SELECT count(*) FROM orders') orders"

pgp "INSERT INTO orders (amount) SELECT (random() * 5000)::int FROM generate_series(1, 500)" >/dev/null
echo "09:00  subah ke naye orders:                   $(pgp 'SELECT count(*) FROM orders') orders"
sleep 1
T=$(pgp "SELECT clock_timestamp()")
sleep 1
pgp "DELETE FROM orders" >/dev/null
echo "10:42  intern ne chalaya: DELETE FROM orders;   (WHERE bhool gaya)"
echo "       primary: $(pgp 'SELECT count(*) FROM orders') orders   |   standby: $(pgs 'SELECT count(*) FROM orders' 2>/dev/null || echo '-') orders"
pgp "SELECT pg_switch_wal()" >/dev/null   # chalu WAL file band karke archive mein bhejo
sleep 2
echo "       WAL archive mein: $(on_primary "ls $ARCHIVE | grep -v history | wc -l") files, aakhri: $(pgp 'SELECT last_archived_wal FROM pg_stat_archiver')"

restore() {   # restore <folder> <extra recovery settings>
  on_primary "rm -rf $WORK/$1 && cp -a $WORK/base $WORK/$1 && chmod 700 $WORK/$1 && touch $WORK/$1/recovery.signal
    cat >> $WORK/$1/postgresql.auto.conf <<EOF
port = $RPORT
archive_mode = off
restore_command = 'cp $ARCHIVE/%f %p'
recovery_target_action = 'promote'
$2
EOF
    pg_ctl -D $WORK/$1 -l $WORK/$1.log -w start >/dev/null"
}
stop_restore() { on_primary "pg_ctl -D $WORK/$1 -m fast stop >/dev/null"; }

echo
echo "=== Restore 1: sirf base backup (02:00 wali copy) ==="
restore r1 "recovery_target = 'immediate'"
echo "       orders: $(pgr 'SELECT count(*) FROM orders')   ← subah ke 500 gaye"
stop_restore r1

echo
echo "=== Restore 2: base backup + WAL archive, recovery_target_time = DELETE se thik pehle ==="
echo "       target: $T"
t0=$(date +%s%N)
restore r2 "recovery_target_time = '$T'"
echo "       orders: $(pgr 'SELECT count(*) FROM orders')   ← sab wapas ✅   (restore + replay: $(ms_since $t0) ms)"
echo "       server log: $(on_primary "grep -o 'recovery stopping before commit.*' $WORK/r2.log | head -1")"
stop_restore r2
on_primary "rm -rf $WORK"
echo
echo "Replica ne DELETE turant copy kiya. Base backup + WAL archive samay mein peeche le gaya — galti se thik pehle tak."
