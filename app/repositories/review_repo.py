from sqlalchemy import func, select
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
    result = await db.execute(query.order_by(Review.id).offset(offset).limit(limit))
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
