-- ex2 · partition key ke jaal — MySQL version
DROP TABLE IF EXISTS orders, t_multi, orders_by_status, orders_by_customer;

SELECT '--- JAAL 2 (MySQL mein sabse pehle yahi milta hai): PRIMARY KEY sirf id par ---' AS '';
CREATE TABLE orders (id bigint PRIMARY KEY, created date, status varchar(10), amount int)
PARTITION BY RANGE COLUMNS (created) (PARTITION p2025_01 VALUES LESS THAN ('2025-02-01'));
SELECT '--- PK (id, created) ke saath chalega ---' AS '';
CREATE TABLE orders (id bigint, created date, status varchar(10), amount int, PRIMARY KEY (id, created))
PARTITION BY RANGE COLUMNS (created) (PARTITION p2025_01 VALUES LESS THAN ('2025-02-01'));

SELECT '--- JAAL 1: Feb ki row, sirf Jan ka partition ---' AS '';
INSERT INTO orders VALUES (1, '2025-02-15', 'new', 100);
SELECT '--- ilaaj: MAXVALUE partition (MySQL ka DEFAULT jaisa) ---' AS '';
ALTER TABLE orders ADD PARTITION (PARTITION pmax VALUES LESS THAN (MAXVALUE));
INSERT INTO orders VALUES (1, '2025-02-15', 'new', 100);
SELECT '--- naya mahina chahiye? pmax ko REORGANIZE karo (pmax ki rows copy hoti hain!) ---' AS '';
ALTER TABLE orders REORGANIZE PARTITION pmax INTO
  (PARTITION p2025_02 VALUES LESS THAN ('2025-03-01'), PARTITION pmax VALUES LESS THAN (MAXVALUE));
SELECT 'p2025_02' AS partition_, id, created FROM orders PARTITION (p2025_02);

SELECT '--- JAAL 3: partition key UPDATE — row doosre partition mein ---' AS '';
UPDATE orders SET created = '2025-01-10' WHERE id = 1;
SELECT PARTITION_NAME, TABLE_ROWS FROM information_schema.PARTITIONS
 WHERE TABLE_SCHEMA = 'lab' AND TABLE_NAME = 'orders' ORDER BY PARTITION_ORDINAL_POSITION;
SELECT 'p2025_01' AS partition_, id, created FROM orders PARTITION (p2025_01);

SELECT '--- JAAL 4: do column ki RANGE COLUMNS key (date, location) ---' AS '';
CREATE TABLE t_multi (d date, loc int) PARTITION BY RANGE COLUMNS (d, loc) (
  PARTITION pa VALUES LESS THAN ('2025-02-01', 50),
  PARTITION pb VALUES LESS THAN ('2025-02-01', 100)
);
INSERT INTO t_multi VALUES ('2025-01-20', 80);
SELECT 'pa' AS partition_, t.* FROM t_multi PARTITION (pa) t UNION ALL SELECT 'pb', t.* FROM t_multi PARTITION (pb) t;

SELECT '--- JAAL 5: kam values wala column (status) par KEY partitioning ---' AS '';
CREATE TABLE orders_by_status (id int, status varchar(10)) PARTITION BY KEY (status) PARTITIONS 4;
SET SESSION cte_max_recursion_depth = 100000;
INSERT INTO orders_by_status
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 100000)
SELECT n, ELT(1 + n % 10, 'delivered','delivered','delivered','delivered','delivered','delivered','delivered','delivered','shipped','cancelled') FROM g;
CREATE TABLE orders_by_customer (id int, customer_id int) PARTITION BY HASH (customer_id) PARTITIONS 4;
INSERT INTO orders_by_customer
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 100000)
SELECT n, FLOOR(RAND() * 50000) FROM g;
ANALYZE TABLE orders_by_status, orders_by_customer;
SELECT TABLE_NAME, PARTITION_NAME, TABLE_ROWS AS rows_lagbhag FROM information_schema.PARTITIONS
 WHERE TABLE_SCHEMA = 'lab' AND TABLE_NAME IN ('orders_by_status', 'orders_by_customer') ORDER BY 1, 2;
