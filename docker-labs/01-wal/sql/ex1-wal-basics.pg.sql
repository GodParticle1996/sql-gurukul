-- ex1 · WAL kitna likha gaya? (Postgres)
-- Har change pehle WAL mein jaata hai. pg_current_wal_lsn() = WAL mein abhi ki position.
\pset footer off
SET client_min_messages = warning;
DROP TABLE IF EXISTS w0, w1, w5;
CREATE TABLE w0 (id int, email text, name text, city text, amount int, note text);
CREATE TABLE w1 (LIKE w0);  CREATE INDEX ON w1 (email);
CREATE TABLE w5 (LIKE w0);  CREATE INDEX ON w5 (email); CREATE INDEX ON w5 (name);
CREATE INDEX ON w5 (city); CREATE INDEX ON w5 (amount); CREATE INDEX ON w5 (note);
CHECKPOINT;

CREATE TEMP TABLE lsn (step text, at pg_lsn);
INSERT INTO lsn VALUES ('start', pg_current_wal_lsn());
INSERT INTO w0 SELECT g, 'u'||g||'@kk.in', 'name '||g, 'city '||(g%50), g%1000, md5(g::text) FROM generate_series(1,50000) g;
INSERT INTO lsn VALUES ('0 index', pg_current_wal_lsn());
INSERT INTO w1 SELECT g, 'u'||g||'@kk.in', 'name '||g, 'city '||(g%50), g%1000, md5(g::text) FROM generate_series(1,50000) g;
INSERT INTO lsn VALUES ('1 index', pg_current_wal_lsn());
INSERT INTO w5 SELECT g, 'u'||g||'@kk.in', 'name '||g, 'city '||(g%50), g%1000, md5(g::text) FROM generate_series(1,50000) g;
INSERT INTO lsn VALUES ('5 index', pg_current_wal_lsn());

\echo '50,000 rows har table mein — WAL kitna bana:'
SELECT step AS "table", pg_size_pretty(pg_wal_lsn_diff(at, lag(at) OVER (ORDER BY at))) AS wal_likha
FROM lsn ORDER BY at OFFSET 1;

\echo 'Ek UPDATE ka WAL record (sirf badlaav, poori row nahi):'
INSERT INTO lsn VALUES ('before-update', pg_current_wal_lsn());
UPDATE w0 SET email = 'd2@kk.in' WHERE id = 38;
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), (SELECT at FROM lsn WHERE step='before-update'))) AS "1 row update ka WAL";
