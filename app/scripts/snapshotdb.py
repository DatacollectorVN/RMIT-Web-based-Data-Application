#!/usr/bin/env python3
"""
(Re-)generates snapshot_seed.sql from the CSV archive, then applies it to PostgreSQL.

Steps:
  1. Run generate_seed.py  → writes app/scripts/snapshot_seed.sql
  2. Ensure seeded product image files exist (archive → default placeholder;
     never overwrites files already on disk)
  3. Execute snapshot_seed.sql against the database
  4. Reindex OpenSearch

Note: `make migratedb` only applies schema migrations and does not touch
      data/product-photos/. Photo files are managed here (snapshotdb) only.

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

SCRIPT_DIR  = Path(__file__).parent
SEED_FILE   = SCRIPT_DIR / "snapshot_seed.sql"
REPO_ROOT   = Path(__file__).resolve().parent.parent.parent
DEFAULT_PRODUCT_PHOTO  = REPO_ROOT / "data" / "default-photos" / "blackpink.jpg"
PRODUCT_PHOTOS_DEST    = REPO_ROOT / "data" / "product-photos" / "products"
ARCHIVE_PHOTOS_SRC     = REPO_ROOT / "archive" / "media" / "media" / "products"
# 295 products from CSV (sorted by brand A→Z then avg_rating desc)
SEEDED_PRODUCT_IDS = range(1, 296)


def prepare_product_photos() -> None:
    """Ensure seeded product images exist under data/product-photos/products/.

    Archive layout:  archive/media/media/products/{n}/{n}.jpg  (IDs 1-295)
    Destination:     data/product-photos/products/{n}/{n}.jpg

    For each product, copies only when the destination file is missing:
      1. archive image, if present
      2. else data/default-photos/blackpink.jpg

    Existing files are left unchanged so re-running snapshotdb (or running
    migratedb separately) does not replace custom or previously copied photos.
    """
    has_archive = ARCHIVE_PHOTOS_SRC.is_dir()
    has_default = DEFAULT_PRODUCT_PHOTO.is_file()

    if not has_archive:
        print(f"warning: archive photos not found at {ARCHIVE_PHOTOS_SRC}")
    if not has_archive and not has_default:
        print(f"error: neither archive photos nor default photo found")
        sys.exit(1)

    copied = 0
    fallback = 0
    skipped = 0
    for n in SEEDED_PRODUCT_IDS:
        dest_dir = PRODUCT_PHOTOS_DEST / str(n)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{n}.jpg"

        if dest.is_file():
            skipped += 1
            continue

        src = ARCHIVE_PHOTOS_SRC / str(n) / f"{n}.jpg"
        if src.is_file():
            shutil.copy2(src, dest)
            copied += 1
        elif has_default:
            shutil.copy2(DEFAULT_PRODUCT_PHOTO, dest)
            fallback += 1
        else:
            print(f"warning: no photo for product {n}, skipping")

    print(
        f"snapshotdb: photos — {copied} from archive, {fallback} default placeholders, "
        f"{skipped} already present (kept)"
    )


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


def _generate_seed() -> None:
    """Run generate_seed.py to (re)build snapshot_seed.sql from the CSV archive."""
    generate_script = SCRIPT_DIR / "generate_seed.py"
    app_dir = SCRIPT_DIR.parent
    print("snapshotdb: generating seed SQL from CSV …")
    result = subprocess.run(
        [sys.executable, str(generate_script)],
        cwd=str(app_dir),
        env=os.environ.copy(),
    )
    if result.returncode != 0:
        print("error: generate_seed.py failed")
        sys.exit(result.returncode)


def main() -> None:
    if not DATABASE_URL:
        print("error: DATABASE_URL is not set")
        sys.exit(1)

    _generate_seed()

    if not SEED_FILE.exists():
        print(f"error: seed file not found after generation: {SEED_FILE}")
        sys.exit(1)

    sql = SEED_FILE.read_text(encoding="utf-8")

    prepare_product_photos()

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
