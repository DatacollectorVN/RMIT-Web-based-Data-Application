from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models.review import Review
from repositories import review_repo
from schemas.review import ReviewCreate, ReviewUpdate


async def get_review(db: AsyncSession, review_id: int) -> tuple[Review, str | None]:
    row = await review_repo.get_by_id(db, review_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Review not found")
    return row


async def list_reviews(
    db: AsyncSession,
    page: int,
    limit: int,
    product_id: int | None = None,
    user_id: int | None = None,
) -> tuple[list[tuple[Review, str | None]], int]:
    return await review_repo.list_all(db, page, limit, product_id, user_id)


async def create_review(db: AsyncSession, data: ReviewCreate) -> Review:
    return await review_repo.create(db, data)


async def update_review(db: AsyncSession, review_id: int, data: ReviewUpdate) -> tuple[Review, str | None]:
    review, user_name = await get_review(db, review_id)
    updated = await review_repo.update(db, review, data)
    return updated, user_name


async def delete_review(db: AsyncSession, review_id: int) -> None:
    review, _ = await get_review(db, review_id)
    await review_repo.delete(db, review)
