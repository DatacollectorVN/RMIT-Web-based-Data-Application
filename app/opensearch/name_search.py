from opensearch.query_builder import QueryRequest, normalize_request


def build_name_search_query(req: QueryRequest) -> dict:
    """Full-text search on the product ``name`` field only (with typo tolerance)."""
    req = normalize_request(req)
    return {
        "size": req.size,
        "query": {
            "multi_match": {
                "query": req.keyword,
                "fields": ["name"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        },
    }
