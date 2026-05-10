from opensearch.query_builder import QueryRequest, normalize_request


def build_keyword_query(req: QueryRequest) -> dict:
    req = normalize_request(req)
    return {
        "size": req.size,
        "query": {
            "multi_match": {
                "query": req.keyword,
                "fields": ["name^3", "brand^2", "description", "category"],
                "type": "best_fields",
            }
        },
    }
