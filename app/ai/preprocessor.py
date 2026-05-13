"""
Text preprocessor for review text.

Replicates the task-1 pipeline used to produce 'processed_review_text'
in the training data so that raw review text at inference time is
transformed into the same format the RF pipeline was trained on.

Steps (per token):
  1. Regex tokenise       — keep alpha + hyphenated words
  2. Lowercase
  3. Stopword filter      — len >= 2 and not in stop_set
  4. Spell-check + de-dup + lemmatise (check_and_fix)
  5. Second stopword pass — lemmatisation may produce a stopword (e.g. "be")

Corpus-level frequency filtering (top_k_df / min_tf) is intentionally
skipped at inference time: it requires corpus-wide statistics that are
unavailable for a single document.  TF-IDF and FastText handle unseen
or rare tokens gracefully.
"""
from __future__ import annotations

import logging
import re

import nltk
from nltk.corpus import wordnet
from nltk.stem import WordNetLemmatizer
from spellchecker import SpellChecker
from thefuzz import fuzz
from wordfreq import word_frequency

logger = logging.getLogger(__name__)

_TOKENIZER_RE = re.compile(r"[a-zA-Z]+(?:[-'][a-zA-Z]+)?")


# ---------------------------------------------------------------------------
# Token-level helpers
# ---------------------------------------------------------------------------

def _split_tokens(text: str) -> list[str]:
    """Regex-tokenise raw text into alphabetic / hyphenated words."""
    return _TOKENIZER_RE.findall(str(text))


def _is_meaningful(word: str) -> bool:
    """Reject 2-char words that are very rare in English (likely noise)."""
    if len(word) == 2 and word_frequency(word, "en") < 1e-4:
        return False
    return True


def _process_token(t: str | None, stop_set: set[str]) -> str | None:
    """Apply basic token-filtering rules (length + stopword).

    Returns the token unchanged if valid, otherwise None.
    """
    if not t:
        return None
    if len(t) < 2:
        return None
    if t in stop_set:
        return None
    return t


def check_and_fix(
    lemmatizer: WordNetLemmatizer,
    speller: SpellChecker,
    word: str | None,
) -> str | None:
    """Spell-correct, de-duplicate repeated characters, and lemmatise a token.

    Returns a cleaned lemma or None when the token should be discarded.
    """
    if not word:
        return None

    # Collapse repeated characters: "goood" → "god" (hard) / "good" (light)
    c_light = re.sub(r"(.)\1{2,}", r"\1", word)   # 3+ repeats → 1
    c_hard  = re.sub(r"(.)\1+",    r"\1", word)   # any repeat → 1

    if speller.known([word]):
        if not _is_meaningful(word):
            return None
        correction = speller.correction(word)
        if correction and _is_meaningful(correction) and fuzz.ratio(word, correction) >= 70:
            return lemmatizer.lemmatize(correction, pos=wordnet.NOUN)
        return lemmatizer.lemmatize(word, pos=wordnet.NOUN)

    # Word unknown — try de-duplicated forms progressively
    for candidate in dict.fromkeys([c_hard, c_light, word]):
        if not candidate or not _is_meaningful(candidate):
            continue
        correction = speller.correction(candidate)
        if not correction or not _is_meaningful(correction):
            continue
        if fuzz.ratio(candidate, correction) >= 70:
            return lemmatizer.lemmatize(correction, pos=wordnet.NOUN)

    return None


# ---------------------------------------------------------------------------
# Preprocessor — holds per-process singletons (lemmatizer, spellchecker)
# ---------------------------------------------------------------------------

class Preprocessor:
    """Stateful preprocessor: initialise once, call process() per text."""

    def __init__(self, stop_set: set[str]) -> None:
        logger.info("ai.preprocessor: downloading NLTK resources …")
        nltk.download("wordnet", quiet=True)
        nltk.download("omw-1.4", quiet=True)

        self.stop_set   = stop_set
        self.lemmatizer = WordNetLemmatizer()
        self.speller    = SpellChecker()
        logger.info("ai.preprocessor: ready (stop_set=%d words)", len(stop_set))

    def process(self, text: str) -> str:
        """Preprocess a single raw review text.

        Returns a whitespace-joined string of cleaned tokens, ready for
        the RF pipeline's 'processed_review_text' column.
        """
        tokens: list[str] = []
        for raw_token in _split_tokens(text):
            t: str | None = raw_token.lower()

            # Pass 1: length + stopword filter
            t = _process_token(t, self.stop_set)

            # Spell-check, de-dup repeated chars, lemmatise
            t = check_and_fix(self.lemmatizer, self.speller, t)

            # Pass 2: lemmatisation may produce a stopword (e.g. "are" → "be")
            t = _process_token(t, self.stop_set)

            if t:
                tokens.append(t)

        return " ".join(tokens)
