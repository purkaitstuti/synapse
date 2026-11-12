"""Mechanism retrieval over the seed corpus: pure-Python TF-IDF cosine (no extra dependencies).
Embedding models can replace `search` later behind the same signature."""
import math
import re
from collections import Counter

from app.seed.corpus import CORPUS

STOP = set("a an the and or of to in on for with without how can we do does is are be by at as it its this that "
           "from into than so such very more most what which why when where our your their should could would "
           "will not no use using make get remain".split())
SUFFIXES = ("ation", "ing", "ers", "er", "ed", "es", "s")


def _stem(w: str) -> str:
    for _ in range(2):
        for s in SUFFIXES:
            if w.endswith(s) and len(w) - len(s) >= 3:
                w = w[: -len(s)]
                break
    return w


def _tokens(text: str) -> list[tuple[str, str]]:
    return [(_stem(w), w) for w in re.findall(r"[a-z]{3,}", text.lower()) if w not in STOP]


def _doc_text(c: dict) -> str:
    return f"{c['concept']} {c['mechanism']} {c['principle']} {c['keywords']} {c['keywords']}"


_DOCS = [Counter(s for s, _ in _tokens(_doc_text(c))) for c in CORPUS]
_DF = Counter(s for d in _DOCS for s in d)
_IDF = {s: math.log((1 + len(CORPUS)) / (1 + n)) + 1 for s, n in _DF.items()}


def _vec(counts: Counter) -> dict[str, float]:
    return {s: (1 + math.log(n)) * _IDF.get(s, 0.0) for s, n in counts.items()}


def _cos(a: dict, b: dict) -> float:
    dot = sum(v * b.get(s, 0.0) for s, v in a.items())
    na, nb = math.sqrt(sum(v * v for v in a.values())), math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def search(query: str, exclude_domains=(), top_k: int = 6, min_score: float = 0.06, min_shared: int = 2):
    """Returns [(corpus_entry, score, shared_terms)] best first. Weak or one-word matches are rejected."""
    toks = _tokens(query)
    if not toks:
        return []
    shown = {}
    for s, w in toks:
        shown.setdefault(s, w)
    q = _vec(Counter(s for s, _ in toks))
    excl = {d.lower() for d in exclude_domains if d}
    out = []
    for c, d in zip(CORPUS, _DOCS):
        if c["domain"].lower() in excl:
            continue
        score = _cos(q, _vec(d))
        shared = sorted((s for s in q if s in d), key=lambda s: -_IDF.get(s, 0))
        if score >= min_score and len(shared) >= min_shared:
            out.append((c, round(score, 3), [shown[s] for s in shared]))
    return sorted(out, key=lambda x: -x[1])[:top_k]
