---
description: "Task list for SPEC-02 — PostgreSQL schema & migrations"
---

# Tasks: SPEC-02 — PostgreSQL Schema & Migrations

**Input**: Design documents from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-131123-postgres-schema-migrations/`  \
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), `sample_ddls.sql`

**Tests**: Not requested in [spec.md](./spec.md); no automated test tasks included. Validation is via migration drills and integrity checks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1] / [US2] / [US3] for user-story phases only
- All tasks include exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure tooling entrypoints exist (Makefile and docs already drafted).

- [x] T001 Verify Makefile targets exist at `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/Makefile` (`migratedb`, `migratedb-down-1`) and match docs in `specs/20260507-131123-postgres-schema-migrations/contracts/migration-runbook.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create migration files matching the plan’s ordered structure.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000001_create_extensions.up.sql` (from `sample_ddls.sql`: uuid extension if kept)
- [x] T003 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000001_create_extensions.down.sql` (drop extension safely)
- [x] T004 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000002_create_users.up.sql` (table + indexes; align UUID strategy per SPEC-00)
- [x] T005 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000002_create_users.down.sql`
- [x] T006 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000003_create_products.up.sql`
- [x] T007 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000003_create_products.down.sql`
- [x] T008 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000004_create_reviews.up.sql`
- [x] T009 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000004_create_reviews.down.sql`
- [x] T010 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000005_create_orders.up.sql`
- [x] T011 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000005_create_orders.down.sql`
- [x] T012 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000006_create_order_items.up.sql`
- [x] T013 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000006_create_order_items.down.sql`
- [x] T014 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000007_create_updated_at_trigger.up.sql` (function + triggers for users/products/reviews/orders)
- [x] T015 [P] Create migration file `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/migrations/000007_create_updated_at_trigger.down.sql` (drop triggers then function)

**Checkpoint**: Migration directory contains a complete ordered set with matching up/down pairs.

---

## Phase 3: User Story 1 — Persist core app data reliably (Priority: P1) 🎯 MVP

**Goal**: From a clean database, applying migrations yields usable core tables and relationships.

**Independent Test**: Apply migrations on an empty DB and confirm tables + constraints exist.

- [ ] T016 [US1] Start PostgreSQL using Docker Compose (`docker compose up -d postgres`) using repo root `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/docker-compose.yml`
- [ ] T017 [US1] Apply all migrations using `make migratedb` from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/` (requires `DATABASE_URL`)
- [ ] T018 [US1] Verify core tables exist (`users`, `products`, `reviews`, `orders`, `order_items`) and indexes are present (compare against `sample_ddls.sql`)

**Checkpoint**: US1 acceptance scenarios 1–2 can be satisfied with representative inserts.

---

## Phase 4: User Story 2 — Evolve schema safely over time (Priority: P2)

**Goal**: Rollback and re-apply drills work without manual steps.

**Independent Test**: Roll back one step and re-apply; schema returns to expected state.

- [ ] T019 [US2] Run rollback drill with `make migratedb-down-1` from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/`
- [ ] T020 [US2] Re-apply with `make migratedb` and confirm no errors
- [ ] T021 [US2] Record the drill steps/outcomes in `specs/20260507-131123-postgres-schema-migrations/contracts/migration-runbook.md` if deviations are found

**Checkpoint**: SC-002 can be met locally.

---

## Phase 5: User Story 3 — Support developer onboarding and debugging (Priority: P3)

**Goal**: Contributors can understand where data lives and how it relates by reading migrations + docs.

**Independent Test**: Data-model scavenger hunt: table ownership and relationships inferred without hints.

- [ ] T022 [US3] Ensure `specs/20260507-131123-postgres-schema-migrations/data-model.md` reflects the final migration content (fields, relationships, indexes)
- [ ] T023 [US3] Ensure `specs/20260507-131123-postgres-schema-migrations/quickstart.md` references `make migratedb` and matches actual repo behavior

**Checkpoint**: SC-003 can be run using the docs + migration set.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integrity checks and consistency with constitution.

- [ ] T024 Run integrity checks (invalid insert attempts) from `specs/20260507-131123-postgres-schema-migrations/contracts/migration-runbook.md` and confirm constraints behave as intended
- [ ] T025 Ensure ID strategy matches SPEC-00: application-provided UUIDs are supported without relying on DB defaults (document any intentional fallback behavior in `specs/20260507-131123-postgres-schema-migrations/research.md`)
- [ ] T026 [P] Run `make -n migratedb` and `make -n migratedb-down-1` from `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/` to confirm targets remain valid after future changes

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** are prerequisites for everything else.
- **US1** depends on complete migrations and a running postgres container.
- **US2** depends on US1 having successfully applied migrations.
- **US3** depends on migrations being final (so docs match reality).

## Parallel opportunities

- T002–T015 are marked **[P]** (separate migration files), but must still be reviewed together for foreign-key ordering and dependency correctness.

## Suggested MVP scope

Complete through **T018** (US1) to unlock downstream API specs that need a working schema.
