"""
AI router — machine-learning inference endpoints.

POST /api/ai/counting-predict
  Accepts a single review record, resolves product data from the DB,
  runs the trained Random Forest pipeline, and immediately returns
  an acknowledgement.  The prediction is written to the reviews table
  asynchronously via a FastAPI BackgroundTask.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from repositories import review_repo
from ai.semantic_pipeline import SemanticModel
from services.ai_service import (
    BUYER_THRESHOLD,
    PredictAckResponse,
    ReviewBody,
    handle_predict,
    handle_semantic_predict,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/counting-predict", response_model=PredictAckResponse)
async def predict_buyer_count(
    body: ReviewBody,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    review_id: int | None = Query(
        default=None,
        description="Existing review ID (Mode B). When provided, product_id / user_id are ignored.",
    ),
    product_id: int | None = Query(
        default=None,
        description="Product ID (Mode A — required when review_id is absent).",
    ),
    user_id: int | None = Query(
        default=None,
        description="User ID (Mode A — required when review_id is absent).",
    ),
    threshold: float = Query(
        default=BUYER_THRESHOLD,
        ge=0.0,
        le=1.0,
        description="Probability threshold for classifying a review as a buyer review (default 0.5).",
    ),
) -> PredictAckResponse:
    """
    Classify a single review as a verified buyer review or not.

    ---

    **Mode A — new review** (`review_id` query param absent):

    `POST /api/ai/counting-predict?product_id=34&user_id=1`

    ```json
    { "review_rating": 5, "review_title": "Great shampoo", "review_text": "Amazing..." }
    ```

    Fetches price / brand / product title from the DB, captures current
    product stats, inserts the review, then classifies it.

    ---

    **Mode B — existing review** (`review_id` query param provided):

    `POST /api/ai/counting-predict?review_id=42`

    ```json
    { "review_title": "Great shampoo", "review_text": "Amazing..." }
    ```

    Looks up the review, fetches the product, computes avg_rating and
    review_count for that product **excluding** this review, then classifies it.

    ---

    **Response** (immediate — DB write happens in the background):

    ```json
    { "message": "Thank you! Your review is processed" }
    ```
    """
    return await handle_predict(
        body=body,
        db=db,
        background_tasks=background_tasks,
        threshold=threshold,
        review_id=review_id,
        product_id=product_id,
        user_id=user_id,
    )


class HumanConfirmResponse(PredictAckResponse):
    pass


@router.post("/human-confirm", response_model=HumanConfirmResponse)
async def human_confirm(
    db: AsyncSession = Depends(get_db),
    review_id: int = Query(..., description="ID of the review to confirm."),
    human_label: bool = Query(..., description="Human verdict: true = genuine buyer, false = not a buyer."),
) -> HumanConfirmResponse:
    """
    Record a human reviewer's verdict for a review.

    Sets `final_label` to the supplied value and advances `status` to
    `human_completed`.

    **Parameters (query)**
    - `review_id` — the review to update
    - `human_label` — `true` / `false`

    **Response**
    ```json
    { "message": "Review 42 confirmed: human_label=true" }
    ```
    """
    found = await review_repo.write_human_label(db, review_id=review_id, human_label=human_label)
    if not found:
        raise HTTPException(status_code=404, detail=f"Review {review_id} not found.")
    return HumanConfirmResponse(message=f"Review {review_id} confirmed: human_label={human_label}")


@router.post("/semantic-predict", response_model=PredictAckResponse)
async def semantic_predict(
    body: ReviewBody,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    review_id: int | None = Query(
        default=None,
        description="Existing review ID (Mode B). When provided, product_id / user_id are ignored.",
    ),
    product_id: int | None = Query(
        default=None,
        description="Product ID (Mode A — required when review_id is absent).",
    ),
    user_id: int | None = Query(
        default=None,
        description="User ID (Mode A — required when review_id is absent).",
    ),
    threshold: float = Query(
        default=BUYER_THRESHOLD,
        ge=0.0,
        le=1.0,
        description="Probability threshold for classifying a review as a buyer review (default 0.5).",
    ),
    model: SemanticModel = Query(
        default=SemanticModel.deberta,
        description=(
            "Semantic model to use. "
            "'nli-deberta-v3-small' — NLI zero-shot classification (141 MB, default). "
            "'minilm' — cosine similarity via all-MiniLM-L6-v2 (80 MB, faster)."
        ),
    ),
) -> PredictAckResponse:
    """
    Classify a single review using a semantic model.

    Choose between two models via the `model` query param:

    - **`nli-deberta-v3-small`** (default) — NLI cross-encoder that directly
      evaluates whether the review entails *"genuine buyer review"*.
    - **`minilm`** — cosine similarity via `all-MiniLM-L6-v2` against
      hand-crafted anchor sentences.

    Accepts the same Mode A / Mode B query parameters as `/counting-predict`.
    """
    return await handle_semantic_predict(
        body=body,
        db=db,
        background_tasks=background_tasks,
        threshold=threshold,
        review_id=review_id,
        product_id=product_id,
        user_id=user_id,
        model=model,
    )
