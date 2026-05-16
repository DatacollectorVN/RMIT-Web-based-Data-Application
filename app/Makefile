# app/Makefile — all Python-logic commands, run via `uv run`.
#
# Usage from repo root:  make -C app migratedb
# Usage from app/:       make migratedb
#
# All scripts load DATABASE_URL / OPENSEARCH_URL from the root .env automatically
# via python-dotenv (searches parent directories).

.PHONY: install \
	migratedb migratedbdown1 migratedbreapply migratestatus \
	snapshotdb downloadrfmodel \
	reindexproducts relevancecheck

# ──────────────────────────────────────────────
# Package management
# ──────────────────────────────────────────────

# Install / sync the virtual environment from the lockfile.
install:
	uv sync --frozen

# Upgrade lockfile and re-sync.
upgrade:
	uv lock --upgrade
	uv sync

# ──────────────────────────────────────────────
# Database migrations (app/scripts/migrate.py)
# ──────────────────────────────────────────────

# Apply all pending migrations (schema only; does not touch product-photos/).
migratedb:
	uv run python scripts/migrate.py up

# Roll back one migration step.
migratedbdown1:
	uv run python scripts/migrate.py down 1

# Drop all migrations and re-apply from scratch.
migratedbreapply:
	uv run python scripts/migrate.py reapply

# Show applied / pending migration versions.
migratestatus:
	uv run python scripts/migrate.py status

# ──────────────────────────────────────────────
# Seed data (app/scripts/snapshotdb.py)
# ──────────────────────────────────────────────

# Load snapshot/sample data into the current database.
snapshotdb:
	uv run python scripts/snapshotdb.py

# Download rf_pipeline.pkl from Google Drive into app/ai/model/ (gitignored).
downloadrfmodel:
	uv run python scripts/download_rf_model.py

# ──────────────────────────────────────────────
# OpenSearch (app/scripts/reindex_products.py)
# ──────────────────────────────────────────────

# Reindex all PostgreSQL products into OpenSearch.
reindexproducts:
	uv run python scripts/reindex_products.py

# Run keyword relevance checks against OpenSearch.
relevancecheck:
	uv run python scripts/search_relevance_check.py

# ──────────────────────────────────────────────
# Dev server
# ──────────────────────────────────────────────

# Start the FastAPI dev server locally (hot-reload).
dev:
	uv run uvicorn main:app --host 0.0.0.0 --port 8080 --reload
