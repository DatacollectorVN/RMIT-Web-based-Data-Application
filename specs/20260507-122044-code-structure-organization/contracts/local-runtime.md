# Local runtime contract

**Authority**: SPEC-00 (`.specify/memory/constitution.md`) §4 infra, §7 base URLs, §10 environment variables.  
**Consumers**: `docker-compose.yml`, `.env.example`, `backend/` config loading, `ai-service/` startup.

## Service topology (logical names)

| Docker service name (kebab-case) | Role | Host port (local) | Notes |
|-----------------------------------|------|-------------------|--------|
| `backend` | Go public REST API | **8080** | Base path `/api/v1`; health route `/health` for bootstrap |
| `ai-service` | Python internal AI HTTP | **8000** (host optional; internal name on Compose network) | Not called by browsers in Phase 1 |
| `postgres` | PostgreSQL 16 | **5432** | Database for application data |
| `opensearch` | OpenSearch 2.13 | **9200** | Search + vector index |

**Contract**: `docker-compose.yml` MUST define healthchecks and start ordering for local bootstrap; service names MUST match `.env.example` variables (e.g. `DATABASE_URL` host segment, `AI_SERVICE_URL`, `OPENSEARCH_URL`).

## URL contract (development)

| Caller | Target | URL |
|--------|--------|-----|
| Browser / frontend (future) | Go API | `http://localhost:8080/api/v1` |
| Go API | Python AI | `http://ai-service:8000` on Compose network (from `AI_SERVICE_URL`) |
| Go API | OpenSearch | `http://opensearch:9200` on Compose network (from `OPENSEARCH_URL`) |
| Host tools | PostgreSQL | `localhost:5432` via published port |

## Environment variable contract

Minimum keys (names and semantics) MUST match SPEC-00 §10:

- `DATABASE_URL`
- `PORT`, `JWT_SECRET`, `JWT_EXPIRY_HOURS`
- `AI_SERVICE_URL`, `AI_SERVICE_TIMEOUT_SEC`
- `OPENSEARCH_URL`, `OPENSEARCH_INDEX_PRODUCTS`
- `ENV`

Secrets MUST NOT be committed; `.env.example` contains placeholders only.

## Change control

Any change to service names, ports, or required env vars MUST update:

1. `docker-compose.yml`
2. `.env.example`
3. `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application/specs/20260507-122044-code-structure-organization/quickstart.md`
4. This file
