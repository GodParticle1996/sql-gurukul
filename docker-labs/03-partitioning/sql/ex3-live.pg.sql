-- ex3 · chalti hui badi table ko partition karo — bina app roke
-- daily_totals: 2019 se June 2025 tak, har din 1000 locations = 2,375,000 rows
\pset footer off
SET client_min_messages = warning;
DROP TABLE IF EXISTS daily_totals, daily_totals_legacy, daily_totals_2025_06, daily_totals_2025_07 CASCADE;
CREATE TABLE daily_totals (id bigserial PRIMARY KEY, total_date date NOT NULL, location_id int, total numeric(12,2));
INSERT INTO daily_totals (total_date, location_id, total)
SELECT d::date, l, round((random() * 100000)::numeric, 2)
FROM generate_series('2019-01-01'::date, '2025-06-30'::date, interval '1 day') d, generate_series(1, 1000) l;
CREATE INDEX daily_totals_date_idx ON daily_totals (total_date);
CREATE INDEX daily_totals_loc_idx  ON daily_totals (location_id);
ANALYZE daily_totals;
SELECT pg_size_pretty(pg_total_relation_size('daily_totals')) AS legacy_size \gset
\echo 'Legacy table:' :legacy_size

-- Teeno plan ek hi recipe hain, farak sirf "ATTACH se pehle kya kiya" mein:
--   rename → naya partitioned parent → indexes parent par → naye mahine ka partition → legacy ATTACH
-- Har plan BEGIN ... ROLLBACK mein chalta hai (Postgres mein DDL bhi rollback hota hai!) — table wapas jaisi thi.
CREATE OR REPLACE FUNCTION live_plan(mode text) RETURNS numeric LANGUAGE plpgsql AS $f$
DECLARE t0 timestamptz := clock_timestamp(); earliest date; BEGIN
  ALTER TABLE daily_totals RENAME TO daily_totals_legacy;
  ALTER INDEX daily_totals_date_idx RENAME TO daily_totals_legacy_date_idx;
  ALTER INDEX daily_totals_loc_idx  RENAME TO daily_totals_legacy_loc_idx;
  ALTER INDEX daily_totals_pkey     RENAME TO daily_totals_legacy_pkey;
  CREATE TABLE daily_totals (LIKE daily_totals_legacy INCLUDING DEFAULTS) PARTITION BY RANGE (total_date);
  CREATE INDEX daily_totals_date_idx ON daily_totals (total_date);
  CREATE INDEX daily_totals_loc_idx  ON daily_totals (location_id);
  CREATE TABLE daily_totals_2025_07 PARTITION OF daily_totals FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
  -- parent par PRIMARY KEY nahi: partitioned table ka PK (id, total_date) hona padta (ex2, jaal 2),
  -- aur legacy par waisa unique index banana = ek aur poora scan. Legacy apna (id) PK rakhti hai.
  SELECT min(total_date) INTO earliest FROM daily_totals_legacy;   -- index se, turant

  IF mode = 'hack' THEN
    EXECUTE format('ALTER TABLE daily_totals_legacy ADD CONSTRAINT legacy_range
                    CHECK (total_date >= %L AND total_date < %L) NOT VALID', earliest, '2025-07-01');
    UPDATE pg_constraint SET convalidated = true WHERE conname = 'legacy_range';  -- "main guarantee deta hoon"
  END IF;
  -- mode 'validated': legacy_range pehle hi (app chalte hue) validate ho chuka hai — rename ke saath aa gaya

  EXECUTE format('ALTER TABLE daily_totals ATTACH PARTITION daily_totals_legacy FOR VALUES FROM (%L) TO (%L)',
                 earliest, '2025-07-01');
  RETURN round(extract(epoch FROM clock_timestamp() - t0) * 1000);
END $f$;

BEGIN; SELECT live_plan('naive') AS naive_ms \gset
ROLLBACK;
BEGIN; SELECT live_plan('hack')  AS hack_ms  \gset
ROLLBACK;

-- Tareeka 2: scan ko rename-transaction se BAHAR nikaalo. Pehle constraint NOT VALID (instant),
-- phir VALIDATE — yeh poori table padhta hai par halka lock leta hai: app ke INSERT/UPDATE chalte rehte hain.
ALTER TABLE daily_totals ADD CONSTRAINT legacy_range CHECK (total_date >= '2019-01-01' AND total_date < '2025-07-01') NOT VALID;
BEGIN;
SELECT clock_timestamp() AS t0 \gset
ALTER TABLE daily_totals VALIDATE CONSTRAINT legacy_range;
SELECT round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000) AS validate_ms \gset
SELECT mode AS validate_ke_dauraan_lock FROM pg_locks WHERE relation = 'daily_totals'::regclass AND granted;
COMMIT;
BEGIN; SELECT live_plan('validated') AS validated_ms \gset
SELECT mode AS rename_attach_ke_dauraan_lock FROM pg_locks WHERE relation = 'daily_totals_legacy'::regclass AND granted AND mode = 'AccessExclusiveLock';
COMMIT;

\echo
\echo '=== ATTACH ke teen tareeke ==='
SELECT * FROM (VALUES
  ('1. seedha ATTACH (scan rename-transaction ke andar)',     :naive_ms::numeric, 0::numeric),
  ('2. pehle NOT VALID + VALIDATE (app chalu), phir ATTACH',  :validated_ms,      :validate_ms),
  ('3. NOT VALID + pg_constraint hack, phir ATTACH (video)',  :hack_ms,           0)
) v(tareeka, app_ruki_ms, background_scan_ms);

\echo '=== ab table ka haal ==='
SELECT tableoid::regclass AS partition, count(*) AS rows, min(total_date), max(total_date)
FROM daily_totals GROUP BY 1 ORDER BY 3;

\echo
\echo '=== Video ka aakhri step: "legacy se DELETE ... RETURNING, naye table mein INSERT" — June 2025 ==='
CREATE TABLE daily_totals_2025_06 (LIKE daily_totals_legacy);
\echo 'June ka partition banao — par legacy June ko pehle se "own" karti hai:'
ALTER TABLE daily_totals ATTACH PARTITION daily_totals_2025_06 FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
DROP TABLE daily_totals_2025_06;
\echo 'Partition ke bina seedha move karo toh? Rows wapas legacy mein hi gir-ti hain:'
WITH moved AS (DELETE FROM daily_totals_legacy WHERE total_date >= '2025-06-01' RETURNING *)
INSERT INTO daily_totals SELECT * FROM moved;
SELECT tableoid::regclass AS june_ki_rows_kahan, count(*) FROM daily_totals WHERE total_date >= '2025-06-01' AND total_date < '2025-07-01' GROUP BY 1;

\echo
\echo '=== Sahi batch (ek transaction): legacy DETACH → June partition → move → legacy chhoti range se wapas ATTACH ==='
BEGIN;
SELECT clock_timestamp() AS t0 \gset
ALTER TABLE daily_totals DETACH PARTITION daily_totals_legacy;
CREATE TABLE daily_totals_2025_06 PARTITION OF daily_totals FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
WITH moved AS (DELETE FROM daily_totals_legacy WHERE total_date >= '2025-06-01' RETURNING *)
INSERT INTO daily_totals SELECT * FROM moved;
ALTER TABLE daily_totals_legacy DROP CONSTRAINT legacy_range;
ALTER TABLE daily_totals_legacy ADD CONSTRAINT legacy_range CHECK (total_date >= '2019-01-01' AND total_date < '2025-06-01') NOT VALID;
UPDATE pg_constraint SET convalidated = true WHERE conname = 'legacy_range';   -- abhi June DELETE kiya, toh sach hai
ALTER TABLE daily_totals ATTACH PARTITION daily_totals_legacy FOR VALUES FROM ('2019-01-01') TO ('2025-06-01');
SELECT round(extract(epoch FROM clock_timestamp() - :'t0'::timestamptz) * 1000) AS batch_ms \gset
COMMIT;
\echo 'Ek mahine ka batch:' :batch_ms 'ms'
SELECT tableoid::regclass AS partition, count(*) AS rows, min(total_date), max(total_date)
FROM daily_totals GROUP BY 1 ORDER BY 3;
