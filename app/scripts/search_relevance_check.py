#!/usr/bin/env python3
"""
Runs the five canonical keyword queries against the OpenSearch `products` index
and prints per-query hit counts for basic relevance validation.

Usage:
    python app/scripts/search_relevance_check.py

Environment variables:
    OPENSEARCH_URL             -- OpenSearch base URL (default: http://localhost:9200)
    OPENSEARCH_INDEX_PRODUCTS  -- Index to query (default: products)
"""
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

OPENSEARCH_URL: str = os.environ.get("OPENSEARCH_URL", "http://localhost:9200").rstrip("/")
INDEX: str = os.environ.get("OPENSEARCH_INDEX_PRODUCTS", "products")

CANONICAL_QUERIES = [
    "hydrating cleanser",
    "niacinamide serum",
    "spf sunscreen",
    "tea tree spot",
    "ceramide moisturizer",
]


def run_keyword_query(query: str) -> int:
    """Run a multi-match keyword query and return the total hit count."""
    body = {
        "query": {
            "multi_match": {
                "query": query,
                "fields": ["name^3", "brand^2", "description", "category"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        },
        "size": 10,
    }
    url = f"{OPENSEARCH_URL}/{INDEX}/_search"
    resp = requests.post(url, json=body, timeout=10)
    resp.raise_for_status()
    return resp.json()["hits"]["total"]["value"]


def main() -> None:
    print(f"Running keyword relevance checks against {OPENSEARCH_URL}/{INDEX}")

    try:
        for q in CANONICAL_QUERIES:
            hits = run_keyword_query(q)
            print(f"query='{q}' hits={hits}")
    except requests.exceptions.ConnectionError as exc:
        print(f"error: OpenSearch unreachable at {OPENSEARCH_URL} — {exc}")
        sys.exit(1)
    except requests.exceptions.HTTPError as exc:
        print(f"error: OpenSearch returned error — {exc}")
        sys.exit(1)

    print("Done. Compare outcomes with contracts/relevance-test-set.md.")


if __name__ == "__main__":
    main()
