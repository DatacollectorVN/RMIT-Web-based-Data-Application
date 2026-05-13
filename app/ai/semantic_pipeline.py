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
# MiniLM — cosine similarity to anchor embeddings
# ---------------------------------------------------------------------------

_MINILM_MODEL_ID = "all-MiniLM-L6-v2"

_GENUINE_ANCHOR = (
    "A genuine verified buyer review from a real customer who personally "
    "purchased and used the beauty or cosmetic product and shares honest "
    "first-hand experience about its quality, scent, texture, and results."
)
_FAKE_ANCHOR = (
    "A fake, sponsored, or non-buyer review written by someone who did not "
    "actually purchase or try the beauty product, containing vague, generic, "
    "or suspiciously promotional language."
)

_minilm_model: SentenceTransformer | None = None
_minilm_genuine_emb: torch.Tensor | None  = None
_minilm_fake_emb:    torch.Tensor | None  = None


def _get_minilm():
    global _minilm_model, _minilm_genuine_emb, _minilm_fake_emb
    if _minilm_model is None:
        logger.info("ai.semantic_pipeline: loading MiniLM model '%s' …", _MINILM_MODEL_ID)
        _minilm_model = SentenceTransformer(_MINILM_MODEL_ID)
        _minilm_genuine_emb = _minilm_model.encode(_GENUINE_ANCHOR, convert_to_tensor=True)
        _minilm_fake_emb    = _minilm_model.encode(_FAKE_ANCHOR,    convert_to_tensor=True)
        logger.info("ai.semantic_pipeline: MiniLM model ready.")
    return _minilm_model


def _score_minilm(combined: str) -> float:
    model = _get_minilm()
    emb  = model.encode(combined, convert_to_tensor=True)
    sims = st_util.cos_sim(emb, torch.stack([_minilm_genuine_emb, _minilm_fake_emb]))[0]  # type: ignore[arg-type]
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
