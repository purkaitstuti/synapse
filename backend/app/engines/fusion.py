"""Engine 6: combine two or more concepts into a hybrid proposal."""
from app.config import settings
from app.schemas.analogy import Analogy
from app.schemas.problem import ProblemAnalysis
from app.schemas.solution import Fusion, FusionDraft
from app.services.llm import LLMError, generate_json
from app.services.retrieval import _tokens

PROMPT = """You are the idea-fusion stage of a cross-disciplinary innovation tool.
PROBLEM: {problem}
CONCEPTS TO COMBINE: {concepts}
Combine them into ONE hybrid CONCEPTUAL proposal (not validated). Return ONLY JSON:
{{"name":str,"common_mechanisms":[str],"combination_logic":str,"proposed_innovation":str,"working_principle":str,
"implementation_possibilities":[str],"advantages":[str],"risks_limitations":[str]}}"""


def _offline(problem: str, picked: list[Analogy]) -> FusionDraft:
    sets = [{w for _, w in _tokens(a.shared_principle + " " + a.mechanism)} for a in picked]
    common = sorted(set.intersection(*sets)) or ["No shared terms found; this combination is exploratory."]
    names = [a.discovered_concept for a in picked]
    return FusionDraft(
        name="Hybrid: " + " + ".join(names), common_mechanisms=common,
        combination_logic="Apply " + " together with ".join(a.how_to_adapt.rstrip(".") for a in picked) + ", so each covers the others' limits.",
        proposed_innovation=f"A combined approach to '{problem}' joining " + "; ".join(f"{a.discovered_concept} ({a.shared_principle})" for a in picked) + ".",
        working_principle=" + ".join(a.shared_principle for a in picked),
        implementation_possibilities=[a.how_to_adapt for a in picked],
        advantages=[], risks_limitations=[a.limitations for a in picked],
    )


def fuse(analysis: ProblemAnalysis, picked: list[Analogy]):
    names = [a.discovered_concept for a in picked]
    if settings.gemini_api_key:
        brief = [a.model_dump(exclude={"original_problem", "score_basis"}) for a in picked]
        try:
            d = generate_json(PROMPT.format(problem=analysis.main_problem, concepts=brief),
                              lambda x: FusionDraft.model_validate(x))
            return Fusion(**d.model_dump(), selected_concepts=names, source="gemini"), ""
        except (LLMError, ValueError) as e:
            note = f"Gemini unavailable ({e}); showing a template combination."
    else:
        note = "No GEMINI_API_KEY set; showing a template combination without AI reasoning."
    return Fusion(**_offline(analysis.main_problem, picked).model_dump(), selected_concepts=names, source="offline"), note
