from fastapi import HTTPException, UploadFile
from opensearchpy import OpenSearch
from sqlalchemy.ext.asyncio import AsyncSession

from config import PRODUCT_PHOTOS_DIR
from models.product import Photo, Product
from opensearch import product_index
from repositories import photo_repo, product_repo
from schemas.photo import PhotoUpdate
from schemas.product import ProductCreate, ProductUpdate


async def get_product(db: AsyncSession, product_id: int) -> Product:
    product = await product_repo.get_by_id(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


async def list_products(db: AsyncSession, page: int, limit: int) -> tuple[list[Product], int]:
    return await product_repo.list_all(db, page, limit)


async def add_product_with_photo(
    db: AsyncSession,
    os_client: OpenSearch,
    data: ProductCreate,
    file: UploadFile | None = None,
) -> Product:
    """Create a product and, if a file is provided, immediately attach it as the primary photo."""
    product = await product_repo.create(db, data)
    product_index.upsert(os_client, product)

    if file is not None:
        photo = await photo_repo.create_with_url(
            db, product.id, url="", is_primary=True, sort_order=0, is_active=True
        )
        dest_dir = PRODUCT_PHOTOS_DIR / "products" / str(product.id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / f"{photo.id}.png"
        contents = await file.read()
        dest.write_bytes(contents)
        public_url = f"/media/products/{product.id}/{photo.id}.png"
        await photo_repo.set_url(db, photo, public_url)

    # Reload with photos relationship populated
    return await product_repo.get_by_id(db, product.id)  # type: ignore[return-value]


async def create_product(db: AsyncSession, os_client: OpenSearch, data: ProductCreate) -> Product:
    product = await product_repo.create(db, data)
    product_index.upsert(os_client, product)
    return product


async def update_product(
    db: AsyncSession, os_client: OpenSearch, product_id: int, data: ProductUpdate
) -> Product:
    product = await get_product(db, product_id)
    updated = await product_repo.update(db, product, data)
    product_index.upsert(os_client, updated)
    return updated


async def delete_product(db: AsyncSession, os_client: OpenSearch, product_id: int) -> None:
    product = await get_product(db, product_id)
    await product_repo.delete(db, product)
    product_index.delete(os_client, product_id)


# --- Photo sub-resource ---

async def _assert_product_exists(db: AsyncSession, product_id: int) -> None:
    product = await product_repo.get_by_id(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")


async def _get_photo(db: AsyncSession, product_id: int, photo_id: int) -> Photo:
    await _assert_product_exists(db, product_id)
    photo = await photo_repo.get_by_id(db, photo_id)
    if photo is None or photo.product_id != product_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


async def list_photos(db: AsyncSession, product_id: int) -> list[Photo]:
    await _assert_product_exists(db, product_id)
    return await photo_repo.list_by_product(db, product_id)


async def create_photo(
    db: AsyncSession,
    product_id: int,
    file: UploadFile,
    is_primary: bool = False,
    sort_order: int = 0,
    is_active: bool = True,
) -> Photo:
    await _assert_product_exists(db, product_id)

    # 1. Create a placeholder row to obtain the auto-generated photo.id
    photo = await photo_repo.create_with_url(
        db, product_id, url="", is_primary=is_primary, sort_order=sort_order, is_active=is_active
    )

    # 2. Save the uploaded file to: PRODUCT_PHOTOS_DIR/products/{product_id}/{photo_id}.png
    dest_dir = PRODUCT_PHOTOS_DIR / "products" / str(product_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{photo.id}.png"
    contents = await file.read()
    dest.write_bytes(contents)

    # 3. Update url to the public path served by StaticFiles at /media
    public_url = f"/media/products/{product_id}/{photo.id}.png"
    return await photo_repo.set_url(db, photo, public_url)


async def update_photo(db: AsyncSession, product_id: int, photo_id: int, data: PhotoUpdate) -> Photo:
    photo = await _get_photo(db, product_id, photo_id)
    return await photo_repo.update(db, photo, data)


async def delete_photo(db: AsyncSession, product_id: int, photo_id: int) -> None:
    photo = await _get_photo(db, product_id, photo_id)
    # Remove file from disk if it exists
    if photo.url:
        file_path = PRODUCT_PHOTOS_DIR / photo.url.removeprefix("/media/")
        if file_path.exists():
            file_path.unlink()
    await photo_repo.delete(db, photo)
