"""
AI service — buyer classification predictions.

Two operating modes depending on the request payload:

  Mode A  (review_id not provided)
    Requires: product_id, user_id, review_rating, review_title, review_text
    - Fetches price / brand / title from the product table
    - Uses current product review stats (avg_rating, count) as features
    - Inserts a new review row, then classifies it

  Mode B  (review_id provided)
    Requires: review_id, review_title, review_text
    - Looks up the existing review to get product_id and rating
    - Fetches price / brand / title from the product table
    - Computes avg_rating / count for the product EXCLUDING this review
    - Classifies the existing review

In both modes the pipeline result is written back to reviews.ai_model and
reviews.ai_label asynchronously via a FastAPI BackgroundTask.
"""
from __future__ import annotations

import logging

import pandas as pd
from fastapi import BackgroundTasks, HTTPException
from pydantic import BaseModel, StrictInt, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from ai.pipeline import get_pipeline, preprocess_review_text
from ai.semantic_pipeline import SemanticModel, get_semantic_model, semantic_score
from database import AsyncSessionLocal
from repositories import product_repo, review_repo
from schemas.review import ReviewCreate

logger = logging.getLogger(__name__)

INPUT_COLS = [
    "price",
    "review_rating",
    "avg_product_rating",
    "product_rating_count",
    "brand_name",
    "review_title",
    "product_title",
    "processed_review_text",
]

BUYER_THRESHOLD = 0.5


# ---------------------------------------------------------------------------
# Request schema (body only — IDs come from query params)
# ---------------------------------------------------------------------------

class ReviewBody(BaseModel):
    """Request body for the counting-predict endpoint.

    IDs (review_id, product_id, user_id) are passed as query parameters.

    Mode A body:  review_rating + review_title + review_text
    Mode B body:  review_title + review_text   (review_rating ignored)
    """
    review_rating: StrictInt | None = None
    review_title:  str
    review_text:   str

    @field_validator("review_rating")
    @classmethod
    def rating_in_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("review_rating must be between 1 and 5")
        return v


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class PredictAckResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Internal pipeline input dataclass
# ---------------------------------------------------------------------------

class _ReviewItem:
    """Resolved feature row ready for pipeline.predict_proba()."""

    __slots__ = (
        "review_id", "price", "review_rating", "avg_product_rating",
        "product_rating_count", "brand_name", "review_title",
        "product_title", "review_text",
    )

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


# ---------------------------------------------------------------------------
# Mode-resolution helpers
# ---------------------------------------------------------------------------

async def _resolve_mode_a(
    body: ReviewBody,
    db: AsyncSession,
    product_id: int,
    user_id: int,
) -> _ReviewItem:
    """Validate Mode A fields, fetch product, insert review, build feature row."""
    if body.review_rating is None:
        raise HTTPException(status_code=422, detail="review_rating is required in the body when review_id is not provided.")

    product = await product_repo.get_by_id(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    # Capture stats BEFORE inserting the new review so the new rating is excluded
    stats = await product_repo.get_review_stats(db, [product_id])
    product_stats = stats.get(product_id, {})
    avg_rating   = product_stats.get("avg_rating") or 0.0
    review_count = product_stats.get("review_count") or 0

    new_review = await review_repo.create(
        db,
        ReviewCreate(
            user_id=user_id,
            product_id=product_id,
            title=body.review_title,
            content=body.review_text,
            rating=body.review_rating,
        ),
    )

    return _ReviewItem(
        review_id=new_review.id,
        price=float(product.price),
        review_rating=body.review_rating,
        avg_product_rating=avg_rating,
        product_rating_count=review_count,
        brand_name=product.brand,
        review_title=body.review_title,
        product_title=product.name,
        review_text=body.review_text,
    )


async def _resolve_mode_b(
    body: ReviewBody,
    db: AsyncSession,
    review_id: int,
) -> _ReviewItem:
    """Fetch existing review + product, compute stats excluding this review."""
    row = await review_repo.get_by_id(db, review_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Review {review_id} not found.")
    review, _ = row

    product = await product_repo.get_by_id(db, review.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {review.product_id} not found.")

    avg_rating, count = await review_repo.get_stats_excluding(db, review.product_id, review_id)

    return _ReviewItem(
        review_id=review.id,
        price=float(product.price),
        review_rating=review.rating,
        avg_product_rating=avg_rating or 0.0,
        product_rating_count=count,
        brand_name=product.brand,
        review_title=body.review_title,
        product_title=product.name,
        review_text=body.review_text,
    )


# ---------------------------------------------------------------------------
# Main service entry point
# ---------------------------------------------------------------------------

async def handle_predict(
    body: ReviewBody,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    threshold: float = BUYER_THRESHOLD,
    review_id: int | None = None,
    product_id: int | None = None,
    user_id: int | None = None,
) -> PredictAckResponse:
    """Resolve the request, run inference, schedule DB write, return ack."""

    if review_id is not None:
        item = await _resolve_mode_b(body, db, review_id)
    else:
        if product_id is None:
            raise HTTPException(status_code=422, detail="product_id query param is required when review_id is not provided.")
        if user_id is None:
            raise HTTPException(status_code=422, detail="user_id query param is required when review_id is not provided.")
        item = await _resolve_mode_a(body, db, product_id, user_id)

    # Review is now in DB with status="pending".
    # Hand off inference + DB write entirely to the background.
    background_tasks.add_task(_run_prediction_and_write, item, threshold)

    return PredictAckResponse(message="Thank you! Your review is processed")


# ---------------------------------------------------------------------------
# Background: inference + DB write
# ---------------------------------------------------------------------------

async def _run_prediction_and_write(item: _ReviewItem, threshold: float) -> None:
    """Run pipeline inference then write ai_label + status='ai_completed' to DB.

    Executes entirely in the background — the request session is already
    closed by the time FastAPI BackgroundTasks fire, so a fresh session
    is created here.
    """
    try:
        pipeline, _ = get_pipeline()

        df = pd.DataFrame([{
            "price":                 item.price,
            "review_rating":         item.review_rating,
            "avg_product_rating":    item.avg_product_rating,
            "product_rating_count":  item.product_rating_count,
            "brand_name":            item.brand_name,
            "review_title":          item.review_title,
            "product_title":         item.product_title,
            "processed_review_text": preprocess_review_text(item.review_text),
        }])

        proba_matrix = pipeline.predict_proba(df[INPUT_COLS])
        prob = round(float(proba_matrix[0][1]), 4)
        pred = 1 if prob >= threshold else 0

        logger.info(
            "_run_prediction_and_write: review_id=%s pred=%d prob=%.4f (threshold=%.2f)",
            item.review_id, pred, prob, threshold,
        )

        ai_model_str = f"rf_pipeline|pred={pred}|prob={prob}"
        async with AsyncSessionLocal() as db:
            await review_repo.write_ai_model(
                db,
                review_id=item.review_id,
                ai_model=ai_model_str,
                ai_label=bool(pred),
            )
            logger.info(
                "_run_prediction_and_write: review_id=%d saved → %s",
                item.review_id, ai_model_str,
            )
    except Exception as exc:
        logger.warning(
            "_run_prediction_and_write: failed for review_id=%s — %s",
            item.review_id, exc,
        )


# ---------------------------------------------------------------------------
# Semantic predict — handle_semantic_predict + background task
# ---------------------------------------------------------------------------

async def handle_semantic_predict(
    body: ReviewBody,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    threshold: float = BUYER_THRESHOLD,
    review_id: int | None = None,
    product_id: int | None = None,
    user_id: int | None = None,
    model: SemanticModel = SemanticModel.deberta,
) -> PredictAckResponse:
    """Resolve Mode A / B, then run semantic classification in the background."""

    if review_id is not None:
        item = await _resolve_mode_b(body, db, review_id)
    else:
        if product_id is None:
            raise HTTPException(status_code=422, detail="product_id query param is required when review_id is not provided.")
        if user_id is None:
            raise HTTPException(status_code=422, detail="user_id query param is required when review_id is not provided.")
        item = await _resolve_mode_a(body, db, product_id, user_id)

    background_tasks.add_task(_run_semantic_prediction_and_write, item, threshold, model)

    return PredictAckResponse(message="Thank you! Your review is processed")


async def _run_semantic_prediction_and_write(
    item: _ReviewItem,
    threshold: float,
    model: SemanticModel,
) -> None:
    """Run the chosen semantic model, classify, then persist to DB.

    Sets ai_model, ai_label, and status='ai_completed'.
    """
    try:
        prob = semantic_score(item.review_title, item.review_text, item.review_rating, model)
        pred = 1 if prob >= threshold else 0

        logger.info(
            "_run_semantic_prediction_and_write: model=%s review_id=%s pred=%d prob=%.4f (threshold=%.2f)",
            model.value, item.review_id, pred, prob, threshold,
        )

        ai_model_str = f"{model.value}|pred={pred}|prob={prob}"
        async with AsyncSessionLocal() as db:
            await review_repo.write_ai_model(
                db,
                review_id=item.review_id,
                ai_model=ai_model_str,
                ai_label=bool(pred),
            )
            logger.info(
                "_run_semantic_prediction_and_write: review_id=%d saved → %s",
                item.review_id, ai_model_str,
            )
    except Exception as exc:
        logger.warning(
            "_run_semantic_prediction_and_write: failed for review_id=%s — %s",
            item.review_id, exc,
        )
