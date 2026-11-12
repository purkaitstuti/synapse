"""Knowledge graph built from a discovery payload (in-memory; dependency-free).
Node kinds: problem, mechanism, discipline, concept, analogy, solution. Edge types follow the spec."""
import re


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


def build_graph(p: dict) -> dict:
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}

    def node(id, kind, label, discipline="", detail=""):
        nodes.setdefault(id, dict(id=id, kind=kind, label=label, discipline=discipline, detail=detail))

    def edge(s, t, typ, why):
        edges.setdefault(f"{s}>{t}:{typ}", dict(id=f"{s}>{t}:{typ}", source=s, target=t, type=typ, explanation=why))

    a = p["analysis"]
    node("problem", "problem", a["main_problem"][:80], detail=a["main_problem"])
    for m in a["underlying_mechanisms"]:
        mid = "mech:" + slug(m)
        node(mid, "mechanism", m, detail="A mechanism the problem depends on")
        edge("problem", mid, "DEPENDS_ON", f"The problem depends on {m}.")
    for an in p["analogies"]:
        c, d = an["discovered_concept"], an["external_discipline"]
        cid, did, aid = "concept:" + slug(c), "disc:" + slug(d), "analogy:" + slug(c)
        node(did, "discipline", d, detail=f"Discipline: {d}")
        node(cid, "concept", c, d, an["mechanism"])
        node(aid, "analogy", an["shared_principle"][:70], d, an["why_meaningful"])
        edge(cid, did, "RELATED_TO", f"{c} comes from {d}.")
        edge("problem", aid, "SIMILAR_TO", an["why_meaningful"])
        edge(aid, cid, "INSPIRED_BY", f"Shared principle: {an['shared_principle']}")
    for i, s in enumerate(p.get("solutions", [])):
        sid, cid = f"sol:{i}", "concept:" + slug(s["inspiration_source"])
        node(sid, "solution", s["name"], nodes.get(cid, {}).get("discipline", ""), s["description"])
        edge(sid, "problem", "SOLVES", "Conceptual proposal (not validated): " + s["description"][:160])
        if cid in nodes:
            edge(sid, cid, "INSPIRED_BY", s["adaptation"])
    for i, f in enumerate(p.get("fusions", [])):
        fid = f"fusion:{i}"
        node(fid, "solution", f["name"], "", f["proposed_innovation"])
        edge(fid, "problem", "SOLVES", "Conceptual hybrid (not validated): " + f["proposed_innovation"][:160])
        for c in f["selected_concepts"]:
            if "concept:" + slug(c) in nodes:
                edge(fid, "concept:" + slug(c), "DERIVED_FROM", f["combination_logic"])
    return {"nodes": list(nodes.values()), "edges": list(edges.values())}


def neighbors(graph: dict, node_id: str) -> list[str]:
    out = []
    for e in graph["edges"]:
        if e["source"] == node_id:
            out.append(e["target"])
        elif e["target"] == node_id:
            out.append(e["source"])
    return out


def find_path(graph: dict, start: str, goal: str) -> list[str]:
    """Shortest multi-hop path (BFS, edges treated as undirected)."""
    prev, queue = {start: None}, [start]
    for cur in queue:
        if cur == goal:
            path = []
            while cur is not None:
                path.append(cur)
                cur = prev[cur]
            return path[::-1]
        for n in neighbors(graph, cur):
            if n not in prev:
                prev[n] = cur
                queue.append(n)
    return []
