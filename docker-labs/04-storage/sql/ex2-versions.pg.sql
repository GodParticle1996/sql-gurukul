-- ex2 · UPDATE = nayi copy. Purani copy kahan jaati hai? (Postgres MVCC)
\pset footer off
SET client_min_messages = warning;
DROP TABLE IF EXISTS accounts;
CREATE TABLE accounts (id int PRIMARY KEY, owner text, balance int) WITH (autovacuum_enabled = off);
INSERT INTO accounts SELECT g, 'user_' || g, 1000 FROM generate_series(1, 200000) g;
VACUUM ANALYZE accounts;

\echo
\echo '=== 1. Ek row ka pata (ctid = page, slot) aur use likhne wala transaction (xmin) ==='
SELECT ctid, xmin, id, balance FROM accounts WHERE id = 7;
UPDATE accounts SET balance = balance - 100 WHERE id = 7;
SELECT ctid, xmin, id, balance FROM accounts WHERE id = 7;
\echo '(ctid badal gaya = row NAYI jagah likhi gayi. Purani (0,7) wali copy abhi bhi page par padi hai — "dead".)'

CREATE TEMP TABLE r (kadam text, table_size text, live_rows bigint, dead_rows bigint);
-- n_dead_tup ka counter thodi der se update hota hai — pg_stat_force_next_flush() usse turant bhejta hai
CREATE OR REPLACE PROCEDURE snap(label text) LANGUAGE plpgsql AS $f$ BEGIN
  INSERT INTO r SELECT label, pg_size_pretty(pg_relation_size('accounts')), (SELECT count(*) FROM accounts), n_dead_tup
  FROM pg_stat_user_tables WHERE relname = 'accounts';
END $f$;
SELECT pg_stat_force_next_flush() \g /dev/null
CALL snap('0. shuru (200,000 rows)');

UPDATE accounts SET balance = balance + 1;
SELECT pg_stat_force_next_flush() \g /dev/null
CALL snap('1. sab rows UPDATE (1 baar)');
UPDATE accounts SET balance = balance + 1;
UPDATE accounts SET balance = balance + 1;
SELECT pg_stat_force_next_flush() \g /dev/null
CALL snap('2. sab rows UPDATE (3 baar)');

VACUUM accounts;
SELECT pg_stat_force_next_flush() \g /dev/null
CALL snap('3. VACUUM');

UPDATE accounts SET balance = balance + 1;
SELECT pg_stat_force_next_flush() \g /dev/null
CALL snap('4. phir se sab UPDATE');

VACUUM FULL accounts;
ANALYZE accounts;                   -- VACUUM FULL dead-counter reset nahi karta; ANALYZE naya andaaza deta hai
SELECT pg_stat_force_next_flush() \g /dev/null
CALL snap('5. VACUUM FULL (poori table dobara likhi)');

\echo
\echo '=== 2. Size ka safar ==='
SELECT * FROM r;
