-- ex2 · partition key ke 5 jaal — har jaal ka ERROR khud dekho
\pset footer off
SET client_min_messages = warning;
DROP TABLE IF EXISTS orders, t_multi, t_sub, orders_by_status, orders_by_customer CASCADE;

CREATE TABLE orders (id bigint, created date, status text, amount int) PARTITION BY RANGE (created);
CREATE TABLE orders_2025_01 PARTITION OF orders FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

\echo
\echo '--- JAAL 1: aisi row jiska koi partition nahi (Feb, par sirf Jan bana hai) ---'
INSERT INTO orders VALUES (1, '2025-02-15', 'new', 100);

\echo '--- ilaaj? DEFAULT partition bana do ---'
CREATE TABLE orders_default PARTITION OF orders DEFAULT;
INSERT INTO orders VALUES (1, '2025-02-15', 'new', 100);
SELECT tableoid::regclass AS kahan_gayi, id, created FROM orders;

\echo '--- ...par ab Feb ka partition banao — DEFAULT mein Feb ki row pehle se baithi hai ---'
CREATE TABLE orders_2025_02 PARTITION OF orders FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
\echo '(DEFAULT = kachra-peti. Partitions PEHLE se banao — cron job se, agle 3 mahine ke.)'
DELETE FROM orders;
CREATE TABLE orders_2025_02 PARTITION OF orders FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

\echo
\echo '--- JAAL 2: PRIMARY KEY sirf id par ---'
ALTER TABLE orders ADD PRIMARY KEY (id);
\echo '--- partition key (created) ko PK mein daalo toh chalega ---'
ALTER TABLE orders ADD PRIMARY KEY (id, created);
\echo '(Matlab: Postgres id ko POORI table mein unique guarantee nahi kar sakta — sirf har partition ke andar.)'

\echo
\echo '--- JAAL 3: partition key UPDATE ki — row ek table se doosri table mein chali jaati hai ---'
INSERT INTO orders VALUES (7, '2025-02-10', 'new', 500);
SELECT tableoid::regclass AS pehle, id, created FROM orders WHERE id = 7;
UPDATE orders SET created = '2025-01-10' WHERE id = 7;
SELECT tableoid::regclass AS baad, id, created FROM orders WHERE id = 7;
\echo '(Andar se yeh DELETE + INSERT hai — mehenga. Isliye key aisi chuno jo kabhi na badle.)'

\echo
\echo '--- JAAL 4: do column ki RANGE key — (date, location) ---'
CREATE TABLE t_multi (d date, loc int) PARTITION BY RANGE (d, loc);
CREATE TABLE t_multi_a PARTITION OF t_multi FOR VALUES FROM ('2025-01-01', 1)  TO ('2025-02-01', 50);
\echo 'Plan: Jan ki location 1-49 ek partition mein, location 50-99 doosre mein...'
CREATE TABLE t_multi_b PARTITION OF t_multi FOR VALUES FROM ('2025-01-01', 50) TO ('2025-02-01', 100);
INSERT INTO t_multi VALUES ('2025-01-20', 80);
SELECT tableoid::regclass AS location_80_kahan_gayi, * FROM t_multi;
\echo '(Tuple compare: pehla column (date) hi faisla kar deta hai. 20 Jan < 1 Feb → partition A, location kuch bhi ho.)'

\echo '--- sahi tareeka: SUB-partitioning (pehle mahina, phir us mahine ke andar location) ---'
CREATE TABLE t_sub (d date, loc int) PARTITION BY RANGE (d);
CREATE TABLE t_sub_2025_01 PARTITION OF t_sub FOR VALUES FROM ('2025-01-01') TO ('2025-02-01') PARTITION BY RANGE (loc);
CREATE TABLE t_sub_2025_01_a PARTITION OF t_sub_2025_01 FOR VALUES FROM (1)  TO (50);
CREATE TABLE t_sub_2025_01_b PARTITION OF t_sub_2025_01 FOR VALUES FROM (50) TO (100);
INSERT INTO t_sub VALUES ('2025-01-20', 80);
SELECT tableoid::regclass AS location_80_kahan_gayi, * FROM t_sub;

\echo
\echo '--- JAAL 5: kam values wala column (status) par HASH? ---'
CREATE TABLE orders_by_status (id int, status text) PARTITION BY HASH (status);
CREATE TABLE orders_by_status_0 PARTITION OF orders_by_status FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE orders_by_status_1 PARTITION OF orders_by_status FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE orders_by_status_2 PARTITION OF orders_by_status FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE orders_by_status_3 PARTITION OF orders_by_status FOR VALUES WITH (MODULUS 4, REMAINDER 3);
INSERT INTO orders_by_status
SELECT g, (ARRAY['delivered','delivered','delivered','delivered','delivered','delivered','delivered','delivered','shipped','cancelled'])[1 + g % 10]
FROM generate_series(1, 100000) g;
SELECT tableoid::regclass AS partition, count(*) AS rows FROM orders_by_status GROUP BY 1 ORDER BY 1;

\echo '--- wahi 100,000 rows, par HASH (customer_id) — bahut saari alag values ---'
CREATE TABLE orders_by_customer (id int, customer_id int) PARTITION BY HASH (customer_id);
CREATE TABLE orders_by_customer_0 PARTITION OF orders_by_customer FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE orders_by_customer_1 PARTITION OF orders_by_customer FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE orders_by_customer_2 PARTITION OF orders_by_customer FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE orders_by_customer_3 PARTITION OF orders_by_customer FOR VALUES WITH (MODULUS 4, REMAINDER 3);
INSERT INTO orders_by_customer SELECT g, (random() * 50000)::int FROM generate_series(1, 100000) g;
SELECT tableoid::regclass AS partition, count(*) AS rows FROM orders_by_customer GROUP BY 1 ORDER BY 1;
