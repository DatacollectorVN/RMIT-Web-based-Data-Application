# Contract: Docker Compose Topology

## Required services after consolidation

| Service name | Image / Build context | Container name | Exposed port | Role |
|---|---|---|---|---|
| `app` | `./app` (Dockerfile) | `rmit-app` | `8080:8080` | Unified Python API + AI/ML |
| `postgres` | `postgres:16-alpine` | `rmit-postgres` | `5432:5432` | Relational store |
| `opensearch` | `opensearchproject/opensearch:2.13.0` | `rmit-opensearch` | `9200:9200` | Search + vector index |

## Removed services

| Service | Reason |
|---|---|
| `backend` | Go service retired; replaced by `app` |
| `ai-service` | Merged into `app` |

## Dependency rules

```
app → depends_on postgres (service_healthy)
app → depends_on opensearch (service_healthy)
```

## In-container environment overrides for `app`

The `app` service MUST override these env vars so container DNS is used (not `localhost`):

| Variable | Container value |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://<user>:<pass>@postgres:5432/<db>` |
| `OPENSEARCH_URL` | `http://opensearch:9200` |

## Healthcheck for `app`

```yaml
test: ["CMD-SHELL", "curl -fsS http://localhost:8080/api/v1/health >/dev/null || exit 1"]
interval: 10s
timeout: 5s
retries: 6
```
