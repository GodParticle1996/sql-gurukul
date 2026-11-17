"""Real SQLite, in-memory only. Query plans and transactions; no disk-I/O benchmark."""
import argparse
import sqlite3


def query_plan():
    with sqlite3.connect(':memory:') as db:
        db.execute('CREATE TABLE likes(post_id INTEGER, user_id INTEGER)')
        db.executemany('INSERT INTO likes VALUES (?, ?)',
                       ((post, user) for post in (42, 7) for user in range(30000)))
        query = 'SELECT COUNT(*) FROM likes WHERE post_id = 42'
        before = [row[3] for row in db.execute('EXPLAIN QUERY PLAN ' + query)]
        assert db.execute(query).fetchone()[0] == 30000
        db.execute('CREATE INDEX likes_post ON likes(post_id)')
        after = [row[3] for row in db.execute('EXPLAIN QUERY PLAN ' + query)]
        assert db.execute(query).fetchone()[0] == 30000
        # Check access category only: exact EXPLAIN wording is version dependent.
        assert any('SCAN' in row.upper() for row in before), before
        assert any('SEARCH' in row.upper() for row in after), after
        print('Before index:', '; '.join(before))
        print('After index: ', '; '.join(after))
        print('COUNT result: 30000 before and after. Matching entries still need counting.')
        print('200 views/s × 30000 matches = 6000000 matching entries/s if each view recounts all matches. This is not measured disk reads/s.')
    print('PASS query plan')


def counter():
    with sqlite3.connect(':memory:') as db:
        db.executescript('''
          PRAGMA foreign_keys=ON;
          CREATE TABLE posts(id INTEGER PRIMARY KEY, like_count INTEGER NOT NULL CHECK(like_count>=0));
          CREATE TABLE likes(post_id INTEGER REFERENCES posts(id), user_id TEXT,
                             PRIMARY KEY(post_id,user_id));
          INSERT INTO posts VALUES(42,0);
        ''')

        def state():
            return (db.execute('SELECT COUNT(*) FROM likes WHERE post_id=42').fetchone()[0],
                    db.execute('SELECT like_count FROM posts WHERE id=42').fetchone()[0])

        def like(user, fail=False):
            with db:
                inserted = db.execute('''INSERT INTO likes(post_id,user_id) VALUES(42,?)
                    ON CONFLICT(post_id,user_id) DO NOTHING''', (user,)).rowcount
                if fail:
                    raise RuntimeError('injected failure after membership insert')
                if inserted:
                    db.execute('UPDATE posts SET like_count=like_count+1 WHERE id=42')
            return inserted

        def unlike(user):
            with db:
                removed = db.execute('DELETE FROM likes WHERE post_id=42 AND user_id=?', (user,)).rowcount
                if removed:
                    db.execute('UPDATE posts SET like_count=like_count-1 WHERE id=42')

        # Reproduce bug: unique membership, but unconditional counter update on retry.
        for _ in range(2):
            with db:
                db.execute("INSERT INTO likes VALUES(42,'Ana') ON CONFLICT DO NOTHING")
                db.execute('UPDATE posts SET like_count=like_count+1 WHERE id=42')
        assert state() == (1, 2)
        print('Broken retry: membership=1, stored count=2')
        with db:
            db.execute('DELETE FROM likes')
            db.execute('UPDATE posts SET like_count=0')
        assert like('Ana') == 1
        assert like('Ana') == 0
        assert state() == (1, 1)
        print('Conditional retry: membership=1, stored count=1')
        try:
            like('Ben', fail=True)
        except RuntimeError:
            pass
        else:
            raise AssertionError('Fault injection did not run')
        assert state() == (1, 1)
        assert db.execute("SELECT COUNT(*) FROM likes WHERE user_id='Ben'").fetchone()[0] == 0
        print('Injected failure: Ben membership rolled back; stored count stays 1')
        like('Ben')
        assert state() == (2, 2)
        unlike('Ana'); unlike('Ana')
        assert state() == (1, 1)
        print('Ben retry + repeated Ana unlike: membership=1, stored count=1')
        # Make drift visible, then reconcile in one writer transaction.
        with db:
            db.execute('UPDATE posts SET like_count=99 WHERE id=42')
        db.execute('BEGIN IMMEDIATE')
        try:
            db.execute('''UPDATE posts SET like_count=
                (SELECT COUNT(*) FROM likes WHERE likes.post_id=posts.id) WHERE id=42''')
            db.commit()
        except BaseException:
            db.rollback()
            raise
        assert state() == (1, 1)
        print('Reconcile deliberate drift: stored count 99→1; membership authoritative')
    print('PASS conditional counter, exception rollback, unlike, reconciliation')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--exercise', choices=['all', 'plan', 'counter'], default='all')
    args = parser.parse_args()
    if args.exercise in ('all', 'plan'):
        query_plan()
    if args.exercise in ('all', 'counter'):
        counter()
