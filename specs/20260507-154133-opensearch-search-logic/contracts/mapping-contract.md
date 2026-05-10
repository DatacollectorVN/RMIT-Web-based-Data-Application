# Mapping Contract

## Required invariants
- Index name: `products`
- Vector field: `item_vector`
- Mapping artifact must be versioned.
- Initialization script must be idempotent and safe for repeated runs.

## Initialization contract
- If index does not exist: create with active mapping.
- If index exists and mapping is unchanged: no-op.
- If mapping is incompatible: fail with clear remediation guidance.

## Reindex contract
- Reindex command source: `scripts/reindex_products.go`.
- Required summary output fields: `documents_indexed`, `documents_failed`, sample payload.
- Source-of-truth data remains PostgreSQL; OpenSearch is rebuilt via reindex.

## Troubleshooting contract
- If OpenSearch is unavailable, init must fail after a bounded wait period.
- If mapping file is missing, init must fail immediately with explicit file path.
- If create index fails (non-2xx), print response body and remediation hint.
