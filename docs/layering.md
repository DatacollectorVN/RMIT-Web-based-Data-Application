# Go Layering Rules (SPEC-01 / SPEC-00)

## Dependency direction

```text
handler -> service -> repository -> domain
                 \-> aiclient
                 \-> opensearch
```

## Package responsibilities

- `backend/handler/`: HTTP request/response glue only; no SQL.
- `backend/service/`: orchestration and business flow; may call repository, AI client, and OpenSearch helpers.
- `backend/repository/`: SQL only; no HTTP concerns.
- `backend/domain/`: shared types/errors; avoid external dependencies.
- `backend/aiclient/`: internal AI HTTP client called from service layer.
- `backend/opensearch/`: OpenSearch query and index helpers called from service layer.

## Allowed / forbidden edges

- Allowed:
  - `handler` imports `service` and `domain`
  - `service` imports `repository`, `domain`, `aiclient`, `opensearch`
  - `repository` imports `domain`
- Forbidden:
  - `repository` importing `service` or `handler`
  - `domain` importing upper layers
  - Any circular imports across `backend/*`

## Audit procedure (SC-003)

Run from `backend/`:

1. `go list ./...` to confirm packages resolve.
2. `go list -deps ./...` and inspect dependency output (or use your chosen import graph helper) for forbidden edges.
3. Record package-by-package result in `docs/layering-audit.md`.

## Audit sample set

- `backend/handler`
- `backend/service`
- `backend/repository`
- `backend/domain`
- `backend/aiclient`
- `backend/opensearch`
- `backend/router`
- `backend/middleware`
- `backend/config`
- `backend/db`
