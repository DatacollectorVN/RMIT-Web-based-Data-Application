<!--
SYNC IMPACT REPORT
==================
Version change: 2.1 → 2.2 (MINOR)

Reason for MINOR bump (2026-05-11, media-ui-and-cpu-torch):
  - Add runtime product photo storage mounted at `/media` and persisted at `data/product-photos/`
  - Add `ui` container (nginx) for simple HTML/CSS test client in Phase 1
  - Add `PRODUCT_PHOTOS_DIR` environment variable (bind mount in docker-compose)
  - ML dependencies: force CPU-only PyTorch wheels (avoid NVIDIA/CUDA packages in containers)
  - Password hashing: use `bcrypt` directly (avoid passlib/bcrypt backend incompatibilities)

Modified sections: §1 Phase scope · §4 Tech stack · §5 Repository layout · §7 API conventions · §10 Environment variables

---

Version change (historical): 1.0 → 2.0 (MAJOR)

Reason for MAJOR bump:
  - Go backend (Gin / pgx / opensearch-go) fully retired.
  - Two services (backend + ai-service) merged into one Python `app` service.
  - ORM strategy changed from "no ORM (raw pgx/v5)" to SQLAlchemy ORM.
  - OpenSearch client changed from opensearch-go to opensearch-py.
  - Language runtime for API layer changed from Go to Python.

Modified principles / sections:
  § 1 Phase scope          — Go REST API removed; "Python app service" added
  § 3 Architecture decisions — "Single API entry point" updated (Python, not Go);
                              "ORM: None" replaced by "SQLAlchemy 2.x";
                              Go goroutine decision replaced by FastAPI BackgroundTasks;
                              "ID generation in Go" updated to Python uuid4
  § 4 Tech stack           — Go API section removed; Python app section expanded;
                              Infrastructure table updated (one `app` row, ai-service row removed)
  § 5 Repository layout    — backend/ + ai-service/ replaced by app/
  § 6 Layering rule        — Go-specific diagram replaced by Python/FastAPI diagram
  § 7 API conventions      — base URLs updated to Python service
  § 9 Naming conventions   — Go file/type conventions removed; Python conventions kept
  § 11 Goroutine rules     — replaced by FastAPI async/background-task rules
  § 12 Error handling      — replaced by FastAPI/Python exception conventions
  § 13 Glossary            — goroutine entry updated; new entries added

Templates status:
  ✅ .specify/templates/plan-template.md   — Language/Version placeholder is generic; no change needed
  ✅ .specify/templates/spec-template.md   — Technology-agnostic; no change needed
  ✅ .specify/templates/tasks-template.md  — Generic paths; no change needed

Files requiring follow-up:
  ⚠ docs/layering.md          — still references Go package names; update when next spec touches it
  ⚠ docs/layering-audit.md    — Go-specific audit; mark as superseded
  ⚠ docs/repository-layout.md — references Go repo tree; update when restructure spec runs
  ⚠ README.md                 — "Where to change what" table references Go dirs; update with restructure spec
  ⚠ backend/                  — existing Go code; retire folder in restructure spec
  ⚠ ai-service/               — existing Python service; merge into app/ in restructure spec

Deferred placeholders: none
-->

# speckit.constitution.md
> **SPEC-00** · Single source of truth. All other specs in this project inherit from this document.
> Version: 2.2 · Project: Beauty App · Phase: 1 — Backend & Infrastructure

---

## 1. Project identity

| Field | Value |
|---|---|
| Project name | Beauty App — COSC3801 Assignment 3 Milestone II |
| Repo root | `beauty-app/` |
| Constitution ref | SPEC-00 |
| Current phase | Phase 1 — Backend & infrastructure (simple UI allowed for smoke-testing only) |
| Spec tool | speckit — each spec is numbered SPEC-0N and references this file |

### Phase scope

**In scope (Phase 1)**
- Python `app` service — FastAPI REST API + SQLAlchemy ORM + opensearch-py + AI/ML in one process
- PostgreSQL schema & migrations
- OpenSearch index mapping & queries
- Docker Compose orchestration
- Seed data & dev scripts
- Simple `ui/` test client (HTML/CSS) served by nginx in Docker Compose
- Runtime product photo storage under `data/product-photos/` mounted into the app and served at `/media`

**Deferred (Phase 2)**
- React + TypeScript frontend

**Never in scope**
- Kafka / Debezium CDC
- Cloud deployment / CI-CD pipeline
- Payment processing

---

## 3. Architecture decisions (locked)

These decisions are final. Individual specs MUST NOT contradict them.

| Decision | Choice | Reason |
|---|---|---|
| No Kafka / Debezium | FastAPI BackgroundTasks for async | Reduces operational complexity for academic scope |
| Single API entry point | Python `app` service only | React never calls any other service directly |
| Async AI label | FastAPI BackgroundTask after 201 response | User is not blocked waiting for ML model |
| Vector store | OpenSearch knn_vector via opensearch-py | Handles both fuzzy search and k-NN in one engine |
| Auth strategy (Phase 1) | None required — public HTTP API | Coursework / demo simplicity; JWT may return in Phase 2 |
| ID generation | PostgreSQL `BIGINT GENERATED BY DEFAULT AS IDENTITY` | Monotonic integer PKs; optional explicit ids in seed scripts |
| Migration tool | `app/scripts/migrate.py` + SQL files in `app/migrations/` | Versioned SQL; `up` / `down` / `reapply` without golang-migrate CLI |
| ORM | SQLAlchemy 2.x (async) | Type-safe models, async session support, Pythonic DX |
| AI + API co-location | Single `app` process | Eliminates inter-service HTTP overhead; simplifies Compose |

---

## 4. Tech stack (canonical)

All version pins are minimums. Patch upgrades are allowed; minor/major require a constitution update.

### Python `app` service

| Package | Min version | Purpose |
|---|---|---|
| `python` | 3.11 | Language runtime |
| `fastapi` | 0.111 | HTTP router & dependency injection |
| `uvicorn` | 0.30 | ASGI server |
| `sqlalchemy` | 2.0 | ORM + async session management |
| `asyncpg` | 0.29 | Async PostgreSQL driver (used by SQLAlchemy) |
| `pydantic` | v2.7 | Request/response schema validation |
| `bcrypt` | 4.x | Password hashing for stored credentials (Phase 1 public API, but passwords still stored) |
| `opensearch-py` | 2.6 | OpenSearch client (keyword + knn_vector queries) |
| `torch` | CPU-only | Required by `sentence-transformers` for embedding inference (CPU wheels only; no CUDA) |
| `sentence-transformers` | 3.0 | all-MiniLM-L6-v2 embeddings (384-dim) |
| `scikit-learn` | 1.5 | Load Milestone 1 classifier |
| `numpy` | 1.26 | Vector math for blending |
| `joblib` | 1.4 | Deserialise `.pkl` model artifacts |
| `python-dotenv` | 1.0 | Load `.env` in development |

### Infrastructure

| Service | Image | Port | Role |
|---|---|---|---|
| Python app | `python:3.11-slim` | 8080 | Primary REST API + AI/ML |
| PostgreSQL | `postgres:16-alpine` | 5432 | Relational data store |
| OpenSearch | `opensearchproject/opensearch:2.13.0` | 9200 | Search + vector index |
| UI (test client) | `nginx:alpine` | 3000 | Static HTML/CSS smoke-test UI (Phase 1 only) |

---

## 5. Repository layout

```
beauty-app/
├── app/                          # Unified Python service (FastAPI + AI/ML)
│   ├── main.py                   # FastAPI app factory, lifespan hooks
│   ├── config.py                 # Settings (pydantic-settings / dotenv)
│   ├── database.py               # SQLAlchemy async engine + session factory
│   ├── models/                   # SQLAlchemy ORM model classes
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── review.py
│   │   ├── order.py
│   │   └── order_item.py
│   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── review.py
│   │   └── order.py
│   ├── repositories/             # All DB queries via SQLAlchemy (no raw SQL in services)
│   │   ├── user_repo.py
│   │   ├── product_repo.py
│   │   ├── review_repo.py
│   │   └── order_repo.py
│   ├── services/                 # Business logic; calls repositories + opensearch + ai
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── review_service.py
│   │   ├── order_service.py
│   │   └── recommendation_service.py
│   ├── routers/                  # FastAPI APIRouter definitions (thin — call service only)
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── reviews.py
│   │   └── orders.py
│   ├── middleware/               # Auth, CORS, logging middleware
│   │   └── auth.py
│   ├── opensearch/               # opensearch-py query builders + index helpers
│   │   ├── client.py
│   │   ├── query_builder.py
│   │   ├── keyword_search.py
│   │   ├── semantic_search.py
│   │   └── fallback_logic.py
│   ├── ai/                       # ML model loading + inference helpers
│   │   ├── embedder.py           # sentence-transformers wrapper
│   │   └── classifier.py        # scikit-learn .pkl loader
│   ├── artifacts/                # .pkl files from Milestone 1
│   ├── migrations/               # SQL files applied by app/scripts/migrate.py
│   ├── scripts/                  # migrate.py, snapshotdb.py, reindex_products.py, …
│   ├── pyproject.toml / uv.lock
│   └── Dockerfile
├── opensearch/
│   ├── products_mapping.json     # active mapping (fuzzy + knn_vector; product_id: long)
│   ├── products_mapping.v1.json  # legacy keyword product_id
│   ├── products_mapping.v2.json  # long product_id
│   └── init.sh                   # idempotent index bootstrap
├── scripts/                      # optional legacy / deprecated helpers
├── data/
│   └── product-photos/            # runtime product image storage (bind mount on EC2; gitignored except docs)
├── ui/                            # simple HTML/CSS test UI (served by nginx in docker-compose)
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

---

## 6. Layering rule (Python `app`)

```
router → service → repository → models (SQLAlchemy)
               ↘ opensearch/
               ↘ ai/
```

- **router** — parse HTTP request via Pydantic schema, call service, return response schema. No DB. No business logic.
- **service** — orchestrate business logic. Call repositories, opensearch helpers, AI helpers. Schedule BackgroundTasks.
- **repository** — all DB access via SQLAlchemy async sessions. No HTTP. No business logic.
- **models** — SQLAlchemy ORM classes. Zero business logic. No circular imports.
- **opensearch/** — opensearch-py query builders and index helpers. Called from service layer only.
- **ai/** — embedding + inference helpers. Called from service layer only.

**Rule:** No layer may import a layer above it. No circular imports.

---

## 7. API conventions

### Base URLs

| Service | Base URL (local) |
|---|---|
| Python app (public) | `http://localhost:8080/api/v1` |
| UI test client (nginx) | `http://localhost:3000` |

### Request / response envelope

All API responses use this envelope:

```json
// success
{ "data": { ... } }

// list with pagination
{ "data": { "total": 120, "page": 1, "limit": 20, "items": [ ... ] } }

// error
{ "error": "human-readable message" }
```

### HTTP status codes

| Code | When |
|---|---|
| 200 | Successful GET or PATCH |
| 201 | Successful POST (resource created) |
| 400 | Validation error / bad request body |
| 401 | Unauthenticated (reserved; not used for missing JWT in Phase 1 public API) |
| 403 | Forbidden |
| 404 | Resource not found |
| 500 | Unexpected server error |

### Authentication (Phase 1)

No `Authorization` header is required. All routes shipped in Phase 1 are **public**. When JWT auth returns (Phase 2+), protected routes will declare a `get_current_user` dependency; until then, do not require bearer tokens to run the stack.

### Static media (Phase 1)

- Product photos are stored under `PRODUCT_PHOTOS_DIR` and served by the app at `/media/...`.
- The `photos.url` field stores a *public path* such as `/media/products/<product_id>/<photo_id>.png`.
- The UI must load images by HTTP URL; it MUST NOT attempt filesystem access.

### CORS (Phase 1)

- The API is public in Phase 1; CORS may allow all origins for local docker testing.
- If deployed behind a domain, restrict origins at the reverse proxy or via FastAPI middleware.

### Pagination query params

| Param | Type | Default | Max |
|---|---|---|---|
| `page` | int | 1 | — |
| `limit` | int | 20 | 100 |

---

## 8. Database conventions

### PostgreSQL

- All primary keys: `BIGINT` with `GENERATED BY DEFAULT AS IDENTITY` in PostgreSQL (or explicit integers in seed data). Application omits `id` on insert unless supplying a seed value.
- All timestamps: `TIMESTAMPTZ` with `DEFAULT NOW()` in SQL; `DateTime(timezone=True)` in SQLAlchemy.
- All table names: `snake_case` plural (e.g. `order_items`).
- All column names: `snake_case`.
- Foreign keys: always named `<table_singular>_id` (e.g. `user_id`, `product_id`).
- Soft deletes: not used in Phase 1 — hard delete only.

### Migration file naming

```
000001_create_<table>.up.sql
000001_create_<table>.down.sql
```

Run commands:
```bash
make migratedb          # apply all (delegates to app/Makefile + uv run)
make migratedbreapply   # drop all and reapply
make migratedbdown1     # roll back one step
```

### OpenSearch

- Index name: `products`
- `product_id` field: `long` (same integer as `products.id` in PostgreSQL)
- Vector field: `item_vector`, dimension 384, space `cosinesimil`, engine `nmslib`, method `hnsw`
- Analyser: `beauty_analyzer` with synonym filter for brand name variants
- All index mapping changes require a versioned JSON file in `opensearch/`
- Python client: `opensearch-py` (`OpenSearch` class)

---

## 9. Naming conventions

| Context | Convention | Example |
|---|---|---|
| Python files | `snake_case.py` | `review_service.py` |
| Python classes | `PascalCase` | `ReviewService` |
| Python functions/vars | `snake_case` | `parse_label` |
| SQLAlchemy models | `PascalCase` (singular) | `Product`, `OrderItem` |
| Pydantic schemas | `PascalCase` + suffix `Create`/`Response`/`Update` | `ProductResponse` |
| FastAPI routers | `snake_case` module, `APIRouter` instance | `router = APIRouter()` |
| SQL tables | `snake_case` plural | `order_items` |
| SQL columns | `snake_case` | `final_label` |
| JSON fields (API) | `snake_case` | `product_id` |
| ENV vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` |
| Docker services | `kebab-case` | `app`, `opensearch` |

---

## 10. Environment variables

All secrets and config are in `.env`. Never hardcoded. `.env` is in `.gitignore`.

```bash
# PostgreSQL (asyncpg URL for local app; scripts may use postgres://)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/rmit

# Python app
PORT=8080

# OpenSearch
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_INDEX_PRODUCTS=products

# Media storage
# Docker Compose bind-mounts ./data/product-photos into the app at this path.
PRODUCT_PHOTOS_DIR=/var/lib/beauty-app/product-photos

# App
ENV=development

# Phase 2+ (optional — not required to boot Phase 1)
# JWT_SECRET=...
# JWT_EXPIRY_HOURS=72
```

---

## 11. Async / background task rules

These rules apply to every background task in the project.

1. Background tasks are only scheduled in the **service layer** via FastAPI `BackgroundTasks`. Never in routers.
2. Every background task function MUST handle its own exceptions and log them — never silently swallow errors.
3. Background tasks MUST NOT depend on the request lifecycle (e.g., no dependency injection from the request).
4. Background tasks MUST NOT write to the HTTP response.
5. Long-running background tasks SHOULD use a dedicated async session, not the request session.

```python
# canonical background task pattern in service layer
def run_ai_label(review_id: int, content: str) -> None:
    try:
        # ... call AI helper and update DB
        pass
    except Exception as exc:
        logger.error("background ai label failed: %s", exc)

# in service method:
background_tasks.add_task(run_ai_label, review.id, review.content)
```

---

## 12. Error handling conventions

```python
# raise domain exceptions from repository / service
from app.exceptions import NotFoundError, ConflictError, UnauthorisedError

# raise in repository
if not result:
    raise NotFoundError(f"product {product_id} not found")

# catch in router and map to HTTP response
@router.get("/{product_id}")
async def get_product(product_id: int, service: ProductService = Depends()):
    try:
        return {"data": await service.get(product_id)}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
```

Sentinel exceptions live in `app/exceptions.py`:
- `NotFoundError`
- `UnauthorisedError`
- `ConflictError`
- `ValidationError` (maps to 400)

---

## 13. Glossary

| Term | Definition |
|---|---|
| **constitution** | This file (SPEC-00). The root source of truth for all project specs. |
| **spec** | A numbered speckit document describing one area of implementation. |
| **background task** | A FastAPI `BackgroundTask` used for async AI label generation after review submission. |
| **pending label** | The state of a review immediately after POST — AI processing not yet complete. |
| **final label** | The label stored on a review after AI prediction, optionally overridden by the user. |
| **item_vector** | 384-dimensional float array produced by sentence-transformers for a product description. |
| **hybrid_vector** | Weighted blend of item_vector and user preference signal, used for personalised recommendations. |
| **cold start** | Recommendation state when a user has no order history — falls back to content-only similarity. |
| **beauty_analyzer** | Custom OpenSearch analyser with synonym filter for brand name normalisation. |
| **T1 / T2 / T3** | Shorthand for Task 1 (search), Task 2 (review + label), Task 3 (recommendations). |
| **Phase 1** | Backend & infrastructure milestone — Python app, PostgreSQL, OpenSearch. |
| **Phase 2** | Frontend milestone — React + TypeScript (deferred). |
| **M1 artifacts** | Trained ML model files (.pkl) from Milestone 1 used by the `app` AI layer. |
| **re-rank** | In-memory scoring step in Python after k-NN retrieval: `score = 0.6 × item_sim + 0.4 × user_pref`. |
| **app** | The unified Python service (FastAPI + SQLAlchemy + opensearch-py + AI/ML). |
