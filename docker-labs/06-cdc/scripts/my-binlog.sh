#!/usr/bin/env bash
# ex2 · MySQL binlog — Debezium jo padhta hai, woh khud padho. Aur: "state bhejo, delta nahi"
#   ./scripts/my-binlog.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh

mya "DROP TABLE IF EXISTS lab.wallet; CREATE TABLE lab.wallet (id int PRIMARY KEY, owner varchar(10), balance int);
     INSERT INTO lab.wallet VALUES (1, 'asha', 100);"

event() {   # $1 = binlog_format, $2 = SQL — chalao aur binlog mein kya likha gaya woh dikhao
  mya "FLUSH BINARY LOGS"
  local f; f=$(mya "SHOW MASTER STATUS" | awk '{print $1}')
  mya "SET SESSION binlog_format = '$1'; $2"
  my_binlog "$f" 2>/dev/null | grep -E '^### |^UPDATE|^update' | sed 's/^/   /'
}

echo "=== 1. binlog_format = ROW (MySQL 8 ka default): UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1 ==="
event ROW "UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1"
echo "   👉 poori row PEHLE (WHERE) aur BAAD (SET) — @1=id, @2=owner, @3=balance"

echo
echo "=== 2. binlog_format = STATEMENT: wahi UPDATE ==="
event STATEMENT "UPDATE lab.wallet SET balance = balance - 20 WHERE id = 1"
echo "   👉 sirf SQL ka text — yaani 'DELTA' (20 ghatao)"

echo
echo "=== 3. Consumer ko ek event DO BAAR mila (network retry, consumer restart — Kafka mein aam baat) ==="
mya "DROP TABLE IF EXISTS lab.copy_state, lab.copy_delta;
     CREATE TABLE lab.copy_state (id int PRIMARY KEY, balance int); INSERT INTO lab.copy_state VALUES (1, 100);
     CREATE TABLE lab.copy_delta (id int PRIMARY KEY, balance int); INSERT INTO lab.copy_delta VALUES (1, 100);
     UPDATE lab.copy_state SET balance = 80 WHERE id = 1;  UPDATE lab.copy_state SET balance = 80 WHERE id = 1;
     UPDATE lab.copy_delta SET balance = balance - 20 WHERE id = 1;  UPDATE lab.copy_delta SET balance = balance - 20 WHERE id = 1;"
echo "   asli balance (source): 80   (pehla UPDATE ke baad)"
echo "   ROW event (state '= 80') do baar lagaya   → $(mya "SELECT balance FROM lab.copy_state") ✅"
echo "   STATEMENT event ('- 20') do baar lagaya   → $(mya "SELECT balance FROM lab.copy_delta") ❌"
