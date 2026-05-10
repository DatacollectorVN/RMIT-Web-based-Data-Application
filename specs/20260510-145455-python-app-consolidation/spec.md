# Feature Specification: Python App Consolidation

**Feature Branch**: `20260510-145455-python-app-consolidation`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: Consolidate backend and ai-service into a single unified `app` folder, replace Go scripts with Python equivalents, and retire the Go backend.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer can run the full backend from a single `app` folder (Priority: P1)

A developer cloning the repository for the first time should be able to install one set of Python dependencies, start one Docker Compose service, and have a working REST API with AI/ML capabilities — without needing a Go toolchain or two separate service setups.

**Why this priority**: This is the prerequisite for every other story. Without a consolidated `app` entry point, no new feature work can begin.

**Independent Test**: Run `docker compose up -d app` and confirm the `/api/v1/health` endpoint responds 200 and the service boots without errors.

**Acceptance Scenarios**:

1. **Given** the repo is freshly cloned, **When** the developer runs `docker compose up -d`, **Then** only `app`, `postgres`, and `opensearch` containers start (no Go container, no separate ai-service container).
2. **Given** the `app` container is running, **When** a request is sent to `GET /api/v1/health`, **Then** the response is `{"data": {"status": "ok"}}` with HTTP 200.
3. **Given** the `app` container is running, **When** a developer inspects Docker images, **Then** there is no Go-based image in the Compose stack.

---

### User Story 2 — Developer can prepare the OpenSearch index using a Python script (Priority: P2)

The reindex operation that reads PostgreSQL products and uploads them to OpenSearch MUST be available as a Python script inside `app/scripts/`, replacing the existing `scripts/reindex_products.go`.

**Why this priority**: The reindex workflow is a required operational step for product search. It must remain functional after the Go script is retired.

**Independent Test**: Run `python app/scripts/reindex_products.py` with valid env vars and confirm that OpenSearch reflects the product count from PostgreSQL.

**Acceptance Scenarios**:

1. **Given** PostgreSQL has product rows and OpenSearch `products` index exists, **When** the developer runs `python app/scripts/reindex_products.py`, **Then** all products are uploaded to OpenSearch and a summary is printed (`indexed=N failed=0`).
2. **Given** `DATABASE_URL` or `OPENSEARCH_URL` is missing, **When** the script is run, **Then** it exits with a non-zero code and a clear error message.
3. **Given** the Go-based `scripts/reindex_products.go` still exists in the repo, **When** the consolidation is complete, **Then** the Go script is either removed or marked as deprecated with a comment.

---

### User Story 3 — Developer can verify search relevance using a Python script (Priority: P3)

The keyword relevance check script (`scripts/search_relevance_check.sh`) must be replaced by a Python equivalent in `app/scripts/`, so all operational scripts use the same language and runtime.

**Why this priority**: Consistency in tooling reduces cognitive overhead and avoids requiring developers to maintain two runtimes for scripts.

**Independent Test**: Run `python app/scripts/search_relevance_check.py` and confirm it prints per-query hit counts against the live OpenSearch index.

**Acceptance Scenarios**:

1. **Given** OpenSearch has indexed products, **When** `python app/scripts/search_relevance_check.py` is run, **Then** it prints one line per keyword query with hit count (e.g., `query='hydrating cleanser' hits=1`).
2. **Given** OpenSearch is unreachable, **When** the script is run, **Then** it exits with a non-zero code and prints a human-readable connectivity error.

---

### User Story 4 — `make` commands work with the new Python `app` structure (Priority: P2)

All `make` commands related to indexing and relevance checking must continue to work after the Go scripts are replaced, without requiring any manual Go toolchain setup.

**Why this priority**: The Makefile is the single developer interface. If it breaks, the entire local workflow breaks.

**Independent Test**: Run `make opensearchinit` and `make reindexproducts` on a clean checkout and confirm both succeed without Go installed.

**Acceptance Scenarios**:

1. **Given** Go is not installed on the host, **When** `make reindexproducts` is run, **Then** it executes the Python script and exits 0.
2. **Given** Go is not installed on the host, **When** `make indexproducts` is run, **Then** it runs `opensearchinit` then `reindexproducts` via Python, all succeed.
3. **Given** `make` commands are run, **Then** there is no `go mod tidy` or `go run` step in any Makefile target.

---

### Edge Cases

- What happens when the `app/` folder structure conflicts with existing `backend/` or `ai-service/` imports in Docker Compose?
- What if `snapshot_seed.sql` references paths that change during consolidation?
- How should the existing `backend/` and `ai-service/` directories be handled — archived, deleted, or kept in place?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single `app/` directory that contains all Python source code for the REST API, AI/ML logic, and operational scripts.
- **FR-002**: System MUST retire the Go backend entry point; no Go compilation step may be required to start the service.
- **FR-003**: System MUST provide `app/scripts/reindex_products.py` that reads all rows from the PostgreSQL `products` table and bulk-uploads them to the OpenSearch `products` index.
- **FR-004**: The reindex script MUST print a summary line in the format `indexed=N failed=M skipped=K` upon completion.
- **FR-005**: System MUST provide `app/scripts/search_relevance_check.py` that runs the five canonical keyword queries against OpenSearch and prints per-query hit counts.
- **FR-006**: All `make` targets related to indexing (`reindexproducts`, `indexproducts`) MUST invoke the Python scripts, not Go.
- **FR-007**: The `docker-compose.yml` MUST contain an `app` service built from `app/Dockerfile` replacing the existing `backend` and `ai-service` services.
- **FR-008**: The `app` service MUST expose port 8080 and respond to `GET /api/v1/health` with HTTP 200.
- **FR-009**: Existing SQL migration files in `migrations/` MUST remain intact and `make migratedb` MUST continue to work unchanged.
- **FR-010**: The `app` service MUST load configuration from the existing `.env` file with no change to variable names.

### Key Entities

- **`app/` service**: Unified Python process hosting FastAPI routes, SQLAlchemy ORM, opensearch-py client, and AI/ML inference.
- **`app/scripts/`**: Operational Python scripts for data management tasks (reindex, relevance check).
- **`docker-compose.yml` `app` service**: Single Compose entry replacing `backend` + `ai-service`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with no Go toolchain can start the full stack with a single command and reach a working API endpoint within 60 seconds of services becoming healthy.
- **SC-002**: The Python reindex script indexes all PostgreSQL products into OpenSearch with zero failures on the snapshot dataset (8 products).
- **SC-003**: All five keyword relevance queries return at least 1 hit when run against a freshly indexed snapshot dataset.
- **SC-004**: All previously working `make` commands (`migratedb`, `snapshotdb`, `opensearchinit`, `reindexproducts`, `indexproducts`) succeed without Go installed on the host.
- **SC-005**: Docker Compose starts with exactly 3 named services: `app`, `postgres`, `opensearch` — no `backend` or `ai-service` container.

---

## Assumptions

- The existing `backend/` Go source files will be retained in the repo for reference but will not be built or run as part of the stack.
- The existing `ai-service/` Python source and `Dockerfile` will be merged into `app/` — the `ai-service/` folder may be kept as a legacy reference or deleted at the implementer's discretion.
- `snapshot_seed.sql` does not reference any file paths and can remain in `scripts/` unchanged.
- The OpenSearch `products` index mapping (`opensearch/products_mapping.json`) does not change in this spec.
- Database schema and migrations are unchanged; `make migratedb` continues to work as-is.
- The new `app/` service starts with at minimum a health endpoint and the reindex/relevance scripts; full CRUD endpoint implementation is handled in subsequent feature specs.
- `uv` is used as the Python package installer inside the `app/Dockerfile`, consistent with the existing `ai-service/Dockerfile` convention.
