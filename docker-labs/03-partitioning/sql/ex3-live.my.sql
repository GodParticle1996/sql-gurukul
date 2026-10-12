-- ex3 · chalti hui badi table ko partition karo — MySQL version
-- MySQL mein NOT VALID constraint nahi hota. Uska jawaab: EXCHANGE PARTITION ... WITHOUT VALIDATION
-- daily_totals: 2019 se June 2025, har din 500 locations = 1,186,500 rows
DROP TABLE IF EXISTS daily_totals, daily_totals_copy, daily_totals_new, daily_totals_khali;
SET SESSION cte_max_recursion_depth = 5000;
CREATE TABLE daily_totals (
  id bigint AUTO_INCREMENT PRIMARY KEY, total_date date NOT NULL, location_id int, total decimal(12,2),
  KEY date_idx (total_date), KEY loc_idx (location_id)
) ENGINE=InnoDB;
INSERT INTO daily_totals (total_date, location_id, total)
WITH RECURSIVE d(dt) AS (SELECT DATE '2019-01-01' UNION ALL SELECT dt + INTERVAL 1 DAY FROM d WHERE dt < '2025-06-30'),
               l(n)  AS (SELECT 1 UNION ALL SELECT n + 1 FROM l WHERE n < 500)
SELECT dt, n, ROUND(RAND() * 100000, 2) FROM d, l;
CREATE TABLE daily_totals_copy LIKE daily_totals;
INSERT INTO daily_totals_copy SELECT * FROM daily_totals;

DROP TEMPORARY TABLE IF EXISTS r;
CREATE TEMPORARY TABLE r (tareeka varchar(60), app_ruki_ms int, background_ms int);

-- 1. Seedha: ALTER TABLE ... PARTITION BY — poori table copy hoti hai (ALGORITHM=COPY), writes band
SET @t = NOW(6);
ALTER TABLE daily_totals_copy DROP PRIMARY KEY, ADD PRIMARY KEY (id, total_date)
  PARTITION BY RANGE COLUMNS (total_date) (
    PARTITION p_legacy VALUES LESS THAN ('2025-07-01'), PARTITION p2025_07 VALUES LESS THAN ('2025-08-01'),
    PARTITION pmax VALUES LESS THAN (MAXVALUE));
INSERT INTO r VALUES ('1. ALTER TABLE ... PARTITION BY (copy)', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000), 0);

-- 2 aur 3 ki taiyari (app chalte hue): PK mein total_date daalo — ONLINE rebuild, writes chalu rehte hain
SET @t = NOW(6);
ALTER TABLE daily_totals DROP PRIMARY KEY, ADD PRIMARY KEY (id, total_date), ALGORITHM=INPLACE, LOCK=NONE;
SET @pk_ms = ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000);
-- khaali partitioned table, bilkul same columns + indexes
CREATE TABLE daily_totals_new LIKE daily_totals;
ALTER TABLE daily_totals_new PARTITION BY RANGE COLUMNS (total_date) (
  PARTITION p_legacy VALUES LESS THAN ('2025-07-01'), PARTITION p2025_07 VALUES LESS THAN ('2025-08-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE));

-- 2. EXCHANGE (default = WITH VALIDATION): MySQL har row check karta hai ki range mein hai
SET @t = NOW(6);
ALTER TABLE daily_totals_new EXCHANGE PARTITION p_legacy WITH TABLE daily_totals;
INSERT INTO r VALUES ('2. EXCHANGE PARTITION (with validation)', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000), @pk_ms);
-- wapas palto (taaki 3 bhi same data par naapein)
ALTER TABLE daily_totals_new EXCHANGE PARTITION p_legacy WITH TABLE daily_totals WITHOUT VALIDATION;

-- 3. EXCHANGE ... WITHOUT VALIDATION + RENAME — ek LOCK ke andar, taaki beech mein koi write khaali table mein na jaaye
SET @t = NOW(6);
LOCK TABLES daily_totals WRITE, daily_totals_new WRITE;
ALTER TABLE daily_totals_new EXCHANGE PARTITION p_legacy WITH TABLE daily_totals WITHOUT VALIDATION;
RENAME TABLE daily_totals TO daily_totals_khali, daily_totals_new TO daily_totals;
UNLOCK TABLES;
INSERT INTO r VALUES ('3. EXCHANGE ... WITHOUT VALIDATION + RENAME', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000), @pk_ms);

SELECT * FROM r;
ANALYZE TABLE daily_totals;
SELECT 'daily_totals' AS ab_table, PARTITION_NAME, TABLE_ROWS AS rows_lagbhag FROM information_schema.PARTITIONS
 WHERE TABLE_SCHEMA = 'lab' AND TABLE_NAME = 'daily_totals' ORDER BY PARTITION_ORDINAL_POSITION;
SELECT COUNT(*) AS daily_totals_khali_mein_rows FROM daily_totals_khali;

SELECT '--- aage: legacy se June alag karna = REORGANIZE PARTITION (poori p_legacy dobara likhi jaati hai!) ---' AS '';
SET @t = NOW(6);
ALTER TABLE daily_totals REORGANIZE PARTITION p_legacy INTO (
  PARTITION p_legacy VALUES LESS THAN ('2025-06-01'), PARTITION p2025_06 VALUES LESS THAN ('2025-07-01'));
SELECT ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000) AS reorganize_ms;
ANALYZE TABLE daily_totals;
SELECT PARTITION_NAME, TABLE_ROWS AS rows_lagbhag FROM information_schema.PARTITIONS
 WHERE TABLE_SCHEMA = 'lab' AND TABLE_NAME = 'daily_totals' ORDER BY PARTITION_ORDINAL_POSITION;
