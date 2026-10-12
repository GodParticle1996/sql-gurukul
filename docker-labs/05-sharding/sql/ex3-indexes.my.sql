-- ex3 · MySQL version — partial index MySQL mein hai hi nahi. Prefix aur functional index hain.
DROP TABLE IF EXISTS photos;
SET SESSION cte_max_recursion_depth = 1000000;
CREATE TABLE photos (id int PRIMARY KEY, user_id int, created datetime, token char(64)) ENGINE=InnoDB;
INSERT INTO photos
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 1000000)
SELECT n, FLOOR(RAND() * 99999) + 1, '2024-01-01' + INTERVAL FLOOR(n / 1000000 * 730 * 86400) SECOND,
       CONCAT(MD5(n), MD5(n * 7)) FROM g;

SELECT '=== 1. Partial index try karo ===' AS '';
CREATE INDEX photos_user_recent ON photos (user_id, created) WHERE created >= '2025-12-01';

SELECT '=== 2. Token 64 character: poora vs prefix (token(8)) vs functional (LEFT(token, 8)) ===' AS '';
CREATE INDEX photos_token_full ON photos (token);
CREATE INDEX photos_token_p8   ON photos (token(8));
CREATE INDEX photos_token_f8   ON photos ((LEFT(token, 8)));
ANALYZE TABLE photos;
SELECT index_name, ROUND(stat_value * 16 / 1024, 1) AS size_mb FROM mysql.innodb_index_stats
WHERE database_name = 'lab' AND table_name = 'photos' AND stat_name = 'size' ORDER BY index_name;
DROP INDEX photos_token_full ON photos;
SELECT token INTO @t FROM photos WHERE id = 777;
SELECT '--- prefix index: query mein kuch badalna nahi padta ---' AS '';
EXPLAIN SELECT id FROM photos WHERE token = @t;
