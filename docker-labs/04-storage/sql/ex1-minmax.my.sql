-- ex1 · MySQL version — InnoDB mein BRIN nahi hota. Toh "kram mein rakha data" ka fayda kaise lein?
-- 2,000,000 orders, time ke kram mein
DROP TABLE IF EXISTS orders_noidx, orders_secidx, orders_clustered, orders_wide, orders_narrow;
SET SESSION cte_max_recursion_depth = 2000000;
CREATE TABLE orders_noidx (id bigint PRIMARY KEY, created datetime, amount int) ENGINE=InnoDB;
INSERT INTO orders_noidx
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 2000000)
SELECT n, '2025-01-01' + INTERVAL FLOOR(n * 15.768) SECOND, FLOOR(RAND() * 5000) FROM g;
-- secondary index: alag B-tree (created → id), phir id se asli row
CREATE TABLE orders_secidx LIKE orders_noidx;
ALTER TABLE orders_secidx ADD KEY created_idx (created);
INSERT INTO orders_secidx SELECT * FROM orders_noidx;
-- clustered: InnoDB table KHUD PRIMARY KEY ke kram mein rakhi hoti hai. PK = (created, id)
CREATE TABLE orders_clustered (id bigint, created datetime, amount int, PRIMARY KEY (created, id)) ENGINE=InnoDB;
INSERT INTO orders_clustered SELECT * FROM orders_noidx;
ANALYZE TABLE orders_noidx, orders_secidx, orders_clustered;

SELECT '=== 1. Size (16 kB pages) ===' AS '';
SELECT table_name AS table_, index_name, ROUND(stat_value * 16 / 1024, 1) AS size_mb
FROM mysql.innodb_index_stats
WHERE database_name = 'lab' AND table_name IN ('orders_noidx', 'orders_secidx', 'orders_clustered') AND stat_name = 'size'
ORDER BY 1, 2;

DROP TEMPORARY TABLE IF EXISTS r;
CREATE TEMPORARY TABLE r (sawaal varchar(40), rows_padhi bigint, ms int);
DELIMITER //
DROP PROCEDURE IF EXISTS measure //
CREATE PROCEDURE measure(label varchar(40), q text) BEGIN
  DECLARE t0 datetime(6);
  FLUSH STATUS;
  SET @q = q; PREPARE s FROM @q;
  SET t0 = NOW(6); EXECUTE s; DEALLOCATE PREPARE s;
  INSERT INTO r SELECT label,
    (SELECT SUM(VARIABLE_VALUE) FROM performance_schema.session_status
      WHERE VARIABLE_NAME IN ('Handler_read_rnd_next', 'Handler_read_next', 'Handler_read_key')),
    ROUND(TIMESTAMPDIFF(MICROSECOND, t0, NOW(6)) / 1000);
END //
DELIMITER ;

SELECT '=== 2. Ek din (3 March) ki bikri ===' AS '';
CALL measure('koi index nahi',              "SELECT sum(amount) INTO @x FROM orders_noidx     WHERE created >= '2025-03-03' AND created < '2025-03-04'");
CALL measure('secondary index (created)',   "SELECT sum(amount) INTO @x FROM orders_secidx    WHERE created >= '2025-03-03' AND created < '2025-03-04'");
CALL measure('PK = (created, id) clustered', "SELECT sum(amount) INTO @x FROM orders_clustered WHERE created >= '2025-03-03' AND created < '2025-03-04'");
SELECT * FROM r;

SELECT '=== 3. Chaudi row (22 columns) vs patli row (2 columns) — sirf sum(amount) ===' AS '';
CREATE TABLE orders_narrow (id bigint PRIMARY KEY, amount int) ENGINE=InnoDB;
INSERT INTO orders_narrow SELECT id, amount FROM orders_noidx WHERE id <= 200000;
CREATE TABLE orders_wide (id bigint PRIMARY KEY, amount int,
  c1 char(32), c2 char(32), c3 char(32), c4 char(32), c5 char(32), c6 char(32), c7 char(32), c8 char(32), c9 char(32), c10 char(32),
  c11 char(32), c12 char(32), c13 char(32), c14 char(32), c15 char(32), c16 char(32), c17 char(32), c18 char(32), c19 char(32), c20 char(32)
) ENGINE=InnoDB;
INSERT INTO orders_wide SELECT id, amount,
  MD5(CONCAT(id,1)), MD5(CONCAT(id,2)), MD5(CONCAT(id,3)), MD5(CONCAT(id,4)), MD5(CONCAT(id,5)), MD5(CONCAT(id,6)), MD5(CONCAT(id,7)),
  MD5(CONCAT(id,8)), MD5(CONCAT(id,9)), MD5(CONCAT(id,10)), MD5(CONCAT(id,11)), MD5(CONCAT(id,12)), MD5(CONCAT(id,13)), MD5(CONCAT(id,14)),
  MD5(CONCAT(id,15)), MD5(CONCAT(id,16)), MD5(CONCAT(id,17)), MD5(CONCAT(id,18)), MD5(CONCAT(id,19)), MD5(CONCAT(id,20))
FROM orders_noidx WHERE id <= 200000;
ANALYZE TABLE orders_wide, orders_narrow;
TRUNCATE r;
CALL measure('wide (22 col)',  "SELECT sum(amount) INTO @x FROM orders_wide");
CALL measure('narrow (2 col)', "SELECT sum(amount) INTO @x FROM orders_narrow");
SELECT r.sawaal, r.rows_padhi, r.ms, ROUND(s.stat_value * 16 / 1024, 1) AS size_mb
FROM r JOIN mysql.innodb_index_stats s
  ON s.database_name = 'lab' AND s.table_name = IF(r.sawaal LIKE 'wide%', 'orders_wide', 'orders_narrow')
 AND s.index_name = 'PRIMARY' AND s.stat_name = 'size';
