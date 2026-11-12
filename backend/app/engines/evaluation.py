"""Engine 7: evaluation. Scores are AI-generated estimates; offline mode refuses to invent numbers."""
from pydantic import BaseModel

from app.config import settings
from app.services.llm import LLMError, generate_json

CRITERIA = ("relevance", "novelty", "feasibility", "impact", "complexity", "evidence")
PROMPT = """Score each CONCEPTUAL solution from 0 to 10 on: relevance, novelty, feasibility, impact,
complexity (10 = very complex to implement), evidence (10 = strongly supported by the retrieved papers).
These are rough estimates; be critical and explain each score in one sentence. Return ONLY JSON:
{{"evaluations":[{{"solution_name":str,"scores":{{"relevance":n,"novelty":n,"feasibility":n,"impact":n,"complexity":n,"evidence":n}},
"explanations":{{"relevance":str,"novelty":str,"feasibility":str,"impact":str,"complexity":str,"evidence":str}}}}]}}
SOLUTIONS: {ctx}"""


class _Ev(BaseModel):
    solution_name: str
    scores: dict[str, float]
    explanations: dict[str, str]


class _Out(BaseModel):
    evaluations: list[_Ev]


def _context(p: dict) -> list[dict]:
    an = {a["discovered_concept"]: a for a in p["analogies"]}
    out = []
    for i, s in enumerate(p["solutions"]):
        a = an.get(s["inspiration_source"], {})
        out.append({"name": s["name"], "description": s["description"], "challenges": s["challenges"],
                    "similarity": a.get("relevance_score"), "distance": a.get("distance"),
                    "papers_found": len(p.get("research", {}).get(str(i), {}).get("papers", []))})
    return out


def _offline(ctx: list[dict]) -> list[dict]:
    res = []
    for c in ctx:
        res.append({"solution": c["name"], "basis": "offline_unscored", "scores": {k: None for k in CRITERIA}, "explanations": {
            "relevance": f"Retrieval similarity of the source analogy: {c['similarity']}. Not a 0-10 score.",
            "novelty": f"Innovation distance: {c['distance']} (exploration indicator, not originality).",
            "evidence": f"{c['papers_found']} paper(s) retrieved so far." if c["papers_found"] else "No research retrieved yet.",
            "feasibility": "Not scored offline.", "impact": "Not scored offline.", "complexity": "Not scored offline."}})
    return res


def evaluate(p: dict):
    ctx = _context(p)
    if settings.gemini_api_key:
        try:
            out = generate_json(PROMPT.format(ctx=ctx), lambda d: _Out.model_validate(d))
            by = {e.solution_name: e for e in out.evaluations}
            res = []
            for c in ctx:
                e = by[c["name"]]
                if not set(CRITERIA) <= set(e.scores) or not set(CRITERIA) <= set(e.explanations):
                    raise ValueError("missing criteria")
                res.append({"solution": c["name"], "basis": "ai_estimate",
                            "scores": {k: max(0.0, min(10.0, e.scores[k])) for k in CRITERIA}, "explanations": {k: e.explanations[k] for k in CRITERIA}})
            return res, "gemini", "Scores are AI-generated estimates, not measurements."
        except (LLMError, ValueError, KeyError) as e:
            return _offline(ctx), "offline", f"Gemini unavailable ({e}); no numeric scores produced."
    return _offline(ctx), "offline", "No GEMINI_API_KEY set; numeric scores need a live model, so none are shown."
