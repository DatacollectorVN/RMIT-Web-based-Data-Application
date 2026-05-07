# Beauty App — RMIT Web-based Data Application

Phase 1 monorepo for backend and infrastructure. This repository implements the structure defined by SPEC-01 and inherits all locked technical decisions from SPEC-00.

## Specifications

- Constitution (SPEC-00): `.specify/memory/constitution.md`
- Current feature folder: `specs/20260507-122044-code-structure-organization/`
- Implementation tasks: `specs/20260507-122044-code-structure-organization/tasks.md`

## Repository layout

See `docs/repository-layout.md` for the full tree and stability notes. Key roots:

- `backend/`: public Go API (single public entry point)
- `ai-service/`: internal Python AI HTTP service
- `migrations/`: SQL schema evolution files
- `opensearch/`: index mapping and bootstrap script
- `scripts/`: data seed and maintenance scripts

## Where to change what

| Change type | Primary location |
| --- | --- |
| New HTTP behavior | `backend/handler/`, `backend/router/`, `backend/service/` |
| Business orchestration | `backend/service/` |
| SQL queries and persistence | `backend/repository/` |
| Shared domain types/errors | `backend/domain/` |
| Internal AI integration calls | `backend/aiclient/` |
| OpenSearch query/mapping behavior | `backend/opensearch/`, `opensearch/` |
| Database schema changes | `migrations/` |
| Local environment and service topology | `docker-compose.yml`, `.env.example` |

## Layering and review

- Layering rules and allowed dependency directions: `docs/layering.md`
- Current audit record: `docs/layering-audit.md`

## Local development

1. Copy env template: `cp .env.example .env`
2. Start stack: `docker compose up -d`
3. Optional mapping bootstrap: `./opensearch/init.sh`
4. Detailed step-by-step guide: `specs/20260507-122044-code-structure-organization/quickstart.md`

## Notes

- The constitution uses `beauty-app/` as the logical root name; this clone root is `RMIT-Web-based-Data-Application`.
- Frontend structure is intentionally deferred to Phase 2.