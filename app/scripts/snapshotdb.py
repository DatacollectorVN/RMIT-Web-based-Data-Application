#!/usr/bin/env python3
"""
Executes the snapshot seed SQL file against the configured PostgreSQL database.

Replaces the `psql` CLI dependency.

Usage:
    python app/scripts/snapshotdb.py

Environment variables (loaded from .env):
    DATABASE_URL  -- PostgreSQL connection string
"""
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

SEED_FILE = Path(__file__).parent / "snapshot_seed.sql"


def _pg_dsn(url: str) -> str:
    for prefix in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql://" + url[len(prefix):]
    return url


def main() -> None:
    if not DATABASE_URL:
        print("error: DATABASE_URL is not set")
        sys.exit(1)

    if not SEED_FILE.exists():
        print(f"error: seed file not found: {SEED_FILE}")
        sys.exit(1)

    sql = SEED_FILE.read_text(encoding="utf-8")

    try:
        conn = psycopg2.connect(_pg_dsn(DATABASE_URL))
    except Exception as exc:
        print(f"error: cannot connect to PostgreSQL: {exc}")
        sys.exit(1)

    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql)
        print(f"snapshotdb: seed applied from {SEED_FILE.name}")
    except Exception as exc:
        print(f"error: seed execution failed: {exc}")
        conn.close()
        sys.exit(1)

    conn.close()


if __name__ == "__main__":
    main()
