from pathlib import Path
import threading

import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[1]

INDEX_PATH = ROOT / "indexes/synapse_400k_experimental.faiss"
METADATA_PATH = (
    ROOT / "data/processed/synapse_embedding_inventory.csv"
)
MODEL_PATH = ROOT / "models/synapse_similarity_model"

_index = None
_metadata = None
_model = None
_lock = threading.Lock()


def load_engine():
    global _index, _metadata, _model

    if _index is not None:
        return

    with _lock:
        if _index is not None:
            return

        index = faiss.read_index(str(INDEX_PATH))

        metadata = pd.read_csv(
            METADATA_PATH,
            keep_default_na=False
        )

        if index.ntotal != len(metadata):
            raise RuntimeError(
                "FAISS index and metadata counts do not match"
            )

        model = SentenceTransformer(
            str(MODEL_PATH),
            device="cpu"
        )

        _index = index
        _metadata = metadata
        _model = model


def search_knowledge_400k(
    query,
    top_k=5,
    min_similarity=0.30
):
    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query cannot be empty")

    if not 1 <= top_k <= 20:
        raise ValueError("top_k must be between 1 and 20")

    if not -1 <= min_similarity <= 1:
        raise ValueError("Invalid similarity threshold")

    load_engine()

    vector = _model.encode(
        [query],
        normalize_embeddings=True,
        convert_to_numpy=True
    ).astype("float32")

    scores, indices = _index.search(
        np.ascontiguousarray(vector),
        top_k
    )

    results = []

    for idx, score in zip(indices[0], scores[0]):
        if idx < 0 or score < min_similarity:
            continue

        row = _metadata.iloc[int(idx)]

        results.append({
            "rank": len(results) + 1,
            "record_id": str(row["record_id"]),
            "source_file": str(row["source_file"]),
            "text": str(row["text"])[:1200],
            "similarity": round(float(score), 4),
            "evidence_status": "synthetic_unverified",
            "scientifically_verified": False
        })

    return {
        "query": query,
        "index": "synapse_400k_experimental",
        "total_indexed_records": int(_index.ntotal),
        "status": (
            "candidates_found"
            if results else "no_match_above_threshold"
        ),
        "results": results,
        "warning": (
            "Experimental retrieval from synthetic, "
            "unverified records. Similarity does not "
            "establish scientific validity."
        )
    }
