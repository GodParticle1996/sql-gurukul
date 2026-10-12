-- ex3 · crash recovery: pehle table banao
SET client_min_messages = warning;
DROP TABLE IF EXISTS orders_log;
CREATE TABLE orders_log (id bigserial PRIMARY KEY, amount int, at timestamptz DEFAULT now());
CREATE OR REPLACE PROCEDURE keep_inserting(n int) LANGUAGE plpgsql AS $$
BEGIN FOR i IN 1..n LOOP INSERT INTO orders_log (amount) VALUES (i % 500); COMMIT; END LOOP; END $$;
