-- ex2 · Har shard apni ID banaye — par poori duniya mein unique, aur time ke kram mein.
-- Instagram ka asli function (2012 blog): 64 bit = 41 bit time (ms) | 13 bit shard | 10 bit sequence
\pset footer off
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS s5 CASCADE; DROP SCHEMA IF EXISTS s6 CASCADE; DROP SCHEMA IF EXISTS s7 CASCADE;
DROP TABLE IF EXISTS ids_a, ids_b, ids_small, t_bigint, t_uuid;
CREATE SCHEMA s5; CREATE SCHEMA s6; CREATE SCHEMA s7;

DROP FUNCTION IF EXISTS make_id_fn(int); DROP FUNCTION IF EXISTS make_id_fn(int, int);
CREATE FUNCTION make_id_fn(shard int, seq_bits int DEFAULT 10) RETURNS void LANGUAGE plpgsql AS $mk$ BEGIN
  EXECUTE format('CREATE SEQUENCE s%s.id_seq', shard);
  EXECUTE format($f$
    CREATE FUNCTION s%1$s.next_id(OUT result bigint) LANGUAGE plpgsql AS $b$
    DECLARE
      our_epoch  bigint := 1314220021721;       -- Instagram ka "zero" (Aug 2011), ms mein
      seq_id     bigint;
      now_millis bigint;
      shard_id   int    := %1$s;
    BEGIN
      SELECT nextval('s%1$s.id_seq') %% (1 << %2$s) INTO seq_id;
      SELECT floor(extract(epoch FROM clock_timestamp()) * 1000) INTO now_millis;
      result := (now_millis - our_epoch) << 23;    -- 41 bit: time
      result := result | (shard_id << %2$s);       -- 13 bit: shard (8192 tak)
      result := result | (seq_id);                 -- 10 bit: us ms mein kaunsa number (1024 tak)
    END $b$ $f$, shard, seq_bits);
END $mk$;
-- s7: sirf 2 bit sequence (4 per ms) — section 3 ke liye
SELECT make_id_fn(5), make_id_fn(6), make_id_fn(7, 2) \g /dev/null

\echo '=== 1. Ek ID kholo ==='
SELECT id, id >> 23 AS ms_since_epoch,
       to_timestamp(((id >> 23) + 1314220021721) / 1000.0) AT TIME ZONE 'UTC' AS kab_bani_utc,
       (id >> 10) & 8191 AS shard, id & 1023 AS seq
FROM (SELECT s5.next_id() AS id) x;

\echo '=== 2. Do shards, 50,000 IDs har ek — koi takraav? (bigserial se tulna) ==='
CREATE TABLE ids_a AS SELECT s5.next_id() AS instagram_id, g AS serial_id FROM generate_series(1, 50000) g;
CREATE TABLE ids_b AS SELECT s6.next_id() AS instagram_id, g AS serial_id FROM generate_series(1, 50000) g;
SELECT 'har shard ka apna bigserial' AS tareeka, count(*) AS takraav FROM ids_a a JOIN ids_b b USING (serial_id)
UNION ALL
SELECT 'Instagram id (shard bits andar)', count(*) FROM ids_a a JOIN ids_b b USING (instagram_id)
UNION ALL
SELECT 'ek hi shard ke andar duplicate?', count(*) - count(DISTINCT instagram_id) FROM ids_a
ORDER BY 2 DESC;

\echo '=== 3. 1 ms mein kitni IDs bani? (limit: 1024 per ms per shard) ==='
SELECT max(n) AS ek_ms_mein_sabse_zyada FROM (SELECT instagram_id >> 23 AS ms, count(*) AS n FROM ids_a GROUP BY 1) x;
\echo '--- agar sequence ko sirf 2 bit diye hote (4 per ms)? ---'
CREATE TABLE ids_small AS SELECT s7.next_id() AS id FROM generate_series(1, 50000) g;
SELECT count(*) AS ids_bani, count(DISTINCT id) AS unique_ids, count(*) - count(DISTINCT id) AS duplicate FROM ids_small;

\echo
\echo '=== 4. bigint (time-ordered) vs UUID v4 (random) — 1,000,000 rows PRIMARY KEY ==='
CREATE TABLE t_bigint (id bigint PRIMARY KEY, v int);
CREATE TABLE t_uuid   (id uuid   PRIMARY KEY, v int);
\timing on
INSERT INTO t_bigint SELECT (g::bigint << 23) | (5 << 10), g FROM generate_series(1, 1000000) g;
INSERT INTO t_uuid   SELECT gen_random_uuid(), g FROM generate_series(1, 1000000) g;
\timing off
SELECT 'bigint (Instagram jaisa)' AS pk, pg_size_pretty(pg_relation_size('t_bigint_pkey')) AS index_size
UNION ALL SELECT 'uuid v4', pg_size_pretty(pg_relation_size('t_uuid_pkey'));

\echo '=== 5. "Naye 20 posts" — ID khud time hai, toh alag timestamp index nahi chahiye ==='
EXPLAIN (COSTS OFF) SELECT * FROM t_bigint ORDER BY id DESC LIMIT 20;
