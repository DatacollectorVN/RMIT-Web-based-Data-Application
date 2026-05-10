# Beauty App — RMIT Web-based Data Application

Phase 1 monorepo. This repository implements a unified Python `app` service (FastAPI + SQLAlchemy + opensearch-py) as defined by SPEC-04, inheriting all technical decisions from SPEC-00 (constitution v2.0).

## Specifications

- Constitution (SPEC-00): `.specify/memory/constitution.md`
- Latest feature: `specs/20260510-145455-python-app-consolidation/`

## Repository layout

| Directory | Purpose |
| --- | --- |
| `app/` | Unified Python service — FastAPI REST API + SQLAlchemy ORM + opensearch-py + AI/ML |
| `app/migrations/` | SQL schema evolution files (applied by `app/scripts/migrate.py`) |
| `app/scripts/` | Operational scripts: `migrate.py`, `snapshotdb.py`, `reindex_products.py`, `search_relevance_check.py` |
| `opensearch/` | Index mapping JSON and idempotent `init.sh` |
| `scripts/` | Legacy Go scripts (deprecated — see `app/scripts/` for Python equivalents) |

## Where to change what

| Change type | Primary location |
| --- | --- |
| New HTTP endpoint | `app/routers/`, `app/services/` |
| Business orchestration | `app/services/` |
| DB queries and persistence | `app/repositories/` |
| Shared domain types/errors | `app/exceptions.py` |
| OpenSearch query/mapping behaviour | `app/opensearch/`, `opensearch/` |
| AI / ML inference | `app/ai/` |
| Database schema changes | `app/migrations/` |
| Local environment and service topology | `docker-compose.yml`, `.env.example` |

## Local development

```bash
cp .env.example .env          # edit credentials
docker compose up -d          # starts app, postgres, opensearch
make migratedb                # apply schema migrations
make snapshotdb               # load sample data
make opensearchinit           # create products index
make reindexproducts          # upload products to OpenSearch
curl http://localhost:8080/api/v1/health   # → {"data":{"status":"ok"}}
```

Full step-by-step: `specs/20260510-145455-python-app-consolidation/quickstart.md`

## Notes

- No Go toolchain required — all runtime code and scripts are Python 3.11.
- No `golang-migrate` or `psql` binary required — migrations and seeding use `app/scripts/migrate.py` and `app/scripts/snapshotdb.py`.
- Frontend (React + TypeScript) is deferred to Phase 2.
- The `backend/` directory is retained for reference but is no longer built or deployed.
