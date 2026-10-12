-- ek query jo ~1 ms CPU khaati hai (asli app ki koi bhi thodi bhaari query)
SELECT count(*) FROM generate_series(1, 20000);
