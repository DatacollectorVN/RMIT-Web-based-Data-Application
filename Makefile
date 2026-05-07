.PHONY: migratedb migratedb-down-1 migratedbreapply snapshotdb

# Load environment variables from .env if present.
ifneq (,$(wildcard .env))
include .env
export
endif

# Apply all migrations using golang-migrate CLI.
# Usage:
#   cp .env.example .env
#   make migratedb
migratedb:
	@test -n "$(DATABASE_URL)" || (echo "DATABASE_URL is not set"; exit 1)
	migrate -path ./migrations -database "$(DATABASE_URL)" up

# Roll back one migration step.
migratedb-down-1:
	@test -n "$(DATABASE_URL)" || (echo "DATABASE_URL is not set"; exit 1)
	migrate -path ./migrations -database "$(DATABASE_URL)" down 1

# Drop all applied migrations and reapply from scratch.
migratedbreapply:
	@test -n "$(DATABASE_URL)" || (echo "DATABASE_URL is not set"; exit 1)
	migrate -path ./migrations -database "$(DATABASE_URL)" down -all
	migrate -path ./migrations -database "$(DATABASE_URL)" up

# Load snapshot/sample data into current database.
snapshotdb:
	@test -n "$(DATABASE_URL)" || (echo "DATABASE_URL is not set"; exit 1)
	psql "$(DATABASE_URL)" -f ./scripts/snapshot_seed.sql
