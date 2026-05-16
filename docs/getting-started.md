# Getting Started

This guide walks a developer through setting up the RMIT Beauty App from scratch — from installing system prerequisites to having a fully running local stack with seed data loaded.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository](#2-clone-the-repository)
3. [Download ML Model File](#3-download-ml-model-file)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Path A — Docker (recommended)](#5-path-a--docker-recommended)
6. [Path B — Local Dev Server (hot-reload)](#6-path-b--local-dev-server-hot-reload)
7. [Verify Everything Works](#7-verify-everything-works)
8. [Useful Make Targets](#8-useful-make-targets)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

Install the following tools before proceeding. Minimum required versions are listed.

### Docker + Docker Compose

Docker Desktop bundles both the Docker daemon and the Compose plugin.

| Platform | Install |
|---|---|
| **macOS** | [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) — installs both `docker` and `docker compose` |
| **Linux** | Install [Docker Engine](https://docs.docker.com/engine/install/) then the [Compose plugin](https://docs.docker.com/compose/install/linux/) |
| **Windows** | [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) (WSL 2 backend recommended) |

Verify:

```bash
docker --version          # Docker version 24+
docker compose version    # Docker Compose version v2.24+
```

> **Resources:** Docker Desktop needs at least **4 GB RAM** and **4 GB disk** free for OpenSearch + Postgres images.  
> In Docker Desktop → Settings → Resources, set Memory to at least **4 GB**.

---

### uv — Python package manager

`uv` is used to manage the Python virtual environment and run all Python scripts. Only needed for **Path B** (local dev) or running `make` targets outside Docker.

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via Homebrew (macOS)
brew install uv

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Verify:

```bash
uv --version    # uv 0.4+
```

> `uv` automatically manages a `.venv` inside `app/` — you do **not** need to create or activate it manually.

---

### Python 3.11

Required only for **Path B**. `uv` can install it automatically:

```bash
uv python install 3.11
```

Or install via your OS package manager / [python.org](https://www.python.org/downloads/).

Verify:

```bash
python3.11 --version    # Python 3.11.x
```

---

### make

Used to run convenience targets from the `Makefile`.

| Platform | Install |
|---|---|
| **macOS** | Included with Xcode Command Line Tools: `xcode-select --install` |
| **Linux** | `sudo apt install make` / `sudo dnf install make` |
| **Windows** | Install via [Chocolatey](https://chocolatey.org/): `choco install make`, or use WSL |

Verify:

```bash
make --version    # GNU Make 3.81+
```

---

### curl

Used by the `opensearch/init.sh` script and health checks.

- **macOS / Linux:** pre-installed
- **Windows:** available in Git Bash, WSL, or install via `winget install curl.curl`

---

## 2. Clone the Repository

```bash
git clone <repository-url>
cd RMIT-Web-based-Data-Application
```

---

## 3. Download ML Model File

The trained Random Forest classifier (`rf_pipeline.pkl`) is too large for Git and is hosted on Google Drive. You must fetch it once before starting the app (or before `docker compose build` so the file is copied into the image).

> **On disk:** `app/ai/model/rf_pipeline.pkl`  
> **Browser:** [rf_pipeline.pkl on Google Drive](https://drive.google.com/file/d/15C3q-VN5BIO1sb-VwHVBH-QSVEaDxVTY/view?usp=drive_link)

### Option A — script (recommended)

From the **repo root**, install Python deps (includes `gdown`) then run the downloader:

```bash
make install
make downloadrfmodel
```

Equivalent without Make:

```bash
cd app && uv sync --frozen && uv run python scripts/download_rf_model.py
```

- Skips the download if the file already exists; use `--force` to overwrite:
  ```bash
  cd app && uv run python scripts/download_rf_model.py --force
  ```
- For **Docker**: run `make downloadrfmodel` on the host **before** `docker compose build` so `app/ai/model/rf_pipeline.pkl` exists when the image is built.

### Option B — manual `gdown` CLI

```bash
make install
mkdir -p app/ai/model
cd app && uv run gdown 15C3q-VN5BIO1sb-VwHVBH-QSVEaDxVTY -O ai/model/rf_pipeline.pkl
```

### Option C — manual download in the browser

1. Open the [Google Drive link](https://drive.google.com/file/d/15C3q-VN5BIO1sb-VwHVBH-QSVEaDxVTY/view?usp=drive_link).
2. Click **Download**.
3. Move the file to `app/ai/model/rf_pipeline.pkl` (create the folder if needed).

> **Why is this file gitignored?** Binary model files are large; `.gitignore` lists `app/ai/model/rf_pipeline.pkl` on purpose so clones stay small.

---

## 4. Configure Environment Variables

The application reads all configuration from a `.env` file in the repo root.

```bash
cp .env.example .env
```

The defaults work out of the box for local Docker development. Open `.env` if you need to change credentials:

```bash
# .env — key variables

# PostgreSQL
DATABASE_URL=postgres://rmit:rmit@localhost:5432/rmit?sslmode=disable
POSTGRES_USER=rmit
POSTGRES_PASSWORD=rmit
POSTGRES_DB=rmit

# OpenSearch
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_INDEX_PRODUCTS=products

# API
PORT=8080
ENV=development
```

> **Note:** `docker-compose.yml` automatically overrides `DATABASE_URL` and `OPENSEARCH_URL` inside containers to use Docker service hostnames (`postgres`, `opensearch`). The `.env` values are used by `make` targets and scripts running on your host machine.

---

## 5. Path A — Docker (recommended)

This path starts the full stack (PostgreSQL + OpenSearch + FastAPI + React) in Docker. No Python or Node installation required on the host for the UI/API containers themselves.

`rf_pipeline.pkl` is not in Git. **Before the first `docker compose build`**, either follow [Section 3](#3-download-ml-model-file) on the host (`make install && make downloadrfmodel`) so the file exists under `app/ai/model/`, or place it there manually after downloading from Google Drive. Otherwise the image will start without that file and the counting-predict endpoint may fail.

### Step 1 — Build and start all services

```bash
docker compose up -d
```

Docker pulls the base images and builds the `app` and `ui` containers. **This takes 5–15 minutes on the first run** because:
- OpenSearch (~800 MB) and Postgres (~100 MB) images are downloaded
- Python ML models (DeBERTa ~141 MB, MiniLM ~80 MB) are downloaded and cached inside the `app` container at startup

Monitor progress:

```bash
docker compose logs -f app
```

Wait until you see all three of these log lines:

```
INFO     root — Database connection OK
INFO     root — OpenSearch client initialised: http://opensearch:9200
INFO     root — AI pipeline loaded and ready
INFO     root — Semantic model 'nli-deberta-v3-small' loaded and ready
INFO     root — Semantic model 'minilm' loaded and ready
```

### Step 2 — Apply database schema migrations

```bash
make migratedb
```

This runs `app/scripts/migrate.py up` via `uv run` inside the `app` container, applying all SQL migration files in order.

Expected output:

```
Applied migration: 001_create_users.sql
Applied migration: 002_create_products.sql
...
All migrations applied.
```

### Step 3 — Load seed data

```bash
make snapshotdb
```

Inserts sample users, products, reviews, and orders from `app/scripts/snapshotdb.py`.

### Step 4 — Initialise OpenSearch index

```bash
make opensearchinit
```

Creates the `products` index with the 385-dim KNN mapping defined in `opensearch/products_mapping.json`. Safe to re-run — exits cleanly if the index already exists.

### Step 5 — Encode and upload product vectors

```bash
make reindexproducts
```

Runs `app/scripts/reindex_products.py` which:
1. Loads all products from PostgreSQL
2. Encodes each product with `all-MiniLM-L6-v2` → 384-dim embedding + normalised price → 385-dim vector
3. Bulk-uploads the vectors to OpenSearch

This enables product search and similarity recommendations.

### Step 6 — Verify

```bash
curl http://localhost:8080/api/v1/health
# → {"data":{"status":"ok"}}
```

| Service | URL |
|---|---|
| **GlowShop UI** | http://localhost:3000 |
| **API** | http://localhost:8080/api/v1 |
| **API Docs (Swagger)** | http://localhost:8080/docs |
| **OpenSearch** | http://localhost:9200 |

---

## 6. Path B — Local Dev Server (hot-reload)

Use this path when actively developing the FastAPI backend. The app runs directly on your machine with `--reload`, so changes to Python files restart the server immediately. PostgreSQL and OpenSearch still run in Docker.

### Step 1 — Start infrastructure only

```bash
docker compose up -d postgres opensearch
```

### Step 2 — Install Python dependencies

From the repo root:

```bash
make install
# equivalent to: cd app && uv sync --frozen
```

`uv` creates `app/.venv` and installs all packages from `app/uv.lock`.

### Step 2b — Download the RF classifier model (once per clone)

```bash
make downloadrfmodel
```

### Step 3 — Apply migrations and seed data

```bash
make migratedb
make snapshotdb
make opensearchinit
make reindexproducts
```

### Step 4 — Start the dev server

```bash
make dev
# equivalent to: cd app && uv run uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

The API is now available at `http://localhost:8080` with live reload on file save.

### Step 5 (optional) — Run the frontend locally

In a separate terminal:

```bash
cd ui
npm install
npm run dev
```

The React dev server starts at `http://localhost:5173` and proxies API requests to `http://localhost:8080`.

---

## 7. Verify Everything Works

Run these checks after either setup path to confirm all services are healthy.

### Health check

```bash
curl http://localhost:8080/api/v1/health
```

Expected:

```json
{"data":{"status":"ok"}}
```

### List products (checks DB)

```bash
curl "http://localhost:8080/api/v1/products/?limit=3"
```

Expected: JSON with `data.items` containing seeded products.

### Search products (checks OpenSearch)

```bash
curl "http://localhost:8080/api/v1/products/search?q=shampoo&limit=3"
```

Expected: JSON with matching products ranked by relevance.

### Similar products (checks KNN vectors)

```bash
curl "http://localhost:8080/api/v1/recommendations/similar/1?limit=4"
```

Expected: JSON with `data[].similarity` values between 0 and 1.

### Run the AI classifier

```bash
curl -s -X POST \
  "http://localhost:8080/api/v1/ai/counting-predict?product_id=1&user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"review_rating": 5, "review_title": "Love this product", "review_text": "Works great, totally worth it."}'
```

Expected:

```json
{"message":"Thank you! Your review is processed"}
```

### View interactive API docs

Open **http://localhost:8080/docs** in your browser for the full Swagger UI with all endpoints, request schemas, and try-it-out functionality.

---

## 8. Useful Make Targets

All targets are run from the **repo root** unless noted.

| Target | Description |
|---|---|
| `make install` | Install/sync Python venv from lockfile (`app/.venv`) |
| `make upgrade` | Upgrade all Python dependencies and regenerate lockfile |
| `make dev` | Start FastAPI hot-reload server on `:8080` |
| `make migratedb` | Apply all pending DB migrations |
| `make migratedbdown1` | Roll back one migration |
| `make migratedbreapply` | Drop all migrations and reapply from scratch |
| `make migratestatus` | Show which migrations are applied / pending |
| `make snapshotdb` | Load sample data into the database |
| `make downloadrfmodel` | Download `rf_pipeline.pkl` from Google Drive into `app/ai/model/` |
| `make opensearchinit` | Create the OpenSearch products index (idempotent) |
| `make reindexproducts` | Encode all products and upload vectors to OpenSearch |
| `make relevancecheck` | Run keyword relevance checks against OpenSearch |
| `make dockerbuild` | Build all Docker images |
| `make dockerup` | `docker compose up -d` |
| `make dockerdown` | `docker compose down` |
| `make dockerrestart` | `docker compose down && docker compose up -d` |

---

## 9. Troubleshooting

### OpenSearch container fails to start

**Symptom:** `docker compose logs opensearch` shows `max virtual memory areas vm.max_map_count [65530] is too low`.

**Fix (Linux only):**

```bash
sudo sysctl -w vm.max_map_count=262144

# Make permanent across reboots:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

On macOS/Windows with Docker Desktop this is handled automatically inside the VM.

---

### `make opensearchinit` fails with "index already exists in incompatible state"

The index mapping is out of date. Delete and recreate it:

```bash
curl -X DELETE http://localhost:9200/products
make opensearchinit
make reindexproducts
```

---

### `make migratedb` fails — "relation already exists"

The DB has a partially applied migration. Reapply cleanly:

```bash
make migratedbreapply
make snapshotdb
```

> **Warning:** `migratedbreapply` drops all tables and reapplies from zero. All existing data is lost.

---

### App container exits immediately after startup

The app waits for both `postgres` and `opensearch` to be healthy before starting, but AI model downloads can time out. Increase the `start_period` or just retry:

```bash
docker compose restart app
docker compose logs -f app
```

---

### Port already in use

If `8080`, `5432`, `9200`, or `3000` are taken:

```bash
# Find and kill the process (macOS/Linux)
lsof -i :8080
kill -9 <PID>
```

Or edit `docker-compose.yml` to change the host-side port mapping (e.g. `"8081:8080"`).

---

### `uv: command not found` when running `make` targets

`uv` is not on your `PATH`. Re-run the install command and open a new terminal:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Then open a new terminal shell
```

---

### Docker Desktop "not enough memory"

Open Docker Desktop → Settings → Resources → Memory and increase to at least **4 GB**. OpenSearch requires at least 512 MB heap (configured in `docker-compose.yml`) plus OS overhead.

---

### Products search returns empty results

OpenSearch index is empty. Run:

```bash
make opensearchinit      # creates index if missing
make reindexproducts     # uploads product vectors
```

Then verify the index has documents:

```bash
curl http://localhost:9200/products/_count
# → {"count": 150, ...}
```

---

### AI classifier returns 500 — "rf_pipeline.pkl not found"

The trained model file was not downloaded. Run the downloader (after `make install`):

```bash
make downloadrfmodel
```

Then rebuild/restart so the app sees the file:

```bash
# Docker (rebuild if the image was built without the file)
docker compose build app
docker compose up -d app

# Local dev server — Ctrl+C then:
make dev
```

See [Section 3](#3-download-ml-model-file) for details and `--force`.
