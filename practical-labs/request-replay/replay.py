"""Real temporary SQLite and child exits. No external payment is made."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile


def connect(path):
    db = sqlite3.connect(path, timeout=5, isolation_level=None)
    db.execute("PRAGMA foreign_keys=ON")
    return db


def setup(path):
    with connect(path) as db:
        db.executescript("""
          CREATE TABLE requests(
            account TEXT NOT NULL, operation TEXT NOT NULL, key TEXT NOT NULL,
            params TEXT NOT NULL, result TEXT,
            PRIMARY KEY(account, operation, key));
          CREATE TABLE payments(
            id INTEGER PRIMARY KEY, account TEXT NOT NULL,
            amount_cents INTEGER NOT NULL CHECK(amount_cents>0), currency TEXT NOT NULL);
        """)


def canonical(body):
    # Intentionally narrow schema. Unknown fields cannot silently affect the effect.
    if set(body) != {"amount_cents", "currency"}:
        raise ValueError("unsupported fields")
    if type(body["amount_cents"]) is not int or body["amount_cents"] <= 0:
        raise ValueError("positive integer cents required")
    if body["currency"] not in ("USD", "CAD"):
        raise ValueError("explicit uppercase USD/CAD required")
    return json.dumps(body, sort_keys=True, separators=(",", ":"))


def apply(path, account, key, body, crash=None):
    params = canonical(body)
    db = connect(path)
    try:
        db.execute("BEGIN IMMEDIATE")
        scope = (account, "local-payment", key)
        inserted = db.execute("""INSERT INTO requests(account,operation,key,params)
          VALUES(?,?,?,?) ON CONFLICT(account,operation,key) DO NOTHING""", (*scope, params)).rowcount
        if not inserted:
            old_params, result = db.execute("""SELECT params,result FROM requests
              WHERE account=? AND operation=? AND key=?""", scope).fetchone()
            if old_params != params:
                raise ValueError("same key, changed parameters")
            if result is None:
                raise RuntimeError("incomplete row violates this single-transaction algorithm")
            db.execute("COMMIT")
            return json.loads(result), "replay"
        payment_id = db.execute("INSERT INTO payments(account,amount_cents,currency) VALUES(?,?,?)",
                                (account, body["amount_cents"], body["currency"])).lastrowid
        result = {"payment_id": payment_id, **body}
        db.execute("UPDATE requests SET result=? WHERE account=? AND operation=? AND key=?",
                   (json.dumps(result, sort_keys=True), *scope))
        if crash == "before":
            os._exit(71)  # No close/rollback cleanup: actual child process exit.
        db.execute("COMMIT")
        if crash == "after":
            os._exit(72)  # Commit returned; caller receives no result.
        return result, "created"
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise
    finally:
        db.close()


def counts(path):
    with connect(path) as db:
        return tuple(db.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
                     for table in ("requests", "payments"))


def check(directory):
    body = {"amount_cents": 4999, "currency": "USD"}
    path = directory / "identity.db"
    setup(path)
    first, mode = apply(path, "shop-a", "order-7", body)
    assert mode == "created"
    replay, mode = apply(path, "shop-a", "order-7", {"currency": "USD", "amount_cents": 4999})
    assert mode == "replay" and first == replay and counts(path) == (1, 1)
    try:
        apply(path, "shop-a", "order-7", {**body, "amount_cents": 5999})
    except ValueError as error:
        assert str(error) == "same key, changed parameters"
    else:
        raise AssertionError("changed parameters accepted")
    assert counts(path) == (1, 1)
    apply(path, "shop-b", "order-7", body)
    apply(path, "shop-a", "order-8", body)
    assert counts(path) == (3, 3)
    print("PASS identity: reordered fields replay same result; changed amount rejected; account/new intent stay separate")

    for boundary, code, before_count, expected_mode in (
        ("before", 71, (0, 0), "created"), ("after", 72, (1, 1), "replay")
    ):
        crash_path = directory / (boundary + ".db")
        setup(crash_path)
        child = subprocess.run([sys.executable, str(Path(__file__).resolve()), "--child", str(crash_path), boundary],
                               timeout=10, check=False, capture_output=True, text=True)
        assert child.returncode == code, (child.returncode, child.stderr)
        assert counts(crash_path) == before_count
        _, mode = apply(crash_path, "shop-a", "order-7", body)
        assert mode == expected_mode and counts(crash_path) == (1, 1)
        print(f"PASS crash {boundary} commit: before retry={before_count}, retry={mode}, after retry=(1, 1)")

    with connect(path) as db:
        db.execute("DELETE FROM requests WHERE account='shop-a' AND key='order-7'")
    new_result, mode = apply(path, "shop-a", "order-7", body)
    assert mode == "created" and new_result["payment_id"] != first["payment_id"]
    assert counts(path) == (3, 4)
    print("PASS prune: key removed, old request creates another payment; 3 markers, 4 effects")

    with connect(directory / "upsert.db") as db:
        db.execute("CREATE TABLE stock(id TEXT PRIMARY KEY, n INTEGER NOT NULL, version INTEGER NOT NULL)")
        set_sql = """INSERT INTO stock VALUES('x',100,1)
          ON CONFLICT(id) DO UPDATE SET n=excluded.n"""
        db.execute(set_sql); db.execute(set_sql)
        assert db.execute("SELECT n FROM stock").fetchone()[0] == 100
        db.execute("UPDATE stock SET n=90")
        add_sql = """INSERT INTO stock VALUES('x',10,1)
          ON CONFLICT(id) DO UPDATE SET n=stock.n+excluded.n"""
        db.execute(add_sql); db.execute(add_sql)
        assert db.execute("SELECT n FROM stock").fetchone()[0] == 110
        print("PASS UPSERT: repeated absolute set=100; repeated +10 from 90=110")
        db.execute("UPDATE stock SET n=120,version=2")
        db.execute(set_sql)
        assert db.execute("SELECT n FROM stock").fetchone()[0] == 100
        db.execute("UPDATE stock SET n=120,version=2")
        changed = db.execute("UPDATE stock SET n=100,version=version+1 WHERE id='x' AND version=1").rowcount
        assert changed == 0 and db.execute("SELECT n FROM stock").fetchone()[0] == 120
        print("PASS stale set: unguarded replay overwrites 120->100; version guard rejects and keeps 120")


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "--child":
        apply(sys.argv[2], "shop-a", "order-7", {"amount_cents": 4999, "currency": "USD"}, sys.argv[3])
        raise AssertionError("child did not exit at requested boundary")
    if len(sys.argv) != 1:
        raise SystemExit("Run without arguments; --child is an internal crash mode")
    with tempfile.TemporaryDirectory(prefix="gurukul-request-replay-") as temp:
        check(Path(temp))
