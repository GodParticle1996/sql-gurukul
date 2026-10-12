#!/usr/bin/env bash
# ex1 · 3 servers par ek hi raat ka job — sirf ek chale. Der se jaaga server? Lock pakadne wala mar gaya?
#   ./scripts/cron.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh

echo "=================== POSTGRES — pg_try_advisory_xact_lock(42) ==================="
pgq "SET client_min_messages=warning" "DROP TABLE IF EXISTS job_runs" \
    "CREATE TABLE job_runs (server text, day date DEFAULT current_date, at timestamptz DEFAULT clock_timestamp())" \
    "CREATE OR REPLACE FUNCTION nightly_job(server text) RETURNS text LANGUAGE plpgsql AS \$\$
     BEGIN
       IF NOT pg_try_advisory_xact_lock(42) THEN RETURN 'server ' || server || ': lock nahi mila → skip'; END IF;
       INSERT INTO job_runs (server) VALUES (server);
       PERFORM pg_sleep(2);                                           -- raat ka job
       RETURN 'server ' || server || ': lock mila → job chalaya (2 sec)';   -- COMMIT par lock khud chhootega
     END \$\$" >/dev/null
for s in A B C; do pga server$s "SELECT nightly_job('$s')" & done; wait
echo "job_runs mein rows: $(pgq 'SELECT count(*) FROM job_runs')"

echo
echo "--- server D ki ghadi 3 second peeche thi — woh ab jaaga ---"
pga serverD "SELECT nightly_job('D')"
echo "job_runs mein rows: $(pgq 'SELECT count(*) FROM job_runs')   ← lock ne sirf EK SAATH chalne se roka tha"
pgq "CREATE OR REPLACE FUNCTION nightly_job(server text) RETURNS text LANGUAGE plpgsql AS \$\$
     BEGIN
       IF NOT pg_try_advisory_xact_lock(42) THEN RETURN 'server ' || server || ': lock nahi mila → skip'; END IF;
       IF EXISTS (SELECT 1 FROM job_runs WHERE day = current_date) THEN   -- lock ke ANDAR check: race nahi
         RETURN 'server ' || server || ': aaj ka job ho chuka → skip';
       END IF;
       INSERT INTO job_runs (server) VALUES (server);
       PERFORM pg_sleep(2);
       RETURN 'server ' || server || ': lock mila → job chalaya (2 sec)';
     END \$\$" >/dev/null
echo "ilaaj (lock ke andar 'aaj ho chuka?' check) ke baad: $(pga serverD "SELECT nightly_job('D')")"

echo
echo "--- lock pakadne wala server mar jaaye toh? (session-level pg_advisory_lock) ---"
pga serverA "SELECT pg_advisory_lock(42)" "SELECT pg_sleep(30)" >/dev/null 2>&1 &
sleep 1
pgq "SELECT 'pg_locks: advisory key ' || l.objid || ' → ' || a.application_name || ' (pid ' || l.pid || ')'
     FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE l.locktype = 'advisory'"
echo "server B: pg_try_advisory_lock(42) → $(pga serverB 'SELECT pg_try_advisory_lock(42)')"
pgq "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = 'serverA'" >/dev/null
wait
echo "server A ki machine mari (uska connection toota)"
echo "server B: pg_try_advisory_lock(42) → $(pga serverB 'SELECT pg_try_advisory_lock(42)')   ← na TTL ka andaaza, na intezaar"

echo
echo "=================== MYSQL — GET_LOCK('nightly_job', 0) ==================="
myin <<'SQL'
DROP TABLE IF EXISTS job_runs;
CREATE TABLE job_runs (server varchar(5), at datetime(3) DEFAULT CURRENT_TIMESTAMP(3));
DROP PROCEDURE IF EXISTS nightly_job;
DELIMITER //
CREATE PROCEDURE nightly_job(s VARCHAR(5)) BEGIN
  IF GET_LOCK('nightly_job', 0) = 1 THEN
    INSERT INTO job_runs (server) VALUES (s);
    DO SLEEP(2);
    DO RELEASE_LOCK('nightly_job');          -- MySQL mein COMMIT lock nahi chhodta — khud chhodna padta hai
    SELECT CONCAT('server ', s, ': lock mila → job chalaya (2 sec)');
  ELSE
    SELECT CONCAT('server ', s, ': lock nahi mila → skip');
  END IF;
END //
DELIMITER ;
SQL
for s in A B C; do myq "CALL nightly_job('$s')" & done; wait
echo "job_runs mein rows: $(myq 'SELECT count(*) FROM job_runs')"

echo
echo "--- lock pakadne wala mar jaaye toh? ---"
myq "SELECT GET_LOCK('nightly_job', 0), SLEEP(30)" >/dev/null 2>&1 &
sleep 1
holder=$(myq "SELECT IS_USED_LOCK('nightly_job')")
echo "IS_USED_LOCK('nightly_job') → connection $holder ke paas"
echo "server B: GET_LOCK('nightly_job', 0) → $(myq "SELECT GET_LOCK('nightly_job', 0)")"
myq "KILL $holder"
wait
echo "connection $holder mara (KILL)"
echo "server B: GET_LOCK('nightly_job', 0) → $(myq "SELECT GET_LOCK('nightly_job', 0)")"
