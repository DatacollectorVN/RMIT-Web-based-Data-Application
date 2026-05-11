from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.product import Product
from schemas.product import ProductCreate, ProductUpdate


async def get_by_id(db: AsyncSession, product_id: int) -> Product | None:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.photos))
        .where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def list_all(db: AsyncSession, page: int, limit: int) -> tuple[list[Product], int]:
    offset = (page - 1) * limit
    count_result = await db.execute(select(func.count()).select_from(Product))
    total = count_result.scalar_one()
    # No photo join — list endpoint returns product table columns only.
    result = await db.execute(select(Product).order_by(Product.id).offset(offset).limit(limit))
    return list(result.scalars().all()), total


async def create(db: AsyncSession, data: ProductCreate) -> Product:
    product = Product(
        brand=data.brand,
        name=data.name,
        description=data.description,
        price=data.price,
        category=data.category,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    # Reload with photos relationship
    return await get_by_id(db, product.id)  # type: ignore[return-value]


async def update(db: AsyncSession, product: Product, data: ProductUpdate) -> Product:
    if data.brand is not None:
        product.brand = data.brand
    if data.name is not None:
        product.name = data.name
    if data.description is not None:
        product.description = data.description
    if data.price is not None:
        product.price = data.price
    if data.category is not None:
        product.category = data.category
    await db.commit()
    await db.refresh(product)
    return await get_by_id(db, product.id)  # type: ignore[return-value]


async def delete(db: AsyncSession, product: Product) -> None:
    await db.delete(product)
    await db.commit()
