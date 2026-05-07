# Migration runbook

**Feature**: SPEC-02 — PostgreSQL schema & migrations  
**Authority**: SPEC-00 migration conventions  
**Scope**: Local developer workflow

## Preconditions

- Docker Compose stack is available (see repo `docker-compose.yml`).
- `DATABASE_URL` is set (see `.env.example`).

## Apply migrations from clean database

1. Start database:

```bash
docker compose up -d postgres
```

2. Ensure database is reachable using `DATABASE_URL`.

3. Apply migrations:

```bash
make migratedb
```

**Expected result**: tables `users`, `products`, `reviews`, `orders`, `order_items` exist, with indexes and trigger function/triggers.

## Roll back and re-apply drill (SC-002)

1. Roll back the most recent migration step:

```bash
make migratedb-down-1
```

2. Re-apply:

```bash
make migratedb
```

**Expected result**: schema returns to the exact same state without manual edits.

## Integrity checks (SC-004)

After applying migrations:

- Attempt to insert a `review` with a non-existent `product_id` → should fail.
- Attempt to insert `rating = 0` or `rating = 6` → should fail.
- Attempt to insert `order_items.quantity = 0` → should fail.

Record the outcomes in your PR description when implementing migrations.
