"""Engines 2+3: cross-disciplinary exploration and analogy discovery."""
from pydantic import BaseModel

from app.config import settings
from app.schemas.analogy import Analogy
from app.schemas.problem import ProblemAnalysis, ProblemInput
from app.services.llm import LLMError, generate_json
from app.services.retrieval import search

PROMPT = """You are the analogy-discovery stage of a cross-disciplinary innovation tool.
PROBLEM ANALYSIS: {analysis}
CANDIDATE CONCEPTS (from other disciplines): {cands}
Keep ONLY candidates that share a genuine underlying mechanism with the problem; drop superficial similarities.
Use ONLY candidate concepts, with discovered_concept copied exactly. Return ONLY JSON:
{{"analogies":[{{"discovered_concept":str,"external_discipline":str,"mechanism":str,"shared_principle":str,
"why_meaningful":str,"how_to_adapt":str,"limitations":str,"relevance_score":0-1 number}}]}}"""


class _Out(BaseModel):
    analogies: list[dict]


def query_text(a: ProblemAnalysis) -> str:
    return " ".join([a.main_problem, *a.underlying_mechanisms, *a.technical_concepts, *a.keywords])


def explore(a: ProblemAnalysis, inp: ProblemInput, top_k: int = 6):
    return search(query_text(a), exclude_domains=(inp.primary_discipline,), top_k=top_k)


def _offline(a: ProblemAnalysis, cands) -> list[Analogy]:
    return [Analogy(
        original_problem=a.main_problem, external_discipline=c["domain"], discovered_concept=c["concept"],
        mechanism=c["mechanism"], shared_principle=c["principle"],
        why_meaningful=f"Matched on shared terms: {', '.join(shared[:5])}. This is a text-similarity match, not verified reasoning.",
        how_to_adapt=c["adapt"], limitations=c["limits"], relevance_score=score, score_basis="retrieval_similarity",
    ) for c, score, shared in cands]


def find_analogies(a: ProblemAnalysis, inp: ProblemInput):
    cands = explore(a, inp)
    if not cands:
        return [], "offline", "No candidate concepts matched strongly enough; none were forced."
    if settings.gemini_api_key:
        names = {c["concept"]: c for c, _, _ in cands}
        brief = [{k: c[k] for k in ("concept", "domain", "mechanism", "principle")} for c, _, _ in cands]
        try:
            out = generate_json(PROMPT.format(analysis=a.model_dump_json(), cands=brief),
                                lambda d: _Out.model_validate(d))
            res = [Analogy(original_problem=a.main_problem, score_basis="ai_estimate",
                           **{k: x[k] for k in ("discovered_concept", "external_discipline", "mechanism", "shared_principle",
                                                "why_meaningful", "how_to_adapt", "limitations")},
                           relevance_score=max(0.0, min(1.0, float(x["relevance_score"]))))
                   for x in out.analogies if x.get("discovered_concept") in names]
            if res:
                return res, "gemini", ""
            return [], "gemini", "Gemini judged none of the candidates to be genuine analogies."
        except (LLMError, KeyError, ValueError) as e:
            return _offline(a, cands), "offline", f"Gemini unavailable ({e}); used retrieval similarity only."
    return _offline(a, cands), "offline", "No GEMINI_API_KEY set; analogies are retrieval matches without AI reasoning."
