#!/usr/bin/env bash
# ex1 · Instagram ka tareeka: 8 LOGICAL shards (schemas), shuru mein sab ek machine par.
#       Machine bhar gayi → aadhe logical shards doosri machine par, sirf mapping badli.
#   ./scripts/shards.sh
cd "$(dirname "$0")/.." && source scripts/lib.sh
SHARDS=8

echo "=================== POSTGRES (logical shard = schema) ==================="
pga "SET client_min_messages=warning" "DROP TABLE IF EXISTS shard_map" \
    "CREATE TABLE shard_map (logical int PRIMARY KEY, node text)" \
    "INSERT INTO shard_map SELECT g, 'A' FROM generate_series(0, $((SHARDS-1))) g" >/dev/null
for s in $(seq 0 $((SHARDS-1))); do
  pga "SET client_min_messages=warning" "DROP SCHEMA IF EXISTS shard_$s CASCADE" >/dev/null
  pgb "SET client_min_messages=warning" "DROP SCHEMA IF EXISTS shard_$s CASCADE" >/dev/null
  pga "CREATE SCHEMA shard_$s" \
      "CREATE TABLE shard_$s.photos (id bigint PRIMARY KEY, user_id int, caption text, created timestamptz DEFAULT now())" \
      "CREATE INDEX ON shard_$s.photos (user_id)" \
      "INSERT INTO shard_$s.photos (id, user_id, caption)
         SELECT u * 100 + p, u, 'photo ' || p FROM generate_series(1, 10000) u, generate_series(1, 8) p WHERE u % $SHARDS = $s" >/dev/null
done
echo "10,000 users × 8 photos. Shard = user_id % $SHARDS"
echo "Node A par:  $(pga "SELECT count(*) FROM pg_namespace WHERE nspname LIKE 'shard_%'") shards, $(pga "SELECT sum(n_live_tup) FROM pg_stat_user_tables WHERE schemaname LIKE 'shard_%'") photos"

# app ka routing: user → logical shard → mapping se node → us node ka schema
photos_of() {
  local uid=$1 s=$(( $1 % SHARDS )) node
  node=$(pga "SELECT node FROM shard_map WHERE logical = $s")
  local q="SELECT count(*) FROM shard_$s.photos WHERE user_id = $uid"
  if [ "$node" = A ]; then echo "user $uid → shard_$s → node $node → $(pga "$q") photos"; else echo "user $uid → shard_$s → node $node → $(pgb "$q") photos"; fi
}
echo
echo "--- ek user ki profile: sirf EK shard ---"
photos_of 12
echo "--- feed: 200 followed users ki photos ---"
pga "SELECT count(DISTINCT u % $SHARDS) FROM (SELECT (random() * 9999 + 1)::int AS u FROM generate_series(1, 200)) f" \
  | xargs -I{} echo "200 users → {} alag shards (sabse poochna padega, aur sabse dheema shard poori feed ko dheema karega)"

echo
echo "--- Node A 95% bhar gaya. Shards 4-7 node B par bhejo ---"
t0=$(date +%s%N)
for s in 4 5 6 7; do pg_move_schema shard_$s; done
t1=$(date +%s%N)
echo "pg_dump | psql — 4 schemas node B par ($(( (t1 - t0) / 1000000 )) ms)"
pga "UPDATE shard_map SET node = 'B' WHERE logical >= 4" >/dev/null
for s in 4 5 6 7; do pga "DROP SCHEMA shard_$s CASCADE" >/dev/null 2>&1; done
cnt="SELECT count(*) || ' schemas, ' || (SELECT sum(n_live_tup) FROM pg_stat_user_tables WHERE schemaname LIKE 'shard_%') || ' photos' FROM pg_namespace WHERE nspname LIKE 'shard_%'"
pgb "ANALYZE" >/dev/null
echo "Node A: $(pga "$cnt")   |   Node B: $(pgb "$cnt")"
echo "Mapping: $(pga "SELECT string_agg(logical || '→' || node, '  ' ORDER BY logical) FROM shard_map")"
echo "--- App ka code wahi. Wahi function: ---"
photos_of 12
photos_of 9

echo
echo "=================== MYSQL (logical shard = database) ==================="
mya "DROP TABLE IF EXISTS lab.shard_map; CREATE TABLE lab.shard_map (logical int PRIMARY KEY, node char(1));
     INSERT INTO lab.shard_map WITH RECURSIVE g(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM g WHERE n < $((SHARDS-1))) SELECT n, 'A' FROM g;"
for s in $(seq 0 $((SHARDS-1))); do
  myb "DROP DATABASE IF EXISTS shard_$s"
  mya "DROP DATABASE IF EXISTS shard_$s; CREATE DATABASE shard_$s;
       CREATE TABLE shard_$s.photos (id bigint PRIMARY KEY, user_id int, caption varchar(20), KEY (user_id));
       SET SESSION cte_max_recursion_depth = 10000;
       INSERT INTO shard_$s.photos
         WITH RECURSIVE u(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM u WHERE n < 10000),
                        p(k) AS (SELECT 1 UNION ALL SELECT k + 1 FROM p WHERE k < 8)
         SELECT n * 100 + k, n, CONCAT('photo ', k) FROM u, p WHERE n % $SHARDS = $s;"
done
echo "Node A par: $(mya "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'shard\_%'") shard databases"
my_photos_of() {
  local uid=$1 s=$(( $1 % SHARDS )) node
  node=$(mya "SELECT node FROM lab.shard_map WHERE logical = $s")
  local q="SELECT COUNT(*) FROM shard_$s.photos WHERE user_id = $uid"
  if [ "$node" = A ]; then echo "user $uid → shard_$s → node $node → $(mya "$q") photos"; else echo "user $uid → shard_$s → node $node → $(myb "$q") photos"; fi
}
my_photos_of 12
t0=$(date +%s%N)
for s in 4 5 6 7; do my_move_db shard_$s; done
t1=$(date +%s%N)
echo "Shards 4-7 node B par (mysqldump, $(( (t1 - t0) / 1000000 )) ms): $(myb "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'shard\_%'") databases"
mya "UPDATE lab.shard_map SET node = 'B' WHERE logical >= 4; DROP DATABASE shard_4; DROP DATABASE shard_5; DROP DATABASE shard_6; DROP DATABASE shard_7;"
echo "Mapping: $(mya "SELECT GROUP_CONCAT(CONCAT(logical, '→', node) ORDER BY logical SEPARATOR '  ') FROM lab.shard_map")"
my_photos_of 12
my_photos_of 9
