---
description: "Task list for SPEC-03 — OpenSearch index mapping & search logic"
---

# Tasks: SPEC-03 — OpenSearch Index Mapping & Search Logic

**Input**: Design documents from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: No explicit TDD requirement in the feature spec; validation tasks use relevance test sets and operational checks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: User story mapping label (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file path(s)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare mapping/versioning skeleton and ensure baseline files exist.

- [X] T001 Create versioned mapping file scaffold at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.v1.json`
- [X] T002 Create active mapping pointer file at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.json` that mirrors the active version
- [X] T003 [P] Create relevance check script scaffold at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/scripts/search_relevance_check.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement operational foundations required for all search stories.

**⚠️ CRITICAL**: No user-story tasks should start before this phase is complete.

- [X] T004 Update index bootstrap workflow in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/init.sh` to apply mapping idempotently
- [X] T005 Add OpenSearch readiness wait/check behavior in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/init.sh`
- [X] T006 Add mapping error handling/remediation messages in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/init.sh`
- [X] T007 Implement or refresh reindex command in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/scripts/reindex_products.go` to transform PostgreSQL products into OpenSearch documents
- [X] T008 Add reindex run summary output (`documents_indexed`, `documents_failed`, samples) in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/scripts/reindex_products.go`
- [X] T009 Align initialization documentation with implementation in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/contracts/mapping-contract.md`

**Checkpoint**: Mapping can be initialized and data can be reindexed with deterministic output.

---

## Phase 3: User Story 1 - Find relevant products quickly (Priority: P1) 🎯 MVP

**Goal**: Deliver keyword search relevance for common product-discovery queries.

**Independent Test**: Run keyword query set from `contracts/relevance-test-set.md` and verify expected relevance in top results.

- [X] T010 [US1] Implement keyword query builder in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/opensearch/query_builder.go`
- [X] T011 [US1] Implement keyword retrieval logic in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/opensearch/keyword_search.go`
- [X] T012 [US1] Add lexical analyzer/field mapping details in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.v1.json`
- [X] T013 [US1] Sync active mapping in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.json`
- [X] T014 [US1] Update keyword pass/fail expectations in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/contracts/relevance-test-set.md`

**Checkpoint**: SC-001 can be measured using the documented keyword query set.

---

## Phase 4: User Story 2 - Support semantic similarity retrieval (Priority: P2)

**Goal**: Deliver semantic vector retrieval with robust fallback.

**Independent Test**: Run semantic intent set and verify contextual relevance in top results.

- [X] T015 [US2] Implement semantic retrieval logic in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/opensearch/semantic_search.go`
- [X] T016 [US2] Implement no-result/low-confidence fallback behavior in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/opensearch/fallback_logic.go`
- [X] T017 [US2] Add vector field and similarity configuration in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.v1.json`
- [X] T018 [US2] Update semantic intent checks in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/contracts/relevance-test-set.md`

**Checkpoint**: SC-003 can be measured with documented semantic queries.

---

## Phase 5: User Story 3 - Keep index data synchronized and maintainable (Priority: P3)

**Goal**: Ensure reproducible init/reindex/diagnostics workflows for maintainers.

**Independent Test**: From clean OpenSearch, run init + reindex + relevance checks using only docs and scripts.

- [X] T019 [US3] Implement runnable relevance checker in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/scripts/search_relevance_check.sh`
- [X] T020 [US3] Document reindex operation and troubleshooting in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/quickstart.md`
- [X] T021 [US3] Update operational contract details in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/contracts/mapping-contract.md`
- [X] T022 [US3] Ensure data-model alignment with final indexed fields in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/data-model.md`

**Checkpoint**: SC-002 and SC-004 can be validated end-to-end in local workflows.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish consistency checks, docs polish, and final verification.

- [X] T023 [P] Validate mapping files consistency between `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.v1.json` and `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.json`
- [ ] T024 Validate quickstart flow by executing init + reindex + relevance check from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/quickstart.md`
- [ ] T025 [P] Record SC-001/SC-003 measurement outputs in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-154133-opensearch-search-logic/research.md`

---

## Dependencies & Execution Order

### Phase dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User stories (Phases 3-5) depend on Foundational.
- Polish (Phase 6) depends on completion of desired user stories.

### User story dependencies

- **US1 (P1)** can start after Phase 2 and provides MVP relevance outcomes.
- **US2 (P2)** depends on US1 query/ranking foundation for hybrid behavior.
- **US3 (P3)** depends on implemented init/reindex/search paths from US1/US2.

### Within-story ordering

- Mapping updates should be synchronized with corresponding search logic.
- Contract/query-set updates should accompany behavior changes in the same story.
- Operational scripts should be validated before polishing metrics.

## Parallel opportunities

- T003 can run in parallel with T001/T002.
- T023 and T025 can run in parallel during Polish.

## Suggested MVP scope

Complete through **T014** (Phase 3 / US1) to deliver keyword search relevance with measurable outcomes.
