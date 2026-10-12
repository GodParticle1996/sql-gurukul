-- ex1 · Notion jaise blocks: ek tree ko SQL mein kaise rakhein — adjacency list vs materialized path vs closure table
-- 200,000 blocks. Har block ka ek parent (page ke andar page ke andar toggle ke andar ...). 3 workspaces (roots).
\pset footer off
SET client_min_messages = warning;
SET max_parallel_workers_per_gather = 0;
SET jit = off;                         -- JIT ka compile time chhoti queries ki timing bigaadta hai
DROP TABLE IF EXISTS blocks, blocks_path, blocks_closure CASCADE;

-- 1) ADJACENCY LIST — har row sirf apne parent ko jaanti hai (Notion ka asli tareeka: parent_id)
CREATE TABLE blocks (id bigint PRIMARY KEY, parent_id bigint, kind text, content text);
INSERT INTO blocks
SELECT g, CASE WHEN g <= 3 THEN NULL ELSE g / 4 END,
       (ARRAY['page','text','toggle','todo'])[1 + g % 4], 'block ' || g
FROM generate_series(1, 200000) g;
CREATE INDEX blocks_parent ON blocks (parent_id);

-- 2) MATERIALIZED PATH — har row apna poora raasta rakhti hai: '1/5/21/85'
CREATE TABLE blocks_path AS
WITH RECURSIVE t(id, path) AS (
  SELECT id, id::text FROM blocks WHERE parent_id IS NULL
  UNION ALL
  SELECT b.id, t.path || '/' || b.id FROM blocks b JOIN t ON b.parent_id = t.id)
SELECT id, path FROM t;
ALTER TABLE blocks_path ADD PRIMARY KEY (id);
CREATE INDEX blocks_path_path ON blocks_path (path text_pattern_ops);   -- LIKE 'x/%' ke liye

-- 3) CLOSURE TABLE — har (ancestor, descendant) jodi ki ek row
CREATE TABLE blocks_closure AS
WITH RECURSIVE c(ancestor, descendant, depth) AS (
  SELECT id, id, 0 FROM blocks
  UNION ALL
  SELECT b.parent_id, c.descendant, c.depth + 1 FROM c JOIN blocks b ON b.id = c.ancestor WHERE b.parent_id IS NOT NULL)
SELECT * FROM c;
ALTER TABLE blocks_closure ADD PRIMARY KEY (ancestor, descendant);
CREATE INDEX blocks_closure_desc ON blocks_closure (descendant);
VACUUM ANALYZE blocks; VACUUM ANALYZE blocks_path; VACUUM ANALYZE blocks_closure;

\echo
\echo '=== 1. Teen tareeke — kitni rows, kitni jagah ==='
SELECT 'adjacency (parent_id)' AS tareeka, (SELECT count(*) FROM blocks) AS rows_, pg_size_pretty(pg_total_relation_size('blocks')) AS size_with_indexes
UNION ALL SELECT 'materialized path', (SELECT count(*) FROM blocks_path), pg_size_pretty(pg_total_relation_size('blocks_path'))
UNION ALL SELECT 'closure table', (SELECT count(*) FROM blocks_closure), pg_size_pretty(pg_total_relation_size('blocks_closure'));

CREATE OR REPLACE FUNCTION cost(q text) RETURNS TABLE (rows_mile bigint, pages_padhe bigint, ms numeric) LANGUAGE plpgsql AS $f$
DECLARE j json; BEGIN
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) ' || q INTO j;   -- ek baar garam karo
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF, FORMAT JSON) ' || q INTO j;
  RETURN QUERY SELECT (j->0->'Plan'->>'Actual Rows')::bigint,
         (j->0->'Plan'->>'Shared Hit Blocks')::bigint + (j->0->'Plan'->>'Shared Read Blocks')::bigint,
         round((j->0->>'Execution Time')::numeric, 2);
END $f$;

\echo '=== 2. Permission check: block 90000 dikhane se pehle uske saare ancestors (upar ki taraf chalo) ==='
SELECT 'adjacency + recursive CTE' AS tareeka, * FROM cost($$
  WITH RECURSIVE up AS (SELECT id, parent_id FROM blocks WHERE id = 90000
                        UNION ALL SELECT b.id, b.parent_id FROM blocks b JOIN up ON b.id = up.parent_id)
  SELECT id FROM up$$)
UNION ALL SELECT 'materialized path (1 row)', * FROM cost($$SELECT unnest(string_to_array(path, '/')) FROM blocks_path WHERE id = 90000$$)
UNION ALL SELECT 'closure table', * FROM cost($$SELECT ancestor FROM blocks_closure WHERE descendant = 90000$$);
SELECT path AS "block 90000 ka raasta" FROM blocks_path WHERE id = 90000;

\echo '=== 3. Page 5 aur uske andar sab kuch (neeche ki taraf — page export / delete / copy) ==='
SELECT 'adjacency + recursive CTE' AS tareeka, * FROM cost($$
  WITH RECURSIVE down AS (SELECT id FROM blocks WHERE id = 5
                          UNION ALL SELECT b.id FROM blocks b JOIN down ON b.parent_id = down.id)
  SELECT id FROM down$$)
UNION ALL SELECT 'materialized path LIKE', * FROM cost($$SELECT id FROM blocks_path WHERE path = '1/5' OR path LIKE '1/5/%'$$)
UNION ALL SELECT 'closure table', * FROM cost($$SELECT descendant FROM blocks_closure WHERE ancestor = 5$$);

CREATE OR REPLACE FUNCTION run(q text) RETURNS TABLE (rows_badli bigint, ms numeric) LANGUAGE plpgsql AS $f$
DECLARE t0 timestamptz := clock_timestamp(); n bigint; BEGIN
  EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n, round((extract(epoch FROM clock_timestamp() - t0) * 1000)::numeric, 1);
END $f$;

\echo '=== 4. Drag-and-drop: page 5 (poore subtree ke saath) ko workspace 1 se workspace 3 mein le jao ==='
SELECT 'adjacency: parent_id badlo' AS tareeka, * FROM run($$UPDATE blocks SET parent_id = 3 WHERE id = 5$$);
SELECT 'path: har descendant ka path' AS tareeka, * FROM run($$UPDATE blocks_path SET path = '3/5' || substr(path, 4) WHERE path = '1/5' OR path LIKE '1/5/%'$$);
BEGIN;
SELECT 'closure: purane rishte hatao' AS tareeka, * FROM run($$DELETE FROM blocks_closure
  WHERE descendant IN (SELECT descendant FROM blocks_closure WHERE ancestor = 5)
    AND ancestor NOT IN (SELECT descendant FROM blocks_closure WHERE ancestor = 5)$$);
SELECT 'closure: naye rishte jodo' AS tareeka, * FROM run($$INSERT INTO blocks_closure
  SELECT up.ancestor, down.descendant, up.depth + down.depth + 1
  FROM blocks_closure up, blocks_closure down WHERE up.descendant = 3 AND down.ancestor = 5$$);
COMMIT;
SELECT (SELECT path FROM blocks_path WHERE id = 90000) AS "90000 ka naya raasta",
       (SELECT string_agg(ancestor::text, ',' ORDER BY depth DESC) FROM blocks_closure WHERE descendant = 90000) AS "closure ke ancestors";

\echo
\echo '=== 5. Jaal: page 5 ko uske hi bachche (page 21) ke andar daal do ==='
UPDATE blocks SET parent_id = 21 WHERE id = 5;
\echo 'adjacency ne chupchaap maan liya. Ab 21 ke ancestors (bina guard ke yeh query kabhi khatam nahi hoti) — CYCLE clause ke saath:'
WITH RECURSIVE up(id, parent_id) AS (
  SELECT id, parent_id FROM blocks WHERE id = 21
  UNION ALL SELECT b.id, b.parent_id FROM blocks b JOIN up ON b.id = up.parent_id)
  CYCLE id SET chakkar USING raasta
SELECT id, parent_id, chakkar FROM up;
\echo 'Ilaaj — move se PEHLE poochho: kya naya parent mere hi subtree mein hai?'
SELECT EXISTS (SELECT 1 FROM blocks_closure WHERE ancestor = 5 AND descendant = 21) AS "closure: 21 page 5 ke andar hai?",
       (SELECT path FROM blocks_path WHERE id = 21) LIKE (SELECT path FROM blocks_path WHERE id = 5) || '/%' AS "path: 21 page 5 ke andar hai?";
UPDATE blocks SET parent_id = 3 WHERE id = 5;   -- wapas theek
