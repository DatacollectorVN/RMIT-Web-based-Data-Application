# Contract: Script Interface

## `app/scripts/reindex_products.py`

### Environment variables (read from `.env` via python-dotenv)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `OPENSEARCH_URL` | Yes | — | OpenSearch base URL |
| `OPENSEARCH_INDEX_PRODUCTS` | No | `products` | Target index name |

### Exit behaviour

| Condition | Exit code | Output |
|---|---|---|
| Success | 0 | `target index: <name>\nreindex summary: indexed=N failed=0 skipped=0` |
| Missing env var | 1 | `reason: DATABASE_URL or OPENSEARCH_URL is missing` |
| DB connect failure | 1 | `reason: failed to connect postgres: <detail>` |
| Bulk upload failure | 1 | `reason: bulk request returned HTTP <code>` |
| No products in DB | 0 | `note: no products found in PostgreSQL` |

### Invariants
- Summary line format MUST be `indexed=N failed=M skipped=K`.
- Script MUST use placeholder unit vectors (SHA-256 normalised, 384-dim) when real embeddings are not available.
- Script MUST be runnable directly (`python app/scripts/reindex_products.py`) and via `make reindexproducts`.

---

## `app/scripts/search_relevance_check.py`

### Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENSEARCH_URL` | No | `http://localhost:9200` | OpenSearch base URL |
| `OPENSEARCH_INDEX_PRODUCTS` | No | `products` | Index to query |

### Canonical keyword queries (fixed set)

1. `hydrating cleanser`
2. `niacinamide serum`
3. `spf sunscreen`
4. `tea tree spot`
5. `ceramide moisturizer`

### Output format (one line per query)

```
Running keyword relevance checks against <url>/<index>
query='hydrating cleanser' hits=1
query='niacinamide serum' hits=1
...
Done. Compare outcomes with contracts/relevance-test-set.md.
```

### Exit behaviour

| Condition | Exit code |
|---|---|
| All queries executed (any hit count) | 0 |
| OpenSearch unreachable | 1 |
