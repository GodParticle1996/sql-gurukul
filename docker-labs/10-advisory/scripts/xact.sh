#!/usr/bin/env bash
# ex2 · lock aur kaam EK HI transaction mein — worker "GC pause" mein atka toh? (System Gurukul lab 36 ka DB wala jawab)
#   ./scripts/xact.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
fa=$(mktemp)

echo "=================== POSTGRES — pg_advisory_xact_lock + UPDATE, ek hi transaction ==================="
pgq "SET client_min_messages=warning" "DROP TABLE IF EXISTS wallet" "CREATE TABLE wallet (id int PRIMARY KEY, balance int)" \
    "INSERT INTO wallet VALUES (1, 10000)" >/dev/null
echo "wallet: ₹$(pgq 'SELECT balance FROM wallet WHERE id = 1')"
pgf workerA > $fa 2>&1 <<'SQL' &
SET idle_in_transaction_session_timeout = '2s';
BEGIN;
SELECT pg_advisory_xact_lock(7);
UPDATE wallet SET balance = balance - 500 WHERE id = 1;
\! sleep 4
COMMIT;
SQL
sleep 1
echo "t=1s  worker A: lock liya, ₹500 kaate — phir GC pause (4 sec tak database ko kuch nahi bhejta)"
echo "t=1s  worker B: pg_try_advisory_xact_lock(7) → $(pga workerB 'SELECT pg_try_advisory_xact_lock(7)')   ← A ke paas hai, B ne nahi kaata"
sleep 2
echo "t=3s  worker A ke sessions: $(pgq "SELECT count(*) FROM pg_stat_activity WHERE application_name = 'workerA'")   ← 2 sec 'idle in transaction' ke baad database ne khatam kiya"
echo "t=3s  wallet: ₹$(pgq 'SELECT balance FROM wallet WHERE id = 1')   ← A ka ₹500 kabhi COMMIT hua hi nahi; session gaya → ROLLBACK, lock bhi chhoota"
pga workerB "BEGIN" "SELECT pg_advisory_xact_lock(7)" "UPDATE wallet SET balance = balance - 500 WHERE id = 1" "COMMIT" >/dev/null
echo "t=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹$(pgq 'SELECT balance FROM wallet WHERE id = 1')"
wait
echo "t=4s  worker A jaaga, COMMIT bheja → $(grep -m1 -oE 'FATAL: .*' $fa)"
echo "wallet: ₹$(pgq 'SELECT balance FROM wallet WHERE id = 1')   ← ek hi baar kata ✅ (zombie ka COMMIT database ne khud mana kiya)"

echo
echo "=================== MYSQL — SELECT … FOR UPDATE + wait_timeout ==================="
myq "DROP TABLE IF EXISTS wallet; CREATE TABLE wallet (id int PRIMARY KEY, balance int) ENGINE=InnoDB; INSERT INTO wallet VALUES (1, 10000);"
echo "wallet: ₹$(myq 'SELECT balance FROM wallet WHERE id = 1')"
myin > $fa 2>&1 <<'SQL' &
SET SESSION wait_timeout = 2;
START TRANSACTION;
SELECT balance FROM wallet WHERE id = 1 FOR UPDATE;
UPDATE wallet SET balance = balance - 500 WHERE id = 1;
system sleep 4
COMMIT;
SQL
sleep 1
echo "t=1s  worker A: row lock (FOR UPDATE), ₹500 kaate — phir GC pause · InnoDB mein khule transactions: $(myq 'SELECT COUNT(*) FROM information_schema.INNODB_TRX')"
echo "t=1s  worker B: SELECT … FOR UPDATE NOWAIT → $(myq 'SELECT balance FROM wallet WHERE id = 1 FOR UPDATE NOWAIT' 2>&1 | head -1)"
sleep 2.5
echo "t=3s  InnoDB mein khule transactions: $(myq 'SELECT COUNT(*) FROM information_schema.INNODB_TRX')   ← wait_timeout = 2 → server ne A ka connection band kiya → uska ₹500 ROLLBACK"
myq "START TRANSACTION; SELECT balance FROM wallet WHERE id = 1 FOR UPDATE NOWAIT; UPDATE wallet SET balance = balance - 500 WHERE id = 1; COMMIT;" >/dev/null
echo "t=3s  worker B: lock liya, ₹500 kaate, COMMIT → wallet: ₹$(myq 'SELECT balance FROM wallet WHERE id = 1')"
wait
echo "t=4s  worker A jaaga, COMMIT bheja → $(grep -m1 -oE 'ERROR [0-9]+.*' $fa)"
echo "wallet: ₹$(myq 'SELECT balance FROM wallet WHERE id = 1')   ← ek hi baar kata ✅"

echo
echo "--- MySQL ka GET_LOCK transaction ka hissa NAHI ---"
myq "START TRANSACTION; DO GET_LOCK('wallet_1', 0); ROLLBACK;
     SELECT CONCAT('ROLLBACK ke baad wallet_1 lock: connection ', IFNULL(IS_USED_LOCK('wallet_1'), '-'), ' ke paas · main connection ', CONNECTION_ID(), ' hoon')"
rm -f $fa
