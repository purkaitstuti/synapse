"""Engine 4: turn analogies into conceptual solution proposals."""
from pydantic import BaseModel

from app.config import settings
from app.schemas.analogy import Analogy
from app.schemas.problem import ProblemAnalysis
from app.schemas.solution import Solution, SolutionDraft
from app.services.llm import LLMError, generate_json

PROMPT = """You are the solution-generation stage of a cross-disciplinary innovation tool.
PROBLEM: {analysis}
ANALOGIES: {analogies}
Write one practical, CONCEPTUAL solution per analogy (these are proposals, not validated results). Be specific and honest about challenges.
inspiration_source must be copied exactly from the analogy's discovered_concept. Return ONLY JSON:
{{"solutions":[{{"name":str,"description":str,"inspiration_source":str,"original_mechanism":str,"adaptation":str,
"implementation":str,"required_resources":[str],"expected_benefits":[str],"challenges":[str],"feasibility":str}}]}}"""


class _Out(BaseModel):
    solutions: list[SolutionDraft]


def _offline(analogies: list[Analogy]) -> list[Solution]:
    return [Solution(
        name=f"{a.discovered_concept}-inspired approach",
        description=f"Apply the principle of {a.shared_principle} (from {a.external_discipline}): {a.how_to_adapt}",
        inspiration_source=a.discovered_concept, original_mechanism=a.mechanism, adaptation=a.how_to_adapt,
        implementation="Not generated offline. Prototype the adaptation at small scale and compare it with current performance.",
        challenges=[a.limitations], feasibility="Not assessed offline (needs a live model).", source="offline",
    ) for a in analogies]


def generate_solutions(analysis: ProblemAnalysis, analogies: list[Analogy]):
    if settings.gemini_api_key:
        names = {a.discovered_concept for a in analogies}
        brief = [a.model_dump(exclude={"original_problem", "score_basis"}) for a in analogies]
        try:
            out = generate_json(PROMPT.format(analysis=analysis.model_dump_json(), analogies=brief),
                                lambda d: _Out.model_validate(d))
            res = [Solution(**s.model_dump(), source="gemini") for s in out.solutions if s.inspiration_source in names]
            if res:
                return res, "gemini", ""
            raise LLMError("no usable solutions returned")
        except (LLMError, ValueError) as e:
            return _offline(analogies), "offline", f"Gemini unavailable ({e}); showing template proposals."
    return _offline(analogies), "offline", "No GEMINI_API_KEY set; showing template proposals without AI reasoning."
