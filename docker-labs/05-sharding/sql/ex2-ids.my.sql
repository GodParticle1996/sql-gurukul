-- ex2 · MySQL version. MySQL mein SEQUENCE nahi hota — counter table + LAST_INSERT_ID() (Flickr "ticket server" wala jugaad)
SET GLOBAL log_bin_trust_function_creators = 1;
SET time_zone = '+00:00';   -- binlog on ho toh non-deterministic function banane ke liye
DROP TABLE IF EXISTS seq_5, seq_6, ids_a, ids_b, t_bigint, t_random16, t_uuid_ordered;
DROP FUNCTION IF EXISTS next_id_5; DROP FUNCTION IF EXISTS next_id_6;
CREATE TABLE seq_5 (n bigint NOT NULL) ENGINE=InnoDB; INSERT INTO seq_5 VALUES (0);
CREATE TABLE seq_6 (n bigint NOT NULL) ENGINE=InnoDB; INSERT INTO seq_6 VALUES (0);
DELIMITER //
CREATE FUNCTION next_id_5() RETURNS bigint NOT DETERMINISTIC MODIFIES SQL DATA BEGIN
  UPDATE seq_5 SET n = LAST_INSERT_ID(n + 1);
  -- SYSDATE(3), NOW(3) nahi: NOW() poore statement mein ek hi time deta hai
  RETURN ((FLOOR(UNIX_TIMESTAMP(SYSDATE(3)) * 1000) - 1314220021721) << 23) | (5 << 10) | (LAST_INSERT_ID() % 1024);
END //
CREATE FUNCTION next_id_6() RETURNS bigint NOT DETERMINISTIC MODIFIES SQL DATA BEGIN
  UPDATE seq_6 SET n = LAST_INSERT_ID(n + 1);
  RETURN ((FLOOR(UNIX_TIMESTAMP(SYSDATE(3)) * 1000) - 1314220021721) << 23) | (6 << 10) | (LAST_INSERT_ID() % 1024);
END //
DELIMITER ;

SELECT '=== 1. Ek ID kholo ===' AS '';
SET @id = next_id_5();
SELECT @id AS id, FROM_UNIXTIME(((@id >> 23) + 1314220021721) / 1000) AS kab_bani_utc, (@id >> 10) & 8191 AS shard, @id & 1023 AS seq;

SELECT '=== 2. Do shards, 20,000 IDs har ek ===' AS '';
SET SESSION cte_max_recursion_depth = 1000000;
CREATE TABLE ids_a (instagram_id bigint, serial_id int, KEY (instagram_id), KEY (serial_id));
CREATE TABLE ids_b LIKE ids_a;
INSERT INTO ids_a WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 20000) SELECT next_id_5(), n FROM g;
INSERT INTO ids_b WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 20000) SELECT next_id_6(), n FROM g;
SELECT 'har shard ka apna AUTO_INCREMENT' AS tareeka, COUNT(*) AS takraav FROM ids_a JOIN ids_b USING (serial_id)
UNION ALL SELECT 'Instagram id (shard bits andar)', COUNT(*) FROM ids_a JOIN ids_b USING (instagram_id)
UNION ALL SELECT 'ek hi shard ke andar duplicate?', COUNT(*) - COUNT(DISTINCT instagram_id) FROM ids_a;

SELECT '=== 3. InnoDB: PRIMARY KEY = table ka kram. Random key = har insert beech mein ghusna ===' AS '';
CREATE TABLE t_bigint       (id bigint PRIMARY KEY, v int) ENGINE=InnoDB;
CREATE TABLE t_random16     (id binary(16) PRIMARY KEY, v int) ENGINE=InnoDB;
CREATE TABLE t_uuid_ordered (id binary(16) PRIMARY KEY, v int) ENGINE=InnoDB;
DROP TEMPORARY TABLE IF EXISTS r;
CREATE TEMPORARY TABLE r (pk varchar(45), insert_ms int);
SET @t = NOW(6);
INSERT INTO t_bigint WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 1000000) SELECT (n << 23) | (5 << 10), n FROM g;
INSERT INTO r VALUES ('bigint (Instagram jaisa, time ke kram mein)', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));
SET @t = NOW(6);
INSERT INTO t_random16 WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 1000000) SELECT RANDOM_BYTES(16), n FROM g;
INSERT INTO r VALUES ('16 random bytes (UUID v4 jaisa)', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));
SET @t = NOW(6);
INSERT INTO t_uuid_ordered WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 1000000) SELECT UUID_TO_BIN(UUID(), 1), n FROM g;
INSERT INTO r VALUES ('UUID_TO_BIN(UUID(), 1) (time pehle)', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));
ANALYZE TABLE t_bigint, t_random16, t_uuid_ordered;
SELECT r.pk, r.insert_ms, ROUND(s.stat_value * 16 / 1024, 1) AS table_mb
FROM r JOIN mysql.innodb_index_stats s ON s.database_name = 'lab' AND s.index_name = 'PRIMARY' AND s.stat_name = 'size'
 AND s.table_name = CASE WHEN r.pk LIKE 'bigint%' THEN 't_bigint' WHEN r.pk LIKE '16%' THEN 't_random16' ELSE 't_uuid_ordered' END;

SELECT '=== 4. Naye 20 posts ===' AS '';
EXPLAIN SELECT * FROM t_bigint ORDER BY id DESC LIMIT 20;
