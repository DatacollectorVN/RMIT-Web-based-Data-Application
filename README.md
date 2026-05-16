# Beauty App — RMIT Web-based Data Application

Phase 1 monorepo. This repository implements a unified Python `app` service (FastAPI + SQLAlchemy + opensearch-py). Entity IDs are **integers** (BIGINT) in PostgreSQL and in API JSON. 

Phase 1 does **not** require JWT or bearer tokens. See SPEC-00 (constitution v2.1).

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

For full setup instructions, see **[docs/getting-started.md](docs/getting-started.md)**.

## Notes

- No Go toolchain required — all runtime code and scripts are Python 3.11.
- No `golang-migrate` or `psql` binary required — migrations and seeding use `app/scripts/migrate.py` and `app/scripts/snapshotdb.py`.
- Frontend (React + TypeScript) is deferred to Phase 2.
- The `backend/` directory is retained for reference but is no longer built or deployed.
