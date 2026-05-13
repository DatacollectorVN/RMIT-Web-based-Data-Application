"""
Custom sklearn transformers used by the trained rf_pipeline.pkl.

These are exact copies of the classes defined in archive/ds/train.py.
They must live here so that the custom unpickler in ai/pipeline.py can
redirect __main__.TfidfAnalyzer / __main__.FastTextMeanEmbedder
(the module path recorded when train.py was run as a script) to this module.
"""
from __future__ import annotations

import re

import numpy as np
from gensim.models import FastText
from sklearn.base import BaseEstimator, TransformerMixin

# ---------------------------------------------------------------------------
# Regex tokeniser (shared with TfidfAnalyzer)
# ---------------------------------------------------------------------------
_TOKENIZER_RE = re.compile(r"[a-zA-Z]+(?:[-'][a-zA-Z]+)?")


def _split_tokens(text: str) -> list[str]:
    return _TOKENIZER_RE.findall(str(text))


# ---------------------------------------------------------------------------
# FastText mean-pool embedder
# ---------------------------------------------------------------------------

FT_VECTOR_SIZE = 300
FT_WINDOW      = 5
FT_MIN_COUNT   = 5
FT_WORKERS     = 4


class FastTextMeanEmbedder(BaseEstimator, TransformerMixin):
    """Train FastText on fit texts → unweighted mean-pool at transform.

    Input : 1-D array/Series of whitespace-separated preprocessed strings
            (i.e. the 'processed_review_text' column).
    fit() : Trains a new FastText model on the training split texts.
    transform(): Embeds each document as the mean of its token vectors.
                 FastText subword n-grams handle any OOV token gracefully.
    Output: 2-D float32 array of shape (n_samples, vector_size).
    """

    def __init__(
        self,
        vector_size: int = FT_VECTOR_SIZE,
        window:      int = FT_WINDOW,
        min_count:   int = FT_MIN_COUNT,
        workers:     int = FT_WORKERS,
    ):
        self.vector_size = vector_size
        self.window      = window
        self.min_count   = min_count
        self.workers     = workers

    def fit(self, X, y=None):
        sentences = [str(s).split() for s in X]
        self.ft_model_ = FastText(
            sentences=sentences,
            vector_size=self.vector_size,
            window=self.window,
            min_count=self.min_count,
            workers=self.workers,
        )
        return self

    def _embed_one(self, text: str) -> np.ndarray:
        tokens = str(text).split()
        if not tokens:
            return np.zeros(self.vector_size, dtype=np.float32)
        vecs = [self.ft_model_.wv.get_vector(t, norm=False) for t in tokens]
        return np.mean(np.vstack(vecs), axis=0).astype(np.float32)

    def transform(self, X) -> np.ndarray:
        return np.vstack([self._embed_one(str(t)) for t in X])


# ---------------------------------------------------------------------------
# Picklable TF-IDF analyser (tokenise + stopword filter)
# ---------------------------------------------------------------------------

class TfidfAnalyzer:
    """Picklable callable: tokenise + remove stopwords for TfidfVectorizer.

    Defined as a class (not a lambda/closure) so it survives pickling when
    GridSearchCV distributes work across processes.
    """

    def __init__(self, stop_set: set[str]):
        self.stop_set = stop_set

    def __call__(self, doc: str) -> list[str]:
        return [
            t.lower()
            for t in _split_tokens(doc)
            if t.lower() not in self.stop_set
        ]
