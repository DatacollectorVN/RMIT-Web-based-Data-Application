import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from opensearchpy import OpenSearch
from sqlalchemy import text

from config import OPENSEARCH_URL, PRODUCT_PHOTOS_DIR
from database import engine
from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.health import router as health_router
from routers.orders import router as orders_router
from routers.products import router as products_router
from routers.recommendations import router as recommendations_router
from routers.reviews import router as reviews_router
from routers.users import router as users_router

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connectivity and initialise OpenSearch client.
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection OK")
    except Exception as exc:
        logger.warning("Database not reachable at startup: %s", exc)

    try:
        os_client = OpenSearch(hosts=[OPENSEARCH_URL])
        app.state.opensearch = os_client
        logger.info("OpenSearch client initialised: %s", OPENSEARCH_URL)
    except Exception as exc:
        logger.warning("OpenSearch client init failed: %s", exc)
        app.state.opensearch = None

    yield

    # Shutdown: dispose DB engine.
    await engine.dispose()
    logger.info("Database engine disposed")


def create_app() -> FastAPI:
    application = FastAPI(
        title="Beauty App API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Allow all origins in Phase 1 (public API, no JWT).
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(auth_router, prefix="/api/v1")
    application.include_router(dashboard_router, prefix="/api/v1")
    application.include_router(health_router, prefix="/api/v1")
    application.include_router(users_router, prefix="/api/v1")
    application.include_router(products_router, prefix="/api/v1")
    application.include_router(reviews_router, prefix="/api/v1")
    application.include_router(orders_router, prefix="/api/v1")
    application.include_router(recommendations_router, prefix="/api/v1")

    # Default favicon + small static bundle (tab icon when opening the API host in a browser).
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    application.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @application.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> FileResponse:
        return FileResponse(
            STATIC_DIR / "favicon.svg",
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # Ensure upload directory exists and serve it at /media
    PRODUCT_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    application.mount("/media", StaticFiles(directory=str(PRODUCT_PHOTOS_DIR)), name="media")

    return application


app = create_app()
