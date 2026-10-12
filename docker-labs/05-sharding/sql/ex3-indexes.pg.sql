-- ex3 · Instagram ke do chhote Postgres hathiyaar: partial index aur expression (functional) index
\pset footer off
SET client_min_messages = warning;
SET timezone = 'UTC';
DROP TABLE IF EXISTS photos;
-- 2,000,000 photos, 2 saal (2024-2025), 100,000 users. token = 64 character ka (jaise share link)
CREATE TABLE photos AS
SELECT g AS id, (random() * 99999 + 1)::int AS user_id,
       '2024-01-01'::timestamptz + (g / 2000000.0) * interval '730 days' AS created,
       md5(g::text) || md5((g * 7)::text) AS token
FROM generate_series(1, 2000000) g;
ALTER TABLE photos ADD PRIMARY KEY (id);

\echo '=== 1. Feed sirf pichhle 30 din ki photos maangti hai. Poora index ya sirf 30 din ka? ==='
CREATE INDEX photos_user_all    ON photos (user_id, created);
CREATE INDEX photos_user_recent ON photos (user_id, created) WHERE created >= '2025-12-01';
ANALYZE photos;
SELECT 'poora index (2 saal)' AS index_, pg_size_pretty(pg_relation_size('photos_user_all')) AS size
UNION ALL SELECT 'partial (WHERE created >= 1 Dec 2025)', pg_size_pretty(pg_relation_size('photos_user_recent'));
EXPLAIN (COSTS OFF) SELECT id FROM photos WHERE user_id = 42 AND created >= '2025-12-05' ORDER BY created DESC;
\echo '(WHERE mein likhi date partial index ki date ke ANDAR honi chahiye — tabhi planner use chunega.)'
EXPLAIN (COSTS OFF) SELECT id FROM photos WHERE user_id = 42 AND created >= '2025-06-01';
\echo '(Partial index ki shart "now() - 30 days" nahi ho sakti — sirf fixed date. Isliye har mahine naya partial index banao, purana DROP.)'

\echo
\echo '=== 2. Token 64 character ka. Index poore token par ya pehle 8 character par? ==='
CREATE INDEX photos_token_full ON photos (token);
CREATE INDEX photos_token_8    ON photos (left(token, 8));
ANALYZE photos;
SELECT 'poora token (64 char)' AS index_, pg_size_pretty(pg_relation_size('photos_token_full')) AS size
UNION ALL SELECT 'left(token, 8)', pg_size_pretty(pg_relation_size('photos_token_8'));
DROP INDEX photos_token_full;
\echo '--- query ko WAHI expression likhna padta hai, aur poore token se pakka match ---'
SELECT token AS ek_token FROM photos WHERE id = 777 \gset
EXPLAIN (COSTS OFF) SELECT id FROM photos WHERE left(token, 8) = left(:'ek_token', 8) AND token = :'ek_token';
SELECT count(*) AS left8_same_wali_rows FROM photos WHERE left(token, 8) = left(:'ek_token', 8);
