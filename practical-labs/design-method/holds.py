#!/usr/bin/env python3
"""Real conditional writes and rollback. Time and payment outcomes are authored inputs."""
import sqlite3
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory(prefix="gurukul-holds-") as folder:
    db = sqlite3.connect(Path(folder) / "holds.db")
    db.executescript("""
        CREATE TABLE seats (
          concert TEXT, seat TEXT, owner TEXT NOT NULL, generation INTEGER NOT NULL,
          expires INTEGER NOT NULL, sold_owner TEXT, sold_generation INTEGER,
          sale_operation TEXT UNIQUE, PRIMARY KEY(concert, seat));
        CREATE TABLE outbox (operation TEXT PRIMARY KEY, concert TEXT, seat TEXT,
          buyer TEXT, action TEXT CHECK(action='capture_authorized_payment'));
        INSERT INTO seats VALUES ('C7','A12','bob',8,1200,NULL,NULL,NULL);
        INSERT INTO seats VALUES ('C7','A13','bob',2,700,NULL,NULL,NULL);
    """)

    def finalize(seat, owner, generation, now, operation, fail=False):
        # Replay checks precede expiry: a committed sale does not become undone later.
        with db:
            existing = db.execute("""SELECT sold_owner,sold_generation,sale_operation
                FROM seats WHERE concert='C7' AND seat=?""", (seat,)).fetchone()
            if existing == (owner, generation, operation):
                return "replay"
            changed = db.execute("""UPDATE seats
                SET sold_owner=?, sold_generation=?, sale_operation=?
                WHERE concert='C7' AND seat=? AND sold_owner IS NULL
                  AND owner=? AND generation=? AND expires>?""",
                (owner, generation, operation, seat, owner, generation, now)).rowcount
            if changed == 0:
                return "rejected"
            db.execute("INSERT INTO outbox VALUES (?,'C7',?,?,'capture_authorized_payment')",
                       (operation, seat, owner))
            if fail:
                raise RuntimeError("Injected failure before commit")
        return "committed"

    assert finalize("A12", "alice", 7, 700, "pay-alice") == "rejected"
    assert finalize("A12", "alice", 8, 700, "pay-alice") == "rejected"
    assert finalize("A12", "bob", 7, 700, "pay-bob") == "rejected"
    print("PASS ownership: late Alice, wrong owner and wrong generation all rejected.")
    assert finalize("A13", "bob", 2, 700, "pay-boundary") == "rejected"
    print("PASS expiry: now=expires rejected under the explicit now<expires policy.")
    try:
        finalize("A12", "bob", 8, 700, "pay-bob", fail=True)
    except RuntimeError:
        pass
    assert db.execute("SELECT sold_owner FROM seats WHERE seat='A12'").fetchone() == (None,)
    assert db.execute("SELECT count(*) FROM outbox").fetchone()[0] == 0
    print("PASS rollback: sale and capture intent both absent after injected failure.")
    assert finalize("A12", "bob", 8, 700, "pay-bob") == "committed"
    assert db.execute("SELECT sold_owner,sold_generation FROM seats WHERE seat='A12'").fetchone() == ("bob", 8)
    assert db.execute("SELECT count(*) FROM outbox").fetchone()[0] == 1
    print("PASS commit: Bob owns A12; one durable capture intent exists.")
    assert finalize("A12", "bob", 8, 1300, "pay-bob") == "replay"
    assert finalize("A12", "bob", 8, 1300, "new-operation") == "rejected"
    assert finalize("A12", "alice", 7, 1300, "pay-alice") == "rejected"
    assert db.execute("SELECT count(*) FROM outbox").fetchone()[0] == 1
    print("PASS replay: same committed operation returns its result after expiry; new/stale operations rejected; one intent remains.")
    print("No payment provider ran. Late authorization needs void/reconciliation; captured money can need refund under product policy.")
    db.close()
