#!/usr/bin/env python3
"""Real temporary SQLite R*Tree; local metre coordinates, no remote service."""
import math
import sqlite3
import tempfile
from pathlib import Path

BOX = """SELECT d.id,d.x,d.y,d.status,d.seen FROM spatial s
JOIN drivers d ON d.id=s.id
WHERE s.max_x>=? AND s.min_x<=? AND s.max_y>=? AND s.min_y<=?
ORDER BY d.id"""


def setup(path, triggers=True):
    db = sqlite3.connect(path)
    db.executescript("""
      CREATE TABLE drivers(id INTEGER PRIMARY KEY,x REAL NOT NULL,y REAL NOT NULL,
        status TEXT NOT NULL,seen INTEGER NOT NULL);
      CREATE VIRTUAL TABLE spatial USING rtree(id,min_x,max_x,min_y,max_y);
    """)
    if triggers:
        db.executescript("""
          CREATE TRIGGER spatial_insert AFTER INSERT ON drivers BEGIN
            INSERT INTO spatial VALUES(new.id,new.x,new.x,new.y,new.y);
          END;
          CREATE TRIGGER spatial_move AFTER UPDATE OF id,x,y ON drivers BEGIN
            DELETE FROM spatial WHERE id=old.id;
            INSERT INTO spatial VALUES(new.id,new.x,new.x,new.y,new.y);
          END;
          CREATE TRIGGER spatial_delete AFTER DELETE ON drivers BEGIN
            DELETE FROM spatial WHERE id=old.id;
          END;
        """)
    points = [(1, 3, 0, 'available', 99), (2, 5, 5, 'available', 99),
              (3, 1, 0, 'available', 50), (4, 2, 0, 'busy', 99),
              (5, 200, 200, 'available', 99)]
    points += [(i, 50 + (i * 37) % 1000, 50 + (i * 79) % 1000, 'available', 99)
               for i in range(6, 1006)]
    with db:
        db.executemany('INSERT INTO drivers VALUES(?,?,?,?,?)', points)
        if not triggers:
            db.execute('INSERT INTO spatial SELECT id,x,x,y,y FROM drivers')
    return db


def bounds(x, y, radius):
    return (x-radius, x+radius, y-radius, y+radius)


def eligible(rows, x, y, radius, now=100, ttl=20):
    return sorted(row[0] for row in rows if math.hypot(row[1]-x, row[2]-y) <= radius
                  and row[3] == 'available' and 0 <= now-row[4] < ttl)


def nearby(db, x=0, y=0, radius=5):
    return eligible(db.execute(BOX, bounds(x, y, radius)).fetchall(), x, y, radius)


def main():
    with tempfile.TemporaryDirectory(prefix='gurukul-spatial-') as folder:
        db = setup(Path(folder) / 'correct.sqlite')
        broken = setup(Path(folder) / 'stale.sqlite', triggers=False)
        try:
            candidates = db.execute(BOX, bounds(0, 0, 5)).fetchall()
            assert [r[0] for r in candidates] == [1, 2, 3, 4]
            assert [r[0] for r in candidates if math.hypot(r[1], r[2]) <= 5] == [1, 3, 4]
            assert nearby(db) == [1]
            print('PASS1: box=[1,2,3,4]; radius=[1,3,4]; fresh+available=[1].')
            plan = [r[3] for r in db.execute('EXPLAIN QUERY PLAN ' + BOX, bounds(0, 0, 5))]
            assert any('VIRTUAL TABLE INDEX' in line for line in plan)
            print('SQLite', sqlite3.sqlite_version, 'query plan:', ' | '.join(plan))

            with broken:
                broken.execute('UPDATE drivers SET x=2,y=0 WHERE id=5')
            assert nearby(broken) == [1]  #False negative: index still places5 at(200,200).
            assert eligible(broken.execute('SELECT * FROM drivers'), 0, 0, 5) == [1, 5]
            with broken:
                broken.execute('UPDATE spatial SET min_x=2,max_x=2,min_y=0,max_y=0 WHERE id=5')
            assert nearby(broken) == [1, 5]
            print('PASS2: stale index misses new nearby driver5; final filter cannot repair; maintenance restores5.')

            try:
                with db:
                    db.execute('UPDATE drivers SET x=2,y=0 WHERE id=5')
                    assert nearby(db) == [1, 5]
                    raise RuntimeError('abort before commit')
            except RuntimeError as exc:
                assert str(exc) == 'abort before commit'
            assert nearby(db) == [1]
            assert db.execute('SELECT x,y FROM drivers WHERE id=5').fetchone() == (200, 200)
            assert db.execute('SELECT min_x,min_y FROM spatial WHERE id=5').fetchone() == (200, 200)
            with db:
                db.execute('UPDATE drivers SET x=2,y=0 WHERE id=5')
            assert nearby(db) == [1, 5]
            with db:
                db.execute('DELETE FROM drivers WHERE id=5')
            assert db.execute('SELECT count(*) FROM spatial WHERE id=5').fetchone()[0] == 0
            assert nearby(db) == [1]
            print('PASS3: trigger-maintained movement rolls back with row; commit and delete keep index aligned.')

            all_rows = db.execute('SELECT * FROM drivers').fetchall()
            checked = 0
            for x, y in [(0, 0), (3, 0), (50, 50), (500, 500), (1020, 1020)]:
                for radius in [0, 1, 5, 80, 250, 2000]:
                    assert nearby(db, x, y, radius) == eligible(all_rows, x, y, radius)
                    checked += 1
            assert db.execute("SELECT rtreecheck('spatial')").fetchone()[0] == 'ok'
            print(f'PASS4: {checked} region/radius queries match full-scan oracle; R*Tree structural check ok.')
        finally:
            db.close()
            broken.close()


if __name__ == '__main__':
    main()
