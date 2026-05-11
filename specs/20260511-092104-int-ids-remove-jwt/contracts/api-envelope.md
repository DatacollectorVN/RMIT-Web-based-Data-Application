# Contract: API envelope & authentication (Phase 1)

## Base URL

`http://localhost:8080/api/v1` (unchanged).

## Success envelope

```json
{ "data": { ... } }
```

## Authentication

- **Phase 1 (this feature)**: Clients MUST NOT be required to send an `Authorization` header for any route shipped in this milestone.
- **401 / 403**: Reserved for future authenticated routes; MUST NOT be returned solely due to missing JWT on routes defined as public for Phase 1.

## Resource identifiers

- JSON fields named `id`, `*_id` for core entities MUST be **integers** (JSON number), not UUID strings.

## Health check

`GET /api/v1/health` → `200` and `{"data":{"status":"ok"}}` with no auth header.
