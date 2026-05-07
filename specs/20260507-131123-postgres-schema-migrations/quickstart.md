# Quickstart (SPEC-02 migrations)

**Repository root**: `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application`

## 1. Configure environment

```bash
cp .env.example .env
```

## 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

## 3. Apply migrations

```bash
make migratedb
```

## 4. Rollback drill

See [contracts/migration-runbook.md](./contracts/migration-runbook.md).
