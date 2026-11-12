from app.services.graph import build_graph, find_path

P = {
    "analysis": {"main_problem": "Keep buildings cooler", "underlying_mechanisms": ["airflow", "insulation"]},
    "analogies": [
        {"discovered_concept": "Termite mound ventilation", "external_discipline": "Biology", "mechanism": "m",
         "shared_principle": "passive airflow", "why_meaningful": "w"},
        {"discovered_concept": "Heat pipes", "external_discipline": "Engineering", "mechanism": "m2",
         "shared_principle": "passive heat transport", "why_meaningful": "w2"}],
    "solutions": [{"name": "Stack vents", "description": "d", "inspiration_source": "Termite mound ventilation", "adaptation": "a"}],
    "fusions": [{"name": "Hybrid", "proposed_innovation": "x", "selected_concepts": ["Termite mound ventilation", "Heat pipes"],
                 "combination_logic": "c"}],
}


def test_graph_has_all_kinds_and_valid_edges():
    g = build_graph(P)
    kinds = {n["kind"] for n in g["nodes"]}
    assert {"problem", "mechanism", "discipline", "concept", "analogy", "solution"} <= kinds
    ids = {n["id"] for n in g["nodes"]}
    assert all(e["source"] in ids and e["target"] in ids and e["explanation"] for e in g["edges"])
    assert {"DEPENDS_ON", "SIMILAR_TO", "INSPIRED_BY", "RELATED_TO", "SOLVES", "DERIVED_FROM"} <= {e["type"] for e in g["edges"]}


def test_graph_depends_on_input_and_dedupes():
    assert build_graph(P) == build_graph(P)
    other = {**P, "analogies": P["analogies"][:1], "solutions": [], "fusions": []}
    assert len(build_graph(other)["nodes"]) < len(build_graph(P)["nodes"])


def test_multi_hop_path():
    g = build_graph(P)
    path = find_path(g, "problem", "disc:biology")
    assert path[0] == "problem" and path[-1] == "disc:biology" and len(path) >= 4
    assert find_path(g, "problem", "nope") == []
