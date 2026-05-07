---
description: "Task list for SPEC-01 — Code structure & project organisation"
---

# Tasks: SPEC-01 — Code Structure & Project Organisation

**Input**: Design documents from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-122044-code-structure-organization/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Not requested in [spec.md](./spec.md); no test tasks included.

**Organization**: Phases follow speckit template: Setup → Foundational (blocks all stories) → User Stories P1→P3 → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no ordering dependency within the same phase)
- **[Story]**: [US1] / [US2] / [US3] for user-story phases only
- Paths below are under repository root `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/` unless noted

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create root-level orchestration and reserved folders so later phases have stable paths.

- [x] T001 [P] Create Docker Compose stack at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docker-compose.yml` (Postgres 16, OpenSearch 2.13, Go API, `ai-service`; ports per [contracts/local-runtime.md](./contracts/local-runtime.md) and SPEC-00)
- [x] T002 [P] Create environment template at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/.env.example` with all keys from SPEC-00 §10 (placeholder values only)
- [x] T003 [P] Create scripts placeholder at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/scripts/.gitkeep`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Monorepo skeleton (Go layers, AI service, migrations root, OpenSearch assets, backend image) required before any user story verification.

**⚠️ CRITICAL**: User story phases MUST NOT start until this phase is complete.

- [x] T004 Create Go module at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/go.mod` with `go 1.22` and module path chosen per [plan.md](./plan.md)
- [x] T005 Create entrypoint at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/main.go` (minimal compiles; `PORT` from env optional)
- [x] T006 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/config/doc.go`
- [x] T007 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/db/doc.go`
- [x] T008 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/middleware/doc.go`
- [x] T009 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/domain/doc.go`
- [x] T010 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/repository/doc.go`
- [x] T011 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/service/doc.go`
- [x] T012 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/handler/doc.go`
- [x] T013 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/router/doc.go`
- [x] T014 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/aiclient/doc.go`
- [x] T015 [P] Create package stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/opensearch/doc.go`
- [x] T016 Run `go mod tidy` in `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/` and commit `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/go.sum`
- [x] T017 [P] Create Python dependencies file at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/requirements.txt` (minimum versions per SPEC-00 §4)
- [x] T018 Create FastAPI stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/main.py` (health route only)
- [x] T019 [P] Create package marker at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/routers/__init__.py`
- [x] T020 [P] Create package marker at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/models/__init__.py`
- [x] T021 [P] Create package marker at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/schemas/__init__.py`
- [x] T022 [P] Create artifacts placeholder at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/artifacts/.gitkeep`
- [x] T023 Create container build at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/ai-service/Dockerfile`
- [x] T024 Create migrations directory marker at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/.gitkeep` (document `00000N_*.{up,down}.sql` naming in docs; no fake schema unless team chooses)
- [x] T025 [P] Create index mapping stub at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/products_mapping.json` (evolves in SPEC-03)
- [x] T026 Create bootstrap script at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/opensearch/init.sh` (executable; applies mapping per [plan.md](./plan.md))
- [x] T027 Create Go API image build at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/backend/Dockerfile` consistent with `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docker-compose.yml`

**Checkpoint**: `go build ./...` from `backend/` succeeds; `ai-service` structure exists; Compose can reference both images.

---

## Phase 3: User Story 1 — Find the right place to change behavior (Priority: P1) 🎯 MVP

**Goal**: Contributors locate public API vs AI service vs migrations vs AI client boundary using only onboarding docs ([spec.md](./spec.md) US1).

**Independent Test**: Facilitated scavenger hunt (three tasks: HTTP surface, schema migrations, AI integration boundary) using only `README.md` and `docs/*`; track first-try success toward SC-001.

### Implementation for User Story 1

- [x] T028 [US1] Create repository map at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docs/repository-layout.md` (tree, stable vs placeholder areas, pointer to SPEC-00 at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/.specify/memory/constitution.md`)
- [x] T029 [US1] Rewrite onboarding at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/README.md` (project identity, constitution link, directory map, “where to change what” for handler/router/repository/migration/AI client/OpenSearch/scripts)

**Checkpoint**: New contributor can answer US1 acceptance scenario 1–3 using only `README.md` + `docs/repository-layout.md` (and linked constitution).

---

## Phase 4: User Story 2 — Verify layering rules are enforceable (Priority: P2)

**Goal**: Documented Go layering matches SPEC-00 §6 and is auditable with zero forbidden imports (SC-003).

**Independent Test**: Apply the audit procedure in `docs/layering.md` to the agreed sample packages; confirm no upward/circular imports.

### Implementation for User Story 2

- [x] T030 [US2] Create layering guide at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docs/layering.md` (diagram, allowed edges, forbidden edges, agreed sample list: `handler`, `service`, `repository`, `domain`, `aiclient`, `opensearch`, `router`, `middleware`, `config`, `db`)
- [x] T031 [US2] Create audit record at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docs/layering-audit.md` (date, commands used e.g. `go list`, import graph tool, pass/fail per package, sign-off for SC-003)

**Checkpoint**: Maintainer can enforce US2 acceptance without guessing rules.

---

## Phase 5: User Story 3 — Operate and bootstrap locally (Priority: P3)

**Goal**: Clean clone → healthy local stack within SC-004 time budget using documented steps only.

**Independent Test**: Follow [quickstart.md](./quickstart.md) from clean clone; dependencies and primary API respond; migration/OpenSearch steps documented.

### Implementation for User Story 3

- [x] T032 [US3] Update runtime contract at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-122044-code-structure-organization/contracts/local-runtime.md` so service names, ports, and env keys match `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docker-compose.yml` and `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/.env.example`
- [x] T033 [US3] Update bootstrap guide at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-122044-code-structure-organization/quickstart.md` (exact compose commands, migrate invocation when SPEC-02 lands, `opensearch/init.sh` usage)
- [x] T034 [US3] Extend `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/README.md` with “Local development” linking to `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-122044-code-structure-organization/quickstart.md` and summarising one-path happy flow

**Checkpoint**: US3 acceptance scenarios 1–2 satisfied from docs + repo layout.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: SPEC-01 success criteria, hygiene, and compose validation.

- [x] T035 Run SPEC-01 onboarding scavenger hunt; if SC-001 not met, update `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/README.md` and/or `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docs/repository-layout.md` until exercises pass
- [x] T036 [P] Run `docker compose config` from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/`; fix `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docker-compose.yml` if validation fails
- [x] T037 [P] Update `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/.gitignore` for `.env`, `ai-service/.venv/`, and other local artifacts documented in [quickstart.md](./quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**.
- **Phases 3–5 (US1–US3)**: All depend on Phase 2 completion. US1 → US2 → US3 is the **recommended** order (docs build on real tree; US3 docs should reference final Compose).
- **Phase 6 (Polish)**: Depends on Phases 3–5 for meaningful SC-001/SC-004 validation.

### User Story Dependencies

| Story | Depends on | Can parallelise with |
|-------|------------|------------------------|
| **US1 (P1)** | Phase 2 complete | — (sequential: `docs/repository-layout.md` before final `README.md` pass recommended) |
| **US2 (P2)** | Phase 2 complete | US1 in parallel only if README links added after `docs/layering.md` exists — safer after US1 |
| **US3 (P3)** | Phase 1–2 complete | Best after `docker-compose.yml` / Dockerfiles stable (end of Phase 2) |

### Within Each User Story

- **US1**: Repository map file before final README polish (or single pass with two files).
- **US2**: `docs/layering.md` before `docs/layering-audit.md`.
- **US3**: Contract → quickstart → README local section (T032 → T033 → T034).

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 all [P] together.
- **Phase 2**: T006–T015 [P] together after T004–T005; T019–T022 [P] together; T025 can run parallel with T024/T023 once paths exist.
- **Phase 6**: T036 and T037 [P] together after T035 if desired.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T004–T005, launch all Go package stubs together:
# T006 backend/config/doc.go
# T007 backend/db/doc.go
# T008 backend/middleware/doc.go
# T009 backend/domain/doc.go
# T010 backend/repository/doc.go
# T011 backend/service/doc.go
# T012 backend/handler/doc.go
# T013 backend/router/doc.go
# T014 backend/aiclient/doc.go
# T015 backend/opensearch/doc.go
```

---

## Parallel Example: User Story 3

```bash
# T032 and T033 can be worked sequentially by same dev (contract first, then quickstart).
# T034 touches README only after T032–T033 stabilise service names and commands.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 + Phase 2.
2. Complete Phase 3 (US1): `docs/repository-layout.md` + `README.md`.
3. **STOP and VALIDATE**: Run scavenger hunt (SC-001).
4. Demo: contributors can find handler vs repository vs migrations vs `aiclient`.

### Incremental Delivery

1. Setup + Foundational → runnable skeleton.
2. Add US1 → documentation MVP.
3. Add US2 → layering audit artefact (`docs/layering-audit.md`).
4. Add US3 → contracts + quickstart + README local flow.
5. Polish → SC-004 timing check, compose config, `.gitignore`.

### Parallel Team Strategy

1. Team finishes Phase 1–2 together (parallelise stub files).
2. Dev A: US1 docs; Dev B: US2 `docs/layering.md` + audit (after stubs exist); Dev C: US3 after Compose stabilises — coordinate README edits to avoid merge conflicts.

---

## Notes

- Total tasks: **37** (Setup: 3, Foundational: 24, US1: 2, US2: 2, US3: 3, Polish: 3).
- Task count per user story: **US1** = 2, **US2** = 2, **US3** = 3.
- Format validation: **All** tasks use `- [ ]`, sequential **T###** IDs, file paths in description; **[P]** only where parallel-safe; **[US#]** only on Phases 3–5.
- Suggested MVP scope: through **T029** (Phase 3 complete) plus minimal smoke that `backend` builds.
