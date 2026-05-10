# Implementation Plan: SPEC-03 — OpenSearch Index Mapping & Search Logic

**Branch**: `20260507-154133-opensearch-search-logic` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/spec.md`

## Summary

Implement OpenSearch mapping and retrieval logic for the `products` index so keyword and semantic search both produce relevant results. Deliverables include versioned mapping JSON, index bootstrap workflow, reindex workflow from PostgreSQL snapshot data, and reproducible relevance checks.

## Technical Context

**Language/Version**: Go 1.22 (search orchestration), Python 3.11 (embedding support), JSON mapping artifacts  
**Primary Dependencies**: OpenSearch Go client, sentence-transformers embeddings pipeline (existing AI service), Docker Compose local OpenSearch  
**Storage**: OpenSearch `products` index + PostgreSQL source-of-truth data  
**Testing**: Manual/automated relevance query sets, init/reindex smoke checks, fallback behavior checks  
**Target Platform**: Local Docker Compose environment for OpenSearch + backend services  
**Project Type**: Web backend search subsystem  
**Performance Goals**: Query relevance and fast local initialization/reindex; no production cluster tuning in this phase  
**Constraints**: Must follow SPEC-00 OpenSearch constraints (`products`, `item_vector`, analyzer conventions) and keep behavior reproducible  
**Scale/Scope**: Coursework-scale data volumes and deterministic dev workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate (SPEC-00) | Requirement | Status |
|---|---|---|
| Vector store choice | OpenSearch knn_vector | Pass |
| Index name | `products` | Pass |
| Vector field | `item_vector` with 384 dimension conventions | Pass |
| Mapping artifact placement | Versioned JSON under `opensearch/` | Pass |
| Single API entry point | Backend serves public API; AI service internal only | Pass |

No constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/20260507-154133-opensearch-search-logic/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── mapping-contract.md
│   └── relevance-test-set.md
└── tasks.md
```

### Source Code (repository root)

```text
opensearch/
├── products_mapping.json
├── products_mapping.v1.json
└── init.sh
scripts/
├── reindex_products.go
└── search_relevance_check.sh
backend/opensearch/
├── query_builder.go
├── keyword_search.go
├── semantic_search.go
└── fallback_logic.go
```

**Structure Decision**: Keep mapping and bootstrap artifacts in `opensearch/`, retrieval logic in `backend/opensearch/`, and operational scripts in `scripts/`.

## Action Items (Phase-by-phase)

### Phase A — Mapping definition
1. Create versioned mapping artifact (`opensearch/products_mapping.v1.json`) aligned with SPEC-00.
2. Update canonical mapping pointer (`opensearch/products_mapping.json`) to the active version.
3. Define lexical fields, analyzer rules, and vector field contract in docs.

### Phase B — Index bootstrap workflow
1. Update `opensearch/init.sh` to apply mapping idempotently.
2. Add health/wait checks so mapping applies only when OpenSearch is ready.
3. Add clear error messages for incompatible mapping states.

### Phase C — Reindex workflow
1. Implement/refresh `scripts/reindex_products.go` to read product records and write index documents.
2. Ensure document includes all fields required for keyword and semantic retrieval.
3. Add reindex verification output (count indexed, failures, skipped records).

### Phase D — Search logic
1. Implement keyword retrieval path in `backend/opensearch/keyword_search.go`.
2. Implement semantic retrieval path in `backend/opensearch/semantic_search.go`.
3. Implement fallback behavior in `backend/opensearch/fallback_logic.go`.
4. Add a small query-builder abstraction for consistent ranking options.

### Phase E — Validation and relevance checks
1. Create query set contract in `contracts/relevance-test-set.md`.
2. Add runnable check script `scripts/search_relevance_check.sh`.
3. Validate SC-001 and SC-003 thresholds with snapshot data and record outcomes.

### Phase F — Operational documentation
1. Finalize quickstart for init + reindex + relevance check flow.
2. Add troubleshooting for empty results, stale index, and mapping mismatches.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | — | — |
