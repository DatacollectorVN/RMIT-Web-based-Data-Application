# Feature Specification: Simplify identifiers and public API access

**Feature Branch**: `20260511-092104-int-ids-remove-jwt`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: Remove unnecessary parts of the application: use integer primary keys for all tables instead of UUIDs, and remove JWT from the web API so callers are not required to authenticate with tokens.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer can work with simple numeric record IDs (Priority: P1)

A developer or course assessor reviewing the database or API responses should see straightforward integer identifiers (1, 2, 3…) for users, products, reviews, orders, order lines, and photos, instead of long opaque identifiers.

**Why this priority**: Integer keys are the foundation for every other table and API response; without this change, downstream work remains tied to the old identifier style.

**Independent Test**: After applying schema and sample data, inspect any primary key column in the relational database and confirm values are integers. Call a product-detail style endpoint (when available) and confirm the identifier in the response is an integer.

**Acceptance Scenarios**:

1. **Given** the database schema has been updated, **When** a new user or product is created, **Then** the system assigns a monotonic integer primary key without requiring the client to supply an identifier.
2. **Given** existing relationships (e.g. a review belongs to a user and a product), **When** data is loaded, **Then** foreign keys reference integer parent keys consistently across all tables.
3. **Given** sample or snapshot data is loaded, **When** seed scripts run, **Then** they use integer identifiers compatible with the new schema (no UUID-form literals required for primary or foreign keys).

---

### User Story 2 — API consumers are not required to use JWT or token headers (Priority: P1)

Anyone calling the application’s HTTP API for this phase should not need to obtain, store, or send JSON Web Tokens (or equivalent bearer tokens) to access the documented routes. The stack should run and demonstrate behaviour without token-based authentication configuration.

**Why this priority**: The project owner has explicitly scoped out JWT for the current milestone; leaving token requirements in place blocks simple demos and local testing.

**Independent Test**: From a clean environment, start the application and invoke health and other existing public endpoints using plain HTTP requests with no `Authorization` header; all succeed where the spec defines them as callable.

**Acceptance Scenarios**:

1. **Given** the application is running, **When** a client calls the health check endpoint, **Then** the call succeeds without any authentication header.
2. **Given** documentation or configuration lists environment variables, **When** a developer sets up the project, **Then** there is no requirement to configure secret signing keys solely for JWT for the API to start.
3. **Given** the codebase and dependencies are trimmed, **When** the project is audited for “login token” behaviour, **Then** no feature route depends on validating a bearer token for this phase (protected routes may be deferred or explicitly public).

---

### User Story 3 — Remove leftover artefacts that only existed for superseded choices (Priority: P2)

The repository should not retain unused security or identifier machinery that contradicts the simplified model (e.g. JWT libraries, UUID-oriented seed data, or docs that still mandate UUID + JWT).

**Why this priority**: Reduces confusion and maintenance cost after the model change.

**Independent Test**: Search the repository for references to JWT and UUID primary keys in active application paths; only historical notes or migration comments remain where legally needed.

**Acceptance Scenarios**:

1. **Given** JWT is out of scope, **When** dependencies and config are reviewed, **Then** JWT-specific packages and settings are removed or clearly marked as unused for this service.
2. **Given** identifiers are integers, **When** OpenSearch (or other indexes) store product references, **Then** documents use the same numeric product identifier as the database (no mismatch between index id and DB id).

---

### Edge Cases

- **Existing environments**: Developers with old UUID-based databases may need a full reset or migration path; the spec assumes development databases can be recreated from migrations and seed data.
- **ID overflow**: Integer type must be large enough for coursework scale; assume standard database integer or big-integer is sufficient.
- **Concurrent inserts**: Database must assign unique integers under normal concurrent API use; rely on database-generated keys.
- **Security**: Removing JWT means endpoints are publicly callable for this phase; sensitive operations (if any) must either be deferred or called out explicitly as still public (project owner accepts this trade-off for the milestone).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every table that currently uses a universally unique identifier as its primary key MUST use a database-generated integer primary key instead (single numeric column per table).
- **FR-002**: All foreign key columns that reference those primary keys MUST use the same integer type and remain referentially consistent.
- **FR-003**: Application and seed data MUST be updated so that no runtime path requires UUID strings for entity identity (API payloads, scripts, and samples use integers).
- **FR-004**: The HTTP API for this phase MUST NOT require clients to present a JWT, bearer token, or equivalent `Authorization` header to access routes that the project exposes in this milestone (including health and any CRUD/search routes implemented).
- **FR-005**: Configuration and documentation MUST be updated so that JWT-related environment variables (e.g. signing secrets, expiry) are not mandatory to run the application; any retained variables MUST be clearly optional or removed.
- **FR-006**: Search or index documents that reference products MUST use the numeric product identifier aligned with the relational model.
- **FR-007**: The project MUST remove or archive dead code, dependencies, and docs that exist only to support UUID-as-primary-key + JWT workflows, without breaking the Docker Compose developer flow (`app`, `postgres`, `opensearch`).

### Key Entities

- **User**: Person using the app; identified by an integer primary key; credentials may still be stored for future auth but token issuance is not required for API access in this phase.
- **Product**, **Photo**, **Review**, **Order**, **OrderItem**: Business entities; each has an integer primary key and foreign keys as integers referencing parent rows.
- **External search document**: Represents a product in search; carries the same numeric product id as the database for correlation.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a fresh setup, 100% of core entity tables expose integer primary keys in the schema definition used by the application (verified by schema inspection).
- **SC-002**: A scripted or manual check of at least five API calls (including health) completes successfully with zero requests sending an `Authorization` header.
- **SC-003**: Sample data load completes without identifier-format errors after the schema change (single successful end-to-end run).
- **SC-004**: Onboarding time for a new developer to reach a working API response (health OK) does not increase compared to the prior stack solely due to JWT setup steps (no mandatory token configuration step remains).

---

## Assumptions

- This change targets the coursework / Phase 1 scope; re-introducing authentication may happen in a later spec.
- Existing production data migration from UUID to integer is not required beyond what developers need locally (recreate DB from migrations + seed is acceptable).
- OpenSearch index mapping may need a field type change for product identifiers; rebuilding the index after reindex is acceptable.
- The project owner accepts that without JWT, all exposed endpoints in this phase are effectively public.
