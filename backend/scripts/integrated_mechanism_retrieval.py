
from pathlib import Path
import argparse
import json

import joblib
import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "indexes"
MODEL_PATH = ROOT / "models" / "synapse_similarity_model"
CLASSIFIER_PATH = ROOT / "models" / "relevance_classifier_optimized.joblib"

EMBEDDINGS_PATH = INDEX / "expanded_60_mechanism_embeddings.npy"
METADATA_PATH = INDEX / "expanded_60_mechanism_metadata.csv"

_model = None
_metadata = None
_embeddings = None
_classifier = None


def load_engine():
    global _model, _metadata, _embeddings

    if _model is not None:
        return

    for path in [MODEL_PATH, EMBEDDINGS_PATH, METADATA_PATH]:
        if not path.exists():
            raise FileNotFoundError(f"Missing: {path}")

    device = "cuda" if torch.cuda.is_available() else "cpu"

    model = SentenceTransformer(str(MODEL_PATH), device=device)

    metadata = pd.read_csv(
        METADATA_PATH, dtype=str
    ).fillna("")

    embeddings = np.load(
        EMBEDDINGS_PATH
    ).astype(np.float32)

    required = {
        "mechanism_name",
        "scientific_domain",
        "working_principle",
        "source",
        "evidence_status"
    }

    missing = required - set(metadata.columns)

    if missing:
        raise ValueError(
            f"Missing metadata columns: {sorted(missing)}"
        )

    if len(metadata) != len(embeddings):
        raise ValueError("Index and metadata size mismatch")

    if not np.isfinite(embeddings).all():
        raise ValueError("Invalid embedding values")

    norms = np.linalg.norm(
        embeddings, axis=1, keepdims=True
    )

    if np.any(norms == 0):
        raise ValueError("Zero-length embedding detected")

    embeddings = embeddings / norms

    _model = model
    _metadata = metadata
    _embeddings = embeddings

    print(
        f"Retrieval engine loaded: "
        f"{len(_metadata)} mechanisms | {device}"
    )


def load_classifier():
    global _classifier

    if _classifier is not None:
        return _classifier

    if not CLASSIFIER_PATH.exists():
        raise FileNotFoundError(
            f"Optimized classifier missing: {CLASSIFIER_PATH}"
        )

    classifier = joblib.load(CLASSIFIER_PATH)

    if classifier.n_features_in_ != 769:
        raise ValueError(
            "Classifier feature dimension mismatch"
        )

    if not np.array_equal(classifier.classes_, [0, 1, 2]):
        raise ValueError(
            "Unexpected classifier labels"
        )

    _classifier = classifier
    return _classifier


def search_mechanisms(
    query,
    top_k=5,
    min_similarity=0.30,
    ranking_mode="cosine"
):
    if not query or not query.strip():
        raise ValueError("Query cannot be empty")

    if top_k < 1:
        raise ValueError("top_k must be positive")

    if not -1 <= min_similarity <= 1:
        raise ValueError(
            "min_similarity must be between -1 and 1"
        )

    if ranking_mode not in ("cosine", "optimized"):
        raise ValueError(
            "ranking_mode must be 'cosine' or 'optimized'"
        )

    load_engine()

    vector = _model.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True
    )[0]

    if len(vector) != _embeddings.shape[1]:
        raise ValueError("Embedding dimension mismatch")

    scores = _embeddings @ vector

    eligible = np.where(
        scores >= min_similarity
    )[0]

    if ranking_mode == "cosine":
        ranked = eligible[
            np.argsort(-scores[eligible], kind="stable")
        ]
        probabilities = None
        relevance_scores = None
        predictions = None

    else:
        classifier = load_classifier()

        problem_vectors = np.repeat(
            vector.reshape(1, -1),
            len(eligible),
            axis=0
        )

        mechanism_vectors = _embeddings[eligible]

        features = np.hstack([
            np.abs(problem_vectors - mechanism_vectors),
            problem_vectors * mechanism_vectors,
            scores[eligible].reshape(-1, 1)
        ])

        if len(eligible):
            probabilities = classifier.predict_proba(features)
            predictions = classifier.classes_[
                np.argmax(probabilities, axis=1)
            ]

            relevance_scores = (
                probabilities[:, 1]
                + 2 * probabilities[:, 2]
            ) / 2

            # Prefer relevance score; break ties using cosine.
            order = np.lexsort((
                -scores[eligible],
                -relevance_scores
            ))

            ranked = eligible[order]
            probability_lookup = {
                int(idx): probabilities[pos]
                for pos, idx in enumerate(eligible)
            }
            prediction_lookup = {
                int(idx): int(predictions[pos])
                for pos, idx in enumerate(eligible)
            }
            score_lookup = {
                int(idx): float(relevance_scores[pos])
                for pos, idx in enumerate(eligible)
            }
        else:
            ranked = []
            probability_lookup = {}
            prediction_lookup = {}
            score_lookup = {}

    results = []

    for idx in ranked[:top_k]:
        idx = int(idx)
        row = _metadata.iloc[idx]

        item = {
            "rank": len(results) + 1,
            "mechanism_name": row["mechanism_name"],
            "scientific_domain": row["scientific_domain"],
            "working_principle": row["working_principle"],
            "source": row["source"],
            "evidence_status": row["evidence_status"],
            "similarity": round(float(scores[idx]), 4),
            "scientifically_verified": False
        }

        if ranking_mode == "optimized":
            item["predicted_relevance"] = prediction_lookup[idx]
            item["relevance_score"] = round(
                score_lookup[idx], 4
            )
            item["class_probabilities"] = {
                str(label): round(float(prob), 4)
                for label, prob in zip(
                    classifier.classes_,
                    probability_lookup[idx]
                )
            }

        results.append(item)

    return {
        "query": query,
        "index": "experimental_60_mechanisms",
        "status": (
            "candidates_found"
            if results else "no_match_above_threshold"
        ),
        "results": results,
        "warning": (
            "Similarity and classifier scores are experimental "
            "ranking signals, not verified scientific evidence."
        )
    }


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--query",
        type=str,
        default="How can robots move using fewer mechanical joints?"
    )

    parser.add_argument(
        "--top-k", type=int, default=5
    )

    parser.add_argument(
        "--threshold", type=float, default=0.30
    )

    parser.add_argument(
        "--ranking",
        choices=["cosine", "optimized"],
        default="cosine"
    )

    args = parser.parse_args()

    output = search_mechanisms(
        query=args.query,
        top_k=args.top_k,
        min_similarity=args.threshold,
        ranking_mode=args.ranking
    )

    print("\nSYNAPSE INTEGRATED RETRIEVAL")
    print("=" * 55)
    print("Ranking mode:", args.ranking)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
