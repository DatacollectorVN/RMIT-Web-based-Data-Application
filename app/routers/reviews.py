from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate
from services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/")
async def list_reviews(
    product_id: int | None = Query(None),
    user_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    reviews, total = await review_service.list_reviews(db, page, limit, product_id, user_id)
    return {
        "data": {
            "total": total,
            "page": page,
            "limit": limit,
            "items": [ReviewResponse.model_validate(r) for r in reviews],
        }
    }


@router.get("/{review_id}")
async def get_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    review = await review_service.get_review(db, review_id)
    return {"data": ReviewResponse.model_validate(review)}


@router.post("/", status_code=201)
async def create_review(
    body: ReviewCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    review = await review_service.create_review(db, body)
    return {"data": ReviewResponse.model_validate(review)}


@router.patch("/{review_id}")
async def update_review(
    review_id: int,
    body: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    review = await review_service.update_review(db, review_id, body)
    return {"data": ReviewResponse.model_validate(review)}


@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await review_service.delete_review(db, review_id)
    return {"data": {"deleted": True, "id": review_id}}
