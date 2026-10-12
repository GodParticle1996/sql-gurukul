-- ex1 · MySQL version — wahi 200,000 blocks, wahi teen tareeke. MySQL 8 mein WITH RECURSIVE hai (5.7 mein nahi tha).
DROP TABLE IF EXISTS blocks, blocks_path, blocks_closure, sub;
SET SESSION cte_max_recursion_depth = 200000;

-- 1) ADJACENCY LIST
CREATE TABLE blocks (id bigint PRIMARY KEY, parent_id bigint, kind varchar(10), content varchar(40), KEY parent_idx (parent_id)) ENGINE=InnoDB;
INSERT INTO blocks
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 200000)
SELECT n, IF(n <= 3, NULL, n DIV 4), ELT(1 + n % 4, 'page', 'text', 'toggle', 'todo'), CONCAT('block ', n) FROM g;

-- 2) MATERIALIZED PATH (anchor mein CAST zaroori — warna column ki width pehli row jitni ban jaati hai)
CREATE TABLE blocks_path (id bigint PRIMARY KEY, path varchar(255), KEY path_idx (path)) ENGINE=InnoDB;
INSERT INTO blocks_path
WITH RECURSIVE t(id, path) AS (
  SELECT id, CAST(id AS CHAR(255)) FROM blocks WHERE parent_id IS NULL
  UNION ALL
  SELECT b.id, CONCAT(t.path, '/', b.id) FROM blocks b JOIN t ON b.parent_id = t.id)
SELECT id, path FROM t;

-- 3) CLOSURE TABLE
CREATE TABLE blocks_closure (ancestor bigint, descendant bigint, depth int, PRIMARY KEY (ancestor, descendant), KEY desc_idx (descendant)) ENGINE=InnoDB;
INSERT INTO blocks_closure
WITH RECURSIVE c(ancestor, descendant, depth) AS (
  SELECT id, id, 0 FROM blocks
  UNION ALL
  SELECT b.parent_id, c.descendant, c.depth + 1 FROM c JOIN blocks b ON b.id = c.ancestor WHERE b.parent_id IS NOT NULL)
SELECT * FROM c;
ANALYZE TABLE blocks, blocks_path, blocks_closure;

SELECT '=== 1. Teen tareeke — kitni rows, kitni jagah (data + indexes) ===' AS '';
SELECT 'adjacency (parent_id)' AS tareeka, (SELECT count(*) FROM blocks) AS rows_,
       (SELECT ROUND(SUM(stat_value) * 16 / 1024, 1) FROM mysql.innodb_index_stats WHERE database_name = 'lab' AND table_name = 'blocks' AND stat_name = 'size') AS size_mb
UNION ALL SELECT 'materialized path', (SELECT count(*) FROM blocks_path),
       (SELECT ROUND(SUM(stat_value) * 16 / 1024, 1) FROM mysql.innodb_index_stats WHERE database_name = 'lab' AND table_name = 'blocks_path' AND stat_name = 'size')
UNION ALL SELECT 'closure table', (SELECT count(*) FROM blocks_closure),
       (SELECT ROUND(SUM(stat_value) * 16 / 1024, 1) FROM mysql.innodb_index_stats WHERE database_name = 'lab' AND table_name = 'blocks_closure' AND stat_name = 'size');

DROP TEMPORARY TABLE IF EXISTS r;
CREATE TEMPORARY TABLE r (tareeka varchar(40), rows_mile bigint, rows_padhi bigint, ms decimal(8,1));
DELIMITER //
DROP PROCEDURE IF EXISTS measure //
CREATE PROCEDURE measure(label varchar(40), q text) BEGIN
  DECLARE t0 datetime(6);
  SET @q = CONCAT('SELECT COUNT(*) INTO @n FROM (', q, ') x'); PREPARE s FROM @q;
  EXECUTE s;                              -- ek baar garam karo
  FLUSH STATUS;
  SET t0 = NOW(6); EXECUTE s; DEALLOCATE PREPARE s;
  INSERT INTO r SELECT label, @n,
    (SELECT SUM(VARIABLE_VALUE) FROM performance_schema.session_status
      WHERE VARIABLE_NAME IN ('Handler_read_rnd_next', 'Handler_read_next', 'Handler_read_key')),
    TIMESTAMPDIFF(MICROSECOND, t0, NOW(6)) / 1000;
END //
DROP PROCEDURE IF EXISTS timed //
CREATE PROCEDURE timed(label varchar(40), q text) BEGIN
  DECLARE t0 datetime(6);
  SET @q = q; PREPARE s FROM @q;
  SET t0 = NOW(6); EXECUTE s; SET @rc = ROW_COUNT(); DEALLOCATE PREPARE s;
  INSERT INTO r VALUES (label, @rc, NULL, TIMESTAMPDIFF(MICROSECOND, t0, NOW(6)) / 1000);
END //
DELIMITER ;

SELECT '=== 2. Permission check: block 90000 ke saare ancestors ===' AS '';
CALL measure('adjacency + recursive CTE', 'WITH RECURSIVE up AS (SELECT id, parent_id FROM blocks WHERE id = 90000 UNION ALL SELECT b.id, b.parent_id FROM blocks b JOIN up ON b.id = up.parent_id) SELECT id FROM up');
CALL measure('materialized path (1 row)', 'SELECT path FROM blocks_path WHERE id = 90000');
CALL measure('closure table', 'SELECT ancestor FROM blocks_closure WHERE descendant = 90000');
SELECT * FROM r;
SELECT path AS 'block 90000 ka raasta (ek row — ancestors isi mein)' FROM blocks_path WHERE id = 90000;

SELECT '=== 3. Page 5 aur uske andar sab kuch ===' AS '';
TRUNCATE r;
CALL measure('adjacency + recursive CTE', 'WITH RECURSIVE down AS (SELECT id FROM blocks WHERE id = 5 UNION ALL SELECT b.id FROM blocks b JOIN down ON b.parent_id = down.id) SELECT id FROM down');
CALL measure('materialized path LIKE', "SELECT id FROM blocks_path WHERE path = '1/5' OR path LIKE '1/5/%'");
CALL measure('closure table', 'SELECT descendant FROM blocks_closure WHERE ancestor = 5');
SELECT * FROM r;

SELECT '=== 4. Drag-and-drop: page 5 ko workspace 1 se workspace 3 mein ===' AS '';
TRUNCATE r;
CALL timed('adjacency: parent_id badlo', 'UPDATE blocks SET parent_id = 3 WHERE id = 5');
CALL timed('path: har descendant ka path', "UPDATE blocks_path SET path = CONCAT('3/5', SUBSTRING(path, 4)) WHERE path = '1/5' OR path LIKE '1/5/%'");
-- MySQL ek DELETE mein usi table ko subquery mein padhne nahi deta (ERROR 1093) — isliye subtree pehle alag table mein
-- (TEMPORARY table nahi: ek query mein do baar khul nahi sakti — ERROR 1137)
DROP TABLE IF EXISTS sub;
CREATE TABLE sub (id bigint PRIMARY KEY) ENGINE=InnoDB SELECT descendant AS id FROM blocks_closure WHERE ancestor = 5;
START TRANSACTION;
CALL timed('closure: purane rishte hatao', 'DELETE c FROM blocks_closure c JOIN sub d ON c.descendant = d.id LEFT JOIN sub a ON c.ancestor = a.id WHERE a.id IS NULL');
CALL timed('closure: naye rishte jodo', 'INSERT INTO blocks_closure SELECT up.ancestor, down.descendant, up.depth + down.depth + 1 FROM blocks_closure up JOIN blocks_closure down ON down.ancestor = 5 WHERE up.descendant = 3');
COMMIT;
DROP TABLE sub;
SELECT tareeka, rows_mile AS rows_badli, ms FROM r;
SELECT (SELECT path FROM blocks_path WHERE id = 90000) AS '90000 ka naya raasta',
       (SELECT GROUP_CONCAT(ancestor ORDER BY depth DESC) FROM blocks_closure WHERE descendant = 90000) AS 'closure ke ancestors';

SELECT '=== 5. Jaal: page 5 ko uske hi bachche (21) ke andar daal do ===' AS '';
UPDATE blocks SET parent_id = 21 WHERE id = 5;
SET SESSION cte_max_recursion_depth = 1000;   -- default
SELECT 'bina guard: 21 ke ancestors →' AS '';
WITH RECURSIVE up AS (SELECT id, parent_id FROM blocks WHERE id = 21 UNION ALL SELECT b.id, b.parent_id FROM blocks b JOIN up ON b.id = up.parent_id)
SELECT COUNT(*) FROM up;
SELECT 'guard ke saath (dekhe hue ids ki list):' AS '';
WITH RECURSIVE up(id, parent_id, seen) AS (
  SELECT id, parent_id, CAST(id AS CHAR(1000)) FROM blocks WHERE id = 21
  UNION ALL SELECT b.id, b.parent_id, CONCAT(up.seen, ',', b.id) FROM blocks b JOIN up ON b.id = up.parent_id WHERE FIND_IN_SET(b.id, up.seen) = 0)
SELECT id, parent_id, seen FROM up;
SELECT EXISTS (SELECT 1 FROM blocks_closure WHERE ancestor = 5 AND descendant = 21) AS 'closure: 21 page 5 ke andar?',
       (SELECT path FROM blocks_path WHERE id = 21) LIKE CONCAT((SELECT path FROM blocks_path WHERE id = 5), '/%') AS 'path: 21 page 5 ke andar?';
UPDATE blocks SET parent_id = 3 WHERE id = 5;
