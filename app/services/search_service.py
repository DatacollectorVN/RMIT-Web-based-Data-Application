from opensearchpy import OpenSearch
from sqlalchemy.ext.asyncio import AsyncSession

from config import OPENSEARCH_INDEX_PRODUCTS
from models.product import Product
from opensearch.name_search import build_name_search_query
from opensearch.query_builder import QueryRequest
from repositories import product_repo


def _hits_total_value(total: object) -> int:
    if isinstance(total, dict):
        return int(total.get("value", 0))
    if total is None:
        return 0
    return int(total)


async def search_products_by_name(
    os_client: OpenSearch,
    db: AsyncSession,
    keyword: str,
    *,
    size: int = 10,
) -> tuple[list[Product], int]:
    """Search products by name via OpenSearch, then load matching rows from Postgres in hit order."""
    q = keyword.strip()
    if not q:
        return [], 0

    req = QueryRequest(keyword=q, size=size)
    body = build_name_search_query(req)
    resp = os_client.search(index=OPENSEARCH_INDEX_PRODUCTS, body=body)
    hits = resp.get("hits") or {}
    total = _hits_total_value(hits.get("total"))

    ids: list[int] = []
    for h in hits.get("hits") or []:
        src = h.get("_source") or {}
        pid = src.get("product_id")
        if pid is not None:
            ids.append(int(pid))

    products = await product_repo.get_by_ids_in_order(db, ids)
    return products, total
