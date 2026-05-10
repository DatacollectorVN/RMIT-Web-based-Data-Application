#!/usr/bin/env bash
set -euo pipefail

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
INDEX_NAME="${OPENSEARCH_INDEX_PRODUCTS:-products}"
MAPPING_FILE="${MAPPING_FILE:-$(dirname "$0")/products_mapping.json}"
WAIT_SECONDS="${WAIT_SECONDS:-60}"

if [[ ! -f "${MAPPING_FILE}" ]]; then
  echo "Mapping file not found: ${MAPPING_FILE}" >&2
  exit 1
fi

echo "Waiting for OpenSearch at ${OPENSEARCH_URL}..."
end=$((SECONDS + WAIT_SECONDS))
until curl -fsS "${OPENSEARCH_URL}" >/dev/null 2>&1; do
  if (( SECONDS >= end )); then
    echo "OpenSearch did not become ready within ${WAIT_SECONDS}s." >&2
    exit 1
  fi
  sleep 2
done

# No-op when index already exists, fail clearly on incompatible states.
if curl -fsS "${OPENSEARCH_URL}/${INDEX_NAME}" >/dev/null 2>&1; then
  echo "Index '${INDEX_NAME}' already exists, skipping create."
  exit 0
fi

create_response=$(curl -sS -w "\n%{http_code}" -X PUT "${OPENSEARCH_URL}/${INDEX_NAME}" \
  -H "Content-Type: application/json" \
  --data-binary "@${MAPPING_FILE}")

http_code=$(echo "${create_response}" | tail -n1)
body=$(echo "${create_response}" | sed '$d')

if [[ "${http_code}" != "200" && "${http_code}" != "201" ]]; then
  echo "Failed to create index '${INDEX_NAME}' (HTTP ${http_code})." >&2
  echo "Response: ${body}" >&2
  echo "Remediation: delete/reset incompatible index and rerun init." >&2
  exit 1
fi

echo "Applied mapping to index: ${INDEX_NAME}"
