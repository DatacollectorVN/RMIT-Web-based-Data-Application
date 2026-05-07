# Feature Specification: SPEC-02 — PostgreSQL Schema & Migrations

**Feature Branch**: `20260507-131123-postgres-schema-migrations`  \
**Created**: 2026-05-07  \
**Status**: Draft  \
**Input**: User description: "start the SPEC-02 PostgreSQL schema & migrations"

**Relationship to SPEC-00**: This spec defines *what the data model must support* and *how schema changes must be managed*. Canonical technical choices (database engine, ID strategy, migration naming convention) are locked in SPEC-00 and MUST NOT be contradicted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persist core app data reliably (Priority: P1)

As the backend is built out, the system needs a reliable source of truth for core business data (users, products, reviews, orders). Contributors can add new features knowing the underlying data model exists, relationships are clear, and basic integrity is enforced.

**Why this priority**: Most future specs (auth, product browsing/search, review/label, recommendations) depend on structured data. Without a stable schema, teams either block or create incompatible ad-hoc tables.

**Independent Test**: From a clean database, apply schema changes and confirm required tables/relationships exist and basic create/read flows can be executed with representative sample records.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** migrations are applied in order, **Then** the core tables and relationships needed for Phase 1 features exist and are usable.
2. **Given** a representative dataset (users, products, a review, an order), **When** records are inserted, **Then** referential integrity prevents orphan records and invalid relationships.

---

### User Story 2 - Evolve schema safely over time (Priority: P2)

As requirements change, contributors can change the schema incrementally with a clear history and rollback path. Reviewers can understand what changed and in what order without reverse-engineering the database.

**Why this priority**: The project will ship multiple backend features quickly; schema change safety prevents broken environments and data loss.

**Independent Test**: Apply migrations up, then roll back a subset, then re-apply; confirm the database returns to expected states without manual intervention.

**Acceptance Scenarios**:

1. **Given** a database at version \(N\), **When** version \(N+1\) is applied, **Then** the schema reflects the intended change and existing data remains valid.
2. **Given** a database at version \(N+1\), **When** it is rolled back to version \(N\), **Then** the schema and constraints match the prior version.

---

### User Story 3 - Support developer onboarding and debugging (Priority: P3)

New contributors can understand the data model and find the authoritative definition of tables, relationships, and constraints. When bugs arise (e.g., missing data, invalid references), the schema and migration history make it easy to diagnose.

**Why this priority**: The team is small and changes frequently; the schema must be self-explanatory and auditable.

**Independent Test**: A new contributor can answer “where is X stored?” and “what links X to Y?” using repository documentation and migration files, without maintainers explaining the schema.

**Acceptance Scenarios**:

1. **Given** a new contributor, **When** they inspect the schema documentation and migration files, **Then** they can identify which tables store users/products/reviews/orders and how they relate.
2. **Given** a data inconsistency report, **When** a developer checks constraints and migration history, **Then** they can determine whether the issue is invalid input, missing reference, or a schema defect.

---

### Edge Cases

- **Re-runs**: Applying migrations repeatedly should be safe and deterministic; no partial “half applied” state should remain after a failure.
- **Backwards compatibility**: Schema changes should avoid breaking existing application behavior unexpectedly; when breaking changes are required, they must be explicit and documented.
- **Large text and optional fields**: Products and reviews may have missing optional fields; schema should support “unknown” without forcing fake values.
- **Deletion**: Deleting a parent record (e.g., user) must not silently orphan child records; behavior must be consistent and documented (restrict vs cascade).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a relational schema that supports Phase 1 scope: users, products, reviews, and orders (including line items if needed to represent multi-product orders).
- **FR-002**: The schema MUST define relationships between entities so that invalid references (e.g., a review for a non-existent product) are prevented.
- **FR-003**: The schema MUST include a consistent identity strategy for primary keys and foreign keys across all tables, aligned with SPEC-00.
- **FR-004**: The schema MUST support recording timestamps for creation and update events for core entities to enable auditing and debugging.
- **FR-005**: The schema MUST support authentication and authorisation needs in Phase 1 by persisting user identity and credential-related data (without storing sensitive secrets in plain text).
- **FR-006**: Schema evolution MUST be managed as an ordered set of migration steps where each change is reviewable and reproducible from a clean database.
- **FR-007**: Each migration step MUST have a corresponding rollback path suitable for local development and testing.
- **FR-008**: The repository MUST make it easy to discover schema definitions and migration order from version control history.

### Key Entities *(include if feature involves data)*

- **User**: Represents an account identity for authentication; includes identifiers and fields needed for login and role/permission decisions.
- **Product**: Represents a catalog item that can be searched and reviewed; includes identifiers and descriptive fields used by search and recommendations.
- **Review**: Represents user-generated feedback about a product; links to a user and product; may include “label status” fields used by later specs.
- **Order**: Represents a purchase event; links to a user; may contain one or more items and totals.
- **Order Item** (if multi-item orders): Links an order to products and captures quantity and price-at-purchase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a clean environment, a developer can apply all schema changes end-to-end in **under 5 minutes** without manual database edits.
- **SC-002**: A rollback and re-apply drill for the most recent migration completes with **zero manual steps** and leaves the database in the expected state each time.
- **SC-003**: A schema documentation and migration review enables a new contributor to correctly answer **at least 90%** of a short “data model scavenger hunt” (tables, relationships, key constraints) without maintainer hints.
- **SC-004**: Referential integrity checks prevent **100%** of tested invalid reference inserts in a representative set (e.g., review without product, order item without order).

## Assumptions

- Phase 1 features will require core entities listed above; additional entities (e.g., product categories, brands) may be introduced later but should not block an initial coherent schema.
- The project will prioritise developer productivity and reproducibility (local-first) over production-scale tuning.
- Deletion behavior defaults to the safest option (prevent accidental data loss) unless later specs require cascading deletes for specific entities.
- Exact API endpoints and search index details are out of scope here and are specified in later specs; this spec focuses on durable persisted data.
