-- ex3 · Airtable ke do sawaal: (a) row ko drag karke beech mein daalna, (b) "live" summary
\pset footer off
SET client_min_messages = warning;
DROP TABLE IF EXISTS tasks_int, tasks_frac, orders, city_revenue CASCADE;
DROP MATERIALIZED VIEW IF EXISTS city_revenue_mv;

\echo '=== (a) 10,000 tasks. Aakhri task ko drag karke 2nd aur 3rd ke beech rakho ==='
CREATE TABLE tasks_int  (id int PRIMARY KEY, pos int, title text);
CREATE TABLE tasks_frac (id int PRIMARY KEY, pos float8, title text);
INSERT INTO tasks_int  SELECT g, g, 'task ' || g FROM generate_series(1, 10000) g;
INSERT INTO tasks_frac SELECT g, g, 'task ' || g FROM generate_series(1, 10000) g;
CREATE TEMP TABLE r (tareeka text, rows_likhi bigint, wal text);
DO $$ DECLARE l0 pg_lsn; n bigint; BEGIN
  l0 := pg_current_wal_insert_lsn();
  UPDATE tasks_int SET pos = pos + 1 WHERE pos >= 3 AND id <> 10000;      -- neeche wale sab ek khiske
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE tasks_int SET pos = 3 WHERE id = 10000;
  INSERT INTO r VALUES ('integer pos (sab ko renumber)', n + 1, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_insert_lsn(), l0)));
  l0 := pg_current_wal_insert_lsn();
  UPDATE tasks_frac SET pos = (2 + 3) / 2.0 WHERE id = 10000;              -- 2.5 — bas ek row
  INSERT INTO r VALUES ('fractional pos (2 aur 3 ka beech)', 1, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_insert_lsn(), l0)));
END $$;
SELECT * FROM r;
SELECT id, pos, title FROM tasks_frac ORDER BY pos LIMIT 4;

\echo '=== Par float8 ki precision khatam hoti hai: baar-baar "pehle ke theek baad" daalo ==='
DO $$ DECLARE a float8 := 2; b float8 := 3; m float8; i int := 0; BEGIN
  LOOP
    m := (a + b) / 2; i := i + 1;
    EXIT WHEN m = a OR m = b;
    b := m;                                   -- har baar naya task 2 ke theek baad
  END LOOP;
  CREATE TEMP TABLE f AS SELECT i AS kitni_baar_chala, a AS a, b AS b, m AS beech_ka;
END $$;
SELECT * FROM f;
\echo '(Beech ka number = a ya b hi nikla — ab do tasks ki pos BARABAR. Ilaaj: kabhi-kabhi poori list 1,2,3... se rebalance.)'

\echo
\echo '=== (b) 1,000,000 orders. Dashboard: "har city ki kamaai" ==='
CREATE TABLE orders (id bigserial PRIMARY KEY, city text, amount int);
INSERT INTO orders (city, amount)
SELECT (ARRAY['Delhi','Mumbai','Pune','Jaipur','Indore','Patna','Kochi','Surat'])[1 + g % 8], (random() * 2000)::int
FROM generate_series(1, 1000000) g;
ANALYZE orders;

\timing on
\echo '--- tareeka 1: har baar poori query (dashboard khula = 1M rows padho) ---'
SELECT city, sum(amount) FROM orders WHERE city = 'Delhi' GROUP BY city;
\echo '--- tareeka 2: MATERIALIZED VIEW — jawab disk par save. Padhna turant, REFRESH = poori query dobara ---'
CREATE MATERIALIZED VIEW city_revenue_mv AS SELECT city, sum(amount) AS revenue FROM orders GROUP BY city;
SELECT * FROM city_revenue_mv WHERE city = 'Delhi';
\timing off
\echo 'REFRESH ... CONCURRENTLY (padhne walon ko bina roke) — bina unique index ke:'
REFRESH MATERIALIZED VIEW CONCURRENTLY city_revenue_mv;
CREATE UNIQUE INDEX ON city_revenue_mv (city);
\timing on
REFRESH MATERIALIZED VIEW CONCURRENTLY city_revenue_mv;
\timing off

\echo '--- tareeka 3: summary table + trigger (incremental — har INSERT par sirf apna hissa jodo) ---'
CREATE TEMP TABLE w (kya text, ms numeric);
DO $$ DECLARE t0 timestamptz; BEGIN
  t0 := clock_timestamp();
  FOR i IN 1..5000 LOOP INSERT INTO orders (city, amount) VALUES ('Delhi', 100); END LOOP;
  INSERT INTO w VALUES ('5000 INSERT, bina trigger', round(extract(epoch FROM clock_timestamp() - t0) * 1000));
END $$;
CREATE TABLE city_revenue AS SELECT city, sum(amount)::bigint AS revenue FROM orders GROUP BY city;
ALTER TABLE city_revenue ADD PRIMARY KEY (city);
CREATE OR REPLACE FUNCTION bump_city() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN
  INSERT INTO city_revenue VALUES (NEW.city, NEW.amount)
  ON CONFLICT (city) DO UPDATE SET revenue = city_revenue.revenue + EXCLUDED.revenue;
  RETURN NULL;
END $f$;
CREATE TRIGGER orders_bump AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION bump_city();
DO $$ DECLARE t0 timestamptz; BEGIN
  t0 := clock_timestamp();
  FOR i IN 1..5000 LOOP INSERT INTO orders (city, amount) VALUES ('Delhi', 100); END LOOP;
  INSERT INTO w VALUES ('5000 INSERT, trigger ke saath', round(extract(epoch FROM clock_timestamp() - t0) * 1000));
END $$;
SELECT * FROM w;

\echo '--- ab teeno se Delhi ka jawab poocho ---'
SELECT 'asli (poori query)' AS kahan_se, sum(amount) AS delhi FROM orders WHERE city = 'Delhi'
UNION ALL SELECT 'materialized view (aakhri REFRESH wala)', revenue FROM city_revenue_mv WHERE city = 'Delhi'
UNION ALL SELECT 'summary table + trigger', revenue FROM city_revenue WHERE city = 'Delhi';
