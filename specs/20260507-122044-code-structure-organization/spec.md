# Feature Specification: SPEC-01 — Code Structure & Project Organisation

**Feature Branch**: `20260507-122044-code-structure-organization`  
**Created**: 2026-05-07  
**Status**: Draft  
**Input**: User description: "I want to start with SPEC-01 — code structure & project organisation."

**Normative companion**: This specification defines *what* good structure must achieve. Technical naming, stack pins, and canonical folder names are defined in **SPEC-00 (constitution)**; this spec MUST NOT contradict SPEC-00.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find the right place to change behavior (Priority: P1)

A new contributor joins the project and needs to fix or extend behavior: exposing a new HTTP operation, changing how data is read or written, or integrating with the internal AI capability. They use only the repository’s documented layout (root readme and any short guides) to decide where each kind of change belongs before opening code.

**Why this priority**: Clear placement is the foundation for safe changes, reviews, and parallel work. Without it, every task starts with guesswork and risk of violating layering.

**Independent Test**: Run a facilitated onboarding scavenger hunt (three tasks: “add or locate an HTTP operation,” “add or locate a schema change,” “locate the internal AI integration boundary”) using only documentation. Record whether each task is completed on first attempt without maintainer hints.

**Acceptance Scenarios**:

1. **Given** a contributor who has not read the codebase, **When** they read the onboarding documentation, **Then** they can state which top-level area holds the public HTTP application, which holds the internal AI service, and which holds database migration artifacts.
2. **Given** a contributor tasked with changing persistence for a feature, **When** they follow the documented layout, **Then** they identify a single designated persistence area rather than scattering changes across unrelated folders.
3. **Given** a contributor tasked with calling the internal AI capability from business logic, **When** they follow the documented boundary rules, **Then** they route the call through the documented integration surface rather than duplicating HTTP client logic in presentation-oriented code.

---

### User Story 2 - Verify layering rules are enforceable (Priority: P2)

A maintainer reviews or audits the primary HTTP application to ensure dependency direction matches the documented layering model (presentation vs orchestration vs persistence vs shared domain types, plus dedicated helpers for search and AI integration).

**Why this priority**: Structure on paper is useless if imports violate it; enforceable rules keep the codebase maintainable as features grow.

**Independent Test**: Using the written layering rules only, sample packages from each logical layer and confirm none import a layer above them and there are no circular imports between layers. Document any violation as a defect against this spec.

**Acceptance Scenarios**:

1. **Given** the documented layering model, **When** a reviewer inspects import relationships for a representative slice of packages, **Then** every inspected package respects allowed dependency direction.
2. **Given** a proposed change that imports a higher layer from a lower layer, **When** the team applies the documented rules, **Then** the change is rejected or refactored before merge.

---

### User Story 3 - Operate and bootstrap locally (Priority: P3)

A developer needs to run the system locally for development: start dependencies, apply schema, and understand environment configuration. They find orchestration definitions, example environment settings, and migration entry points from the documented root layout.

**Why this priority**: Operational discoverability reduces time-to-first-successful-run and avoids ad-hoc scripts scattered without a home.

**Independent Test**: From a clean clone, follow documented “local run” steps and record time until the primary API responds successfully and dependencies are healthy, without undocumented one-off commands.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** the developer follows the documented local run instructions, **Then** they can start all required services defined for Phase 1 using the checked-in orchestration definition.
2. **Given** a developer who must apply schema changes, **When** they consult documentation, **Then** they find a single ordered set of migration artifacts and the documented command or workflow to apply them.

---

### Edge Cases

- **Partial delivery**: Some folders exist before all features are implemented; documentation MUST explain which areas are stable vs placeholders.
- **Constitution updates**: If SPEC-00 changes canonical layout, SPEC-01 acceptance scenarios MUST be revalidated against the new layout.
- **Single vs multi-package refactors**: Internal splits (e.g., extracting a submodule) MUST preserve the same outward responsibilities and documented boundaries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST expose a documented top-level layout that separates, at minimum: the public HTTP application, the internal AI HTTP service, versioned relational schema artifacts, search index configuration, helper scripts for development data and reindexing, container orchestration for local development, an example environment template, and a root onboarding document.
- **FR-002**: The public HTTP application MUST organise source so that HTTP entry points, business orchestration, data access, shared domain types, integration with the internal AI service, and search helpers are separately identifiable and named consistently with SPEC-00.
- **FR-003**: All relational schema evolution MUST live in one designated migration area; each change MUST use the project’s ordered naming scheme so reviewers can infer sequence and rollback pairing.
- **FR-004**: Search index configuration MUST live in a dedicated area separate from application source, with a documented way to apply it on environment bootstrap.
- **FR-005**: The root onboarding document MUST explain where to make common changes (new route behavior, new query, new migration, calling internal AI, adjusting search mapping) and MUST point to SPEC-00 for canonical technical detail.
- **FR-006**: The project MUST document dependency direction between logical layers of the public HTTP application such that no layer may depend on a layer above it and circular dependencies are forbidden; this MUST be verifiable using a documented review method applied to an agreed sample of components.
- **FR-007**: The internal AI service MUST be a distinct deployable unit in the layout; the public HTTP application MUST integrate with it only through the documented client boundary, not by embedding AI service code.
- **FR-008**: Development scripts (seeding, reindexing, maintenance) MUST reside under a single scripts area unless SPEC-00 explicitly places a script elsewhere, avoiding one-off files at repository root except orchestration and environment templates.

### Out of scope

- Cloud deployment pipelines, production hardening beyond local orchestration, and frontend application structure deferred to Phase 2 per SPEC-00 remain out of scope for this spec’s acceptance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a structured onboarding exercise, at least **90%** of steps across the three independent tasks in User Story 1 are completed successfully on first attempt using only documentation (no maintainer hints).
- **SC-002**: **100%** of relational schema change files in the migration area conform to the single documented ordering and pairing convention at audit time.
- **SC-003**: A layering audit of the agreed sample set finds **zero** violations of documented allowed dependency direction.
- **SC-004**: Following documented local bootstrap steps, a developer reaches a healthy local stack (dependencies up and primary API responding) in **one hour or less** from clean clone, excluding download time for container images on first run.

## Assumptions

- **SPEC-00 is authoritative** for exact directory names, technology choices, and phase boundaries; this spec validates organizational outcomes against that constitution.
- **Target users** are student contributors and markers who need clarity more than enterprise process overhead; documentation should stay short and navigable.
- **Phase 1** focuses on backend and infrastructure; frontend structure may be absent or minimal without failing this spec.
- **Verification** of import direction may be manual or tool-assisted as long as the method is repeatable and documented for the team.
