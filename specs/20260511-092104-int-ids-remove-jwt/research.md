# Research: SPEC — Integer primary keys & no JWT (Phase 1 simplification)

## Decision 1: PostgreSQL integer type for primary keys

**Decision**: Use `BIGSERIAL` / `BIGINT GENERATED ALWAYS AS IDENTITY` (or equivalent) for all primary keys and matching `BIGINT` for foreign keys.

**Rationale**: Coursework scale fits easily in 64-bit integers; avoids overflow concerns from `INTEGER` if seed data or demos grow; consistent with "simple numeric IDs" in the feature spec.

**Alternatives considered**:
- `SERIAL` (32-bit) — sufficient for assignment scope but easier to hit limits in long-lived demos; rejected in favour of `BIGINT`.
- Keep UUID in DB, expose int in API — violates FR-001 (single integer identity everywhere).

---

## Decision 2: Application-generated vs database-generated IDs

**Decision**: Let the **database** assign primary keys via identity/serial columns. Application code omits `id` on insert unless a seed script supplies explicit integers for reproducible snapshots.

**Rationale**: Matches acceptance scenario "system assigns monotonic integer primary key without requiring the client to supply an identifier"; aligns with constitution amendment direction (no client-supplied UUID).

**Alternatives considered**:
- Application allocates IDs (e.g. Snowflake) — unnecessary complexity for Phase 1.
- `uuid.uuid4()` in Python — explicitly retired by this feature.

---

## Decision 3: OpenSearch `product_id` field type

**Decision**: Change `product_id` in index mapping from `keyword` (UUID string) to **`long`** (64-bit integer). Use the same integer as `_id` for bulk index operations where practical, or keep `_id` as stringified integer for consistency with OpenSearch conventions.

**Rationale**: FR-006 requires search documents to use numeric product identifiers aligned with PostgreSQL.

**Alternatives considered**:
- Keep `keyword` and store `"123"` — works but loses numeric range queries; `long` is clearer.
- Nested object — unnecessary.

---

## Decision 4: JWT and `python-jose` removal

**Decision**: Remove JWT from **required** API behaviour: drop `get_current_user` dependency from all routes in this phase; remove `JWT_SECRET`, `JWT_EXPIRY_HOURS` from **mandatory** `.env.example`; remove `python-jose` from `pyproject.toml` if unused. Keep `passlib[bcrypt]` only if password hashing remains for future auth or seed users.

**Rationale**: Feature spec FR-004 / FR-005; simplifies local demos.

**Alternatives considered**:
- Optional JWT behind feature flag — out of scope; user asked for removal of requirement.
- Session cookies — deferred.

---

## Decision 5: Constitution (SPEC-00) amendment

**Decision**: Bump SPEC-00 to **v2.1** (MINOR) with sync impact: replace "UUID in Python" with "BIGINT identity in PostgreSQL"; replace "JWT stateless" with "No token auth in Phase 1 (public API)"; update §7 auth header section and §8 PostgreSQL bullet; trim `python-jose` from canonical stack if removed.

**Rationale**: Plan workflow requires constitution alignment; feature spec is an explicit product-owner override of prior locked decisions.

**Alternatives considered**:
- Leave constitution stale — **rejected** (violates speckit gates).

---

## Decision 6: Migration strategy for existing developers

**Decision**: Replace or add SQL migrations under `app/migrations/` that **recreate** tables with integer keys (acceptable: `migratedbreapply` after backup). Update `app/scripts/snapshot_seed.sql` with integer literals. Document one-shot "drop volume / reapply" in quickstart.

**Rationale**: Spec assumes dev DB recreate; no production UUID→int migration required.

**Alternatives considered**:
- In-place ALTER with mapping table — overkill for coursework.
