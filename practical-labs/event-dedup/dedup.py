#!/usr/bin/env python3
"""Real SQLite processes: check-then-act race versus atomic deduplication."""
import argparse
import multiprocessing as mp
import os
from pathlib import Path
import sqlite3
import tempfile


def connect(filename):
    return sqlite3.connect(filename, isolation_level=None, timeout=10)


def setup(filename):
    db = connect(filename)
    db.executescript("""
      CREATE TABLE seen(merchant TEXT NOT NULL, event_id TEXT NOT NULL,
                        PRIMARY KEY(merchant, event_id));
      CREATE TABLE totals(merchant TEXT PRIMARY KEY NOT NULL, value INTEGER NOT NULL);
      INSERT INTO totals VALUES ('shop-a', 0), ('shop-b', 0);
    """)
    db.close()


def apply_atomic(db, merchant='shop-a', crash=False):
    db.execute('BEGIN IMMEDIATE')
    try:
        inserted = db.execute("""INSERT INTO seen VALUES (?, 'evt-1')
          ON CONFLICT(merchant, event_id) DO NOTHING""", (merchant,)).rowcount
        if crash:
            os._exit(91)  # No Python cleanup: leave an uncommitted transaction.
        if inserted:
            db.execute('UPDATE totals SET value=value+10 WHERE merchant=?', (merchant,))
        db.execute('COMMIT')
        return bool(inserted)
    except BaseException:
        if db.in_transaction:
            db.execute('ROLLBACK')
        raise


def worker(filename, mode, barrier):
    db = connect(filename)
    try:
        if mode == 'broken':
            exists = db.execute("SELECT 1 FROM seen WHERE merchant='shop-a' AND event_id='evt-1'").fetchone()
            barrier.wait(timeout=10)  # Both processes observed absent before either updates.
            if not exists:
                db.execute("UPDATE totals SET value=value+10 WHERE merchant='shop-a'")
                db.execute("INSERT INTO seen VALUES ('shop-a','evt-1') ON CONFLICT DO NOTHING")
        else:
            if barrier:
                barrier.wait(timeout=10)  # Contend for the writer transaction, not a stale SELECT.
            apply_atomic(db, crash=mode == 'crash')
    finally:
        db.close()


def run(mode):
    context = mp.get_context('spawn')
    with tempfile.TemporaryDirectory(prefix='gurukul-dedup-') as directory:
        filename = str(Path(directory) / 'events.sqlite')
        setup(filename)
        barrier = context.Barrier(2) if mode != 'crash' else None
        processes = [context.Process(target=worker, args=(filename, mode, barrier))
                     for _ in range(1 if mode == 'crash' else 2)]
        try:
            for process in processes:
                process.start()
            for process in processes:
                process.join(timeout=15)
                if process.is_alive():
                    raise RuntimeError('Worker did not finish within 15 seconds')
                assert process.exitcode == (91 if mode == 'crash' else 0), process.exitcode
            db = connect(filename)
            try:
                before = dict(db.execute('SELECT merchant,value FROM totals'))
                if mode == 'crash':
                    assert db.execute('SELECT count(*) FROM seen').fetchone()[0] == 0
                    assert before['shop-a'] == 0
                    assert apply_atomic(db)
                    assert not apply_atomic(db), 'Retried same event must be a no-op'
                after = dict(db.execute('SELECT merchant,value FROM totals'))
                expected = 20 if mode == 'broken' else 10
                assert after['shop-a'] == expected, (mode, after)
                assert apply_atomic(db, 'shop-b'), 'Same event ID in another merchant scope is distinct'
                assert dict(db.execute('SELECT merchant,value FROM totals'))['shop-b'] == 10
                result = {'mode':mode, 'shop_a_before_retry':before['shop-a'],
                          'shop_a_final':after['shop-a'], 'shop_b_final':10,
                          'seen_rows':db.execute('SELECT count(*) FROM seen').fetchone()[0]}
                return result
            finally:
                db.close()
        finally:
            for process in processes:
                if process.is_alive():
                    process.terminate(); process.join(timeout=5)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['broken','atomic','crash'], default='broken')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for mode in (['broken','atomic','crash'] if args.check else [args.mode]):
        print(run(mode))
    print('Observed actual SQLite processes. No external payment, queue, or power-loss guarantee is implied.')
