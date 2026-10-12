#!/usr/bin/env bash
# ex2 (MySQL) · mysqldump + binlog replay — galat DELETE se thik pehle tak
#   ./scripts/pitr-mysql.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
MW=/tmp/sqlgurukul-mypitr
myq "DROP DATABASE IF EXISTS shop; DROP DATABASE IF EXISTS shop_restore; CREATE DATABASE shop;
     CREATE TABLE shop.orders (id bigint AUTO_INCREMENT PRIMARY KEY, amount int) ENGINE=InnoDB;
     SET SESSION cte_max_recursion_depth = 10000;
     INSERT INTO shop.orders (amount) WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 10000) SELECT FLOOR(RAND() * 5000) FROM g;"
on_mysql "rm -rf $MW && mkdir -p $MW && mysqldump $MYCONN --single-transaction --source-data=2 shop orders > $MW/dump.sql 2>/dev/null"
# purane mysqldump "CHANGE MASTER TO MASTER_LOG_…" likhte hain, naye "CHANGE REPLICATION SOURCE TO SOURCE_LOG_…"
POS_LINE=$(on_mysql "grep -m1 -E 'CHANGE (MASTER|REPLICATION SOURCE) TO' $MW/dump.sql")
FILE=$(echo "$POS_LINE" | sed -E "s/.*(MASTER|SOURCE)_LOG_FILE='([^']+)'.*/\2/")
POS=$(echo "$POS_LINE" | sed -E "s/.*(MASTER|SOURCE)_LOG_POS=([0-9]+).*/\2/")
echo "02:00  mysqldump liya: $(myq 'SELECT count(*) FROM shop.orders') orders   (dump ke andar likha: binlog $FILE, position $POS)"

myq "INSERT INTO shop.orders (amount) SELECT FLOOR(RAND() * 5000) FROM shop.orders LIMIT 500"
echo "09:00  subah ke naye orders: $(myq 'SELECT count(*) FROM shop.orders')"
myq "DELETE FROM shop.orders"
echo "10:42  intern ne chalaya: DELETE FROM orders;   → $(myq 'SELECT count(*) FROM shop.orders') orders"

# binlog padho (replica ki tarah, server se) aur DELETE wale transaction ki shuruaat dhoondho
FILES=$(myq "SHOW BINARY LOGS" | awk -v f="$FILE" '$1 >= f {print $1}' | tr '\n' ' ')
STOP=$(on_mysql "mysqlbinlog --read-from-remote-server $MYCONN --base64-output=DECODE-ROWS -v --start-position=$POS $FILES 2>/dev/null" |
  awk '/^# at /{at=$3} /GTID.*last_committed|Anonymous_GTID/{tx=at} /^### DELETE FROM `shop`.`orders`/{print tx; exit}')
echo "       binlog mein DELETE wala transaction position $STOP par shuru hota hai"

echo
echo "=== Restore 1: sirf dump ==="
myq "CREATE DATABASE shop_restore"
on_mysql "mysql $MYCONN shop_restore < $MW/dump.sql"
echo "       orders: $(myq 'SELECT count(*) FROM shop_restore.orders')   ← subah ke 500 gaye"

echo
echo "=== Restore 2: dump + binlog replay ($POS se $STOP tak — DELETE se thik pehle) ==="
myq "DROP DATABASE shop_restore; CREATE DATABASE shop_restore"
on_mysql "mysql $MYCONN shop_restore < $MW/dump.sql"
on_mysql "mysqlbinlog --read-from-remote-server $MYCONN --start-position=$POS --stop-position=$STOP --rewrite-db='shop->shop_restore' $FILES 2>/dev/null | mysql $MYCONN"
echo "       orders: $(myq 'SELECT count(*) FROM shop_restore.orders')   ← sab wapas ✅"
on_mysql "rm -rf $MW"
