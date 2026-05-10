import os
from dotenv import load_dotenv

load_dotenv()


def _adapt_db_url(url: str) -> str:
    """Convert postgres:// or postgresql:// to postgresql+asyncpg:// for SQLAlchemy.
    Also strips ?sslmode=... query params that asyncpg does not accept as URL params."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix) and "+asyncpg" not in url:
            url = url.replace(prefix, "postgresql+asyncpg://", 1)
            break
    # asyncpg does not accept sslmode as a query parameter; strip it.
    if "sslmode=" in url:
        import re
        url = re.sub(r"[?&]sslmode=[^&]*", "", url).rstrip("?&")
    return url


DATABASE_URL: str = _adapt_db_url(os.environ.get("DATABASE_URL", ""))
OPENSEARCH_URL: str = os.environ.get("OPENSEARCH_URL", "http://localhost:9200")
OPENSEARCH_INDEX_PRODUCTS: str = os.environ.get("OPENSEARCH_INDEX_PRODUCTS", "products")
PORT: int = int(os.environ.get("PORT", "8080"))
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_EXPIRY_HOURS: int = int(os.environ.get("JWT_EXPIRY_HOURS", "72"))
ENV: str = os.environ.get("ENV", "development")
