# Quickstart: SPEC-03 OpenSearch Mapping & Search Logic

1. Start services:
   - `docker compose up -d opensearch postgres`
2. Apply mapping (idempotent create):
   - `bash opensearch/init.sh`
3. Run reindex workflow:
   - `go run scripts/reindex_products.go`
4. Run keyword relevance checks:
   - `bash scripts/search_relevance_check.sh`
5. Execute semantic checks:
   - Use the semantic intent set in `contracts/relevance-test-set.md` with query shape in `backend/opensearch/semantic_search.go`.
6. Record outcomes for SC-001 and SC-003 in `research.md`.
