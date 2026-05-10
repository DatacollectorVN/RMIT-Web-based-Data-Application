# Tasks: Python App Consolidation (SPEC-04)

**Input**: Design documents from `specs/20260510-145455-python-app-consolidation/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `app/` package skeleton, Dockerfile, config, and core utilities that every other task depends on.

- [x] T001 Create `app/` directory with sub-package stubs: `models/`, `schemas/`, `repositories/`, `services/`, `routers/`, `middleware/`, `opensearch/`, `ai/`, `scripts/`, `artifacts/` — add `__init__.py` to each
- [x] T002 Create `app/requirements.txt` with all pinned dependencies from SPEC-00 §4 (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, opensearch-py, pydantic, python-jose, passlib[bcrypt], sentence-transformers, scikit-learn, numpy, joblib, python-dotenv)
- [x] T003 Create `app/Dockerfile` using `python:3.11-slim`, `uv pip install --system`, expose port 8080, entrypoint `uvicorn app.main:app`
- [x] T004 [P] Create `app/config.py` reading all env vars from `.env` via `python-dotenv`; auto-convert `postgres://` → `postgresql+asyncpg://` for SQLAlchemy
- [x] T005 [P] Create `app/exceptions.py` with `NotFoundError`, `UnauthorisedError`, `ConflictError`, `ValidationError`
- [x] T006 [P] Create `app/database.py` with `create_async_engine`, `AsyncSessionLocal`, and `get_db` FastAPI dependency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: ORM models and the FastAPI app factory must exist before any user story can be tested end-to-end.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 [P] Create `app/models/product.py` — SQLAlchemy `Product` and `Photo` ORM classes mapping to `products` / `photos` tables
- [x] T008 [P] Create `app/models/user.py` — SQLAlchemy `User` ORM class mapping to `users` table (including `role` column)
- [x] T009 [P] Create `app/models/review.py` — SQLAlchemy `Review` ORM class mapping to `reviews` table
- [x] T010 [P] Create `app/models/order.py` — SQLAlchemy `Order` and `OrderItem` ORM classes mapping to `orders` / `order_items` tables
- [x] T011 Export all ORM models from `app/models/__init__.py`
- [x] T012 Create `app/routers/health.py` — `GET /api/v1/health` returning `{"data": {"status": "ok"}}` (no DB/OS dependency)
- [x] T013 Create `app/main.py` — FastAPI app factory with `lifespan` context (async DB engine ping, OpenSearch client init), register `health` router under `/api/v1`

**Checkpoint**: Run `uvicorn app.main:app` and `curl http://localhost:8080/api/v1/health` → HTTP 200

---

## Phase 3: User Story 1 — Developer runs full backend from `app/` (Priority: P1) 🎯 MVP

**Goal**: Single Docker Compose command starts `app`, `postgres`, `opensearch` — no Go container, health check passes.

**Independent Test**: `docker compose up -d app` → `curl http://localhost:8080/api/v1/health` → `{"data":{"status":"ok"}}`

### Implementation

- [x] T014 [US1] Update `docker-compose.yml`: replace `backend` service with `app` service (build `./app`, ports `8080:8080`, env overrides for container DNS `DATABASE_URL`/`OPENSEARCH_URL`, healthcheck on `/api/v1/health`)
- [x] T015 [US1] Remove or comment out `ai-service` block from `docker-compose.yml` (already partially done); confirm only `app`, `postgres`, `opensearch` remain
- [x] T016 [US1] Verify `docker compose build app` completes without errors and image contains no Go binary
- [x] T017 [US1] Smoke-test: `docker compose up -d` → confirm exactly 3 running containers (`rmit-app`, `rmit-postgres`, `rmit-opensearch`)

**Checkpoint**: US1 complete — `docker compose up -d` works, health endpoint responds 200.

---

## Phase 4: User Story 2 — Python reindex script (Priority: P2)

**Goal**: `app/scripts/reindex_products.py` reads PostgreSQL `products` table and bulk-uploads to OpenSearch, replacing `scripts/reindex_products.go`.

**Independent Test**: Run `python app/scripts/reindex_products.py` after `make migratedb && make snapshotdb && make opensearchinit` → output `indexed=8 failed=0 skipped=0`

### Implementation

- [x] T018 [US2] Create `app/scripts/reindex_products.py`:
  - Load `.env` via `python-dotenv`
  - Connect to PostgreSQL with `asyncpg` (or `psycopg2` for sync simplicity in script context)
  - Query `SELECT id, brand, name, description, category, price, updated_at FROM products ORDER BY updated_at DESC`
  - Generate `placeholder_unit_vector_384(seed_text)` using `hashlib.sha256` + L2 normalisation (port of Go `placeholderUnitVector384`)
  - Bulk-upload to OpenSearch `/_bulk` endpoint using `opensearch-py`
  - Print `target index: <name>` and `reindex summary: indexed=N failed=M skipped=K`
  - Exit non-zero on missing env vars, DB connect failure, or bulk errors
- [x] T019 [US2] Update `Makefile` `reindexproducts` target: replace `cd ./scripts && go mod tidy && go run ./reindex_products.go` with `python app/scripts/reindex_products.py`
- [x] T020 [US2] Add deprecation comment `# DEPRECATED: use app/scripts/reindex_products.py` to top of `scripts/reindex_products.go`
- [x] T021 [US2] Verify `make reindexproducts` succeeds without Go installed (uses Python script)

**Checkpoint**: US2 complete — Python reindex script works; `make reindexproducts` no longer requires Go.

---

## Phase 5: User Story 3 — Python relevance check script (Priority: P3)

**Goal**: `app/scripts/search_relevance_check.py` runs the five canonical keyword queries against OpenSearch and prints per-query hit counts, replacing `scripts/search_relevance_check.sh`.

**Independent Test**: Run `python app/scripts/search_relevance_check.py` after reindex → each of 5 lines shows `hits=N` (N ≥ 0)

### Implementation

- [x] T022 [P] [US3] Create `app/scripts/search_relevance_check.py`:
  - Load `OPENSEARCH_URL` (default `http://localhost:9200`) and `OPENSEARCH_INDEX_PRODUCTS` (default `products`) from env
  - Run the 5 canonical queries: `hydrating cleanser`, `niacinamide serum`, `spf sunscreen`, `tea tree spot`, `ceramide moisturizer`
  - Print one line per query: `query='<q>' hits=<n>`
  - Print header `Running keyword relevance checks against <url>/<index>` and footer `Done.`
  - Exit non-zero if OpenSearch is unreachable

**Checkpoint**: US3 complete — `python app/scripts/search_relevance_check.py` prints hit counts for all 5 queries.

---

## Phase 6: User Story 4 — `make` commands work without Go (Priority: P2)

**Goal**: All Makefile targets related to indexing invoke Python, not Go. `make indexproducts` chains `opensearchinit` → `reindexproducts` (Python).

**Independent Test**: Remove Go from `$PATH` or confirm Go not installed; run `make indexproducts` — exits 0.

### Implementation

- [x] T023 [US4] Add `relevancecheck` target to `Makefile`: `python app/scripts/search_relevance_check.py`
- [x] T024 [US4] Add backward-compat aliases `reindex-products: reindexproducts` and `relevance-check: relevancecheck` to `Makefile`
- [x] T025 [US4] Update `Makefile` `.PHONY` line to include `relevancecheck` and `relevance-check`
- [x] T026 [US4] Verify `make indexproducts` (= `opensearchinit` + `reindexproducts`) completes end-to-end using Python script only

**Checkpoint**: US4 complete — no `go run` or `go mod tidy` anywhere in Makefile.

---

## Phase 7: Port opensearch-py helpers (supports future CRUD specs)

**Purpose**: Port the Go `backend/opensearch/` query helpers to Python so the app service can use them for search endpoints in later specs.

- [x] T027 [P] Create `app/opensearch/client.py` — `OpenSearch(hosts=[…])` singleton instantiated from `app.state`, `get_opensearch` FastAPI dependency
- [x] T028 [P] Create `app/opensearch/query_builder.py` — `QueryRequest` dataclass + `normalize_request()` (port of `backend/opensearch/query_builder.go`)
- [x] T029 [P] Create `app/opensearch/keyword_search.py` — `build_keyword_query(req)` multi-match on `name`, `brand`, `description`, `category` (port of `backend/opensearch/keyword_search.go`)
- [x] T030 [P] Create `app/opensearch/semantic_search.py` — `build_semantic_query(req)` k-NN on `item_vector` (port of `backend/opensearch/semantic_search.go`)
- [x] T031 [P] Create `app/opensearch/fallback_logic.py` — `select_query(req)` choosing semantic / keyword / match_all (port of `backend/opensearch/fallback_logic.go`)

---

## Phase 9: Python Migration Runner & Snapshot Loader (Amendment)

**Goal**: Replace `golang-migrate` CLI and `psql` CLI dependencies with pure-Python scripts so the entire developer workflow requires only Python and Docker.

**Independent Test**: Run `make migratedb`, `make snapshotdb`, `make migratedbreapply` — all succeed without `migrate` or `psql` installed.

- [x] T036 Move all files from `migrations/` into `app/migrations/` (preserving filenames)
- [x] T037 Move `scripts/snapshot_seed.sql` to `app/scripts/snapshot_seed.sql`
- [x] T038 Create `app/scripts/migrate.py` — Python migration runner with `up`, `down <N>`, `reapply` subcommands using psycopg2 + `schema_migrations` tracking table
- [x] T039 [P] Create `app/scripts/snapshotdb.py` — reads and executes `app/scripts/snapshot_seed.sql` via psycopg2
- [x] T040 Update `Makefile`: replace `migrate` CLI calls with `python app/scripts/migrate.py`, replace `psql` call with `python app/scripts/snapshotdb.py`
- [x] T041 Remove root-level `migrations/` directory (now superseded by `app/migrations/`)

**Checkpoint**: `make migratedbreapply && make snapshotdb` succeeds using only Python — no `migrate` or `psql` binary needed.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T032 [P] Update `README.md` "where to change what" table: replace `backend/` + `ai-service/` rows with `app/`
- [x] T033 [P] Update `.env.example` `DATABASE_URL` comment to explain scheme conversion (`postgres://` for migrate, `postgresql+asyncpg://` for SQLAlchemy)
- [x] T034 Add `app/artifacts/.gitkeep` so the artifacts directory is tracked in git
- [x] T035 Run `quickstart.md` end-to-end validation: `docker compose up -d` → `make migratedb` → `make snapshotdb` → `make opensearchinit` → `make reindexproducts` → `curl /api/v1/health` — all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2; specifically T013 (main.py) must exist before Docker build
- **Phase 4 (US2)**: Depends on Phase 2; T018 (reindex script) can start once `app/` scaffold exists
- **Phase 5 (US3)**: Depends on Phase 2; T022 can start immediately after scaffold
- **Phase 6 (US4)**: Depends on T019 (Phase 4) and T022 (Phase 5)
- **Phase 7**: Independent of US phases; can start after Phase 1
- **Phase 8 (Polish)**: Depends on all prior phases

### User Story Dependencies

| Story | Depends on | Can start after |
|---|---|---|
| US1 — Docker `app` service | Phase 2 complete | T013 |
| US2 — Python reindex script | Phase 1 complete | T001–T006 |
| US3 — Relevance check script | Phase 1 complete | T001–T006 |
| US4 — Makefile no-Go | US2 + US3 tasks | T019, T022 |

### Within Each Phase

- `[P]` tasks operate on different files — run together
- Models (T007–T011) → app factory (T012–T013)
- Scripts (T018, T022) → Makefile updates (T019, T023)
- opensearch-py helpers (T027–T031) → all `[P]` — independent

### Parallel Opportunities

```bash
# Phase 1 parallel cluster:
T004 config.py  ||  T005 exceptions.py  ||  T006 database.py

# Phase 2 parallel cluster:
T007 product.py  ||  T008 user.py  ||  T009 review.py  ||  T010 order.py

# Phase 7 parallel cluster:
T027 client.py  ||  T028 query_builder.py  ||  T029 keyword_search.py
T030 semantic_search.py  ||  T031 fallback_logic.py

# US2 + US3 can run in parallel once Phase 1 is done:
T018 reindex_products.py  ||  T022 search_relevance_check.py
```

---

## Implementation Strategy

### MVP (US1 only)

1. Phase 1: Setup (T001–T006)
2. Phase 2: Foundational (T007–T013)
3. Phase 3: US1 Docker integration (T014–T017)
4. **STOP and VALIDATE**: `docker compose up -d` → 3 containers → `/api/v1/health` 200

### Incremental Delivery

1. Setup + Foundational → `app/` boots locally
2. US1 → Docker Compose runs with `app`
3. US2 → Python reindex replaces Go script
4. US3 → Python relevance check replaces shell script
5. US4 → Makefile fully Go-free
6. Phase 7 → opensearch-py helpers ready for CRUD specs

---

## Notes

- `[P]` tasks = different files, no shared dependencies — safe to implement in parallel
- `[USN]` label maps task to spec user story for traceability
- No test tasks generated (not requested in spec)
- SQL migration files are **not modified** in this spec
- `scripts/reindex_products.go` is deprecated (comment added) but not deleted
- Commit after each phase checkpoint
