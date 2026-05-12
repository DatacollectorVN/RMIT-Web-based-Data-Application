import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.review import Review
from schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate
from services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _review_response(review: Review, user_name: str | None) -> ReviewResponse:
    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        user_name=user_name,
        product_id=review.product_id,
        title=review.title,
        content=review.content,
        rating=review.rating,
        status=review.status,
        ai_label=review.ai_label,
        final_label=review.final_label,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("/")
async def list_reviews(
    product_id: int | None = Query(None),
    user_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows, total = await review_service.list_reviews(db, page, limit, product_id, user_id)
    return {
        "data": {
            "total": total,
            "total_pages": math.ceil(total / limit),
            "page": page,
            "limit": limit,
            "items": [_review_response(review, user_name) for review, user_name in rows],
        }
    }


@router.get("/{review_id}")
async def get_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    review, user_name = await review_service.get_review(db, review_id)
    return {"data": _review_response(review, user_name)}


@router.post("/", status_code=201)
async def create_review(
    body: ReviewCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    review = await review_service.create_review(db, body)
    return {"data": _review_response(review, None)}


@router.patch("/{review_id}")
async def update_review(
    review_id: int,
    body: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    review, user_name = await review_service.update_review(db, review_id, body)
    return {"data": _review_response(review, user_name)}


@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await review_service.delete_review(db, review_id)
    return {"data": {"deleted": True, "id": review_id}}
