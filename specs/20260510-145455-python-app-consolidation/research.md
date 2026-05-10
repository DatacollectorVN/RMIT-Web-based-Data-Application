# Research: SPEC-04 — Python App Consolidation

## Decision 1: Unified `app/` package structure

**Decision**: Use a flat-but-layered Python package under `app/` with sub-packages `routers/`, `services/`, `repositories/`, `models/`, `schemas/`, `opensearch/`, `ai/`, `scripts/`, `middleware/`.

**Rationale**: Mirrors the existing `ai-service/` directory conventions (already Python) while adding the service and repository layers that were previously in Go. Keeps separation of concerns without deep nesting.

**Alternatives considered**:
- Separate `src/app/` layout (rejected — adds an extra path segment for no coursework benefit)
- Flat single-file app (rejected — violates SPEC-00 layering rule)

---

## Decision 2: FastAPI app factory pattern

**Decision**: `app/main.py` defines the FastAPI app using an app-factory function with `lifespan` context manager for startup/shutdown (DB pool init, OpenSearch client init).

**Rationale**: Lifespan hooks are the FastAPI-recommended pattern for managing shared resources (async DB engine, OpenSearch client). Avoids global-state anti-patterns.

**Alternatives considered**:
- Module-level globals (rejected — hard to test, race conditions on startup)
- Middleware-based init (rejected — adds request overhead)

---

## Decision 3: SQLAlchemy async engine with asyncpg driver

**Decision**: Use `create_async_engine("postgresql+asyncpg://...")` and `AsyncSession` for all DB access, injected via FastAPI `Depends`.

**Rationale**: asyncpg is the fastest Python PostgreSQL driver. SQLAlchemy 2.x async API is stable and integrates cleanly with FastAPI's dependency injection. Existing SQL migration files remain unchanged.

**Alternatives considered**:
- Synchronous SQLAlchemy (rejected — blocks the event loop under load)
- Databases library (rejected — fewer features, smaller community)
- Raw asyncpg without ORM (rejected — SPEC-00 requires SQLAlchemy ORM)

---

## Decision 4: opensearch-py `OpenSearch` client as app-scoped singleton

**Decision**: Instantiate `OpenSearch(hosts=[OPENSEARCH_URL])` once at app startup and store on `app.state.opensearch`. Inject into services via a `get_opensearch` dependency.

**Rationale**: HTTP connections are expensive to create per-request. Single client instance with connection pooling is the opensearch-py recommended pattern.

**Alternatives considered**:
- Per-request client (rejected — connection overhead)
- `AsyncOpenSearch` client (rejected — opensearch-py async support is experimental at 2.6; sync client inside thread executor is safer for coursework)

---

## Decision 5: Python placeholder unit vector for `item_vector`

**Decision**: Port the Go `placeholderUnitVector384` logic to Python using `hashlib.sha256`, normalising to a unit vector. This maintains identical seeding behaviour for the snapshot dataset.

**Rationale**: The Go implementation used SHA-256 byte expansion + L2 normalisation. The Python port uses the same algorithm so indexed documents are byte-compatible with existing snapshot data.

**Alternatives considered**:
- `numpy.random` seeded vector (rejected — non-deterministic across runs)
- Zero vector (rejected — cosinesimil rejects zero vectors, as discovered in SPEC-03)

---

## Decision 6: DATABASE_URL format for SQLAlchemy

**Decision**: `app/config.py` reads `DATABASE_URL` from env and auto-converts `postgres://` prefix to `postgresql+asyncpg://` for SQLAlchemy compatibility. Host `.env` keeps `postgres://` for golang-migrate compatibility.

**Rationale**: golang-migrate requires the `postgres://` scheme. SQLAlchemy asyncpg requires `postgresql+asyncpg://`. A one-line prefix swap in config bridges both without changing `.env`.

**Alternatives considered**:
- Separate `SQLALCHEMY_DATABASE_URL` env var (rejected — doubles config burden)
- golang-migrate accepts `postgresql://` (confirmed — so we can also accept either prefix)

---

## Decision 7: `app/Dockerfile` uses `uv` installer

**Decision**: Use `pip install uv` then `uv pip install --system --no-cache -r requirements.txt`, consistent with the existing `ai-service/Dockerfile` convention.

**Rationale**: `uv` is faster than pip for dependency resolution and already tested in the existing Dockerfile. Keeps both Dockerfiles consistent.

---

## Decision 8: `make reindexproducts` calls `python app/scripts/reindex_products.py`

**Decision**: Remove `cd ./scripts && go mod tidy && go run ./reindex_products.go` from the Makefile and replace with `python app/scripts/reindex_products.py`. The old Go script is kept in `scripts/` but deprecated with a comment.

**Rationale**: Eliminates Go dependency from the host. Python script has identical observable behaviour (same summary line format, same error exits).
