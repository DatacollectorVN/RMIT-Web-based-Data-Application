# speckit.constitution.md
> **SPEC-00** · Single source of truth. All other specs in this project inherit from this document.
> Version: 1.0 · Project: Beauty App · Phase: 1 — Backend & Infrastructure

---

## 1. Project identity

| Field | Value |
|---|---|
| Project name | Beauty App — COSC3801 Assignment 3 Milestone II |
| Repo root | `beauty-app/` |
| Constitution ref | SPEC-00 |
| Current phase | Phase 1 — Backend & infrastructure (UI deferred to Phase 2) |
| Spec tool | speckit — each spec is numbered SPEC-0N and references this file |

### Phase scope

**In scope (Phase 1)**
- Go REST API (Gin)
- PostgreSQL schema & migrations
- OpenSearch index mapping & queries
- Python AI microservice (FastAPI)
- Docker Compose orchestration
- Seed data & dev scripts

**Deferred (Phase 2)**
- React + TypeScript frontend

**Never in scope**
- Kafka / Debezium CDC
- Cloud deployment / CI-CD pipeline
- Payment processing

---

## 2. Spec index

| Spec | Title | Status |
|---|---|---|
| SPEC-00 | Constitution (this document) | active |
| SPEC-01 | Code structure & project organisation | active |
| SPEC-02 | PostgreSQL schema & migrations | planned |
| SPEC-03 | OpenSearch index mapping & search logic | planned |
| SPEC-04 | Go API — auth endpoints | planned |
| SPEC-05 | Go API — product & search endpoints (Task 1) | planned |
| SPEC-06 | Go API — review & async AI label (Task 2) | planned |
| SPEC-07 | Go API — recommendations (Task 3) | planned |
| SPEC-08 | Python AI service — all three endpoints | planned |
| SPEC-09 | Docker Compose & environment config | planned |

---

## 3. Architecture decisions (locked)

These decisions are final. Individual specs must not contradict them.

| Decision | Choice | Reason |
|---|---|---|
| No Kafka / Debezium | Go goroutines for async | Reduces operational complexity for academic scope |
| Single API entry point | Go backend only | React never calls Python directly |
| Async AI label | Goroutine after 201 response | User is not blocked waiting for ML model |
| Vector store | OpenSearch knn_vector | Handles both fuzzy search (T1) and k-NN (T3) in one engine |
| Auth strategy | JWT stateless | No session store needed |
| ID generation | UUID v4 in Go before insert | Predictable, no DB round-trip for ID |
| Migration tool | golang-migrate (SQL files) | Version-controlled schema, simple rollback |
| ORM | None — raw pgx/v5 | Full SQL control, no magic |

---

## 4. Tech stack (canonical)

All version pins are minimums. Patch upgrades are allowed; minor/major require a constitution update.

### Go API

| Package | Min version | Purpose |
|---|---|---|
| `go` | 1.22 | Language runtime |
| `github.com/gin-gonic/gin` | v1.10 | HTTP router & middleware |
| `github.com/jackc/pgx/v5` | v5.5 | PostgreSQL driver + connection pool |
| `github.com/golang-migrate/migrate/v4` | v4.17 | SQL migration runner |
| `github.com/golang-jwt/jwt/v5` | v5.2 | JWT creation & validation |
| `golang.org/x/crypto` | latest | bcrypt password hashing |
| `github.com/opensearch-project/opensearch-go/v4` | v4.0 | OpenSearch client |
| `github.com/google/uuid` | v1.6 | UUID v4 generation |
| `github.com/joho/godotenv` | v1.5 | Load `.env` in development |

### Python AI service

| Package | Min version | Purpose |
|---|---|---|
| `python` | 3.11 | Language runtime |
| `fastapi` | 0.111 | API framework |
| `uvicorn` | 0.30 | ASGI server |
| `sentence-transformers` | 3.0 | all-MiniLM-L6-v2 embeddings (384-dim) |
| `scikit-learn` | 1.5 | Load Milestone 1 classifier |
| `pydantic` | v2.7 | Request/response schema validation |
| `numpy` | 1.26 | Vector math for blending |
| `joblib` | 1.4 | Deserialise `.pkl` model artifacts |

### Infrastructure

| Service | Image | Port | Role |
|---|---|---|---|
| Go API | `golang:1.22-alpine` | 8080 | Primary REST backend |
| Python AI | `python:3.11-slim` | 8000 | Internal AI service |
| PostgreSQL | `postgres:16-alpine` | 5432 | Relational data store |
| OpenSearch | `opensearchproject/opensearch:2.13.0` | 9200 | Search + vector index |

---

## 5. Repository layout

```
beauty-app/
├── backend/                  # Go API
│   ├── main.go
│   ├── go.mod / go.sum
│   ├── config/
│   ├── db/
│   ├── middleware/
│   ├── domain/               # pure structs, no deps
│   ├── repository/           # all SQL lives here
│   ├── service/              # business logic
│   ├── handler/              # HTTP handlers (thin)
│   ├── router/
│   ├── aiclient/             # HTTP client → Python
│   └── opensearch/           # OS query helpers
├── ai-service/               # Python FastAPI
│   ├── main.py
│   ├── routers/
│   ├── models/
│   ├── schemas/
│   ├── artifacts/            # .pkl files from Milestone 1
│   ├── requirements.txt
│   └── Dockerfile
├── migrations/               # golang-migrate SQL files
│   ├── 000001_create_users.up.sql
│   ├── 000001_create_users.down.sql
│   ├── 000002_create_products.up.sql
│   ├── 000002_create_products.down.sql
│   ├── 000003_create_reviews.up.sql
│   ├── 000003_create_reviews.down.sql
│   ├── 000004_create_orders.up.sql
│   └── 000004_create_orders.down.sql
├── opensearch/
│   ├── products_mapping.json # index mapping (fuzzy + knn_vector)
│   └── init.sh               # apply mapping on first boot
├── scripts/
│   ├── seed_products.go
│   ├── seed_users.go
│   └── reindex_products.go   # bulk embed + push to OpenSearch
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 6. Layering rule (Go API)

```
handler → service → repository → domain
                 ↘ aiclient
                 ↘ opensearch
```

- **handler** — parse HTTP request, call service, write HTTP response. No SQL. No business logic.
- **service** — orchestrate business logic. Call repository, aiclient, opensearch. Spawn goroutines.
- **repository** — all SQL queries. No HTTP. No business logic.
- **domain** — plain Go structs and enums. Zero external dependencies.
- **aiclient** — HTTP client that calls the Python AI service. Called from service layer only.
- **opensearch** — query builders and index helpers. Called from service layer only.

**Rule:** No layer may import a layer above it. No circular imports.

---

## 7. API conventions

### Base URLs

| Service | Base URL (local) |
|---|---|
| Go API (public) | `http://localhost:8080/api/v1` |
| Python AI (internal) | `http://ai-service:8000` |

### Request / response envelope

All Go API responses use this envelope:

```json
// success
{ "data": { ... } }

// list with pagination
{ "data": { "total": 120, "page": 1, "limit": 20, "items": [ ... ] } }

// error
{ "error": "human-readable message" }
```

Python AI responses are bare JSON (no envelope) — consumed internally by Go only.

### HTTP status codes

| Code | When |
|---|---|
| 200 | Successful GET or PATCH |
| 201 | Successful POST (resource created) |
| 400 | Validation error / bad request body |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but not authorised |
| 404 | Resource not found |
| 500 | Unexpected server error |

### Auth header

```
Authorization: Bearer <JWT_TOKEN>
```

Protected routes must declare `middleware.Auth()` in the router. Public routes (search, product list, product detail) do not.

### Pagination query params

| Param | Type | Default | Max |
|---|---|---|---|
| `page` | int | 1 | — |
| `limit` | int | 20 | 100 |

---

## 8. Database conventions

### PostgreSQL

- All primary keys: `UUID` generated in Go, not in the database.
- All timestamps: `TIMESTAMPTZ` with `DEFAULT NOW()`.
- All table names: `snake_case` plural (e.g. `order_items`).
- All column names: `snake_case`.
- Foreign keys: always named `<table_singular>_id` (e.g. `user_id`, `product_id`).
- Soft deletes: not used in Phase 1 — hard delete only.

### Migration file naming

```
000001_create_<table>.up.sql
000001_create_<table>.down.sql
```

Run command:
```bash
migrate -path ./migrations -database $DATABASE_URL up
```

### OpenSearch

- Index name: `products`
- Vector field: `item_vector`, dimension 384, space `cosinesimil`, engine `nmslib`, method `hnsw`
- Analyser: `beauty_analyzer` with synonym filter for brand name variants
- All index mapping changes require a versioned JSON file in `opensearch/`

---

## 9. Naming conventions

| Context | Convention | Example |
|---|---|---|
| Go files | `snake_case.go` | `review_service.go` |
| Go exported types | `PascalCase` | `ReviewService` |
| Go unexported | `camelCase` | `parseLabel` |
| Go interfaces | `PascalCase` + suffix `-er` or `-Repository` | `ReviewRepository` |
| SQL tables | `snake_case` plural | `order_items` |
| SQL columns | `snake_case` | `final_label` |
| JSON fields (API) | `snake_case` | `product_id` |
| ENV vars | `SCREAMING_SNAKE_CASE` | `JWT_SECRET` |
| Python files | `snake_case.py` | `sentiment_model.py` |
| Python classes | `PascalCase` | `SentimentModel` |
| Docker services | `kebab-case` | `ai-service` |

---

## 10. Environment variables

All secrets and config are in `.env`. Never hardcoded. `.env` is in `.gitignore`.

```bash
# PostgreSQL
DATABASE_URL=postgres://user:pass@localhost:5432/beautyapp

# Go API
PORT=8080
JWT_SECRET=change-me-in-production
JWT_EXPIRY_HOURS=72

# Python AI service
AI_SERVICE_URL=http://ai-service:8000
AI_SERVICE_TIMEOUT_SEC=30

# OpenSearch
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_INDEX_PRODUCTS=products

# App
ENV=development
```

---

## 11. Goroutine rules

These rules apply to every goroutine spawned in the project.

1. Goroutines are only spawned in the **service layer**. Never in handlers.
2. Every goroutine must `recover()` from panics and log the error.
3. Goroutines always receive a `context.Background()` — never the request context (which gets cancelled when the HTTP response is sent).
4. Goroutines must never write to the HTTP response after it has been sent.
5. Goroutine errors are logged — never silently swallowed.

```go
// canonical goroutine pattern in service layer
go func(reviewID string, content string) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("goroutine panic: %v", r)
        }
    }()
    // ... AI call and DB update
}(review.ID, review.Content)
```

---

## 12. Error handling conventions

```go
// wrap errors with context at every layer boundary
return fmt.Errorf("review_service.CreateReview: %w", err)

// handler converts to HTTP response
if errors.Is(err, domain.ErrNotFound) {
    c.JSON(404, gin.H{"error": "resource not found"})
    return
}
```

Sentinel errors live in `domain/errors.go`:
- `domain.ErrNotFound`
- `domain.ErrUnauthorised`
- `domain.ErrConflict`

---

## 13. Glossary

| Term | Definition |
|---|---|
| **constitution** | This file (SPEC-00). The root source of truth for all project specs. |
| **spec** | A numbered speckit document describing one area of implementation. |
| **goroutine** | A Go lightweight thread used for async AI label generation after review submission. |
| **pending label** | The state of a review immediately after POST — AI processing not yet complete. |
| **final label** | The label stored on a review after AI prediction, optionally overridden by the user. |
| **item_vector** | 384-dimensional float array produced by sentence-transformers for a product description. |
| **hybrid_vector** | Weighted blend of item_vector and user preference signal, used for personalised recommendations. |
| **cold start** | Recommendation state when a user has no order history — falls back to content-only similarity. |
| **beauty_analyzer** | Custom OpenSearch analyser with synonym filter for brand name normalisation. |
| **T1 / T2 / T3** | Shorthand for Task 1 (search), Task 2 (review + label), Task 3 (recommendations). |
| **Phase 1** | Backend & infrastructure milestone — Go, PostgreSQL, OpenSearch, Python AI. |
| **Phase 2** | Frontend milestone — React + TypeScript (deferred). |
| **M1 artifacts** | Trained ML model files (.pkl) from Milestone 1 used by the Python AI service. |
| **re-rank** | In-memory scoring step in Go after k-NN retrieval: `score = 0.6 × item_sim + 0.4 × user_pref`. |
