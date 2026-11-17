"""Real temporary SQLite. No submitted-code execution, Redis or broker."""
import sqlite3
import tempfile
import threading
from pathlib import Path


def connect(path):
    return sqlite3.connect(path, timeout=5, isolation_level=None)


def save(db, sid, generation, verdict, fail=False):
    db.execute('BEGIN IMMEDIATE')
    try:
        changed = db.execute('''UPDATE submissions SET verdict=?
            WHERE id=? AND generation=? AND verdict IS NULL''',
            (verdict, sid, generation)).rowcount
        if changed:
            db.execute('INSERT INTO outbox(submission,generation,verdict) VALUES(?,?,?)',
                       (sid, generation, verdict))
        if fail:
            raise RuntimeError('injected before commit')
        db.execute('COMMIT')
        return changed
    except BaseException:
        db.execute('ROLLBACK')
        raise


def rebuild(db):
    # Exercise rule: first AC by submit_time/id; +20 penalty per earlier WA.
    # Other verdicts do not add penalty. Units are illustrative minutes.
    return db.execute('''WITH accepted AS (
        SELECT *, ROW_NUMBER() OVER (
            PARTITION BY contest, user, problem ORDER BY submit_time, id) AS pos
        FROM submissions WHERE verdict='AC'
    ), firsts AS (SELECT * FROM accepted WHERE pos=1)
    SELECT a.contest,a.user,COUNT(*) AS solved,
        SUM(a.submit_time + 20*(SELECT COUNT(*) FROM submissions w
            WHERE w.contest=a.contest AND w.user=a.user AND w.problem=a.problem
            AND w.verdict='WA' AND (w.submit_time<a.submit_time
                OR (w.submit_time=a.submit_time AND w.id<a.id)))) AS penalty
    FROM firsts a GROUP BY a.contest,a.user ORDER BY a.contest,a.user''').fetchall()


def main():
    with tempfile.TemporaryDirectory(prefix='gurukul-judge-') as folder:
        path = Path(folder)/'judge.sqlite'; db=connect(path)
        db.executescript('''CREATE TABLE submissions(
            id INTEGER PRIMARY KEY, contest TEXT NOT NULL, user TEXT NOT NULL,
            problem TEXT NOT NULL, submit_time INTEGER NOT NULL,
            generation INTEGER NOT NULL, verdict TEXT CHECK(verdict IN ('AC','WA','TLE','JUDGE_ERROR')));
            CREATE TABLE outbox(id INTEGER PRIMARY KEY, submission INTEGER NOT NULL,
                generation INTEGER NOT NULL, verdict TEXT NOT NULL,
                UNIQUE(submission,generation));
            INSERT INTO submissions VALUES(81,'c7','Ana','X',30,1,NULL);''')

        barrier=threading.Barrier(2); results=[]; errors=[]
        def contender(verdict):
            own=connect(path)
            try:
                barrier.wait(timeout=5); results.append(save(own,81,1,verdict))
            except BaseException as e:
                errors.append(e)
            finally:
                own.close()
        threads=[threading.Thread(target=contender,args=(v,)) for v in ['AC','WA']]
        for thread in threads: thread.start()
        for thread in threads: thread.join(timeout=10)
        assert not any(t.is_alive() for t in threads) and not errors, errors
        assert sorted(results)==[0,1]
        assert db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0]==1
        assert db.execute('SELECT verdict FROM submissions').fetchone()[0] == db.execute('SELECT verdict FROM outbox').fetchone()[0]
        print('PASS race: two SQLite connections, exactly one terminal write and one outbox row')

        # Rejudge changes generation. A late old worker must not fill the new NULL.
        db.execute('UPDATE submissions SET generation=2,verdict=NULL WHERE id=81')
        assert save(db,81,1,'AC')==0
        assert db.execute('SELECT verdict FROM submissions').fetchone()[0] is None
        db.execute('BEGIN')
        assert db.execute("UPDATE submissions SET verdict='AC' WHERE id=81 AND verdict IS NULL").rowcount==1
        db.execute('ROLLBACK')  # Demonstrated broken predicate; do not retain it.
        assert save(db,81,2,'WA')==1
        assert save(db,999,1,'AC')==0  # zero does not imply an existing completed row
        print('PASS rejudge: generation guard rejects old result; NULL-only predicate accepts it')

        db.execute("INSERT INTO submissions VALUES(82,'c7','Ana','Y',40,1,NULL)")
        try:
            save(db,82,1,'AC',fail=True)
        except RuntimeError:
            pass
        else:
            raise AssertionError('failure injection did not run')
        db.close(); db=connect(path)
        assert db.execute('SELECT verdict FROM submissions WHERE id=82').fetchone()[0] is None
        assert db.execute('SELECT COUNT(*) FROM outbox WHERE submission=82').fetchone()[0]==0
        assert save(db,82,1,'AC')==1
        assert save(db,82,1,'WA')==0
        print('PASS rollback: verdict and outbox both absent after exception; retry commits both')

        # The persisted event can be delivered again after a simulated lost ACK.
        db.executescript('CREATE TABLE inbox(event_id INTEGER PRIMARY KEY); CREATE TABLE effects(event_id INTEGER PRIMARY KEY, verdict TEXT NOT NULL);')
        event=db.execute('SELECT id,verdict FROM outbox WHERE submission=82').fetchone()
        def consume(e):
            db.execute('BEGIN IMMEDIATE')
            try:
                added=db.execute('INSERT INTO inbox VALUES(?) ON CONFLICT DO NOTHING',(e[0],)).rowcount
                if added: db.execute('INSERT INTO effects VALUES(?,?)',e)
                db.execute('COMMIT')
            except BaseException:
                db.execute('ROLLBACK');raise
        consume(event);consume(event)
        assert db.execute('SELECT COUNT(*) FROM effects').fetchone()[0]==1
        print('PASS redelivery: same persisted event delivered twice, one local inbox/effect commit')

        db.execute('DELETE FROM submissions')
        db.executemany('INSERT INTO submissions VALUES(?,?,?,?,?,?,?)',[
            (1,'c7','Ana','X',10,1,'WA'),(2,'c7','Ana','X',30,1,'AC'),
            (3,'c7','Ana','X',40,1,'AC'),(4,'c7','Ana','Y',50,1,'AC'),
            (5,'c8','Ana','X',5,1,'AC')])
        before=rebuild(db); assert before==[('c7','Ana',2,100),('c8','Ana',1,5)],before
        # Rejudge earlier accept to WA; earliest remaining AC is now minute40.
        db.execute("UPDATE submissions SET generation=2,verdict='WA' WHERE id=2")
        after=rebuild(db);assert after==[('c7','Ana',2,130),('c8','Ana',1,5)],after
        accepted_only=db.execute("SELECT SUM(submit_time) FROM submissions WHERE contest='c7' AND verdict='AC'").fetchone()[0]
        assert accepted_only==90 and accepted_only!=after[0][3]
        print('PASS rebuild: c7/Ana 2 solved, penalty100 -> rejudge -> 2 solved, penalty130; c8 remains5')
        print('Accepted-only sum90 loses earlier wrong-attempt penalties. All times are synthetic minutes.')
        db.close()


if __name__=='__main__':
    main()
