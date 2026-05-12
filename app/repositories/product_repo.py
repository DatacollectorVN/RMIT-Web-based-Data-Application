from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.product import Product
from models.review import Review
from schemas.product import ProductCreate, ProductUpdate


async def get_by_id(db: AsyncSession, product_id: int) -> Product | None:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.photos))
        .where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def get_by_ids_in_order(db: AsyncSession, ids: list[int]) -> list[Product]:
    """Load products by primary key, then reorder to match ``ids`` (duplicates and missing rows omitted)."""
    if not ids:
        return []
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.photos))
        .where(Product.id.in_(ids))
    )
    by_id = {p.id: p for p in result.scalars().all()}
    return [by_id[i] for i in ids if i in by_id]


async def list_all(
    db: AsyncSession, page: int, limit: int, brand: str | None = None
) -> tuple[list[Product], int]:
    offset = (page - 1) * limit
    base = select(Product)
    if brand:
        base = base.where(Product.brand == brand)
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()
    result = await db.execute(
        base
        .options(selectinload(Product.photos))
        .order_by(Product.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def get_review_stats(
    db: AsyncSession, product_ids: list[int]
) -> dict[int, dict]:
    """Single aggregate query: returns {product_id: {review_count, avg_rating}}."""
    if not product_ids:
        return {}
    result = await db.execute(
        select(
            Review.product_id,
            func.count(Review.id).label("review_count"),
            func.avg(Review.rating).label("avg_rating"),
        )
        .where(Review.product_id.in_(product_ids))
        .group_by(Review.product_id)
    )
    return {
        row.product_id: {
            "review_count": row.review_count,
            "avg_rating": float(row.avg_rating) if row.avg_rating is not None else None,
        }
        for row in result.all()
    }


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
