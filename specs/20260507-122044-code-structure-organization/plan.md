# Implementation Plan: SPEC-01 — Code Structure & Project Organisation

**Branch**: `20260507-122044-code-structure-organization` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-122044-code-structure-organization/spec.md`

**Note**: This plan implements the repository layout and documentation required by SPEC-01, using **SPEC-00** (`.specify/memory/constitution.md`) as the normative technical source for names, layering, and stack.

## Summary

Deliver a **monorepo skeleton** that matches constitution §5 (repository layout) and §6 (Go layering), with **root onboarding** linking contributors to the constitution, **local runtime** documentation, and **verifiable layering rules**. No full product features (auth, search, AI endpoints) are required for SPEC-01 closure—only structure, stubs, orchestration placeholders, and docs sufficient to pass SPEC-01 acceptance and onboarding scavenger hunts.

## Technical Context

**Language/Version**: Go 1.22 (minimum per SPEC-00); Python 3.11 (AI service)  
**Primary Dependencies**: Gin v1.10, pgx/v5 v5.5, golang-migrate v4, golang-jwt/jwt/v5 v5.2, opensearch-go/v4 v4.0, godotenv v1.5, google/uuid v1.6, golang.org/x/crypto (bcrypt); FastAPI 0.111, uvicorn 0.30, pydantic v2.x, sentence-transformers 3.0, scikit-learn 1.5, numpy 1.26, joblib 1.4  
**Storage**: PostgreSQL 16 (relational); OpenSearch 2.13 (`products` index, 384-dim vectors per SPEC-00)  
**Testing**: `go test ./...` for Go modules; `pytest` for `ai-service` once tests exist (structure only in SPEC-01)  
**Target Platform**: Docker Compose on developer machines (Linux/macOS); services per SPEC-00 ports 8080 / 8000 / 5432 / 9200  
**Project Type**: Multi-service web backend (public Go REST API + internal Python AI HTTP service + infra)  
**Performance Goals**: Phase 1 local development responsiveness; no formal production SLO in constitution  
**Constraints**: No Kafka/CDC; single public API entry (Go only); raw SQL (no ORM); JWT stateless; UUID v4 from Go before insert; goroutines only in service layer (when code exists)  
**Scale/Scope**: Academic milestone (COSC3801); small team; Phase 1 backend and infra only (React deferred)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate (SPEC-00) | Requirement | Status for this plan |
|----------------|-------------|----------------------|
| §5 Repository layout | `backend/`, `ai-service/`, `migrations/`, `opensearch/`, `scripts/`, `docker-compose.yml`, `.env.example`, `README.md` at repo root | **Pass** — implementation tasks create these paths |
| §6 Layering | `handler → service → repository → domain`; `service` may call `aiclient`, `opensearch`; no upward/circular imports | **Pass** — directory names match; stubs use package names that preserve boundaries |
| §3 Architecture | No Kafka; Go-only public API; async AI via goroutines in service (when implemented) | **Pass** — no contradiction |
| §7 API envelope | Go responses `{ "data": ... }` / `{ "error": ... }` | **N/A** for skeleton (documented in constitution until handlers exist) |
| Phase scope | Phase 1 backend/infra; no Phase 2 frontend required | **Pass** |

**Post-design re-check**: Phase 1 design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) reference SPEC-00 only; no new locked decisions introduced.

## Project Structure

### Documentation (this feature)

```text
specs/20260507-122044-code-structure-organization/
├── plan.md                 # This file
├── research.md             # Phase 0
├── data-model.md           # Phase 1 (structural model)
├── quickstart.md           # Phase 1
├── contracts/              # Phase 1 (local runtime / layout contracts)
│   ├── README.md
│   └── local-runtime.md
└── tasks.md                # Future: /speckit.tasks (not created here)
```

### Source Code (repository root)

Target layout after SPEC-01 implementation (matches SPEC-00 §5; paths relative to repository root `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application`):

```text
backend/
├── main.go
├── go.mod
├── go.sum                    # created after first go mod tidy
├── config/
├── db/
├── middleware/
├── domain/
├── repository/
├── service/
├── handler/
├── router/
├── aiclient/
└── opensearch/
ai-service/
├── main.py
├── Dockerfile
├── requirements.txt
├── routers/
├── models/
├── schemas/
└── artifacts/
migrations/
opensearch/
├── products_mapping.json
└── init.sh
scripts/
docker-compose.yml
.env.example
README.md
docs/
├── repository-layout.md      # human onboarding; mirrors constitution tree
└── layering.md               # copy of layering rules for reviewers
.specify/memory/constitution.md  # SPEC-00 (existing; link from README)
```

**Structure Decision**: **Multi-service monorepo** per SPEC-00: one Go HTTP application under `backend/`, one Python service under `ai-service/`, shared `migrations/` and `opensearch/` at root, `scripts/` for dev tooling, Compose + env template at root. The constitution labels the logical root `beauty-app/`; this repository uses the actual clone root above.

## Ordered implementation phases & tasks

Follow in order. Paths are relative to `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application` unless noted.

---

### Phase A — Top-level layout and orchestration

| Step | Action | File(s) to create or modify |
|------|--------|-----------------------------|
| A.1 | Add Docker Compose stack for Postgres, OpenSearch, Go API, AI service (service names and ports per SPEC-00 §4 infra table). | **Create** `docker-compose.yml` |
| A.2 | Document required environment variables (copy keys from SPEC-00 §10). | **Create** `.env.example` |
| A.3 | Replace minimal root readme with onboarding: project identity, link to `.specify/memory/constitution.md`, directory map, “where to change what” table. | **Modify** `README.md` |

---

### Phase B — Go API skeleton (`backend/`)

| Step | Action | File(s) to create or modify |
|------|--------|-----------------------------|
| B.1 | Initialise module; pin `go 1.22` in `go.mod`. | **Create** `backend/go.mod` |
| B.2 | Minimal `main` that compiles (e.g. prints stub or listens on `PORT` placeholder until Gin wiring in later specs). | **Create** `backend/main.go` |
| B.3 | Create layer directories per §5–§6. Each Go package folder needs at least one `.go` file to compile—use minimal `package <name>` stubs (e.g. `doc.go` or `placeholder.go`). | **Create** `backend/config/doc.go`, `backend/db/doc.go`, `backend/middleware/doc.go`, `backend/domain/doc.go`, `backend/repository/doc.go`, `backend/service/doc.go`, `backend/handler/doc.go`, `backend/router/doc.go`, `backend/aiclient/doc.go`, `backend/opensearch/doc.go` |
| B.4 | Run `go mod tidy` from `backend/` and commit **Create** `backend/go.sum`. | **Create** `backend/go.sum` (via command) |

---

### Phase C — Python AI service skeleton (`ai-service/`)

| Step | Action | File(s) to create or modify |
|------|--------|-----------------------------|
| C.1 | Pin runtime dependencies per SPEC-00 §4 (versions minimum). | **Create** `ai-service/requirements.txt` |
| C.2 | Minimal FastAPI app with health route only (internal service). | **Create** `ai-service/main.py` |
| C.3 | Package dirs for routers/models/schemas; empty `artifacts/` for `.pkl` with git policy documented in README. | **Create** `ai-service/routers/__init__.py`, `ai-service/models/__init__.py`, `ai-service/schemas/__init__.py`, **Create** `ai-service/artifacts/.gitkeep` |
| C.4 | Container build for AI service. | **Create** `ai-service/Dockerfile` |

---

### Phase D — Migrations, OpenSearch config, scripts

| Step | Action | File(s) to create or modify |
|------|--------|-----------------------------|
| D.1 | Ensure migration directory exists; optional placeholder pairs **only if** team wants CI validation—otherwise document naming `000001_create_<table>.{up,down}.sql` and leave empty until SPEC-02. | **Create** `migrations/.gitkeep` **or** placeholder `migrations/000001_placeholder.up.sql` / `migrations/000001_placeholder.down.sql` (delete if SPEC-02 replaces) |
| D.2 | Stub index mapping file and bootstrap script per §5 (mapping evolves in SPEC-03). | **Create** `opensearch/products_mapping.json`, **Create** `opensearch/init.sh` (executable bit set) |
| D.3 | Reserve `scripts/` for `seed_*.go`, `reindex_products.go` (SPEC-02+). | **Create** `scripts/.gitkeep` |

---

### Phase E — Documentation for SPEC-01 acceptance

| Step | Action | File(s) to create or modify |
|------|--------|-----------------------------|
| E.1 | Publish repository tree and “stable vs placeholder” notes. | **Create** `docs/repository-layout.md` |
| E.2 | Document layering diagram and allowed edges (mirror §6); add short **layer audit procedure** (sample packages list for SC-003). | **Create** `docs/layering.md` |
| E.3 | Ensure `README.md` links to `docs/repository-layout.md`, `docs/layering.md`, `quickstart.md` (in feature spec dir or copy summary to root—recommend link to `specs/.../quickstart.md` or duplicate key steps in README). | **Modify** `README.md` |

---

### Phase F — Verification (before merge)

| Step | Action | Evidence |
|------|--------|----------|
| F.1 | Layer audit: from `docs/layering.md`, run `go list` / import graph on agreed packages; zero upward imports. | Record in PR description |
| F.2 | Onboarding scavenger hunt (SPEC-01 US1): three tasks using only `README.md` + `docs/*`. | 90% first-try per SC-001 |
| F.3 | `docker compose config` validates; optional `docker compose up` smoke (may require images). | Logs or CI |

## Complexity Tracking

> No constitution violations required for SPEC-01. This section intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
