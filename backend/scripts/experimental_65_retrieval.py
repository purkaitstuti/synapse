from pathlib import Path
import argparse
import json

import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "indexes"

MODEL_PATH = ROOT / "models" / "synapse_similarity_model"
EMBEDDINGS_PATH = INDEX / "expanded_65_mechanism_embeddings.npy"
METADATA_PATH = INDEX / "expanded_65_mechanism_metadata.csv"

_model = None
_embeddings = None
_metadata = None


def load_engine():
    global _model, _embeddings, _metadata

    if _model is not None:
        return

    for path in [MODEL_PATH, EMBEDDINGS_PATH, METADATA_PATH]:
        if not path.exists():
            raise FileNotFoundError(f"Missing: {path}")

    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = SentenceTransformer(str(MODEL_PATH), device=device)
    embeddings = np.load(EMBEDDINGS_PATH).astype(np.float32)
    metadata = pd.read_csv(METADATA_PATH, dtype=str).fillna("")

    if embeddings.shape != (65, 384):
        raise ValueError(f"Unexpected index shape: {embeddings.shape}")

    if len(metadata) != 65:
        raise ValueError("Expected 65 metadata records")

    required = {
        "mechanism_name",
        "scientific_domain",
        "working_principle",
        "source",
        "evidence_status"
    }

    if required - set(metadata.columns):
        raise ValueError("Missing required metadata columns")

    if not np.isfinite(embeddings).all():
        raise ValueError("Invalid embedding values")

    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)

    if np.any(norms == 0):
        raise ValueError("Zero-length embedding detected")

    embeddings = embeddings / norms

    _model = model
    _embeddings = embeddings
    _metadata = metadata

    print(f"Experimental engine loaded: 65 mechanisms | {device}")


def search_mechanisms_65(query, top_k=5, min_similarity=0.30):
    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query cannot be empty")

    if top_k < 1:
        raise ValueError("top_k must be positive")

    if not -1 <= min_similarity <= 1:
        raise ValueError("Invalid similarity threshold")

    load_engine()

    vector = _model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True
    )[0]

    scores = _embeddings @ vector

    eligible = np.where(scores >= min_similarity)[0]
    ranked = eligible[
        np.argsort(-scores[eligible], kind="stable")
    ]

    results = []

    for idx in ranked[:top_k]:
        row = _metadata.iloc[int(idx)]

        results.append({
            "rank": len(results) + 1,
            "mechanism_name": row["mechanism_name"],
            "scientific_domain": row["scientific_domain"],
            "working_principle": row["working_principle"],
            "source": row["source"],
            "evidence_status": row["evidence_status"],
            "similarity": round(float(scores[idx]), 4),
            "scientifically_verified": False
        })

    return {
        "query": query,
        "index": "experimental_65_mechanisms",
        "status": (
            "candidates_found"
            if results else "no_match_above_threshold"
        ),
        "results": results,
        "warning": (
            "Similarity scores are experimental ranking signals, "
            "not verified scientific evidence."
        )
    }


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--query",
        default="How can damaged materials repair themselves?"
    )

    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--threshold", type=float, default=0.30)

    args = parser.parse_args()

    output = search_mechanisms_65(
        query=args.query,
        top_k=args.top_k,
        min_similarity=args.threshold
    )

    print("\nSYNAPSE EXPERIMENTAL 65-MECHANISM RETRIEVAL")
    print("=" * 60)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
