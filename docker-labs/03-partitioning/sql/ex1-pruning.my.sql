-- ex1 · pruning aur retention — MySQL (InnoDB) version
-- 2,000,000 sensor readings, poora 2025
DROP TABLE IF EXISTS readings_flat, readings;
SET SESSION cte_max_recursion_depth = 2000000;

CREATE TABLE readings_flat (
  id bigint AUTO_INCREMENT PRIMARY KEY, sensor_id int, ts datetime, temp decimal(5,2), KEY (ts)
) ENGINE=InnoDB;
INSERT INTO readings_flat (sensor_id, ts, temp)
WITH RECURSIVE g(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM g WHERE n < 1999999)
SELECT FLOOR(RAND()*1000), '2025-01-01' + INTERVAL FLOOR(n * 15.768) SECOND, 20 + RAND()*15 FROM g;

-- MySQL: PRIMARY KEY mein partition column (ts) hona ZAROORI hai — isliye (id, ts)
CREATE TABLE readings (
  id bigint AUTO_INCREMENT, sensor_id int, ts datetime, temp decimal(5,2),
  PRIMARY KEY (id, ts), KEY (ts)
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS (ts) (
  PARTITION p2025_01 VALUES LESS THAN ('2025-02-01'), PARTITION p2025_02 VALUES LESS THAN ('2025-03-01'),
  PARTITION p2025_03 VALUES LESS THAN ('2025-04-01'), PARTITION p2025_04 VALUES LESS THAN ('2025-05-01'),
  PARTITION p2025_05 VALUES LESS THAN ('2025-06-01'), PARTITION p2025_06 VALUES LESS THAN ('2025-07-01'),
  PARTITION p2025_07 VALUES LESS THAN ('2025-08-01'), PARTITION p2025_08 VALUES LESS THAN ('2025-09-01'),
  PARTITION p2025_09 VALUES LESS THAN ('2025-10-01'), PARTITION p2025_10 VALUES LESS THAN ('2025-11-01'),
  PARTITION p2025_11 VALUES LESS THAN ('2025-12-01'), PARTITION p2025_12 VALUES LESS THAN ('2026-01-01')
);
INSERT INTO readings SELECT * FROM readings_flat;
ANALYZE TABLE readings_flat, readings;

SELECT '=== 1. EXPLAIN — partitions column dekho ===' AS '';
EXPLAIN SELECT avg(temp) FROM readings WHERE ts >= '2025-03-01' AND ts < '2025-04-01';
EXPLAIN SELECT avg(temp) FROM readings WHERE MONTH(ts) = 3;

SELECT '=== 2. Kitni rows engine ne padhi (Handler_read_* counters) ===' AS '';
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
-- @x mein daalo taaki result screen par na aaye
CALL measure('March avg        | flat',        "SELECT avg(temp) INTO @x FROM readings_flat IGNORE INDEX (ts) WHERE ts >= '2025-03-01' AND ts < '2025-04-01'");
CALL measure('March avg        | partitioned', "SELECT avg(temp) INTO @x FROM readings IGNORE INDEX (ts) WHERE ts >= '2025-03-01' AND ts < '2025-04-01'");
CALL measure('MONTH(ts) = 3    | partitioned', "SELECT avg(temp) INTO @x FROM readings WHERE MONTH(ts) = 3");
CALL measure('sensor_id = 42   | partitioned', "SELECT avg(temp) INTO @x FROM readings WHERE sensor_id = 42");
SELECT * FROM r;

SELECT '=== 3. Retention: January ka data hatao ===' AS '';
DROP TEMPORARY TABLE IF EXISTS r2;
CREATE TEMPORARY TABLE r2 (tareeka varchar(40), ms int, disk_par_file text);
INSERT INTO r2 SELECT '(pehle) flat file', NULL,
  CONCAT(ROUND(FILE_SIZE/1024/1024), ' MB') FROM information_schema.INNODB_TABLESPACES WHERE NAME = 'lab/readings_flat';
SET @t = NOW(6);
DELETE FROM readings_flat WHERE ts < '2025-02-01';
INSERT INTO r2 SELECT 'flat: DELETE WHERE ts < Feb', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000),
  CONCAT(ROUND(FILE_SIZE/1024/1024), ' MB') FROM information_schema.INNODB_TABLESPACES WHERE NAME = 'lab/readings_flat';
SET @t = NOW(6);
ALTER TABLE readings DROP PARTITION p2025_01;
INSERT INTO r2 SELECT 'partitioned: DROP PARTITION', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000),
  CONCAT((SELECT ROUND(SUM(FILE_SIZE)/1024/1024) FROM information_schema.INNODB_TABLESPACES WHERE NAME LIKE 'lab/readings#p#%'),
         ' MB (', (SELECT COUNT(*) FROM information_schema.INNODB_TABLESPACES WHERE NAME LIKE 'lab/readings#p#%'), ' files)');
SELECT * FROM r2;
