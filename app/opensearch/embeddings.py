"""
Shared sentence-transformer encoder used by both the API (product_index.py)
and the reindex script (scripts/reindex_products.py).

Produces a 385-dim hybrid unit vector:
  - dims 0-383 : all-MiniLM-L6-v2 text embedding (brand + name + category)
  - dim  384   : normalised price feature scaled by PRICE_WEIGHT

The combined vector is re-normalised to unit length so that cosine
similarity in OpenSearch remains valid.  With PRICE_WEIGHT=0.3 the price
dimension contributes ~8 % of the cosine similarity signal.

Both the model and the max-price ceiling are lazy-loaded on first call and
cached as module-level singletons.  max_price is read live from the
``products`` table so the normalisation adapts to the actual price range in
the database rather than a hard-coded constant.
"""
import logging
import os
import threading

import numpy as np

logger = logging.getLogger(__name__)

_model      = None
_model_lock = threading.Lock()

_max_price: float | None = None
_price_lock = threading.Lock()

# Fallback ceiling used when the DB is unreachable or the table is empty.
_MAX_PRICE_FALLBACK: float = 35.51 # max price in the database

# Scaling factor for the price dimension relative to the unit text vector.
# 0.3 → price contributes 0.3²/(1² + 0.3²) ≈ 8 % of cosine similarity.
_PRICE_WEIGHT: float = 0.3


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer  # noqa: PLC0415
                logger.info("embeddings: loading all-MiniLM-L6-v2 …")
                _model = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("embeddings: model ready (384-dim text + 1-dim price = 385-dim)")
    return _model


def _get_max_price() -> float:
    """Return MAX(price) from the products table, cached for the process lifetime.

    Falls back to ``_MAX_PRICE_FALLBACK`` if the database is unavailable or the
    table is empty, so the encoder keeps working during cold-start / tests.
    """
    global _max_price
    if _max_price is not None:
        return _max_price
    with _price_lock:
        if _max_price is not None:  # re-check inside the lock
            return _max_price
        try:
            import psycopg2  # noqa: PLC0415

            raw_url = os.environ.get("DATABASE_URL", "")
            # Normalise asyncpg URL variant to a libpq-compatible one.
            dsn = raw_url.replace("postgresql+asyncpg://", "postgresql://", 1)
            conn = psycopg2.connect(dsn)
            with conn, conn.cursor() as cur:
                cur.execute("SELECT MAX(price) FROM products")
                row = cur.fetchone()
            conn.close()
            fetched = float(row[0]) if row and row[0] else 0.0
            _max_price = fetched if fetched > 0 else _MAX_PRICE_FALLBACK
            logger.info("embeddings: max_price set to %.2f (from DB)", _max_price)
        except Exception as exc:
            _max_price = _MAX_PRICE_FALLBACK
            logger.warning("embeddings: could not fetch max_price from DB (%s) — using fallback %.2f", exc, _max_price)
    return _max_price


def invalidate_max_price() -> None:
    """Force the next encode call to re-fetch max_price from the database.

    Call this after bulk product inserts (e.g. after running snapshotdb).
    """
    global _max_price
    _max_price = None


def encode_product_text(brand: str, name: str, price: float, category: str) -> list[float]:
    """
    Return a normalised 385-dim hybrid unit vector:
      text part  (384-dim) — semantic meaning of brand / name / category
      price part (  1-dim) — normalised price scaled by PRICE_WEIGHT

    Steps:
      1. Embed "{brand} {name} {category}" → 384-dim unit vector
      2. Compute price_feature = clamp(price / max_price, 0, 1) * PRICE_WEIGHT
         where max_price = MAX(price) fetched live from the products table
      3. Append price_feature → 385-dim vector
      4. Re-normalise to unit length for valid cosine similarity
    """
    text = f"{brand} {name} {category}"
    model = _get_model()
    text_vec: np.ndarray = model.encode(text, normalize_embeddings=True)

    max_price = _get_max_price()
    price_feature = min(price / max_price, 1.0) * _PRICE_WEIGHT
    combined = np.append(text_vec, price_feature)

    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm

    return combined.tolist()
