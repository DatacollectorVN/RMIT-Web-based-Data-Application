from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from models.review import Review
from models.user import User
from schemas.review import ReviewCreate, ReviewUpdate


async def get_by_id(db: AsyncSession, review_id: int) -> tuple[Review, str | None] | None:
    result = await db.execute(
        select(Review, User.full_name)
        .outerjoin(User, Review.user_id == User.id)
        .where(Review.id == review_id)
    )
    row = result.one_or_none()
    if row is None:
        return None
    return row.Review, row.full_name


async def list_all(
    db: AsyncSession,
    page: int,
    limit: int,
    product_id: int | None = None,
    user_id: int | None = None,
) -> tuple[list[tuple[Review, str | None]], int]:
    offset = (page - 1) * limit
    query = select(Review, User.full_name).outerjoin(User, Review.user_id == User.id)
    count_query = select(func.count()).select_from(Review)

    if product_id is not None:
        query = query.where(Review.product_id == product_id)
        count_query = count_query.where(Review.product_id == product_id)
    if user_id is not None:
        query = query.where(Review.user_id == user_id)
        count_query = count_query.where(Review.user_id == user_id)

    count_result = await db.execute(count_query)
    total = count_result.scalar_one()
    result = await db.execute(query.order_by(Review.updated_at.desc()).offset(offset).limit(limit))
    return [(row.Review, row.full_name) for row in result.all()], total


async def create(db: AsyncSession, data: ReviewCreate) -> Review:
    review = Review(
        user_id=data.user_id,
        product_id=data.product_id,
        title=data.title,
        content=data.content,
        rating=data.rating,
        status="pending",
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


async def update(db: AsyncSession, review: Review, data: ReviewUpdate) -> Review:
    if data.title is not None:
        review.title = data.title
    if data.content is not None:
        review.content = data.content
    if data.rating is not None:
        review.rating = data.rating
    if data.status is not None:
        review.status = data.status
    await db.commit()
    await db.refresh(review)
    return review


async def delete(db: AsyncSession, review: Review) -> None:
    await db.delete(review)
    await db.commit()


async def get_stats_excluding(
    db: AsyncSession,
    product_id: int,
    exclude_review_id: int,
) -> tuple[float | None, int]:
    """Return (avg_rating, count) for a product excluding one review.

    Used so that avg_product_rating and product_rating_count reflect
    the product's history without the review being classified.
    """
    result = await db.execute(
        select(
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("count"),
        )
        .where(
            Review.product_id == product_id,
            Review.id != exclude_review_id,
        )
    )
    row = result.one()
    avg = float(row.avg_rating) if row.avg_rating is not None else None
    return avg, int(row.count)


async def write_human_label(
    db: AsyncSession,
    review_id: int,
    human_label: bool,
) -> bool:
    """Set final_label and status='human_completed' for a review.

    Returns True when a row was updated, False when review_id was not found.
    """
    result = await db.execute(
        sa_update(Review)
        .where(Review.id == review_id)
        .values(final_label=human_label, status="human_completed")
        .returning(Review.id)
    )
    await db.commit()
    return result.scalar_one_or_none() is not None


async def write_ai_model(
    db: AsyncSession,
    review_id: int,
    ai_model: str,
    ai_label: bool,
) -> None:
    """Write AI model prediction result back to the review row."""
    await db.execute(
        sa_update(Review)
        .where(Review.id == review_id)
        .values(ai_model=ai_model, ai_label=ai_label, status="ai_completed")
    )
    await db.commit()
