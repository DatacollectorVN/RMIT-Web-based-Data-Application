# Data Model: SPEC-01 — Structural / Organisational Entities

**Date**: 2026-05-07  
**Spec**: [spec.md](./spec.md)

SPEC-01 does not define domain entities (users, products, etc.). It defines **repository structural elements** that must exist and relate as follows. These are the “entities” for planning and verification.

## Structural entities

| Name | Description | Validation / notes |
|------|-------------|-------------------|
| **Public HTTP application root** | `backend/` — sole public REST surface in Phase 1 | Must contain `main.go`, `go.mod`, and layer packages per SPEC-00 §5–§6 |
| **Handler layer** | `backend/handler/` | MAY import `service`, `domain`; MUST NOT import `repository` directly |
| **Service layer** | `backend/service/` | Orchestration; MAY import `repository`, `aiclient`, `opensearch`, `domain` |
| **Repository layer** | `backend/repository/` | All SQL; MUST NOT import `handler` or `service` |
| **Domain layer** | `backend/domain/` | Pure types and sentinel errors; zero non-stdlib deps |
| **AI client** | `backend/aiclient/` | HTTP client to internal AI; invoked from `service` only |
| **OpenSearch helpers** | `backend/opensearch/` | Query/index helpers; invoked from `service` only |
| **Internal AI service root** | `ai-service/` | Distinct deployable unit; not embedded in Go tree |
| **Schema migrations** | `migrations/` | All `*.up.sql` / `*.down.sql` pairs; ordered `00000N_` prefix |
| **Search index config** | `opensearch/` | Versioned mapping JSON + bootstrap script per SPEC-00 |
| **Dev scripts** | `scripts/` | Seed/reindex/maintenance; not scattered at repo root |
| **Local orchestration** | `docker-compose.yml` | Defines Phase 1 service topology |
| **Environment template** | `.env.example` | Documents required variables per SPEC-00 §10 |
| **Onboarding docs** | `README.md`, `docs/repository-layout.md`, `docs/layering.md` | Satisfy FR-005 and FR-006 |

## Relationships (conceptual)

```text
Public HTTP application (backend)
  └── layered packages: handler → service → repository → domain
                              ↘ aiclient → Internal AI service (ai-service)
                              ↘ opensearch → OpenSearch cluster

migrations ──apply──► PostgreSQL
opensearch/*.json ──apply──► OpenSearch
scripts ──► support dev workflows (seed, reindex)
```

## State transitions

Not applicable (no workflow state machine for SPEC-01).

## Domain data validation rules

Deferred to SPEC-02 (PostgreSQL) and later specs.
