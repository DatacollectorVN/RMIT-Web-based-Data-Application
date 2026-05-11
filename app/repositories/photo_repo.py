from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.product import Photo
from schemas.photo import PhotoUpdate


async def get_by_id(db: AsyncSession, photo_id: int) -> Photo | None:
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    return result.scalar_one_or_none()


async def list_by_product(db: AsyncSession, product_id: int) -> list[Photo]:
    result = await db.execute(
        select(Photo)
        .where(Photo.product_id == product_id)
        .order_by(Photo.sort_order, Photo.id)
    )
    return list(result.scalars().all())


async def create_with_url(
    db: AsyncSession,
    product_id: int,
    url: str,
    is_primary: bool = False,
    sort_order: int = 0,
    is_active: bool = True,
) -> Photo:
    photo = Photo(
        product_id=product_id,
        url=url,
        is_primary=is_primary,
        sort_order=sort_order,
        is_active=is_active,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


async def set_url(db: AsyncSession, photo: Photo, url: str) -> Photo:
    photo.url = url
    await db.commit()
    await db.refresh(photo)
    return photo


async def update(db: AsyncSession, photo: Photo, data: PhotoUpdate) -> Photo:
    if data.is_primary is not None:
        photo.is_primary = data.is_primary
    if data.sort_order is not None:
        photo.sort_order = data.sort_order
    if data.is_active is not None:
        photo.is_active = data.is_active
    await db.commit()
    await db.refresh(photo)
    return photo


async def delete(db: AsyncSession, photo: Photo) -> None:
    await db.delete(photo)
    await db.commit()
