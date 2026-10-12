-- ex1 · "data kahan NAHI hai" — min/max pruning (Snowflake micro-partitions jaisa) aur chaudi rows
-- 5,000,000 orders. Ek table time ke kram mein likhi (jaise asli app likhti hai), ek bilkul shuffled.
\pset footer off
SET client_min_messages = warning;
SET max_parallel_workers_per_gather = 0;
DROP TABLE IF EXISTS orders_ordered, orders_shuffled, orders_wide, orders_narrow CASCADE;

CREATE TABLE orders_ordered AS
SELECT g AS id, '2025-01-01'::timestamptz + g * interval '6.3 seconds' AS created, (random()*5000)::int AS amount
FROM generate_series(1, 5000000) g;
CREATE TABLE orders_shuffled AS SELECT * FROM orders_ordered ORDER BY random();

CREATE INDEX o_ord_brin  ON orders_ordered  USING brin (created);
CREATE INDEX o_ord_btree ON orders_ordered  (created);
CREATE INDEX o_shf_brin  ON orders_shuffled USING brin (created);
ANALYZE orders_ordered; ANALYZE orders_shuffled;

\echo
\echo '=== 1. Index ka size — BRIN har 128 pages (1 MB) ka sirf MIN aur MAX yaad rakhta hai ==='
SELECT 'table (5M rows)' AS cheez, pg_size_pretty(pg_relation_size('orders_ordered')) AS size
UNION ALL SELECT 'B-tree index', pg_size_pretty(pg_relation_size('o_ord_btree'))
UNION ALL SELECT 'BRIN index',   pg_size_pretty(pg_relation_size('o_ord_brin'));

CREATE OR REPLACE FUNCTION pages(q text) RETURNS TABLE (plan text, pages_padhe bigint, ms numeric) LANGUAGE plpgsql AS $f$
DECLARE j json; BEGIN
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' || q INTO j;
  RETURN QUERY
  WITH RECURSIVE n(node) AS (SELECT j->0->'Plan' UNION ALL SELECT c FROM n, json_array_elements(n.node->'Plans') c)
  SELECT (SELECT string_agg(DISTINCT node->>'Node Type', ' + ') FROM n WHERE node->>'Node Type' LIKE '%Scan%'),
         (j->0->'Plan'->>'Shared Hit Blocks')::bigint + (j->0->'Plan'->>'Shared Read Blocks')::bigint,
         round((j->0->>'Execution Time')::numeric, 1);
END $f$;

\echo '=== 2. Ek din (3 March) ki bikri — kitne 8 kB pages padhne pade? ==='
SET enable_indexscan = off;   -- B-tree ko hata ke BRIN ka kaam alag dikhao
SELECT 'ordered  + BRIN'  AS table_, * FROM pages($$SELECT sum(amount) FROM orders_ordered  WHERE created >= '2025-03-03' AND created < '2025-03-04'$$)
UNION ALL
SELECT 'shuffled + BRIN', * FROM pages($$SELECT sum(amount) FROM orders_shuffled WHERE created >= '2025-03-03' AND created < '2025-03-04'$$);
RESET enable_indexscan;
SET enable_bitmapscan = off;
SELECT 'ordered  + B-tree' AS table_, * FROM pages($$SELECT sum(amount) FROM orders_ordered WHERE created >= '2025-03-03' AND created < '2025-03-04'$$);
RESET enable_bitmapscan;

\echo '=== 3. BRIN andar kya rakhta hai? Har 128 pages ka MIN aur MAX (yahan haath se nikaala, pehli 3 ranges) ==='
SELECT (ctid::text::point)[0]::int / 128 AS range_no, min(created)::date AS min, max(created)::date AS max
FROM orders_ordered WHERE (ctid::text::point)[0] < 384 GROUP BY 1 ORDER BY 1;
SELECT (ctid::text::point)[0]::int / 128 AS range_no, min(created)::date AS min_shuffled, max(created)::date AS max_shuffled
FROM orders_shuffled WHERE (ctid::text::point)[0] < 384 GROUP BY 1 ORDER BY 1;

\echo
\echo '=== 4. Chaudi row (22 columns) vs patli row (2 columns) — sawaal sirf sum(amount) ==='
CREATE TABLE orders_narrow AS SELECT id, amount FROM orders_ordered WHERE id <= 200000;
DO $$ DECLARE cols text; BEGIN
  -- 20 bekaar text columns (address, notes, device info...) + id + amount = row store ki asli tasveer
  SELECT string_agg(format('md5(id::text || %s) AS c%s', i, i), ', ') INTO cols FROM generate_series(1, 20) i;
  EXECUTE 'CREATE TABLE orders_wide AS SELECT id, amount, ' || cols || ' FROM orders_ordered WHERE id <= 200000';
END $$;
VACUUM ANALYZE orders_narrow; VACUUM ANALYZE orders_wide;
SELECT 'wide (22 col)' AS table_, pg_size_pretty(pg_relation_size('orders_wide')) AS size, * FROM pages('SELECT sum(amount) FROM orders_wide')
UNION ALL
SELECT 'narrow (2 col)', pg_size_pretty(pg_relation_size('orders_narrow')), * FROM pages('SELECT sum(amount) FROM orders_narrow');
