import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_REPO_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_PRODUCT_PHOTOS = _REPO_ROOT / "data" / "product-photos"


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
ENV: str = os.environ.get("ENV", "development")

# Uploaded product images (directory created by repo layout under data/product-photos).
PRODUCT_PHOTOS_DIR: Path = Path(
    os.environ.get("PRODUCT_PHOTOS_DIR", str(_DEFAULT_PRODUCT_PHOTOS))
).resolve()
