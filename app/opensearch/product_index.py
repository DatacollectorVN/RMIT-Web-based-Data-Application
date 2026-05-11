"""
OpenSearch helpers for the `products` index.

Called from product_service after every write (create / update / delete).
Errors are logged but never propagated — OpenSearch sync is best-effort.
"""
import hashlib
import logging
import math
from datetime import timezone

from opensearchpy import OpenSearch

from config import OPENSEARCH_INDEX_PRODUCTS
from models.product import Product

logger = logging.getLogger(__name__)


def _placeholder_unit_vector_384(seed_text: str) -> list[float]:
    """
    Deterministic non-zero 384-dim unit vector derived from seed_text via SHA-256.
    Identical algorithm to app/scripts/reindex_products.py.
    """
    dim = 384
    vec: list[float] = []
    counter = 0
    while len(vec) < dim:
        h = hashlib.sha256(f"{seed_text}|{counter}".encode()).digest()
        counter += 1
        for byte in h:
            if len(vec) >= dim:
                break
            vec.append((byte / 255.0) * 2.0 - 1.0)
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0:
        vec[0] = 1.0
        norm = 1.0
    return [v / norm for v in vec]


def upsert(client: OpenSearch, product: Product) -> None:
    """Index (create or overwrite) a product document in OpenSearch."""
    try:
        updated_at = product.updated_at
        if updated_at is not None and hasattr(updated_at, "astimezone"):
            updated_at_str = updated_at.astimezone(timezone.utc).isoformat()
        else:
            updated_at_str = str(updated_at)

        seed = f"{product.id} {product.brand} {product.name} {product.description} {product.category}"
        doc = {
            "product_id": int(product.id),
            "brand": product.brand,
            "name": product.name,
            "description": product.description,
            "category": product.category,
            "price": float(product.price),
            "item_vector": _placeholder_unit_vector_384(seed),
            "updated_at": updated_at_str,
        }
        client.index(
            index=OPENSEARCH_INDEX_PRODUCTS,
            id=str(product.id),
            body=doc,
        )
        logger.info("OpenSearch: upserted product id=%s", product.id)
    except Exception as exc:
        logger.warning("OpenSearch: upsert failed for product id=%s — %s", product.id, exc)


def delete(client: OpenSearch, product_id: int) -> None:
    """Remove a product document from OpenSearch. Ignores 404."""
    try:
        client.delete(
            index=OPENSEARCH_INDEX_PRODUCTS,
            id=str(product_id),
            params={"ignore": 404},
        )
        logger.info("OpenSearch: deleted product id=%s", product_id)
    except Exception as exc:
        logger.warning("OpenSearch: delete failed for product id=%s — %s", product_id, exc)
