-- ex2 · Har COMMIT ka kharcha (MySQL InnoDB)
-- MySQL mein DO log hain: InnoDB ka REDO log (crash recovery) aur BINLOG (replication/point-in-time).
-- safe    : innodb_flush_log_at_trx_commit=1 + sync_binlog=1 → har commit par dono disk par flush
-- relaxed : innodb_flush_log_at_trx_commit=2 + sync_binlog=0 → OS tak likho, flush baad mein
--           (mysqld crash mein safe; poori machine crash mein aakhri ~1 s ke commits ja sakte hain)
DROP TABLE IF EXISTS c;
DROP PROCEDURE IF EXISTS ins;
CREATE TABLE c (id int, at datetime(6));
DELIMITER //
CREATE PROCEDURE ins(n INT)
BEGIN
  DECLARE i INT DEFAULT 0;
  WHILE i < n DO INSERT INTO c VALUES (i, NOW(6)); SET i = i + 1; END WHILE;   -- autocommit: har INSERT ek commit
END//
DELIMITER ;
SET autocommit = 1;

SET GLOBAL innodb_flush_log_at_trx_commit = 1; SET GLOBAL sync_binlog = 1;
SET @s = NOW(6); CALL ins(5000); SET @on = TIMESTAMPDIFF(MICROSECOND, @s, NOW(6)) / 1000;
SET GLOBAL innodb_flush_log_at_trx_commit = 2; SET GLOBAL sync_binlog = 0;
SET @s = NOW(6); CALL ins(5000); SET @off = TIMESTAMPDIFF(MICROSECOND, @s, NOW(6)) / 1000;
SET GLOBAL innodb_flush_log_at_trx_commit = 1; SET GLOBAL sync_binlog = 1;

SELECT 'safe    (flush=1, sync_binlog=1)' AS mode, ROUND(@on) AS total_ms, ROUND(5000/(@on/1000)) AS commits_per_sec
UNION ALL SELECT 'relaxed (flush=2, sync_binlog=0)', ROUND(@off), ROUND(5000/(@off/1000));
