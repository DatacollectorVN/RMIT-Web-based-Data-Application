# Research: SPEC-02 — PostgreSQL Schema & Migrations

**Date**: 2026-05-07  
**Plan**: [plan.md](./plan.md)  
**DDL input**: `sample_ddls.sql`

This feature is primarily translation of a provided DDL into a versioned migration set. Research items are therefore decisions and alignment checks against SPEC-00.

---

## R1 — UUID strategy alignment with SPEC-00

**Decision**: Keep UUID columns as `UUID` in schema, but do **not** require DB-side UUID generation for correctness. Prefer application-provided UUIDs for inserts.

**Rationale**: SPEC-00 states UUID v4 is generated in Go before insert. DB-side defaults like `uuid_generate_v4()` are convenient but can contradict the “generated in Go” rule if the application omits IDs.

**Alternatives considered**:

- Keep DB defaults on `id` columns — accepted only as a fallback; still document app-generated IDs as required behavior.
- Remove UUID extension entirely — rejected for now because sample DDL includes it and some tools may expect it.

---

## R2 — Migration granularity

**Decision**: Use one migration per logical unit:

- Extensions
- Each core table + its indexes
- Trigger function + per-table triggers

**Rationale**: Smaller migrations are easier to review, roll back, and debug.

**Alternatives considered**:

- Single large migration for whole schema — rejected due to review and rollback complexity.

---

## R3 — Deletion behavior

**Decision**: Keep referential actions from sample DDL:

- `reviews.user_id`/`reviews.product_id`: cascade
- `orders.user_id`: cascade
- `order_items.order_id`: cascade
- `order_items.product_id`: restrict

**Rationale**: Matches sample DDL and provides predictable behavior for early development.

---

## R4 — updated_at triggers

**Decision**: Use one `trigger_set_updated_at()` function and create triggers for tables that have `updated_at` (`users`, `products`, `reviews`, `orders`).

**Rationale**: Keeps timestamp management consistent without duplicating logic.

