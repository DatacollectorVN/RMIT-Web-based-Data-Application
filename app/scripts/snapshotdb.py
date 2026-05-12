#!/usr/bin/env python3
"""
Executes the snapshot seed SQL file against the configured PostgreSQL database.

Replaces the `psql` CLI dependency.

Usage:
    python app/scripts/snapshotdb.py

Environment variables (loaded from .env):
    DATABASE_URL               -- PostgreSQL connection string
    OPENSEARCH_URL             -- OpenSearch base URL (default: http://localhost:9200)
    OPENSEARCH_INDEX_PRODUCTS  -- Target index name (default: products)
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

SEED_FILE = Path(__file__).parent / "snapshot_seed.sql"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_PRODUCT_PHOTO = REPO_ROOT / "data" / "default-photos" / "blackpink.jpg"
PRODUCT_PHOTOS_DEST = REPO_ROOT / "data" / "product-photos" / "products"
# Must match seeded product ids in snapshot_seed.sql (demo products; brands align with ui HomePage BRAND_ORDER).
SEEDED_PRODUCT_IDS = range(1, 12)


def prepare_default_product_photos() -> None:
    if not DEFAULT_PRODUCT_PHOTO.is_file():
        print(f"error: default seed photo not found: {DEFAULT_PRODUCT_PHOTO}")
        sys.exit(1)
    for n in SEEDED_PRODUCT_IDS:
        dest_dir = PRODUCT_PHOTOS_DEST / str(n)
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(DEFAULT_PRODUCT_PHOTO, dest_dir / f"{n}.jpg")


def _pg_dsn(url: str) -> str:
    for prefix in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql://" + url[len(prefix):]
    return url


def _reindex_opensearch() -> None:
    """Run scripts/reindex_products.py so the products index matches the seeded DB."""
    app_dir = Path(__file__).resolve().parent.parent
    reindex_script = Path(__file__).resolve().parent / "reindex_products.py"
    completed = subprocess.run(
        [sys.executable, str(reindex_script)],
        cwd=str(app_dir),
        env=os.environ.copy(),
    )
    if completed.returncode != 0:
        print("error: OpenSearch product reindex failed after database seed")
        sys.exit(completed.returncode)


def main() -> None:
    if not DATABASE_URL:
        print("error: DATABASE_URL is not set")
        sys.exit(1)

    if not SEED_FILE.exists():
        print(f"error: seed file not found: {SEED_FILE}")
        sys.exit(1)

    sql = SEED_FILE.read_text(encoding="utf-8")

    prepare_default_product_photos()

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

    _reindex_opensearch()


if __name__ == "__main__":
    main()
