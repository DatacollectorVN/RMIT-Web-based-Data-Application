# Quickstart: SPEC-04 Python App Consolidation

## Prerequisites
- Docker + Docker Compose
- `uv` (`brew install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)

---

## 1. Start infrastructure + app

```bash
cp .env.example .env   # edit credentials if needed
docker compose up -d
```

Expect 3 running containers: `rmit-app`, `rmit-postgres`, `rmit-opensearch`.

---

## 2. Check app health

```bash
curl http://localhost:8080/api/v1/health
# → {"data":{"status":"ok"}}
```

---

## 3. Apply database migrations

```bash
make migratedb
# → applying 000001_create_extensions.up.sql ... OK
# → applying 000002_create_users.up.sql ... OK
# → ...
# → migrate: applied 7 migration(s)
```

Check migration status at any time:
```bash
make migratestatus
```

---

## 4. Load snapshot data

```bash
make snapshotdb
# → snapshotdb: seed applied from snapshot_seed.sql
```

---

## 5. Initialise OpenSearch index

```bash
make opensearchinit
```

---

## 6. Reindex products into OpenSearch (Python)

```bash
make reindexproducts
# → target index: products
# → reindex summary: indexed=8 failed=0 skipped=0
```

Or run directly:

```bash
python app/scripts/reindex_products.py
```

---

## 7. Run keyword relevance check

```bash
python app/scripts/search_relevance_check.py
# → query='hydrating cleanser' hits=1
# → ...
```

---

## 8. Run app locally (without Docker)

```bash
make install    # installs the uv venv from app/uv.lock
make dev        # starts FastAPI with hot-reload on :8080
```

Or manually from `app/`:
```bash
cd app
uv sync --frozen
uv run uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `rmit-app` exits on start | healthcheck path wrong | Ensure `GET /api/v1/health` returns 200 |
| `reindex summary: indexed=0` | No products in PostgreSQL | Run `make snapshotdb` first |
| `error: DATABASE_URL is not set` | `.env` not loaded | Confirm `include .env` in Makefile or export manually |
| `error: cannot connect to PostgreSQL` | DB not running | Run `docker compose up -d postgres` first |
| OpenSearch returns 0 hits | Index not initialised | Run `make opensearchinit` then `make reindexproducts` |
