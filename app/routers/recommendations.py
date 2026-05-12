from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from opensearch.client import get_opensearch
from repositories import user_repo
from services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/similar/{product_id}")
async def similar_products(
    product_id: int,
    request: Request,
    limit: int = Query(4, ge=1, le=10),
    user_id: int | None = Query(None, description="Pass logged-in user id to enable profile re-ranking"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Return similar products for a given product.

    - Anonymous (no user_id): pure KNN cosine similarity on item_vector.
    - Logged-in (user_id provided): KNN top-50 candidates re-ranked by buyer
      demographic profile (median_age / top_location / top_job from review history).
    """
    os_client = get_opensearch(request)

    user = None
    if user_id is not None:
        user = await user_repo.get_by_id(db, user_id)

    results = await recommendation_service.get_similar_products(
        os_client=os_client,
        db=db,
        product_id=product_id,
        top_k=limit,
        user=user,
    )

    return {
        "data": [
            {
                "product":    r["product"].model_dump(),
                "similarity": r["similarity"],
            }
            for r in results
        ]
    }
