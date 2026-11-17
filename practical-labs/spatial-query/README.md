# Spatial query: box candidate se exact result tak

SQL Gurukul folder mein run karo:

```bash
python3 practical-labs/spatial-query/query.py
```

Python standard library; SQLite build mein R*Tree support required hai. Script two temporary databases banati hai aur end par remove karti hai. Existing app data change nahi hota. Four checks actual SQLite queries, triggers aur transactions chalate hain.

Local map coordinates **metres** hain. Rider(0,0), radius5m, server time100s aur freshness strictly less than20s hai. System Gurukul ke cell-boundary example ka rider(99,50) alag small example hai.

| Driver ID | Coordinates | Status and accepted time | Predict before run |
|---|---|---|---|
| 1 | (3,0) | available,99s | Box, circle and eligibility pass |
| 2 | (5,5) | available,99s | Box passes; circle rejects distance7.07m |
| 3 | (1,0) | available,50s | Circle passes; freshness rejects age50s |
| 4 | (2,0) | busy,99s | Circle passes; status rejects |
| 5 | (200,200) | available,99s | Initially outside; moving to(2,0) needs index maintenance |

Script adds1,000 distant records so the local query also has irrelevant data to filter. Dataset size is an example, not a production benchmark.

1. Expect box IDs `[1,2,3,4]`, exact circle IDs `[1,3,4]`, final eligible IDs `[1]`.
2. Broken database has no maintenance triggers. Driver5 moves to(2,0), but spatial entry stays(200,200). Result misses5. Exact filter cannot create a candidate absent from index output. Repairing the spatial entry restores5.
3. Correct database has insert/move/delete triggers. Aborting a transaction rolls back both coordinate and spatial entry. Commit moves both; delete removes both.
4. Thirty independent region/radius combinations compare indexed results with an authoritative full scan. `rtreecheck` also checks tree structure. These checks have different jobs: structure alone cannot prove the tree matches the application rows.

The script prints real `EXPLAIN QUERY PLAN` output. `SCAN ... VIRTUAL TABLE INDEX ...` is SQLite's virtual-table plan notation; the word SCAN alone does not prove every spatial record is visited. Plan text also does not prove latency. No timing benchmark is claimed.

## Hands-on changes

- Remove the distance predicate from `eligible()`. Driver2 now leaks into results; the first assertion catches the wrong radius answer.
- Change freshness to `<=ttl`. Add a driver whose accepted time is80 with now100. Decide whether your contract includes or excludes exactly20s, then make code and assertion agree.
- Disable move trigger in a fresh database. Repeat moving driver5 and compare with full scan. Diagnose missing index maintenance, not a distance formula error.
- Change query radius from5 to8. Driver2 now belongs to the circle. Predict which eligibility filters still reject3 and4.

## PostgreSQL/PostGIS reference — not executed by this lab

If an authorized disposable PostgreSQL database already has PostGIS available, the following pattern illustrates matching column type, units and index. This session did **not** run PostgreSQL/PostGIS or start a container.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE practice_driver (
  id bigint PRIMARY KEY,
  location geography(Point,4326) NOT NULL,
  status text NOT NULL,
  seen_at timestamptz NOT NULL
);
CREATE INDEX practice_driver_location_gist
  ON practice_driver USING gist(location);

-- ST_MakePoint takes longitude, then latitude. geography radius uses metres.
WITH pickup AS (
  SELECT ST_SetSRID(ST_MakePoint(-73.9857,40.7484),4326)::geography AS point
)
SELECT d.id, ST_Distance(d.location,p.point) AS metres
FROM practice_driver d CROSS JOIN pickup p
WHERE ST_DWithin(d.location,p.point,2000)
  AND d.status='available'
  AND d.seen_at > CURRENT_TIMESTAMP - INTERVAL '20 seconds'
  AND d.seen_at <= CURRENT_TIMESTAMP
ORDER BY metres,d.id
LIMIT 20;
```

Load representative disposable data before interpreting `EXPLAIN (ANALYZE, BUFFERS)`. An empty/tiny table may reasonably use a sequential scan. Geography distances use metres; geometry distances use the coordinate system's units. SRID4326 geometry coordinates are degrees. Installing an extension does not create this table's GiST index. Casting a geometry column to geography also requires a usable matching index/expression; do not assume a differently typed index will serve the predicate.

This SQL returns eligible nearby candidates. It does not reserve a driver. Assignment races are covered in [System Gurukul ride practical](../../../sys-design-gurukul/practical-labs/ride-matching/README.md) and [SQL conditional claims](../seat-claim/README.md).

References: [SQLite R*Tree and rounding](https://www.sqlite.org/rtree.html), [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html), [PostGIS spatial index FAQ](https://postgis.net/documentation/faq/spatial-indexes/).

Proof limits: R*Tree floating bounds can expand through rounding. Lab uses conservative overlap queries and rechecks authoritative coordinates. Local Euclidean metres are not latitude/longitude geography. Trigger rollback is an application exception, not a power-cut or concurrent-connection test. Availability/receive-time columns are fixture data, not verified live GPS observations.
