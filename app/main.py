import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from opensearchpy import OpenSearch
from sqlalchemy import text

from config import OPENSEARCH_URL
from database import engine
from routers.health import router as health_router

logger = logging.getLogger(__name__)


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
    application.include_router(health_router, prefix="/api/v1")
    return application


app = create_app()
