# Quickstart: Integer PKs & no JWT

After implementation of this feature, use this flow on a **fresh** database (existing UUID databases should be recreated).

## 1. Environment

```bash
cp .env.example .env
# Ensure DATABASE_URL points at your Postgres (Docker or host).
# JWT_* vars are optional / absent for Phase 1.
```

## 2. Stack

```bash
docker compose up -d
make install          # from repo root — syncs app uv env
```

## 3. Schema & seed

```bash
make migratedbreapply   # or migratedb on empty DB
make snapshotdb
```

## 4. OpenSearch

```bash
make opensearchinit
make reindexproducts
```

## 5. Verify

```bash
# No Authorization header
curl -s http://localhost:8080/api/v1/health

# Example: inspect products id type in psql (optional)
# SELECT id, name FROM products LIMIT 3;
# ids should be small integers (1, 2, 3, …)
```

## 6. Relevance check

```bash
make relevancecheck
```

## Troubleshooting

| Issue | Action |
|-------|--------|
| Migration errors after UUID schema | `docker compose down -v` (dev only), then `docker compose up -d`, re-run `make migratedbreapply` |
| OpenSearch mapping conflict | Delete `products` index in dev, run `make opensearchinit` and `make reindexproducts` |
| Old UUID in seed file | Ensure `app/scripts/snapshot_seed.sql` uses integer literals only |
