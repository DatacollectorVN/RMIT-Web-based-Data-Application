#!/usr/bin/env bash
set -euo pipefail

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
INDEX_NAME="${OPENSEARCH_INDEX_PRODUCTS:-products}"

curl -fsS -X PUT "${OPENSEARCH_URL}/${INDEX_NAME}" \
  -H "Content-Type: application/json" \
  --data-binary "@$(dirname "$0")/products_mapping.json" \
  >/dev/null

echo "Applied mapping to index: ${INDEX_NAME}"
