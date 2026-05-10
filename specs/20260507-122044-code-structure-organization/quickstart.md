# Quickstart (local development)

**Repository root**: `/Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application`  
**Constitution**: `.specify/memory/constitution.md` (SPEC-00)

## Prerequisites

- Docker and Docker Compose v2
- Go 1.22+ (for local `go run` / tests on host)
- Python 3.11+ (optional if you only run `ai-service` in Docker)

## 1. Configure environment

```bash
cd /Users/nhan.ngo/rmit/RMIT-Web-based-Data-Application
cp .env.example .env
# Edit .env: set JWT_SECRET and any passwords to non-default values for local use.
```

## 2. Start infrastructure and services

```bash
docker compose up -d
```

Wait until `postgres`, `opensearch`, `ai-service`, and `backend` are healthy (see `docker compose ps`). Service names and ports are fixed in [contracts/local-runtime.md](./contracts/local-runtime.md).

## 3. Apply database migrations (when SQL exists)

Per SPEC-00 §8:

```bash
migrate -path ./migrations -database "$DATABASE_URL" up
```

Until SPEC-02 adds real migration files, this step may be a no-op or skipped if the tool is not yet installed.

## 4. Apply OpenSearch mapping (first-time)

From repo root (after `opensearch/init.sh` exists and is executable):

```bash
chmod +x opensearch/init.sh
./opensearch/init.sh
```

Mapping content evolves in SPEC-03; the script should be idempotent or documented if manual.

## 5. Run the Go API on the host (optional during development)

```bash
cd backend
export $(grep -v '^#' ../.env | xargs)  # or use your shell’s dotenv helper
go run .
```

Alternatively, rely on a `backend` service in Compose once the Dockerfile exists.

## 6. Run the AI service on the host (optional)

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 7. Smoke checks

- Go API: `http://localhost:8080/health` should return success.
- OpenSearch: `http://localhost:9200` cluster health (with security settings per your Compose file).
- AI service: internal only; verify from Go container or `curl` to `localhost:8000` if port published.

## Troubleshooting

- **Port conflicts**: Adjust host ports in `docker-compose.yml` and mirror changes in `.env.example` and [contracts/local-runtime.md](./contracts/local-runtime.md).
- **ARM Mac OpenSearch**: Use an image/tag known to support your architecture or run OpenSearch with platform `linux/amd64` if required (document any deviation in `README.md`).
