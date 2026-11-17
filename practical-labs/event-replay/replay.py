#!/usr/bin/env python3
"""Real SQLite lab. All data lives in memory; no existing database is opened."""
import argparse
import json
import sqlite3

QUERY = 'SELECT seq, state FROM events WHERE order_id=? AND seq>? ORDER BY seq LIMIT 2'

def database(index='none'):
    db = sqlite3.connect(':memory:')
    db.execute('CREATE TABLE events (row_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, seq INTEGER NOT NULL, state TEXT NOT NULL)')
    db.executemany('INSERT INTO events(order_id,seq,state) VALUES(?,?,?)',
                   ((order, seq, 'state-' + str(seq)) for order in range(1, 101) for seq in range(1, 201)))
    if index == 'wrong':
        db.execute('CREATE INDEX events_state ON events(state)')
    elif index == 'right':
        db.execute('CREATE UNIQUE INDEX events_order_seq ON events(order_id,seq)')
    db.commit()
    return db

def index_experiment(index, cursor=197):
    db = database(index)
    try:
        rows = db.execute(QUERY, (41, cursor)).fetchall()
        plan = [r[3] for r in db.execute('EXPLAIN QUERY PLAN ' + QUERY, (41, cursor))]
        assert rows == [(seq, 'state-' + str(seq)) for seq in range(cursor + 1, min(cursor + 3, 201))]
        print(json.dumps({'engine': 'SQLite ' + sqlite3.sqlite_version, 'index': index,
                          'query': QUERY, 'parameters': [41, cursor], 'rows': rows, 'plan': plan}, indent=2))
        return plan
    finally:
        db.close()

def pagination_experiment():
    db = database('right')
    try:
        first = db.execute('SELECT seq FROM events WHERE order_id=41 ORDER BY seq LIMIT 3').fetchall()
        db.execute('DELETE FROM events WHERE order_id=41 AND seq=1')
        offset = db.execute('SELECT seq FROM events WHERE order_id=41 ORDER BY seq LIMIT 3 OFFSET 3').fetchall()
        cursor = db.execute('SELECT seq FROM events WHERE order_id=41 AND seq>3 ORDER BY seq LIMIT 3').fetchall()
        assert first == [(1,), (2,), (3,)] and offset == [(5,), (6,), (7,)] and cursor == [(4,), (5,), (6,)]
        print(json.dumps({'first_page': first, 'deleted_after_first_page': 1, 'offset_next': offset, 'cursor_next': cursor}, indent=2))
        return offset, cursor
    finally:
        db.close()

def checkpoint_experiment(atomic):
    db = sqlite3.connect(':memory:')
    try:
        db.executescript('CREATE TABLE projection (id INTEGER PRIMARY KEY, total INTEGER); INSERT INTO projection VALUES(1,0); CREATE TABLE checkpoint (id INTEGER PRIMARY KEY, seq INTEGER); INSERT INTO checkpoint VALUES(1,0);')
        try:
            db.execute('BEGIN')
            db.execute('UPDATE projection SET total=total+10 WHERE id=1')
            if not atomic:
                db.commit()  # Broken: effect committed, checkpoint is still old.
            raise RuntimeError('Injected failure before checkpoint')
        except RuntimeError:
            db.rollback()
        after_failure = [db.execute('SELECT total FROM projection').fetchone()[0], db.execute('SELECT seq FROM checkpoint').fetchone()[0]]
        with db:
            if db.execute('SELECT seq FROM checkpoint').fetchone()[0] < 1:
                db.execute('UPDATE projection SET total=total+10 WHERE id=1')
                db.execute('UPDATE checkpoint SET seq=1 WHERE id=1')
        after_retry = [db.execute('SELECT total FROM projection').fetchone()[0], db.execute('SELECT seq FROM checkpoint').fetchone()[0]]
        assert after_retry == ([10, 1] if atomic else [20, 1])
        print(json.dumps({'atomic': atomic, 'labels': ['total', 'checkpoint'], 'after_failure': after_failure, 'after_retry': after_retry}, indent=2))
        return after_retry
    finally:
        db.close()

def checks():
    plans = {kind: index_experiment(kind) for kind in ('none', 'wrong', 'right')}
    assert any('events_order_seq' in p and 'SEARCH' in p for p in plans['right'])
    assert all('events_order_seq' not in p for p in plans['none'])
    db = database('right')
    try:
        try:
            db.execute('INSERT INTO events(order_id,seq,state) VALUES(41,198,?)', ('duplicate',))
            raise AssertionError('Duplicate accepted')
        except sqlite3.IntegrityError:
            db.rollback()
        assert db.execute(QUERY, (99, 197)).fetchall() == [(198, 'state-198'), (199, 'state-199')]
        assert db.execute(QUERY, (41, 199)).fetchall() == [(200, 'state-200')]
        assert db.execute(QUERY, (41, 200)).fetchall() == []
        assert db.execute(QUERY, (41, 0)).fetchall() == [(1, 'state-1'), (2, 'state-2')]
    finally:
        db.close()
    pagination_experiment()
    checkpoint_experiment(False)
    checkpoint_experiment(True)
    print('PASS: query results, first/last/empty pages, composite index plan, unique constraint, pagination deletion, broken/fixed checkpoint.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--exercise', choices=['index', 'pagination', 'checkpoint'], default='index')
    parser.add_argument('--index', choices=['none', 'wrong', 'right'], default='none')
    parser.add_argument('--cursor', type=int, default=197, help='Last applied sequence for the index experiment; this dataset allows 0 through 200.')
    parser.add_argument('--atomic', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not 0 <= args.cursor <= 200:
        parser.error('--cursor must be between 0 and 200 for this dataset')
    if args.check: checks()
    elif args.exercise == 'index': index_experiment(args.index, args.cursor)
    elif args.exercise == 'pagination': pagination_experiment()
    else: checkpoint_experiment(args.atomic)
