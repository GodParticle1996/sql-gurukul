-- ex1 · redo log kitna likha gaya? (MySQL InnoDB)
-- Innodb_os_log_written = redo log mein ab tak likhe gaye bytes.
DROP TABLE IF EXISTS w0, w1, w5;
CREATE TABLE w0 (id int PRIMARY KEY, email varchar(64), name varchar(64), city varchar(32), amount int, note char(32));
CREATE TABLE w1 LIKE w0;  CREATE INDEX ix_e ON w1 (email);
CREATE TABLE w5 LIKE w0;  CREATE INDEX ix_e ON w5 (email); CREATE INDEX ix_n ON w5 (name);
CREATE INDEX ix_c ON w5 (city); CREATE INDEX ix_a ON w5 (amount); CREATE INDEX ix_t ON w5 (note);
SET SESSION cte_max_recursion_depth = 100000;

SELECT variable_value INTO @a FROM performance_schema.global_status WHERE variable_name = 'Innodb_os_log_written';
INSERT INTO w0 WITH RECURSIVE g(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM g WHERE n < 50000)
  SELECT n, CONCAT('u',n,'@kk.in'), CONCAT('name ',n), CONCAT('city ',n%50), n%1000, MD5(n) FROM g;
SELECT variable_value INTO @b FROM performance_schema.global_status WHERE variable_name = 'Innodb_os_log_written';
INSERT INTO w1 SELECT * FROM w0;
SELECT variable_value INTO @c FROM performance_schema.global_status WHERE variable_name = 'Innodb_os_log_written';
INSERT INTO w5 SELECT * FROM w0;
SELECT variable_value INTO @d FROM performance_schema.global_status WHERE variable_name = 'Innodb_os_log_written';

SELECT '0 index' AS `table`, CONCAT(ROUND((@b-@a)/1048576,1),' MB') AS redo_likha
UNION ALL SELECT '1 index', CONCAT(ROUND((@c-@b)/1048576,1),' MB')
UNION ALL SELECT '5 index', CONCAT(ROUND((@d-@c)/1048576,1),' MB');
