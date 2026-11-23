
from pathlib import Path
import sqlite3
import json
import pandas as pd

from integrated_mechanism_retrieval import search_mechanisms

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"

DB = DATA / "synapse_knowledge.db"
MAPPING = DATA / "mechanism_graph_mapping.csv"
OUTPUT = DATA / "knowledge_graph_connection_test.json"


def normalize(value):
    return " ".join(str(value).lower().split())


def connect_database():
    if not DB.exists():
        raise FileNotFoundError(f"Database missing: {DB}")

    return sqlite3.connect(
        f"file:{DB.as_posix()}?mode=ro",
        uri=True
    )


def load_mapping():
    if not MAPPING.exists():
        raise FileNotFoundError(
            f"Mapping missing: {MAPPING}"
        )

    mapping = pd.read_csv(
        MAPPING, dtype=str
    ).fillna("")

    required = {
        "mechanism_name",
        "database_match",
        "representative_mechanism_id"
    }

    missing = required - set(mapping.columns)

    if missing:
        raise ValueError(
            f"Missing mapping columns: {sorted(missing)}"
        )

    return {
        normalize(row["mechanism_name"]): row
        for _, row in mapping.iterrows()
    }


def fetch_rows(conn, sql, params):
    return [
        dict(row)
        for row in conn.execute(sql, params).fetchall()
    ]


def get_graph_links(conn, name, mapping):
    entry = mapping.get(normalize(name))

    if entry is None or (
        entry["database_match"].lower() != "true"
    ):
        return {
            "database_match": False,
            "mechanism_id": None,
            "relationships": {},
            "note": "Expansion mechanism not yet linked"
        }

    mechanism_id = entry["representative_mechanism_id"]

    if not mechanism_id:
        raise ValueError(
            f"Missing mechanism ID for {name}"
        )

    mechanism = fetch_rows(
        conn,
        """
        SELECT mechanism_id, name, record_origin,
               data_provenance
        FROM mechanisms
        WHERE mechanism_id = ?
        LIMIT 1
        """,
        (mechanism_id,)
    )

    if not mechanism:
        raise ValueError(
            f"Mapped ID not found: {mechanism_id}"
        )

    concepts = fetch_rows(
        conn,
        """
        SELECT concept_id, concept_name,
               definition, record_origin
        FROM concepts
        WHERE mechanism_id = ?
        LIMIT 5
        """,
        (mechanism_id,)
    )

    publications = fetch_rows(
        conn,
        """
        SELECT paper_id, title, doi,
               evidence_status, record_origin
        FROM publications
        WHERE mechanism_id = ?
        LIMIT 5
        """,
        (mechanism_id,)
    )

    analogies = fetch_rows(
        conn,
        """
        SELECT analogy_id, problem_id,
               shared_principle, evidence_status,
               record_origin
        FROM analogies
        WHERE mechanism_id = ?
        LIMIT 5
        """,
        (mechanism_id,)
    )

    graph_edges = fetch_rows(
        conn,
        """
        SELECT edge_id, source_id, source_type,
               target_id, target_type,
               relationship, record_origin
        FROM graph_relationships
        WHERE source_id = ? OR target_id = ?
        LIMIT 10
        """,
        (mechanism_id, mechanism_id)
    )

    return {
        "database_match": True,
        "mechanism_id": mechanism_id,
        "matched_record_count": int(
            entry.get("matched_record_count", 0)
        ),
        "mechanism_record": mechanism[0],
        "relationships": {
            "concepts": concepts,
            "publications": publications,
            "analogies": analogies,
            "graph_edges": graph_edges
        },
        "note": (
            "Representative synthetic record only. "
            "Related records may exist under other "
            "scenario-specific mechanism IDs. "
            "Links are not scientific verification."
        )
    }


def search_with_graph(query, top_k=5):
    retrieval = search_mechanisms(
        query=query,
        top_k=top_k,
        min_similarity=0.30
    )

    mapping = load_mapping()
    enriched = []

    with connect_database() as conn:
        conn.row_factory = sqlite3.Row

        for result in retrieval["results"]:
            graph = get_graph_links(
                conn,
                result["mechanism_name"],
                mapping
            )

            enriched.append({
                **result,
                "knowledge_graph": graph
            })

    return {
        "query": query,
        "status": retrieval["status"],
        "results": enriched,
        "warning": (
            "Experimental graph integration. "
            "Synthetic associations and publication "
            "metadata are not verified evidence."
        )
    }


def main():
    query = (
        "How can buildings stay cool "
        "without air conditioning?"
    )

    print("\nSYNAPSE KNOWLEDGE GRAPH INTEGRATION")
    print("=" * 55)

    response = search_with_graph(query)

    print("\nQuery:", query)
    print("Retrieved:", len(response["results"]))

    matched = 0

    for result in response["results"]:
        graph = result["knowledge_graph"]

        if graph["database_match"]:
            matched += 1

        print(
            f'\n{result["rank"]}. '
            f'{result["mechanism_name"]}'
        )

        print(
            "Database match:",
            graph["database_match"]
        )

        if graph["database_match"]:
            print(
                "Mechanism ID:",
                graph["mechanism_id"]
            )

            for category, rows in (
                graph["relationships"].items()
            ):
                print(
                    f"  {category}: {len(rows)}"
                )

    print("\nSUMMARY")
    print("=" * 55)
    print("Matched mechanisms:", matched)
    print(
        "Unmatched mechanisms:",
        len(response["results"]) - matched
    )

    with open(
        OUTPUT, "w", encoding="utf-8"
    ) as f:
        json.dump(response, f, indent=2)

    print("\nSaved:", OUTPUT)
    print("\nSTEP 10.16.44 COMPLETE")


if __name__ == "__main__":
    main()
