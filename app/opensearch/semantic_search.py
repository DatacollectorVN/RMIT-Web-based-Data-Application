from opensearch.query_builder import QueryRequest, normalize_request


def build_semantic_query(req: QueryRequest) -> dict:
    req = normalize_request(req)
    return {
        "size": req.size,
        "query": {
            "knn": {
                "item_vector": {
                    "vector": req.vector,
                    "k": req.size,
                }
            }
        },
    }
