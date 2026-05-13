"""
Recommendation service.

Anonymous:  KNN on item_vector → top_k similar products
Logged-in:  KNN → top 50 candidates → buyer-profile re-ranking → top_k
"""
import logging
from dataclasses import dataclass

from opensearchpy import OpenSearch
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import OPENSEARCH_INDEX_PRODUCTS
from models.review import Review
from models.user import User
from opensearch.query_builder import QueryRequest
from opensearch.semantic_search import build_semantic_query
from repositories import product_repo
from schemas.photo import PhotoResponse
from schemas.product import ProductResponse

logger = logging.getLogger(__name__)

_PRODUCT_WEIGHT = 0.7
_PROFILE_WEIGHT = 0.3
_KNN_CANDIDATE_COUNT = 50   # fetch top 50 when logged-in for re-ranking


# ── Buyer profile dataclass ───────────────────────────────────────────────────

@dataclass
class _BuyerProfile:
    product_id: int
    median_age: float | None
    top_location: str | None
    top_job: str | None
    top_gender: str | None


# ── DB helper: compute buyer demographics per product ─────────────────────────

async def _fetch_buyer_profiles(
    db: AsyncSession,
    product_ids: list[int],
) -> dict[int, _BuyerProfile]:
    """
    For each product_id query reviews JOIN users and compute:
      - PERCENTILE_CONT(0.5) FILTER (WHERE age IS NOT NULL)      → median buyer age
      - MODE()               FILTER (WHERE location IS NOT NULL) → most frequent buyer location
      - MODE()               FILTER (WHERE job IS NOT NULL)      → most frequent buyer job
      - MODE()               FILTER (WHERE gender IS NOT NULL)   → most frequent buyer gender

    Each aggregate uses its own FILTER so it draws from the widest possible reviewer
    pool independently — a reviewer missing one field still contributes to the others.
    """
    if not product_ids:
        return {}

    result = await db.execute(
        select(
            Review.product_id,
            func.percentile_cont(0.5)
                .within_group(User.age.asc())
                .filter(User.age.is_not(None))
                .label("median_age"),
            func.mode()
                .within_group(User.location.asc())
                .filter(User.location.is_not(None))
                .label("top_location"),
            func.mode()
                .within_group(User.job.asc())
                .filter(User.job.is_not(None))
                .label("top_job"),
            func.mode()
                .within_group(User.gender.asc())
                .filter(User.gender.is_not(None))
                .label("top_gender"),
        )
        .join(User, User.id == Review.user_id)
        .where(Review.product_id.in_(product_ids))
        .group_by(Review.product_id)
    )

    profiles: dict[int, _BuyerProfile] = {}
    for row in result.all():
        profiles[int(row.product_id)] = _BuyerProfile(
            product_id=int(row.product_id),
            median_age=float(row.median_age) if row.median_age is not None else None,
            top_location=row.top_location,
            top_job=row.top_job,
            top_gender=row.top_gender,
        )
    return profiles


# ── Profile scoring ───────────────────────────────────────────────────────────

def _profile_score(user: User, profile: _BuyerProfile | None) -> float:
    """
    Scalar similarity between the current user and a product's typical buyer.
    Returns a value in [0.0, 1.0].

    - Age:      normalised distance  (max gap = 50 yrs → score 0)
    - Location: exact match (case-insensitive)
    - Job:      word-overlap match

    If the product has no buyer data the score is neutral (0.5).
    Missing user or profile fields are simply skipped.
    """
    if profile is None:
        return 0.5

    scores: list[float] = []

    # Age similarity
    if user.age is not None and profile.median_age is not None:
        diff = abs(user.age - profile.median_age)
        scores.append(max(0.0, 1.0 - diff / 50.0))

    # Location exact match
    if user.location and profile.top_location:
        match = user.location.strip().lower() == profile.top_location.strip().lower()
        scores.append(1.0 if match else 0.0)

    # Job word-overlap (e.g. "software engineer" ∩ "engineer" → match)
    if user.job and profile.top_job:
        u_words = set(user.job.lower().split())
        p_words = set(profile.top_job.lower().split())
        scores.append(1.0 if (u_words & p_words) else 0.0)

    # Gender exact match — high-frequency signal derived from most common buyer gender
    if user.gender and profile.top_gender:
        scores.append(1.0 if user.gender.lower() == profile.top_gender.lower() else 0.0)

    return sum(scores) / len(scores) if scores else 0.5


# ── Response builder ──────────────────────────────────────────────────────────

def _to_product_response(product, stats: dict) -> ProductResponse:
    photos = getattr(product, "photos", None) or []
    active = [p for p in photos if p.is_active]
    s = stats.get(product.id, {})
    return ProductResponse(
        id=product.id,
        brand=product.brand,
        name=product.name,
        description=product.description,
        price=product.price,
        category=product.category,
        created_at=product.created_at,
        updated_at=product.updated_at,
        photos=[PhotoResponse.model_validate(p) for p in active],
        review_count=s.get("review_count", 0),
        avg_rating=s.get("avg_rating"),
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def get_similar_products(
    os_client: OpenSearch,
    db: AsyncSession,
    product_id: int,
    top_k: int = 4,
    user: User | None = None,
) -> list[dict]:
    """
    Return top_k recommended products for the given product.

    Anonymous (user=None):
        Pure KNN on item_vector → top_k results.

    Logged-in (user provided):
        1. KNN → top 50 candidates with product_score
        2. For each candidate, compute profile_score from buyer demographics
           (median_age, top_location, top_job) derived from reviews JOIN users
        3. final_score = 0.7 × product_score + 0.3 × profile_score
        4. Re-rank → top_k

    Each result dict: {"product": ProductResponse, "similarity": float 0-1}
    """

    # ── Step 1: fetch current product's vector from OpenSearch ────────────────
    try:
        doc = os_client.get(index=OPENSEARCH_INDEX_PRODUCTS, id=str(product_id))
        vector: list[float] = doc["_source"]["item_vector"]
    except Exception as exc:
        logger.warning("recommendation: failed to fetch vector for product %s — %s", product_id, exc)
        return await _fallback_same_brand(db, product_id, top_k)

    # ── Step 2: KNN search ────────────────────────────────────────────────────
    candidate_count = _KNN_CANDIDATE_COUNT if user else top_k + 1
    try:
        body = build_semantic_query(QueryRequest(vector=vector, size=candidate_count))
        resp = os_client.search(index=OPENSEARCH_INDEX_PRODUCTS, body=body)
    except Exception as exc:
        logger.warning("recommendation: KNN search failed — %s", exc)
        return await _fallback_same_brand(db, product_id, top_k)

    hits = (resp.get("hits") or {}).get("hits") or []

    # Build candidate list, exclude the queried product itself
    candidates: list[dict] = []
    for h in hits:
        src = h.get("_source") or {}
        pid = src.get("product_id")
        if pid is None or int(pid) == product_id:
            continue
        # OpenSearch cosine-similarity _score is in (0, 1] — clamp defensively
        knn_score = max(0.0, min(1.0, float(h.get("_score") or 0.0)))
        candidates.append({"product_id": int(pid), "knn_score": knn_score})

    if not candidates:
        return await _fallback_same_brand(db, product_id, top_k)

    # ── Step 3: buyer-profile re-ranking (logged-in only) ────────────────────
    if user:
        candidate_ids = [c["product_id"] for c in candidates]
        buyer_profiles = await _fetch_buyer_profiles(db, candidate_ids)

        for c in candidates:
            ps = _profile_score(user, buyer_profiles.get(c["product_id"]))
            c["final_score"] = _PRODUCT_WEIGHT * c["knn_score"] + _PROFILE_WEIGHT * ps
    else:
        for c in candidates:
            c["final_score"] = c["knn_score"]

    # ── Step 4: re-rank → top_k ───────────────────────────────────────────────
    candidates.sort(key=lambda x: x["final_score"], reverse=True)
    top = candidates[:top_k]

    # ── Step 5: load Product rows + review stats from Postgres ───────────────
    top_ids = [c["product_id"] for c in top]
    products = await product_repo.get_by_ids_in_order(db, top_ids)
    stats    = await product_repo.get_review_stats(db, top_ids)

    score_map = {c["product_id"]: c["final_score"] for c in top}
    return [
        {
            "product":    _to_product_response(p, stats),
            "similarity": round(score_map.get(p.id, 0.0), 4),
        }
        for p in products
    ]


async def _fallback_same_brand(
    db: AsyncSession,
    product_id: int,
    top_k: int,
) -> list[dict]:
    """Fallback used when OpenSearch is unreachable: return same-brand products."""
    product = await product_repo.get_by_id(db, product_id)
    if product is None:
        return []
    all_products, _ = await product_repo.list_all(db, page=1, limit=100)
    similar = [p for p in all_products if p.id != product_id and p.brand == product.brand][:top_k]
    ids   = [p.id for p in similar]
    stats = await product_repo.get_review_stats(db, ids)
    return [
        {"product": _to_product_response(p, stats), "similarity": 0.0}
        for p in similar
    ]
