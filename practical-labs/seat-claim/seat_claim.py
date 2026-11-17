"""Real SQLite and two subprocesses. No shared services, external payments or sockets."""
import json
from contextlib import closing
import selectors
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path


def connect(path):
    return sqlite3.connect(path, timeout=5, isolation_level=None)


def setup(path):
    with closing(connect(path)) as db:
        db.executescript("""
          CREATE TABLE seat(id TEXT PRIMARY KEY, status TEXT NOT NULL, version INTEGER NOT NULL, owner TEXT);
          INSERT INTO seat VALUES('F12','available',7,NULL);
          CREATE TABLE booking(buyer TEXT PRIMARY KEY, seat_id TEXT NOT NULL);
        """)


def worker(path, mode, buyer):
    db = connect(path)
    try:
        status, version = db.execute("SELECT status,version FROM seat WHERE id='F12'").fetchone()
        # Parent releases both workers ONLY after both completed the same read.
        print(json.dumps(dict(status=status, version=version)), flush=True)
        if sys.stdin.readline().strip() != 'go':
            raise RuntimeError('Missing parent release')
        db.execute('BEGIN IMMEDIATE')
        if mode == 'broken':
            changed = db.execute("UPDATE seat SET status='sold',owner=? WHERE id='F12'", (buyer,)).rowcount if status == 'available' else 0
        else:
            changed = db.execute("""UPDATE seat SET status='sold',owner=?,version=version+1
              WHERE id='F12' AND status='available' AND version=?""", (buyer, version)).rowcount
        if changed:
            db.execute("INSERT INTO booking VALUES(?,'F12')", (buyer,))
        db.execute('COMMIT')
        print(json.dumps(dict(buyer=buyer, changed=changed)), flush=True)
    finally:
        db.close()


def race(path, mode):
    processes=[]
    try:
        for buyer in ['Ana','Ben']:
            processes.append(subprocess.Popen([sys.executable, __file__, '--worker', str(path), mode, buyer],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
        with selectors.DefaultSelector() as selector:
            for child in processes: selector.register(child.stdout, selectors.EVENT_READ)
            while selector.get_map():
                ready=selector.select(10)
                if not ready: raise TimeoutError('Workers did not reach read barrier')
                for key,_ in ready:
                    first=json.loads(key.fileobj.readline())
                    assert first==dict(status='available',version=7),first
                    selector.unregister(key.fileobj)
        for child in processes:
            child.stdin.write('go\n');child.stdin.flush()
        outcomes=[]
        for child in processes:
            stdout,stderr=child.communicate(timeout=10)
            assert child.returncode==0,stderr
            outcomes.append(json.loads(stdout)['changed'])
        with closing(connect(path)) as db:
            bookings=db.execute('SELECT COUNT(*) FROM booking').fetchone()[0]
            status,version=db.execute("SELECT status,version FROM seat WHERE id='F12'").fetchone()
        assert sum(outcomes)==bookings
        assert bookings==(2 if mode=='broken' else 1),(mode,outcomes,bookings)
        assert status=='sold' and version==(7 if mode=='broken' else 8)
        print(f'{mode}: both processes read available v7; changed={sorted(outcomes)}; bookings={bookings}; final=sold v{version}')
    finally:
        for child in processes:
            if child.poll() is None: child.kill()
            child.communicate()


def boundaries(path):
    db=connect(path)
    try:
        # A metadata revision changes the version without selling the seat.
        db.execute("UPDATE seat SET version=8 WHERE id='F12'")
        changed=db.execute("""UPDATE seat SET status='sold',version=version+1
          WHERE id='F12' AND status='available' AND version=7""").rowcount
        assert changed==0
        assert db.execute("SELECT status FROM seat WHERE id='F12'").fetchone()[0]=='available'
        print('Version mismatch: changed=0, but seat is still available. Re-read before naming the business outcome.')
        # All necessary local changes share the same commit boundary.
        try:
            db.execute('BEGIN IMMEDIATE')
            assert db.execute("UPDATE seat SET status='sold',version=version+1 WHERE id='F12' AND status='available'").rowcount==1
            raise RuntimeError('Injected failure before booking insert')
        except RuntimeError:
            db.execute('ROLLBACK')
        assert db.execute("SELECT status,version FROM seat WHERE id='F12'").fetchone()==('available',8)
        assert db.execute('SELECT COUNT(*) FROM booking').fetchone()[0]==0
        print('Injected exception after claim → rollback restores available v8 and zero bookings. Not a process-crash test.')
    finally:
        db.close()


def main():
    with tempfile.TemporaryDirectory(prefix='gurukul-seat-') as folder:
        for mode in ['broken','guarded']:
            path=Path(folder)/(mode+'.sqlite');setup(path);race(path,mode)
        path=Path(folder)/'boundaries.sqlite';setup(path);boundaries(path)
    print('PASS 4 SQLite experiments. SQLite writer serialization is not PostgreSQL row-lock behavior.')


if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--worker': worker(*sys.argv[2:])
    else: main()
