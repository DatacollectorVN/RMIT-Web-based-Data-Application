# Contract: Health Endpoint

## `GET /api/v1/health`

**Auth required**: No  
**Purpose**: Liveness check for the `app` container healthcheck and external monitoring.

### Success response — HTTP 200

```json
{
  "data": {
    "status": "ok"
  }
}
```

### Invariants
- MUST return HTTP 200 when the process is alive.
- MUST use the standard `{"data": {...}}` envelope (see SPEC-00 §7).
- MUST NOT require a database or OpenSearch connection to respond.
- Response MUST be returned within 1 second under normal load.

### Used by
- `docker-compose.yml` healthcheck: `curl -fsS http://localhost:8080/api/v1/health`
- `make dockerup` depends_on health condition for downstream services.
