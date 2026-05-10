from opensearch.keyword_search import build_keyword_query
from opensearch.query_builder import QueryRequest
from opensearch.semantic_search import build_semantic_query


def select_query(req: QueryRequest) -> dict:
    """Choose the appropriate query strategy based on available input."""
    if req.vector:
        return build_semantic_query(req)
    if req.keyword:
        return build_keyword_query(req)
    return {
        "size": 5,
        "query": {"match_all": {}},
    }
