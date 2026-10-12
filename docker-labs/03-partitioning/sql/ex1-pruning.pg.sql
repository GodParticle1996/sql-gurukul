-- ex1 · pruning aur retention — ek hi data, do tables
-- 2,000,000 sensor readings, poora 2025 (har 15.8 second ek reading)
\pset footer off
SET client_min_messages = warning;
SET timezone = 'UTC';          -- partition boundaries UTC midnight par
DROP TABLE IF EXISTS readings_flat, readings CASCADE;

CREATE TABLE readings_flat (sensor_id int, ts timestamptz, temp numeric(5,2));
INSERT INTO readings_flat
SELECT (random()*999)::int, '2025-01-01'::timestamptz + g * interval '15.768 seconds', 20 + random()*15
FROM generate_series(0, 1999999) g;
CREATE INDEX readings_flat_ts ON readings_flat (ts);

CREATE TABLE readings (sensor_id int, ts timestamptz, temp numeric(5,2)) PARTITION BY RANGE (ts);
DO $$ BEGIN
  FOR m IN 1..12 LOOP
    EXECUTE format('CREATE TABLE readings_2025_%s PARTITION OF readings FOR VALUES FROM (%L) TO (%L)',
      lpad(m::text, 2, '0'), make_date(2025, m, 1), make_date(2025, m, 1) + interval '1 month');
  END LOOP;
END $$;
INSERT INTO readings SELECT * FROM readings_flat;
CREATE INDEX readings_ts ON readings (ts);   -- parent par index = har partition par apne aap
ANALYZE readings_flat; ANALYZE readings;

SET max_parallel_workers_per_gather = 0;   -- saaf numbers ke liye ek hi worker

-- plan_info(query): EXPLAIN ANALYZE chala ke batao — kitne partitions padhe, kitne 8 kB pages, kitna time
CREATE OR REPLACE FUNCTION plan_info(q text)
RETURNS TABLE (partitions_padhe int, kaunse text, pages_padhe bigint, ms numeric) LANGUAGE plpgsql AS $f$
DECLARE j json; BEGIN
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' || q INTO j;
  RETURN QUERY
  WITH RECURSIVE n(node) AS (SELECT j->0->'Plan' UNION ALL SELECT c FROM n, json_array_elements(n.node->'Plans') c),
       rels AS (SELECT DISTINCT node->>'Relation Name' AS r FROM n WHERE node->>'Relation Name' LIKE 'readings%')
  SELECT (SELECT count(*) FROM rels)::int,
         (SELECT CASE WHEN count(*) > 2 THEN 'sab ' || count(*) ELSE string_agg(r, ', ') END FROM rels),
         ((j->0->'Plan'->>'Shared Hit Blocks')::bigint + (j->0->'Plan'->>'Shared Read Blocks')::bigint),
         round((j->0->>'Execution Time')::numeric, 1);
END $f$;

\echo
\echo '=== 1. March ki average temperature — partitioned table ka plan ==='
EXPLAIN (COSTS OFF) SELECT avg(temp) FROM readings WHERE ts >= '2025-03-01' AND ts < '2025-04-01';

\echo '=== 2. Chaar sawaal, do tables ==='
SELECT 'March avg        | flat'        AS sawaal, * FROM plan_info($$SELECT avg(temp) FROM readings_flat WHERE ts >= '2025-03-01' AND ts < '2025-04-01'$$)
UNION ALL
SELECT 'March avg        | partitioned', * FROM plan_info($$SELECT avg(temp) FROM readings WHERE ts >= '2025-03-01' AND ts < '2025-04-01'$$)
UNION ALL
SELECT 'date_trunc March | partitioned', * FROM plan_info($$SELECT avg(temp) FROM readings WHERE date_trunc('month', ts) = '2025-03-01'$$)
UNION ALL
SELECT 'sensor_id = 42   | partitioned', * FROM plan_info($$SELECT avg(temp) FROM readings WHERE sensor_id = 42$$);

\echo '=== 3. Retention: January ka data hatao ==='
CREATE TEMP TABLE r (tareeka text, ms numeric, wal_bana text, table_size_baad text);
DO $$ DECLARE t0 timestamptz; l0 pg_lsn; BEGIN
  INSERT INTO r VALUES ('(pehle) flat table ka size', NULL, NULL, pg_size_pretty(pg_total_relation_size('readings_flat')));
  t0 := clock_timestamp(); l0 := pg_current_wal_insert_lsn();
  DELETE FROM readings_flat WHERE ts < '2025-02-01';
  INSERT INTO r VALUES ('flat: DELETE WHERE ts < Feb',
    round(extract(epoch FROM clock_timestamp() - t0) * 1000),
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_insert_lsn(), l0)),
    pg_size_pretty(pg_total_relation_size('readings_flat')));

  t0 := clock_timestamp(); l0 := pg_current_wal_insert_lsn();
  ALTER TABLE readings DETACH PARTITION readings_2025_01;
  DROP TABLE readings_2025_01;
  INSERT INTO r VALUES ('partitioned: DETACH + DROP',
    round(extract(epoch FROM clock_timestamp() - t0) * 1000),
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_insert_lsn(), l0)),
    pg_size_pretty(pg_total_relation_size('readings')
      + (SELECT sum(pg_total_relation_size(inhrelid)) FROM pg_inherits WHERE inhparent = 'readings'::regclass)));
END $$;
SELECT * FROM r;
