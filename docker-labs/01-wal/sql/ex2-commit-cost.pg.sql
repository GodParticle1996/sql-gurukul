-- ex2 · Har COMMIT ka kharcha: WAL ko disk par pakka karna (fsync)
-- synchronous_commit = on  : COMMIT tabhi "ho gaya" jab WAL disk par flush ho jaaye
-- synchronous_commit = off : COMMIT turant — WAL thodi der baad flush (crash par aakhri ~kuch sau ms ke commits ja sakte hain)
SET client_min_messages = warning;
\pset footer off
DROP TABLE IF EXISTS c;
CREATE TABLE c (id int, at timestamptz);
CREATE OR REPLACE PROCEDURE ins(n int) LANGUAGE plpgsql AS $$
BEGIN
  FOR i IN 1..n LOOP INSERT INTO c VALUES (i, now()); COMMIT; END LOOP;   -- har row ek alag transaction
END $$;
CREATE TEMP TABLE t (mode text, ms numeric);

SET synchronous_commit = on;
SELECT clock_timestamp() AS s \gset
CALL ins(5000);
INSERT INTO t SELECT 'synchronous_commit=on',  round(extract(epoch FROM clock_timestamp() - :'s'::timestamptz)*1000);

SET synchronous_commit = off;
SELECT clock_timestamp() AS s \gset
CALL ins(5000);
INSERT INTO t SELECT 'synchronous_commit=off', round(extract(epoch FROM clock_timestamp() - :'s'::timestamptz)*1000);

\echo '5,000 alag-alag commits:'
SELECT mode, ms AS total_ms, round(5000 / (ms/1000.0)) AS commits_per_sec FROM t;
