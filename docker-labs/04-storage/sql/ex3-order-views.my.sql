-- ex3 · MySQL version — drag karke beech mein daalna, aur "live" summary (MySQL mein materialized view hota hi nahi)
DROP TABLE IF EXISTS tasks_int, tasks_frac, orders, city_revenue, city_revenue_snapshot;
DROP TRIGGER IF EXISTS orders_bump;
SET SESSION cte_max_recursion_depth = 1000000;

SELECT '=== (a) 10,000 tasks. Aakhri task ko 2nd aur 3rd ke beech rakho ===' AS '';
CREATE TABLE tasks_int  (id int PRIMARY KEY, pos int, title varchar(20)) ENGINE=InnoDB;
CREATE TABLE tasks_frac (id int PRIMARY KEY, pos double, title varchar(20)) ENGINE=InnoDB;
INSERT INTO tasks_int  WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 10000) SELECT n, n, CONCAT('task ', n) FROM g;
INSERT INTO tasks_frac SELECT * FROM tasks_int;
UPDATE tasks_int SET pos = pos + 1 WHERE pos >= 3 AND id <> 10000;
SET @renumbered = ROW_COUNT();
UPDATE tasks_int SET pos = 3 WHERE id = 10000;
UPDATE tasks_frac SET pos = (2 + 3) / 2 WHERE id = 10000;
SET @frac = ROW_COUNT();
SELECT 'integer pos (sab ko renumber)' AS tareeka, @renumbered + 1 AS rows_likhi
UNION ALL SELECT 'fractional pos (2 aur 3 ka beech)', @frac;

SELECT '=== DOUBLE ki precision: baar-baar "2 ke theek baad" daalo ===' AS '';
DELIMITER //
DROP PROCEDURE IF EXISTS squeeze //
CREATE PROCEDURE squeeze() BEGIN
  DECLARE a double DEFAULT 2; DECLARE b double DEFAULT 3; DECLARE m double; DECLARE i int DEFAULT 0;
  l: LOOP
    SET m = (a + b) / 2, i = i + 1;
    IF m = a OR m = b THEN LEAVE l; END IF;
    SET b = m;
  END LOOP;
  SELECT i AS kitni_baar_chala, a, b, m AS beech_ka;
END //
DELIMITER ;
CALL squeeze();

SELECT '=== (b) 1,000,000 orders. Dashboard: har city ki kamaai ===' AS '';
CREATE TABLE orders (id bigint AUTO_INCREMENT PRIMARY KEY, city varchar(10), amount int) ENGINE=InnoDB;
INSERT INTO orders (city, amount)
WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM g WHERE n < 1000000)
SELECT ELT(1 + n % 8, 'Delhi','Mumbai','Pune','Jaipur','Indore','Patna','Kochi','Surat'), FLOOR(RAND() * 2000) FROM g;

DROP TEMPORARY TABLE IF EXISTS w;
CREATE TEMPORARY TABLE w (kya varchar(50), ms int);
SET @t = NOW(6);
SELECT city, SUM(amount) INTO @c, @s FROM orders WHERE city = 'Delhi' GROUP BY city;
INSERT INTO w VALUES ('tareeka 1: har baar poori query', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));

-- tareeka 2: "materialized view" MySQL mein = khud ki snapshot table + cron se REFRESH
SET @t = NOW(6);
CREATE TABLE city_revenue_snapshot (city varchar(10) PRIMARY KEY, revenue bigint) ENGINE=InnoDB
  AS SELECT city, SUM(amount) AS revenue FROM orders GROUP BY city;
INSERT INTO w VALUES ('tareeka 2: snapshot table REFRESH (poori query)', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));

DELIMITER //
DROP PROCEDURE IF EXISTS insert_many //
CREATE PROCEDURE insert_many(n int) BEGIN      -- ek transaction mein (warna har INSERT ka fsync hi 4 ms kha jaata — lab 01)
  DECLARE i int DEFAULT 0;
  START TRANSACTION;
  WHILE i < n DO INSERT INTO orders (city, amount) VALUES ('Delhi', 100); SET i = i + 1; END WHILE;
  COMMIT;
END //
DELIMITER ;
SET @t = NOW(6);
CALL insert_many(5000);
INSERT INTO w VALUES ('5000 INSERT, bina trigger', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));

-- tareeka 3: summary table + trigger
CREATE TABLE city_revenue (city varchar(10) PRIMARY KEY, revenue bigint) ENGINE=InnoDB
  AS SELECT city, SUM(amount) AS revenue FROM orders GROUP BY city;
CREATE TRIGGER orders_bump AFTER INSERT ON orders FOR EACH ROW
  INSERT INTO city_revenue VALUES (NEW.city, NEW.amount) ON DUPLICATE KEY UPDATE revenue = revenue + NEW.amount;
SET @t = NOW(6);
CALL insert_many(5000);
INSERT INTO w VALUES ('5000 INSERT, trigger ke saath', ROUND(TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000));
SELECT * FROM w;

SELECT 'asli (poori query)' AS kahan_se, SUM(amount) AS delhi FROM orders WHERE city = 'Delhi'
UNION ALL SELECT 'snapshot table (aakhri REFRESH wala)', revenue FROM city_revenue_snapshot WHERE city = 'Delhi'
UNION ALL SELECT 'summary table + trigger', revenue FROM city_revenue WHERE city = 'Delhi';
