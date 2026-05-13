"""
AI pipeline loader.

Handles:
- Custom pickle unpickler that remaps __main__.TfidfAnalyzer /
  __main__.FastTextMeanEmbedder (recorded when train.py ran as a script)
  to ai.transformers.* so the model can be loaded inside the app.
- Lazy singleton loading of the trained rf_pipeline, stopword set,
  and text Preprocessor (all initialised together on first call).
- preprocess_review_text() — delegates to the Preprocessor singleton;
  replicates the task-1 pipeline used to produce processed_review_text
  in the training data.
"""
from __future__ import annotations

import logging
import pickle
import warnings
from pathlib import Path

from sklearn.exceptions import InconsistentVersionWarning

from ai.preprocessor import Preprocessor
from ai.transformers import FastTextMeanEmbedder, TfidfAnalyzer

logger = logging.getLogger(__name__)

MODEL_PATH    = Path(__file__).parent / "model" / "rf_pipeline.pkl"
STOPWORD_PATH = Path(__file__).parent / "stop_word" / "stopwords_en_enhancement.txt"


# ---------------------------------------------------------------------------
# Custom unpickler — redirect __main__ classes to ai.transformers
# ---------------------------------------------------------------------------

class _AppUnpickler(pickle.Unpickler):
    """Remap class paths that were pickled under __main__ to ai.transformers."""

    _CLASS_MAP: dict[tuple[str, str], type] = {
        ("__main__", "TfidfAnalyzer"):        TfidfAnalyzer,
        ("__main__", "FastTextMeanEmbedder"): FastTextMeanEmbedder,
    }

    def find_class(self, module: str, name: str):
        remapped = self._CLASS_MAP.get((module, name))
        if remapped is not None:
            return remapped
        return super().find_class(module, name)


# ---------------------------------------------------------------------------
# Lazy singletons
# ---------------------------------------------------------------------------

_pipeline     = None
_stop_set:    set[str]      = set()
_preprocessor: Preprocessor | None = None


def get_pipeline():
    """Return (pipeline, stop_set), loading from disk on first call.

    Also initialises the Preprocessor singleton so preprocess_review_text()
    is ready before the first request arrives.
    """
    global _pipeline, _stop_set, _preprocessor

    if _pipeline is not None:
        return _pipeline, _stop_set

    logger.info("ai.pipeline: loading stopwords from %s", STOPWORD_PATH)
    _stop_set = {
        line.strip().lower()
        for line in STOPWORD_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }

    logger.info("ai.pipeline: loading model from %s", MODEL_PATH)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", InconsistentVersionWarning)
        with open(MODEL_PATH, "rb") as fh:
            _pipeline = _AppUnpickler(fh).load()

    logger.info("ai.pipeline: model loaded — steps: %s", [s for s, _ in _pipeline.steps])

    _preprocessor = Preprocessor(_stop_set)

    return _pipeline, _stop_set


# ---------------------------------------------------------------------------
# Text preprocessor
# ---------------------------------------------------------------------------

def preprocess_review_text(text: str) -> str:
    """Convert raw review text into the whitespace-separated token string
    expected by the pipeline's processed_review_text column.

    Steps applied per token:
      1. Regex tokenise     — keep alpha + hyphenated words
      2. Lowercase
      3. Stopword filter    — drop len < 2 or in stop_set
      4. Spell-check + char de-dup + lemmatise (WordNet noun)
      5. Second stopword pass — catch stopwords produced by lemmatisation

    Corpus-level frequency filtering (top_k_df / min_tf) is skipped at
    inference time since per-corpus stats are unavailable for a single doc.
    """
    if _preprocessor is None:
        # Fallback before pipeline is loaded (should not happen in normal operation)
        return text.lower().strip()
    return _preprocessor.process(text)
