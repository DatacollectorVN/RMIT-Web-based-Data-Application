# Root Makefile — Docker orchestration + delegation to app/Makefile for Python logic.
#
# Python targets (migratedb, snapshotdb, etc.) are handled by app/Makefile
# and run via `uv run` inside the app/ virtual environment.
#
# To run Python targets directly:  make -C app migratedb
# To install the Python venv:      make install

.PHONY: install upgrade \
	migratedb migratedbdown1 migratedb-down-1 migratedbreapply migratestatus \
	snapshotdb downloadrfmodel download-rf-model \
	opensearchinit opensearch-init \
	reindexproducts reindex-products \
	indexproducts index-products \
	relevancecheck relevance-check \
	dev \
	dockerbuild dockerup dockerdown dockerrestart

# ──────────────────────────────────────────────
# Package management (delegates to app/)
# ──────────────────────────────────────────────

install:
	$(MAKE) -C app install

upgrade:
	$(MAKE) -C app upgrade

# ──────────────────────────────────────────────
# Database migrations (delegates to app/)
# ──────────────────────────────────────────────

migratedb:
	$(MAKE) -C app migratedb

migratedbdown1:
	$(MAKE) -C app migratedbdown1

# Alias (legacy dashed name).
migratedb-down-1: migratedbdown1

migratedbreapply:
	$(MAKE) -C app migratedbreapply

migratestatus:
	$(MAKE) -C app migratestatus

# ──────────────────────────────────────────────
# Seed data (delegates to app/)
# ──────────────────────────────────────────────

snapshotdb:
	$(MAKE) -C app snapshotdb

downloadrfmodel:
	$(MAKE) -C app downloadrfmodel

# Alias (legacy dashed name).
download-rf-model: downloadrfmodel

# ──────────────────────────────────────────────
# OpenSearch
# ──────────────────────────────────────────────

# Create/verify the OpenSearch products index (idempotent).
opensearchinit:
	@bash ./opensearch/init.sh

# Alias (legacy dashed name).
opensearch-init: opensearchinit

# Reindex PostgreSQL products into OpenSearch (delegates to app/).
reindexproducts:
	$(MAKE) -C app reindexproducts

# Alias (legacy dashed name).
reindex-products: reindexproducts

# Convenience: init mapping then reindex.
indexproducts: opensearchinit reindexproducts

# Alias (legacy dashed name).
index-products: indexproducts

# Keyword relevance check (delegates to app/).
relevancecheck:
	$(MAKE) -C app relevancecheck

# Alias (legacy dashed name).
relevance-check: relevancecheck

# ──────────────────────────────────────────────
# Local dev server (delegates to app/)
# ──────────────────────────────────────────────

dev:
	$(MAKE) -C app dev

# ──────────────────────────────────────────────
# Docker
# ──────────────────────────────────────────────

dockerbuild:
	docker compose build

dockerup:
	docker compose up -d

dockerdown:
	docker compose down

dockerrestart:
	docker compose down
	docker compose up -d
