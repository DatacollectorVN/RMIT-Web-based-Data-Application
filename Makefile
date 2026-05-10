.PHONY: migratedb migratedbdown1 migratedb-down-1 migratedbreapply snapshotdb \
	opensearchinit opensearch-init \
	reindexproducts reindex-products \
	indexproducts index-products \
	dockerbuild dockerup dockerdown dockerrestart

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
migratedbdown1:
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

# Create OpenSearch index (idempotent create).
opensearchinit:
	@bash ./opensearch/init.sh

# Alias (legacy dashed name).
opensearch-init: opensearchinit

# Reindex PostgreSQL products into OpenSearch.
reindexproducts:
	@test -n "$(DATABASE_URL)" || (echo "DATABASE_URL is not set"; exit 1)
	@test -n "$(OPENSEARCH_URL)" || (echo "OPENSEARCH_URL is not set"; exit 1)
	cd ./scripts && go mod tidy && go run ./reindex_products.go

# Convenience: init mapping then reindex.
indexproducts: opensearchinit reindexproducts

dockerbuild:
	docker compose build

dockerup:
	docker compose up -d

dockerdown:
	docker compose down

dockerrestart:
	docker compose down
	docker compose up -d