#!/usr/bin/env python3
"""
Reads all rows from the PostgreSQL `products` table and bulk-uploads them
to the OpenSearch `products` index.

Before indexing, all existing documents in the target index are removed
(delete_by_query match_all) so stale _id values (for example legacy UUIDs)
cannot remain alongside current PostgreSQL ids.

If the index does not exist it is created with the correct KNN mapping
(384-dim cosine similarity) before any documents are uploaded.

Usage:
    python app/scripts/reindex_products.py

Environment variables (loaded from .env):
    DATABASE_URL               -- PostgreSQL connection string
    OPENSEARCH_URL             -- OpenSearch base URL (default: http://localhost:9200)
    OPENSEARCH_INDEX_PRODUCTS  -- Target index name (default: products)
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras
import requests
from dotenv import load_dotenv

# Allow importing from the app/ directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from opensearch.embeddings import encode_product_text  # noqa: E402

load_dotenv()

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
OPENSEARCH_URL: str = os.environ.get("OPENSEARCH_URL", "http://localhost:9200").rstrip("/")
INDEX: str = os.environ.get("OPENSEARCH_INDEX_PRODUCTS", "products")

_KNN_INDEX_MAPPING = {
    "settings": {
        "index": {
            "knn": True,
            "knn.algo_param.ef_search": 100,
        }
    },
    "mappings": {
        "properties": {
            "product_id":  {"type": "integer"},
            "brand":       {"type": "keyword"},
            "name":        {"type": "text"},
            "description": {"type": "text"},
            "category":    {"type": "keyword"},
            "price":       {"type": "float"},
            "updated_at":  {"type": "date"},
            "item_vector": {
                "type":       "knn_vector",
                "dimension":  385,
                "method": {
                    "name":       "hnsw",
                    "space_type": "cosinesimil",
                    "engine":     "nmslib",
                },
            },
        }
    },
}


def _pg_dsn(url: str) -> str:
    """Convert SQLAlchemy-style URL to a libpq DSN for psycopg2."""
    for prefix in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql://" + url[len(prefix):]
    return url


def _ensure_index() -> None:
    """Drop (if exists) and recreate the OpenSearch index with correct KNN mapping."""
    base = f"{OPENSEARCH_URL}/{INDEX}"

    # Always drop so stale mappings (e.g. missing item_vector) are never reused
    del_resp = requests.delete(base, timeout=15)
    if del_resp.status_code not in (200, 404):
        raise RuntimeError(f"DELETE {INDEX} returned HTTP {del_resp.status_code}: {del_resp.text[:300]}")
    if del_resp.status_code == 200:
        print(f"opensearch: dropped existing index '{INDEX}'")

    print(f"opensearch: creating index '{INDEX}' with KNN mapping …")
    resp = requests.put(
        base,
        data=json.dumps(_KNN_INDEX_MAPPING),
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(
            f"Failed to create index HTTP {resp.status_code}: {resp.text[:500]}"
        )
    print(f"opensearch: index '{INDEX}' created")


def _truncate_index_documents() -> int:
    """
    Delete every document in INDEX while keeping index settings/mapping.
    Returns number of documents deleted, or -1 if the index did not exist.
    """
    base = f"{OPENSEARCH_URL}/{INDEX}"
    head = requests.head(base, timeout=15)
    if head.status_code == 404:
        print(f"opensearch: index '{INDEX}' not found; skipping truncate")
        return -1
    if not head.ok:
        raise RuntimeError(f"HEAD {INDEX} returned HTTP {head.status_code}: {head.text[:300]}")

    dq_url = f"{base}/_delete_by_query"
    resp = requests.post(
        dq_url,
        data=json.dumps({"query": {"match_all": {}}}),
        headers={"Content-Type": "application/json"},
        params={"refresh": "true", "conflicts": "proceed"},
        timeout=120,
    )
    if not resp.ok:
        raise RuntimeError(
            f"delete_by_query failed HTTP {resp.status_code}: {resp.text[:500]}"
        )
    body = resp.json()
    if body.get("timed_out"):
        raise RuntimeError("delete_by_query timed out")
    deleted = int(body.get("deleted", 0))
    failures = body.get("failures") or []
    if failures:
        raise RuntimeError(f"delete_by_query reported failures: {failures[:3]}")
    print(f"opensearch: truncated {deleted} document(s) from index '{INDEX}'")
    return deleted


def main() -> None:
    if not DATABASE_URL or not OPENSEARCH_URL:
        print("reindex summary: indexed=0 failed=0 skipped=1")
        print("reason: DATABASE_URL or OPENSEARCH_URL is missing")
        sys.exit(1)

    dsn = _pg_dsn(DATABASE_URL)
    try:
        conn = psycopg2.connect(dsn)
    except Exception as exc:
        print("reindex summary: indexed=0 failed=1 skipped=0")
        print(f"reason: failed to connect postgres: {exc}")
        sys.exit(1)

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                "SELECT id, brand, name, description, category, price, updated_at "
                "FROM products ORDER BY updated_at DESC"
            )
            rows = cur.fetchall()
    except Exception as exc:
        print("reindex summary: indexed=0 failed=1 skipped=0")
        print(f"reason: failed to query products: {exc}")
        conn.close()
        sys.exit(1)
    finally:
        conn.close()

    try:
        _ensure_index()
        _truncate_index_documents()
    except requests.exceptions.ConnectionError as exc:
        print(f"target index: {INDEX}")
        print("reindex summary: indexed=0 failed=1 skipped=0")
        print(f"reason: OpenSearch truncate failed (connection): {exc}")
        sys.exit(1)
    except RuntimeError as exc:
        print(f"target index: {INDEX}")
        print("reindex summary: indexed=0 failed=1 skipped=0")
        print(f"reason: OpenSearch truncate failed: {exc}")
        sys.exit(1)

    if not rows:
        print(f"target index: {INDEX}")
        print("reindex summary: indexed=0 failed=0 skipped=0")
        print("note: no products found in PostgreSQL (index is empty)")
        return

    ndjson_lines: list[str] = []
    indexed = 0
    failed = 0

    for row in rows:
        try:
            price = float(row["price"])
        except (TypeError, ValueError):
            failed += 1
            continue

        updated_at = row["updated_at"]
        if isinstance(updated_at, datetime):
            updated_at_str = updated_at.astimezone(timezone.utc).isoformat()
        else:
            updated_at_str = str(updated_at)

        pid = int(row["id"])
        doc = {
            "product_id": pid,
            "brand": row["brand"],
            "name": row["name"],
            "description": row["description"],
            "category": row["category"],
            "price": price,
            "item_vector": encode_product_text(
                row["brand"], row["name"], price, row["category"]
            ),
            "updated_at": updated_at_str,
        }

        meta = {"index": {"_index": INDEX, "_id": str(pid)}}
        ndjson_lines.append(json.dumps(meta))
        ndjson_lines.append(json.dumps(doc))
        indexed += 1

    bulk_url = f"{OPENSEARCH_URL}/_bulk?refresh=true"
    payload = "\n".join(ndjson_lines) + "\n"

    try:
        resp = requests.post(
            bulk_url,
            data=payload,
            headers={"Content-Type": "application/x-ndjson"},
            timeout=30,
        )
    except requests.exceptions.ConnectionError as exc:
        print(f"target index: {INDEX}")
        print(f"reindex summary: indexed=0 failed={indexed + failed} skipped=0")
        print(f"reason: bulk request failed: {exc}")
        sys.exit(1)

    if not resp.ok:
        print(f"target index: {INDEX}")
        print(f"reindex summary: indexed=0 failed={indexed + failed} skipped=0")
        print(f"reason: bulk request returned HTTP {resp.status_code}")
        print(f"response: {resp.text[:500]}")
        sys.exit(1)

    result = resp.json()
    if result.get("errors"):
        print(f"target index: {INDEX}")
        print(f"reindex summary: indexed={indexed} failed={failed} skipped=0")
        print("note: bulk response contains errors=true (inspect response)")
        sys.exit(1)

    print(f"target index: {INDEX}")
    print(f"reindex summary: indexed={indexed} failed={failed} skipped=0")


if __name__ == "__main__":
    main()
