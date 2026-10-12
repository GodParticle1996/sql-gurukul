-- ex3 · restart ke baad: kitne committed rows bache? table theek hai?
\pset footer off
SELECT count(*) AS rows_bache, max(id) AS aakhri_id FROM orders_log;
SELECT count(*) - count(DISTINCT id) AS duplicate_ids FROM orders_log;
