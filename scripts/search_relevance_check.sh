#!/usr/bin/env bash
set -euo pipefail

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
INDEX_NAME="${OPENSEARCH_INDEX_PRODUCTS:-products}"

queries=(
  "hydrating cleanser"
  "niacinamide serum"
  "spf sunscreen"
  "tea tree spot"
  "ceramide moisturizer"
)

echo "Running keyword relevance checks against ${OPENSEARCH_URL}/${INDEX_NAME}"
for q in "${queries[@]}"; do
  payload=$(cat <<EOF
{"size":5,"query":{"multi_match":{"query":"${q}","fields":["name^3","brand^2","description","category"]}}}
EOF
)
  count=$(curl -sS -X POST "${OPENSEARCH_URL}/${INDEX_NAME}/_search" \
    -H "Content-Type: application/json" \
    -d "${payload}" | sed -n 's/.*"total":{"value":\([0-9]*\).*/\1/p' | head -n1)
  echo "query='${q}' hits=${count:-0}"
done

echo "Done. Compare outcomes with contracts/relevance-test-set.md."

