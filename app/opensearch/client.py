from fastapi import Request
from opensearchpy import OpenSearch

from config import OPENSEARCH_URL

_client: OpenSearch | None = None


def get_opensearch_client() -> OpenSearch:
    """Return a module-level singleton OpenSearch client (lazy init)."""
    global _client
    if _client is None:
        _client = OpenSearch(hosts=[OPENSEARCH_URL])
    return _client


def get_opensearch(request: Request) -> OpenSearch:
    """FastAPI dependency: returns the OpenSearch client stored on app.state."""
    client = getattr(request.app.state, "opensearch", None)
    if client is None:
        client = get_opensearch_client()
    return client
