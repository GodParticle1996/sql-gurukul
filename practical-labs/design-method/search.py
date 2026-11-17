#!/usr/bin/env python3
"""Actual SQLite FTS5 operations on a disposable database; no external search server."""
import sqlite3
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory(prefix="gurukul-search-") as folder:
    db = sqlite3.connect(Path(folder) / "search.db")
    try:
        db.execute("CREATE VIRTUAL TABLE posts USING fts5(body)")
    except sqlite3.OperationalError as exc:
        raise SystemExit("SQLite build needs FTS5 enabled: " + str(exc))
    with db:
        db.executemany("INSERT INTO posts(rowid,body) VALUES (?,?)", [
            (1, "system design interview tips"),
            (2, "design of system"),
            (3, "system outage report"),
            (4, "interview prep system design"),
        ])

    def matches(query):
        return [row[0] for row in db.execute(
            "SELECT rowid FROM posts WHERE posts MATCH ? ORDER BY rowid", (query,))]

    assert matches("system AND design") == [1, 2, 4]
    print("PASS AND: [1, 2, 4]; both tokens exist, order and adjacency are not required.")
    assert matches('"system design"') == [1, 4]
    print("PASS phrase: [1, 4]; design of system does not contain the token phrase.")
    with db:
        db.execute("UPDATE posts SET body=? WHERE rowid=2", ("runtime engineering",))
    assert matches("system AND design") == [1, 4]
    print("PASS update: [1, 4]; old terms for row2 no longer match.")
    try:
        with db:
            db.execute("DELETE FROM posts WHERE rowid=1")
            assert matches('"system design"') == [4]
            raise RuntimeError("Injected failure before commit")
    except RuntimeError:
        pass
    assert matches('"system design"') == [1, 4]
    print("PASS rollback: [1, 4]; uncommitted delete did not survive.")
    with db:
        db.execute("DELETE FROM posts WHERE rowid=1")
    assert matches('"system design"') == [4]
    print("PASS delete: [4]; committed delete removes row1 from matching.")
    db.close()
