"""
Semantic classifier for beauty-product reviews.

Supported models (selectable per-request via the `model` query param):

  nli-deberta-v3-small  (default, 141 MB)
    cross-encoder/nli-deberta-v3-small
    Zero-shot NLI classification — directly evaluates whether the review
    text *entails* "genuine buyer review".  More robust to anchor wording;
    trained on 33 NLI datasets including reviews.

  minilm  (80 MB)
    sentence-transformers/all-MiniLM-L6-v2
    Cosine similarity between the review embedding and two hand-crafted
    anchor sentences (genuine vs fake).  Faster (~5 ms CPU), lighter weight.
"""
from __future__ import annotations

import logging
from enum import Enum

import torch
from sentence_transformers import SentenceTransformer
from sentence_transformers import util as st_util
from transformers import pipeline as hf_pipeline

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model selector enum (used as query param in the router)
# ---------------------------------------------------------------------------

class SemanticModel(str, Enum):
    deberta = "nli-deberta-v3-small"
    minilm  = "minilm"


# ---------------------------------------------------------------------------
# NLI DeBERTa — zero-shot classification
# ---------------------------------------------------------------------------

_NLI_MODEL_ID  = "cross-encoder/nli-deberta-v3-small"
_GENUINE_LABEL = "genuine buyer review"
_FAKE_LABEL    = "fake or non-buyer review"

_nli_classifier = None


def _get_nli_classifier():
    global _nli_classifier
    if _nli_classifier is None:
        logger.info("ai.semantic_pipeline: loading NLI model '%s' …", _NLI_MODEL_ID)
        _nli_classifier = hf_pipeline(
            "zero-shot-classification",
            model=_NLI_MODEL_ID,
            device=-1,
            multi_label=False,
        )
        logger.info("ai.semantic_pipeline: NLI model ready.")
    return _nli_classifier


def _score_nli(combined: str) -> float:
    classifier = _get_nli_classifier()
    result = classifier(combined, candidate_labels=[_GENUINE_LABEL, _FAKE_LABEL])
    idx = result["labels"].index(_GENUINE_LABEL)
    return round(float(result["scores"][idx]), 4)


# ---------------------------------------------------------------------------
# MiniLM — cosine similarity to length-matched anchor embeddings
# ---------------------------------------------------------------------------
#
# Problem: cosine similarity is sensitive to vocabulary density.  A 10-word
# review compared to a 100-word anchor loses similarity just from length
# mismatch, not meaning.  Fixing this: maintain four anchor pairs (genuine /
# fake) calibrated to four review-length buckets, then pick the pair whose
# length is closest to the incoming review.
#
# Bucket thresholds (characters in the combined "Rating: X/5. title. body"):
#   tiny   < 80      e.g. "Loved it."
#   short  80–250    e.g. one or two sentences
#   medium 250–600   e.g. a short paragraph
#   long   > 600     e.g. detailed multi-paragraph review
#
# All genuine anchors describe a real buyer (bought → 1).
# All fake anchors describe a non-buyer/bot review (not bought → 0).

_MINILM_MODEL_ID = "all-MiniLM-L6-v2"

# (threshold_chars, genuine_anchor, fake_anchor)
_ANCHOR_TIERS: list[tuple[int, str, str]] = [
    # ── TINY  (< 80 chars) ──────────────────────────────────────────────────
    (
        80,
        "Bought it. Works great on my skin.",
        "Amazing! Best ever. Five stars.",
    ),
    # ── SHORT  (80 – 250 chars) ─────────────────────────────────────────────
    (
        250,
        (
            "I picked this up last week and have been using it every night. "
            "My skin feels softer already and the scent is really pleasant. "
            "Will definitely buy again."
        ),
        (
            "Great product! Highly recommend. Fast shipping. Love it so much. "
            "Perfect for everyone. Five stars. Best purchase ever."
        ),
    ),
    # ── MEDIUM  (250 – 600 chars) ────────────────────────────────────────────
    (
        600,
        (
            "I have been using this moisturiser for about two weeks now and I am "
            "genuinely impressed. The texture is lightweight and absorbs into my "
            "skin within minutes without leaving any greasy residue. I have "
            "combination skin and it keeps my T-zone balanced without drying out "
            "my cheeks. The packaging is sturdy and hygienic. It did sting "
            "slightly the first time but that went away after day two. Would "
            "recommend for sensitive skin types and will repurchase."
        ),
        (
            "Absolutely love this product! It is amazing and I recommend it to "
            "all my friends and family. The quality is outstanding and the price "
            "is great. Shipping was super fast and the packaging was beautiful. "
            "This is the best beauty product I have ever used in my life. "
            "Everyone should buy this. Cannot imagine my routine without it now. "
            "Will definitely order again and again. Seller is fantastic."
        ),
    ),
    # ── LONG  (> 600 chars) ─────────────────────────────────────────────────
    (
        999_999,
        (
            "I have now finished my second bottle of this serum and feel "
            "qualified to give a detailed review. I have dry, acne-prone skin "
            "and have tried many products over the years with mixed results. "
            "I started noticing a difference in my skin tone after about ten "
            "days of consistent morning and evening application. The formula "
            "layers well under sunscreen and does not pill under makeup. "
            "One thing worth mentioning is that the dropper dispenses a bit "
            "too much product at once, so I have learned to tilt the bottle "
            "gently rather than squeeze. The scent is faint and herbal, which "
            "I personally enjoy, though people sensitive to fragrance may want "
            "to patch test first. After six weeks my hyperpigmentation from "
            "old breakouts has visibly faded and my skin looks more even. "
            "I would rate this as one of the better serums I have tried at "
            "this price point and will continue buying it."
        ),
        (
            "This product is absolutely incredible and I cannot believe how "
            "good it is. From the moment I opened the package I knew this was "
            "going to be special. The quality is unmatched and the results "
            "speak for themselves. I have told everyone I know about this "
            "product and they all agree it is the best thing they have ever "
            "tried. The company clearly cares about its customers and the "
            "customer service was outstanding when I reached out with a "
            "question. Shipping was lightning fast and the packaging was "
            "elegant and premium. I will be ordering multiple bottles to give "
            "as gifts because everyone deserves to experience this. I cannot "
            "recommend it highly enough. Five stars is not enough. This "
            "product has changed my life and I will never use anything else. "
            "Buy it now, you will not regret it. Amazing, perfect, wonderful."
        ),
    ),
]

_minilm_model: SentenceTransformer | None = None
# Pre-encoded anchor tensors: list of (genuine_emb, fake_emb) per tier
_minilm_anchor_embs: list[tuple[torch.Tensor, torch.Tensor]] = []


def _get_minilm():
    global _minilm_model, _minilm_anchor_embs
    if _minilm_model is None:
        logger.info("ai.semantic_pipeline: loading MiniLM model '%s' …", _MINILM_MODEL_ID)
        _minilm_model = SentenceTransformer(_MINILM_MODEL_ID)
        _minilm_anchor_embs = [
            (
                _minilm_model.encode(genuine, convert_to_tensor=True),
                _minilm_model.encode(fake,    convert_to_tensor=True),
            )
            for _, genuine, fake in _ANCHOR_TIERS
        ]
        logger.info("ai.semantic_pipeline: MiniLM model ready (%d anchor tiers).", len(_ANCHOR_TIERS))
    return _minilm_model


def _pick_anchor_tier(combined: str) -> tuple[torch.Tensor, torch.Tensor]:
    """Return the (genuine_emb, fake_emb) pair whose length bucket matches the review."""
    n = len(combined)
    for i, (threshold, _, _) in enumerate(_ANCHOR_TIERS):
        if n < threshold:
            return _minilm_anchor_embs[i]
    return _minilm_anchor_embs[-1]


def _score_minilm(combined: str) -> float:
    _get_minilm()
    genuine_emb, fake_emb = _pick_anchor_tier(combined)
    emb   = _minilm_model.encode(combined, convert_to_tensor=True)  # type: ignore[union-attr]
    sims  = st_util.cos_sim(emb, torch.stack([genuine_emb, fake_emb]))[0]
    probs = torch.softmax(sims, dim=0)
    return round(probs[0].item(), 4)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_semantic_model(model: SemanticModel = SemanticModel.deberta):
    """Warm up the chosen model — called at startup or on first use."""
    if model == SemanticModel.minilm:
        _get_minilm()
    else:
        _get_nli_classifier()


def semantic_score(
    review_title: str,
    review_text: str,
    review_rating: int | None = None,
    model: SemanticModel = SemanticModel.deberta,
) -> float:
    """Return probability [0, 1] that the review is from a genuine buyer.

    Args:
        review_title:  Title of the review.
        review_text:   Body of the review.
        review_rating: Star rating 1–5.  Prepended as "Rating: X/5" to help
                       the model detect rating-text inconsistency.
        model:         Which semantic model to use (default: nli-deberta-v3-small).

    Returns:
        Float in [0, 1] — higher means more likely a genuine buyer review.
    """
    rating_prefix = f"Rating: {review_rating}/5. " if review_rating is not None else ""
    combined = f"{rating_prefix}{review_title}. {review_text}"

    if model == SemanticModel.minilm:
        return _score_minilm(combined)
    return _score_nli(combined)
