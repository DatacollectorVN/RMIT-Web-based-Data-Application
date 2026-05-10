#!/usr/bin/env python3
"""
Python migration runner for beauty-app SQL migration files.

Replaces the golang-migrate CLI. Reads NNNNNN_name.up.sql / NNNNNN_name.down.sql
files from app/migrations/ and tracks applied versions in the `schema_migrations` table.

Usage:
    python app/scripts/migrate.py up           # apply all pending migrations
    python app/scripts/migrate.py down <N>     # roll back N steps (default 1)
    python app/scripts/migrate.py reapply      # drop all and re-apply from scratch
    python app/scripts/migrate.py status       # show applied / pending migrations

Environment variables (loaded from .env):
    DATABASE_URL  -- PostgreSQL connection string
"""
import os
import re
import sys
from pathlib import Path

import psycopg2
import psycopg2.extensions
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     BIGINT      PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def _pg_dsn(url: str) -> str:
    """Normalise any postgres:// variant to a libpq connection string."""
    for prefix in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql://" + url[len(prefix):]
    return url


def _connect() -> psycopg2.extensions.connection:
    if not DATABASE_URL:
        print("error: DATABASE_URL is not set")
        sys.exit(1)
    try:
        return psycopg2.connect(_pg_dsn(DATABASE_URL))
    except Exception as exc:
        print(f"error: cannot connect to PostgreSQL: {exc}")
        sys.exit(1)


def _ensure_migrations_table(cur) -> None:
    cur.execute(CREATE_TABLE_SQL)


def _all_versions() -> list[tuple[int, str]]:
    """Return sorted list of (version_int, stem) from .up.sql files."""
    pattern = re.compile(r"^(\d+)_(.+)\.up\.sql$")
    versions = []
    for f in MIGRATIONS_DIR.iterdir():
        m = pattern.match(f.name)
        if m:
            versions.append((int(m.group(1)), m.stem.removesuffix(".up")))
    return sorted(versions, key=lambda x: x[0])


def _applied_versions(cur) -> set[int]:
    cur.execute("SELECT version FROM schema_migrations ORDER BY version")
    return {row[0] for row in cur.fetchall()}


def _run_file(cur, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    cur.execute(sql)


def cmd_up(conn) -> None:
    with conn:
        with conn.cursor() as cur:
            _ensure_migrations_table(cur)
            applied = _applied_versions(cur)
            all_v = _all_versions()
            pending = [(v, stem) for v, stem in all_v if v not in applied]

            if not pending:
                print("migrate: no pending migrations — already up to date")
                return

            for version, stem in pending:
                path = MIGRATIONS_DIR / f"{version:06d}_{stem}.up.sql"
                print(f"  applying {path.name} ...", end=" ", flush=True)
                _run_file(cur, path)
                cur.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (version,))
                print("OK")

            print(f"migrate: applied {len(pending)} migration(s)")


def cmd_down(conn, steps: int) -> None:
    with conn:
        with conn.cursor() as cur:
            _ensure_migrations_table(cur)
            applied = sorted(_applied_versions(cur), reverse=True)
            all_v = {v: stem for v, stem in _all_versions()}

            to_roll = applied[:steps]
            if not to_roll:
                print("migrate: nothing to roll back")
                return

            for version in to_roll:
                stem = all_v.get(version, str(version))
                path = MIGRATIONS_DIR / f"{version:06d}_{stem}.down.sql"
                print(f"  rolling back {path.name} ...", end=" ", flush=True)
                _run_file(cur, path)
                cur.execute("DELETE FROM schema_migrations WHERE version = %s", (version,))
                print("OK")

            print(f"migrate: rolled back {len(to_roll)} migration(s)")


def cmd_reapply(conn) -> None:
    print("migrate: dropping all applied migrations ...")
    with conn:
        with conn.cursor() as cur:
            _ensure_migrations_table(cur)
            applied = sorted(_applied_versions(cur), reverse=True)
            all_v = {v: stem for v, stem in _all_versions()}

            for version in applied:
                stem = all_v.get(version, str(version))
                path = MIGRATIONS_DIR / f"{version:06d}_{stem}.down.sql"
                print(f"  rolling back {path.name} ...", end=" ", flush=True)
                _run_file(cur, path)
                cur.execute("DELETE FROM schema_migrations WHERE version = %s", (version,))
                print("OK")

    print("migrate: re-applying all migrations ...")
    conn.reset()
    cmd_up(conn)


def cmd_status(conn) -> None:
    with conn:
        with conn.cursor() as cur:
            _ensure_migrations_table(cur)
            applied = _applied_versions(cur)
            all_v = _all_versions()

    print(f"{'Version':<12} {'Name':<45} {'Status'}")
    print("-" * 70)
    for version, stem in all_v:
        name = f"{version:06d}_{stem}"
        status = "applied" if version in applied else "pending"
        print(f"{version:<12} {name:<45} {status}")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    cmd = args[0].lower()
    conn = _connect()

    if cmd == "up":
        cmd_up(conn)
    elif cmd == "down":
        steps = int(args[1]) if len(args) > 1 else 1
        cmd_down(conn, steps)
    elif cmd == "reapply":
        cmd_reapply(conn)
    elif cmd == "status":
        cmd_status(conn)
    else:
        print(f"error: unknown subcommand '{cmd}'. Use: up | down [N] | reapply | status")
        sys.exit(1)

    conn.close()


if __name__ == "__main__":
    main()
