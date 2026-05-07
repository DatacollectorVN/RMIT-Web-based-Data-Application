# Research: SPEC-01 — Code Structure & Project Organisation

**Date**: 2026-05-07  
**Plan**: [plan.md](./plan.md)  
**Constitution**: `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/.specify/memory/constitution.md` (SPEC-00)

All items below were resolved from SPEC-00 and the feature spec; no open **NEEDS CLARIFICATION** remains for planning.

---

## R1 — Logical root name vs actual Git repository root

**Decision**: Implement the constitution’s directory tree at the **actual clone root** (`RMIT-Web-based-Data-Application`). Treat `beauty-app/` in SPEC-00 as a **logical** label; `README.md` states the equivalence.

**Rationale**: Developers clone this repository; renaming the folder on disk is unnecessary and would break remote URLs. SPEC-01 FR-001 requires documented layout, not a specific folder name for the clone.

**Alternatives considered**:

- Rename GitHub repo to `beauty-app` — rejected: out of scope for SPEC-01 and breaks existing course naming.
- Nest all code under `beauty-app/` subfolder — rejected: extra path depth without constitution mandate.

---

## R2 — Empty Go packages vs build tags

**Decision**: Add minimal `doc.go` (or equivalent) in each `backend/*` package directory so `go build ./...` succeeds from day one.

**Rationale**: Empty directories are not Go packages; early CI and editors expect compilable modules. Stubs document intent and enforce import paths.

**Alternatives considered**:

- Single-package monolith until features land — rejected: violates SPEC-00 §5–§6 and makes layering audits impossible.

---

## R3 — Migration directory before SPEC-02

**Decision**: Create `migrations/` with `.gitkeep` (or a clearly named placeholder pair) and document naming in `docs/repository-layout.md`. Prefer **no fake schema** until SPEC-02 to avoid drift.

**Rationale**: FR-003 requires a single ordered location and naming convention; empty dir satisfies structure while SPEC-02 owns real SQL.

**Alternatives considered**:

- Commit full `000001_create_users` files from constitution example — acceptable if team wants copy-paste starter; risk of schema mismatch before SPEC-02 review. Plan leaves this as optional in Phase D.

---

## R4 — Where to document layering for reviewers

**Decision**: Maintain authoritative rules in SPEC-00; add **`docs/layering.md`** at repo root as the **working copy** linked from `README.md` for day-to-day reviews.

**Rationale**: FR-006 requires a documented, repeatable review method; contributors may not open `.specify/memory/` first.

**Alternatives considered**:

- Only link to constitution — rejected: SPEC-01 SC-003 expects an agreed sample and procedure in-repo.

---

## R5 — Contracts folder contents for a structure-only feature

**Decision**: Use `contracts/` for **local runtime and service boundaries** (`local-runtime.md`), not HTTP API schemas (deferred to SPEC-04+).

**Rationale**: SPEC-01 still has cross-service “interfaces” (Compose service names, ports, internal AI base URL) that quickstart and Compose must keep consistent.

**Alternatives considered**:

- Omit `contracts/` entirely — rejected: plan workflow expects Phase 1 contracts; runtime doc prevents drift between Compose and docs.
