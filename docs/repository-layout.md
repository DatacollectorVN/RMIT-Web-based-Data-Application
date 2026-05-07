# Repository Layout (SPEC-01)

This document maps the current repository structure to SPEC-00/SPEC-01 and indicates what is stable now versus planned placeholders.

## Root tree

```text
RMIT-Web-based-Data-Application/
├── backend/                # stable skeleton: Go API entry + layer packages
├── ai-service/             # stable skeleton: FastAPI entry + package dirs
├── migrations/             # reserved for ordered .up/.down SQL files
├── opensearch/             # mapping JSON + init script
├── scripts/                # reserved for seed/reindex/maintenance scripts
├── docs/                   # onboarding and architecture review docs
├── docker-compose.yml      # local service topology
├── .env.example            # required env keys and placeholders
└── specs/                  # feature specs, plans, tasks, contracts
```

## Stability guide

- **Stable now**
  - Root topology above
  - `backend/` layer package names (`handler`, `service`, `repository`, `domain`, `aiclient`, `opensearch`, `router`, `middleware`, `config`, `db`)
  - `ai-service/` service boundary and health endpoint
  - `docker-compose.yml` + `.env.example` local runtime contract

- **Placeholder until later specs**
  - `migrations/` actual SQL content (SPEC-02)
  - OpenSearch production mapping details (SPEC-03)
  - Feature endpoints and business logic (SPEC-04+)
  - AI model artifact contents in `ai-service/artifacts/`

## Canonical references

- Constitution: `.specify/memory/constitution.md`
- Implementation plan: `specs/20260507-122044-code-structure-organization/plan.md`
- Tasks: `specs/20260507-122044-code-structure-organization/tasks.md`
