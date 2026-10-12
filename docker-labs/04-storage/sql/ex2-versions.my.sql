-- ex2 · MySQL (InnoDB): UPDATE row ko APNI JAGAH badalta hai. Purana version undo log mein jaata hai.
DROP TABLE IF EXISTS accounts;
SET SESSION cte_max_recursion_depth = 200000;
CREATE TABLE accounts (id int PRIMARY KEY, owner varchar(20), balance int) ENGINE=InnoDB;
INSERT INTO accounts
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 200000)
SELECT n, CONCAT('user_', n), 1000 FROM g;

DROP TEMPORARY TABLE IF EXISTS r;
CREATE TEMPORARY TABLE r (kadam varchar(30), table_file_mb decimal(8,1), undo_history_len_txns bigint);
DELIMITER //
DROP PROCEDURE IF EXISTS snap //
CREATE PROCEDURE snap(label varchar(45)) BEGIN
  INSERT INTO r SELECT label,
    (SELECT ROUND(FILE_SIZE / 1024 / 1024, 1) FROM information_schema.INNODB_TABLESPACES WHERE NAME = 'lab/accounts'),
    (SELECT `COUNT` FROM information_schema.INNODB_METRICS WHERE NAME = 'trx_rseg_history_len');
END //
DELIMITER ;
DO SLEEP(2);                               -- purge thread ko pichhla kachra saaf karne do
CALL snap('0. shuru (200,000 rows)');
UPDATE accounts SET balance = balance + 1;
CALL snap('1. sab rows UPDATE (1 baar)');
UPDATE accounts SET balance = balance + 1;
UPDATE accounts SET balance = balance + 1;
CALL snap('2. sab rows UPDATE (3 baar)');
SELECT * FROM r;
