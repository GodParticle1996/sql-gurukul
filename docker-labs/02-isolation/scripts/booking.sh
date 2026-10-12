#!/usr/bin/env bash
# ex2 · ek seat, 20 log ek saath — teen tareeke. Aur deadlock.
#   ./scripts/booking.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
N=20

pg_setup() { pgq "SET client_min_messages=warning" "DROP TABLE IF EXISTS seats, bookings" "CREATE TABLE seats (id int PRIMARY KEY, status text, version int)" "INSERT INTO seats VALUES (10,'free',1)" "CREATE TABLE bookings (who text)" >/dev/null; }
my_setup() { myin <<'SQL'
DROP TABLE IF EXISTS seats, bookings;
CREATE TABLE seats (id int PRIMARY KEY, status varchar(10), version int) ENGINE=InnoDB;
INSERT INTO seats VALUES (10,'free',1);
CREATE TABLE bookings (who varchar(10)) ENGINE=InnoDB;
DROP PROCEDURE IF EXISTS book_naive; DROP PROCEDURE IF EXISTS book_lock; DROP PROCEDURE IF EXISTS book_version;
DELIMITER //
CREATE PROCEDURE book_naive(u VARCHAR(10)) BEGIN
  DECLARE s VARCHAR(10); START TRANSACTION;
  SELECT status INTO s FROM seats WHERE id=10; DO SLEEP(0.2);
  IF s='free' THEN UPDATE seats SET status='booked' WHERE id=10; INSERT INTO bookings VALUES (u); END IF;
  COMMIT; END //
CREATE PROCEDURE book_lock(u VARCHAR(10)) BEGIN
  DECLARE s VARCHAR(10); START TRANSACTION;
  SELECT status INTO s FROM seats WHERE id=10 FOR UPDATE; DO SLEEP(0.2);
  IF s='free' THEN UPDATE seats SET status='booked' WHERE id=10; INSERT INTO bookings VALUES (u); END IF;
  COMMIT; END //
CREATE PROCEDURE book_version(u VARCHAR(10)) BEGIN
  DECLARE s VARCHAR(10); DECLARE v INT;
  SELECT status, version INTO s, v FROM seats WHERE id=10; DO SLEEP(0.2);
  IF s='free' THEN
    UPDATE seats SET status='booked', version=version+1 WHERE id=10 AND version=v;
    IF ROW_COUNT()=1 THEN INSERT INTO bookings VALUES (u); END IF;
  END IF; END //
DELIMITER ;
SQL
}

pg_run() {   # $1 = naive | lock | version
  pg_setup
  local sel="SELECT status INTO s FROM seats WHERE id=10"
  [ "$1" = lock ] && sel="$sel FOR UPDATE"
  for i in $(seq 1 $N); do
    if [ "$1" = version ]; then
      pgq "DO \$\$ DECLARE s text; v int; n int; BEGIN SELECT status, version INTO s, v FROM seats WHERE id=10; PERFORM pg_sleep(0.2); IF s='free' THEN UPDATE seats SET status='booked', version=version+1 WHERE id=10 AND version=v; GET DIAGNOSTICS n = ROW_COUNT; IF n=1 THEN INSERT INTO bookings VALUES ('u$i'); END IF; END IF; END \$\$" >/dev/null 2>&1 &
    else
      pgq "DO \$\$ DECLARE s text; BEGIN $sel; PERFORM pg_sleep(0.2); IF s='free' THEN UPDATE seats SET status='booked' WHERE id=10; INSERT INTO bookings VALUES ('u$i'); END IF; END \$\$" >/dev/null 2>&1 &
    fi
  done
  wait
  echo "$(pgq "SELECT count(*) FROM bookings")"
}
my_run() {
  my_setup
  for i in $(seq 1 $N); do myq "CALL book_$1('u$i');" >/dev/null 2>&1 & done
  wait
  echo "$(myq "SELECT count(*) FROM bookings;")"
}
t() { local s=$(date +%s%N); local r=$("$@"); echo "$r|$(( ($(date +%s%N) - s) / 1000000 ))"; }

printf "\n%-10s %-28s %-22s %s\n" ENGINE TAREEKA "EK SEAT KITNI BAAR BIKI" "TIME"
for m in naive lock version; do
  label=$([ $m = naive ] && echo "naive (padho-socho-likho)" || ([ $m = lock ] && echo "SELECT ... FOR UPDATE" || echo "version column (optimistic)"))
  IFS='|' read n ms <<< "$(t pg_run $m)"; printf "%-10s %-29s %-24s %s ms\n" Postgres "$label" "$n $( [ "$n" = 1 ] && echo ✅ || echo ❌)" "$ms"
  IFS='|' read n ms <<< "$(t my_run $m)"; printf "%-10s %-29s %-24s %s ms\n" MySQL "$label" "$n $( [ "$n" = 1 ] && echo ✅ || echo ❌)" "$ms"
done

echo -e "\n--- DEADLOCK: T1 (A phir B) aur T2 (B phir A) ---"
pgq "SET client_min_messages=warning" "DROP TABLE IF EXISTS acc" "CREATE TABLE acc (id int PRIMARY KEY, bal int)" "INSERT INTO acc VALUES (1,100),(2,100)" >/dev/null
( pgq "BEGIN" "UPDATE acc SET bal=bal-10 WHERE id=1" "SELECT pg_sleep(1)" "UPDATE acc SET bal=bal+10 WHERE id=2" "COMMIT" > /tmp/dl_a.out 2>&1 ) &
( sleep 0.3; pgq "BEGIN" "UPDATE acc SET bal=bal-10 WHERE id=2" "SELECT pg_sleep(1)" "UPDATE acc SET bal=bal+10 WHERE id=1" "COMMIT" > /tmp/dl_b.out 2>&1 ) &
wait
echo "Postgres: $(grep -ho 'deadlock detected' /tmp/dl_a.out /tmp/dl_b.out | head -1 || true)  → ek transaction rollback hua"
myq "DROP TABLE IF EXISTS acc; CREATE TABLE acc (id int PRIMARY KEY, bal int) ENGINE=InnoDB; INSERT INTO acc VALUES (1,100),(2,100);"
( myq "START TRANSACTION; UPDATE acc SET bal=bal-10 WHERE id=1; DO SLEEP(1); UPDATE acc SET bal=bal+10 WHERE id=2; COMMIT;" > /tmp/dl_c.out 2>&1 ) &
( sleep 0.3; myq "START TRANSACTION; UPDATE acc SET bal=bal-10 WHERE id=2; DO SLEEP(1); UPDATE acc SET bal=bal+10 WHERE id=1; COMMIT;" > /tmp/dl_d.out 2>&1 ) &
wait
echo "MySQL:    $(grep -ho 'Deadlock found[^;]*' /tmp/dl_c.out /tmp/dl_d.out | head -1 || true)"
echo "--- Ab dono transactions ek hi KRAM mein (pehle id 1, phir id 2) ---"
( pgq "BEGIN" "UPDATE acc SET bal=bal-10 WHERE id=1" "SELECT pg_sleep(1)" "UPDATE acc SET bal=bal+10 WHERE id=2" "COMMIT" > /tmp/dl_e.out 2>&1 ) &
( sleep 0.3; pgq "BEGIN" "UPDATE acc SET bal=bal+10 WHERE id=1" "SELECT pg_sleep(1)" "UPDATE acc SET bal=bal-10 WHERE id=2" "COMMIT" > /tmp/dl_f.out 2>&1 ) &
wait
if grep -q deadlock /tmp/dl_e.out /tmp/dl_f.out; then echo "Postgres: deadlock ❌"; else echo "Postgres: koi deadlock nahi ✅ (doosra transaction bas ruka, phir chala)"; fi
rm -f /tmp/dl_?.out
